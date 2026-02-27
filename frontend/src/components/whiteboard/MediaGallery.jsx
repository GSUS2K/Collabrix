import { useEffect, useRef, useState, useCallback } from 'react';
import Draggable from 'react-draggable';

// Single Video/Audio Cell
function MediaCell({ stream, isLocal, username, isScreenshare }) {
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
      ${hasVideo ? (isScreenshare ? 'w-full h-full' : 'w-48 h-36') : 'w-16 h-16 rounded-full flex items-center justify-center'}
    `}>
            {hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className={`w-full h-full object-cover ${isLocal && !isScreenshare ? 'scale-x-[-1]' : ''}`}
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
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[10px] font-bold text-white/90 flex items-center gap-1">
                    {isScreenshare && <span>🖥</span>}
                    {username || 'Anonymous'} {isLocal && '(You)'}
                </div>
            )}
        </div>
    );
}

// Draggable + resizable screenshare window overlay
function ScreenshareOverlay({ stream, username, isLocal }) {
    const nodeRef = useRef(null);
    const [size, setSize] = useState({ w: 480, h: 270 });
    const [isResizing, setIsResizing] = useState(false);
    const resizeStart = useRef(null);

    const onResizeMouseDown = useCallback((e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };

        const onMove = (ev) => {
            if (!resizeStart.current) return;
            const dx = ev.clientX - resizeStart.current.x;
            const dy = ev.clientY - resizeStart.current.y;
            setSize({
                w: Math.max(200, resizeStart.current.w + dx),
                h: Math.max(120, resizeStart.current.h + dy),
            });
        };
        const onUp = () => {
            setIsResizing(false);
            resizeStart.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [size]);

    return (
        <Draggable nodeRef={nodeRef} handle=".ss-drag-handle" bounds="parent">
            <div
                ref={nodeRef}
                className="absolute z-50 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black/80 backdrop-blur-md group"
                style={{ width: size.w, height: size.h, top: 80, left: 80 }}
            >
                {/* Drag handle */}
                <div className="ss-drag-handle absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 bg-gradient-to-b from-black/60 to-transparent">
                    <div className="flex items-center gap-2 text-white/60 text-xs font-bold">
                        <span>⠿</span>
                        <span>🖥 Screen Share</span>
                        <span>⠿</span>
                    </div>
                </div>

                <MediaCell stream={stream} isLocal={isLocal} username={username} isScreenshare />

                {/* Resize handle (bottom-right corner) */}
                <div
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end pr-1 pb-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={onResizeMouseDown}
                >
                    <div className="w-3 h-3 border-r-2 border-b-2 border-white/50 rounded-br-sm" />
                </div>

                {/* Size badge */}
                {isResizing && (
                    <div className="absolute top-9 left-2 bg-black/70 text-white/70 text-[10px] font-mono px-2 py-0.5 rounded">
                        {Math.round(size.w)} × {Math.round(size.h)}
                    </div>
                )}
            </div>
        </Draggable>
    );
}

export default function MediaGallery({ localStream, peers, users, myUsername, localScreenShareStream }) {
    // Separate camera streams from screenshare streams
    const screenshareStreams = [];
    if (localScreenShareStream) {
        screenshareStreams.push({ stream: localScreenShareStream, username: myUsername, isLocal: true });
    }
    peers.forEach(({ peerId, stream, isScreenshare }) => {
        if (isScreenshare) {
            const user = users.find(u => u.socketId === peerId);
            screenshareStreams.push({ stream, username: user?.username, isLocal: false });
        }
    });

    const cameraStreams = peers.filter(({ isScreenshare }) => !isScreenshare);

    return (
        <>
            {/* ── Screenshare overlays (draggable + resizable) ── */}
            {screenshareStreams.map(({ stream, username, isLocal }) => (
                <ScreenshareOverlay
                    key={username + '-ss'}
                    stream={stream}
                    username={username}
                    isLocal={isLocal}
                />
            ))}

            {/* ── Camera / audio gallery (bottom strip) ── */}
            {(localStream || cameraStreams.length > 0) && (
                <Draggable handle=".gallery-drag-handle" bounds="parent">
                    <div className="absolute bottom-4 left-4 z-40 pointer-events-auto">
                        <div className="gallery-drag-handle flex items-center gap-1 px-2 py-1 cursor-grab active:cursor-grabbing mb-1 justify-center">
                            <div className="flex gap-0.5">
                                <div className="w-1 h-1 rounded-full bg-white/30" />
                                <div className="w-1 h-1 rounded-full bg-white/30" />
                                <div className="w-1 h-1 rounded-full bg-white/30" />
                            </div>
                        </div>
                        <div className="flex gap-3 items-end">
                            {localStream && (
                                <MediaCell stream={localStream} isLocal={true} username={myUsername} />
                            )}
                            {cameraStreams.map(({ peerId, stream }) => {
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
            )}
        </>
    );
}
