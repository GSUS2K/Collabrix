import { useState } from 'react';

const COLORS = [
  '#ffffff', '#000000', '#FF6B6B', '#00FFBF', '#9B72FF', '#FFD93D',
  '#4ECDC4', '#FD79A8', '#A29BFE', '#FF7675', '#00B894', '#6C5CE7',
  '#FDCB6E', '#74B9FF', '#E17055', '#55EFC4',
];

const TOOLS = [
  { id: 'pencil', icon: '✏️', label: 'Pencil (P)' },
  { id: 'eraser', icon: '🧹', label: 'Eraser (E)' },
  { separator: true },
  { id: 'line', icon: '╱', label: 'Line (L)' },
  { id: 'arrow', icon: '→', label: 'Arrow (A)' },
  { id: 'rect', icon: '▭', label: 'Rectangle (R)' },
  { id: 'circle', icon: '○', label: 'Circle (C)' },
  { id: 'diamond', icon: '◇', label: 'Diamond (D)' },
  { id: 'triangle', icon: '△', label: 'Triangle' },
  { separator: true },
  { id: 'text', icon: 'T', label: 'Text (T)' },
  { id: 'fill', icon: '🪣', label: 'Fill (F)' },
  { separator: true },
  { id: 'laser', icon: '🪄', label: 'Laser Pointer' },
];

const SIZES = [2, 4, 8, 14, 24];
const BGS = [
  { id: 'blank', label: 'None', icon: '⬜' },
  { id: 'grid', label: 'Grid', icon: '#' },
  { id: 'dots', label: 'Dots', icon: '·' },
  { id: 'blueprint', label: 'Blueprint', icon: '📐' },
];

export default function Toolbar({
  tool, setTool,
  color, setColor,
  size, setSize,
  bg, setBg,
  undo, redo, clearCanvas,
  getDataUrl,
  socket, roomId,
}) {
  const [customColor, setCustomColor] = useState(color);
  const [showBg, setShowBg] = useState(false);

  const exportPNG = () => {
    const url = getDataUrl();
    const a = document.createElement('a');
    a.download = `canvas-${Date.now()}.png`;
    a.href = url;
    a.click();
  };

  const handleColorPick = (c) => {
    setColor(c);
    setCustomColor(c);
  };

  const handleBgChange = (id) => {
    setBg(id);
    setShowBg(false);
    // Sync background with room peers
    if (socket && roomId) {
      socket.emit('room:set_background', { roomId, bg: id });
    }
  };

  return (
    <aside className="w-16 bg-brand-card/90 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col items-center py-4 gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-30 max-h-[calc(100vh-100px)] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

      {/* Tools */}
      {TOOLS.map((t, i) =>
        t.separator ? (
          <div key={i} className="w-8 h-px bg-white/10 my-1 flex-shrink-0" />
        ) : (
          <button
            key={t.id}
            className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg transition-all group relative ${tool === t.id
              ? 'bg-brand-accent text-brand-dark shadow-[0_0_15px_rgba(0,255,191,0.3)] scale-105'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
              } ${t.id === 'laser' && tool === t.id ? '!bg-[#FF6B6B] !shadow-[0_0_15px_rgba(255,107,107,0.4)]' : ''}`}
            onClick={() => setTool(t.id)}
            title={t.label}
          >
            <span>{t.icon}</span>
            {/* Tooltip */}
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-brand-dark border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60]">
              {t.label}
            </span>
          </button>
        )
      )}

      <div className="w-8 h-px bg-white/10 my-1 flex-shrink-0" />

      {/* Undo / Redo */}
      <button className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg text-white/60 hover:bg-white/10 hover:text-white transition-all group relative" onClick={undo} title="Undo">
        <span>↩</span>
        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-brand-dark border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60]">Undo</span>
      </button>
      <button className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg text-white/60 hover:bg-white/10 hover:text-white transition-all group relative" onClick={redo} title="Redo">
        <span>↪</span>
        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-brand-dark border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60]">Redo</span>
      </button>
      <button className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg text-brand-red/60 hover:bg-brand-red/20 hover:text-brand-red transition-all group relative" onClick={() => { if (window.confirm('Clear canvas?')) clearCanvas(); }} title="Clear all">
        <span>🗑</span>
        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-brand-dark border border-white/10 text-brand-red text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60]">Clear all</span>
      </button>

      <div className="w-8 h-px bg-white/10 my-1 flex-shrink-0" />

      {/* Size */}
      <div className="w-10 py-2 flex-shrink-0 bg-black/20 rounded-xl flex flex-col items-center gap-2 border border-white/5">
        {SIZES.map(s => (
          <button
            key={s}
            className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors ${size === s ? 'bg-white/10 ring-1 ring-white/20' : ''}`}
            onClick={() => setSize(s)}
            title={`${s}px`}
          >
            <div className="rounded-full" style={{ width: Math.min(s, 16), height: Math.min(s, 16), background: color }} />
          </button>
        ))}
      </div>

      <div className="w-8 h-px bg-white/10 my-1 flex-shrink-0" />

      {/* Color swatches */}
      <div className="grid grid-cols-2 gap-1.5 w-10 flex-shrink-0">
        {COLORS.map(c => (
          <button
            key={c}
            className={`w-4 h-4 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-brand-card' : 'hover:scale-110'}`}
            style={{ background: c }}
            onClick={() => handleColorPick(c)}
          />
        ))}
        {/* Custom color */}
        <label className="w-4 h-4 rounded-full bg-[conic-gradient(red,yellow,green,cyan,blue,magenta,red)] flex items-center justify-center cursor-pointer hover:scale-110 transition-transform relative" title="Custom color">
          <input
            type="color"
            value={customColor}
            onChange={e => { setCustomColor(e.target.value); setColor(e.target.value); }}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
        </label>
      </div>

      <div className="w-8 h-px bg-white/10 my-1 flex-shrink-0" />

      {/* Background */}
      <div className="relative flex-shrink-0">
        <button
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all group relative ${bg !== 'blank' ? 'text-brand-accent bg-brand-accent/10 border border-brand-accent/20' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
          onClick={() => setShowBg(b => !b)}
          title="Canvas Background"
        >
          <span>🖼</span>
          <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-brand-dark border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60]">Background</span>
        </button>

        {showBg && (
          <div className="absolute left-14 top-0 bg-brand-card border border-white/10 rounded-xl p-2 w-36 shadow-xl z-[60] flex flex-col gap-1 animate-[fadeIn_0.15s_ease-out]">
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest px-2 pb-1">Canvas BG</p>
            {BGS.map(b => (
              <button
                key={b.id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${bg === b.id ? 'bg-brand-accent/20 text-brand-accent' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                onClick={() => handleBgChange(b.id)}
              >
                <span className="w-5 text-center">{b.icon}</span>
                <span>{b.label}</span>
                {bg === b.id && <span className="ml-auto text-brand-accent text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <button className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg text-white/60 hover:bg-white/10 hover:text-white transition-all group relative mt-auto" onClick={exportPNG} title="Export PNG">
        <span>📤</span>
        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-brand-dark border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60]">Export PNG</span>
      </button>
    </aside>
  );
}
