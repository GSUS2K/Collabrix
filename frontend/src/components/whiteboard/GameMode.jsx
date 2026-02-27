import { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';

export default function GameMode({ socket, roomId, username, isHost, onDrawingLock, onClose }) {
  const [phase, setPhase] = useState('lobby'); // lobby|choosing|drawing|turnEnd|over
  const [players, setPlayers] = useState([]);
  const [drawer, setDrawer] = useState('');
  const [drawerSid, setDrawerSid] = useState('');
  const [maskedWord, setMaskedWord] = useState('');
  const [myWord, setMyWord] = useState('');
  const [timer, setTimer] = useState(0);
  const [maxTime, setMaxTime] = useState(80);
  const [wordChoices, setWordChoices] = useState([]);
  const [guessLog, setGuessLog] = useState([]);
  const [guessInput, setGuessInput] = useState('');
  const [youGuessed, setYouGuessed] = useState(false);
  const [turnWord, setTurnWord] = useState('');
  const [round, setRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(3);
  const [settings, setSettings] = useState({ rounds: 3, turnTime: 80 });
  const logRef = useRef(null);
  const logIdRef = useRef(0);
  const hudRef = useRef(null); // For Draggable nodeRef

  const amDrawing = drawerSid === socket?.id && phase === 'drawing';

  // Escape key to close lobby / word-pick overlays
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && (phase === 'lobby' || (phase === 'choosing' && wordChoices.length > 0))) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, wordChoices, onClose]);

  // Lock drawing for non-drawers
  useEffect(() => {
    const locked = (phase === 'drawing' || phase === 'choosing') && drawerSid !== socket?.id;
    onDrawingLock?.(locked);
  }, [phase, drawerSid, socket, onDrawingLock]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('game:started', ({ players: p, rounds, turnTime }) => {
      setPlayers(p.map(x => ({ ...x, score: 0 })));
      setMaxRounds(rounds); setMaxTime(turnTime);
      setGuessLog([]); setYouGuessed(false);
      setPhase('choosing');
    });

    socket.on('game:choosing', ({ drawer: d, drawerSocketId: dsid, round: r, maxRounds: mr, words }) => {
      setDrawer(d); setDrawerSid(dsid); setRound(r); setMaxRounds(mr);
      setMaskedWord(''); setMyWord(''); setYouGuessed(false);
      setWordChoices(socket.id === dsid ? (words || []) : []);
      setPhase('choosing');
      addLog('system', `Round ${r}/${mr} — ${d} is picking a word...`);
    });

    // Keep legacy listener just in case
    socket.on('game:pickWord', ({ words }) => setWordChoices(words));

    socket.on('game:youDraw', ({ word }) => {
      setMyWord(word); setMaskedWord(word);
    });

    socket.on('game:roundStart', ({ shown, wordLen, drawer: d, drawerSocketId: dsid }) => {
      setMaskedWord(shown); setDrawer(d); setDrawerSid(dsid);
      setPhase('drawing');
      addLog('system', `✏️ ${d} is drawing! (${wordLen} letters)`);
    });

    socket.on('game:tick', ({ t }) => setTimer(t));

    socket.on('game:hint', ({ shown }) => {
      setMaskedWord(shown);
      addLog('hint', `💡 Hint revealed!`);
    });

    socket.on('game:correctGuess', ({ username: u, pts, players: p }) => {
      setPlayers(p);
      addLog('correct', `✅ ${u} guessed it! +${pts} pts`);
    });

    socket.on('game:youGuessed', ({ word, pts }) => {
      setYouGuessed(true); setMaskedWord(word);
      addLog('correct', `🎉 You got it! +${pts} pts`);
    });

    socket.on('game:wrongGuess', ({ username: u, guess, close }) => {
      addLog(close ? 'close' : 'wrong', close ? `🔥 ${u}: "${guess}" — so close!` : `${u}: ${guess}`);
    });

    socket.on('game:turnEnd', ({ word, players: p }) => {
      setTurnWord(word); setPlayers(p); setPhase('turnEnd');
      addLog('system', `⏰ Time's up! Word was: "${word}"`);
    });

    socket.on('game:over', ({ players: p }) => {
      setPlayers([...p].sort((a, b) => b.score - a.score));
      setPhase('over');
    });

    // Game stopped by host — reset to lobby (don't close, just show lobby again)
    socket.on('game:stopped', () => {
      setPhase('lobby');
      setPlayers([]);
      setGuessLog([]);
      setWordChoices([]);
      setMaskedWord('');
      setMyWord('');
    });

    // Restore state after refresh
    socket.on('game:sync', ({ status, players: p, round: r, maxRounds: mr, turnTime: tt,
      drawer: d, drawerSocketId: dsid, shown, wordLen, word }) => {
      setPlayers(p); setRound(r); setMaxRounds(mr); setMaxTime(tt);
      setDrawer(d); setDrawerSid(dsid); setYouGuessed(false);

      if (status === 'choosing') {
        setPhase('choosing');
        addLog('system', `Round ${r}/${mr} — ${d} is picking a word...`);
      } else if (status === 'drawing') {
        setPhase('drawing');
        if (word) { setMyWord(word); setMaskedWord(word); }
        else if (shown) setMaskedWord(shown);
        addLog('system', `✏️ ${d} is drawing! (${wordLen} letters)`);
      }
    });

    return () => {
      ['game:started', 'game:choosing', 'game:pickWord', 'game:youDraw', 'game:roundStart',
        'game:tick', 'game:hint', 'game:correctGuess', 'game:youGuessed', 'game:wrongGuess',
        'game:turnEnd', 'game:over', 'game:stopped', 'game:sync'].forEach(e => socket.off(e));
    };
  }, [socket]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [guessLog]);

  const addLog = (type, text) => { logIdRef.current += 1; setGuessLog(g => [...g, { type, text, id: logIdRef.current }]); };

  const startGame = () => socket?.emit('game:start', { roomId, ...settings });
  const stopGame = () => socket?.emit('game:stop', { roomId });
  const pickWord = (w) => { socket?.emit('game:pickWord', { roomId, word: w }); setWordChoices([]); };
  const sendGuess = () => {
    if (!guessInput.trim()) return;
    socket?.emit('game:guess', { roomId, guess: guessInput });
    setGuessInput('');
  };

  const timerPct = (timer / maxTime) * 100;
  const timerColor = timer <= 10 ? '#FF6B6B' : timer <= 20 ? '#FFD93D' : '#00FFBF';

  // ── Word picking overlay ─────────────────────────────────
  if (phase === 'choosing' && wordChoices.length > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s]">
        <div className="bg-brand-card border-2 border-brand-accent/30 p-8 rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col items-center min-w-[320px] animate-[slideInUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
          <div className="text-2xl mb-2">🎨 <span className="font-display font-bold text-white">Pick a word to draw</span></div>
          <p className="text-xs text-white/40 mb-6">Choose wisely — harder words score more if guessed fast!</p>
          <div className="flex flex-col gap-3 w-full">
            {wordChoices.map(w => (
              <button
                key={w}
                className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-xl text-lg font-bold text-brand-accent hover:bg-brand-accent hover:text-brand-dark transition-all transform hover:scale-105 shadow-md flex justify-center uppercase tracking-wider"
                onClick={() => pickWord(w)}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Lobby ───────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s]"
        onClick={onClose}
      >
        <div
          className="bg-brand-card border border-white/10 p-8 rounded-3xl shadow-2xl max-w-sm w-full animate-[slideInUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
          onClick={e => e.stopPropagation()} // prevent backdrop click from firing through card
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎮</span>
              <h2 className="text-2xl font-display font-bold text-white">Skribbl Mode</h2>
            </div>
            <button
              className="text-white/40 hover:text-white transition-colors hover:rotate-90 transition-transform"
              onClick={onClose}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-white/60 mb-8 leading-relaxed">
            One player draws, everyone else guesses. The faster you guess, the more points you earn!
          </p>

          {isHost && (
            <div className="flex gap-4 mb-8">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Rounds</label>
                <select
                  className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-all cursor-pointer"
                  value={settings.rounds}
                  onChange={e => setSettings(s => ({ ...s, rounds: +e.target.value }))}
                >
                  {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Draw time</label>
                <select
                  className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-accent transition-all cursor-pointer"
                  value={settings.turnTime}
                  onChange={e => setSettings(s => ({ ...s, turnTime: +e.target.value }))}
                >
                  {[60, 80, 100, 120].map(n => <option key={n} value={n}>{n}s</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <button className="text-sm font-semibold text-white/50 hover:text-white transition-colors" onClick={onClose}>
              Cancel
            </button>
            {isHost ? (
              <button
                className="bg-brand-purple hover:bg-[#8D5FFF] text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-[0_0_20px_rgba(162,155,254,0.4)] flex items-center gap-2 group"
                onClick={startGame}
              >
                Start Game <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            ) : (
              <p className="text-sm text-brand-yellow/80 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse" />
                Waiting for host...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Game Over ────────────────────────────────────────────
  if (phase === 'over') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-[fadeIn_0.3s]">
        <div className="bg-brand-card border-2 border-brand-yellow/30 p-10 rounded-3xl shadow-[0_20px_60px_rgba(255,217,61,0.15)] max-w-md w-full animate-[slideInUp_0.4s_cubic-bezier(0.34,1.56,0.64,1)] text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-brand-yellow/10 rounded-full blur-[60px] pointer-events-none" />
          <div className="text-7xl mb-4 animate-[reactionFloat_2s_ease-out_forwards]">🏆</div>
          <h2 className="text-4xl font-display font-black text-white mb-2 tracking-tight">Game Over!</h2>

          {players[0] && (
            <p className="text-lg font-medium text-brand-yellow mb-8">
              <strong className="text-white">{players[0].username}</strong> wins with {players[0].score} pts!
            </p>
          )}

          <div className="flex flex-col gap-3 mb-10 text-left bg-brand-dark/50 p-4 rounded-2xl border border-white/5">
            {players.map((p, i) => (
              <div key={p.socketId} className={`flex items-center p-3 rounded-xl ${i === 0 ? 'bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow' : 'bg-white/5 text-white/80'}`}>
                <span className={`w-8 font-black ${i === 0 ? 'text-lg' : 'text-sm opacity-50'}`}>#{i + 1}</span>
                <span className="flex-1 font-bold truncate pr-4">{p.username}</span>
                <span className="font-mono">{p.score} pts</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all" onClick={() => { stopGame(); onClose?.(); }}>
              Back to Canvas
            </button>
            {isHost && (
              <button className="flex-1 py-3 px-4 bg-brand-accent hover:bg-brand-accentHover text-brand-dark shadow-lg shadow-brand-accent/20 font-bold rounded-xl transition-all" onClick={startGame}>
                Play Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── In-game HUD (choosing-waiting + drawing + turnEnd) ──
  return (
    <Draggable nodeRef={hudRef} handle=".game-drag-handle" bounds="parent">
      <div ref={hudRef} className="absolute z-40 top-4 right-4 w-[320px] max-h-[85vh] bg-brand-card/90 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-[slideInRight_0.4s_ease-out]">

        {/* Turn end flash */}
        {phase === 'turnEnd' && (
          <div className="absolute inset-0 z-30 bg-brand-dark/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.2s]">
            <span className="text-5xl mb-4">⏰</span>
            <div className="text-lg text-white/80 mb-2">The word was</div>
            <div className="text-3xl font-display font-black text-brand-accent tracking-widest uppercase mb-6">{turnWord}</div>
            <div className="text-sm font-medium text-white/40 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              Next round starting...
            </div>
          </div>
        )}

        {/* Choosing-waiting overlay (drawer is picking, others wait) */}
        {phase === 'choosing' && wordChoices.length === 0 && (
          <div className="absolute inset-0 z-20 bg-brand-dark/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="text-4xl mb-3 animate-[pulse_1s_infinite]">🤔</div>
            <div className="text-sm font-bold text-white/80">{drawer} is picking a word...</div>
            <div className="text-xs text-white/40 mt-1">Round {round}/{maxRounds}</div>
          </div>
        )}

        {/* Timer bar */}
        <div className="h-1.5 w-full bg-brand-dark flex-shrink-0">
          <div
            className="h-full transition-all duration-1000 ease-linear rounded-r-full"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
          />
        </div>

        {/* HUD top */}
        <div className="p-4 bg-white/[0.02] border-b border-white/5 flex flex-col relative overflow-hidden flex-shrink-0">
          {/* Drag Handle */}
          <div className="game-drag-handle flex justify-center pb-2 cursor-grab active:cursor-grabbing hover:bg-white/5 -mt-2 -mx-4 mb-2 opacity-50 transition-colors">
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/40 bg-white/5 px-2 py-0.5 rounded">
              Round {round}/{maxRounds}
            </span>
            <div className="text-base font-black font-mono pr-12" style={{ color: timerColor }}>⏱ {timer}s</div>
          </div>

          {/* Word display */}
          <div className="flex justify-center mb-2 min-h-[40px] items-center">
            {amDrawing ? (
              <div className="flex flex-col items-center">
                <span className="text-xs text-brand-yellow/80 font-bold uppercase tracking-wider mb-1">Draw this:</span>
                <span className="text-2xl font-display font-black text-white tracking-widest uppercase">{myWord}</span>
              </div>
            ) : youGuessed ? (
              <div className="flex flex-col items-center animate-[fadeIn_0.3s]">
                <span className="text-xs text-brand-accent/80 font-bold uppercase tracking-wider mb-1">You Guessed It!</span>
                <span className="text-2xl font-display font-black text-brand-accent tracking-widest uppercase">{maskedWord}</span>
              </div>
            ) : (
              <div className="flex gap-1 flex-wrap justify-center">
                {maskedWord.split('').map((c, i) => (
                  <span
                    key={i}
                    className={`flex items-center justify-center font-display font-bold uppercase text-xl
                    ${c === '_' ? 'w-4 border-b-2 border-white/40 mb-1 mx-0.5'
                        : c === ' ' ? 'w-4'
                          : 'w-auto min-w-[16px] text-white'}`}
                  >
                    {c === '_' ? '' : c === ' ' ? '' : c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stop game button — prominent, dedicated placement */}
          {isHost && (
            <button
              className="absolute top-8 right-3 text-[10px] font-bold uppercase tracking-wider text-brand-red/60 hover:text-brand-red transition-colors z-10 bg-brand-dark/50 hover:bg-brand-red/10 px-2 py-1 rounded border border-transparent hover:border-brand-red/30"
              onClick={stopGame}
              title="Stop game (host only)"
            >
              ■ Stop
            </button>
          )}
        </div>

        {/* Scoreboard */}
        <div className="max-h-[120px] overflow-y-auto p-2 grid grid-cols-2 gap-2 bg-brand-dark/30 border-b border-white/5 hide-scrollbar flex-shrink-0">
          {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
            <div
              key={p.socketId}
              className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-semibold
              ${p.username === username ? 'bg-brand-accent/10 border border-brand-accent/20 text-brand-accent' : 'bg-white/5 text-white/70'}`}
            >
              <span className={`w-3 flex-shrink-0 text-[10px] ${i === 0 ? 'text-brand-yellow' : 'opacity-40'}`}>#{i + 1}</span>
              <span className="flex-1 truncate">
                {p.username}
                {p.socketId === drawerSid && <span className="ml-1 text-[10px]">✏️</span>}
              </span>
              <span className="font-mono">{p.score}</span>
            </div>
          ))}
        </div>

        {/* Guess log + input */}
        <div className="flex-1 min-h-[180px] flex flex-col bg-brand-dark/10 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-sm hide-scrollbar" ref={logRef}>
            {guessLog.slice(-20).map(g => (
              <div
                key={g.id}
                className={`px-3 py-1.5 rounded-lg break-words animate-[fadeIn_0.2s_ease-out]
                ${g.type === 'system' ? 'text-white/50 text-xs font-bold text-center my-1' : ''}
                ${g.type === 'wrong' ? 'text-white/80 bg-white/5' : ''}
                ${g.type === 'close' ? 'text-brand-yellow font-medium bg-brand-yellow/10 border border-brand-yellow/20' : ''}
                ${g.type === 'hint' ? 'text-brand-purple font-medium bg-brand-purple/10 border border-brand-purple/20' : ''}
                ${g.type === 'correct' ? 'text-brand-accent font-bold bg-brand-accent/10 border border-brand-accent/20 shadow-[0_0_10px_rgba(0,255,191,0.1)]' : ''}
              `}
              >
                {g.text}
              </div>
            ))}
          </div>

          {!amDrawing && phase === 'drawing' && !youGuessed && (
            <div className="p-3 bg-brand-dark border-t border-white/5">
              <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-brand-accent focus-within:ring-1 focus-within:ring-brand-accent transition-all">
                <input
                  className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
                  placeholder="Type your guess..."
                  value={guessInput}
                  onChange={e => setGuessInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendGuess()}
                  autoFocus
                />
                <button
                  className="px-4 text-brand-dark bg-brand-accent hover:bg-brand-accentHover font-bold transition-colors disabled:opacity-50"
                  onClick={sendGuess}
                  disabled={!guessInput.trim()}
                >
                  →
                </button>
              </div>
            </div>
          )}

          {youGuessed && (
            <div className="p-3 bg-brand-dark/80 border-t border-white/5 text-center">
              <div className="text-xs font-bold text-brand-accent uppercase tracking-wider">🎉 Correct! Watch others guess.</div>
            </div>
          )}

          {amDrawing && phase === 'drawing' && (
            <div className="p-3 bg-brand-dark/80 border-t border-white/5 text-center">
              <div className="text-xs font-bold text-brand-yellow/80 uppercase tracking-wider">✏️ You're drawing — go!</div>
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
}