// ════════════════════════════════════════════════════════════
//  BILD MODULE — motsvarar modules/bild.php
// ════════════════════════════════════════════════════════════
const BildModule = (() => {
  const TYPE = 'image';
  const cfg = () => window.SC_DEFAULTS?.modules?.bild || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.image || {};

  let pastedImage = null;
  let pasteCleanup = null;

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
  }

  return { openAdd, openEdit, cleanupPaste };
})();

ModuleRegistry.register('image', BildModule);
document.getElementById('add-img').onclick = () => BildModule.openAdd();
