// ════════════════════════════════════════════════════════════
//  HTML / IFRAME MODULE
// ════════════════════════════════════════════════════════════
const HtmlModule = (() => {
  const TYPE = 'html';
  const cfg = () => window.SC_DEFAULTS?.modules?.html || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.html || {};

  let modalClassObserver = null;

  function escAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function defaultUrl() {
    return nodeDefaults().defaultUrl || 'https://blog.yllemo.com';
  }

  function starterHtml() {
    return cfg().starterHtml || `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skill HTML</title>
</head>
<body>
  <h1>Hej!</h1>
  <p>Redigera HTML — filen sparas i skill-paketet.</p>
</body>
</html>`;
  }

  function normalizeUrl(raw) {
    let url = String(raw || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return '';
      return parsed.href;
    } catch {
      return '';
    }
  }

  function resolveSource(nodeOrModal) {
    if (typeof nodeOrModal === 'string') return nodeOrModal === 'file' ? 'file' : 'url';
    if (nodeOrModal?.source === 'file' || nodeOrModal?.source === 'url') return nodeOrModal.source;
    if (nodeOrModal?.file && !nodeOrModal?.url) return 'file';
    return 'url';
  }

  function readSourceFromModal() {
    return document.getElementById('html-source')?.value === 'file' ? 'file' : 'url';
  }

  function sanitizeFileName(raw) {
    let name = String(raw || '').trim().replace(/\\/g, '/');
    name = name.replace(/^html\//i, '').replace(/\.html?$/i, '');
    name = name.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
    return name;
  }

  function fileNameFromPath(path) {
    const base = String(path || '').split('/').pop() || '';
    return base.replace(/\.html?$/i, '');
  }

  function resolveFilePath(fileNameInput) {
    const name = sanitizeFileName(fileNameInput);
    if (!name) throw new Error('missing_filename');
    const dir = nodeDefaults().fileDir || 'html';
    return `${dir}/${name}.html`;
  }

  function buildIframeCode(opts) {
    const source = resolveSource(opts);
    const w = String(opts.iframeWidth || nodeDefaults().iframeWidth || '100%').trim() || '100%';
    const h = Math.max(1, parseInt(opts.height, 10) || nodeDefaults().height || 400);
    const titleAttr = opts.title ? ` title="${escAttr(opts.title)}"` : '';

    if (source === 'file') {
      const filePath = String(opts.file || '').trim();
      if (!filePath) return '<!-- Ange filnamn och HTML-kod -->';
      return `<iframe src="${escAttr(filePath)}" width="${escAttr(w)}" height="${h}" frameborder="0" loading="lazy"${titleAttr}></iframe>`;
    }

    const src = normalizeUrl(opts.url || defaultUrl());
    if (!src) return '<!-- Ange en giltig Website URL -->';
    return `<iframe src="${escAttr(src)}" width="${escAttr(w)}" height="${h}" frameborder="0" loading="lazy"${titleAttr}></iframe>`;
  }

  function readModalValues() {
    const source = readSourceFromModal();
    const title = document.getElementById('html-title')?.value?.trim() || '';
    const url = document.getElementById('html-url')?.value?.trim() || defaultUrl();
    const content = document.getElementById('html-content')?.value ?? '';
    const fileName = document.getElementById('html-filename')?.value?.trim() || '';
    const height = parseInt(document.getElementById('html-iframe-height')?.value, 10)
      || nodeDefaults().height || 400;
    const width = parseInt(document.getElementById('html-width')?.value, 10)
      || nodeDefaults().width || 640;
    const iframeWidth = nodeDefaults().iframeWidth || '100%';
    return { source, title, url, content, fileName, iframeWidth, height, width };
  }

  function previewFilePath(source, fileNameInput, existingFile) {
    if (source !== 'file') return '';
    const name = sanitizeFileName(fileNameInput);
    if (name) {
      const dir = nodeDefaults().fileDir || 'html';
      return `${dir}/${name}.html`;
    }
    return existingFile || '';
  }

  function updateFilePathPreview(existingFile) {
    const el = document.getElementById('html-file-path-preview');
    if (!el) return;
    const v = readModalValues();
    const path = previewFilePath(v.source, v.fileName, existingFile);
    el.textContent = path ? `Sparas som ${path}` : 'Ange ett filnamn (t.ex. min-sida)';
  }

  function updateCodePreview(existingFile) {
    const preview = document.getElementById('html-code-preview');
    if (!preview) return;
    const v = readModalValues();
    preview.value = buildIframeCode({
      source: v.source,
      url: v.url,
      file: previewFilePath(v.source, v.fileName, existingFile),
      iframeWidth: v.iframeWidth,
      height: v.height,
      title: v.title,
    });
    updateFilePathPreview(existingFile);
  }

  function setActiveTab(source) {
    const isUrl = source !== 'file';
    document.getElementById('html-source').value = isUrl ? 'url' : 'file';
    document.querySelectorAll('.html-tab').forEach(tab => {
      const active = tab.getAttribute('data-html-tab') === (isUrl ? 'url' : 'file');
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.getElementById('html-panel-url')?.classList.toggle('is-active', isUrl);
    document.getElementById('html-panel-file')?.classList.toggle('is-active', !isUrl);
  }

  function markModalHtml() {
    document.getElementById('modal')?.classList.add('modal-html');
  }

  function unmarkModalHtml() {
    document.getElementById('modal')?.classList.remove('modal-html');
  }

  function wireModal(existingFile) {
    setTimeout(() => {
      markModalHtml();
      setActiveTab(readSourceFromModal());
      updateCodePreview(existingFile);

      document.querySelectorAll('.html-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const source = tab.getAttribute('data-html-tab') === 'file' ? 'file' : 'url';
          setActiveTab(source);
          updateCodePreview(existingFile);
        });
      });

      ['html-url', 'html-iframe-height', 'html-width', 'html-title', 'html-content', 'html-filename'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => updateCodePreview(existingFile));
      });

      const footLeft = document.getElementById('modal-foot-left');
      if (footLeft) {
        footLeft.innerHTML = '';
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'md-fullscreen-btn html-copy-code-btn';
        copyBtn.textContent = cfg().copyCodeLabel || 'Kopiera iframe-kod';
        copyBtn.onclick = async () => {
          updateCodePreview(existingFile);
          const code = document.getElementById('html-code-preview')?.value || '';
          try {
            await navigator.clipboard.writeText(code);
            showToast(cfg().copyToast || 'iframe-kod kopierad');
          } catch {
            showToast('Kunde inte kopiera', 4000);
          }
        };
        footLeft.appendChild(copyBtn);
      }

      if (!modalClassObserver) {
        modalClassObserver = new MutationObserver(() => {
          const bg = document.getElementById('modal-bg');
          if (bg && !bg.classList.contains('open')) unmarkModalHtml();
        });
        const bg = document.getElementById('modal-bg');
        if (bg) modalClassObserver.observe(bg, { attributes: true, attributeFilter: ['class'] });
      }
    }, 50);
  }

  function normalizeNode(node) {
    if (!node || node.type !== 'html') return node;
    node.source = resolveSource(node);
    if (node.source === 'file') {
      delete node.url;
    } else if (!node.url) {
      node.url = defaultUrl();
    }
    return node;
  }

  function applyNodeSize(node) {
    if (!node._el) return;
    node._el.style.width = `${node.width}px`;
    const body = node._el.querySelector('.node-body');
    if (body) body.style.height = `${node.height}px`;
    const iframe = node._el.querySelector('.html-embed-frame');
    if (iframe) iframe.style.height = `${node.height}px`;
  }

  function removeOwnedFile(node) {
    if (node.file && node._ownFile && files[node.file]) {
      delete files[node.file];
    }
    delete node.file;
    delete node._ownFile;
  }

  function applySaveToNode(node, values, isNew) {
    const defaults = nodeDefaults();
    node.title = values.title;
    node.iframeWidth = values.iframeWidth || defaults.iframeWidth || '100%';
    node.width = values.width;
    node.height = values.height;

    if (values.source === 'url') {
      const url = normalizeUrl(values.url);
      if (!url) throw new Error('missing_url');
      if (node.file && node._ownFile) removeOwnedFile(node);
      node.url = url;
      node.source = 'url';
      return;
    }

    const content = String(values.content ?? '').trim();
    if (!content) throw new Error('missing_content');

    const newPath = resolveFilePath(values.fileName);
    const oldPath = node.file;

    if (files[newPath] && newPath !== oldPath) {
      throw new Error('file_exists');
    }

    delete node.url;
    node.source = 'file';

    if (oldPath && oldPath !== newPath && node._ownFile) {
      delete files[oldPath];
    }

    files[newPath] = new TextEncoder().encode(content);
    node.file = newPath;
    node._ownFile = true;
  }

  async function renderContent(node, body) {
    revokeBlob(node);
    normalizeNode(node);

    const iframeH = node.height || nodeDefaults().height || 400;
    const source = resolveSource(node);

    body.innerHTML = '';
    body.style.padding = '0';
    body.style.height = `${iframeH}px`;

    const wrap = document.createElement('div');
    wrap.className = 'html-embed-wrap';

    let iframeSrc = '';
    let linkHref = '';
    let linkLabel = 'Öppna i ny flik ↗';

    if (source === 'file' && node.file && files[node.file]) {
      iframeSrc = blobUrlForFile(node.file);
      if (iframeSrc) node._htmlBlobUrl = iframeSrc;
      linkHref = iframeSrc;
      linkLabel = `${node.file} ↗`;
    } else if (source === 'url') {
      iframeSrc = normalizeUrl(node.url || defaultUrl());
      linkHref = iframeSrc;
    }

    if (iframeSrc) {
      const iframe = document.createElement('iframe');
      iframe.className = 'html-embed-frame';
      iframe.src = iframeSrc;
      iframe.setAttribute('width', '100%');
      iframe.style.height = `${iframeH}px`;
      iframe.loading = 'lazy';
      iframe.setAttribute('frameborder', '0');
      if (node.title) iframe.title = node.title;
      if (source === 'url') iframe.referrerPolicy = 'no-referrer-when-downgrade';
      wrap.appendChild(iframe);

      const link = document.createElement('a');
      link.className = 'html-open-link';
      link.href = linkHref;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = linkLabel;
      wrap.appendChild(link);
    } else {
      const ph = document.createElement('div');
      ph.className = 'html-placeholder';
      ph.textContent = source === 'file'
        ? 'HTML-fil saknas — klicka Redigera'
        : 'Ingen URL angiven — klicka Redigera';
      wrap.appendChild(ph);
    }

    body.appendChild(wrap);
  }

  async function openAdd() {
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const v = readModalValues();
      try {
        const defaults = nodeDefaults();
        const id = genId();
        const node = {
          id,
          type: TYPE,
          x: pos.x,
          y: pos.y,
          width: v.width || defaults.width || 640,
          height: v.height || defaults.height || 400,
          iframeWidth: v.iframeWidth || defaults.iframeWidth || '100%',
          title: v.title,
        };
        applySaveToNode(node, v, true);
        nodes.push(node);
        await buildNodeEl(node);
        markDirty();
        Modal.close();
        showToast(cfg().addToast || 'HTML/iframe-nod tillagd');
      } catch (err) {
        if (err.message === 'missing_url') {
          showToast(cfg().missingUrlToast || 'Ange en giltig Website URL (https://…)', 4000);
          return;
        }
        if (err.message === 'missing_content') {
          showToast(cfg().missingContentToast || 'Ange HTML-kod', 4000);
          return;
        }
        if (err.message === 'missing_filename') {
          showToast(cfg().missingFilenameToast || 'Ange ett filnamn', 4000);
          return;
        }
        if (err.message === 'file_exists') {
          showToast(cfg().fileExistsToast || 'Filnamnet finns redan i paketet', 4000);
          return;
        }
        throw err;
      }
    });
    wireModal(null);
  }

  async function openEdit(node) {
    selectNode(node.id);
    normalizeNode(node);
    let content = '';
    if (node.file && files[node.file]) content = await readTextFile(node.file);

    await Modal.openFromType(TYPE, 'edit', {
      title: node.title || '',
      source: resolveSource(node),
      url: node.url || defaultUrl(),
      content: content || starterHtml(),
      file: node.file || '',
      fileName: fileNameFromPath(node.file),
      iframeWidth: node.iframeWidth || nodeDefaults().iframeWidth || '100%',
      height: node.height || nodeDefaults().height || 400,
      width: node.width || nodeDefaults().width || 640,
    }, async () => {
      const v = readModalValues();
      try {
        applySaveToNode(node, v, false);
        applyNodeSize(node);
        const htitle = node._el?.querySelector('.node-handle span:nth-child(2)');
        if (htitle) htitle.textContent = node.title || '';
        const body = node._el?.querySelector('.node-body');
        if (body) await renderContent(node, body);
        markDirty();
        Modal.close();
        showToast(cfg().editToast || 'Sparad');
      } catch (err) {
        if (err.message === 'missing_url') {
          showToast(cfg().missingUrlToast || 'Ange en giltig Website URL (https://…)', 4000);
          return;
        }
        if (err.message === 'missing_content') {
          showToast(cfg().missingContentToast || 'Ange HTML-kod', 4000);
          return;
        }
        if (err.message === 'missing_filename') {
          showToast(cfg().missingFilenameToast || 'Ange ett filnamn', 4000);
          return;
        }
        if (err.message === 'file_exists') {
          showToast(cfg().fileExistsToast || 'Filnamnet finns redan i paketet', 4000);
          return;
        }
        throw err;
      }
    });
    wireModal(node.file || null);
  }

  function blobUrlForFile(path) {
    const data = files[path];
    if (data == null) return '';
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    return URL.createObjectURL(new Blob([bytes], { type: 'text/html;charset=utf-8' }));
  }

  function revokeBlob(node) {
    if (node?._htmlBlobUrl) {
      URL.revokeObjectURL(node._htmlBlobUrl);
      node._htmlBlobUrl = null;
    }
  }

  window.addEventListener('sc-add-menu-select', e => {
    if (e.detail?.id === 'html') HtmlModule.openAdd();
  });

  return {
    openAdd,
    openEdit,
    renderContent,
    buildIframeCode,
    normalizeUrl,
    normalizeNode,
    resolveSource,
    blobUrlForFile,
    revokeBlob,
  };
})();

ModuleRegistry.register('html', HtmlModule);
