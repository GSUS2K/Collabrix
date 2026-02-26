const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const sign = (id, username, color) => jwt.sign({ id, username, color }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: 'Username or email already taken' });

    const colors = ['#00FFBF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A29BFE', '#FD79A8', '#6C5CE7', '#00CEC9'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const user = await User.create({ username, email, password, color });

    res.status(201).json({
      token: sign(user._id, user.username, user.color),
      user: { id: user._id, username: user.username, email: user.email, color: user.color },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    res.json({
      token: sign(user._id, user.username, user.color),
      user: { id: user._id, username: user.username, email: user.email, color: user.color },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: { id: user._id, username: user.username, email: user.email, color: user.color } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
