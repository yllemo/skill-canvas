// ════════════════════════════════════════════════════════════
//  ANNOTATION MODULE — text + pil (SVG)
// ════════════════════════════════════════════════════════════
const AnnotationModule = (() => {
  const TYPE = 'annotation';
  const PREVIEW_W = 400;
  const PREVIEW_H = 200;
  const cfg = () => window.SC_DEFAULTS?.modules?.annotation || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.annotation || {};

  let modalWired = false;

  function seededJitter(seed, i) {
    const x = Math.sin((seed.length + 1) * 12.9898 + i * 78.233) * 43758.5453;
    return (x - Math.floor(x) - 0.5) * 8;
  }

  function buildPath(tx, ty, dir, style, len, rot, seed) {
    const a = (rot * Math.PI) / 180;
    const dirs = { ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };
    let [dx, dy] = dirs[dir] || [1, -1];
    const cx = Math.cos(a) * dx - Math.sin(a) * dy;
    const cy = Math.sin(a) * dx + Math.cos(a) * dy;
    dx = cx;
    dy = cy;
    const ex = tx + dx * len;
    const ey = ty + dy * len;
    const midX = (tx + ex) / 2;
    const midY = (ty + ey) / 2;

    if (style === 'straight') {
      return `M${ex},${ey} L${tx},${ty}`;
    }
    if (style === 'curve') {
      const cpx = midX - dy * len * 0.35;
      const cpy = midY + dx * len * 0.35;
      return `M${ex},${ey} Q${cpx},${cpy} ${tx},${ty}`;
    }
    if (style === 'swoosh') {
      const cpx = ex + dx * len * 0.1;
      const cpy = ey - dy * len * 0.8;
      return `M${ex},${ey} C${cpx},${cpy} ${tx - dx * len * 0.2},${ty - dy * len * 0.4} ${tx},${ty}`;
    }
    let d = `M${ex + seededJitter(seed, 0)},${ey + seededJitter(seed, 1)}`;
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = ex + (tx - ex) * t + seededJitter(seed, i * 2);
      const py = ey + (ty - ey) * t + seededJitter(seed, i * 2 + 1);
      d += ` L${px},${py}`;
    }
    return d;
  }

  function textPos(tx, ty, dir, len, rot, fontSize) {
    const dirs = { ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };
    let [dx, dy] = dirs[dir] || [1, -1];
    const a = (rot * Math.PI) / 180;
    const cx = Math.cos(a) * dx - Math.sin(a) * dy;
    const cy = Math.sin(a) * dx + Math.cos(a) * dy;
    dx = cx;
    dy = cy;
    const ex = tx + dx * len;
    const ey = ty + dy * len;
    const anchor = dx > 0 ? 'start' : 'end';
    return {
      x: ex + dx * 12,
      y: ey + (dy < 0 ? -8 : fontSize + 4),
      anchor,
    };
  }

  function escapeXml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function annFromNode(node) {
    const d = nodeDefaults();
    return {
      text: node.content || 'Text',
      tx: node.tipX ?? d.tipX ?? 240,
      ty: node.tipY ?? d.tipY ?? 120,
      dir: node.dir || d.dir || 'ne',
      style: node.arrowStyle || d.arrowStyle || 'curve',
      len: node.arrowLen ?? d.arrowLen ?? 90,
      rot: node.rotation ?? d.rotation ?? 0,
      color: node.color || d.color || '#F5A623',
      fontSize: node.fontSize ?? d.fontSize ?? 26,
      strokeW: node.strokeWidth ?? d.strokeWidth ?? 2.5,
      font: node.fontFamily || d.fontFamily || "'Caveat', cursive",
      seed: node.id || 'ann',
    };
  }

  function renderSvgMarkup(ann, w, h, opts = {}) {
    const { preview = false, opacity = 1 } = opts;
    const pathD = buildPath(ann.tx, ann.ty, ann.dir, ann.style, ann.len, ann.rot, ann.seed);
    const { x: textX, y: textY, anchor } = textPos(ann.tx, ann.ty, ann.dir, ann.len, ann.rot, ann.fontSize);
    const markerId = preview ? 'annMarkerPreview' : 'annMarker0';
    const dash = preview ? ' stroke-dasharray="5,3"' : '';
    const op = opacity < 1 ? ` opacity="${opacity}"` : '';
    let defs = `<defs><marker id="${markerId}" markerWidth="8" markerHeight="8" refX="3" refY="3" orient="auto-start-reverse">
      <path d="M0,0 L6,3 L0,6 Z" fill="${ann.color}"/>
    </marker></defs>`;
    let body = `<path d="${pathD}" stroke="${ann.color}" stroke-width="${ann.strokeW}" fill="none" marker-end="url(#${markerId})" stroke-linecap="round"${dash}${op}/>`;
    const lines = String(ann.text || 'Text').split('\n');
    lines.forEach((line, li) => {
      body += `<text x="${textX}" y="${textY + li * (ann.fontSize * 1.2)}" font-family="${ann.font}" font-size="${ann.fontSize}" fill="${ann.color}" text-anchor="${anchor}" font-weight="500"${op}>${escapeXml(line)}</text>`;
    });
    return defs + body;
  }

  function renderContent(node, body) {
    const w = node.width || nodeDefaults().width || 320;
    const h = node.height || nodeDefaults().height || 160;
    const ann = annFromNode(node);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'annotation-svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.innerHTML = renderSvgMarkup(ann, w, h);
    body.innerHTML = '';
    body.style.padding = '0';
    body.appendChild(svg);
    if (node._el) {
      node._el.style.width = w + 'px';
      node._el.style.height = h + 'px';
    }
  }

  function readPreviewAnn() {
    const tipX = parseFloat(document.getElementById('ann-tip-x')?.value) || PREVIEW_W * 0.75;
    const tipY = parseFloat(document.getElementById('ann-tip-y')?.value) || PREVIEW_H * 0.6;
    const dirBtn = document.querySelector('#ann-dir-btns .ann-dir-btn.active');
    return {
      text: document.getElementById('ann-text')?.value || 'Text',
      tx: tipX,
      ty: tipY,
      dir: dirBtn?.dataset.dir || 'ne',
      style: document.getElementById('ann-arrow-style')?.value || 'curve',
      len: parseFloat(document.getElementById('ann-arrow-len')?.value) || 90,
      rot: parseFloat(document.getElementById('ann-rotation')?.value) || 0,
      color: document.getElementById('ann-color')?.value || '#F5A623',
      fontSize: parseFloat(document.getElementById('ann-font-size')?.value) || 26,
      strokeW: parseFloat(document.getElementById('ann-stroke-w')?.value) || 2.5,
      font: document.getElementById('ann-font')?.value || "'Caveat', cursive",
      seed: 'preview',
    };
  }

  function renderModalPreview() {
    const svg = document.getElementById('ann-preview');
    if (!svg) return;
    const ann = readPreviewAnn();
    svg.setAttribute('viewBox', `0 0 ${PREVIEW_W} ${PREVIEW_H}`);
    svg.innerHTML = renderSvgMarkup(ann, PREVIEW_W, PREVIEW_H, { preview: true });
  }

  function wireModalPreview() {
    const wrap = document.getElementById('ann-preview-wrap');
    if (!wrap || modalWired) return;
    modalWired = true;

    wrap.addEventListener('click', e => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const tipX = document.getElementById('ann-tip-x');
      const tipY = document.getElementById('ann-tip-y');
      if (tipX) tipX.value = String(Math.round(x));
      if (tipY) tipY.value = String(Math.round(y));
      renderModalPreview();
    });

    document.getElementById('ann-dir-btns')?.querySelectorAll('.ann-dir-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ann-dir-btns .ann-dir-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderModalPreview();
      });
    });

    document.querySelectorAll('#ann-swatches .ann-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ann-swatches .ann-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const color = document.getElementById('ann-color');
        if (color) color.value = btn.dataset.color || color.value;
        renderModalPreview();
      });
    });

    const colorInput = document.getElementById('ann-color');
    colorInput?.addEventListener('input', () => {
      document.querySelectorAll('#ann-swatches .ann-color-btn').forEach(b => b.classList.remove('active'));
      renderModalPreview();
    });

    const rerender = () => renderModalPreview();
    ['ann-text', 'ann-arrow-style', 'ann-font', 'ann-font-size', 'ann-stroke-w', 'ann-arrow-len', 'ann-rotation'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        if (id === 'ann-font-size') {
          const out = document.getElementById('ann-font-size-out');
          if (out) out.textContent = document.getElementById(id).value;
        }
        if (id === 'ann-stroke-w') {
          const out = document.getElementById('ann-stroke-w-out');
          if (out) out.textContent = document.getElementById(id).value;
        }
        if (id === 'ann-arrow-len') {
          const out = document.getElementById('ann-arrow-len-out');
          if (out) out.textContent = document.getElementById(id).value;
        }
        if (id === 'ann-rotation') {
          const out = document.getElementById('ann-rotation-out');
          if (out) out.textContent = document.getElementById(id).value + '°';
        }
        rerender();
      });
    });

    renderModalPreview();
  }

  function cleanupModal() {
    modalWired = false;
  }

  function previewToNodeCoords(tipPx, tipPy, nodeW, nodeH) {
    return {
      tipX: Math.round(tipPx * (nodeW / PREVIEW_W)),
      tipY: Math.round(tipPy * (nodeH / PREVIEW_H)),
    };
  }

  function readNodeFromModal() {
    const d = nodeDefaults();
    const nodeW = parseInt(document.getElementById('ann-width')?.value, 10) || d.width || 320;
    const nodeH = parseInt(document.getElementById('ann-height')?.value, 10) || d.height || 160;
    const tipPx = parseFloat(document.getElementById('ann-tip-x')?.value) || PREVIEW_W * 0.75;
    const tipPy = parseFloat(document.getElementById('ann-tip-y')?.value) || PREVIEW_H * 0.6;
    const tips = previewToNodeCoords(tipPx, tipPy, nodeW, nodeH);
    const dirBtn = document.querySelector('#ann-dir-btns .ann-dir-btn.active');
    const text = (document.getElementById('ann-text')?.value || '').trim();
    return {
      content: text || 'Text',
      width: nodeW,
      height: nodeH,
      tipX: tips.tipX,
      tipY: tips.tipY,
      dir: dirBtn?.dataset.dir || 'ne',
      arrowStyle: document.getElementById('ann-arrow-style')?.value || 'curve',
      arrowLen: parseFloat(document.getElementById('ann-arrow-len')?.value) || 90,
      rotation: parseFloat(document.getElementById('ann-rotation')?.value) || 0,
      color: document.getElementById('ann-color')?.value || '#F5A623',
      fontSize: parseFloat(document.getElementById('ann-font-size')?.value) || 26,
      strokeWidth: parseFloat(document.getElementById('ann-stroke-w')?.value) || 2.5,
      fontFamily: document.getElementById('ann-font')?.value || "'Caveat', cursive",
    };
  }

  function openModalPreviewSoon() {
    setTimeout(() => {
      wireModalPreview();
    }, 50);
  }

  async function openAdd() {
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const data = readNodeFromModal();
      const id = genId();
      const title = data.content.split('\n')[0].slice(0, 48);
      const node = { id, type: TYPE, x: pos.x, y: pos.y, title, ...data };
      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      Modal.close();
      cleanupModal();
      showToast(cfg().addToast || 'Annotation tillagd');
    });
    openModalPreviewSoon();
  }

  async function openEdit(node) {
    selectNode(node.id);
    const d = nodeDefaults();
    const nodeW = node.width || d.width || 320;
    const nodeH = node.height || d.height || 160;
    const tipPx = (node.tipX ?? d.tipX ?? 240) * (PREVIEW_W / nodeW);
    const tipPy = (node.tipY ?? d.tipY ?? 120) * (PREVIEW_H / nodeH);
    await Modal.openFromType(TYPE, 'edit', {
      content: node.content || '',
      width: nodeW,
      height: nodeH,
      tipX: Math.round(tipPx),
      tipY: Math.round(tipPy),
      dir: node.dir || d.dir || 'ne',
      arrowStyle: node.arrowStyle || d.arrowStyle || 'curve',
      arrowLen: node.arrowLen ?? d.arrowLen ?? 90,
      rotation: node.rotation ?? d.rotation ?? 0,
      color: node.color || d.color || '#F5A623',
      fontSize: node.fontSize ?? d.fontSize ?? 26,
      strokeWidth: node.strokeWidth ?? d.strokeWidth ?? 2.5,
      fontFamily: node.fontFamily || d.fontFamily || "'Caveat', cursive",
    }, async () => {
      const data = readNodeFromModal();
      Object.assign(node, data);
      if (node._el) {
        node._el.style.width = node.width + 'px';
        node._el.style.height = node.height + 'px';
      }
      const body = node._el?.querySelector('.node-body');
      if (body) renderContent(node, body);
      const htitle = node._el?.querySelector('.node-handle span:nth-child(2)');
      if (htitle) htitle.textContent = (node.content || '').split('\n')[0].slice(0, 40);
      markDirty();
      Modal.close();
      cleanupModal();
      showToast(cfg().editToast || 'Sparad');
    });
    openModalPreviewSoon();
  }

  return { openAdd, openEdit, renderContent, cleanupModal };
})();

ModuleRegistry.register('annotation', AnnotationModule);
document.getElementById('add-ann').onclick = () => AnnotationModule.openAdd();
