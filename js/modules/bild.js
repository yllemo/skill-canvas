// ════════════════════════════════════════════════════════════
//  BILD MODULE — motsvarar modules/bild.php
// ════════════════════════════════════════════════════════════
const BildModule = (() => {
  const TYPE = 'image';
  const cfg = () => window.SC_DEFAULTS?.modules?.bild || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.image || {};

  let pastedImage = null;
  let pasteCleanup = null;
  let paintEditorCleanup = null;
  let paintEditingNodeId = null;
  let paintPendingForAdd = false;

  function mimeToExt(mime) {
    return {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    }[mime] || 'png';
  }

  /** Filnamn: YYYY-MM-DD_HH.mm.ss (+ ms vid kollision via uniqueFilePath) */
  function pasteFilename(ext) {
    const now = new Date();
    const p = n => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
    const time = `${p(now.getHours())}.${p(now.getMinutes())}.${p(now.getSeconds())}`;
    const dir = nodeDefaults().fileDir || 'images';
    return uniqueFilePath(`${dir}/${date}_${time}.${ext}`);
  }

  function clearPasteState() {
    pastedImage = null;
    const area = document.getElementById('bild-drop-area');
    if (area) area.classList.remove('has-paste');
  }

  function showPastePreview(blob) {
    const prev = document.getElementById('bild-preview');
    const area = document.getElementById('bild-drop-area');
    if (!prev || !area) return;
    const url = URL.createObjectURL(blob);
    prev.innerHTML = `<img src="${url}" style="max-width:100%;max-height:140px;border-radius:4px;object-fit:contain">`;
    area.classList.add('has-paste');
    area.style.border = '2px solid #27ae60';
  }

  function wirePasteHandler() {
    if (pasteCleanup) pasteCleanup();
    clearPasteState();

    const pick = document.getElementById('bild-file');
    if (pick) pick.value = '';

    function onPaste(e) {
      if (!document.getElementById('modal-bg')?.classList.contains('open')) return;
      if (!document.getElementById('bild-drop-area')) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (!item.type.startsWith('image/')) continue;
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;

        pastedImage = {
          blob,
          ext: mimeToExt(item.type),
        };
        if (pick) pick.value = '';
        const urlInput = document.getElementById('bild-url');
        if (urlInput) urlInput.value = '';
        showPastePreview(blob);
        showToast(cfg().pasteToast || 'Bild klistrad från urklipp');
        return;
      }
    }

    document.addEventListener('paste', onPaste);
    pasteCleanup = () => {
      document.removeEventListener('paste', onPaste);
      clearPasteState();
      pasteCleanup = null;
    };
  }

  async function readImageSource(fields, id) {
    const defaults = nodeDefaults();

    if (pastedImage) {
      const path = pasteFilename(pastedImage.ext);
      const buf = await pastedImage.blob.arrayBuffer();
      files[path] = new Uint8Array(buf);
      return { file: path, _ownFile: true };
    }

    const pick = document.getElementById('bild-file');
    if (pick?.files?.[0]) {
      const f = pick.files[0];
      const ext = f.name.split('.').pop().toLowerCase();
      const path = `${defaults.fileDir || 'images'}/${id}.${ext}`;
      const buf = await f.arrayBuffer();
      files[path] = new Uint8Array(buf);
      return { file: path, _ownFile: true };
    }

    if (fields.url?.trim()) {
      return { src: fields.url.trim() };
    }

    return null;
  }

  function cleanupPaste() {
    if (pasteCleanup) pasteCleanup();
  }

  function appBasePath() {
    const base = window.SC_APP?.basePath || '';
    if (!base) return '';
    return base.endsWith('/') ? base : base + '/';
  }

  function paintEditorUrl() {
    const rel = cfg().paintEditorUrl || 'html/paint-skill-editor.php';
    if (/^https?:\/\//i.test(rel)) return rel;
    const path = rel.replace(/^\//, '');
    return appBasePath() + path;
  }

  function ensurePaintEditorShell() {
    let overlay = document.getElementById('paint-editor-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'paint-editor-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
    }
    let iframe = document.getElementById('paint-editor-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'paint-editor-frame';
      iframe.title = 'Måla / redigera bild';
      overlay.appendChild(iframe);
    }
    return { overlay, iframe };
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  async function imageSourceDataUrl(node) {
    if (pastedImage?.blob) {
      return blobToDataUrl(pastedImage.blob);
    }
    const pick = document.getElementById('bild-file');
    if (pick?.files?.[0]) {
      return blobToDataUrl(pick.files[0]);
    }
    if (node?.src) return node.src;
    if (node?.file && files[node.file]) {
      const blob = new Blob([files[node.file]], { type: mimeFromPath(node.file) });
      return blobToDataUrl(blob);
    }
    return null;
  }

  function dataUrlToBytes(dataUrl) {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    const b64 = dataUrl.split(',')[1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return arr;
  }

  function showBildPreviewFromDataUrl(dataUrl) {
    const prev = document.getElementById('bild-preview');
    const area = document.getElementById('bild-drop-area');
    if (!prev || !area) return;
    prev.innerHTML = `<img src="${dataUrl}" style="max-width:100%;max-height:140px;border-radius:4px;object-fit:contain" alt="">`;
    area.classList.add('has-paste');
    area.style.border = '2px solid #27ae60';
  }

  async function applyPaintResult(nodeOrNull, pngDataUrl) {
    const bytes = dataUrlToBytes(pngDataUrl);
    if (!bytes || bytes.length < 32) {
      throw new Error('Ogiltig bilddata');
    }
    const blob = new Blob([bytes], { type: 'image/png' });

    if (nodeOrNull) {
      const defaults = nodeDefaults();
      const ext = 'png';
      if (!nodeOrNull.file) {
        nodeOrNull.file = `${defaults.fileDir || 'images'}/${nodeOrNull.id}.${ext}`;
        nodeOrNull._ownFile = true;
      }
      files[nodeOrNull.file] = bytes;
      delete nodeOrNull.src;
      if (nodeOrNull._el) {
        const body = nodeOrNull._el.querySelector('.node-body');
        if (body) await renderNodeContent(nodeOrNull, body);
      }
      markDirty();
      return;
    }

    pastedImage = { blob, ext: 'png' };
    const pick = document.getElementById('bild-file');
    if (pick) pick.value = '';
    const urlInput = document.getElementById('bild-url');
    if (urlInput) urlInput.value = '';
    showBildPreviewFromDataUrl(pngDataUrl);
  }

  function closePaintEditor() {
    if (paintEditorCleanup) {
      paintEditorCleanup();
      paintEditorCleanup = null;
    }
    const { overlay, iframe } = ensurePaintEditorShell();
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (iframe) iframe.src = 'about:blank';
    paintEditingNodeId = null;
    paintPendingForAdd = false;
  }

  function postToPaintIframe(iframe, msg) {
    if (iframe?.contentWindow) iframe.contentWindow.postMessage(msg, '*');
  }

  function openPaintEditor({ node, forAdd }) {
    const { overlay, iframe } = ensurePaintEditorShell();
    if (!overlay || !iframe) {
      showToast('Målaren kunde inte öppnas (saknar overlay)', 4000);
      return;
    }

    if (paintEditorCleanup) paintEditorCleanup();
    paintEditingNodeId = node ? node.id : null;
    paintPendingForAdd = !!forAdd;

    const theme = currentTheme();
    const url = `${paintEditorUrl()}?embed=1&theme=${encodeURIComponent(theme)}&_=${Date.now()}`;
    let initDelivered = false;

    async function deliverInit() {
      if (initDelivered || !iframe.contentWindow) return;
      const imageDataUrl = await imageSourceDataUrl(node);
      iframe.contentWindow.postMessage({
        type: 'sc-paint-init',
        imageDataUrl: imageDataUrl || '',
        theme: currentTheme(),
      }, '*');
      initDelivered = true;
    }

    function onMessage(e) {
      const data = e.data;
      if (!data || typeof data !== 'object' || !data.type) return;

      if (data.type === 'sc-paint-ready') {
        if (e.source !== iframe.contentWindow) return;
        void deliverInit();
        return;
      }

      if (e.source !== iframe.contentWindow) return;

      if (data.type === 'sc-paint-save') {
        const png = data.pngDataUrl || '';
        if (paintPendingForAdd) {
          applyPaintResult(null, png)
            .then(() => {
              postToPaintIframe(iframe, { type: 'sc-paint-save-ack' });
              showToast(cfg().paintSaveToast || 'Bild från målaren tillagd');
              setTimeout(closePaintEditor, 80);
            })
            .catch(err => {
              postToPaintIframe(iframe, { type: 'sc-paint-save-failed', reason: err.message });
              showToast('Kunde inte spara bild: ' + err.message, 4000);
            });
        } else {
          const n = nodes.find(x => x.id === paintEditingNodeId);
          if (!n) {
            postToPaintIframe(iframe, { type: 'sc-paint-save-failed', reason: 'Noden hittades inte' });
            closePaintEditor();
            return;
          }
          applyPaintResult(n, png)
            .then(() => {
              postToPaintIframe(iframe, { type: 'sc-paint-save-ack' });
              showToast(cfg().paintSaveToast || 'Bild uppdaterad');
              setTimeout(closePaintEditor, 80);
            })
            .catch(err => {
              postToPaintIframe(iframe, { type: 'sc-paint-save-failed', reason: err.message });
              showToast('Kunde inte spara bild: ' + err.message, 4000);
            });
        }
        return;
      }

      if (data.type === 'sc-paint-cancel') {
        closePaintEditor();
      }
    }

    function onIframeLoad() {
      if (!iframe.src || iframe.src === 'about:blank') return;
      setTimeout(() => deliverInit(), 50);
    }

    function onThemeChange(e) {
      if (!iframe.contentWindow || !iframe.src || iframe.src === 'about:blank') return;
      iframe.contentWindow.postMessage({ type: 'sc-paint-set-theme', theme: e.detail }, '*');
    }

    window.addEventListener('message', onMessage);
    iframe.addEventListener('load', onIframeLoad);
    window.addEventListener('sc-theme-change', onThemeChange);
    paintEditorCleanup = () => {
      window.removeEventListener('message', onMessage);
      iframe.removeEventListener('load', onIframeLoad);
      window.removeEventListener('sc-theme-change', onThemeChange);
    };

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    iframe.src = 'about:blank';
    iframe.src = url;
  }

  function wirePaintFooterButton(forAdd, node) {
    setTimeout(() => {
      const footLeft = document.getElementById('modal-foot-left');
      if (!footLeft) return;
      footLeft.innerHTML = '';

      const paintBtn = document.createElement('button');
      paintBtn.type = 'button';
      paintBtn.className = 'md-fullscreen-btn';
      paintBtn.textContent = cfg().paintLabel || 'Måla / redigera bild';
      paintBtn.title = cfg().paintTitle || 'Öppna målaren';
      paintBtn.onclick = () => {
        openPaintEditor({ node: forAdd ? null : node, forAdd });
      };
      footLeft.appendChild(paintBtn);
    }, 50);
  }

  async function openAdd() {
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const fields = Modal.readFields({
        url: 'bild-url',
        caption: 'bild-caption',
        alt: 'bild-alt',
        width: 'bild-width',
      });
      const defaults = nodeDefaults();
      const width = parseInt(fields.width, 10) || defaults.width || 400;
      const id = genId();
      const source = await readImageSource(fields, id);

      if (!source) {
        showToast(cfg().missingToast || 'Välj en bild, klistra in (Ctrl+V) eller ange en URL');
        return;
      }

      const node = {
        id,
        type: TYPE,
        x: pos.x,
        y: pos.y,
        width,
        caption: fields.caption,
        alt: fields.alt,
        ...source,
      };

      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      if (pasteCleanup) pasteCleanup();
      Modal.close();
      showToast(cfg().addToast || 'Bildnod tillagd');
    });
    Modal.wireFileDrop('bild-drop-area', 'bild-file', 'bild-preview', (inp, prev, area) => {
      clearPasteState();
      Modal.previewImage(inp, prev, area);
    });
    wirePasteHandler();
    wirePaintFooterButton(true, null);
  }

  async function openEdit(node) {
    selectNode(node.id);
    await Modal.openFromType(TYPE, 'edit', {
      caption: node.caption || '',
      alt: node.alt || '',
      width: node.width || nodeDefaults().width || 400,
    }, async () => {
      const fields = Modal.readFields({
        caption: 'bild-caption',
        alt: 'bild-alt',
        width: 'bild-width',
      });
      const defaults = nodeDefaults();
      node.caption = fields.caption;
      node.alt = fields.alt;
      node.width = parseInt(fields.width, 10) || defaults.width || 400;

      if (pastedImage) {
        const ext = pastedImage.ext;
        const path = node.file || pasteFilename(ext);
        const buf = await pastedImage.blob.arrayBuffer();
        files[path] = new Uint8Array(buf);
        node.file = path;
        node._ownFile = true;
        delete node.src;
      } else {
        const pick = document.getElementById('bild-file');
        if (pick?.files?.[0]) {
          const f = pick.files[0];
          const ext = f.name.split('.').pop().toLowerCase();
          const path = node.file || `${defaults.fileDir || 'images'}/${node.id || genId()}.${ext}`;
          const buf = await f.arrayBuffer();
          files[path] = new Uint8Array(buf);
          node.file = path;
          node._ownFile = true;
          delete node.src;
        }
      }

      node._el.style.width = node.width + 'px';
      const body = node._el.querySelector('.node-body');
      await renderNodeContent(node, body);
      markDirty();
      if (pasteCleanup) pasteCleanup();
      Modal.close();
      showToast(cfg().editToast || 'Sparad');
    });
    Modal.wireFileDrop('bild-drop-area', 'bild-file', 'bild-preview', (inp, prev, area) => {
      clearPasteState();
      Modal.previewImage(inp, prev, area);
    });
    wirePasteHandler();
    wirePaintFooterButton(false, node);
  }

  return { openAdd, openEdit, cleanupPaste, closePaintEditor, openPaintEditor };
})();

ModuleRegistry.register('image', BildModule);
document.getElementById('add-img').onclick = () => BildModule.openAdd();
