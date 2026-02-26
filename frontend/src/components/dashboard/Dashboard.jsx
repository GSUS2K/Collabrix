import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import styles from './Dashboard.module.css';

const COLORS = ['#00FFBF','#FF6B6B','#9B72FF','#FFD93D','#4ECDC4','#FD79A8'];

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
    } catch { toast.error('Failed to load rooms'); }
    finally { setLoading(false); }
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
    if (!confirm('Delete this room? This cannot be undone.')) return;
    try {
      await api.delete(`/api/rooms/${id}`);
      setRooms(r => r.filter(x => x._id !== id));
      toast.success('Room deleted');
    } catch { toast.error('Failed to delete room'); }
  };

  const initials = (name) => name?.slice(0,2).toUpperCase() || 'CC';
  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className={styles.page}>
      {/* Ambient */}
      <div className={styles.orb} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo} onClick={handleLogoClick}>
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="#00FFBF" fillOpacity="0.15"/>
            <path d="M8 20 Q14 10 20 20 Q26 30 32 20" stroke="#00FFBF" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <circle cx="20" cy="20" r="3" fill="#00FFBF"/>
          </svg>
          <span className={styles.logoName}>Collabrix</span>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.userChip} style={{ borderColor: user?.color || COLORS[0] }}>
            <div className={styles.avatar} style={{ background: user?.color || COLORS[0] }}>
              {initials(user?.username)}
            </div>
            <span className={styles.userName}>{user?.username}</span>
          </div>
          <button className="btn btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Quick actions */}
        <div className={styles.actions}>
          <div className={styles.actionCard} onClick={() => setShowCreate(true)}>
            <div className={styles.actionIcon} style={{ background: 'rgba(0,255,191,0.1)', color: '#00FFBF' }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className={styles.actionTitle}>New Room</div>
              <div className={styles.actionSub}>Start a blank canvas</div>
            </div>
          </div>

          <form className={styles.joinForm} onSubmit={joinRoom}>
            <input
              className={`input ${styles.joinInput}`}
              placeholder="Enter room code (e.g. A1B2C3)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              maxLength={6}
              style={{ textTransform: 'uppercase' }}
            />
            <button className="btn btn-ghost" type="submit" disabled={joining}>
              {joining ? <span className="spinner" /> : 'Join →'}
            </button>
          </form>
        </div>

        {/* Rooms grid */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Your Rooms</h2>

          {loading ? (
            <div className={styles.loader}><div className="spinner" style={{ width:32, height:32 }} /></div>
          ) : rooms.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🎨</div>
              <p>No rooms yet — create one to get started!</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {rooms.map((room, i) => (
                <div
                  key={room._id}
                  className={styles.roomCard}
                  onClick={() => navigate(`/room/${room._id}`)}
                  style={{ '--accent': COLORS[i % COLORS.length] }}
                >
                  <div className={styles.roomThumb} style={{ background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}22, transparent)` }}>
                    <div className={styles.roomInitial} style={{ color: COLORS[i % COLORS.length] }}>
                      {room.name[0].toUpperCase()}
                    </div>
                  </div>
                  <div className={styles.roomInfo}>
                    <div className={styles.roomName}>{room.name}</div>
                    <div className={styles.roomMeta}>
                      <span className={`badge badge-teal ${styles.codeTag}`}>{room.code}</span>
                      <span className={styles.timeAgo}>{timeAgo(room.lastActive || room.updatedAt)}</span>
                    </div>
                  </div>
                  <button
                    className={`${styles.deleteBtn}`}
                    onClick={(e) => deleteRoom(room._id, e)}
                    title="Delete room"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Create New Room</h3>
            <p className={styles.modalSub}>Give your canvas a name</p>
            <form onSubmit={createRoom}>
              <input
                className="input"
                placeholder="e.g. Team Brainstorm, Design Review..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                maxLength={40}
                style={{ marginBottom: 16 }}
              />
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating || !newName.trim()}>
                  {creating ? <span className="spinner" /> : 'Create Room →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
