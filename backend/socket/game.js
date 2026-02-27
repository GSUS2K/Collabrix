const WORDS = [
  'cat', 'dog', 'elephant', 'giraffe', 'penguin', 'dolphin', 'tiger', 'rabbit', 'monkey', 'shark',
  'butterfly', 'octopus', 'kangaroo', 'crocodile', 'peacock', 'flamingo', 'hedgehog', 'cheetah',
  'umbrella', 'guitar', 'telescope', 'bicycle', 'toothbrush', 'backpack', 'scissors', 'lantern',
  'compass', 'suitcase', 'keyboard', 'microphone', 'trophy', 'hourglass', 'anchor', 'binoculars',
  'pizza', 'sushi', 'burger', 'watermelon', 'popcorn', 'sandwich', 'spaghetti', 'donut', 'taco',
  'cupcake', 'strawberry', 'pineapple', 'chocolate', 'broccoli', 'avocado', 'pancakes', 'pretzel',
  'volcano', 'lighthouse', 'castle', 'pyramid', 'igloo', 'windmill', 'treehouse', 'skyscraper',
  'waterfall', 'cave', 'airport', 'library', 'stadium', 'greenhouse', 'submarine', 'spaceship',
  'swimming', 'dancing', 'climbing', 'fishing', 'painting', 'cooking', 'sleeping', 'laughing',
  'jumping', 'reading', 'singing', 'skating', 'surfing', 'gardening', 'hiking', 'juggling',
  'rainbow', 'thunder', 'snowflake', 'tornado', 'eclipse', 'meteor', 'glacier', 'canyon',
  'coral', 'mushroom', 'cactus', 'bamboo', 'sunflower', 'seashell', 'starfish', 'avalanche',
  'dragon', 'unicorn', 'robot', 'wizard', 'ninja', 'pirate', 'astronaut', 'mermaid',
  'saxophone', 'accordion', 'harmonica', 'xylophone', 'bagpipes', 'ukulele', 'trombone',
];

const games = new Map();

const pick3 = () => [...WORDS].sort(() => Math.random() - 0.5).slice(0, 3);
const mask = (w) => w.split('').map(c => c === ' ' ? ' ' : '_').join('');
const levenClose = (a, b) => {
  if (Math.abs(a.length - b.length) > 2) return false;
  let d = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) d++;
  return d <= 2;
};
const revealLetter = (word, shown) => {
  const hidden = word.split('').map((c, i) => c !== ' ' && shown[i] === '_' ? i : -1).filter(i => i !== -1);
  if (!hidden.length) return shown;
  const i = hidden[Math.floor(Math.random() * hidden.length)];
  return shown.split('').map((c, j) => j === i ? word[j] : c).join('');
};

// ── Sync game state to a single rejoining socket ──────────
function syncToSocket(socket, roomId) {
  const g = games.get(roomId);
  if (!g) return;

  const drawer = g.players[g.drawerIdx];

  if (g.status === 'choosing') {
    socket.emit('game:sync', {
      status: 'choosing',
      players: g.players,
      round: g.round,
      maxRounds: g.maxRounds,
      turnTime: g.turnTime,
      drawer: drawer.username,
      drawerSocketId: drawer.socketId,
    });
  } else if (g.status === 'drawing') {
    const isDrawer = drawer.socketId === socket.id;
    socket.emit('game:sync', {
      status: 'drawing',
      players: g.players,
      round: g.round,
      maxRounds: g.maxRounds,
      turnTime: g.turnTime,
      drawer: drawer.username,
      drawerSocketId: drawer.socketId,
      shown: g.shown,
      wordLen: g.word?.length,
      // Only send word to drawer
      word: isDrawer ? g.word : undefined,
    });
  }
}

// ── Update socketId when player reconnects with same username ──
function reconnectPlayer(socket, roomId, username) {
  const g = games.get(roomId);
  if (!g) return;
  const player = g.players.find(p => p.username === username);
  if (!player) return;
  // Update their socket ID
  const wasDrawer = g.players[g.drawerIdx].socketId === player.socketId;
  player.socketId = socket.id;
  // If they were the drawer, re-send the word
  if (wasDrawer && g.status === 'drawing') {
    socket.emit('game:youDraw', { word: g.word });
  }
}

function beginDrawing(io, roomId, word) {
  const g = games.get(roomId);
  if (!g) return;
  clearTimeout(g.chooseTimer);
  g.word = word;
  g.shown = mask(word);
  g.status = 'drawing';
  g.startedAt = Date.now();
  g.guessed = new Set();

  const drawer = g.players[g.drawerIdx];
  io.to(drawer.socketId).emit('game:youDraw', { word });

  io.to(roomId).emit('game:roundStart', {
    shown: g.shown,
    wordLen: word.length,
    drawer: drawer.username,
    drawerSocketId: drawer.socketId,
  });
  io.to(roomId).emit('draw:clear');

  let t = g.turnTime;
  io.to(roomId).emit('game:tick', { t });

  g.timer = setInterval(() => {
    t--;
    io.to(roomId).emit('game:tick', { t });
    if (t === Math.floor(g.turnTime * 0.5) || t === Math.floor(g.turnTime * 0.25)) {
      g.shown = revealLetter(word, g.shown);
      io.to(roomId).emit('game:hint', { shown: g.shown });
    }
    if (t <= 0) { clearInterval(g.timer); endTurn(io, roomId); }
  }, 1000);
}

function startTurn(io, roomId) {
  const g = games.get(roomId);
  if (!g) return;
  const drawer = g.players[g.drawerIdx];
  const words = pick3();
  g.status = 'choosing';
  g.word = null;
  g.shown = null;
  g.pendingWords = words;

  io.to(roomId).emit('game:choosing', {
    drawer: drawer.username,
    drawerSocketId: drawer.socketId,
    round: g.round,
    maxRounds: g.maxRounds,
  });

  io.to(drawer.socketId).emit('game:pickWord', { words });

  g.chooseTimer = setTimeout(() => {
    const g2 = games.get(roomId);
    if (g2?.status === 'choosing') beginDrawing(io, roomId, words[0]);
  }, 15000);
}

function endTurn(io, roomId) {
  const g = games.get(roomId);
  if (!g) return;
  clearInterval(g.timer);
  clearTimeout(g.chooseTimer);
  g.status = 'turnEnd';

  io.to(roomId).emit('game:turnEnd', { word: g.word, players: g.players });

  setTimeout(() => {
    const g2 = games.get(roomId);
    if (!g2) return;
    g2.drawerIdx = (g2.drawerIdx + 1) % g2.players.length;
    if (g2.drawerIdx === 0) g2.round++;
    if (g2.round > g2.maxRounds) {
      const sorted = [...g2.players].sort((a, b) => b.score - a.score);
      io.to(roomId).emit('game:over', { players: sorted });
      games.delete(roomId);
    } else {
      startTurn(io, roomId);
    }
  }, 4500);
}

const initGameSocket = (io, socket, roomUsers) => {
  // ── Rejoin: restore game state for this socket ──────────
  socket.on('game:rejoin', ({ roomId, username }) => {
    reconnectPlayer(socket, roomId, username);
    syncToSocket(socket, roomId);
  });

  socket.on('game:start', ({ roomId, rounds = 3, turnTime = 80 }) => {
    const users = roomUsers.get(roomId);
    if (!users || users.size < 2)
      return socket.emit('error', { message: 'Need at least 2 players to start the game!' });

    const players = Array.from(users.values()).map(u => ({ ...u, score: 0 }));

    games.set(roomId, {
      roomId, players,
      drawerIdx: 0, round: 1, maxRounds: rounds, turnTime,
      status: 'starting', word: null, shown: null,
      guessed: new Set(), startedAt: null,
      timer: null, chooseTimer: null, pendingWords: [],
    });

    io.to(roomId).emit('game:started', { players, rounds, turnTime });
    startTurn(io, roomId);
  });

  socket.on('game:pickWord', ({ roomId, word }) => {
    const g = games.get(roomId);
    if (!g || g.status !== 'choosing') return;
    if (g.players[g.drawerIdx].socketId !== socket.id) return;
    beginDrawing(io, roomId, word);
  });

  socket.on('game:guess', ({ roomId, guess }) => {
    const g = games.get(roomId);
    if (!g || g.status !== 'drawing') return;
    const player = g.players.find(p => p.socketId === socket.id);
    if (!player) return;
    const drawer = g.players[g.drawerIdx];
    if (socket.id === drawer.socketId || g.guessed.has(socket.id)) return;

    const correct = guess.trim().toLowerCase() === g.word.toLowerCase();
    if (correct) {
      g.guessed.add(socket.id);
      const elapsed = (Date.now() - g.startedAt) / 1000;
      const pts = Math.round(80 + Math.max(0, g.turnTime - elapsed) * 2.5);
      player.score += pts;
      drawer.score += 15;

      io.to(roomId).emit('game:correctGuess', { username: player.username, pts, players: g.players });
      socket.emit('game:youGuessed', { word: g.word, pts });

      const nonDrawers = g.players.filter(p => p.socketId !== drawer.socketId);
      if (g.guessed.size >= nonDrawers.length) { clearInterval(g.timer); endTurn(io, roomId); }
    } else {
      io.to(roomId).emit('game:wrongGuess', {
        username: player.username,
        guess,
        close: levenClose(guess.toLowerCase(), g.word.toLowerCase()),
      });
    }
  });

  socket.on('game:stop', ({ roomId }) => {
    const g = games.get(roomId);
    if (g) { clearInterval(g.timer); clearTimeout(g.chooseTimer); games.delete(roomId); }
    io.to(roomId).emit('game:stopped');
  });
};

module.exports = { initGameSocket };