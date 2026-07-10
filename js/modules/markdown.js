// ════════════════════════════════════════════════════════════
//  MARKDOWN MODULE
// ════════════════════════════════════════════════════════════
const MarkdownModule = (() => {
  const TYPE = 'markdown';
  const cfg = () => window.SC_DEFAULTS?.modules?.markdown || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.markdown || {};

  let editorCleanup = null;

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function editorUrl() {
    return cfg().editorUrl || 'html/markdown.php';
  }

  function defaultMarkdownHeight() {
    return nodeDefaults().height || 600;
  }

  function closeFullscreenEditor() {
    const overlay = document.getElementById('md-editor-overlay');
    const iframe = document.getElementById('md-editor-frame');
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
    const overlay = document.getElementById('md-editor-overlay');
    const iframe = document.getElementById('md-editor-frame');
    if (!overlay || !iframe) {
      showToast('Fullskärmseditorn kunde inte öppnas', 4000);
      return;
    }

    closeFullscreenEditor();

    const theme = currentTheme();
    const url = `${editorUrl()}?embed=1&theme=${encodeURIComponent(theme)}`;

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'sc-markdown-ready') {
        iframe.contentWindow.postMessage({
          type: 'sc-markdown-init',
          content: content ?? '',
          theme: currentTheme(),
        }, '*');
      }
      if (data.type === 'sc-markdown-save') {
        onSave(String(data.content ?? ''));
        closeFullscreenEditor();
        showToast(cfg().editToast || 'Innehåll uppdaterat');
      }
      if (data.type === 'sc-markdown-cancel') {
        closeFullscreenEditor();
      }
    }

    function onThemeChange(e) {
      if (!iframe.contentWindow || iframe.src === 'about:blank') return;
      iframe.contentWindow.postMessage({
        type: 'sc-markdown-set-theme',
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
      const textarea = document.getElementById('md-content');
      if (!footLeft || !textarea) return;

      footLeft.innerHTML = '';

      const fsBtn = document.createElement('button');
      fsBtn.type = 'button';
      fsBtn.id = 'md-open-fullscreen';
      fsBtn.className = 'md-fullscreen-btn';
      fsBtn.textContent = cfg().fullscreenLabel || 'Fullskärmseditor';
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
      const fields = Modal.readFields({ title: 'md-title', width: 'md-width', height: 'md-height', content: 'md-content' });
      const defaults = nodeDefaults();
      const width = parseInt(fields.width, 10) || defaults.width || 720;
      const height = parseMarkdownHeight(fields.height) ?? defaultMarkdownHeight();
      const id = genId();
      const filename = `${defaults.fileDir || 'nodes'}/${id}.${defaults.fileExt || 'md'}`;

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
      showToast(cfg().addToast || 'Markdown-nod tillagd');
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
      width: node.width || nodeDefaults().width || 720,
      height: node.height || defaultMarkdownHeight(),
      content,
    }, async () => {
      const fields = Modal.readFields({ title: 'md-title', width: 'md-width', height: 'md-height', content: 'md-content' });
      const defaults = nodeDefaults();
      node.title = fields.title;
      node.width = parseInt(fields.width, 10) || defaults.width || 720;
      node.height = parseMarkdownHeight(fields.height) ?? defaultMarkdownHeight();
      if (node.file) {
        files[node.file] = new TextEncoder().encode(fields.content);
      } else {
        node.content = fields.content;
      }
      node._el.style.width = node.width + 'px';
      const htitle = node._el.querySelector('.node-handle-title');
      if (htitle) htitle.textContent = node.title || '';
      const body = node._el.querySelector('.node-body');
      await renderNodeContent(node, body);
      applyMarkdownNodeLayout(node, node._el);
      markDirty();
      Modal.close();
      showToast(cfg().editToast || 'Sparad');
    });
    wireModalFooterButtons();
  }

  function queryFullscreenContent() {
    return new Promise(resolve => {
      const iframe = document.getElementById('md-editor-frame');
      const overlay = document.getElementById('md-editor-overlay');
      if (!iframe?.contentWindow || !overlay?.classList.contains('open')) {
        resolve('');
        return;
      }
      function onMsg(e) {
        if (e.source !== iframe.contentWindow) return;
        if (e.data?.type === 'sc-markdown-content') {
          window.removeEventListener('message', onMsg);
          resolve(String(e.data.content ?? ''));
        }
      }
      window.addEventListener('message', onMsg);
      iframe.contentWindow.postMessage({ type: 'sc-docx-query-content' }, '*');
      setTimeout(() => {
        window.removeEventListener('message', onMsg);
        resolve('');
      }, 2500);
    });
  }

  async function openDocxForFullscreen() {
    if (typeof DocxImport === 'undefined') {
      showToast('DOCX-import otillgänglig', 4000);
      return;
    }
    const iframe = document.getElementById('md-editor-frame');
    const current = await queryFullscreenContent();
    DocxImport.open({
      getContent: () => current,
      apply: md => {
        iframe?.contentWindow?.postMessage({ type: 'sc-docx-apply', markdown: md }, '*');
      },
    });
  }

  window.addEventListener('message', e => {
    if (e.data?.type === 'sc-request-docx-import') {
      openDocxForFullscreen();
    }
  });

  return { openAdd, openEdit, closeFullscreenEditor, openDocxForFullscreen };
})();

ModuleRegistry.register('markdown', MarkdownModule);
document.getElementById('add-md').onclick = () => MarkdownModule.openAdd();
