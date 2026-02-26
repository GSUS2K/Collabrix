const { socketAuth } = require('../middleware/auth');
const { initGameSocket } = require('./game');
const Room = require('../models/Room');

// roomId -> Map(socketId -> userInfo)
const roomUsers = new Map();

const initSocket = (io) => {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    const { id: userId, username = 'User', color = '#00FFBF' } = socket.user;

    // ── Join Room ───────────────────────────────────────────
    socket.on('room:join', async ({ roomId, userColor }) => {
      try {
        socket.join(roomId);
        socket.roomId = roomId;

        if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
        const users = roomUsers.get(roomId);
        users.set(socket.id, { socketId: socket.id, username, color: userColor || color, isHost: false });

        // Load room from DB
        const room = await Room.findById(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        // Mark host
        const userEntry = users.get(socket.id);
        if (room.host.toString() === userId) userEntry.isHost = true;
        users.set(socket.id, userEntry);

        const userList = Array.from(users.values());

        socket.emit('room:joined', {
          room: {
            _id: room._id,
            name: room.name,
            code: room.code,
            canvasData: room.canvasData,
            stickyNotes: room.stickyNotes,
            chatHistory: room.chatHistory.slice(-50),
            settings: room.settings,
          },
          users: userList,
          me: userEntry,
        });

        socket.to(roomId).emit('room:user_joined', {
          user: userEntry,
          users: userList,
        });

        // Update lastActive
        await Room.findByIdAndUpdate(roomId, { lastActive: new Date() });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Leave Room ──────────────────────────────────────────
    socket.on('room:leave', () => handleLeave(socket, io));
    socket.on('disconnect', () => handleLeave(socket, io));

    // ── Drawing ─────────────────────────────────────────────
    socket.on('draw:start', (data) => socket.to(data.roomId).emit('draw:start', data));
    socket.on('draw:move', (data) => socket.to(data.roomId).emit('draw:move', data));
    socket.on('draw:end', (data) => socket.to(data.roomId).emit('draw:end', data));

    socket.on('draw:clear', ({ roomId }) => {
      socket.to(roomId).emit('draw:clear');
    });

    socket.on('draw:undo', ({ roomId, snapshot }) => {
      socket.to(roomId).emit('draw:undo', { snapshot });
    });

    socket.on('draw:redo', ({ roomId, snapshot }) => {
      socket.to(roomId).emit('draw:redo', { snapshot });
    });

    // Canvas sync to late joiners
    socket.on('draw:sync', ({ roomId, canvasData }) => {
      socket.to(roomId).emit('draw:sync_state', { canvasData });
    });

    // Auto-save canvas
    socket.on('canvas:save', async ({ roomId, canvasData }) => {
      try {
        await Room.findByIdAndUpdate(roomId, { canvasData, lastActive: new Date() });
      } catch { }
    });

    // ── Cursor ──────────────────────────────────────────────
    socket.on('cursor:move', (data) => socket.to(data.roomId).emit('cursor:move', data));

    // ── Chat ────────────────────────────────────────────────
    socket.on('chat:send', async ({ roomId, text }) => {
      if (!text?.trim()) return;
      const users = roomUsers.get(roomId);
      const user = users?.get(socket.id);
      const msg = {
        username: user?.username || username,
        text: text.trim().slice(0, 500),
        color: user?.color || color,
        type: 'message',
        timestamp: new Date(),
      };
      io.to(roomId).emit('chat:message', msg);
      // Persist last 100 messages
      try {
        await Room.findByIdAndUpdate(roomId, {
          $push: { chatHistory: { $each: [msg], $slice: -100 } },
        });
      } catch { }
    });

    // ── Sticky Notes ────────────────────────────────────────
    socket.on('note:add', async ({ roomId, note }) => {
      socket.to(roomId).emit('note:add', { note });
      try { await Room.findByIdAndUpdate(roomId, { $push: { stickyNotes: note } }); } catch { }
    });

    socket.on('note:update', async ({ roomId, note }) => {
      socket.to(roomId).emit('note:update', { note });
      try {
        await Room.findOneAndUpdate(
          { _id: roomId, 'stickyNotes.id': note.id },
          { $set: { 'stickyNotes.$': note } }
        );
      } catch { }
    });

    socket.on('note:delete', async ({ roomId, noteId }) => {
      socket.to(roomId).emit('note:delete', { noteId });
      try { await Room.findByIdAndUpdate(roomId, { $pull: { stickyNotes: { id: noteId } } }); } catch { }
    });

    // ── Reactions ───────────────────────────────────────────
    socket.on('reaction:send', ({ roomId, emoji, x, y }) => {
      io.to(roomId).emit('reaction:show', { emoji, x, y, username });
    });

    // ── Settings ────────────────────────────────────────────
    socket.on('settings:update', async ({ roomId, settings }) => {
      const users = roomUsers.get(roomId);
      const user = users?.get(socket.id);
      if (!user?.isHost) return;
      io.to(roomId).emit('settings:updated', { settings });
      try { await Room.findByIdAndUpdate(roomId, { settings }); } catch { }
    });

    // ── WebRTC Signaling (Mesh Network) ─────────────────────
    socket.on('webrtc:offer', ({ target, caller, sdp }) => {
      // Send offer to the specific target socket
      io.to(target).emit('webrtc:offer', { caller, sdp });
    });

    socket.on('webrtc:answer', ({ target, caller, sdp }) => {
      // Send answer back to the original caller
      io.to(target).emit('webrtc:answer', { caller, sdp });
    });

    socket.on('webrtc:ice-candidate', ({ target, caller, candidate }) => {
      io.to(target).emit('webrtc:ice-candidate', { caller, candidate });
    });

    socket.on('webrtc:toggle-media', ({ roomId, type, isEnabled }) => {
      // type: 'audio' | 'video'
      socket.to(roomId).emit('webrtc:user-toggled-media', {
        socketId: socket.id,
        type,
        isEnabled
      });
    });

    // ── Game ────────────────────────────────────────────────
    initGameSocket(io, socket, roomUsers);
  });
};

async function handleLeave(socket, io) {
  const roomId = socket.roomId;
  if (!roomId) return;

  const users = roomUsers.get(roomId);
  if (!users) return;

  const leaving = users.get(socket.id);
  users.delete(socket.id);

  if (users.size === 0) {
    roomUsers.delete(roomId);
  } else {
    const userList = Array.from(users.values());
    io.to(roomId).emit('room:user_left', {
      username: leaving?.username || 'Someone',
      users: userList,
    });
  }

  socket.leave(roomId);
}

module.exports = { initSocket };