// ════════════════════════════════════════════════════════════
//  CONNECTIONS — relationer mellan moduler (ej Notes)
// ════════════════════════════════════════════════════════════
const Connections = (() => {
  let canvasEl = null;
  let cwEl = null;
  let svgEl = null;
  let getState = null;
  let setEdges = null;
  let markDirty = null;
  let showToast = null;
  let genEdgeId = null;
  let onClearNodeSelection = null;

  let connectingFrom = null;
  let previewTo = null;
  let selectedEdgeId = null;
  let pointerId = null;

  const MARKER_KINDS = ['arrow', 'diamond', 'circle'];
  const MARKER_LABELS = { none: 'Ingen', arrow: 'Pil', diamond: 'Diamant', circle: 'Cirkel' };
  const MULT_PRESETS = ['1', '0..1', '1..1', '1..*', '0..*', '*', 'n', 'n..m'];

  const edgeDefaults = () => window.SC_DEFAULTS?.edges || {
    strokeWidth: 2,
    color: '#0077bc',
    style: 'curve',
    markerStart: 'none',
    markerEnd: 'arrow',
  };

  function defaults() {
    const d = edgeDefaults();
    return {
      strokeWidth: d.strokeWidth ?? 2,
      color: d.color ?? '#0077bc',
      style: d.style ?? 'curve',
      markerStart: d.markerStart ?? 'none',
      markerEnd: d.markerEnd ?? 'arrow',
      label: '',
    };
  }

  function normalizeMarkers(edge) {
    if (edge.markerStart != null || edge.markerEnd != null) {
      return {
        start: edge.markerStart || 'none',
        end: edge.markerEnd || 'none',
      };
    }
    return {
      start: 'none',
      end: edge.arrowEnd === false ? 'none' : 'arrow',
    };
  }

  function appendMarkerDefs(defs, prefix = '') {
    const ns = 'http://www.w3.org/2000/svg';
    MARKER_KINDS.forEach(kind => {
      const id = `${prefix}edge-mk-${kind}`;
      if (defs.querySelector(`#${id}`)) return;

      const marker = document.createElementNS(ns, 'marker');
      marker.setAttribute('id', id);
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('markerWidth', '8');
      marker.setAttribute('markerHeight', '8');
      marker.setAttribute('orient', 'auto');

      if (kind === 'arrow') {
        marker.setAttribute('refX', '8.5');
        marker.setAttribute('refY', '5');
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', 'M 1 1 L 9 5 L 1 9 Z');
        path.setAttribute('fill', 'context-stroke');
        marker.appendChild(path);
      } else if (kind === 'diamond') {
        marker.setAttribute('refX', '5');
        marker.setAttribute('refY', '5');
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', 'M 5 0.5 L 9.5 5 L 5 9.5 L 0.5 5 Z');
        path.setAttribute('fill', 'context-stroke');
        marker.appendChild(path);
      } else if (kind === 'circle') {
        marker.setAttribute('refX', '5');
        marker.setAttribute('refY', '5');
        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', '5');
        circle.setAttribute('cy', '5');
        circle.setAttribute('r', '3.5');
        circle.setAttribute('fill', 'context-stroke');
        marker.appendChild(circle);
      }
      defs.appendChild(marker);
    });
  }

  function applyPathMarkers(path, start, end, prefix = '') {
    if (start && start !== 'none') path.setAttribute('marker-start', `url(#${prefix}edge-mk-${start})`);
    if (end && end !== 'none') path.setAttribute('marker-end', `url(#${prefix}edge-mk-${end})`);
  }

  function markerSelectOptions(selected) {
    return ['none', ...MARKER_KINDS].map(v =>
      `<option value="${v}"${selected === v ? ' selected' : ''}>${MARKER_LABELS[v]}</option>`
    ).join('');
  }

  function multiplicityDatalistHtml() {
    return `<datalist id="conn-mult-presets">${MULT_PRESETS.map(v => `<option value="${escAttr(v)}">`).join('')}</datalist>`;
  }

  function multiplicityPosition(fromPt, toPt, end) {
    const dx = toPt.x - fromPt.x;
    const dy = toPt.y - fromPt.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const inset = 20;
    if (end === 'start') {
      return { x: fromPt.x + ux * inset, y: fromPt.y + uy * inset };
    }
    return { x: toPt.x - ux * inset, y: toPt.y - uy * inset };
  }

  function sizeTextBg(textEl, bg, pad, charWidth = 6.2, lineH = 14) {
    const t = textEl.textContent || '';
    const w = Math.max(14, t.length * charWidth + pad * 2);
    const h = lineH + pad * 2;
    bg.setAttribute('x', String(-w / 2));
    bg.setAttribute('y', String(-h / 2));
    bg.setAttribute('width', String(w));
    bg.setAttribute('height', String(h));
  }

  function appendMultiplicity(g, text, fromPt, toPt, end) {
    const t = (text || '').trim();
    if (!t) return;
    const pos = multiplicityPosition(fromPt, toPt, end);
    const ns = 'http://www.w3.org/2000/svg';
    const labelG = document.createElementNS(ns, 'g');
    labelG.setAttribute('class', 'edge-multiplicity');
    labelG.setAttribute('transform', `translate(${pos.x},${pos.y})`);
    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('class', 'edge-multiplicity-bg');
    bg.setAttribute('rx', '3');
    const textEl = document.createElementNS(ns, 'text');
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dominant-baseline', 'middle');
    textEl.textContent = t;
    labelG.appendChild(bg);
    labelG.appendChild(textEl);
    g.appendChild(labelG);
    sizeTextBg(textEl, bg, 3, 6, 12);
  }

  function init(opts) {
    canvasEl = opts.canvas;
    cwEl = opts.cw;
    getState = opts.getState;
    setEdges = opts.setEdges;
    markDirty = opts.markDirty;
    showToast = opts.showToast;
    genEdgeId = opts.genEdgeId;
    onClearNodeSelection = opts.onClearNodeSelection;
    ensureLayer();
    bindGlobal();
  }

  function ensureLayer() {
    if (!canvasEl) return;
    svgEl = canvasEl.querySelector('#edges-layer');
    if (!svgEl) {
      svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgEl.setAttribute('id', 'edges-layer');
      svgEl.setAttribute('class', 'edges-layer');
      svgEl.setAttribute('aria-hidden', 'true');
      canvasEl.insertBefore(svgEl, canvasEl.firstChild);
    }
    ensureDefs();
  }

  function ensureDefs() {
    let defs = svgEl.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svgEl.appendChild(defs);
    }
    appendMarkerDefs(defs);
  }

  function bindGlobal() {
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && connectingFrom) cancelConnect();
    });
  }

  function isConnectable(node) {
    return node && node.type !== 'note';
  }

  function clientToCanvas(cx, cy) {
    const { panX, panY, scale } = getState();
    const r = cwEl.getBoundingClientRect();
    return {
      x: (cx - r.left - panX) / scale,
      y: (cy - r.top - panY) / scale,
    };
  }

  function getNodeBounds(node) {
    const el = node._el;
    const w = node.width || el?.offsetWidth || 200;
    const h = (node.type === 'note' || node.type === 'annotation')
      ? (node.height || el?.offsetHeight || 120)
      : (el?.offsetHeight || 120);
    return {
      x: node.x || 0,
      y: node.y || 0,
      w,
      h,
      cx: (node.x || 0) + w / 2,
      cy: (node.y || 0) + h / 2,
    };
  }

  function pointOnSide(b, side) {
    switch (side) {
      case 'left': return { x: b.x, y: b.cy };
      case 'right': return { x: b.x + b.w, y: b.cy };
      case 'top': return { x: b.cx, y: b.y };
      case 'bottom': return { x: b.cx, y: b.y + b.h };
      default: return { x: b.cx, y: b.cy };
    }
  }

  function getAnchors(fromNode, toNode) {
    const a = getNodeBounds(fromNode);
    const b = getNodeBounds(toNode);
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    let fromSide;
    let toSide;
    if (Math.abs(dx) > Math.abs(dy)) {
      fromSide = dx > 0 ? 'right' : 'left';
      toSide = dx > 0 ? 'left' : 'right';
    } else {
      fromSide = dy > 0 ? 'bottom' : 'top';
      toSide = dy > 0 ? 'top' : 'bottom';
    }
    return { from: pointOnSide(a, fromSide), to: pointOnSide(b, toSide) };
  }

  function buildPath(fromPt, toPt, style) {
    if (style === 'straight') {
      return { d: `M${fromPt.x},${fromPt.y} L${toPt.x},${toPt.y}`, mid: { x: (fromPt.x + toPt.x) / 2, y: (fromPt.y + toPt.y) / 2 } };
    }
    const mx = (fromPt.x + toPt.x) / 2;
    const my = (fromPt.y + toPt.y) / 2;
    const dx = toPt.x - fromPt.x;
    const dy = toPt.y - fromPt.y;
    const cx = mx - dy * 0.22;
    const cy = my + dx * 0.22;
    const t = 0.5;
    const mid = {
      x: (1 - t) * (1 - t) * fromPt.x + 2 * (1 - t) * t * cx + t * t * toPt.x,
      y: (1 - t) * (1 - t) * fromPt.y + 2 * (1 - t) * t * cy + t * t * toPt.y,
    };
    return { d: `M${fromPt.x},${fromPt.y} Q${cx},${cy} ${toPt.x},${toPt.y}`, mid };
  }

  function nodeAtCanvasPoint(pt, excludeId) {
    const { nodes } = getState();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (!isConnectable(n) || n.id === excludeId) continue;
      const b = getNodeBounds(n);
      if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) return n;
    }
    return null;
  }

  function clearTargetHighlights() {
    document.querySelectorAll('.node.connect-target').forEach(el => el.classList.remove('connect-target'));
  }

  function startConnect(fromNodeId, e) {
    const { nodes } = getState();
    const from = nodes.find(n => n.id === fromNodeId);
    if (!from || !isConnectable(from)) return;
    e.preventDefault();
    e.stopPropagation();
    connectingFrom = fromNodeId;
    previewTo = clientToCanvas(e.clientX, e.clientY);
    pointerId = e.pointerId;
    canvasEl.classList.add('connecting');
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    renderAll();
  }

  function cancelConnect() {
    connectingFrom = null;
    previewTo = null;
    pointerId = null;
    canvasEl?.classList.remove('connecting');
    clearTargetHighlights();
    renderAll();
  }

  function finishConnect(targetNodeId) {
    const { nodes, edges } = getState();
    const from = nodes.find(n => n.id === connectingFrom);
    const to = nodes.find(n => n.id === targetNodeId);
    if (!from || !to || !isConnectable(to) || from.id === to.id) {
      cancelConnect();
      return;
    }
    const d = defaults();
    const edge = {
      id: genEdgeId(),
      from: from.id,
      to: to.id,
      label: '',
      style: d.style,
      strokeWidth: d.strokeWidth,
      color: d.color,
      markerStart: d.markerStart,
      markerEnd: d.markerEnd,
    };
    setEdges([...edges, edge]);
    markDirty();
    showToast('Relation skapad');
    cancelConnect();
    selectEdge(edge.id);
    openEdit(edge.id);
  }

  function onPointerMove(e) {
    if (!connectingFrom) return;
    previewTo = clientToCanvas(e.clientX, e.clientY);
    const target = nodeAtCanvasPoint(previewTo, connectingFrom);
    clearTargetHighlights();
    if (target?. _el) target._el.classList.add('connect-target');
    renderAll();
  }

  function onPointerUp(e) {
    if (!connectingFrom) return;
    if (pointerId != null && e.pointerId !== pointerId) return;
    const pt = clientToCanvas(e.clientX, e.clientY);
    const target = nodeAtCanvasPoint(pt, connectingFrom);
    if (target) finishConnect(target.id);
    else cancelConnect();
  }

  function attachConnectButton(node, handle) {
    if (!isConnectable(node)) return;
    const btn = handle.querySelector('[data-action="connect"]');
    if (!btn) return;
    btn.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      startConnect(node.id, e);
    });
  }

  function selectEdge(id) {
    selectedEdgeId = id;
    if (onClearNodeSelection) onClearNodeSelection();
    renderAll();
  }

  function deselectEdge() {
    selectedEdgeId = null;
    renderAll();
  }

  function removeForNode(nodeId) {
    const { edges } = getState();
    const next = edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    if (next.length !== edges.length) {
      setEdges(next);
      if (selectedEdgeId && !next.find(e => e.id === selectedEdgeId)) selectedEdgeId = null;
      renderAll();
    }
  }

  function deleteEdge(id) {
    const { edges } = getState();
    setEdges(edges.filter(e => e.id !== id));
    if (selectedEdgeId === id) selectedEdgeId = null;
    markDirty();
    renderAll();
    showToast('Relation borttagen');
  }

  function openEdit(edgeId) {
    const { edges, nodes } = getState();
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;
    const from = nodes.find(n => n.id === edge.from);
    const to = nodes.find(n => n.id === edge.to);
    const fromLabel = from ? (from.title || from.content?.slice(0, 30) || from.type) : edge.from;
    const toLabel = to ? (to.title || to.content?.slice(0, 30) || to.type) : edge.to;
    const d = defaults();
    const styles = [
      { v: 'curve', l: 'Böjd' },
      { v: 'straight', l: 'Rak' },
      { v: 'dashed', l: 'Streckad' },
    ];
    const markers = normalizeMarkers(edge);

    Modal.open('Relation', `
      <p class="conn-modal-hint">${escHtml(fromLabel)} → ${escHtml(toLabel)}</p>
      <div class="modal-field">
        <label for="conn-label">Text på linjen</label>
        <input id="conn-label" type="text" value="${escAttr(edge.label || '')}" placeholder="t.ex. använder, innehåller">
      </div>
      <div class="modal-field">
        <label for="conn-style">Utseende</label>
        <select id="conn-style">
          ${styles.map(s => `<option value="${s.v}"${edge.style === s.v ? ' selected' : ''}>${s.l}</option>`).join('')}
        </select>
      </div>
      <div class="conn-marker-grid">
        <div class="modal-field">
          <label for="conn-marker-start">Start (källa)</label>
          <select id="conn-marker-start">${markerSelectOptions(markers.start)}</select>
        </div>
        <div class="modal-field">
          <label for="conn-marker-end">Slut (mål)</label>
          <select id="conn-marker-end">${markerSelectOptions(markers.end)}</select>
        </div>
      </div>
      <div class="conn-marker-grid">
        <div class="modal-field">
          <label for="conn-mult-start">Multiplicitet (källa)</label>
          <input id="conn-mult-start" type="text" list="conn-mult-presets" value="${escAttr(edge.multiplicityStart || '')}" placeholder="t.ex. 1" autocomplete="off">
        </div>
        <div class="modal-field">
          <label for="conn-mult-end">Multiplicitet (mål)</label>
          <input id="conn-mult-end" type="text" list="conn-mult-presets" value="${escAttr(edge.multiplicityEnd || '')}" placeholder="t.ex. 0..*" autocomplete="off">
        </div>
      </div>
      ${multiplicityDatalistHtml()}
      <p class="conn-modal-hint conn-mult-hint">ArchiMate-kardinalitet vid varje ände, t.ex. <code>1</code>, <code>0..1</code>, <code>1..*</code>.</p>
      <div class="modal-field">
        <label for="conn-width">Tjocklek (${d.strokeWidth}px standard)</label>
        <div class="conn-range-row">
          <input id="conn-width" type="range" min="1" max="8" step="1" value="${edge.strokeWidth || d.strokeWidth}">
          <span id="conn-width-val">${edge.strokeWidth || d.strokeWidth}px</span>
        </div>
      </div>
      <div class="modal-field">
        <label for="conn-color">Färg</label>
        <input id="conn-color" type="color" value="${escAttr(edge.color || d.color)}">
      </div>
      <div class="modal-field conn-modal-delete">
        <button type="button" class="conn-delete-btn" id="conn-delete">Ta bort relation</button>
      </div>
    `, () => {
      edge.label = document.getElementById('conn-label')?.value?.trim() || '';
      edge.style = document.getElementById('conn-style')?.value || 'curve';
      edge.strokeWidth = parseInt(document.getElementById('conn-width')?.value, 10) || d.strokeWidth;
      edge.color = document.getElementById('conn-color')?.value || d.color;
      edge.markerStart = document.getElementById('conn-marker-start')?.value || 'none';
      edge.markerEnd = document.getElementById('conn-marker-end')?.value || 'arrow';
      edge.multiplicityStart = document.getElementById('conn-mult-start')?.value?.trim() || '';
      edge.multiplicityEnd = document.getElementById('conn-mult-end')?.value?.trim() || '';
      delete edge.arrowEnd;
      markDirty();
      renderAll();
      showToast('Relation uppdaterad');
      Modal.close();
    });

    const widthInput = document.getElementById('conn-width');
    const widthVal = document.getElementById('conn-width-val');
    if (widthInput && widthVal) {
      widthInput.oninput = () => { widthVal.textContent = widthInput.value + 'px'; };
    }
    document.getElementById('conn-delete')?.addEventListener('click', () => {
      Modal.close();
      deleteEdge(edgeId);
    });
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escAttr(s) {
    return escHtml(s).replace(/"/g, '&quot;');
  }

  function strokeDash(style) {
    return style === 'dashed' ? '8 6' : null;
  }

  function renderEdgeGroup(edge, nodes, isPreview) {
    const from = nodes.find(n => n.id === edge.from);
    if (!from) return null;
    const to = isPreview ? null : nodes.find(n => n.id === edge.to);
    if (!isPreview && !to) return null;

    let fromPt;
    let toPt;
    if (isPreview && previewTo) {
      const fakeTo = {
        x: previewTo.x - 0.5,
        y: previewTo.y - 0.5,
        width: 1,
        height: 1,
        _el: { offsetWidth: 1, offsetHeight: 1 },
      };
      const anchors = getAnchors(from, fakeTo);
      fromPt = anchors.from;
      toPt = previewTo;
    } else {
      const anchors = getAnchors(from, to);
      fromPt = anchors.from;
      toPt = anchors.to;
    }

    const pathInfo = buildPath(fromPt, toPt, edge.style || 'curve');
    const sw = edge.strokeWidth || defaults().strokeWidth;
    const color = edge.color || defaults().color;
    const selected = !isPreview && edge.id === selectedEdgeId;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'edge-group' + (selected ? ' selected' : '') + (isPreview ? ' edge-preview' : ''));
    if (!isPreview) g.dataset.edgeId = edge.id;

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', pathInfo.d);
    hit.setAttribute('class', 'edge-hit');
    hit.setAttribute('stroke-width', String(Math.max(12, sw + 8)));
    hit.setAttribute('fill', 'none');
    hit.setAttribute('stroke', 'transparent');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathInfo.d);
    path.setAttribute('class', 'edge-path');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', String(selected ? sw + 1 : sw));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    if (strokeDash(edge.style)) path.setAttribute('stroke-dasharray', strokeDash(edge.style));
    if (!isPreview) {
      const mk = normalizeMarkers(edge);
      applyPathMarkers(path, mk.start, mk.end);
    }

    g.appendChild(hit);
    g.appendChild(path);

    if (!isPreview) {
      appendMultiplicity(g, edge.multiplicityStart, fromPt, toPt, 'start');
      appendMultiplicity(g, edge.multiplicityEnd, fromPt, toPt, 'end');
    }

    if (!isPreview && edge.label) {
      const labelG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      labelG.setAttribute('class', 'edge-label');
      labelG.setAttribute('transform', `translate(${pathInfo.mid.x},${pathInfo.mid.y})`);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = edge.label;
      const bboxPad = 4;
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('class', 'edge-label-bg');
      bg.setAttribute('rx', '4');
      labelG.appendChild(bg);
      labelG.appendChild(text);
      g.appendChild(labelG);
      requestAnimationFrame(() => {
        try {
          const bb = text.getBBox();
          bg.setAttribute('x', String(bb.x - bboxPad));
          bg.setAttribute('y', String(bb.y - bboxPad));
          bg.setAttribute('width', String(bb.width + bboxPad * 2));
          bg.setAttribute('height', String(bb.height + bboxPad * 2));
        } catch (_) { /* ignore */ }
      });
    }

    if (!isPreview) {
      const open = () => {
        selectEdge(edge.id);
        openEdit(edge.id);
      };
      g.addEventListener('click', e => {
        e.stopPropagation();
        open();
      });
      g.addEventListener('mousedown', e => e.stopPropagation());
    }

    return g;
  }

  function renderAll() {
    if (!svgEl) ensureLayer();
    if (!svgEl) return;
    ensureDefs();
    const defs = svgEl.querySelector('defs');
    svgEl.textContent = '';
    if (defs) svgEl.appendChild(defs);

    const { nodes, edges } = getState();
    edges.forEach(edge => {
      const g = renderEdgeGroup(edge, nodes, false);
      if (g) svgEl.appendChild(g);
    });

    if (connectingFrom && previewTo) {
      const d = defaults();
      const previewEdge = { from: connectingFrom, style: d.style, strokeWidth: d.strokeWidth, color: d.color, markerStart: 'none', markerEnd: 'none' };
      const g = renderEdgeGroup(previewEdge, nodes, true);
      if (g) svgEl.appendChild(g);
    }
  }

  function buildExportSvg(bounds) {
    const { nodes, edges } = getState();
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'edges-layer edges-export');
    svg.style.cssText = `position:absolute;left:0;top:0;width:${bounds.w}px;height:${bounds.h}px;overflow:visible;pointer-events:none;`;
    svg.setAttribute('viewBox', `${bounds.x0} ${bounds.y0} ${bounds.w} ${bounds.h}`);

    const defs = document.createElementNS(ns, 'defs');
    appendMarkerDefs(defs, 'export-');
    svg.appendChild(defs);

    edges.forEach(edge => {
      const from = nodes.find(n => n.id === edge.from);
      const to = nodes.find(n => n.id === edge.to);
      if (!from || !to) return;
      const anchors = getAnchors(from, to);
      const pathInfo = buildPath(anchors.from, anchors.to, edge.style || 'curve');
      const sw = edge.strokeWidth || defaults().strokeWidth;
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', pathInfo.d);
      path.setAttribute('stroke', edge.color || defaults().color);
      path.setAttribute('stroke-width', String(sw));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      if (strokeDash(edge.style)) path.setAttribute('stroke-dasharray', strokeDash(edge.style));
      const mk = normalizeMarkers(edge);
      applyPathMarkers(path, mk.start, mk.end, 'export-');
      const edgeG = document.createElementNS(ns, 'g');
      edgeG.appendChild(path);
      appendMultiplicity(edgeG, edge.multiplicityStart, anchors.from, anchors.to, 'start');
      appendMultiplicity(edgeG, edge.multiplicityEnd, anchors.from, anchors.to, 'end');
      svg.appendChild(edgeG);
      if (edge.label) {
        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', String(pathInfo.mid.x));
        text.setAttribute('y', String(pathInfo.mid.y));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('class', 'edge-label-export');
        text.textContent = edge.label;
        svg.appendChild(text);
      }
    });
    return svg;
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  return {
    init,
    ensureLayer,
    renderAll,
    attachConnectButton,
    removeForNode,
    deselectEdge,
    cancelConnect,
    buildExportSvg,
    getSelectedEdgeId: () => selectedEdgeId,
  };
})();
