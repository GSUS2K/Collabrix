import { useEffect, useRef } from 'react';

// Single Video/Audio Cell
function MediaCell({ stream, isLocal, username }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream) return null;

    // Check if there's actually a video track enabled
    const hasVideo = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;

    return (
        <div className={`relative group shrink-0 rounded-2xl overflow-hidden bg-brand-dark/80 backdrop-blur-md border border-white/10 shadow-lg transition-all
      ${hasVideo ? 'w-48 h-36' : 'w-16 h-16 rounded-full flex items-center justify-center'}
    `}>
            {hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal} // Always mute ourselves so we don't echo
                    className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
                />
            ) : (
                <>
                    {/* Audio-only avatar ring */}
                    <audio ref={videoRef} autoPlay playsInline muted={isLocal} />
                    <div className="text-xl font-bold text-white relative z-10">
                        {username ? username[0].toUpperCase() : '?'}
                    </div>
                    {/* Pulse ring indicating active audio track (could tie to actual volume later) */}
                    <div className="absolute inset-0 rounded-full border-2 border-brand-accent/50 animate-[ping_2s_ease-out_infinite]" />
                </>
            )}

            {/* Name tag overlay for video */}
            {hasVideo && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[10px] font-bold text-white/90">
                    {username || 'Anonymous'} {isLocal && '(You)'}
                </div>
            )}
        </div>
    );
}

export default function MediaGallery({ localStream, peers, users, myUsername }) {
    return (
        <div className="flex gap-4 p-4 items-end pointer-events-auto overflow-x-auto hide-scrollbar">
            {/* 1. Local User */}
            {localStream && (
                <MediaCell
                    stream={localStream}
                    isLocal={true}
                    username={myUsername}
                />
            )}

            {/* 2. Remote Peers */}
            {peers.map(({ peerId, stream }) => {
                // Find their username from the existing socket users array
                const user = users.find(u => u.socketId === peerId);
                return (
                    <MediaCell
                        key={peerId}
                        stream={stream}
                        isLocal={false}
                        username={user?.username}
                    />
                );
            })}
        </div>
    );
}
