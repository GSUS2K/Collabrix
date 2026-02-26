import { useState } from 'react';
import styles from './Toolbar.module.css';

const COLORS = [
  '#ffffff','#000000','#FF6B6B','#00FFBF','#9B72FF','#FFD93D',
  '#4ECDC4','#FD79A8','#A29BFE','#FF7675','#00B894','#6C5CE7',
  '#FDCB6E','#74B9FF','#E17055','#55EFC4',
];

const TOOLS = [
  { id: 'pencil',   icon: '✏️', label: 'Pencil (P)' },
  { id: 'eraser',   icon: '⬜', label: 'Eraser (E)' },
  { separator: true },
  { id: 'line',     icon: '╱', label: 'Line (L)' },
  { id: 'arrow',    icon: '→', label: 'Arrow (A)' },
  { id: 'rect',     icon: '▭', label: 'Rectangle (R)' },
  { id: 'circle',   icon: '○', label: 'Circle (C)' },
  { id: 'diamond',  icon: '◇', label: 'Diamond (D)' },
  { id: 'triangle', icon: '△', label: 'Triangle' },
  { separator: true },
  { id: 'text',     icon: 'T',  label: 'Text (T)' },
  { id: 'fill',     icon: '🪣', label: 'Fill (F)' },
];

const SIZES = [2, 4, 8, 14, 24];
const BGS   = [
  { id:'blank', label:'None', icon:'⬜' },
  { id:'grid',  label:'Grid', icon:'#' },
  { id:'dots',  label:'Dots', icon:'·' },
];

export default function Toolbar({
  tool, setTool,
  color, setColor,
  size, setSize,
  bg, setBg,
  undo, redo, clearCanvas,
  getDataUrl,
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

  return (
    <aside className={styles.toolbar}>
      {/* Tools */}
      {TOOLS.map((t, i) =>
        t.separator ? (
          <div key={i} className={styles.sep} />
        ) : (
          <button
            key={t.id}
            className={`${styles.toolBtn} ${tool === t.id ? styles.active : ''}`}
            onClick={() => setTool(t.id)}
            data-tip={t.label}
          >
            <span className={styles.toolIcon}>{t.icon}</span>
          </button>
        )
      )}

      <div className={styles.sep} />

      {/* Undo / Redo */}
      <button className={styles.toolBtn} onClick={undo} data-tip="Undo (Ctrl+Z)">
        <span className={styles.toolIcon}>↩</span>
      </button>
      <button className={styles.toolBtn} onClick={redo} data-tip="Redo (Ctrl+Y)">
        <span className={styles.toolIcon}>↪</span>
      </button>
      <button className={styles.toolBtn} onClick={() => { if (confirm('Clear canvas?')) clearCanvas(); }} data-tip="Clear all">
        <span className={styles.toolIcon}>🗑</span>
      </button>

      <div className={styles.sep} />

      {/* Size */}
      <div className={styles.sizeGroup}>
        {SIZES.map(s => (
          <button
            key={s}
            className={`${styles.sizeBtn} ${size === s ? styles.active : ''}`}
            onClick={() => setSize(s)}
            data-tip={`${s}px`}
          >
            <div className={styles.sizeDot} style={{ width: Math.min(s, 20), height: Math.min(s, 20), background: color }} />
          </button>
        ))}
      </div>

      <div className={styles.sep} />

      {/* Color swatches */}
      <div className={styles.colorGrid}>
        {COLORS.map(c => (
          <button
            key={c}
            className={`${styles.swatch} ${color === c ? styles.swatchActive : ''}`}
            style={{ background: c }}
            onClick={() => handleColorPick(c)}
          />
        ))}
        {/* Custom color */}
        <label className={styles.customColor} data-tip="Custom color">
          <input
            type="color"
            value={customColor}
            onChange={e => { setCustomColor(e.target.value); setColor(e.target.value); }}
            style={{ opacity:0, position:'absolute', width:1, height:1 }}
          />
          <span>+</span>
        </label>
      </div>

      <div className={styles.sep} />

      {/* Background */}
      <div style={{ position:'relative' }}>
        <button className={styles.toolBtn} onClick={() => setShowBg(b => !b)} data-tip="Background">
          <span className={styles.toolIcon}>🖼</span>
        </button>
        {showBg && (
          <div className={styles.bgMenu}>
            {BGS.map(b => (
              <button
                key={b.id}
                className={`${styles.bgBtn} ${bg === b.id ? styles.active : ''}`}
                onClick={() => { setBg(b.id); setShowBg(false); }}
              >
                <span className={styles.bgIcon}>{b.icon}</span>
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <button className={styles.toolBtn} onClick={exportPNG} data-tip="Export PNG">
        <span className={styles.toolIcon}>📤</span>
      </button>
    </aside>
  );
}
