/**
 * BPMN embed editor — postMessage-integration med Skill Canvas
 */
(function (global) {
  'use strict';

  const BPMN_VERSION = '18.18.0';

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

  let modeler = null;
  let currentXml = '';
  let pendingXml = null;
  let saving = false;
  let saveAckTimer = null;
  let ready = false;

  function postToParent(msg) {
    if (global.parent && global.parent !== global) {
      global.parent.postMessage(msg, '*');
    }
  }

  function isValidBpmnXml(xml) {
    if (!xml || typeof xml !== 'string') return false;
    const t = xml.trim();
    return t.includes('<definitions') || t.includes('bpmn:definitions');
  }

  function setStatus(text) {
    const el = document.getElementById('bpmn-status');
    if (el) el.textContent = text;
    const bar = document.getElementById('hdr-status');
    if (bar) bar.textContent = text;
  }

  function setButtonsEnabled(on) {
    const save = document.getElementById('btn-save');
    const cancel = document.getElementById('btn-cancel');
    if (save) save.disabled = !on;
    if (cancel) cancel.disabled = !on;
  }

  function updateUndoRedo() {
    if (!modeler) return;
    try {
      const cs = modeler.get('commandStack');
      const undo = document.getElementById('btn-undo');
      const redo = document.getElementById('btn-redo');
      if (undo) undo.disabled = !cs.canUndo();
      if (redo) redo.disabled = !cs.canRedo();
    } catch (_) { /* ignore */ }
  }

  function svgToPng(svgStr) {
    return new Promise(resolve => {
      try {
        const bg = svgStr.replace(/<svg([^>]*)>/, '<svg$1><rect width="100%" height="100%" fill="white"/>');
        const blob = new Blob([bg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const w = Math.max(img.naturalWidth || 0, 400);
          const h = Math.max(img.naturalHeight || 0, 300);
          const canvas = document.createElement('canvas');
          canvas.width = w * 2;
          canvas.height = h * 2;
          const ctx = canvas.getContext('2d');
          ctx.scale(2, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve('');
        };
        img.src = url;
      } catch {
        resolve('');
      }
    });
  }

  async function getXml() {
    if (!modeler) return null;
    try {
      const { xml } = await modeler.saveXML({ format: true });
      return xml;
    } catch {
      return null;
    }
  }

  async function getSvg() {
    if (!modeler) return null;
    try {
      const { svg } = await modeler.saveSVG();
      return svg;
    } catch {
      return null;
    }
  }

  async function loadXml(xml) {
    if (!modeler) return;
    const payload = isValidBpmnXml(xml) ? xml : EMPTY_XML;
    try {
      await modeler.importXML(payload);
      modeler.get('canvas').zoom('fit-viewport', 'auto');
      currentXml = payload;
      updateUndoRedo();
      setStatus('Redo');
    } catch (err) {
      console.error(err);
      setStatus('Import misslyckades: ' + (err.message || err));
    }
  }

  function initModeler() {
    if (typeof BpmnJS === 'undefined') {
      setStatus('bpmn-js kunde inte laddas');
      return;
    }

    modeler = new BpmnJS({
      container: '#bpmn-canvas',
      keyboard: { bindTo: global },
    });

    modeler.on('commandStack.changed', updateUndoRedo);

    ready = true;
    const xml = pendingXml !== null ? pendingXml : (currentXml || EMPTY_XML);
    pendingXml = null;
    void loadXml(xml);
  }

  async function saveDiagram() {
    if (saving) return;
    if (!ready || !modeler) {
      setStatus('Editorn laddar fortfarande…');
      return;
    }

    saving = true;
    setButtonsEnabled(false);
    setStatus('Exporterar diagram…');

    try {
      const xml = await getXml();
      if (!isValidBpmnXml(xml)) {
        setStatus('Inget diagram att spara');
        setButtonsEnabled(true);
        saving = false;
        return;
      }

      currentXml = xml.trim();
      const svg = await getSvg();
      const pngDataUrl = svg ? await svgToPng(svg) : '';

      setStatus('Sparar på canvas…');
      postToParent({
        type: 'sc-bpmn-save',
        xml: currentXml,
        pngDataUrl: pngDataUrl || '',
        saveId: Date.now(),
      });

      clearSaveAckTimer();
      saveAckTimer = setTimeout(() => {
        if (saving) onSaveFailed('Timeout — försök spara igen');
      }, 12000);
    } catch (err) {
      console.error(err);
      setStatus(err.message || 'Export misslyckades');
      setButtonsEnabled(true);
      saving = false;
    }
  }

  function clearSaveAckTimer() {
    if (saveAckTimer) {
      clearTimeout(saveAckTimer);
      saveAckTimer = null;
    }
  }

  function onSaveAck() {
    clearSaveAckTimer();
    setStatus('Sparat på kortet');
    setButtonsEnabled(true);
    saving = false;
  }

  function onSaveFailed(reason) {
    clearSaveAckTimer();
    setStatus(reason || 'Sparning på canvas misslyckades');
    setButtonsEnabled(true);
    saving = false;
  }

  function destroyModeler() {
    if (modeler) {
      try { modeler.destroy(); } catch (_) { /* ignore */ }
      modeler = null;
    }
    ready = false;
  }

  function applyInit(d) {
    const xml = d.xml || EMPTY_XML;
    pendingXml = xml;
    currentXml = xml;
    if (d.theme) {
      document.documentElement.setAttribute('data-theme', d.theme === 'dark' ? 'dark' : 'light');
    }
    if (!modeler) initModeler();
    else void loadXml(xml);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }

  function announceReady() {
    postToParent({ type: 'sc-bpmn-ready' });
  }

  function wireToolbar() {
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      try { modeler?.get('zoomScroll').stepZoom(1); } catch (_) { /* ignore */ }
    });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      try { modeler?.get('zoomScroll').stepZoom(-1); } catch (_) { /* ignore */ }
    });
    document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
      try { modeler?.get('canvas').zoom('fit-viewport', 'auto'); } catch (_) { /* ignore */ }
    });
    document.getElementById('btn-undo')?.addEventListener('click', () => {
      try { modeler?.get('commandStack').undo(); } catch (_) { /* ignore */ }
    });
    document.getElementById('btn-redo')?.addEventListener('click', () => {
      try { modeler?.get('commandStack').redo(); } catch (_) { /* ignore */ }
    });
    document.getElementById('btn-delete')?.addEventListener('click', () => {
      if (!modeler) return;
      const sel = modeler.get('selection').get();
      if (sel.length) modeler.get('modeling').removeElements(sel.slice());
    });
  }

  function initEmbedControls() {
    document.getElementById('btn-save')?.addEventListener('click', () => saveDiagram());
    document.getElementById('btn-cancel')?.addEventListener('click', () => {
      if (!saving) {
        destroyModeler();
        postToParent({ type: 'sc-bpmn-cancel' });
      }
    });

    global.addEventListener('message', evt => {
      const d = evt.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'sc-bpmn-init') applyInit(d);
      if (d.type === 'sc-bpmn-prepare-close') destroyModeler();
      if (d.type === 'sc-bpmn-save-ack') onSaveAck();
      if (d.type === 'sc-bpmn-save-failed') onSaveFailed(d.reason);
      if (d.type === 'sc-bpmn-set-theme') applyTheme(d.theme);
    });

    wireToolbar();

    if (global.parent && global.parent !== global) {
      announceReady();
      setTimeout(announceReady, 400);
    } else {
      setStatus('Öppna från Skill Canvas (⋯ → BPMN)');
      initModeler();
    }
  }

  global.BpmnEmbed = {
    EMPTY_XML,
    BPMN_VERSION,
    init: () => {
      initEmbedControls();
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
