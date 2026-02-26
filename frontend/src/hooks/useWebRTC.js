import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'simple-peer';
import toast from 'react-hot-toast';

export const useWebRTC = (socket, roomId, myId) => {
    const [peers, setPeers] = useState([]); // { peerId, peer, stream }
    const [localStream, setLocalStream] = useState(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(false);

    const peersRef = useRef({}); // socketId -> Peer instance
    const streamRef = useRef(null);

    // 1. Get User Media Permissions
    const startMedia = useCallback(async (video = true, audio = true) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
            streamRef.current = stream;
            setLocalStream(stream);
            setAudioEnabled(audio);
            setVideoEnabled(video);

            // Broadcast toggle state to others
            socket?.emit('webrtc:toggle-media', { roomId, type: 'audio', isEnabled: audio });
            socket?.emit('webrtc:toggle-media', { roomId, type: 'video', isEnabled: video });

            // If we already have peers, add this new stream to them
            Object.values(peersRef.current).forEach(peer => {
                try { peer.addStream(stream); } catch (e) { console.error('Error adding stream to peer', e); }
            });

            return stream;
        } catch (err) {
            console.warn("Media devices error:", err);
            toast.error("Could not access camera/microphone.");
            return null;
        }
    }, [socket, roomId]);

    // 2. Stop User Media
    const stopMedia = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setLocalStream(null);
        setAudioEnabled(false);
        setVideoEnabled(false);

        socket?.emit('webrtc:toggle-media', { roomId, type: 'audio', isEnabled: false });
        socket?.emit('webrtc:toggle-media', { roomId, type: 'video', isEnabled: false });

        // Remove stream from all peers
        Object.values(peersRef.current).forEach(peer => {
            try {
                if (peer.streams[0]) peer.removeStream(peer.streams[0]);
            } catch (e) { console.error('Error removing stream', e); }
        });
    }, [socket, roomId]);

    // Toggle helpers
    const toggleAudio = async () => {
        if (!streamRef.current) {
            const stream = await startMedia(false, true);
            if (!stream) return; // Permission denied or failed
        }

        const audioTrack = streamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setAudioEnabled(audioTrack.enabled);
            socket?.emit('webrtc:toggle-media', { roomId, type: 'audio', isEnabled: audioTrack.enabled });
        }
    };

    const toggleVideo = async () => {
        if (!streamRef.current) {
            const stream = await startMedia(true, audioEnabled);
            if (!stream) return; // Permission denied or failed
        }

        const videoTrack = streamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setVideoEnabled(videoTrack.enabled);
            socket?.emit('webrtc:toggle-media', { roomId, type: 'video', isEnabled: videoTrack.enabled });
        }
    };

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
        toggleAudio,
        toggleVideo,
        startMedia,
        stopMedia
    };
};
