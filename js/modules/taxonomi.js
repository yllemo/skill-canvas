// ════════════════════════════════════════════════════════════
//  TAXONOMI MODULE
// ════════════════════════════════════════════════════════════
const TaxonomiModule = (() => {
  const TYPE = 'taxonomi';
  const cfg = () => window.SC_DEFAULTS?.modules?.taxonomi || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.taxonomi || {};

  const DEFAULT_CONTENT = `# Min taxonomi

- Verksamhet
  - HR
    - Rekrytering
    - Lön
  - Ekonomi
    - Redovisning
    - Fakturering
  - IT
    - Applikationer
      - Förvaltning
      - Utveckling
    - Infrastruktur`;

  let editorCleanup = null;
  let pendingPngDataUrl = null;

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function editorUrl() {
    return cfg().editorUrl || 'html/taxonomi-editor.php';
  }

  function dataUrlToBytes(dataUrl) {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    const b64 = dataUrl.split(',')[1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return arr;
  }

  function parseTaxonomiHeight(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return undefined;
    const defs = nodeDefaults();
    const h = parseInt(s, 10);
    if (!Number.isFinite(h) || h <= 0) return undefined;
    return Math.max(defs.minHeight || 120, Math.min(defs.maxHeight || 1200, h));
  }

  function applyNodeLayout(node) {
    if (node._el && typeof applyTaxonomiNodeLayout === 'function') {
      applyTaxonomiNodeLayout(node, node._el);
    }
  }

  function ensureNodeFiles(node) {
    const dir = nodeDefaults().fileDir || 'taxonomi';
    const id = node.id;
    if (!node.file) {
      node.file = `${dir}/${id}.md`;
      node._ownFile = true;
    }
    if (!node.previewFile) {
      node.previewFile = `${dir}/${id}.png`;
      node._ownPreview = true;
    }
  }

  async function applyPreviewToNode(node, content, pngDataUrl, title) {
    ensureNodeFiles(node);
    files[node.file] = new TextEncoder().encode(String(content ?? ''));
    if (title !== undefined) node.title = title;

    const pngBytes = dataUrlToBytes(pngDataUrl);
    if (pngBytes && pngBytes.length > 32) {
      files[node.previewFile] = pngBytes;
    }

    if (node._previewUrl) {
      URL.revokeObjectURL(node._previewUrl);
      node._previewUrl = null;
    }

    if (node._el) {
      node._el.style.width = node.width + 'px';
      applyNodeLayout(node);
      const htitle = node._el.querySelector('.node-handle span:nth-child(2)');
      if (htitle) htitle.textContent = node.title || '';
      const body = node._el.querySelector('.node-body');
      if (body) await renderNodeContent(node, body);
    }
    markDirty();
  }

  function closeFullscreenEditor() {
    const overlay = document.getElementById('tx-editor-overlay');
    const iframe = document.getElementById('tx-editor-frame');
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
    const overlay = document.getElementById('tx-editor-overlay');
    const iframe = document.getElementById('tx-editor-frame');
    if (!overlay || !iframe) {
      showToast('Taxonomi-editorn kunde inte öppnas', 4000);
      return;
    }

    closeFullscreenEditor();

    const theme = currentTheme();
    const url = `${editorUrl()}?embed=1&theme=${encodeURIComponent(theme)}&_=${Date.now()}`;

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'sc-taxonomi-ready') {
        iframe.contentWindow.postMessage({
          type: 'sc-taxonomi-init',
          content: init.content ?? '',
          title: init.title ?? '',
          theme: currentTheme(),
        }, '*');
      }
      if (data.type === 'sc-taxonomi-save') {
        onSave(String(data.content ?? ''), data.pngDataUrl || '', String(data.title ?? init.title ?? ''));
        closeFullscreenEditor();
        showToast(cfg().editToast || 'Taxonomi uppdaterad');
      }
      if (data.type === 'sc-taxonomi-cancel') {
        closeFullscreenEditor();
      }
    }

    function onThemeChange(e) {
      if (!iframe.contentWindow || iframe.src === 'about:blank') return;
      iframe.contentWindow.postMessage({
        type: 'sc-taxonomi-set-theme',
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
      const textarea = document.getElementById('tx-content');
      const titleInput = document.getElementById('tx-title');
      if (!footLeft || !textarea) return;

      footLeft.innerHTML = '';
      const fsBtn = document.createElement('button');
      fsBtn.type = 'button';
      fsBtn.className = 'md-fullscreen-btn tx-fullscreen-btn';
      fsBtn.textContent = cfg().fullscreenLabel || 'Taxonomi-editor';
      fsBtn.title = cfg().fullscreenTitle || 'Visualisering och Monaco-redigering';
      fsBtn.onclick = () => {
        openFullscreenEditor({
          content: textarea.value,
          title: titleInput?.value || '',
        }, (newContent, pngDataUrl, title) => {
          textarea.value = newContent;
          if (title && titleInput) titleInput.value = title;
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
      const fields = Modal.readFields({ title: 'tx-title', width: 'tx-width', height: 'tx-height', content: 'tx-content' });
      const defaults = nodeDefaults();
      const width = parseInt(fields.width, 10) || defaults.width || 520;
      const height = parseTaxonomiHeight(fields.height);
      const content = fields.content.trim() || DEFAULT_CONTENT;
      const id = genId();
      const dir = defaults.fileDir || 'taxonomi';
      const mdPath = `${dir}/${id}.md`;
      const pngPath = `${dir}/${id}.png`;

      files[mdPath] = new TextEncoder().encode(content);
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
        title: fields.title,
        file: mdPath,
        previewFile: pngPath,
        _ownFile: true,
        _ownPreview: true,
      };
      if (height) node.height = height;
      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      Modal.close();
      pendingPngDataUrl = null;
      showToast(cfg().addToast || 'Taxonomi-nod tillagd');
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
      width: node.width || nodeDefaults().width || 520,
      height: node.height || '',
      content,
    }, async () => {
      const fields = Modal.readFields({ title: 'tx-title', width: 'tx-width', height: 'tx-height', content: 'tx-content' });
      const defaults = nodeDefaults();
      node.title = fields.title;
      node.width = parseInt(fields.width, 10) || defaults.width || 520;
      const height = parseTaxonomiHeight(fields.height);
      if (height) node.height = height;
      else delete node.height;
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

  return { openAdd, openEdit, closeFullscreenEditor, openFullscreenEditor, applyPreviewToNode };
})();

ModuleRegistry.register('taxonomi', TaxonomiModule);
window.addEventListener('sc-add-menu-select', e => {
  if (e.detail?.id === 'taxonomi') TaxonomiModule.openAdd();
});
