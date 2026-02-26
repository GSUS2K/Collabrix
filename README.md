# Collabrix - Collaborative Whiteboard

Real-time collaborative whiteboard. Dark, modern, feature-rich.

## Quick Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set MONGO_URI and JWT_SECRET
npm run dev
```

### 2. Frontend (dev)
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### 3. Frontend (production / ngrok)
```bash
# First update frontend/.env:
VITE_SOCKET_URL=https://your-ngrok-url.ngrok-free.app

cd frontend && npm run build
cd backend && npm run dev
# ngrok start --all
```

### ngrok config (~/.ngrok.yml or ~/Library/Application Support/ngrok/ngrok.yml)
```yaml
version: "3"
agent:
  authtoken: YOUR_TOKEN
tunnels:
  backend:
    proto: http
    addr: 5001
```

## Features

- ✏️ **Drawing tools**: Pencil, Eraser, Line, Arrow, Rectangle, Circle, Diamond, Triangle, Text, Fill
- 🎨 **Color palette** + custom color picker
- 📐 **Backgrounds**: Blank, Grid, Dots
- ↩️ **Undo/Redo** (synced across users)
- 💬 **Real-time chat** with emoji reactions
- 📌 **Remote cursors** with usernames
- 🎮 **Skribbl.io game mode** built-in
- 📤 **Export PNG**

## Keyboard Shortcuts
- `P` — Pencil
- `E` — Eraser
- `L` — Line
- `A` — Arrow
- `R` — Rectangle
- `C` — Circle
- `F` — Fill
- `T` — Text
- `Ctrl+Z` — Undo
- `Ctrl+Y` / `Ctrl+Shift+Z` — Redo

## 🥚 Easter Eggs
- **Konami Code** (↑↑↓↓←→←→BA) in a room → 🌈 Rainbow Mode!
- Type **"gg"** in chat → 🎉 Confetti explosion!
- Click the logo **7 times** on dashboard → secret hint
- Draw **1000 strokes** → 🎨 Picasso badge!
