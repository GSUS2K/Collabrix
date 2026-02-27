import { useEffect, useRef, useState, useCallback } from 'react';
import Draggable from 'react-draggable';

function MediaCell({ stream, isLocal, username }) {
    const videoRef = useRef(null);

    useEffect(() => {
        console.log(`MediaCell [${username}] stream:`, stream ? stream.id : 'null', 'tracks:', stream?.getTracks().length);
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            console.log(`MediaCell [${username}] attached stream to videoRef`);
        }
    }, [stream, username]);

    if (!stream) return null;

    const hasVideo = stream.getVideoTracks().some(t => t.enabled);

    return (
        <div className={`relative shrink-0 rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center
      ${hasVideo ? 'w-full h-full' : 'w-12 h-12 rounded-full'}`}
        >
            {hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay playsInline muted={isLocal}
                    className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
                />
            ) : (
                <>
                    <audio ref={videoRef} autoPlay playsInline muted={isLocal} />
                    <div className="text-base font-bold text-white">
                        {(username || '?')[0].toUpperCase()}
                    </div>
                    {/* Audio pulse ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-brand-accent/50 animate-[ping_2s_ease-out_infinite] opacity-60" />
                </>
            )}

            {/* Name tag */}
            {hasVideo && (
                <div className="absolute bottom-1 left-2 text-[10px] font-bold text-white/80 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {username || 'User'}{isLocal ? ' (You)' : ''}
                </div>
            )}
        </div>
    );
}

export default function MediaGallery({ localStream, peers, users, myUsername }) {
    const nodeRef = useRef(null);
    const [size, setSize] = useState({ w: 280, h: 210 });
    const [minimized, setMinimized] = useState(false);
    const isResizing = useRef(false);
    const resizeStart = useRef({});

    const allStreams = [
        ...(localStream ? [{ stream: localStream, isLocal: true, username: myUsername, id: 'local' }] : []),
        ...peers.map(({ peerId, stream }) => ({
            stream,
            isLocal: false,
            username: users.find(u => u.socketId === peerId)?.username,
            id: peerId,
        })).filter(p => p.stream),
    ];

    const onResizeMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing.current = true;
        resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };

        const onMove = (e) => {
            if (!isResizing.current) return;
            const dx = e.clientX - resizeStart.current.x;
            const dy = e.clientY - resizeStart.current.y;
            setSize({
                w: Math.max(180, resizeStart.current.w + dx),
                h: Math.max(140, resizeStart.current.h + dy),
            });
        };
        const onUp = () => {
            isResizing.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [size]);

    if (allStreams.length === 0) return null;

    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".media-drag-handle"
            defaultPosition={{ x: 12, y: 12 }}
            bounds="parent"
        >
            <div
                ref={nodeRef}
                className="absolute top-0 left-0 pointer-events-auto z-40 bg-brand-card/85 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl select-none"
                style={{ width: size.w, height: minimized ? 'auto' : size.h }}
            >
                {/* Header / Drag Handle */}
                <div className="media-drag-handle flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/8 cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">📹 Live</span>
                        {allStreams.length > 1 && (
                            <span className="text-[10px] text-white/30">{allStreams.length} feeds</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Minimize/expand */}
                        <button
                            className="w-3.5 h-3.5 rounded-full bg-brand-yellow/70 hover:bg-brand-yellow transition-colors flex items-center justify-center"
                            onClick={(e) => { e.stopPropagation(); setMinimized(m => !m); }}
                            title={minimized ? 'Expand' : 'Minimize'}
                        />
                        {/* Red close dot (just minimizes, not closes since streams are controlled from header) */}
                        <button
                            className="w-3.5 h-3.5 rounded-full bg-brand-red/70 hover:bg-brand-red transition-colors"
                            onClick={(e) => { e.stopPropagation(); setMinimized(true); }}
                            title="Minimise"
                        />
                    </div>
                </div>

                {/* Video grid */}
                {!minimized && (
                    <div className={`w-full overflow-hidden ${allStreams.length === 1 ? 'h-[calc(100%-36px)]' : 'grid gap-1.5 p-1.5'}`}
                        style={allStreams.length > 1 ? {
                            gridTemplateColumns: allStreams.length <= 2 ? '1fr 1fr' : '1fr 1fr 1fr',
                            height: 'calc(100% - 36px)',
                        } : {}}
                    >
                        {allStreams.map(({ stream, isLocal, username, id }) => (
                            <MediaCell key={id} stream={stream} isLocal={isLocal} username={username} />
                        ))}
                    </div>
                )}

                {/* Resize handle (bottom-right corner) */}
                {!minimized && (
                    <div
                        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-50 flex items-end justify-end pb-0.5 pr-0.5"
                        onMouseDown={onResizeMouseDown}
                        style={{ background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.18) 40%)' }}
                    >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 7L7 1M4 7L7 4" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </div>
                )}
            </div>
        </Draggable>
    );
}
