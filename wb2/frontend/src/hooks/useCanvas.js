import { useState, useRef, useCallback, useEffect } from 'react';

// ── Flood fill ─────────────────────────────────────────────
function floodFill(ctx, sx, sy, fillHex) {
  const canvas = ctx.canvas;
  const w = canvas.width, h = canvas.height;
  if (w === 0 || h === 0) return;

  sx = Math.round(sx); sy = Math.round(sy);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const ri = (x, y) => (y * w + x) * 4;
  const si = ri(sx, sy);
  const [tR, tG, tB, tA] = [d[si], d[si+1], d[si+2], d[si+3]];

  const fr = parseInt(fillHex.slice(1,3), 16);
  const fg = parseInt(fillHex.slice(3,5), 16);
  const fb = parseInt(fillHex.slice(5,7), 16);
  const fa = 255;

  if (tR === fr && tG === fg && tB === fb && tA === fa) return;

  const match = (i) =>
    Math.abs(d[i]   - tR) < 30 &&
    Math.abs(d[i+1] - tG) < 30 &&
    Math.abs(d[i+2] - tB) < 30 &&
    Math.abs(d[i+3] - tA) < 30;

  const visited = new Uint8Array(w * h);
  const stack = [sx + sy * w];
  visited[sx + sy * w] = 1;

  while (stack.length) {
    const pos = stack.pop();
    const x = pos % w;
    const y = Math.floor(pos / w);
    const ci = pos * 4;
    if (!match(ci)) continue;
    d[ci] = fr; d[ci+1] = fg; d[ci+2] = fb; d[ci+3] = fa;
    const neighbors = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const ni = nx + ny * w;
        if (!visited[ni]) { visited[ni] = 1; stack.push(ni); }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ── Arrow helper ──────────────────────────────────────────
function drawArrow(ctx, x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 14;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(angle - Math.PI/7), y2 - len * Math.sin(angle - Math.PI/7));
  ctx.lineTo(x2 - len * Math.cos(angle + Math.PI/7), y2 - len * Math.sin(angle + Math.PI/7));
  ctx.closePath();
  ctx.fill();
}

// ── Diamond helper ────────────────────────────────────────
function drawDiamond(ctx, x1, y1, x2, y2) {
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const hw = Math.abs(x2 - x1) / 2, hh = Math.abs(y2 - y1) / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.stroke();
}

// ── Triangle helper ───────────────────────────────────────
function drawTriangle(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo((x1 + x2) / 2, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x1, y2);
  ctx.closePath();
  ctx.stroke();
}

export const useCanvas = ({ socket, roomId, canDraw = true }) => {
  const canvasRef     = useRef(null);
  const ctxRef        = useRef(null);
  const isDrawingRef  = useRef(false);
  const lastPosRef    = useRef({ x: 0, y: 0 });
  const startPosRef   = useRef({ x: 0, y: 0 });
  const snapshotRef   = useRef(null);
  const historyRef    = useRef([]);
  const histIdxRef    = useRef(-1);
  const remoteRef     = useRef(new Map()); // socketId -> {isDrawing, lastPos, snapshot}
  const textInputRef  = useRef(null);
  const strokeCountRef = useRef(0);

  const [tool, setTool]         = useState('pencil');
  const [color, setColor]       = useState('#ffffff');
  const [size, setSize]         = useState(4);
  const [bg, setBg]             = useState('blank');
  const [rainbowMode, setRainbowMode] = useState(false);

  const toolRef   = useRef(tool);
  const colorRef  = useRef(color);
  const sizeRef   = useRef(size);
  const rainbowRef = useRef(false);
  const rainbowHueRef = useRef(0);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { rainbowRef.current = rainbowMode; }, [rainbowMode]);

  // ── Init ────────────────────────────────────────────────
  const initCanvas = useCallback((canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
    canvasRef.current = canvas;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !canvas.parentElement) return;
    const { width, height } = canvas.parentElement.getBoundingClientRect();
    if (!width || !height) return;

    let saved = null;
    if (canvas.width > 0 && canvas.height > 0) {
      try { saved = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch {}
    }
    canvas.width  = width;
    canvas.height = height;
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    if (saved) try { ctx.putImageData(saved, 0, 0); } catch {}
  }, []);

  // ── History ─────────────────────────────────────────────
  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) return;
    const snap = canvas.toDataURL();
    // Trim redo stack
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > 40) historyRef.current.shift();
    histIdxRef.current = historyRef.current.length - 1;

    // Easter egg: stroke count
    strokeCountRef.current++;
    if (strokeCountRef.current === 1000) {
      import('react-hot-toast').then(({ default: toast }) =>
        toast('🎨 Picasso mode unlocked — 1000 strokes!', { duration: 4000 })
      );
    }
  }, []);

  const restoreCanvas = useCallback((dataUrl) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || !dataUrl) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = dataUrl;
  }, []);

  const undo = useCallback(() => {
    if (histIdxRef.current <= 0) return;
    histIdxRef.current--;
    const snap = historyRef.current[histIdxRef.current];
    restoreCanvas(snap);
    socket?.emit('draw:undo', { roomId, snapshot: snap });
  }, [socket, roomId, restoreCanvas]);

  const redo = useCallback(() => {
    if (histIdxRef.current >= historyRef.current.length - 1) return;
    histIdxRef.current++;
    const snap = historyRef.current[histIdxRef.current];
    restoreCanvas(snap);
    socket?.emit('draw:redo', { roomId, snapshot: snap });
  }, [socket, roomId, restoreCanvas]);

  const clearCanvas = useCallback((emit = true) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
    if (emit) socket?.emit('draw:clear', { roomId });
  }, [socket, roomId, saveHistory]);

  const getDataUrl = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL();
  }, []);

  // ── Coords ──────────────────────────────────────────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches?.[0] || e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  // ── Apply ctx settings ───────────────────────────────────
  const applyCtx = (ctx, c, s, composite = 'source-over') => {
    ctx.strokeStyle = c;
    ctx.fillStyle   = c;
    ctx.lineWidth   = s;
    ctx.globalCompositeOperation = composite;
  };

  // ── Shape drawing ────────────────────────────────────────
  const drawShape = (ctx, t, x1, y1, x2, y2, snap, c, s) => {
    if (snap) ctx.putImageData(snap, 0, 0);
    applyCtx(ctx, c, s);

    const shiftHeld = false; // could add shift key support
    switch (t) {
      case 'line':
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        break;
      case 'arrow':
        drawArrow(ctx, x1, y1, x2, y2);
        break;
      case 'rect':
        ctx.beginPath(); ctx.rect(x1, y1, x2-x1, y2-y1); ctx.stroke();
        break;
      case 'circle':
        ctx.beginPath();
        ctx.ellipse((x1+x2)/2, (y1+y2)/2, Math.abs(x2-x1)/2, Math.abs(y2-y1)/2, 0, 0, Math.PI*2);
        ctx.stroke();
        break;
      case 'diamond':
        drawDiamond(ctx, x1, y1, x2, y2);
        break;
      case 'triangle':
        drawTriangle(ctx, x1, y1, x2, y2);
        break;
      default: break;
    }
  };

  const isShapeTool = (t) => ['line','arrow','rect','circle','diamond','triangle'].includes(t);

  // ── Mouse events ─────────────────────────────────────────
  const startDrawing = useCallback((e) => {
    if (!canDraw) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    e.preventDefault();

    const pos = getPos(e, canvas);
    isDrawingRef.current = true;
    lastPosRef.current = pos;
    startPosRef.current = pos;

    const c = rainbowRef.current
      ? `hsl(${rainbowHueRef.current}, 100%, 60%)`
      : colorRef.current;
    const s = sizeRef.current;
    const t = toolRef.current;

    if (t === 'fill') {
      applyCtx(ctx, c, s);
      floodFill(ctx, pos.x, pos.y, c === colorRef.current ? c : c);
      saveHistory();
      socket?.emit('draw:start', { roomId, tool: t, x: pos.x, y: pos.y, color: c, size: s });
      isDrawingRef.current = false;
      return;
    }

    if (t === 'text') {
      isDrawingRef.current = false;
      showTextInput(pos.x, pos.y, canvas, ctx, c, s);
      return;
    }

    if (isShapeTool(t)) {
      if (canvas.width > 0 && canvas.height > 0) {
        snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    } else {
      // Pencil / eraser — draw immediate dot
      applyCtx(ctx, c, s, t === 'eraser' ? 'destination-out' : 'source-over');
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, s / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    socket?.emit('draw:start', { roomId, x: pos.x, y: pos.y, tool: t, color: c, size: s });
  }, [canDraw, socket, roomId, saveHistory]);

  const draw = useCallback((e) => {
    if (!isDrawingRef.current || !canDraw) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    e.preventDefault();

    const pos = getPos(e, canvas);
    const t = toolRef.current;

    let c = rainbowRef.current
      ? `hsl(${rainbowHueRef.current}, 100%, 60%)`
      : colorRef.current;
    if (rainbowRef.current) rainbowHueRef.current = (rainbowHueRef.current + 2) % 360;

    const s = sizeRef.current;

    if (isShapeTool(t)) {
      drawShape(ctx, t, startPosRef.current.x, startPosRef.current.y, pos.x, pos.y, snapshotRef.current, c, s);
    } else {
      applyCtx(ctx, c, s, t === 'eraser' ? 'destination-out' : 'source-over');
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    lastPosRef.current = pos;
    socket?.emit('draw:move', { roomId, x: pos.x, y: pos.y, tool: t, color: c, size: s });

    // Cursor emit
    socket?.emit('cursor:move', {
      roomId, x: pos.x, y: pos.y,
      cw: canvas.width, ch: canvas.height,
    });
  }, [canDraw, socket, roomId]);

  const stopDrawing = useCallback((e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    snapshotRef.current = null;
    saveHistory();
    socket?.emit('draw:end', { roomId });
    ctxRef.current && (ctxRef.current.globalCompositeOperation = 'source-over');
  }, [socket, roomId, saveHistory]);

  // ── Text input ──────────────────────────────────────────
  const showTextInput = (x, y, canvas, ctx, c, s) => {
    const existing = document.getElementById('canvas-text-input');
    if (existing) existing.remove();

    const rect = canvas.getBoundingClientRect();
    const input = document.createElement('input');
    input.id = 'canvas-text-input';
    Object.assign(input.style, {
      position:   'fixed',
      left:       `${rect.left + (x / canvas.width) * rect.width}px`,
      top:        `${rect.top + (y / canvas.height) * rect.height}px`,
      background: 'transparent',
      border:     '1px dashed rgba(255,255,255,0.3)',
      color:      c,
      fontSize:   `${Math.max(s * 3, 14)}px`,
      fontFamily: "'Karla', sans-serif",
      outline:    'none',
      padding:    '2px 4px',
      minWidth:   '80px',
      zIndex:     '1000',
    });
    document.body.appendChild(input);
    input.focus();
    textInputRef.current = input;

    const commit = () => {
      const text = input.value.trim();
      if (text) {
        ctx.font = `${Math.max(s * 3, 14)}px Karla, sans-serif`;
        applyCtx(ctx, c, s);
        ctx.fillText(text, x, y);
        saveHistory();
        socket?.emit('draw:text', { roomId, x, y, text, color: c, size: s });
      }
      input.remove();
    };
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') commit(); if (ev.key === 'Escape') input.remove(); });
    input.addEventListener('blur', commit);
  };

  // ── Remote drawing ──────────────────────────────────────
  const handleRemoteStart = useCallback(({ socketId, x, y, tool, color, size }) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const state = { isDrawing: true, lastPos: { x, y }, startPos: { x, y }, snapshot: null, tool, color, size };
    if (isShapeTool(tool)) {
      const canvas = canvasRef.current;
      if (canvas?.width > 0 && canvas?.height > 0) {
        try { state.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch {}
      }
    }
    remoteRef.current.set(socketId, state);

    if (tool === 'fill') {
      floodFill(ctx, x, y, color);
      return;
    }

    if (!isShapeTool(tool)) {
      applyCtx(ctx, color, size, tool === 'eraser' ? 'destination-out' : 'source-over');
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const handleRemoteMove = useCallback(({ socketId, x, y, tool, color, size }) => {
    const ctx = ctxRef.current;
    const state = remoteRef.current.get(socketId);
    if (!ctx || !state) return;

    if (isShapeTool(tool)) {
      drawShape(ctx, tool, state.startPos.x, state.startPos.y, x, y, state.snapshot, color, size);
    } else {
      applyCtx(ctx, color, size, tool === 'eraser' ? 'destination-out' : 'source-over');
      ctx.beginPath();
      ctx.moveTo(state.lastPos.x, state.lastPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    state.lastPos = { x, y };
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const handleRemoteEnd = useCallback(({ socketId }) => {
    remoteRef.current.delete(socketId);
    if (ctxRef.current) ctxRef.current.globalCompositeOperation = 'source-over';
  }, []);

  const handleRemoteText = useCallback(({ x, y, text, color, size }) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.font = `${Math.max(size * 3, 14)}px Karla, sans-serif`;
    applyCtx(ctx, color, size);
    ctx.fillText(text, x, y);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      // Tool shortcuts
      const shortcuts = { p:'pencil', e:'eraser', l:'line', r:'rect', c:'circle', a:'arrow', f:'fill', t:'text' };
      if (shortcuts[e.key] && !e.ctrlKey && !e.metaKey) setTool(shortcuts[e.key]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ── Konami code easter egg ───────────────────────────────
  useEffect(() => {
    const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let pos = 0;
    const onKey = (e) => {
      if (e.key === code[pos]) {
        pos++;
        if (pos === code.length) {
          pos = 0;
          setRainbowMode(true);
          import('react-hot-toast').then(({ default: toast }) =>
            toast('🌈 RAINBOW MODE ACTIVATED! ↑↑↓↓←→←→BA', { duration: 5000, icon: '🎮' })
          );
          setTimeout(() => setRainbowMode(false), 15000);
        }
      } else { pos = 0; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return {
    initCanvas, resizeCanvas,
    startDrawing, draw, stopDrawing,
    handleRemoteStart, handleRemoteMove, handleRemoteEnd, handleRemoteText,
    undo, redo, clearCanvas, restoreCanvas, getDataUrl,
    saveHistory,
    tool, setTool,
    color, setColor,
    size, setSize,
    bg, setBg,
    rainbowMode,
  };
};
