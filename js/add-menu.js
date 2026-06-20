// ════════════════════════════════════════════════════════════
//  ADD PANEL — ⋯ fler val (utbyggbar)
// ════════════════════════════════════════════════════════════
const SCAddMenu = (() => {
  const cfg = () => window.SC_ADD_MENU || { items: [], comingSoonToast: 'Kommer snart' };

  /** add-menu id => nodtyp / modul-slug */
  const MODULE_ALIASES = {
    archimate: 'archicode',
  };

  function resolveModuleId(id) {
    return MODULE_ALIASES[id] || id;
  }

  function close() {
    document.getElementById('add-more-wrap')?.classList.remove('open');
  }

  function open() {
    document.getElementById('add-more-wrap')?.classList.add('open');
  }

  function toggle() {
    const wrap = document.getElementById('add-more-wrap');
    if (!wrap) return;
    wrap.classList.toggle('open');
  }

  async function onSelect(id, enabled) {
    if (!enabled) {
      const msg = cfg().comingSoonToast || 'Kommer snart';
      if (typeof showToast === 'function') showToast(msg);
      close();
      return;
    }
    close();
    const moduleId = resolveModuleId(id);
    if (typeof ModuleRegistry !== 'undefined' && typeof ModuleRegistry.openAdd === 'function') {
      try {
        await ModuleRegistry.openAdd(moduleId);
      } catch (err) {
        console.error('[add-menu]', moduleId, err);
        if (typeof showToast === 'function') {
          showToast(err?.message || `Kunde inte öppna ${moduleId}`, 4000);
        }
      }
      return;
    }
    window.dispatchEvent(new CustomEvent('sc-add-menu-select', { detail: { id: moduleId } }));
  }

  function wire() {
    const wrap = document.getElementById('add-more-wrap');
    const btn = document.getElementById('add-more-btn');
    const menu = document.getElementById('add-more-menu');
    if (!wrap || !btn || !menu) return;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggle();
      btn.setAttribute('aria-expanded', wrap.classList.contains('open') ? 'true' : 'false');
    });

    menu.addEventListener('click', e => {
      const item = e.target.closest('[data-add-menu]');
      if (!item) return;
      e.stopPropagation();
      const id = item.getAttribute('data-add-menu');
      const enabled = item.getAttribute('data-enabled') === '1';
      if (id) onSelect(id, enabled);
    });

    document.addEventListener('mousedown', e => {
      if (!e.target.closest('#add-more-wrap')) {
        close();
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('touchstart', e => {
      if (!e.target.closest('#add-more-wrap')) close();
    }, { passive: true });
  }

  function init() {
    wire();
  }

  return { open, close, toggle, init };
})();

window.SCAddMenu = SCAddMenu;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SCAddMenu.init());
} else {
  SCAddMenu.init();
}
