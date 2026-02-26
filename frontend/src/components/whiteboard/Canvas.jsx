import { useEffect, useRef, useCallback } from 'react';
import styles from './Canvas.module.css';

const CURSOR_FADE = 3500;

export default function Canvas({
  initCanvas, resizeCanvas,
  startDrawing, draw: drawOnCanvas, stopDrawing,
  bg, rainbowMode,
  socket, roomId,
}) {
  const wrapRef     = useRef(null);
  const canvasRef   = useRef(null);
  const cursorRef   = useRef(null);
  const cursorsMap  = useRef(new Map());
  const rafRef      = useRef(null);

  // ── Mount canvas ─────────────────────────────────────────
  const setCanvas = useCallback((el) => {
    if (!el) return;
    canvasRef.current = el;
    // Wait one frame so the parent has laid out
    requestAnimationFrame(() => {
      initCanvas(el);
      resizeCanvas();
    });
  }, [initCanvas, resizeCanvas]);

  // ── Resize observer ──────────────────────────────────────
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  // ── Remote cursors from socket ───────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onCursor = ({ socketId, username, color, x, y, cw, ch }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const sx = cw ? x * (canvas.width / cw) : x;
      const sy = ch ? y * (canvas.height / ch) : y;
      cursorsMap.current.set(socketId, { x: sx, y: sy, username: username || '?', color: color || '#00FFBF', updatedAt: Date.now() });
    };
    socket.on('cursor:move', onCursor);
    return () => socket.off('cursor:move', onCursor);
  }, [socket]);

  // ── Cursor canvas animation loop ─────────────────────────
  useEffect(() => {
    const tick = () => {
      const cc = cursorRef.current;
      if (cc) {
        const ctx = cc.getContext('2d');
        ctx.clearRect(0, 0, cc.width, cc.height);
        const now = Date.now();
        cursorsMap.current.forEach((c) => {
          const age = now - c.updatedAt;
          if (age > CURSOR_FADE) return;
          const alpha = Math.max(0, 1 - age / CURSOR_FADE);
          ctx.globalAlpha = alpha;

          // Dot
          ctx.fillStyle = c.color;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
          ctx.fill();

          // Label
          ctx.font = "bold 11px 'Karla', sans-serif";
          const tw = ctx.measureText(c.username).width;
          const lx = c.x + 10, ly = c.y - 10;
          ctx.fillStyle = c.color;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(lx, ly - 14, tw + 12, 18, 4);
          } else {
            ctx.rect(lx, ly - 14, tw + 12, 18);
          }
          ctx.fill();
          ctx.fillStyle = '#0C0C0F';
          ctx.fillText(c.username, lx + 6, ly + 1);
          ctx.globalAlpha = 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Size cursor canvas when it mounts / resizes ──────────
  const setCursor = useCallback((el) => {
    if (!el) return;
    cursorRef.current = el;
    const sync = () => {
      const p = el.parentElement;
      if (p) { el.width = p.clientWidth; el.height = p.clientHeight; }
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el.parentElement);
  }, []);

  // ── Mouse/touch move: draw + emit cursor ─────────────────
  const onMove = useCallback((e) => {
    drawOnCanvas(e);
    const canvas = canvasRef.current;
    if (!canvas || !socket) return;
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches?.[0] || e;
    const x = (src.clientX - rect.left) * (canvas.width / rect.width);
    const y = (src.clientY - rect.top)  * (canvas.height / rect.height);
    socket.emit('cursor:move', { roomId, x, y, cw: canvas.width, ch: canvas.height });
  }, [drawOnCanvas, socket, roomId]);

  const bgClass = bg === 'grid' ? styles.bgGrid : bg === 'dots' ? styles.bgDots : styles.bgBlank;

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${bgClass} ${rainbowMode ? 'rainbow-mode' : ''}`}>
      <canvas
        ref={setCanvas}
        className={styles.canvas}
        onMouseDown={startDrawing}
        onMouseMove={onMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={onMove}
        onTouchEnd={stopDrawing}
      />
      <canvas ref={setCursor} className={styles.cursorCanvas} />
    </div>
  );
}