(function (global) {
  'use strict';

// ═══════════════════════════════════════════════════════════
// Palette
// ═══════════════════════════════════════════════════════════
const PALETTE = [
  '#000000','#FFFFFF','#808080','#C0C0C0',
  '#FF0000','#800000','#FF6600','#FF9900',
  '#FFFF00','#808000','#00FF00','#008000',
  '#00FFFF','#008080','#0077BC','#005799',
  '#0000FF','#000080','#8B00FF','#800080',
  '#FF00FF','#FF69B4','#A0522D','#8B4513',
  '#FFF8DC','#F5F5DC',
];

// ═══════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════
let tool       = 'pen';
let color      = '#000000';
let brushSize  = 4;
let opacity    = 1.0;
let filled     = false;
let painting   = false;
let startX=0, startY=0, lastX=0, lastY=0;
let undoStack  = [];
let redoStack  = [];
const MAX_UNDO = 40;

// Snapshot canvas for shape preview
let snapshot   = null;

let canvas = null;
let ctx = null;
let paintCoreReady = false;

function bindCanvas() {
  if (canvas && ctx) return true;
  const el = document.getElementById('mainCanvas');
  if (!el) return false;
  canvas = el;
  ctx = canvas.getContext('2d');
  return !!ctx;
}

function buildPalette() {
  const swatchWrap = document.getElementById('swatchWrap');
  if (!swatchWrap || swatchWrap.dataset.built) return;
  swatchWrap.dataset.built = '1';
  PALETTE.forEach(c => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'swatch';
    s.style.background = c;
    s.title = c;
    if (c === '#FFFFFF') s.style.border = '2px solid #ccc';
    s.onclick = () => setColor(c);
    swatchWrap.appendChild(s);
  });
  setColor('#000000');
}

function wireCanvasEvents() {
  if (!bindCanvas() || canvas.dataset.events) return;
  canvas.dataset.events = '1';
  canvas.addEventListener('mousedown', onDown, { passive: false });
  canvas.addEventListener('mousemove', onMove, { passive: false });
  canvas.addEventListener('mouseup', onUp);
  canvas.addEventListener('mouseleave', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp);
  const ring = document.getElementById('cursorRing');
  if (ring) {
    canvas.addEventListener('mouseleave', () => { ring.style.display = 'none'; });
  }
}

function bootPaintCore() {
  if (paintCoreReady) return bindCanvas();
  if (!bindCanvas()) return false;
  buildPalette();
  wireCanvasEvents();
  updateSizePreview();
  updateUndoButtons();
  paintCoreReady = true;
  return true;
}

function setColor(c) {
  color = c;
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('on', s.style.background === hexToRgb(c) || s.title === c));
  updateInfo();
}

function hexToRgb(hex) {
  // browser normalises to rgb() for comparison
  const d = document.createElement('div');
  d.style.color = hex;
  document.body.appendChild(d);
  const r = getComputedStyle(d).color;
  document.body.removeChild(d);
  return r;
}

function openColorPicker() {
  document.getElementById('customColorInput').click();
}
function pickCustomColor(v) {
  setColor(v);
  document.getElementById('customColorBtn').style.background = v;
}

// ═══════════════════════════════════════════════════════════
// Tool selection
// ═══════════════════════════════════════════════════════════
const TOOLS = ['pen','brush','line','rect','ellipse','fill','text','eraser','eyedrop'];
function setTool(t) {
  tool = t;
  TOOLS.forEach(x => {
    const btn = document.getElementById('t' + x[0].toUpperCase() + x.slice(1));
    if (btn) btn.classList.toggle('on', x === t);
  });
  // Cursor style
  if (t === 'eyedrop') canvas.style.cursor = 'crosshair';
  else if (t === 'fill') canvas.style.cursor = 'cell';
  else if (t === 'eraser') canvas.style.cursor = 'cell';
  else if (t === 'text') canvas.style.cursor = 'text';
  else canvas.style.cursor = 'crosshair';
  updateInfo();
}

function toggleFilled() {
  filled = !filled;
  document.getElementById('tFilled').classList.toggle('on', filled);
}

// ═══════════════════════════════════════════════════════════
// Size + opacity UI
// ═══════════════════════════════════════════════════════════
function updateSizePreview() {
  brushSize = parseInt(document.getElementById('brushSize').value);
  const dot = document.getElementById('sizeDot');
  const sz  = Math.min(brushSize, 32);
  dot.style.width  = sz + 'px';
  dot.style.height = sz + 'px';
  dot.style.background = color;
  updateInfo();
}
function updateOpacityLabel() {
  opacity = parseInt(document.getElementById('opacitySlider').value) / 100;
  document.getElementById('opacityLabel').textContent = Math.round(opacity*100) + '%';
}
// ═══════════════════════════════════════════════════════════
// Canvas context helpers
// ═══════════════════════════════════════════════════════════
function applyCtxSettings(context) {
  context.globalAlpha = tool === 'eraser' ? 1.0 : opacity;
  context.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
  context.fillStyle   = tool === 'eraser' ? '#ffffff' : color;
  context.lineWidth   = brushSize;
  context.lineCap     = 'round';
  context.lineJoin    = 'round';
  if (tool === 'brush') {
    context.lineWidth = brushSize * 2.5;
    context.globalAlpha = opacity * 0.6;
  }
  if (tool === 'eraser') {
    context.globalCompositeOperation = 'destination-out';
    context.lineWidth = brushSize * 2;
  } else {
    context.globalCompositeOperation = 'source-over';
  }
}

function pos(e) {
  if (!bindCanvas()) return { x: 0, y: 0 };
  const r = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / r.width;
  const scaleY = canvas.height / r.height;
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - r.left) * scaleX,
    y: (src.clientY - r.top)  * scaleY,
  };
}

// ═══════════════════════════════════════════════════════════
// Undo / Redo
// ═══════════════════════════════════════════════════════════
function saveUndo() {
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  ctx.putImageData(undoStack.pop(), 0, 0);
  updateUndoButtons();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  ctx.putImageData(redoStack.pop(), 0, 0);
  updateUndoButtons();
}
function updateUndoButtons() {
  document.getElementById('undoBtn').style.opacity = undoStack.length ? '1' : '.4';
  document.getElementById('redoBtn').style.opacity = redoStack.length ? '1' : '.4';
}
updateUndoButtons();

// ═══════════════════════════════════════════════════════════
// Flood fill (bucket)
// ═══════════════════════════════════════════════════════════
function floodFill(startX, startY, fillColorHex) {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data    = imgData.data;
  const w = canvas.width, h = canvas.height;

  const toIdx = (x,y) => (y*w + x)*4;
  const [tr, tg, tb, ta] = getPixel(data, startX|0, startY|0);

  // Parse fill color
  const fr = parseInt(fillColorHex.slice(1,3),16);
  const fg = parseInt(fillColorHex.slice(3,5),16);
  const fb = parseInt(fillColorHex.slice(5,7),16);
  const fa = Math.round(opacity * 255);

  if (tr===fr && tg===fg && tb===fb && ta===fa) return;

  const stack = [[startX|0, startY|0]];
  const visited = new Uint8Array(w*h);

  const match = (x,y) => {
    const [r,g,b,a] = getPixel(data,x,y);
    return r===tr && g===tg && b===tb && a===ta;
  };

  while (stack.length) {
    const [cx,cy] = stack.pop();
    if (cx<0||cx>=w||cy<0||cy>=h) continue;
    const vi = cy*w+cx;
    if (visited[vi] || !match(cx,cy)) continue;
    visited[vi] = 1;
    const i = toIdx(cx,cy);
    data[i]=fr; data[i+1]=fg; data[i+2]=fb; data[i+3]=fa;
    stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
  }
  ctx.putImageData(imgData, 0, 0);
}

function getPixel(data, x, y) {
  const i = (y * canvas.width + x) * 4;
  return [data[i], data[i+1], data[i+2], data[i+3]];
}

// ═══════════════════════════════════════════════════════════
// Eyedropper
// ═══════════════════════════════════════════════════════════
function eyedrop(x, y) {
  const p = ctx.getImageData(x|0, y|0, 1, 1).data;
  const hex = '#' + [p[0],p[1],p[2]].map(v=>v.toString(16).padStart(2,'0')).join('');
  setColor(hex);
  document.getElementById('customColorBtn').style.background = hex;
  document.getElementById('customColorInput').value = hex;
}

// ═══════════════════════════════════════════════════════════
// Text tool
// ═══════════════════════════════════════════════════════════
let pendingTextX = 0, pendingTextY = 0;
function placeText(x, y) {
  const inp = document.getElementById('textInput');
  const r   = canvas.getBoundingClientRect();
  const scaleX = r.width  / canvas.width;
  const scaleY = r.height / canvas.height;
  inp.style.left   = (r.left + x * scaleX) + 'px';
  inp.style.top    = (r.top  + y * scaleY - 22) + 'px';
  inp.style.fontSize = Math.max(12, brushSize * 3) + 'px';
  inp.style.display = 'block';
  inp.value = '';
  inp.focus();
  pendingTextX = x;
  pendingTextY = y;
}
function commitText(e) {
  if (e.key !== 'Enter' && e.key !== 'Escape') return;
  const inp = document.getElementById('textInput');
  if (e.key === 'Enter' && inp.value) {
    saveUndo();
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    ctx.font = `${Math.max(12, brushSize * 3)}px Arial, sans-serif`;
    ctx.fillText(inp.value, pendingTextX, pendingTextY);
    ctx.restore();
  }
  inp.style.display = 'none';
  inp.value = '';
}

// ═══════════════════════════════════════════════════════════
// Draw shapes
// ═══════════════════════════════════════════════════════════
function drawShape(x, y) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (snapshot) ctx.putImageData(snapshot, 0, 0);
  applyCtxSettings(ctx);
  ctx.beginPath();
  if (tool === 'line') {
    ctx.moveTo(startX, startY);
    ctx.lineTo(x, y);
    ctx.stroke();
  } else if (tool === 'rect') {
    if (filled) ctx.fillRect(startX, startY, x-startX, y-startY);
    else ctx.strokeRect(startX, startY, x-startX, y-startY);
  } else if (tool === 'ellipse') {
    const rx = Math.abs(x-startX)/2, ry = Math.abs(y-startY)/2;
    const cx = startX + (x-startX)/2, cy = startY + (y-startY)/2;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
    if (filled) ctx.fill(); else ctx.stroke();
  }
}

// ═══════════════════════════════════════════════════════════
// Mouse / Touch events
// ═══════════════════════════════════════════════════════════
function onDown(e) {
  e.preventDefault();
  const {x, y} = pos(e);

  if (tool === 'fill') {
    saveUndo();
    floodFill(x, y, color);
    syncMd();
    return;
  }
  if (tool === 'eyedrop') {
    eyedrop(x, y);
    return;
  }
  if (tool === 'text') {
    placeText(x, y);
    return;
  }

  painting = true;
  startX = lastX = x;
  startY = lastY = y;

  if (['line','rect','ellipse'].includes(tool)) {
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } else {
    saveUndo();
    applyCtxSettings(ctx);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // dot on click
    ctx.arc(x, y, ctx.lineWidth/2, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
}

function onMove(e) {
  e.preventDefault();
  const {x, y} = pos(e);

  // Update cursor ring
  updateCursorRing(e, x, y);

  if (!painting) return;
  if (['line','rect','ellipse'].includes(tool)) {
    drawShape(x, y);
    return;
  }
  applyCtxSettings(ctx);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  lastX = x; lastY = y;
}

function onUp(e) {
  if (!painting) return;
  painting = false;
  const {x, y} = pos(e);
  if (['line','rect','ellipse'].includes(tool)) {
    saveUndo();
    // remove the pre-save we did — no, snapshot was before shape
    // the shape is already drawn, just clear snapshot
    snapshot = null;
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  syncMd();
}

// ═══════════════════════════════════════════════════════════
// Cursor ring
// ═══════════════════════════════════════════════════════════
function updateCursorRing(e, cx, cy) {
  const ring = document.getElementById('cursorRing');
  if (!ring || !bindCanvas()) return;
  const src = e.touches ? e.touches[0] : e;
  ring.style.display = 'block';
  ring.style.left = src.clientX + 'px';
  ring.style.top  = src.clientY + 'px';
  const r = canvas.getBoundingClientRect();
  const scale = r.width / canvas.width;
  let sz = Math.max(4, brushSize * scale * (tool==='brush'?2.5:tool==='eraser'?2:1));
  ring.style.width  = sz + 'px';
  ring.style.height = sz + 'px';
  ring.style.borderColor = tool==='eraser' ? '#f00' : color;
}
const ring = document.getElementById('cursorRing');
if (ring) {
  document.addEventListener('mousemove', e => {
    ring.style.left = e.clientX + 'px';
    ring.style.top = e.clientY + 'px';
  });
}

// ═══════════════════════════════════════════════════════════
// Keyboard shortcuts
// ═══════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  if (e.ctrlKey && k==='z') { e.preventDefault(); undo(); return; }
  if (e.ctrlKey && (k==='y'||k==='shift+z')) { e.preventDefault(); redo(); return; }
  const map = {p:'pen',b:'brush',l:'line',r:'rect',e:'ellipse',f:'fill',t:'text',x:'eraser',i:'eyedrop'};
  if (map[k]) setTool(map[k]);
});

// ═══════════════════════════════════════════════════════════
// Canvas size dialog
// ═══════════════════════════════════════════════════════════
function showSizeDialog() {
  document.getElementById('dW').value = canvas.width;
  document.getElementById('dH').value = canvas.height;
  document.getElementById('sizeDialog').classList.add('on');
}
function hideSizeDialog() { document.getElementById('sizeDialog').classList.remove('on'); }
function applySize() {
  const w = parseInt(document.getElementById('dW').value) || 1024;
  const h = parseInt(document.getElementById('dH').value) || 640;
  canvas.width  = Math.min(4000, Math.max(100, w));
  canvas.height = Math.min(4000, Math.max(100, h));
  undoStack = []; redoStack = [];
  updateUndoButtons();
  fillWhite();
  hideSizeDialog();
  updateInfo();
}

// ═══════════════════════════════════════════════════════════
// Clear / fill white
// ═══════════════════════════════════════════════════════════
function fillWhite() {
  if (!bindCanvas()) return;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function clearCanvas() {
  if (!confirm('Rensa hela canvas?')) return;
  saveUndo();
  fillWhite();
  syncMd();
}

function updateInfo() {
  if (!bindCanvas()) return;
  const text = `${canvas.width} × ${canvas.height} px · ${tool} · ${color} · ${Math.round(opacity * 100)}% · ${brushSize}px`;
  const info = document.getElementById('canvasInfo');
  if (info) info.textContent = text;
  const hdr = document.getElementById('paint-hdr-status');
  if (hdr && !hdr.dataset.busy) hdr.textContent = text;
}

function syncMd() { updateInfo(); }

function getPngDataUrl() {
  if (!bindCanvas()) return '';
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  const tc = tmp.getContext('2d');
  tc.fillStyle = '#ffffff';
  tc.fillRect(0, 0, tmp.width, tmp.height);
  tc.drawImage(canvas, 0, 0);
  return tmp.toDataURL('image/png');
}

  async function loadFromDataUrl(url) {
    if (!bootPaintCore()) throw new Error('Canvas saknas');
    if (!url) {
      fillWhite();
      updateInfo();
      return;
    }
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const max = 2048;
    let w = img.naturalWidth || 1024;
    let h = img.naturalHeight || 640;
    if (w > max || h > max) {
      const s = Math.min(max / w, max / h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    canvas.width = w;
    canvas.height = h;
    fillWhite();
    ctx.drawImage(img, 0, 0, w, h);
    undoStack = [];
    redoStack = [];
    updateUndoButtons();
    updateInfo();
  }

  global.PaintEditor = {
    init(opts) {
      global.PAINT_EMBED = !!(opts && opts.embed);
      if (!bootPaintCore()) return false;
      fillWhite();
      syncMd();
      updateInfo();
      return true;
    },
    getPngDataUrl,
    loadFromDataUrl,
    applyTheme(theme) {
      global.document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    },
    setStatus(text) {
      const el = global.document.getElementById('paint-hdr-status');
      if (el) el.textContent = text;
      const foot = global.document.getElementById('paint-foot');
      if (foot) foot.textContent = text;
    },
  };
  global.setTool = setTool;
  global.toggleFilled = toggleFilled;
  global.updateSizePreview = updateSizePreview;
  global.updateOpacityLabel = updateOpacityLabel;
  global.openColorPicker = openColorPicker;
  global.pickCustomColor = pickCustomColor;
  global.showSizeDialog = showSizeDialog;
  global.hideSizeDialog = hideSizeDialog;
  global.applySize = applySize;
  global.clearCanvas = clearCanvas;
  global.undo = undo;
  global.redo = redo;
  global.commitText = commitText;
})(typeof window !== 'undefined' ? window : globalThis);
