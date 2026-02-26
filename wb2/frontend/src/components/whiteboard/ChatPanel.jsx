import { useState, useEffect, useRef } from 'react';
import styles from './ChatPanel.module.css';

const REACTIONS = ['👍','❤️','😂','😮','🔥','🎉','💯','🌈'];
const CONFETTI_TRIGGERS = ['gg', 'GG', '🎉', 'lets go', 'LFG'];

function spawnConfetti() {
  const colors = ['#00FFBF','#FF6B6B','#9B72FF','#FFD93D','#4ECDC4'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: 0;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      --dur: ${2 + Math.random() * 2}s;
      --ease: linear;
      animation-delay: ${Math.random() * 0.5}s;
      transform: rotate(${Math.random() * 360}deg);
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

export default function ChatPanel({ messages, socket, roomId, username, userColor }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const t = text.trim();
    if (!t || !socket) return;

    // Easter egg: confetti on certain messages
    if (CONFETTI_TRIGGERS.some(trig => t.toLowerCase().includes(trig.toLowerCase()))) {
      setTimeout(spawnConfetti, 100);
    }

    socket.emit('chat:send', { roomId, text: t });
    setText('');
  };

  const sendReaction = (emoji) => {
    socket?.emit('reaction:send', { roomId, emoji });
    setShowEmoji(false);
  };

  const timeStr = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Chat</span>
        <button className={styles.emojiToggle} onClick={() => setShowEmoji(e => !e)} title="React">
          😀
        </button>
      </div>

      {showEmoji && (
        <div className={styles.reactionBar}>
          {REACTIONS.map(e => (
            <button key={e} className={styles.reactionBtn} onClick={() => sendReaction(e)}>
              {e}
            </button>
          ))}
        </div>
      )}

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>Say hello! 👋</div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.username === username;
          const isSystem = msg.type === 'system';

          if (isSystem) return (
            <div key={i} className={styles.systemMsg}>{msg.text || msg.message}</div>
          );

          return (
            <div key={i} className={`${styles.msg} ${isMe ? styles.msgMe : ''}`}>
              {!isMe && (
                <div className={styles.msgAuthor} style={{ color: msg.color }}>
                  {msg.username}
                </div>
              )}
              <div className={`${styles.msgBubble} ${isMe ? styles.bubbleMe : ''}`}
                   style={isMe ? { background: `${userColor}22`, borderColor: `${userColor}44` } : {}}>
                {msg.text}
              </div>
              <div className={styles.msgTime}>{timeStr(msg.timestamp)}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className={styles.inputRow}>
        <input
          className={`input ${styles.chatInput}`}
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          maxLength={300}
        />
        <button className={`btn btn-primary ${styles.sendBtn}`} onClick={send} disabled={!text.trim()}>
          ↑
        </button>
      </div>
    </div>
  );
}
