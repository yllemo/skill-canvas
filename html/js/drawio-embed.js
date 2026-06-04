/**
 * Draw.io embed editor — stabil postMessage-integration med diagrams.net
 */
(function (global) {
  'use strict';

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

  const EXPORT_TIMEOUT_MS = 35000;

  let drawioReady = false;
  let pendingXml = null;
  let currentXml = '';
  let exportResolve = null;
  let exportInFlight = null;
  let saving = false;
  let saveAckTimer = null;
  let frame = null;

  function postToParent(msg) {
    if (global.parent && global.parent !== global) {
      global.parent.postMessage(msg, '*');
    }
  }

  function send(obj) {
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(JSON.stringify(obj), '*');
    }
  }

  function isValidDiagramXml(xml) {
    if (!xml || typeof xml !== 'string') return false;
    const t = xml.trim();
    return t.includes('<mxfile') || t.includes('mxGraphModel');
  }

  function setButtonsEnabled(on) {
    const save = document.getElementById('btn-save');
    const cancel = document.getElementById('btn-cancel');
    if (save) save.disabled = !on;
    if (cancel) cancel.disabled = !on;
  }

  function svgToPng(svgString) {
    return new Promise(resolve => {
      try {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
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

  function parseSvgFromExport(msg) {
    if (!msg || !msg.data) return '';
    if (msg.data.startsWith('data:image/svg+xml;base64,')) {
      try {
        return atob(msg.data.split(',')[1]);
      } catch {
        return '';
      }
    }
    if (msg.data.startsWith('<') || msg.data.includes('<svg')) {
      return msg.data;
    }
    return '';
  }

  function pickXmlFromExport(msg, fallback) {
    if (msg && msg.xml && isValidDiagramXml(msg.xml)) return msg.xml;
    if (msg && typeof msg.data === 'string' && isValidDiagramXml(msg.data)) return msg.data;
    return fallback;
  }

  function pickPngFromExport(msg) {
    if (!msg || !msg.data || typeof msg.data !== 'string') return '';
    if (msg.data.startsWith('data:image/png')) return msg.data;
    return '';
  }

  /** En export i taget — undviker krock mellan xml/svg-anrop */
  function requestExport(options) {
    if (exportInFlight) return exportInFlight;

    exportInFlight = new Promise((resolve, reject) => {
      if (!drawioReady) {
        exportInFlight = null;
        reject(new Error('draw.io inte redo'));
        return;
      }

      const timer = setTimeout(() => {
        if (exportResolve) {
          exportResolve = null;
          exportInFlight = null;
          reject(new Error('Export-timeout'));
        }
      }, EXPORT_TIMEOUT_MS);

      exportResolve = msg => {
        clearTimeout(timer);
        exportResolve = null;
        exportInFlight = null;
        resolve(msg);
      };

      send(Object.assign({ action: 'export', spinKey: 'sc-save' }, options));
    });

    return exportInFlight;
  }

  async function collectDiagramForSave() {
    let xml = currentXml || pendingXml || '';
    let pngDataUrl = '';

    // 1) Bäst: PNG + XML i ett anrop (officiellt embed-format)
    try {
      const pngMsg = await requestExport({
        format: 'xmlpng',
        scale: 2,
        border: 8,
        background: '#ffffff',
      });
      xml = pickXmlFromExport(pngMsg, xml);
      pngDataUrl = pickPngFromExport(pngMsg);
      if (isValidDiagramXml(xml) && pngDataUrl) {
        return { xml, pngDataUrl };
      }
    } catch (e) {
      console.warn('xmlpng export:', e);
    }

    // 2) Som standalone: SVG (+ xml i samma svar)
    try {
      const svgMsg = await requestExport({ format: 'svg' });
      xml = pickXmlFromExport(svgMsg, xml);
      const svgStr = parseSvgFromExport(svgMsg);
      if (svgStr) pngDataUrl = await svgToPng(svgStr);
      if (isValidDiagramXml(xml)) {
        return { xml, pngDataUrl };
      }
    } catch (e) {
      console.warn('svg export:', e);
    }

    // 3) Endast XML (snabbast — för kort utan ny bild)
    try {
      const xmlMsg = await requestExport({ format: 'xml' });
      xml = pickXmlFromExport(xmlMsg, xml);
    } catch (e) {
      console.warn('xml export:', e);
    }

    return { xml, pngDataUrl };
  }

  async function saveDiagram() {
    if (saving) return;
    if (!drawioReady) {
      setStatus('draw.io laddar fortfarande…', 'error');
      return;
    }

    saving = true;
    setButtonsEnabled(false);
    setStatus('Exporterar diagram…', 'working');

    try {
      const { xml, pngDataUrl } = await collectDiagramForSave();

      if (!isValidDiagramXml(xml)) {
        setStatus('Inget diagram att spara — rita något först', 'error');
        return;
      }

      currentXml = xml;
      clearModifiedState();
      setStatus('Sparar på canvas…', 'working');
      postToParent({
        type: 'sc-drawio-save',
        xml,
        pngDataUrl: pngDataUrl || '',
        saveId: Date.now(),
      });
      clearSaveAckTimer();
      saveAckTimer = setTimeout(() => {
        if (saving) onSaveFailed('Timeout — försök spara igen');
      }, 12000);
    } catch (err) {
      console.error(err);
      setStatus(err.message || 'Export misslyckades', 'error');
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
    setStatus('Sparat på kortet', 'ok');
    setButtonsEnabled(true);
    saving = false;
  }

  function onSaveFailed(reason) {
    clearSaveAckTimer();
    setStatus(reason || 'Sparning på canvas misslyckades', 'error');
    setButtonsEnabled(true);
    saving = false;
  }

  function setStatus(text) {
    const el = document.getElementById('drawio-status');
    if (el) el.textContent = text;
    const bar = document.getElementById('drawio-hdr-status');
    if (bar) bar.textContent = text;
  }

  function openDrawio(theme) {
    frame = document.getElementById('drawio-frame');
    if (!frame) return;
    drawioReady = false;
    const ui = theme === 'dark' ? 'dark' : 'kennedy';
    frame.src = `https://embed.diagrams.net/?embed=1&proto=json&spin=1&modified=0&saveAndExit=0&noSaveBtn=1&noExitBtn=1&ui=${ui}&lang=sv`;
    setStatus('Laddar draw.io…');
  }

  function clearModifiedState() {
    if (drawioReady) send({ action: 'status', modified: false });
  }

  function shutdownDrawio() {
    clearModifiedState();
    drawioReady = false;
    exportResolve = null;
    exportInFlight = null;
    if (frame) frame.src = 'about:blank';
  }

  function loadDiagramXml(xml) {
    const payload = xml && isValidDiagramXml(xml) ? xml : EMPTY_XML;
    send({ action: 'load', xml: payload, autosave: 1, modified: 0 });
    currentXml = payload;
  }

  function initMessageHandler() {
    global.addEventListener('message', async evt => {
      if (!frame || evt.source !== frame.contentWindow) return;
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }

      switch (msg.event) {
        case 'init':
          drawioReady = true;
          setStatus('Redo');
          if (pendingXml !== null) {
            loadDiagramXml(pendingXml);
            pendingXml = null;
          } else {
            loadDiagramXml(currentXml || EMPTY_XML);
          }
          break;
        case 'autosave':
          if (msg.xml && isValidDiagramXml(msg.xml)) currentXml = msg.xml;
          break;
        case 'save':
          if (msg.xml && isValidDiagramXml(msg.xml)) currentXml = msg.xml;
          if (!saving) await saveDiagram();
          break;
        case 'export':
          if (exportResolve) {
            if (msg.xml && isValidDiagramXml(msg.xml)) currentXml = msg.xml;
            exportResolve(msg);
          }
          break;
        case 'exit':
          postToParent({ type: 'sc-drawio-cancel' });
          break;
      }
    });
  }

  function applyInit(d) {
    const xml = d.xml || EMPTY_XML;
    pendingXml = xml;
    currentXml = xml;
    openDrawio(d.theme || 'light');
  }

  function announceReady() {
    postToParent({ type: 'sc-drawio-ready' });
  }

  function initEmbedControls() {
    document.getElementById('btn-save')?.addEventListener('click', () => saveDiagram());
    document.getElementById('btn-cancel')?.addEventListener('click', () => {
      if (!saving) {
        shutdownDrawio();
        postToParent({ type: 'sc-drawio-cancel' });
      }
    });

    global.addEventListener('message', evt => {
      const d = evt.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'sc-drawio-init') applyInit(d);
      if (d.type === 'sc-drawio-prepare-close') shutdownDrawio();
      if (d.type === 'sc-drawio-save-ack') onSaveAck();
      if (d.type === 'sc-drawio-save-failed') onSaveFailed(d.reason);
    });

    if (global.parent && global.parent !== global) {
      announceReady();
      setTimeout(announceReady, 400);
    } else {
      setStatus('Öppna från Skill Canvas (+ → Draw.io)');
    }
  }

  global.DrawioEmbed = {
    EMPTY_XML,
    init: () => {
      initMessageHandler();
      initEmbedControls();
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
