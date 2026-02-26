import styles from './UserList.module.css';

export default function UserList({ users, mySocketId, isHost, socket, roomId }) {
  const kickUser = (socketId) => {
    if (!isHost || socketId === mySocketId) return;
    socket?.emit('kick', { roomId, targetSocketId: socketId });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Participants</span>
        <span className={styles.count}>{users.length}</span>
      </div>
      <div className={styles.list}>
        {users.map(u => (
          <div key={u.socketId} className={`${styles.user} ${u.socketId === mySocketId ? styles.me : ''}`}>
            <div className={styles.avatar} style={{ background: u.color }}>
              {(u.username || '?')[0].toUpperCase()}
            </div>
            <div className={styles.info}>
              <span className={styles.name}>{u.username}</span>
              {u.socketId === mySocketId && <span className={styles.youBadge}>you</span>}
              {u.isHost && <span className={styles.hostBadge}>host</span>}
            </div>
            <div className={styles.dot} style={{ background: u.color }} />
          </div>
        ))}
      </div>
    </div>
  );
}