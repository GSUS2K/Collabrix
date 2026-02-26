import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'simple-peer';
import toast from 'react-hot-toast';

export const useWebRTC = (socket, roomId, myId) => {
    const [peers, setPeers] = useState([]); // { peerId, peer, stream }
    const [localStream, setLocalStream] = useState(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(false);
    const [screenEnabled, setScreenEnabled] = useState(false);

    const peersRef = useRef({}); // socketId -> Peer instance
    const streamRef = useRef(null);

    // Sync state locally and globally
    const updateMediaState = (type, isEnabled) => {
        if (type === 'audio') setAudioEnabled(isEnabled);
        if (type === 'video') setVideoEnabled(isEnabled);
        if (type === 'screen') setScreenEnabled(isEnabled);
        socket?.emit('webrtc:toggle-media', { roomId, type, isEnabled });
    };

    // Safely add or replace a track for all peers
    const replaceTrackForPeers = (oldTrack, newTrack) => {
        Object.values(peersRef.current).forEach(peer => {
            try {
                if (oldTrack) peer.replaceTrack(oldTrack, newTrack, streamRef.current);
                else peer.addTrack(newTrack, streamRef.current);
            } catch (err) {
                console.warn('Error replacing track on peer', err);
            }
        });
    };

    const toggleAudio = async () => {
        if (!streamRef.current) {
            streamRef.current = new MediaStream();
            setLocalStream(streamRef.current);
        }

        let audioTrack = streamRef.current.getAudioTracks()[0];

        if (!audioTrack) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioTrack = stream.getAudioTracks()[0];
                streamRef.current.addTrack(audioTrack);

                // Add to existing peers
                Object.values(peersRef.current).forEach(peer => {
                    try { peer.addStream(streamRef.current); } catch (e) { }
                });
            } catch (err) {
                toast.error('Microphone exactly denied or unavailable.');
                return;
            }
        }

        audioTrack.enabled = !audioTrack.enabled;
        updateMediaState('audio', audioTrack.enabled);
    };

    const toggleVideo = async () => {
        if (!streamRef.current) {
            streamRef.current = new MediaStream();
            setLocalStream(streamRef.current);
        }

        let videoTrack = streamRef.current.getVideoTracks().find(t => t.label.toLowerCase().includes('screen') === false);

        // If we are currently sharing screen, we should probably stop it or replace it, but let's just use regular camera.
        if (!videoTrack) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoTrack = stream.getVideoTracks()[0];
                streamRef.current.addTrack(videoTrack);

                Object.values(peersRef.current).forEach(peer => {
                    try { peer.addStream(streamRef.current); } catch (e) { }
                });
            } catch (err) {
                toast.error('Camera permission denied or unavailable.');
                return;
            }
        }

        videoTrack.enabled = !videoTrack.enabled;
        updateMediaState('video', videoTrack.enabled);
    };

    const toggleScreenShare = async () => {
        if (!streamRef.current) {
            streamRef.current = new MediaStream();
            setLocalStream(streamRef.current);
        }

        if (screenEnabled) {
            // Turning OFF screen share
            const screenTrack = streamRef.current.getVideoTracks()[0];
            if (screenTrack) {
                screenTrack.stop();
                streamRef.current.removeTrack(screenTrack);
            }
            // If they had video enabled before, it's gone now. 
            updateMediaState('video', false);
            updateMediaState('screen', false);
            setVideoEnabled(false);

            // Renegotiate or remove stream across peers
            Object.values(peersRef.current).forEach(peer => {
                try { if (screenTrack) peer.removeTrack(screenTrack, streamRef.current); } catch (e) { }
            });
            return;
        }

        // Turning ON screen share
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = stream.getVideoTracks()[0];

            // Stop existing camera track if present
            const existingVideo = streamRef.current.getVideoTracks()[0];
            if (existingVideo) {
                existingVideo.stop();
                streamRef.current.removeTrack(existingVideo);
                replaceTrackForPeers(existingVideo, screenTrack);
            } else {
                streamRef.current.addTrack(screenTrack);
                Object.values(peersRef.current).forEach(peer => {
                    try { peer.addStream(streamRef.current); } catch (e) { }
                });
            }

            screenTrack.onended = () => {
                updateMediaState('screen', false);
                updateMediaState('video', false);
                streamRef.current.removeTrack(screenTrack);
            };

            updateMediaState('screen', true);
            updateMediaState('video', true); // Treat screen share as a video stream for UI

        } catch (err) {
            // User cancelled screen share picker
            console.warn("Screen share cancelled", err);
        }
    };

    // 2. Stop User Media
    const stopMedia = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setLocalStream(null);
        updateMediaState('audio', false);
        updateMediaState('video', false);
        updateMediaState('screen', false);

        // Remove stream from all peers
        Object.values(peersRef.current).forEach(peer => {
            try {
                if (peer.streams[0]) peer.removeStream(peer.streams[0]);
            } catch (e) { console.error('Error removing stream', e); }
        });
    }, [socket, roomId]);

    // 3. Create a Peer (Initiator)
    const createPeer = useCallback((userToSignal, callerId, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: true,
            stream: stream || undefined,
        });

        peer.on('signal', signal => {
            if (signal.type === 'offer') {
                socket.emit('webrtc:offer', { target: userToSignal, caller: callerId, sdp: signal });
            } else if (signal.candidate) {
                socket.emit('webrtc:ice-candidate', { target: userToSignal, caller: callerId, candidate: signal });
            }
        });

        peer.on('stream', remoteStream => {
            setPeers(prev => {
                if (prev.find(p => p.peerId === userToSignal)) return prev;
                return [...prev, { peerId: userToSignal, peer, stream: remoteStream }];
            });
        });

        peer.on('close', () => removePeer(userToSignal));
        // Provide a catch for errors to avoid crashing
        peer.on('error', err => console.warn('Peer error:', err));

        return peer;
    }, [socket]);

    // 4. Add a Peer (Receiver)
    const addPeer = useCallback((incomingSignal, callerId, stream) => {
        const peer = new Peer({
            initiator: false,
            trickle: true,
            stream: stream || undefined,
        });

        peer.on('signal', signal => {
            if (signal.type === 'answer') {
                socket.emit('webrtc:answer', { target: callerId, caller: myId, sdp: signal });
            } else if (signal.candidate) {
                socket.emit('webrtc:ice-candidate', { target: callerId, caller: myId, candidate: signal });
            }
        });

        peer.on('stream', remoteStream => {
            setPeers(prev => {
                if (prev.find(p => p.peerId === callerId)) return prev;
                return [...prev, { peerId: callerId, peer, stream: remoteStream }];
            });
        });

        peer.on('close', () => removePeer(callerId));
        peer.on('error', err => console.warn('Peer error:', err));

        peer.signal(incomingSignal);
        return peer;
    }, [socket, myId]);

    const removePeer = (socketId) => {
        if (peersRef.current[socketId]) {
            peersRef.current[socketId].destroy();
            delete peersRef.current[socketId];
        }
        setPeers(prev => prev.filter(p => p.peerId !== socketId));
    };

    // 5. Socket Listeners for WebRTC Signaling
    useEffect(() => {
        if (!socket || !myId) return;

        // When someone else joins, THEY will are the user so WE initiate the call to them to establish mesh.
        // Wait... usually the New Joiner pings everyone. Let's let the Existing users call the New joiner.
        const handleUserJoined = ({ user }) => {
            if (user.socketId === myId) return;
            // We are an existing user. Let's call the new guy.
            const peer = createPeer(user.socketId, myId, streamRef.current);
            peersRef.current[user.socketId] = peer;
        };

        const handleUserLeft = ({ users }) => {
            // Find who left
            const currentIds = users.map(u => u.socketId);
            Object.keys(peersRef.current).forEach(peerId => {
                if (!currentIds.includes(peerId) && peerId !== myId) {
                    removePeer(peerId);
                }
            });
        };

        const handleReceiveOffer = ({ caller, sdp }) => {
            const peer = addPeer(sdp, caller, streamRef.current);
            peersRef.current[caller] = peer;
        };

        const handleReceiveAnswer = ({ caller, sdp }) => {
            const peer = peersRef.current[caller];
            if (peer) peer.signal(sdp);
        };

        const handleReceiveIce = ({ caller, candidate }) => {
            const peer = peersRef.current[caller];
            if (peer) peer.signal(candidate);
        };

        socket.on('room:user_joined', handleUserJoined);
        socket.on('room:user_left', handleUserLeft);
        socket.on('webrtc:offer', handleReceiveOffer);
        socket.on('webrtc:answer', handleReceiveAnswer);
        socket.on('webrtc:ice-candidate', handleReceiveIce);

        return () => {
            socket.off('room:user_joined', handleUserJoined);
            socket.off('room:user_left', handleUserLeft);
            socket.off('webrtc:offer', handleReceiveOffer);
            socket.off('webrtc:answer', handleReceiveAnswer);
            socket.off('webrtc:ice-candidate', handleReceiveIce);
        };
    }, [socket, myId, createPeer, addPeer]);

    // Clean up entirely on unmount
    useEffect(() => {
        return () => stopMedia();
    }, [stopMedia]);

    return {
        localStream,
        peers,
        audioEnabled,
        videoEnabled,
        screenEnabled,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        stopMedia
    };
};
