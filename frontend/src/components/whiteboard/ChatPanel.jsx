import { useState, useEffect, useRef } from 'react';

const REACTIONS = ['👍', '❤️', '😂', '😮', '🔥', '🎉', '💯', '🌈'];
const CONFETTI_TRIGGERS = ['gg', 'GG', '🎉', 'lets go', 'LFG'];

function spawnConfetti() {
  const colors = ['#00FFBF', '#FF6B6B', '#9B72FF', '#FFD93D', '#4ECDC4'];
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
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-brand-dark/40">

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <span className="font-display font-bold text-white/90">Chat</span>
        <div className="relative">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-lg"
            onClick={() => setShowEmoji(e => !e)}
            title="React"
          >
            😀
          </button>

          {/* Reaction Bar */}
          {showEmoji && (
            <div className="absolute right-0 top-10 flex bg-brand-card border border-white/10 p-1.5 rounded-xl shadow-2xl z-50 animate-[slideInRight_0.2s_ease-out]">
              {REACTIONS.map(e => (
                <button
                  key={e}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg transition-transform hover:scale-125"
                  onClick={() => sendReaction(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm">
            <div className="text-4xl mb-2 opacity-50">👋</div>
            Say hello to the room!
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.username === username;
          const isSystem = msg.type === 'system';

          if (isSystem) return (
            <div key={i} className="text-center text-xs font-semibold text-white/40 my-3 opacity-80 uppercase tracking-widest">
              {msg.text || msg.message}
            </div>
          );

          return (
            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-[fadeIn_0.2s_ease-out]`}>
              {!isMe && (
                <div className="text-[11px] font-bold mb-1 ml-1 tracking-wide" style={{ color: msg.color }}>
                  {msg.username}
                </div>
              )}
              <div
                className={`max-w-[85%] px-3.5 py-2 text-sm rounded-2xl break-words leading-relaxed border ${isMe
                    ? 'rounded-tr-sm text-white'
                    : 'bg-white/5 border-white/10 text-white/90 rounded-tl-sm'
                  }`}
                style={isMe ? { background: `${userColor}22`, borderColor: `${userColor}44` } : {}}
              >
                {msg.text}
              </div>
              <div className="text-[10px] font-medium text-white/30 mt-1 mx-1">
                {timeStr(msg.timestamp)}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input Row */}
      <div className="p-3 bg-brand-dark border-t border-white/5">
        <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-brand-accent focus-within:ring-1 focus-within:ring-brand-accent transition-all">
          <input
            className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
            placeholder="Type a message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            maxLength={300}
          />
          <button
            className="px-4 text-brand-dark bg-brand-accent hover:bg-brand-accentHover font-bold transition-colors disabled:opacity-50"
            onClick={send}
            disabled={!text.trim()}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
