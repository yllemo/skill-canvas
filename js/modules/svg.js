// ════════════════════════════════════════════════════════════
//  SVG MODULE (SVG Studio)
// ════════════════════════════════════════════════════════════
const SvgModule = (() => {
  const TYPE = 'svg';
  const cfg = () => window.SC_DEFAULTS?.modules?.svg || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.svg || {};

  const DEFAULT_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="400" height="260">
  <rect x="0" y="0" width="400" height="260" rx="8" fill="#F4F9FC"/>
  <rect x="24" y="24" width="352" height="56" rx="4" fill="#0077bc"/>
  <text x="40" y="60" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">SVG Studio</text>
  <circle cx="80" cy="160" r="40" fill="#008391"/>
  <rect x="150" y="120" width="80" height="80" rx="4" fill="#5a8b3b"/>
  <polygon points="300,120 340,200 260,200" fill="#ffd666" stroke="#d24723" stroke-width="3"/>
  <text x="24" y="240" font-family="Arial, sans-serif" font-size="13" fill="#6E6E6E">Redigera koden — förhandsvisningen uppdateras direkt.</text>
</svg>`;

  let editorCleanup = null;

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function editorUrl() {
    return cfg().editorUrl || 'html/svg-editor.php';
  }

  function ensureNodeFile(node) {
    const dir = nodeDefaults().fileDir || 'svg';
    const id = node.id;
    if (!node.file) {
      node.file = `${dir}/${id}.svg`;
      node._ownFile = true;
    }
  }

  async function renderContent(node, body) {
    body.innerHTML = '';
    let code = '';
    if (node.file) code = await readTextFile(node.file);
    else if (node.content) code = node.content;

    const wrap = document.createElement('div');
    wrap.className = 'svg-wrap';
    const trimmed = String(code || '').trim();

    if (!trimmed || !/<svg[\s>]/i.test(trimmed)) {
      const ph = document.createElement('div');
      ph.className = 'svg-placeholder';
      ph.textContent = trimmed ? 'Ogiltig SVG-kod' : 'Ingen SVG — öppna SVG Studio';
      wrap.appendChild(ph);
    } else {
      wrap.innerHTML = trimmed;
      const svg = wrap.querySelector('svg');
      if (svg) {
        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
        svg.style.display = 'block';
        if (node.title) svg.setAttribute('aria-label', node.title);
      } else {
        const ph = document.createElement('div');
        ph.className = 'svg-placeholder';
        ph.textContent = 'Ogiltig SVG-kod';
        wrap.textContent = '';
        wrap.appendChild(ph);
      }
    }

    body.style.padding = '0';
    body.appendChild(wrap);
  }

  function closeFullscreenEditor() {
    const overlay = document.getElementById('sv-editor-overlay');
    const iframe = document.getElementById('sv-editor-frame');
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
    const overlay = document.getElementById('sv-editor-overlay');
    const iframe = document.getElementById('sv-editor-frame');
    if (!overlay || !iframe) {
      showToast('SVG-editorn kunde inte öppnas', 4000);
      return;
    }

    closeFullscreenEditor();

    const theme = currentTheme();
    const url = `${editorUrl()}?embed=1&theme=${encodeURIComponent(theme)}&_=${Date.now()}`;

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'sc-svg-ready') {
        iframe.contentWindow.postMessage({
          type: 'sc-svg-init',
          content: init.content ?? '',
          title: init.title ?? '',
          theme: currentTheme(),
        }, '*');
      }
      if (data.type === 'sc-svg-save') {
        onSave(String(data.content ?? ''), String(data.title ?? init.title ?? ''));
        closeFullscreenEditor();
        showToast(cfg().editToast || 'SVG uppdaterad');
      }
      if (data.type === 'sc-svg-cancel') {
        closeFullscreenEditor();
      }
    }

    function onThemeChange(e) {
      if (!iframe.contentWindow || iframe.src === 'about:blank') return;
      iframe.contentWindow.postMessage({
        type: 'sc-svg-set-theme',
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
      const textarea = document.getElementById('sv-content');
      const titleInput = document.getElementById('sv-title');
      if (!footLeft || !textarea) return;

      footLeft.innerHTML = '';
      const fsBtn = document.createElement('button');
      fsBtn.type = 'button';
      fsBtn.className = 'md-fullscreen-btn sv-fullscreen-btn';
      fsBtn.textContent = cfg().fullscreenLabel || 'SVG Studio';
      fsBtn.title = cfg().fullscreenTitle || 'Monaco-editor med live-förhandsvisning';
      fsBtn.onclick = () => {
        openFullscreenEditor({
          content: textarea.value,
          title: titleInput?.value || '',
        }, (newContent, title) => {
          textarea.value = newContent;
          if (title && titleInput) titleInput.value = title;
        });
      };
      footLeft.appendChild(fsBtn);
    }, 50);
  }

  async function openAdd() {
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const fields = Modal.readFields({ title: 'sv-title', width: 'sv-width', content: 'sv-content' });
      const defaults = nodeDefaults();
      const width = parseInt(fields.width, 10) || defaults.width || 480;
      const content = fields.content.trim() || DEFAULT_CONTENT;
      const id = genId();
      const dir = defaults.fileDir || 'svg';
      const svgPath = `${dir}/${id}.svg`;

      files[svgPath] = new TextEncoder().encode(content);

      const node = {
        id,
        type: TYPE,
        x: pos.x,
        y: pos.y,
        width,
        title: fields.title,
        file: svgPath,
        _ownFile: true,
      };
      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      Modal.close();
      showToast(cfg().addToast || 'SVG-nod tillagd');
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
      width: node.width || nodeDefaults().width || 480,
      content,
    }, async () => {
      const fields = Modal.readFields({ title: 'sv-title', width: 'sv-width', content: 'sv-content' });
      const defaults = nodeDefaults();
      node.title = fields.title;
      node.width = parseInt(fields.width, 10) || defaults.width || 480;
      ensureNodeFile(node);
      files[node.file] = new TextEncoder().encode(fields.content);
      node._el.style.width = node.width + 'px';
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

  return { openAdd, openEdit, closeFullscreenEditor, openFullscreenEditor, renderContent };
})();

ModuleRegistry.register('svg', SvgModule);
window.addEventListener('sc-add-menu-select', e => {
  if (e.detail?.id === 'svg') SvgModule.openAdd();
});
