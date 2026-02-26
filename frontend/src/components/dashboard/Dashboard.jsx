import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#00FFBF', '#FF6B6B', '#9B72FF', '#FFD93D', '#4ECDC4', '#FD79A8'];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  const loadRooms = useCallback(async () => {
    try {
      const { data } = await api.get('/api/rooms/my');
      setRooms(data.rooms);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // Easter egg: click logo 7 times
  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next === 7) {
      setLogoClicks(0);
      toast('🕵️ You found a secret! psst: try the Konami code in a room', { duration: 5000, icon: '🎉' });
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/api/rooms', { name: newName.trim() });
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

  const deleteRoom = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this room? This cannot be undone.')) return;
    try {
      await api.delete(`/api/rooms/${id}`);
      setRooms(r => r.filter(x => x._id !== id));
      toast.success('Room deleted');
    } catch { toast.error('Failed to delete room'); }
  };

  const initials = (name) => name?.slice(0, 2).toUpperCase() || 'CC';

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative min-h-screen bg-brand-dark text-white font-sans overflow-hidden">
      {/* ── Ambient Orbs ── */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-brand-accent/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-purple/20 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative flex justify-between items-center px-6 py-5 md:px-12 backdrop-blur-md border-b border-white/5 bg-brand-dark/50 z-10 selection:bg-brand-accent selection:text-brand-dark">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={handleLogoClick}
          title="Collabrix Logo"
        >
          <div className="relative w-9 h-9 flex items-center justify-center bg-brand-accent/10 rounded-xl border border-brand-accent/20 shadow-[0_0_15px_rgba(0,255,191,0.15)] group-hover:bg-brand-accent/20 transition-colors">
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
              <path d="M8 20 Q14 10 20 20 Q26 30 32 20" stroke="#00FFBF" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="20" cy="20" r="4" fill="#00FFBF" />
            </svg>
          </div>
          <span className="text-xl font-display font-bold tracking-wide">Collabrix</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 pr-4 pl-1.5 transition-all hover:bg-white/10 cursor-default" style={{ borderColor: user?.color ? `${user.color}40` : '' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-brand-dark text-[11px]" style={{ background: user?.color || COLORS[0] }}>
              {initials(user?.username)}
            </div>
            <span className="text-sm font-medium text-white/90">{user?.username}</span>
          </div>
          <button
            className="text-sm font-semibold text-white/50 hover:text-white transition-colors py-2 px-3 rounded-md hover:bg-white/5"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative max-w-6xl mx-auto px-6 py-12 z-10">

        {/* Top Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">

          {/* Create Room Card */}
          <div
            className="group flex items-center gap-5 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm cursor-pointer transition-all hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-brand-accent/30 animate-[slideInUp_0.4s_ease-out]"
            onClick={() => setShowCreate(true)}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-brand-accent/10 text-brand-accent border border-brand-accent/20 group-hover:scale-110 transition-transform">
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide mb-1">New Room</h3>
              <p className="text-sm text-white/50">Start a blank collaborative canvas</p>
            </div>
          </div>

          {/* Join Form */}
          <form
            className="flex items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-[slideInUp_0.5s_ease-out]"
            onSubmit={joinRoom}
          >
            <input
              className="flex-1 bg-brand-dark/50 border border-white/10 rounded-xl px-5 py-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all uppercase tracking-wider font-mono font-bold"
              placeholder="ENTER ROOM CODE (e.g. A1B2C3)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              maxLength={6}
            />
            <button
              className="h-full px-6 bg-brand-accent hover:bg-brand-accentHover text-brand-dark font-bold text-sm rounded-xl transition-all shadow-lg hover:shadow-[0_0_20px_rgba(0,255,191,0.3)] disabled:opacity-50 flex items-center justify-center min-w-[100px]"
              type="submit"
              disabled={joining}
            >
              {joining ? <div className="w-5 h-5 border-2 border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" /> : 'Join →'}
            </button>
          </form>
        </div>

        {/* Rooms Section */}
        <section className="animate-[slideInUp_0.6s_ease-out]">
          <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-3">
            Your Rooms <span className="text-sm font-sans font-medium bg-white/10 px-3 py-1 rounded-full text-white/60">{rooms.length}</span>
          </h2>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
              <div className="text-5xl mb-4 opacity-50">🎨</div>
              <p className="text-white/50 font-medium">No rooms yet — create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room, i) => {
                const accentColor = COLORS[i % COLORS.length];
                return (
                  <div
                    key={room._id}
                    className="group relative flex flex-col p-5 rounded-2xl bg-brand-card border border-white/5 hover:border-white/20 transition-all hover:shadow-xl cursor-pointer"
                    onClick={() => navigate(`/room/${room._id}`)}
                  >
                    {/* Delete button (appears on hover) */}
                    <button
                      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white/50 opacity-0 group-hover:opacity-100 outline-none hover:bg-brand-red hover:text-white transition-all z-10 hover:scale-110"
                      onClick={(e) => deleteRoom(room._id, e)}
                      title="Delete room"
                    >
                      ×
                    </button>

                    <div
                      className="w-full h-32 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative"
                      style={{ background: `linear-gradient(135deg, ${accentColor}22, transparent)` }}
                    >
                      <div className="text-5xl font-display font-bold opacity-20" style={{ color: accentColor }}>
                        {room.name[0].toUpperCase()}
                      </div>
                      <div
                        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-card to-transparent"
                      />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white/90 mb-3 truncate pr-8">{room.name}</h3>
                      <div className="flex items-center justify-between mt-auto">
                        <span
                          className="px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase rounded-lg border"
                          style={{ color: accentColor, backgroundColor: `${accentColor}11`, borderColor: `${accentColor}33` }}
                        >
                          {room.code}
                        </span>
                        <span className="text-xs font-semibold text-white/40">
                          {timeAgo(room.lastActive || room.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Create Room Modal ── */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-md bg-brand-card border border-white/10 rounded-3xl p-8 shadow-2xl animate-[slideInUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-display font-bold text-white mb-2">Create New Room</h3>
                <p className="text-sm text-white/50">Give your collaborative canvas a name</p>
              </div>
              <button
                className="text-white/30 hover:text-white transition-colors"
                onClick={() => setShowCreate(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={createRoom}>
              <input
                className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all mb-8"
                placeholder="e.g. Team Brainstorm, UI Design..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                maxLength={40}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:bg-white/5 transition-colors"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-accent text-brand-dark hover:bg-brand-accentHover hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                  disabled={creating || !newName.trim()}
                >
                  {creating ? <div className="w-5 h-5 border-2 border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" /> : 'Create Room →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
