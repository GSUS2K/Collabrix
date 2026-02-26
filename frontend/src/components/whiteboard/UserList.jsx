export default function UserList({ users, mySocketId, isHost, socket, roomId }) {
  const kickUser = (socketId) => {
    if (!isHost || socketId === mySocketId) return;
    socket?.emit('kick', { roomId, targetSocketId: socketId });
  };

  return (
    <div className="flex flex-col h-full bg-brand-dark/40">
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <span className="font-display font-bold text-white/90">Participants</span>
        <span className="bg-white/10 text-white/70 text-xs font-bold px-2 py-0.5 rounded-full">
          {users.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
        {users.map(u => (
          <div
            key={u.socketId}
            className={`group flex items-center gap-3 p-3 rounded-xl transition-all border ${u.socketId === mySocketId
                ? 'bg-white/5 border-white/10'
                : 'bg-transparent border-transparent hover:bg-white/5'
              }`}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-brand-dark shadow-sm"
              style={{ background: u.color || '#00FFBF' }}
            >
              {(u.username || '?')[0].toUpperCase()}
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <span className={`text-sm font-semibold truncate ${u.socketId === mySocketId ? 'text-white' : 'text-white/80'}`}>
                {u.username}
              </span>
              <div className="flex gap-2.5 mt-0.5">
                {u.socketId === mySocketId && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-brand-accent/80">You</span>
                )}
                {u.isHost && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-brand-yellow/80">Host</span>
                )}
              </div>
            </div>

            <div
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ background: u.color || '#00FFBF', boxShadow: `0 0 8px ${u.color || '#00FFBF'}80` }}
            />

            {/* Kick button for hosts */}
            {isHost && u.socketId !== mySocketId && (
              <button
                className="opacity-0 group-hover:opacity-100 absolute right-6 w-7 h-7 flex items-center justify-center bg-brand-red text-white text-xs rounded-lg hover:scale-110 transition-all shadow-lg"
                onClick={() => kickUser(u.socketId)}
                title="Kick user"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}