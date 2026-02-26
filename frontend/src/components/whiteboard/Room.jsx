import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCanvas } from '../../hooks/useCanvas';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Canvas    from './Canvas';
import Toolbar   from './Toolbar';
import ChatPanel from './ChatPanel';
import UserList  from './UserList';
import GameMode  from './GameMode';
import styles    from './Room.module.css';

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
          {r.username && <span className={styles.reactionName}>{r.username}</span>}
        </div>
      ))}
    </>
  );
}

export default function Room() {
  const { id: roomId } = useParams();
  const { user }       = useAuth();
  const { socket }     = useSocket();
  const navigate       = useNavigate();

  const [room, setRoom]           = useState(null);
  const [users, setUsers]         = useState([]);
  const [me, setMe]               = useState(null);
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [panel, setPanel]         = useState('chat'); // chat | users | null
  const [showGame, setShowGame]   = useState(false);
  const [gameLocked, setGameLocked] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [connected, setConnected] = useState(false);
  const saveTimer = useRef(null);

  const isHost = me?.isHost || false;
  const canDraw = !gameLocked;

  const canvas = useCanvas({ socket, roomId, canDraw });

  // ── Join ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const color = user?.color || '#00FFBF';
    socket.emit('room:join', { roomId, userColor: color });
  }, [socket, roomId, user]);

  // ── Socket events ──────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('connect',    () => setConnected(true));
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
    socket.on('draw:move',  canvas.handleRemoteMove);
    socket.on('draw:end',   canvas.handleRemoteEnd);
    socket.on('draw:text',  canvas.handleRemoteText);
    socket.on('draw:clear', () => canvas.clearCanvas(false));
    socket.on('draw:undo',  ({ snapshot }) => snapshot && canvas.restoreCanvas(snapshot));
    socket.on('draw:redo',  ({ snapshot }) => snapshot && canvas.restoreCanvas(snapshot));
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

    // Auto-open game panel if rejoining mid-game
    socket.on('game:sync', () => setShowGame(true));

    return () => {
      ['connect','disconnect','room:joined','room:user_joined','room:user_left',
       'draw:start','draw:move','draw:end','draw:text','draw:clear','draw:undo','draw:redo',
       'draw:sync_state','chat:message','reaction:show','settings:updated','error','game:sync',
      ].forEach(e => socket.off(e));
    };
  }, [socket, canvas, me, roomId]);

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
      <div className={styles.loading}>
        <div className="spinner" style={{ width:40, height:40 }} />
        <p>Joining room...</p>
      </div>
    );
  }

  return (
    <div className={styles.room}>
      {/* ── Top bar ─────────────────────────────────────── */}
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          {/* Logo back */}
          <button className="btn-icon" onClick={leave} title="Leave room">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className={styles.roomName}>{room?.name}</div>

          {/* Code chip */}
          <button className={styles.codeChip} onClick={copyCode} title="Copy room code">
            <span>{room?.code}</span>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>

          {/* Connection indicator */}
          <div className={`${styles.connDot} ${connected ? styles.connOk : styles.connErr}`}
               title={connected ? 'Connected' : 'Disconnected'} />
        </div>

        <div className={styles.topCenter}>
          {/* User avatars */}
          <div className={styles.avatarStack}>
            {users.slice(0, 6).map(u => (
              <div key={u.socketId} className={styles.miniAvatar}
                   style={{ background: u.color || '#00FFBF' }}
                   title={u.username || '?'}>
                {(u.username || '?')[0].toUpperCase()}
              </div>
            ))}
            {users.length > 6 && <div className={styles.miniAvatar} style={{ background:'#333' }}>+{users.length - 6}</div>}
          </div>
        </div>

        <div className={styles.topRight}>
          {/* Game mode */}
          <button
            className={`btn btn-ghost ${styles.topBtn} ${showGame ? styles.topBtnActive : ''}`}
            onClick={() => setShowGame(g => !g)}
            title="Skribbl game mode"
          >
            🎮 Game
          </button>

          {/* Panel toggles */}
          <button
            className={`btn-icon ${panel === 'users' ? 'active' : ''}`}
            onClick={() => setPanel(p => p === 'users' ? null : 'users')}
            title="Participants"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </button>

          <button
            className={`btn-icon ${panel === 'chat' ? 'active' : ''}`}
            onClick={() => setPanel(p => p === 'chat' ? null : 'chat')}
            title="Chat"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────── */}
      <div className={styles.main}>
        <Toolbar {...canvas} />

        <div className={styles.canvasWrap}>
          <Canvas {...canvas} socket={socket} roomId={roomId} />

          {/* Game mode overlay */}
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

          {/* Reactions */}
          <ReactionBurst reactions={reactions} />
        </div>

        {/* Side panels */}
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
    </div>
  );
}