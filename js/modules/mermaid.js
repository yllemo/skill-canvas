// ════════════════════════════════════════════════════════════
//  MERMAID MODULE
// ════════════════════════════════════════════════════════════
const MermaidModule = (() => {
  const TYPE = 'mermaid';
  const cfg = () => window.SC_DEFAULTS?.modules?.mermaid || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.mermaid || {};

  let editorCleanup = null;

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function editorUrl() {
    return cfg().editorUrl || 'html/mermaid-editor.php';
  }

  function parseMermaidHeight(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return undefined;
    const defs = nodeDefaults();
    const h = parseInt(s, 10);
    if (!Number.isFinite(h) || h <= 0) return undefined;
    return Math.max(defs.minHeight || 120, Math.min(defs.maxHeight || 1600, h));
  }

  function defaultMermaidHeight() {
    return nodeDefaults().height || 600;
  }

  function applyNodeLayout(node) {
    if (node._el && typeof applyMermaidNodeLayout === 'function') {
      applyMermaidNodeLayout(node, node._el);
    }
  }

  function closeFullscreenEditor() {
    const overlay = document.getElementById('mm-editor-overlay');
    const iframe = document.getElementById('mm-editor-frame');
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
    const overlay = document.getElementById('mm-editor-overlay');
    const iframe = document.getElementById('mm-editor-frame');
    if (!overlay || !iframe) {
      showToast('Mermaid-editorn kunde inte öppnas', 4000);
      return;
    }

    closeFullscreenEditor();

    const theme = currentTheme();
    const url = `${editorUrl()}?embed=1&theme=${encodeURIComponent(theme)}`;

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'sc-mermaid-ready') {
        iframe.contentWindow.postMessage({
          type: 'sc-mermaid-init',
          content: content ?? '',
          theme: currentTheme(),
        }, '*');
      }
      if (data.type === 'sc-mermaid-save') {
        onSave(String(data.content ?? ''));
        closeFullscreenEditor();
        showToast(cfg().editToast || 'Diagram uppdaterat');
      }
      if (data.type === 'sc-mermaid-cancel') {
        closeFullscreenEditor();
      }
    }

    function onThemeChange(e) {
      if (!iframe.contentWindow || iframe.src === 'about:blank') return;
      iframe.contentWindow.postMessage({
        type: 'sc-mermaid-set-theme',
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
      const textarea = document.getElementById('mm-content');
      if (!footLeft || !textarea) return;

      footLeft.innerHTML = '';
      const fsBtn = document.createElement('button');
      fsBtn.type = 'button';
      fsBtn.className = 'md-fullscreen-btn mm-fullscreen-btn';
      fsBtn.textContent = cfg().fullscreenLabel || 'Mermaid-editor';
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
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const fields = Modal.readFields({ title: 'mm-title', width: 'mm-width', height: 'mm-height', content: 'mm-content' });
      const defaults = nodeDefaults();
      const width = parseInt(fields.width, 10) || defaults.width || 500;
      const height = parseMermaidHeight(fields.height) ?? defaultMermaidHeight();
      const id = genId();
      const filename = `${defaults.fileDir || 'diagrams'}/${id}.${defaults.fileExt || 'mmd'}`;

      files[filename] = new TextEncoder().encode(fields.content);
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
      showToast(cfg().addToast || 'Mermaid-nod tillagd');
    });
    wireModalFooterButtons();
  }

  async function openEdit(node) {
    selectNode(node.id);
    let content = '';
    if (node.file) content = await readTextFile(node.file);
    else if (node.content) content = node.content;

    await Modal.openFromType(TYPE, 'edit', {
      title: node.title || '',
      width: node.width || nodeDefaults().width || 500,
      height: node.height || defaultMermaidHeight(),
      content,
    }, async () => {
      const fields = Modal.readFields({ title: 'mm-title', width: 'mm-width', height: 'mm-height', content: 'mm-content' });
      const defaults = nodeDefaults();
      node.title = fields.title;
      node.width = parseInt(fields.width, 10) || defaults.width || 500;
      node.height = parseMermaidHeight(fields.height) ?? defaultMermaidHeight();
      if (node.file) {
        files[node.file] = new TextEncoder().encode(fields.content);
      } else {
        node.content = fields.content;
      }
      node._el.style.width = node.width + 'px';
      applyNodeLayout(node);
      const htitle = node._el.querySelector('.node-handle span:nth-child(2)');
      if (htitle) htitle.textContent = node.title || '';
      const body = node._el.querySelector('.node-body');
      await renderNodeContent(node, body);
      markDirty();
      Modal.close();
      showToast(cfg().editToast || 'Sparad');
    });
    wireModalFooterButtons();
  }

  return { openAdd, openEdit, closeFullscreenEditor, openFullscreenEditor };
})();

ModuleRegistry.register('mermaid', MermaidModule);
document.getElementById('add-mm').onclick = () => MermaidModule.openAdd();
