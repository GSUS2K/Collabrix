require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const { initSocket } = require('./socket/handler');

const app = express();
const server = http.createServer(app);


if (!process.env.MONGO_URI) {
  console.error("❌ FATAL ERROR: MONGO_URI environment variable is not set.");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL ERROR: JWT_SECRET environment variable is not set.");
  process.exit(1);
}


connectDB();


app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));


app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', '1');
  next();
});


app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);


const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 5e6,
});

initSocket(io);


app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
