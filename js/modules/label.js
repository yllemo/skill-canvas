// ════════════════════════════════════════════════════════════
//  LABEL MODULE
// ════════════════════════════════════════════════════════════
const LabelModule = (() => {
  const TYPE = 'label';
  const cfg = () => window.SC_DEFAULTS?.modules?.label || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.label || {};

  // [text](https://…) — valfritt mellanslag, <> runt url
  const MD_LINK_RE = /\[([^\[\]]+)\]\(\s*(?:<([^>]+)>|(https?:\/\/[^\s)]+))\s*\)/gi;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isSafeUrl(url) {
    try {
      const parsed = new URL(String(url).trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function linkHtml(label, url) {
    const href = String(url).trim();
    if (!isSafeUrl(href)) return escapeHtml(String(label).trim());
    return `<a class="label-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(String(label).trim())}</a>`;
  }

  function autolinkPlain(text) {
    if (!text) return '';
    const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/gi;
    let out = '';
    let last = 0;
    let match;
    URL_RE.lastIndex = 0;
    while ((match = URL_RE.exec(text)) !== null) {
      out += escapeHtml(text.slice(last, match.index));
      let url = match[0];
      let trailing = '';
      while (/[.,;:!?)]+$/.test(url) && url.length > 'https://x'.length) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
      out += isSafeUrl(url) ? linkHtml(url, url) : escapeHtml(match[0]);
      out += escapeHtml(trailing);
      last = match.index + match[0].length;
    }
    out += escapeHtml(text.slice(last));
    return out;
  }

  function formatLabelContent(raw) {
    const text = String(raw ?? '');
    if (!text) return '';

    let html = '';
    let lastIndex = 0;
    let match;
    MD_LINK_RE.lastIndex = 0;
    while ((match = MD_LINK_RE.exec(text)) !== null) {
      html += autolinkPlain(text.slice(lastIndex, match.index));
      const label = match[1];
      const url = match[2] || match[3] || '';
      html += linkHtml(label, url);
      lastIndex = MD_LINK_RE.lastIndex;
    }
    html += autolinkPlain(text.slice(lastIndex));
    return html;
  }

  /** Rå text sparas alltid; canvas visar bara länknamn för [text](url). */
  function canvasSource(node) {
    return node.content ?? node.title ?? '';
  }

  function renderContent(node, body) {
    body.innerHTML = '';
    body.style.padding = '';
    const t = document.createElement('div');
    t.className = 'label-text';
    t.style.fontSize = (node.fontSize || nodeDefaults().fontSize || 24) + 'px';
    if (node.color) t.style.color = node.color;
    t.innerHTML = formatLabelContent(canvasSource(node));
    body.appendChild(t);
  }

  async function openAdd() {
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const fields = Modal.readFields({
        content: 'lbl-content',
        fontSize: 'lbl-fontsize',
        color: 'lbl-color',
        width: 'lbl-width',
      });
      if (!fields.content.trim()) {
        showToast(cfg().missingToast || 'Skriv in en text');
        return;
      }
      const defaults = nodeDefaults();
      const fontSize = parseInt(fields.fontSize, 10) || defaults.fontSize || 28;
      const color = fields.color || defaults.color || '#0077bc';
      const width = fields.width ? parseInt(fields.width, 10) : undefined;
      const id = genId();
      const node = {
        id,
        type: TYPE,
        x: pos.x,
        y: pos.y,
        content: fields.content,
        fontSize,
        color,
        ...(width ? { width } : {}),
      };
      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      Modal.close();
      showToast(cfg().addToast || 'Label tillagd');
    });
  }

  async function openEdit(node) {
    selectNode(node.id);
    const defaults = nodeDefaults();
    await Modal.openFromType(TYPE, 'edit', {
      content: node.content || node.title || '',
      fontSize: node.fontSize || defaults.fontSize || 28,
      color: node.color || defaults.color || '#0077bc',
      width: node.width ?? '',
    }, async () => {
      const fields = Modal.readFields({
        content: 'lbl-content',
        fontSize: 'lbl-fontsize',
        color: 'lbl-color',
        width: 'lbl-width',
      });
      node.content = fields.content;
      node.fontSize = parseInt(fields.fontSize, 10) || defaults.fontSize || 28;
      node.color = fields.color || defaults.color || '#0077bc';
      if (fields.width) {
        node.width = parseInt(fields.width, 10);
        node._el.style.width = node.width + 'px';
      } else {
        delete node.width;
        node._el.style.width = '';
      }
      const body = node._el.querySelector('.node-body');
      renderContent(node, body);
      markDirty();
      Modal.close();
      showToast(cfg().editToast || 'Sparad');
    });
  }

  return { openAdd, openEdit, renderContent, formatLabelContent };
})();

ModuleRegistry.register('label', LabelModule);
document.getElementById('add-lbl').onclick = () => LabelModule.openAdd();
