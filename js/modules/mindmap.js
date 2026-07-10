// ════════════════════════════════════════════════════════════
//  MINDMAP MODULE
// ════════════════════════════════════════════════════════════
const MindmapModule = (() => {
  const TYPE = 'mindmap';
  const cfg = () => window.SC_DEFAULTS?.modules?.mindmap || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.mindmap || {};

  const DEFAULT_CONTENT = `---
title: Tankekarta
app: gs-mindmap
version: 2
created: ${new Date().toISOString()}
modified: ${new Date().toISOString()}
theme: light
background: dots
nodes: 7
---

# Tankekarta

- Idéer
  - Första tanken
  - Andra tanken
- Att göra
  - Nästa steg
- Frågor
`;

  let editorCleanup = null;
  let pendingPngDataUrl = null;

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function editorUrl() {
    return cfg().editorUrl || 'html/mindmap-editor.php';
  }

  function dataUrlToBytes(dataUrl) {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    const b64 = dataUrl.split(',')[1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return arr;
  }

  function ensureNodeFiles(node) {
    const dir = nodeDefaults().fileDir || 'mindmap';
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

  function closeFullscreenEditor() {
    const overlay = document.getElementById('mp-editor-overlay');
    const iframe = document.getElementById('mp-editor-frame');
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
    const overlay = document.getElementById('mp-editor-overlay');
    const iframe = document.getElementById('mp-editor-frame');
    if (!overlay || !iframe) {
      showToast('Mindmap-editorn kunde inte öppnas', 4000);
      return;
    }

    closeFullscreenEditor();

    const theme = currentTheme();
    const url = `${editorUrl()}?embed=1&theme=${encodeURIComponent(theme)}&_=${Date.now()}`;

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'sc-mindmap-ready') {
        iframe.contentWindow.postMessage({
          type: 'sc-mindmap-init',
          content: init.content ?? '',
          title: init.title ?? '',
          theme: currentTheme(),
        }, '*');
      }
      if (data.type === 'sc-mindmap-save') {
        onSave(String(data.content ?? ''), data.pngDataUrl || '', String(data.title ?? init.title ?? ''));
        closeFullscreenEditor();
        showToast(cfg().editToast || 'Mindmap uppdaterad');
      }
      if (data.type === 'sc-mindmap-cancel') {
        closeFullscreenEditor();
      }
    }

    function onThemeChange(e) {
      if (!iframe.contentWindow || iframe.src === 'about:blank') return;
      iframe.contentWindow.postMessage({
        type: 'sc-mindmap-set-theme',
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
      const textarea = document.getElementById('mp-content');
      const titleInput = document.getElementById('mp-title');
      if (!footLeft || !textarea) return;

      footLeft.innerHTML = '';
      const fsBtn = document.createElement('button');
      fsBtn.type = 'button';
      fsBtn.className = 'md-fullscreen-btn mp-fullscreen-btn';
      fsBtn.textContent = cfg().fullscreenLabel || 'Mindmap-editor';
      fsBtn.title = cfg().fullscreenTitle || 'Interaktiv tankekarta med export';
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
      const fields = Modal.readFields({ title: 'mp-title', width: 'mp-width', content: 'mp-content' });
      const defaults = nodeDefaults();
      const width = parseInt(fields.width, 10) || defaults.width || 520;
      const content = fields.content.trim() || DEFAULT_CONTENT;
      const id = genId();
      const dir = defaults.fileDir || 'mindmap';
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
      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      Modal.close();
      pendingPngDataUrl = null;
      showToast(cfg().addToast || 'Mindmap-nod tillagd');
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
      content,
    }, async () => {
      const fields = Modal.readFields({ title: 'mp-title', width: 'mp-width', content: 'mp-content' });
      const defaults = nodeDefaults();
      node.title = fields.title;
      node.width = parseInt(fields.width, 10) || defaults.width || 520;
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

ModuleRegistry.register('mindmap', MindmapModule);
window.addEventListener('sc-add-menu-select', e => {
  if (e.detail?.id === 'mindmap') MindmapModule.openAdd();
});
