// ════════════════════════════════════════════════════════════
//  PLANTUML MODULE
// ════════════════════════════════════════════════════════════
const PlantumlModule = (() => {
  const TYPE = 'plantuml';
  const cfg = () => window.SC_DEFAULTS?.modules?.plantuml || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.plantuml || {};

  const DEFAULT_CONTENT = `@startuml
Alice -> Bob: Hej
Bob --> Alice: Hej då
@enduml`;

  let editorCleanup = null;
  let pendingPngDataUrl = null;

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function editorUrl() {
    return cfg().editorUrl || 'html/plantuml-editor.php';
  }

  function dataUrlToBytes(dataUrl) {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    const b64 = dataUrl.split(',')[1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return arr;
  }

  function parsePlantumlHeight(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return undefined;
    const defs = nodeDefaults();
    const h = parseInt(s, 10);
    if (!Number.isFinite(h) || h <= 0) return undefined;
    return Math.max(defs.minHeight || 120, Math.min(defs.maxHeight || 1600, h));
  }

  function defaultPlantumlHeight() {
    return nodeDefaults().height || 600;
  }

  function applyNodeLayout(node) {
    if (node._el && typeof applyPlantumlNodeLayout === 'function') {
      applyPlantumlNodeLayout(node, node._el);
    }
  }

  function ensureNodeFiles(node) {
    const dir = nodeDefaults().fileDir || 'diagrams';
    const ext = nodeDefaults().fileExt || 'puml';
    const id = node.id;
    if (!node.file) {
      node.file = `${dir}/${id}.${ext}`;
      node._ownFile = true;
    }
    if (!node.previewFile) {
      node.previewFile = `${dir}/${id}.png`;
      node._ownPreview = true;
    }
  }

  function closeFullscreenEditor() {
    const overlay = document.getElementById('pu-editor-overlay');
    const iframe = document.getElementById('pu-editor-frame');
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

  function openFullscreenEditor(init, onSave) {
    const overlay = document.getElementById('pu-editor-overlay');
    const iframe = document.getElementById('pu-editor-frame');
    if (!overlay || !iframe) {
      showToast('PlantUML-editorn kunde inte öppnas', 4000);
      return;
    }

    closeFullscreenEditor();

    const theme = currentTheme();
    const url = `${editorUrl()}?embed=1&theme=${encodeURIComponent(theme)}&_=${Date.now()}`;

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'sc-plantuml-ready') {
        iframe.contentWindow.postMessage({
          type: 'sc-plantuml-init',
          content: init.content ?? '',
          theme: currentTheme(),
        }, '*');
      }
      if (data.type === 'sc-plantuml-save') {
        onSave(String(data.content ?? ''), data.pngDataUrl || '');
        closeFullscreenEditor();
        showToast(cfg().editToast || 'Diagram uppdaterat');
      }
      if (data.type === 'sc-plantuml-cancel') {
        closeFullscreenEditor();
      }
    }

    function onThemeChange(e) {
      if (!iframe.contentWindow || iframe.src === 'about:blank') return;
      iframe.contentWindow.postMessage({
        type: 'sc-plantuml-set-theme',
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
      const textarea = document.getElementById('pu-content');
      if (!footLeft || !textarea) return;

      footLeft.innerHTML = '';
      const fsBtn = document.createElement('button');
      fsBtn.type = 'button';
      fsBtn.className = 'md-fullscreen-btn pu-fullscreen-btn';
      fsBtn.textContent = cfg().fullscreenLabel || 'PlantUML-editor';
      fsBtn.title = cfg().fullscreenTitle || 'Monaco-editor med live-förhandsvisning';
      fsBtn.onclick = () => {
        openFullscreenEditor({
          content: textarea.value,
        }, (newContent, pngDataUrl) => {
          textarea.value = newContent;
          if (pngDataUrl) pendingPngDataUrl = pngDataUrl;
        });
      };
      footLeft.appendChild(fsBtn);
    }, 50);
  }

  async function openAdd() {
    pendingPngDataUrl = null;
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const fields = Modal.readFields({ title: 'pu-title', width: 'pu-width', height: 'pu-height', content: 'pu-content' });
      const defaults = nodeDefaults();
      const width = parseInt(fields.width, 10) || defaults.width || 500;
      const height = parsePlantumlHeight(fields.height) ?? defaultPlantumlHeight();
      const content = fields.content.trim() || DEFAULT_CONTENT;
      const id = genId();
      const dir = defaults.fileDir || 'diagrams';
      const pumlPath = `${dir}/${id}.${defaults.fileExt || 'puml'}`;
      const pngPath = `${dir}/${id}.png`;

      files[pumlPath] = new TextEncoder().encode(content);
      if (pendingPngDataUrl) {
        const pngBytes = dataUrlToBytes(pendingPngDataUrl);
        if (pngBytes) files[pngPath] = pngBytes;
      }

      const node = {
        id,
        type: TYPE,
        x: pos.x,
        y: pos.y,
        width,
        height,
        title: fields.title,
        file: pumlPath,
        previewFile: pngPath,
        _ownFile: true,
        _ownPreview: true,
      };
      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      Modal.close();
      pendingPngDataUrl = null;
      showToast(cfg().addToast || 'PlantUML-nod tillagd');
    });
    wireModalFooterButtons();
  }

  async function openEdit(node) {
    pendingPngDataUrl = null;
    selectNode(node.id);
    let content = '';
    if (node.file) content = await readTextFile(node.file);
    else if (node.content) content = node.content;

    await Modal.openFromType(TYPE, 'edit', {
      title: node.title || '',
      width: node.width || nodeDefaults().width || 500,
      height: node.height || defaultPlantumlHeight(),
      content,
    }, async () => {
      const fields = Modal.readFields({ title: 'pu-title', width: 'pu-width', height: 'pu-height', content: 'pu-content' });
      const defaults = nodeDefaults();
      node.title = fields.title;
      node.width = parseInt(fields.width, 10) || defaults.width || 500;
      node.height = parsePlantumlHeight(fields.height) ?? defaultPlantumlHeight();
      ensureNodeFiles(node);
      files[node.file] = new TextEncoder().encode(fields.content);
      if (pendingPngDataUrl) {
        const pngBytes = dataUrlToBytes(pendingPngDataUrl);
        if (pngBytes) files[node.previewFile] = pngBytes;
      }
      if (node._previewUrl) {
        URL.revokeObjectURL(node._previewUrl);
        node._previewUrl = null;
      }
      node._el.style.width = node.width + 'px';
      applyNodeLayout(node);
      const htitle = node._el.querySelector('.node-handle span:nth-child(2)');
      if (htitle) htitle.textContent = node.title || '';
      const body = node._el.querySelector('.node-body');
      await renderNodeContent(node, body);
      markDirty();
      Modal.close();
      pendingPngDataUrl = null;
      showToast(cfg().editToast || 'Sparad');
    });
    wireModalFooterButtons();
  }

  return { openAdd, openEdit, closeFullscreenEditor, openFullscreenEditor };
})();

ModuleRegistry.register('plantuml', PlantumlModule);
window.addEventListener('sc-add-menu-select', e => {
  if (e.detail?.id === 'plantuml') PlantumlModule.openAdd();
});
