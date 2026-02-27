import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCanvas } from '../../hooks/useCanvas';
import { useWebRTC } from '../../hooks/useWebRTC';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import ChatPanel from './ChatPanel';
import UserList from './UserList';
import GameMode from './GameMode';
import MediaGallery from './MediaGallery';
import PacmanEasterEgg from './PacmanEasterEgg';

// Floating reaction component
function ReactionBurst({ reactions }) {
  return (
    <>
      {reactions.map(r => (
        <div
          key={r.id}
          className="reaction-float"
          style={{ left: r.x, top: r.y }}
        >
          {r.emoji}
          {r.username && (
            <span className="absolute left-1/2 -translate-x-1/2 -bottom-4 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded whitespace-nowrap opacity-80 backdrop-blur-sm">
              {r.username}
            </span>
          )}
        </div>
      ))}
    </>
  );
}

export default function Room() {
  const { id: roomId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState('chat'); // chat | users | null
  const [showGame, setShowGame] = useState(false);
  const [gameLocked, setGameLocked] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [connected, setConnected] = useState(false);
  const [showPacman, setShowPacman] = useState(false);
  const saveTimer = useRef(null);
  const pacmanSeqRef = useRef('');
  const [logoClicks, setLogoClicks] = useState(0);

  const isHost = me?.isHost || false;
  const canDraw = !gameLocked;

  const canvas = useCanvas({ socket, roomId, canDraw });
  const webrtc = useWebRTC(socket, roomId, socket?.id);

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    if (next === 5) {
      toast('🌈 Psst... try the Konami code to unlock Rainbow Mode!', {
        icon: '🤫',
        duration: 4000,
        style: { background: '#1a1a2e', color: '#00FFBF', border: '1px solid rgba(0,255,191,0.2)', fontWeight: 600 },
      });
      setLogoClicks(0);
    } else {
      setLogoClicks(next);
    }
  };

  // 🕹️ Pac-Man easter egg: type "pacman" anywhere (not in an input, not during a game)
  // Hide BMaC donation widget inside rooms — it's distracting during collaboration
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'bmc-hide-in-room';
    style.textContent = '#bmc-wbtn { display: none !important; }';
    document.head.appendChild(style);
    return () => document.getElementById('bmc-hide-in-room')?.remove();
  }, []);

  useEffect(() => {
    const SEQUENCE = 'pacman';
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (showGame) return; // don't trigger during Skribbl
      pacmanSeqRef.current = (pacmanSeqRef.current + e.key).slice(-SEQUENCE.length);
      if (pacmanSeqRef.current === SEQUENCE) {
        setShowPacman(true);
        pacmanSeqRef.current = '';
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showGame]);

  // ── Join ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const color = user?.color || '#00FFBF';
    socket.emit('room:join', { roomId, userColor: color });
  }, [socket, roomId, user]);

  // ── Socket events ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('room:joined', ({ room: r, users: u, me: myInfo }) => {
      setRoom(r); setUsers(u); setMe(myInfo);
      setMessages(r.chatHistory || []);
      setLoading(false);
      if (r.canvasData) setTimeout(() => canvas.restoreCanvas(r.canvasData), 500);
      // Rejoin active game if any
      socket.emit('game:rejoin', { roomId, username: user?.username });
    });

    socket.on('room:user_joined', ({ user: u, users: u2 }) => {
      setUsers(u2);
      toast(`${u.username} joined`, { icon: '👋', duration: 2000 });
      if (me?.isHost) {
        const data = canvas.getDataUrl();
        socket.emit('draw:sync', { roomId, canvasData: data });
      }
    });

    socket.on('room:user_left', ({ username, users: u2 }) => {
      setUsers(u2);
    });

    // Drawing
    socket.on('draw:start', canvas.handleRemoteStart);
    socket.on('draw:move', canvas.handleRemoteMove);
    socket.on('draw:end', canvas.handleRemoteEnd);
    socket.on('draw:text', canvas.handleRemoteText);
    socket.on('draw:clear', () => canvas.clearCanvas(false));
    socket.on('draw:undo', ({ snapshot }) => snapshot && canvas.restoreCanvas(snapshot));
    socket.on('draw:redo', ({ snapshot }) => snapshot && canvas.restoreCanvas(snapshot));
    socket.on('draw:sync_state', ({ canvasData }) => canvasData && canvas.restoreCanvas(canvasData));

    // Chat
    socket.on('chat:message', (msg) => setMessages(m => [...m, msg]));

    // Reactions
    socket.on('reaction:show', ({ emoji, x, y, username: u }) => {
      const id = Date.now() + Math.random();
      setReactions(r => [...r, { id, emoji, x, y, username: u }]);
      setTimeout(() => setReactions(r => r.filter(rx => rx.id !== id)), 2500);
    });

    // Settings
    socket.on('settings:updated', ({ settings }) => {
      setRoom(r => ({ ...r, settings }));
    });

    socket.on('error', ({ message }) => toast.error(message));

    // Auto-open game panel when game starts or rejoining mid-game
    const openGame = () => setShowGame(true);
    socket.on('game:started', openGame);
    socket.on('game:choosing', openGame);
    socket.on('game:sync', openGame);

    // Canvas background sync from peers
    socket.on('room:set_background', ({ bg: newBg }) => canvas.setBg(newBg));

    return () => {
      ['connect', 'disconnect', 'room:joined', 'room:user_joined', 'room:user_left',
        'draw:start', 'draw:move', 'draw:end', 'draw:text', 'draw:clear', 'draw:undo', 'draw:redo',
        'draw:sync_state', 'chat:message', 'reaction:show', 'settings:updated', 'error',
        'game:sync', 'game:started', 'game:choosing',
      ].forEach(e => socket.off(e));
      socket.off('room:set_background');
    };
  }, [socket, canvas, me, roomId, user?.username]);

  // ── Auto save ──────────────────────────────────────────
  useEffect(() => {
    saveTimer.current = setInterval(() => {
      if (!room) return;
      const data = canvas.getDataUrl();
      socket?.emit('canvas:save', { roomId, canvasData: data });
    }, 30000);
    return () => clearInterval(saveTimer.current);
  }, [room, socket, roomId, canvas]);

  // ── Leave ──────────────────────────────────────────────
  const leave = useCallback(() => {
    const data = canvas.getDataUrl();
    socket?.emit('canvas:save', { roomId, canvasData: data });
    socket?.emit('room:leave');
    navigate('/dashboard');
  }, [socket, canvas, roomId, navigate]);

  // ── Copy code ──────────────────────────────────────────
  const copyCode = () => {
    navigator.clipboard.writeText(room?.code || '');
    toast.success('Room code copied!');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-dark text-white">
        <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin mb-4" />
        <p className="text-white/60 font-medium tracking-wide">Connecting to room...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#111117] overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────── */}
      <header className="h-[60px] flex-shrink-0 flex items-center justify-between px-4 bg-brand-dark/80 backdrop-blur-md border-b border-white/5 z-20">

        {/* Left: Logo, Name, Code */}
        <div className="flex items-center gap-3">
          {/* Logo with Easter Egg */}
          <div
            className="flex items-center justify-center w-9 h-9 bg-brand-accent/10 rounded-xl border border-brand-accent/20 cursor-pointer group hover:bg-brand-accent/20 hover:scale-110 transition-all shadow-[0_0_10px_rgba(0,255,191,0.1)] mr-2"
            onClick={handleLogoClick}
            title="Collabrix"
          >
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
              <path d="M8 20 Q14 10 20 20 Q26 30 32 20" stroke="#00FFBF" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="20" cy="20" r="4" fill="#00FFBF" />
            </svg>
          </div>

          <div className="px-3 border-l border-white/10 hidden sm:block">
            <h1 className="text-[15px] font-bold text-white/90 truncate max-w-[200px]">{room?.name}</h1>
          </div>

          <button
            className="flex items-center gap-2 px-3 py-1.5 ml-2 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-lg text-xs font-bold tracking-widest hover:bg-brand-accent/20 transition-all group"
            onClick={copyCode}
            title="Copy room code"
          >
            <span>{room?.code}</span>
            <svg className="opacity-50 group-hover:opacity-100 transition-opacity" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>

          <div
            className={`w-2.5 h-2.5 rounded-full ml-3 ${connected ? 'bg-brand-accent shadow-[0_0_10px_rgba(0,255,191,0.5)]' : 'bg-brand-red shadow-[0_0_10px_rgba(255,107,107,0.5)]'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>

        {/* Center: Avatars & Voice/Video Toggles */}
        <div className="hidden md:flex items-center justify-center gap-4">
          <div className="flex items-center -space-x-2">
            {users.slice(0, 6).map(u => (
              <div
                key={u.socketId}
                className="w-8 h-8 rounded-full border-2 border-brand-dark flex items-center justify-center text-xs font-bold text-brand-dark shadow-sm z-10 hover:z-20 hover:-translate-y-1 transition-transform relative"
                style={{ background: u.color || '#00FFBF' }}
                title={u.username || '?'}
              >
                {(u.username || '?')[0].toUpperCase()}
              </div>
            ))}
            {users.length > 6 && (
              <div className="w-8 h-8 rounded-full border-2 border-brand-dark bg-white/20 flex items-center justify-center text-[10px] font-bold text-white z-0">
                +{users.length - 6}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* WebRTC Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={webrtc.toggleAudio}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${webrtc.audioEnabled ? 'bg-brand-accent/20 text-brand-accent shadow-[0_0_15px_rgba(0,255,191,0.2)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
              title={webrtc.audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {webrtc.audioEnabled ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"></path><path d="M19 10v2a7 7 0 01-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"></path><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              )}
            </button>
            <button
              onClick={webrtc.toggleVideo}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${webrtc.videoEnabled ? 'bg-brand-purple/20 text-[#A29BFE] shadow-[0_0_15px_rgba(162,155,254,0.2)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
              title={webrtc.videoEnabled ? 'Stop Video' : 'Start Video'}
            >
              {webrtc.videoEnabled ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              )}
            </button>
            <button
              onClick={webrtc.toggleScreenShare}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${webrtc.screenEnabled ? 'bg-brand-accent/20 text-brand-accent shadow-[0_0_15px_rgba(0,255,191,0.2)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
              title={webrtc.screenEnabled ? 'Stop Screen Share' : 'Record Screen'}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </button>
          </div>
        </div>

        {/* Right: Toggles */}
        <div className="flex items-center gap-2">
          {/* Game Toggle */}
          <button
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all border ${showGame
              ? 'bg-brand-purple text-white border-brand-purple shadow-[0_0_15px_rgba(162,155,254,0.3)]'
              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            onClick={() => setShowGame(g => !g)}
            title="Skribbl game mode"
          >
            <span>🎮</span>
            <span className="hidden sm:inline">Game</span>
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Users Panel Toggle */}
          <button
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${panel === 'users' ? 'bg-brand-accent/15 text-brand-accent' : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            onClick={() => setPanel(p => p === 'users' ? null : 'users')}
            title="Participants"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </button>

          {/* Chat Panel Toggle */}
          <button
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${panel === 'chat' ? 'bg-brand-accent/15 text-brand-accent' : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            onClick={() => setPanel(p => p === 'chat' ? null : 'chat')}
            title="Chat"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main Layout (Canvas + Sidebar) ──────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Toolbar */}
        <div className="absolute left-4 top-4 z-20">
          <Toolbar {...canvas} socket={socket} roomId={roomId} />
        </div>

        {/* Canvas Wrap */}
        <div className="flex-1 relative cursor-crosshair">
          <Canvas {...canvas} socket={socket} roomId={roomId} />

          {/* Skribbl Game Overlay */}
          {showGame && (
            <GameMode
              socket={socket}
              roomId={roomId}
              username={user?.username}
              isHost={isHost}
              onDrawingLock={setGameLocked}
              onClose={() => setShowGame(false)}
            />
          )}

          {/* Reaction Burst */}
          <ReactionBurst reactions={reactions} />

          {/* 🕹️ Easter egg */}
          {showPacman && <PacmanEasterEgg onClose={() => setShowPacman(false)} />}

          {/* WebRTC Video/Audio Gallery — needs pointer-events-auto, outside the restrictions */}
        </div>

        {/* WebRTC Media overlays — pointer-events-none shell, component handles its own interactions */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          <MediaGallery
            localStream={webrtc.localStream}
            peers={webrtc.peers}
            users={users}
            myUsername={user?.username}
          />
        </div>

        {/* Side Panels */}
        {panel && (
          <div className="w-[320px] h-full flex-shrink-0 overflow-hidden border-l border-white/5 bg-brand-dark/95 backdrop-blur-xl relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] animate-[slideInRight_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            {panel === 'chat' && (
              <ChatPanel
                messages={messages}
                socket={socket}
                roomId={roomId}
                username={user?.username}
                userColor={me?.color}
              />
            )}
            {panel === 'users' && (
              <UserList
                users={users}
                mySocketId={socket?.id}
                isHost={isHost}
                socket={socket}
                roomId={roomId}
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}