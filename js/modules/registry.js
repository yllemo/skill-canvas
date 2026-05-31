// ════════════════════════════════════════════════════════════
//  MODULE REGISTRY — kopplar nodtyp till modul-handlers
// ════════════════════════════════════════════════════════════
const ModuleRegistry = (() => {
  const handlers = {};

  function slug(type) {
    return (window.SC_MODULES && window.SC_MODULES[type]) || type;
  }

  function register(type, handler) {
    handlers[type] = handler;
  }

  function get(type) {
    return handlers[type] || null;
  }

  async function openAdd(type) {
    const handler = get(type);
    if (!handler || typeof handler.openAdd !== 'function') {
      showToast(`Modul saknas: ${type}`, 4000);
      return;
    }
    await handler.openAdd();
  }

  async function openEdit(node) {
    const type = node.type || 'markdown';
    const handler = get(type);
    if (!handler || typeof handler.openEdit !== 'function') {
      showToast(`Modul saknas: ${type}`, 4000);
      return;
    }
    await handler.openEdit(node);
  }

  return { slug, register, get, openAdd, openEdit };
})();
