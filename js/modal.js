// ════════════════════════════════════════════════════════════
//  MODAL SYSTEM — generisk popup-hantering
// ════════════════════════════════════════════════════════════
const Modal = (() => {
  const modalBg = document.getElementById('modal-bg');
  const modalBody = document.getElementById('modal-body');
  let modalOkCb = null;

  document.getElementById('modal-close').onclick = close;
  document.getElementById('modal-cancel').onclick = close;
  document.getElementById('modal-ok').onclick = () => { if (modalOkCb) modalOkCb(); };
  modalBg.addEventListener('mousedown', e => { if (e.target === modalBg) close(); });

  function close() {
    modalBg.classList.remove('open');
    modalOkCb = null;
    const footLeft = document.getElementById('modal-foot-left');
    if (footLeft) footLeft.innerHTML = '';
    if (typeof SkillTree !== 'undefined') SkillTree.closeDrawer();
    if (typeof BildModule !== 'undefined' && BildModule.cleanupPaste) BildModule.cleanupPaste();
    if (typeof AnnotationModule !== 'undefined' && AnnotationModule.cleanupModal) AnnotationModule.cleanupModal();
  }

  function open(title, bodyHTML, okCb, okLabel = 'Spara') {
    document.getElementById('modal-title').textContent = title;
    modalBody.innerHTML = bodyHTML;
    document.getElementById('modal-ok').textContent = okLabel;
    modalOkCb = okCb;
    modalBg.classList.add('open');
  }

  async function fetchForm(module, mode, values = {}) {
    const opts = mode === 'edit'
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }
      : { method: 'GET' };
    const res = await fetch(`api/modal.php?module=${encodeURIComponent(module)}&mode=${encodeURIComponent(mode)}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Kunde inte ladda ${module}-formuläret`);
    }
    return res.json();
  }

  async function openFromModule(module, mode, values, onSubmit) {
    try {
      const data = await fetchForm(module, mode, values);
      open(data.title, data.html, onSubmit, data.okLabel || 'Spara');
      return data;
    } catch (err) {
      showToast(err.message, 4000);
      throw err;
    }
  }

  function readFields(ids) {
    const out = {};
    for (const [key, id] of Object.entries(ids)) {
      const el = document.getElementById(id);
      out[key] = el ? el.value : '';
    }
    return out;
  }

  async function openFromType(nodeType, mode, values, onSubmit) {
    const slug = (window.SC_MODULES && window.SC_MODULES[nodeType]) || nodeType;
    return openFromModule(slug, mode, values, onSubmit);
  }

  function wireFileDrop(areaId, inputId, previewId, onPick) {
    setTimeout(() => {
      const area = document.getElementById(areaId);
      const inp = document.getElementById(inputId);
      const prev = previewId ? document.getElementById(previewId) : null;
      if (!area || !inp) return;
      area.onclick = () => inp.click();
      area.ondragover = e => { e.preventDefault(); area.classList.add('hover'); };
      area.ondragleave = () => area.classList.remove('hover');
      area.ondrop = e => {
        e.preventDefault();
        area.classList.remove('hover');
        inp.files = e.dataTransfer.files;
        if (onPick) onPick(inp, prev, area);
      };
      inp.onchange = () => { if (onPick) onPick(inp, prev, area); };
    }, 50);
  }

  function previewImage(inp, prev, area) {
    if (!inp.files || !inp.files[0]) return;
    if (!prev) return;
    const url = URL.createObjectURL(inp.files[0]);
    prev.innerHTML = `<img src="${url}" style="max-width:100%;max-height:140px;border-radius:4px;object-fit:contain">`;
    area.style.border = '2px solid var(--gs-blue)';
  }

  return { open, close, fetchForm, openFromModule, openFromType, readFields, wireFileDrop, previewImage };
})();
