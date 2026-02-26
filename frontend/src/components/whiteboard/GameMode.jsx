import { useState, useEffect, useRef } from 'react';
import styles from './GameMode.module.css';

export default function GameMode({ socket, roomId, username, isHost, onDrawingLock, onClose }) {
  const [phase, setPhase]         = useState('lobby'); // lobby|choosing|drawing|turnEnd|over
  const [players, setPlayers]     = useState([]);
  const [drawer, setDrawer]       = useState('');
  const [drawerSid, setDrawerSid] = useState('');
  const [maskedWord, setMaskedWord] = useState('');
  const [myWord, setMyWord]       = useState('');
  const [timer, setTimer]         = useState(0);
  const [maxTime, setMaxTime]     = useState(80);
  const [wordChoices, setWordChoices] = useState([]);
  const [guessLog, setGuessLog]   = useState([]);
  const [guessInput, setGuessInput] = useState('');
  const [youGuessed, setYouGuessed] = useState(false);
  const [turnWord, setTurnWord]   = useState('');
  const [round, setRound]         = useState(1);
  const [maxRounds, setMaxRounds] = useState(3);
  const [settings, setSettings]   = useState({ rounds: 3, turnTime: 80 });
  const logRef   = useRef(null);
  const logIdRef  = useRef(0);

  const amDrawing = drawerSid === socket?.id && phase === 'drawing';

  useEffect(() => {
    const locked = (phase === 'drawing' || phase === 'choosing') && drawerSid !== socket?.id;
    onDrawingLock?.(locked);
  }, [phase, drawerSid, socket, onDrawingLock]);

  useEffect(() => {
    if (!socket) return;

    socket.on('game:started', ({ players: p, rounds, turnTime }) => {
      setPlayers(p.map(x => ({ ...x, score: 0 })));
      setMaxRounds(rounds); setMaxTime(turnTime);
      setGuessLog([]); setYouGuessed(false);
      setPhase('choosing');
    });

    socket.on('game:choosing', ({ drawer: d, drawerSocketId: dsid, round: r, maxRounds: mr }) => {
      setDrawer(d); setDrawerSid(dsid); setRound(r); setMaxRounds(mr);
      setMaskedWord(''); setMyWord(''); setWordChoices([]); setYouGuessed(false);
      setPhase('choosing');
      addLog('system', `Round ${r}/${mr} — ${d} is picking a word...`);
    });

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
      setPlayers([...p].sort((a,b) => b.score - a.score));
      setPhase('over');
    });

    socket.on('game:stopped', () => { setPhase('lobby'); setPlayers([]); setGuessLog([]); });

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
      ['game:started','game:choosing','game:pickWord','game:youDraw','game:roundStart',
       'game:tick','game:hint','game:correctGuess','game:youGuessed','game:wrongGuess',
       'game:turnEnd','game:over','game:stopped','game:sync'].forEach(e => socket.off(e));
    };
  }, [socket]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [guessLog]);

  const addLog = (type, text) => { logIdRef.current += 1; setGuessLog(g => [...g, { type, text, id: logIdRef.current }]); };

  const startGame = () => socket?.emit('game:start', { roomId, ...settings });
  const stopGame  = () => socket?.emit('game:stop', { roomId });
  const pickWord  = (w) => { socket?.emit('game:pickWord', { roomId, word: w }); setWordChoices([]); };
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
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.chooseTitle}>🎨 Pick a word to draw</div>
          <div className={styles.wordChoices}>
            {wordChoices.map(w => (
              <button key={w} className={styles.wordChoice} onClick={() => pickWord(w)}>{w}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Lobby ───────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <span className={styles.gameIcon}>🎮</span>
            <h2 className={styles.modalTitle}>Skribbl Mode</h2>
            <button className={styles.closeX} onClick={onClose}>×</button>
          </div>
          <p className={styles.modalDesc}>One draws, everyone guesses. Fastest guess = most points!</p>

          {isHost && (
            <div className={styles.settingsRow}>
              <div>
                <label className="label">Rounds</label>
                <select className="input" value={settings.rounds}
                  onChange={e => setSettings(s => ({ ...s, rounds: +e.target.value }))}>
                  {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Draw time</label>
                <select className="input" value={settings.turnTime}
                  onChange={e => setSettings(s => ({ ...s, turnTime: +e.target.value }))}>
                  {[60,80,100,120].map(n => <option key={n} value={n}>{n}s</option>)}
                </select>
              </div>
            </div>
          )}

          <div className={styles.modalActions}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            {isHost
              ? <button className="btn btn-primary" onClick={startGame}>Start Game →</button>
              : <p className={styles.waitMsg}>Waiting for host to start...</p>
            }
          </div>
        </div>
      </div>
    );
  }

  // ── Game Over ────────────────────────────────────────────
  if (phase === 'over') {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.overHeader}>
            <div className={styles.trophy}>🏆</div>
            <h2 className={styles.modalTitle}>Game Over!</h2>
            {players[0] && <p className={styles.winner}>{players[0].username} wins with {players[0].score} pts!</p>}
          </div>
          <div className={styles.finalBoard}>
            {players.map((p, i) => (
              <div key={p.socketId} className={`${styles.finalRow} ${i === 0 ? styles.firstPlace : ''}`}>
                <span className={styles.rank}>#{i+1}</span>
                <span className={styles.finalName}>{p.username}</span>
                <span className={styles.finalScore}>{p.score} pts</span>
              </div>
            ))}
          </div>
          <div className={styles.modalActions}>
            {isHost && <button className="btn btn-primary" onClick={startGame}>Play Again →</button>}
            <button className="btn btn-ghost" onClick={() => { stopGame(); onClose?.(); }}>Back to Canvas</button>
          </div>
        </div>
      </div>
    );
  }

  // ── In-game HUD ──────────────────────────────────────────
  return (
    <div className={styles.hud}>
      {/* Turn end flash */}
      {phase === 'turnEnd' && (
        <div className={styles.turnEndFlash}>
          The word was <strong>{turnWord}</strong> — next round starting...
        </div>
      )}

      {/* Timer bar */}
      <div className={styles.timerBar}>
        <div className={styles.timerFill} style={{ width:`${timerPct}%`, background: timerColor }} />
      </div>

      {/* HUD top */}
      <div className={styles.hudTop}>
        <span className={styles.hudRound}>Round {round}/{maxRounds}</span>

        {/* Word */}
        <div className={styles.hudWord}>
          {amDrawing ? (
            <span className={styles.drawWord}>Drawing: <strong>{myWord}</strong></span>
          ) : youGuessed ? (
            <span className={styles.guessedWord}>✅ {maskedWord}</span>
          ) : (
            <span className={styles.blanks}>
              {maskedWord.split('').map((c, i) => (
                <span key={i} className={c === '_' ? styles.blank : c === ' ' ? styles.space : styles.revealedLetter}>
                  {c === '_' ? '' : c === ' ' ? '' : c}
                </span>
              ))}
            </span>
          )}
        </div>

        <div className={styles.hudTimer} style={{ color: timerColor }}>⏱ {timer}s</div>
        {isHost && <button className={`btn btn-ghost ${styles.stopBtn}`} onClick={stopGame}>■ Stop</button>}
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        {[...players].sort((a,b) => b.score - a.score).map((p, i) => (
          <div key={p.socketId} className={`${styles.scoreRow} ${p.username === username ? styles.scoreMe : ''}`}>
            <span className={styles.scoreRank}>#{i+1}</span>
            <span className={styles.scoreName}>
              {p.username}
              {p.socketId === drawerSid && <span className={styles.drawerTag}> ✏️</span>}
            </span>
            <span className={styles.scoreVal}>{p.score}</span>
          </div>
        ))}
      </div>

      {/* Guess panel */}
      <div className={styles.guessPanel}>
        <div className={styles.guessLog} ref={logRef}>
          {guessLog.slice(-10).map(g => (
            <div key={g.id} className={`${styles.guessEntry} ${styles[g.type]}`}>{g.text}</div>
          ))}
        </div>
        {!amDrawing && phase === 'drawing' && !youGuessed && (
          <div className={styles.guessInput}>
            <input
              className="input"
              placeholder="Your guess..."
              value={guessInput}
              onChange={e => setGuessInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendGuess()}
              autoFocus
            />
            <button className="btn btn-primary" onClick={sendGuess}>→</button>
          </div>
        )}
        {youGuessed && (
          <div className={styles.guessedMsg}>🎉 Correct! Watch others guess.</div>
        )}
      </div>
    </div>
  );
}