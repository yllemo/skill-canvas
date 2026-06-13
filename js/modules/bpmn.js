// ════════════════════════════════════════════════════════════
//  BPMN MODULE
// ════════════════════════════════════════════════════════════
const BpmnModule = (() => {
  const TYPE = 'bpmn';
  const cfg = () => window.SC_DEFAULTS?.modules?.bpmn || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.bpmn || {};

  const EMPTY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://skill-canvas.local/bpmn">
  <process id="Process_1" isExecutable="true">
    <startEvent id="StartEvent_1" name="Start"><outgoing>Flow_1</outgoing></startEvent>
    <task id="Task_1" name="Uppgift"><incoming>Flow_1</incoming><outgoing>Flow_2</outgoing></task>
    <endEvent id="EndEvent_1" name="Slut"><incoming>Flow_2</incoming></endEvent>
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
    <sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <omgdc:Bounds x="152" y="192" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <omgdc:Bounds x="250" y="170" width="120" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <omgdc:Bounds x="432" y="192" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <omgdi:waypoint x="188" y="210"/><omgdi:waypoint x="250" y="210"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <omgdi:waypoint x="370" y="210"/><omgdi:waypoint x="432" y="210"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  let editorCleanup = null;
  let editingNodeId = null;
  let closeEditorTimer = null;

  function editorUrl() {
    return cfg().editorUrl || 'html/bpmn-skill-editor.php';
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

    const overlay = document.getElementById('bpmn-editor-overlay');
    const iframe = document.getElementById('bpmn-editor-frame');
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
      postToEditor(iframe, { type: 'sc-bpmn-prepare-close' });
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

  function isValidBpmnXml(xml) {
    if (!xml || typeof xml !== 'string') return false;
    const t = xml.trim();
    return t.includes('<definitions') || t.includes('bpmn:definitions');
  }

  async function applySaveToNode(node, xml, pngDataUrl) {
    if (!isValidBpmnXml(xml)) {
      throw new Error('Ogiltig BPMN-XML');
    }

    const defaults = nodeDefaults();
    const dir = defaults.fileDir || 'diagrams';
    const id = node.id;

    if (!node.file) {
      node.file = `${dir}/${id}.bpmn`;
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
    const overlay = document.getElementById('bpmn-editor-overlay');
    const iframe = document.getElementById('bpmn-editor-frame');
    if (!overlay || !iframe) {
      showToast('BPMN-editorn kunde inte öppnas', 4000);
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
          type: 'sc-bpmn-init',
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

      if (data.type === 'sc-bpmn-ready') {
        if (e.source !== iframe.contentWindow) return;
        void deliverInit();
        return;
      }

      if (e.source !== iframe.contentWindow) return;

      if (data.type === 'sc-bpmn-save') {
        const n = nodes.find(x => x.id === editingNodeId);
        const xml = (data.xml || '').trim();
        if (!n) {
          postToEditor(iframe, { type: 'sc-bpmn-save-failed', reason: 'Noden hittades inte' });
          closeEditor();
          return;
        }
        if (!isValidBpmnXml(xml)) {
          postToEditor(iframe, { type: 'sc-bpmn-save-failed', reason: 'Ogiltig BPMN-data' });
          showToast('Kunde inte spara diagrammet', 4000);
          return;
        }
        applySaveToNode(n, xml, data.pngDataUrl || '')
          .then(() => {
            postToEditor(iframe, { type: 'sc-bpmn-save-ack' });
            showToast(cfg().saveToast || 'BPMN-diagram sparat');
            setTimeout(() => closeEditor(), 80);
          })
          .catch(err => {
            console.error(err);
            postToEditor(iframe, {
              type: 'sc-bpmn-save-failed',
              reason: err.message || 'Sparning misslyckades',
            });
            showToast('Sparning misslyckades: ' + (err.message || err), 4000);
          });
        return;
      }

      if (data.type === 'sc-bpmn-cancel') {
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
        type: 'sc-bpmn-set-theme',
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
    const xmlPath = `${dir}/${id}.bpmn`;
    const pngPath = `${dir}/${id}.png`;
    files[xmlPath] = new TextEncoder().encode(EMPTY_XML);
    return { xmlPath, pngPath };
  }

  async function openAdd() {
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const fields = Modal.readFields({ title: 'bpmn-title', width: 'bpmn-width' });
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
      showToast(cfg().addToast || 'BPMN-nod tillagd');
      setTimeout(() => openEditor(node), 120);
    });
  }

  async function openEdit(node) {
    openEditor(node);
  }

  return { openAdd, openEdit, closeEditor };
})();

ModuleRegistry.register('bpmn', BpmnModule);
window.addEventListener('sc-add-menu-select', e => {
  if (e.detail?.id === 'bpmn') BpmnModule.openAdd();
});
