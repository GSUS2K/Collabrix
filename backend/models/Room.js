const mongoose = require('mongoose');
const crypto = require('crypto');

const stickyNoteSchema = new mongoose.Schema({
  id: { type: String, required: true },
  x: { type: Number, default: 100 },
  y: { type: Number, default: 100 },
  text: { type: String, default: '' },
  color: { type: String, default: '#FFD93D' },
  author: { type: String, default: '' },
}, { _id: false });

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, unique: true, default: () => crypto.randomBytes(3).toString('hex').toUpperCase() },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hostName: { type: String, required: true },
  canvasData: { type: String, default: '' },
  stickyNotes: [stickyNoteSchema],
  chatHistory: [{
    username: String,
    text: String,
    color: String,
    type: { type: String, default: 'message' },
    timestamp: { type: Date, default: Date.now },
  }],
  settings: {
    allowDraw: { type: Boolean, default: true },
    background: { type: String, default: 'blank' },
  },
  isPublic: { type: Boolean, default: false },
  password: { type: String, default: '' },
  lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
