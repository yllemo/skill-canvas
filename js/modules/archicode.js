// ════════════════════════════════════════════════════════════
//  ARCHICODE MODULE
// ════════════════════════════════════════════════════════════
const ArchicodeModule = (() => {
  const TYPE = 'archicode';
  const cfg = () => window.SC_DEFAULTS?.modules?.archicode || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.archicode || {};

  const DEFAULT_CODE = `// ArchiMate 4 — Snabbstart
#spacing: 90

[<business:actor> Kund]
[<business:process> Bokningsprocess]
[<business:service> Bokningstjänst]

[<application:component> Bokningsapp]
[<application:service> REST API]

[Kund] -> [Bokningsprocess]
[Bokningsprocess] -> [Bokningstjänst]
[Bokningsapp] --:> [Bokningstjänst]`;

  let editorCleanup = null;
  let acLoadPromise = null;

  const AC_CDN = 'https://cdn.jsdelivr.net/gh/yllemo/ArchiCode@latest/';

  function libUrl() {
    return cfg().libUrl || `${AC_CDN}archicode.js`;
  }

  function cssUrl() {
    return cfg().cssUrl || `${AC_CDN}archicode.css`;
  }

  function loadArchiCodeCss() {
    if (document.getElementById('archicode-styles')) return Promise.resolve();
    return new Promise(resolve => {
      const link = document.createElement('link');
      link.id = 'archicode-styles';
      link.rel = 'stylesheet';
      link.href = cssUrl();
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
  }

  function loadArchiCodeJs() {
    if (typeof ArchiCode !== 'undefined') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = libUrl();
      s.async = true;
      s.onload = () => {
        if (typeof ArchiCode !== 'undefined') resolve();
        else reject(new Error('ArchiCode laddades men API saknas'));
      };
      s.onerror = () => reject(new Error('ArchiCode kunde inte laddas'));
      document.head.appendChild(s);
    });
  }

  function ensureArchiCodeLoaded() {
    if (typeof ArchiCode !== 'undefined' && document.getElementById('archicode-styles')) {
      return Promise.resolve();
    }
    if (acLoadPromise) return acLoadPromise;
    acLoadPromise = loadArchiCodeCss()
      .then(() => loadArchiCodeJs())
      .catch(err => {
        acLoadPromise = null;
        throw err;
      });
    return acLoadPromise;
  }

  /** Ersätt foreignObject-ikoner (CSS) med inbäddade SVG image-element */
  function materializeDiagramIcons(diagram) {
    const svg = diagram?.querySelector('svg');
    if (!svg || typeof ArchiCode?.getIconDataUrl !== 'function') return;

    svg.querySelectorAll('foreignObject').forEach(fo => {
      const div = fo.querySelector('div.archimate-icon');
      if (!div) return;
      const iconClass = Array.from(div.classList).find(c => c !== 'archimate-icon');
      if (!iconClass) return;
      const url = ArchiCode.getIconDataUrl(iconClass);
      if (!url) return;

      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttribute('href', url);
      img.setAttribute('x', fo.getAttribute('x') || '0');
      img.setAttribute('y', fo.getAttribute('y') || '0');
      img.setAttribute('width', fo.getAttribute('width') || '20');
      img.setAttribute('height', fo.getAttribute('height') || '20');
      img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      fo.replaceWith(img);
    });
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function editorUrl() {
    return cfg().editorUrl || 'html/archicode.php';
  }

  function defaultArchicodeHeight() {
    return nodeDefaults().height || 480;
  }

  function parseArchicodeHeight(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return undefined;
    const defs = nodeDefaults();
    const h = parseInt(s, 10);
    if (!Number.isFinite(h) || h <= 0) return undefined;
    return Math.max(defs.minHeight || 280, Math.min(defs.maxHeight || 1200, h));
  }

  function applyNodeLayout(node) {
    if (node._el && typeof applyArchicodeNodeLayout === 'function') {
      applyArchicodeNodeLayout(node, node._el);
    }
  }

  function disconnectResize(node) {
    if (node._acResizeObs) {
      node._acResizeObs.disconnect();
      node._acResizeObs = null;
    }
  }

  function fitDiagramToViewport(viewport, diagram) {
    const svg = diagram.querySelector('svg');
    if (!svg || !viewport.clientWidth) return;

    diagram.style.transform = '';
    diagram.style.width = '';
    diagram.style.height = '';

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const svgW = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
    const svgH = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;
    if (!svgW || !svgH) return;

    const pad = 20;
    const scale = Math.min((vw - pad) / svgW, (vh - pad) / svgH);
    const tx = Math.round((vw - svgW * scale) / 2);
    const ty = Math.round((vh - svgH * scale) / 2);

    diagram.style.transformOrigin = '0 0';
    diagram.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function wireResize(node, viewport, diagram) {
    disconnectResize(node);
    node._acResizeObs = new ResizeObserver(() => fitDiagramToViewport(viewport, diagram));
    node._acResizeObs.observe(viewport);
  }

  async function renderContent(node, body) {
    disconnectResize(node);
    body.innerHTML = '';
    body.style.padding = '0';

    let code = node.content || '';
    if (!code && node.file) code = await readTextFile(node.file);
    code = String(code).trim();

    const minH = nodeDefaults().minHeight || 280;

    if (!code) {
      const ph = document.createElement('div');
      ph.className = 'archicode-placeholder';
      ph.style.minHeight = `${minH}px`;
      ph.textContent = 'Tomt diagram — öppna ArchiCode-editorn';
      body.appendChild(ph);
      applyNodeLayout(node);
      return;
    }

    const viewport = document.createElement('div');
    viewport.className = 'archicode-viewport';
    viewport.style.minHeight = `${minH}px`;

    const diagram = document.createElement('div');
    diagram.className = 'archicode-diagram';
    diagram.setAttribute('data-node-id', node.id);

    viewport.appendChild(diagram);
    body.appendChild(viewport);

    try {
      await ensureArchiCodeLoaded();
      ArchiCode.render(code, diagram);
      materializeDiagramIcons(diagram);
      requestAnimationFrame(() => {
        fitDiagramToViewport(viewport, diagram);
        wireResize(node, viewport, diagram);
        applyNodeLayout(node);
      });
    } catch (err) {
      viewport.innerHTML = '';
      const pre = document.createElement('pre');
      pre.className = 'archicode-error';
      pre.textContent = `ArchiCode-fel:\n${err.message}`;
      viewport.appendChild(pre);
    }
  }

  async function rerender(node) {
    if (node?.type !== TYPE || !node._el) return;
    const body = node._el.querySelector('.node-body');
    if (body) await renderContent(node, body);
    applyNodeLayout(node);
  }

  function closeFullscreenEditor() {
    const overlay = document.getElementById('ac-editor-overlay');
    const iframe = document.getElementById('ac-editor-frame');
    if (editorCleanup) {
      editorCleanup();
      editorCleanup = null;
    }
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (iframe) iframe.src = 'about:blank';
  }

  function openFullscreenEditor(content, onSave) {
    const overlay = document.getElementById('ac-editor-overlay');
    const iframe = document.getElementById('ac-editor-frame');
    if (!overlay || !iframe) {
      showToast('ArchiCode-editorn kunde inte öppnas', 4000);
      return;
    }

    closeFullscreenEditor();

    const theme = currentTheme();
    const url = `${editorUrl()}?embed=1&theme=${encodeURIComponent(theme)}`;

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'sc-archicode-ready') {
        iframe.contentWindow.postMessage({
          type: 'sc-archicode-init',
          content: content ?? '',
          theme: currentTheme(),
        }, '*');
      }
      if (data.type === 'sc-archicode-save') {
        onSave(String(data.content ?? ''));
        closeFullscreenEditor();
        showToast(cfg().editToast || 'Diagram uppdaterat');
      }
      if (data.type === 'sc-archicode-cancel') {
        closeFullscreenEditor();
      }
    }

    function onThemeChange(e) {
      if (!iframe.contentWindow || iframe.src === 'about:blank') return;
      iframe.contentWindow.postMessage({
        type: 'sc-archicode-set-theme',
        theme: e.detail,
      }, '*');
    }

    window.addEventListener('message', onMessage);
    window.addEventListener('sc-theme-change', onThemeChange);
    editorCleanup = () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('sc-theme-change', onThemeChange);
    };

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    iframe.src = url;
  }

  function wireModalFooterButtons() {
    setTimeout(() => {
      const footLeft = document.getElementById('modal-foot-left');
      const textarea = document.getElementById('ac-content');
      if (!footLeft || !textarea) return;

      footLeft.innerHTML = '';
      const fsBtn = document.createElement('button');
      fsBtn.type = 'button';
      fsBtn.className = 'md-fullscreen-btn ac-fullscreen-btn';
      fsBtn.textContent = cfg().fullscreenLabel || 'ArchiCode-editor';
      fsBtn.title = cfg().fullscreenTitle || 'Monaco-editor med live-förhandsvisning';
      fsBtn.onclick = () => {
        openFullscreenEditor(textarea.value, (newContent) => {
          textarea.value = newContent;
        });
      };
      footLeft.appendChild(fsBtn);
    }, 50);
  }

  async function openAdd() {
    try {
      const pos = centerPos();
      await Modal.openFromType(TYPE, 'add', {}, async () => {
        const fields = Modal.readFields({ title: 'ac-title', width: 'ac-width', height: 'ac-height', content: 'ac-content' });
        const defaults = nodeDefaults();
        const width = parseInt(fields.width, 10) || defaults.width || 520;
        const height = parseArchicodeHeight(fields.height) ?? defaultArchicodeHeight();
        const content = fields.content || DEFAULT_CODE;
        const id = genId();
        const filename = `${defaults.fileDir || 'diagrams'}/${id}.${defaults.fileExt || 'ac'}`;

        files[filename] = new TextEncoder().encode(content);
        const node = {
          id,
          type: TYPE,
          x: pos.x,
          y: pos.y,
          width,
          height,
          title: fields.title,
          file: filename,
          _ownFile: true,
        };
        nodes.push(node);
        await buildNodeEl(node);
        markDirty();
        Modal.close();
        showToast(cfg().addToast || 'ArchiCode-nod tillagd');
      });
      wireModalFooterButtons();
    } catch (err) {
      console.error('[ArchicodeModule.openAdd]', err);
      showToast(err?.message || 'Kunde inte öppna ArchiCode', 4000);
    }
  }

  async function openEdit(node) {
    selectNode(node.id);
    let content = '';
    if (node.file) content = await readTextFile(node.file);
    else if (node.content) content = node.content;

    await Modal.openFromType(TYPE, 'edit', {
      title: node.title || '',
      width: node.width || nodeDefaults().width || 520,
      height: node.height || defaultArchicodeHeight(),
      content,
    }, async () => {
      const fields = Modal.readFields({ title: 'ac-title', width: 'ac-width', height: 'ac-height', content: 'ac-content' });
      const defaults = nodeDefaults();
      node.title = fields.title;
      node.width = parseInt(fields.width, 10) || defaults.width || 520;
      node.height = parseArchicodeHeight(fields.height) ?? defaultArchicodeHeight();
      const newContent = fields.content;
      if (node.file) {
        files[node.file] = new TextEncoder().encode(newContent);
      } else {
        node.content = newContent;
      }
      node._el.style.width = node.width + 'px';
      applyNodeLayout(node);
      const htitle = node._el.querySelector('.node-handle span:nth-child(2)');
      if (htitle) htitle.textContent = node.title || '';
      const body = node._el.querySelector('.node-body');
      await renderContent(node, body);
      markDirty();
      Modal.close();
      showToast(cfg().editToast || 'Sparad');
    });
    wireModalFooterButtons();
  }

  return {
    openAdd,
    openEdit,
    closeFullscreenEditor,
    openFullscreenEditor,
    renderContent,
    rerender,
    ensureArchiCodeLoaded,
  };
})();

ModuleRegistry.register('archicode', ArchicodeModule);
window.ArchicodeModule = ArchicodeModule;
window.addEventListener('sc-add-menu-select', e => {
  const id = e.detail?.id;
  if (id === 'archicode' || id === 'archimate') ArchicodeModule.openAdd();
});
