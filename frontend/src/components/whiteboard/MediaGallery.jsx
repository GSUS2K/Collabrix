import { useEffect, useRef } from 'react';
import Draggable from 'react-draggable';

// Single Video/Audio Cell
function MediaCell({ stream, isLocal, username }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!stream) return null;

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
                    muted={isLocal}
                    className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
                />
            ) : (
                <>
                    <audio ref={videoRef} autoPlay playsInline muted={isLocal} />
                    <div className="text-xl font-bold text-white relative z-10">
                        {username ? username[0].toUpperCase() : '?'}
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-brand-accent/50 animate-[ping_2s_ease-out_infinite]" />
                </>
            )}

            {hasVideo && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[10px] font-bold text-white/90">
                    {username || 'Anonymous'} {isLocal && '(You)'}
                </div>
            )}
        </div>
    );
}

export default function MediaGallery({ localStream, peers, users, myUsername }) {
    const nodeRef = useRef(null);

    if (!localStream && peers.length === 0) return null;

    return (
        <Draggable nodeRef={nodeRef} handle=".gallery-drag" bounds="parent" defaultPosition={{ x: 16, y: -200 }}>
            <div ref={nodeRef} className="absolute bottom-4 left-4 pointer-events-auto z-40" style={{ width: 'max-content' }}>
                {/* Drag handle */}
                <div className="gallery-drag flex justify-center py-1 cursor-grab active:cursor-grabbing mb-1 opacity-0 hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                        {[0, 1, 2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-white/40" />)}
                    </div>
                </div>
                <div className="flex gap-3 items-end">
                    {localStream && (
                        <MediaCell stream={localStream} isLocal={true} username={myUsername} />
                    )}
                    {peers.map(({ peerId, stream }) => {
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
            </div>
        </Draggable>
    );
}
