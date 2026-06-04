/**
 * Paint editor — embed-läge för Skill Canvas
 */
(function (global) {
  'use strict';

  let saving = false;

  function postToParent(msg) {
    if (global.parent && global.parent !== global) {
      global.parent.postMessage(msg, '*');
    }
  }

  function setBusy(busy, text) {
    const hdr = document.getElementById('paint-hdr-status');
    if (hdr) {
      hdr.dataset.busy = busy ? '1' : '';
      if (text) hdr.textContent = text;
    }
    const save = document.getElementById('btn-paint-save');
    const cancel = document.getElementById('btn-paint-cancel');
    if (save) save.disabled = busy;
    if (cancel) cancel.disabled = busy;
  }

  async function applyInit(d) {
    if (!PaintEditor.init({ embed: true })) {
      PaintEditor.setStatus('Kunde inte starta canvas');
      return;
    }
    if (d.theme) PaintEditor.applyTheme(d.theme);
    PaintEditor.setStatus('Laddar bild…');
    try {
      await PaintEditor.loadFromDataUrl(d.imageDataUrl || '');
      PaintEditor.setStatus('Redo');
    } catch (err) {
      console.error(err);
      PaintEditor.init({ embed: true });
      PaintEditor.setStatus('Ny tom canvas');
    }
  }

  let saveAckTimer = null;

  function saveToParent() {
    if (saving || !global.PaintEditor) return;
    saving = true;
    setBusy(true, 'Sparar…');
    try {
      const pngDataUrl = PaintEditor.getPngDataUrl();
      postToParent({ type: 'sc-paint-save', pngDataUrl });
      clearTimeout(saveAckTimer);
      saveAckTimer = setTimeout(() => {
        if (saving) onSaveFailed('Timeout — försök spara igen');
      }, 12000);
    } catch (err) {
      console.error(err);
      PaintEditor.setStatus('Kunde inte exportera bild');
      saving = false;
      setBusy(false);
    }
  }

  function onSaveAck() {
    clearTimeout(saveAckTimer);
    PaintEditor.setStatus('Sparat på kortet');
    saving = false;
    setBusy(false);
  }

  function onSaveFailed(reason) {
    clearTimeout(saveAckTimer);
    PaintEditor.setStatus(reason || 'Sparning misslyckades');
    saving = false;
    setBusy(false);
  }

  function init() {
    if (!global.PaintEditor) {
      const foot = document.getElementById('paint-foot');
      if (foot) foot.textContent = 'paint-editor.js kunde inte laddas (404?)';
      return;
    }
    if (!PaintEditor.init({ embed: true })) {
      PaintEditor.setStatus('Kunde inte starta canvas');
      return;
    }

    document.getElementById('btn-paint-save')?.addEventListener('click', saveToParent);
    document.getElementById('btn-paint-cancel')?.addEventListener('click', () => {
      if (!saving) postToParent({ type: 'sc-paint-cancel' });
    });

    global.addEventListener('message', evt => {
      const d = evt.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'sc-paint-init') applyInit(d);
      if (d.type === 'sc-paint-set-theme' && d.theme) PaintEditor.applyTheme(d.theme);
      if (d.type === 'sc-paint-save-ack') onSaveAck();
      if (d.type === 'sc-paint-save-failed') onSaveFailed(d.reason);
    });

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToParent();
      }
      if (e.key === 'Escape' && !saving) postToParent({ type: 'sc-paint-cancel' });
    });

    if (global.parent && global.parent !== global) {
      postToParent({ type: 'sc-paint-ready' });
      setTimeout(() => postToParent({ type: 'sc-paint-ready' }), 400);
    } else {
      PaintEditor.setStatus('Öppna från Skill Canvas (Bild-modulen)');
    }
  }

  global.PaintEmbed = { init };
})(typeof window !== 'undefined' ? window : globalThis);
