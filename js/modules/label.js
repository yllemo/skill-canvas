// ════════════════════════════════════════════════════════════
//  LABEL MODULE
// ════════════════════════════════════════════════════════════
const LabelModule = (() => {
  const TYPE = 'label';
  const cfg = () => window.SC_DEFAULTS?.modules?.label || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.label || {};

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
      await renderNodeContent(node, body);
      markDirty();
      Modal.close();
      showToast(cfg().editToast || 'Sparad');
    });
  }

  return { openAdd, openEdit };
})();

ModuleRegistry.register('label', LabelModule);
document.getElementById('add-lbl').onclick = () => LabelModule.openAdd();
