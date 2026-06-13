// ════════════════════════════════════════════════════════════
//  MODULE REGISTRY — kopplar nodtyp till modul-handlers
// ════════════════════════════════════════════════════════════
const ModuleRegistry = (() => {
  const handlers = {};

  const GLOBAL_BY_TYPE = {
    markdown: 'MarkdownModule',
    image: 'BildModule',
    mermaid: 'MermaidModule',
    drawio: 'DrawioModule',
    bpmn: 'BpmnModule',
    label: 'LabelModule',
    note: 'NotesModule',
    annotation: 'AnnotationModule',
    html: 'HtmlModule',
  };

  function normalizeType(type) {
    const s = String(type || 'markdown').trim().toLowerCase();
    if (s === 'draw.io' || s === 'draw_io') return 'drawio';
    return s;
  }

  function slug(type) {
    const t = normalizeType(type);
    return (window.SC_MODULES && window.SC_MODULES[t]) || t;
  }

  function register(type, handler) {
    handlers[normalizeType(type)] = handler;
  }

  function get(type) {
    return handlers[normalizeType(type)] || null;
  }

  function resolve(type) {
    const t = normalizeType(type);
    const registered = get(t);
    if (registered) return registered;
    const globalName = GLOBAL_BY_TYPE[t];
    if (globalName && typeof window[globalName] !== 'undefined') {
      return window[globalName];
    }
    return null;
  }

  async function openAdd(type) {
    const t = normalizeType(type);
    const handler = resolve(t);
    if (!handler || typeof handler.openAdd !== 'function') {
      showToast(`Modul saknas: ${t}`, 4000);
      return;
    }
    if (!get(t)) register(t, handler);
    await handler.openAdd();
  }

  async function openEdit(node) {
    if (!node) return;
    const t = normalizeType(node.type);
    node.type = t;
    const handler = resolve(t);
    if (!handler || typeof handler.openEdit !== 'function') {
      showToast(`Modul saknas: ${t}`, 4000);
      return;
    }
    if (!get(t)) register(t, handler);
    await handler.openEdit(node);
  }

  function ensureRegistered() {
    Object.entries(GLOBAL_BY_TYPE).forEach(([type, globalName]) => {
      if (!get(type) && typeof window[globalName] !== 'undefined') {
        register(type, window[globalName]);
      }
    });
  }

  return { slug, register, get, resolve, openAdd, openEdit, normalizeType, ensureRegistered };
})();
