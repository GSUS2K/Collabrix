import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#00FFBF', '#FF6B6B', '#9B72FF', '#FFD93D', '#4ECDC4', '#FD79A8'];

const TIPS = [
  '💡 Press P for Pencil, E for Eraser, L for Line',
  '🎮 Click "Game" to start a Skribbl round with your team',
  '🎨 Try the Blueprint background in the toolbar!',
  '💬 Share your room code to invite friends instantly',
  '⚡ Use the Laser pointer tool for epic presentations',
  '📤 Export your canvas as PNG anytime',
  '🌐 Create Public rooms for anyone to discover and join',
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [myRooms, setMyRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'public'
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [newName, setNewName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  // Password modal for joining public password-protected rooms
  const [joinPasswordModal, setJoinPasswordModal] = useState(null); // { roomId, roomName }
  const [joinPasswordInput, setJoinPasswordInput] = useState('');
  const [joinPasswordError, setJoinPasswordError] = useState('');

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, pubRes] = await Promise.all([
        api.get('/api/rooms/my'),
        api.get('/api/rooms/public'),
      ]);
      setMyRooms(myRes.data.rooms);
      setPublicRooms(pubRes.data.rooms);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // Tip cycler
  useEffect(() => {
    const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 4000);
    return () => clearInterval(id);
  }, []);

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next === 7) setLogoClicks(0); // reset silently
  };

  const createRoom = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const payload = { name: newName.trim(), isPublic };
      if (isPublic && roomPassword.trim()) payload.password = roomPassword.trim();
      const { data } = await api.post('/api/rooms', payload);
      navigate(`/room/${data.room._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally { setCreating(false); }
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const { data } = await api.get(`/api/rooms/join/${joinCode.trim().toUpperCase()}`);
      navigate(`/room/${data.room._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Room not found');
    } finally { setJoining(false); }
  };

  const enterPublicRoom = async (room) => {
    if (room.hasPassword) {
      setJoinPasswordModal({ roomId: room._id, roomName: room.name });
      setJoinPasswordInput('');
      setJoinPasswordError('');
    } else {
      navigate(`/room/${room._id}`);
    }
  };

  const submitJoinPassword = async (e) => {
    e.preventDefault();
    if (!joinPasswordInput.trim()) return;
    try {
      const { data } = await api.post(`/api/rooms/${joinPasswordModal.roomId}/verify-password`, {
        password: joinPasswordInput,
      });
      if (data.ok) {
        navigate(`/room/${joinPasswordModal.roomId}`);
      }
    } catch (err) {
      setJoinPasswordError(err.response?.data?.message || 'Incorrect password');
    }
  };

  const deleteRoom = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this room? This cannot be undone.')) return;
    try {
      await api.delete(`/api/rooms/${id}`);
      setMyRooms(r => r.filter(x => x._id !== id));
      toast.success('Room deleted');
    } catch { toast.error('Failed to delete room'); }
  };

  const initials = (name) => name?.slice(0, 2).toUpperCase() || 'CC';

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const rooms = activeTab === 'my' ? myRooms : publicRooms;

  return (
    <div className="relative min-h-screen bg-brand-dark text-white font-sans flex flex-col">
      {/* Background with strictly clipped orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-brand-accent/15 rounded-full blur-[130px] animate-[pulse_9s_infinite]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-purple/15 rounded-full blur-[110px] animate-[pulse_11s_infinite_3s]" />
      </div>

      {/* Header */}
      <header className="relative flex justify-between items-center px-6 py-4 md:px-12 backdrop-blur-md border-b border-white/5 bg-brand-dark/50 z-10 flex-shrink-0">
        <div
          className="flex items-center gap-3 cursor-pointer group select-none"
          onClick={handleLogoClick}
        >
          <div className="relative w-9 h-9 flex items-center justify-center bg-brand-accent/10 rounded-xl border border-brand-accent/20 shadow-[0_0_15px_rgba(0,255,191,0.15)] group-hover:bg-brand-accent/20 group-hover:scale-110 transition-all">
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
              <path d="M8 20 Q14 10 20 20 Q26 30 32 20" stroke="#00FFBF" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="20" cy="20" r="4" fill="#00FFBF" />
            </svg>
          </div>
          <span className="text-xl font-display font-bold tracking-wide group-hover:text-brand-accent transition-colors">Collabrix</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 max-w-xs overflow-hidden">
            <span className="text-xs text-white/40 font-medium whitespace-nowrap" key={tipIdx}>{TIPS[tipIdx]}</span>
          </div>

          {/* Social / Monetization Links */}
          <div className="hidden sm:flex items-center gap-3 mr-2 sm:mr-4 pr-2 sm:pr-4 border-r border-white/10">
            <a
              href="https://github.com/GSUS2K"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-all hover:scale-105"
              title="View on GitHub"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://buymeacoffee.com/GSUS2K"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-yellow/10 hover:bg-brand-yellow/20 border border-brand-yellow/20 rounded-full text-[10px] font-bold text-brand-yellow uppercase tracking-wider transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(255,217,61,0.2)]"
            >
              <span className="text-sm">🧊☕</span> Cold Coffee (Max $5)
            </a>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 pr-4 pl-1.5 hover:bg-white/10 transition-all cursor-default" style={{ borderColor: user?.color ? `${user.color}40` : '' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-brand-dark text-[11px]" style={{ background: user?.color || COLORS[0] }}>
              {initials(user?.username)}
            </div>
            <span className="text-sm font-medium text-white/90 hidden sm:block">{user?.username}</span>
          </div>
          <button className="text-sm font-semibold text-white/40 hover:text-white transition-colors py-2 px-3 rounded-md hover:bg-white/5" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="relative flex-1 max-w-6xl w-full mx-auto px-6 py-10 pb-24 z-10">

        {/* Welcome */}
        <div className="mb-10 animate-[slideInUp_0.4s_ease-out]">
          <p className="text-brand-accent/80 text-sm font-bold uppercase tracking-widest mb-1">Welcome back 👋</p>
          <h1 className="text-4xl md:text-5xl font-display font-black">
            Hey, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-[#00CC99]">{user?.username}</span>
          </h1>
          <p className="text-white/40 text-sm mt-2">
            {myRooms.length === 0 ? "Create your first room and start creating!" : `${myRooms.length} private canvas${myRooms.length !== 1 ? 'es' : ''} · ${publicRooms.length} public room${publicRooms.length !== 1 ? 's' : ''} discoverable`}
          </p>
        </div>

        {/* Top Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <button
            className="group flex items-center gap-5 p-6 rounded-2xl bg-gradient-to-br from-brand-accent/10 to-brand-accent/5 border border-brand-accent/20 cursor-pointer transition-all hover:from-brand-accent/20 hover:to-brand-accent/10 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,255,191,0.15)] animate-[slideInUp_0.5s_ease-out] text-left"
            onClick={() => setShowCreate(true)}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-brand-accent/20 text-brand-accent border border-brand-accent/30 group-hover:scale-110 group-hover:rotate-3 transition-transform flex-shrink-0">
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide mb-1">New Room</h3>
              <p className="text-sm text-white/50">Start a blank collaborative canvas</p>
            </div>
            <span className="ml-auto text-brand-accent/40 group-hover:text-brand-accent group-hover:translate-x-1 transition-all text-xl">→</span>
          </button>

          <form
            className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-[slideInUp_0.55s_ease-out] hover:bg-white/[0.07] hover:border-white/20 transition-all"
            onSubmit={joinRoom}
          >
            <input
              className="flex-1 bg-brand-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all uppercase tracking-wider font-mono font-bold"
              placeholder="ROOM CODE (e.g. A1B2C3)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              maxLength={6}
            />
            <button
              className="px-5 py-3.5 bg-brand-accent hover:bg-brand-accentHover text-brand-dark font-bold text-sm rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,255,191,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center whitespace-nowrap"
              type="submit"
              disabled={joining}
            >
              {joining ? <div className="w-5 h-5 border-2 border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" /> : 'Join →'}
            </button>
          </form>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
          {[
            { key: 'my', label: 'My Rooms', count: myRooms.length, icon: '🔒' },
            { key: 'public', label: 'Public Rooms', count: publicRooms.length, icon: '🌐' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key
                ? 'bg-white/10 text-white border border-white/15'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span>
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === tab.key ? 'bg-brand-accent/20 text-brand-accent' : 'bg-white/5 text-white/30'}`}>
                {tab.count}
              </span>
            </button>
          ))}
          <button
            className="ml-auto text-xs text-brand-accent/60 hover:text-brand-accent transition-colors font-bold uppercase tracking-wider"
            onClick={loadRooms}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Rooms Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-b-brand-purple/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.6s' }} />
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors group cursor-pointer"
            onClick={activeTab === 'my' ? () => setShowCreate(true) : undefined}
          >
            <div className="text-6xl mb-5 group-hover:scale-110 transition-transform">
              {activeTab === 'my' ? '🎨' : '🌍'}
            </div>
            <p className="text-white/60 font-bold text-lg mb-1">
              {activeTab === 'my' ? 'No canvases yet' : 'No public rooms yet'}
            </p>
            <p className="text-white/30 text-sm mb-6">
              {activeTab === 'my' ? 'Create your first room to start collaborating' : 'Be the first to create a public room!'}
            </p>
            {activeTab === 'my' && (
              <span className="px-5 py-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-sm font-bold hover:bg-brand-accent/20 transition-colors">
                + Create Room
              </span>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map((room, i) => {
              const accentColor = COLORS[i % COLORS.length];
              const isHovered = hoveredRoom === room._id;
              const isMyRoom = activeTab === 'my';
              return (
                <div
                  key={room._id}
                  className="group relative flex flex-col p-5 rounded-2xl bg-brand-card border border-white/5 hover:border-white/20 transition-all hover:shadow-2xl cursor-pointer hover:-translate-y-1"
                  style={{
                    animation: `slideInUp 0.5s ease-out ${0.05 * i}s both`,
                    boxShadow: isHovered ? `0 20px 60px ${accentColor}22` : '',
                  }}
                  onClick={() => isMyRoom ? navigate(`/room/${room._id}`) : enterPublicRoom(room)}
                  onMouseEnter={() => setHoveredRoom(room._id)}
                  onMouseLeave={() => setHoveredRoom(null)}
                >
                  {/* Glow on hover */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at top left, ${accentColor}08, transparent 60%)` }}
                  />

                  {/* Delete only for my rooms */}
                  {isMyRoom && (
                    <button
                      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white/40 opacity-0 group-hover:opacity-100 outline-none hover:bg-brand-red hover:text-white transition-all z-10 hover:scale-110 hover:rotate-12"
                      onClick={(e) => deleteRoom(room._id, e)}
                      title="Delete room"
                    >
                      ×
                    </button>
                  )}

                  {/* Preview */}
                  <div
                    className="w-full h-28 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative"
                    style={{ background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}05)` }}
                  >
                    <div className="text-6xl font-display font-black opacity-[0.15] group-hover:opacity-25 group-hover:scale-110 transition-all" style={{ color: accentColor }}>
                      {room.name[0].toUpperCase()}
                    </div>
                    <div className="absolute inset-0 opacity-20" style={{
                      backgroundImage: `repeating-linear-gradient(0deg, ${accentColor}20 0px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, ${accentColor}20 0px, transparent 1px, transparent 20px)`,
                      backgroundSize: '20px 20px'
                    }} />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-card to-transparent" />
                  </div>

                  <div className="flex-1 relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-bold text-white/90 truncate flex-1 group-hover:text-white transition-colors">{room.name}</h3>
                      {/* Public/Private badge */}
                      {room.isPublic ? (
                        <span className="flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded bg-brand-accent/10 text-brand-accent border border-brand-accent/20 flex-shrink-0">
                          🌐
                          {room.hasPassword && <span>🔒</span>}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/10 flex-shrink-0">
                          🔒 Private
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2.5 py-1 text-[10px] font-black tracking-widest uppercase rounded-lg border font-mono"
                        style={{ color: accentColor, backgroundColor: `${accentColor}11`, borderColor: `${accentColor}33` }}
                      >
                        {room.code}
                      </span>
                      {!isMyRoom && room.hostName && (
                        <span className="text-[11px] text-white/30 font-medium">by {room.hostName}</span>
                      )}
                      {isMyRoom && (
                        <span className="text-[11px] font-semibold text-white/30">
                          {timeAgo(room.lastActive || room.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-5 border-t border-white/5 text-center flex-shrink-0">
        <p className="text-white/25 text-xs font-medium tracking-wide flex items-center justify-center gap-2">
          Made with <span className="text-brand-red animate-[pulse_2s_infinite]">❤️</span> by{' '}
          <span className="font-bold text-white/40 hover:text-brand-accent transition-colors cursor-default">GSUS</span>{' '}
          using the <span className="font-bold bg-white/5 px-2 py-0.5 rounded text-white/35">MERN</span> stack
        </p>
      </footer>

      {/* Create Room Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => { setShowCreate(false); setNewName(''); setIsPublic(false); setRoomPassword(''); }}
        >
          <div
            className="w-full max-w-md bg-brand-card border border-white/10 rounded-3xl p-8 shadow-2xl animate-[slideInUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-3xl mb-2">🎨</div>
                <h3 className="text-2xl font-display font-bold text-white mb-1">New Canvas</h3>
                <p className="text-sm text-white/40">Give your creative space a name</p>
              </div>
              <button
                className="text-white/30 hover:text-white transition-all hover:rotate-90"
                onClick={() => { setShowCreate(false); setNewName(''); setIsPublic(false); setRoomPassword(''); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={createRoom} className="flex flex-col gap-4">
              <input
                className="w-full bg-brand-dark/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all hover:border-white/20"
                placeholder="e.g. Team Brainstorm, UI Design, Weekend Doodles..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                maxLength={40}
              />

              {/* Public toggle */}
              <div
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${isPublic ? 'bg-brand-accent/10 border-brand-accent/30' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'}`}
                onClick={() => { setIsPublic(p => !p); if (!isPublic) setRoomPassword(''); }}
              >
                <div className={`w-10 h-6 rounded-full transition-all relative flex-shrink-0 ${isPublic ? 'bg-brand-accent' : 'bg-white/20'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isPublic ? 'left-5' : 'left-1'}`} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${isPublic ? 'text-brand-accent' : 'text-white/70'}`}>
                    🌐 Make Public
                  </p>
                  <p className="text-xs text-white/35 mt-0.5">Any signed-in user can discover and join this room</p>
                </div>
              </div>

              {/* Password for public rooms */}
              {isPublic && (
                <div className="animate-[slideInUp_0.2s_ease-out]">
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">
                    Room Password <span className="text-white/20">(optional)</span>
                  </label>
                  <input
                    className="w-full bg-brand-dark/60 border border-brand-accent/20 rounded-xl px-4 py-3 text-sm text-brand-accent placeholder-brand-accent/30 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                    type="text"
                    placeholder="Leave blank for open access..."
                    value={roomPassword}
                    onChange={e => setRoomPassword(e.target.value)}
                    maxLength={20}
                  />
                  <p className="text-[10px] text-white/30 mt-1.5 px-1">
                    🔒 Password-protected public rooms show a lock icon to visitors
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:bg-white/5 hover:text-white transition-all"
                  onClick={() => { setShowCreate(false); setNewName(''); setIsPublic(false); setRoomPassword(''); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-accent text-brand-dark hover:bg-brand-accentHover hover:shadow-[0_0_25px_rgba(0,255,191,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[130px] hover:-translate-y-0.5"
                  disabled={creating || !newName.trim()}
                >
                  {creating ? <div className="w-5 h-5 border-2 border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" /> : 'Create Room →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join password modal for public rooms */}
      {joinPasswordModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setJoinPasswordModal(null)}
        >
          <div
            className="w-full max-w-sm bg-brand-card border border-brand-accent/20 rounded-3xl p-8 shadow-2xl animate-[slideInUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-display font-bold text-white mb-1">Password Required</h3>
            <p className="text-sm text-white/40 mb-6">
              <span className="font-bold text-white/60">{joinPasswordModal.roomName}</span> is password protected
            </p>

            <form onSubmit={submitJoinPassword}>
              <input
                type="password"
                className={`w-full bg-black/40 border ${joinPasswordError ? 'border-brand-red' : 'border-white/10 focus:border-brand-accent'} rounded-xl px-5 py-3.5 text-white text-center tracking-[0.15em] font-mono focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all mb-2`}
                placeholder="••••••••"
                value={joinPasswordInput}
                onChange={e => { setJoinPasswordInput(e.target.value); setJoinPasswordError(''); }}
                autoFocus
              />
              {joinPasswordError && (
                <p className="text-brand-red text-xs font-bold text-center mb-3">{joinPasswordError}</p>
              )}
              <div className="flex gap-3 mt-4">
                <button type="button" className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all" onClick={() => setJoinPasswordModal(null)}>
                  Back
                </button>
                <button type="submit" className="flex-1 py-3 bg-brand-accent hover:bg-brand-accentHover text-brand-dark font-black rounded-xl transition-all disabled:opacity-50" disabled={!joinPasswordInput.trim()}>
                  Enter →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
