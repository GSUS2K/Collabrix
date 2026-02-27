import { useEffect, useRef, useCallback } from 'react';

const CURSOR_FADE = 3500;
const LASER_FADE = 2000;

// SVG cursor data URIs
// Pencil tip is at bottom-left (1,19) — hotspot matches exactly
const PENCIL_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpolygon points='1,19 5,15 8,18' fill='%23aaa' stroke='%23555' stroke-width='0.5'/%3E%3Ccircle cx='1.5' cy='18.5' r='1' fill='%23333'/%3E%3Cpolygon points='3,17 14,6 17,9 6,20' fill='%23FFF9C4' stroke='%23888' stroke-width='0.8'/%3E%3Crect x='12.5' y='1.5' width='5' height='4' rx='0.8' fill='%23ffb3b3' stroke='%23888' stroke-width='0.8' transform='rotate(45 15 4)'/%3E%3C/svg%3E") 1 19, crosshair`;

const LASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='4' fill='none' stroke='%23ff4444' stroke-width='2'/%3E%3Cline x1='12' y1='2' x2='12' y2='8' stroke='%23ff4444' stroke-width='1.5'/%3E%3Cline x1='12' y1='16' x2='12' y2='22' stroke='%23ff4444' stroke-width='1.5'/%3E%3Cline x1='2' y1='12' x2='8' y2='12' stroke='%23ff4444' stroke-width='1.5'/%3E%3Cline x1='16' y1='12' x2='22' y2='12' stroke='%23ff4444' stroke-width='1.5'/%3E%3Ccircle cx='12' cy='12' r='1.5' fill='%23ff4444'/%3E%3C/svg%3E") 12 12, crosshair`;

const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='20' viewBox='0 0 24 20'%3E%3Crect x='2' y='6' width='20' height='12' rx='2' fill='%23ffeaa7' stroke='%23636e72' stroke-width='1.5'/%3E%3Crect x='2' y='6' width='8' height='12' rx='2' fill='%23fd79a8' stroke='%23636e72' stroke-width='1.5'/%3E%3C/svg%3E") 2 18, cell`;

export default function Canvas({
  initCanvas, resizeCanvas,
  startDrawing, draw: drawOnCanvas, stopDrawing,
  bg, rainbowMode, tool,
  socket, roomId,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const cursorsMap = useRef(new Map());
  const rafRef = useRef(null);

  // Laser trail: array of {x, y, t, newStroke}
  const laserPoints = useRef([]);
  const laserDown = useRef(false);

  // ── Mount canvas ─────────────────────────────────────────
  const setCanvas = useCallback((el) => {
    if (!el) return;
    canvasRef.current = el;
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

  // ── Animation loop: remote cursors + laser trail ─────────
  useEffect(() => {
    const tick = () => {
      const cc = cursorRef.current;
      if (cc) {
        const ctx = cc.getContext('2d');
        ctx.clearRect(0, 0, cc.width, cc.height);
        const now = Date.now();

        // Prune old laser points
        laserPoints.current = laserPoints.current.filter(p => now - p.t < LASER_FADE);

        // Draw laser trail segments
        if (laserPoints.current.length > 0) {
          const points = laserPoints.current;
          for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const age = now - p.t;
            const alpha = Math.max(0, 1 - age / LASER_FADE);
            if (p.newStroke || i === 0) continue; // skip start-of-stroke points as line start
            const prev = points[i - 1];
            if (prev.newStroke) continue; // start of new stroke — skip (will be caught at i+1)

            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#FF3333';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#FF3333';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;

          // Dot at the current tip (latest non-new-stroke point)
          const tip = [...points].reverse().find(p => !p.newStroke) || points[points.length - 1];
          if (tip) {
            const tipAge = now - tip.t;
            const tipAlpha = Math.max(0, 1 - tipAge / LASER_FADE);
            ctx.globalAlpha = tipAlpha;
            const grd = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 18);
            grd.addColorStop(0, 'rgba(255,60,60,0.7)');
            grd.addColorStop(1, 'rgba(255,60,60,0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(tip.x, tip.y, 18, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FF3333';
            ctx.shadowColor = '#FF3333'; ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
          }
        }

        // Draw remote cursors
        cursorsMap.current.forEach((c) => {
          const age = now - c.updatedAt;
          if (age > CURSOR_FADE) return;
          const alpha = Math.max(0, 1 - age / CURSOR_FADE);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = c.color;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = "bold 11px 'Karla', sans-serif";
          const tw = ctx.measureText(c.username).width;
          const lx = c.x + 10, ly = c.y - 10;
          ctx.fillStyle = c.color;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(lx, ly - 14, tw + 12, 18, 4);
          else ctx.rect(lx, ly - 14, tw + 12, 18);
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

  // ── Size cursor canvas ───────────────────────────────────
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

  // ── Get canvas coords from event ─────────────────────────
  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches?.[0] || e;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  // ── Mouse/touch handlers ─────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (tool === 'laser') {
      laserDown.current = true;
      const coords = getCoords(e);
      if (coords) laserPoints.current.push({ ...coords, t: Date.now(), newStroke: true });
    } else {
      startDrawing(e);
    }
  }, [tool, startDrawing]);

  const onMove = useCallback((e) => {
    const coords = getCoords(e);
    if (!coords) return;

    if (tool === 'laser') {
      if (laserDown.current) {
        laserPoints.current.push({ ...coords, t: Date.now(), newStroke: false });
      }
      if (socket) socket.emit('cursor:move', { roomId, x: coords.x, y: coords.y, cw: canvasRef.current?.width, ch: canvasRef.current?.height });
      return;
    }

    drawOnCanvas(e);
    if (socket) socket.emit('cursor:move', { roomId, x: coords.x, y: coords.y, cw: canvasRef.current?.width, ch: canvasRef.current?.height });
  }, [drawOnCanvas, socket, roomId, tool]);

  const onMouseUp = useCallback((e) => {
    if (tool === 'laser') {
      laserDown.current = false;
    } else {
      stopDrawing(e);
    }
  }, [tool, stopDrawing]);

  // ── Background styles ────────────────────────────────────
  const bgStyle = bg === 'blueprint'
    ? {
      background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)',
      backgroundImage: [
        'linear-gradient(rgba(100,180,255,0.08) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(100,180,255,0.08) 1px, transparent 1px)',
        'linear-gradient(rgba(100,180,255,0.04) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(100,180,255,0.04) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: '80px 80px, 80px 80px, 20px 20px, 20px 20px',
    }
    : {};

  const bgClass = bg === 'grid'
    ? 'bg-[url("data:image/svg+xml,%3Csvg%20width=%2240%22%20height=%2240%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M%2040%200%20L%200%200%200%2040%22%20fill=%22none%22%20stroke=%22rgba(255,255,255,0.05)%22%20stroke-width=%221%22/%3E%3C/svg%3E")]'
    : bg === 'dots'
      ? 'bg-[url("data:image/svg+xml,%3Csvg%20width=%2220%22%20height=%2220%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ccircle%20cx=%222%22%20cy=%222%22%20r=%221%22%20fill=%22rgba(255,255,255,0.1)%22/%3E%3C/svg%3E")]'
      : 'bg-transparent';

  const cursorStyle = {
    cursor:
      tool === 'laser' ? LASER_CURSOR :
        tool === 'pencil' ? PENCIL_CURSOR :
          tool === 'eraser' ? ERASER_CURSOR :
            tool === 'text' ? 'text' :
              'crosshair',
  };

  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 w-full h-full overflow-hidden ${bgClass} ${rainbowMode ? 'rainbow-mode' : ''}`}
      style={{ ...bgStyle, ...cursorStyle }}
    >
      <canvas
        ref={setCanvas}
        className="absolute inset-0 w-full h-full touch-none z-[1]"
        style={{ cursor: 'inherit' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onMouseDown}
        onTouchMove={onMove}
        onTouchEnd={onMouseUp}
      />
      <canvas
        ref={setCursor}
        className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
      />
    </div>
  );
}