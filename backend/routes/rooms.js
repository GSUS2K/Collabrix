const router = require('express').Router();
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

// POST /api/rooms  — create
router.post('/', protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Room name required' });
    const room = await Room.create({ name, host: req.user.id, hostName: req.user.username || 'Host' });
    res.status(201).json({ room: { _id: room._id, name: room.name, code: room.code, host: room.host } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/my  — my rooms
router.get('/my', protect, async (req, res) => {
  try {
    const rooms = await Room.find({ host: req.user.id }).sort({ lastActive: -1 }).limit(20);
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/join/:code  — find by code
router.get('/join/:code', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ room: { _id: room._id, name: room.name, code: room.code } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/:id  — get room
router.get('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/rooms/:id/canvas  — save canvas
router.patch('/:id/canvas', protect, async (req, res) => {
  try {
    const { canvasData } = req.body;
    await Room.findByIdAndUpdate(req.params.id, { canvasData, lastActive: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/rooms/:id  — delete room
router.delete('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Not found' });
    if (room.host.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    await room.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
