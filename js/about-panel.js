// ════════════════════════════════════════════════════════════
//  ABOUT PANEL — hjälp/info-popup längst ner till vänster
// ════════════════════════════════════════════════════════════
(() => {
  const wrap = document.getElementById('about-wrap');
  const btn = document.getElementById('btn-about');
  if (!wrap || !btn) return;

  function setOpen(open) {
    wrap.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(!wrap.classList.contains('open'));
  });

  document.addEventListener('mousedown', e => {
    if (!e.target.closest('#about-wrap')) setOpen(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && wrap.classList.contains('open')) {
      setOpen(false);
      btn.focus();
    }
  });
})();
