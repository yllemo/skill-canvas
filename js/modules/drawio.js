// ════════════════════════════════════════════════════════════
//  DRAW.IO MODULE
// ════════════════════════════════════════════════════════════
const DrawioModule = (() => {
  const TYPE = 'drawio';
  const cfg = () => window.SC_DEFAULTS?.modules?.drawio || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.drawio || {};

  const EMPTY_XML = `<mxfile host="app.diagrams.net" agent="Skill Canvas" version="24.0.0">
  <diagram name="Page-1" id="page-1">
    <mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  let editorCleanup = null;
  let editingNodeId = null;
  let closeEditorTimer = null;

  function editorUrl() {
    return cfg().editorUrl || 'html/drawio-skill-editor.php';
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function closeEditor() {
    if (editorCleanup) {
      editorCleanup();
      editorCleanup = null;
    }
    clearTimeout(closeEditorTimer);

    const overlay = document.getElementById('drawio-editor-overlay');
    const iframe = document.getElementById('drawio-editor-frame');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }

    const blankOuter = () => {
      if (iframe) iframe.src = 'about:blank';
      editingNodeId = null;
    };

    const src = iframe?.src || '';
    if (iframe?.contentWindow && src && !src.includes('about:blank')) {
      postToEditor(iframe, { type: 'sc-drawio-prepare-close' });
      closeEditorTimer = setTimeout(blankOuter, 180);
    } else {
      blankOuter();
    }
  }

  function dataUrlToBytes(dataUrl) {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    const b64 = dataUrl.split(',')[1];
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return arr;
  }

  async function readNodeXml(node) {
    if (node.file && files[node.file]) {
      return await readTextFile(node.file);
    }
    return node.content || EMPTY_XML;
  }

  function isValidDiagramXml(xml) {
    if (!xml || typeof xml !== 'string') return false;
    const t = xml.trim();
    return t.includes('<mxfile') || t.includes('mxGraphModel');
  }

  async function applySaveToNode(node, xml, pngDataUrl) {
    if (!isValidDiagramXml(xml)) {
      throw new Error('Ogiltig diagram-XML');
    }

    const defaults = nodeDefaults();
    const dir = defaults.fileDir || 'diagrams';
    const id = node.id;

    if (!node.file) {
      node.file = `${dir}/${id}.drawio`;
      node._ownFile = true;
    }
    if (!node.previewFile) {
      node.previewFile = `${dir}/${id}.png`;
      node._ownPreview = true;
    }

    files[node.file] = new TextEncoder().encode(xml.trim());

    const pngBytes = dataUrlToBytes(pngDataUrl);
    if (pngBytes && pngBytes.length > 32) {
      files[node.previewFile] = pngBytes;
    }

    if (node._previewUrl) {
      URL.revokeObjectURL(node._previewUrl);
      node._previewUrl = null;
    }

    if (node._el) {
      const htitle = node._el.querySelector('.node-handle span:nth-child(2)');
      if (htitle) htitle.textContent = node.title || '';
      const body = node._el.querySelector('.node-body');
      if (body) await renderNodeContent(node, body);
    }
    markDirty();
  }

  function postToEditor(iframe, msg) {
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(msg, '*');
    }
  }

  function openEditor(node) {
    const overlay = document.getElementById('drawio-editor-overlay');
    const iframe = document.getElementById('drawio-editor-frame');
    if (!overlay || !iframe) {
      showToast('Draw.io-editorn kunde inte öppnas', 4000);
      return;
    }

    if (editorCleanup) editorCleanup();
    editingNodeId = node.id;
    selectNode(node.id);

    const theme = currentTheme();
    const url = `${editorUrl()}?embed=1&theme=${encodeURIComponent(theme)}&_=${Date.now()}`;
    let initDelivered = false;

    async function deliverInit() {
      if (initDelivered || !iframe.contentWindow || editingNodeId !== node.id) return;
      try {
        const xml = await readNodeXml(node);
        iframe.contentWindow.postMessage({
          type: 'sc-drawio-init',
          xml,
          theme: currentTheme(),
        }, '*');
        initDelivered = true;
      } catch (err) {
        console.error(err);
        showToast('Kunde inte ladda diagram: ' + (err.message || err), 4000);
      }
    }

    function onMessage(e) {
      const data = e.data;
      if (!data || typeof data !== 'object' || !data.type) return;

      if (data.type === 'sc-drawio-ready') {
        if (e.source !== iframe.contentWindow) return;
        void deliverInit();
        return;
      }

      if (e.source !== iframe.contentWindow) return;

      if (data.type === 'sc-drawio-save') {
        const n = nodes.find(x => x.id === editingNodeId);
        const xml = (data.xml || '').trim();
        if (!n) {
          postToEditor(iframe, { type: 'sc-drawio-save-failed', reason: 'Noden hittades inte' });
          closeEditor();
          return;
        }
        if (!isValidDiagramXml(xml)) {
          postToEditor(iframe, { type: 'sc-drawio-save-failed', reason: 'Ogiltig diagramdata' });
          showToast('Kunde inte spara diagrammet', 4000);
          return;
        }
        applySaveToNode(n, xml, data.pngDataUrl || '')
          .then(() => {
            postToEditor(iframe, { type: 'sc-drawio-save-ack' });
            showToast(cfg().saveToast || 'Diagram sparat');
            setTimeout(() => closeEditor(), 80);
          })
          .catch(err => {
            console.error(err);
            postToEditor(iframe, {
              type: 'sc-drawio-save-failed',
              reason: err.message || 'Sparning misslyckades',
            });
            showToast('Sparning misslyckades: ' + (err.message || err), 4000);
          });
        return;
      }

      if (data.type === 'sc-drawio-cancel') {
        closeEditor();
      }
    }

    function onIframeLoad() {
      if (!iframe.src || iframe.src === 'about:blank') return;
      setTimeout(() => deliverInit(), 50);
    }

    function onThemeChange(e) {
      if (!iframe.contentWindow || !iframe.src || iframe.src === 'about:blank') return;
      iframe.contentWindow.postMessage({
        type: 'sc-drawio-set-theme',
        theme: e.detail,
      }, '*');
    }

    window.addEventListener('message', onMessage);
    iframe.addEventListener('load', onIframeLoad);
    window.addEventListener('sc-theme-change', onThemeChange);
    editorCleanup = () => {
      window.removeEventListener('message', onMessage);
      iframe.removeEventListener('load', onIframeLoad);
      window.removeEventListener('sc-theme-change', onThemeChange);
    };

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    iframe.src = 'about:blank';
    iframe.src = url;
  }

  function createNodeFiles(id) {
    const defaults = nodeDefaults();
    const dir = defaults.fileDir || 'diagrams';
    const xmlPath = `${dir}/${id}.drawio`;
    const pngPath = `${dir}/${id}.png`;
    files[xmlPath] = new TextEncoder().encode(EMPTY_XML);
    return { xmlPath, pngPath };
  }

  async function openAdd() {
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const fields = Modal.readFields({ title: 'dio-title', width: 'dio-width' });
      const defaults = nodeDefaults();
      const width = parseInt(fields.width, 10) || defaults.width || 480;
      const id = genId();
      const { xmlPath, pngPath } = createNodeFiles(id);

      const node = {
        id,
        type: TYPE,
        x: pos.x,
        y: pos.y,
        width,
        title: fields.title,
        file: xmlPath,
        previewFile: pngPath,
        _ownFile: true,
        _ownPreview: true,
      };
      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      Modal.close();
      showToast(cfg().addToast || 'Draw.io-nod tillagd');
      setTimeout(() => openEditor(node), 120);
    });
  }

  async function openEdit(node) {
    openEditor(node);
  }

  return { openAdd, openEdit, closeEditor };
})();

ModuleRegistry.register('drawio', DrawioModule);
document.getElementById('add-drawio').onclick = () => DrawioModule.openAdd();
