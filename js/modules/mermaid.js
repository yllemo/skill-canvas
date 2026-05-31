// ════════════════════════════════════════════════════════════
//  MERMAID MODULE
// ════════════════════════════════════════════════════════════
const MermaidModule = (() => {
  const TYPE = 'mermaid';
  const cfg = () => window.SC_DEFAULTS?.modules?.mermaid || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.mermaid || {};

  function wireLiveButton() {
    setTimeout(() => {
      const footLeft = document.getElementById('modal-foot-left');
      if (!footLeft) return;

      footLeft.innerHTML = '';
      const link = document.createElement('a');
      link.href = cfg().liveEditorUrl || 'https://mermaid.live/';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'md-fullscreen-btn';
      link.textContent = cfg().liveEditorLabel || 'Mermaid Live';
      footLeft.appendChild(link);
    }, 50);
  }

  async function openAdd() {
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const fields = Modal.readFields({ title: 'mm-title', width: 'mm-width', content: 'mm-content' });
      const defaults = nodeDefaults();
      const width = parseInt(fields.width, 10) || defaults.width || 500;
      const id = genId();
      const filename = `${defaults.fileDir || 'diagrams'}/${id}.${defaults.fileExt || 'mmd'}`;

      files[filename] = new TextEncoder().encode(fields.content);
      const node = {
        id,
        type: TYPE,
        x: pos.x,
        y: pos.y,
        width,
        title: fields.title,
        file: filename,
        _ownFile: true,
      };
      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      Modal.close();
      showToast(cfg().addToast || 'Mermaid-nod tillagd');
    });
    wireLiveButton();
  }

  async function openEdit(node) {
    selectNode(node.id);
    let content = '';
    if (node.file) content = await readTextFile(node.file);
    else if (node.content) content = node.content;

    await Modal.openFromType(TYPE, 'edit', {
      title: node.title || '',
      width: node.width || nodeDefaults().width || 500,
      content,
    }, async () => {
      const fields = Modal.readFields({ title: 'mm-title', width: 'mm-width', content: 'mm-content' });
      const defaults = nodeDefaults();
      node.title = fields.title;
      node.width = parseInt(fields.width, 10) || defaults.width || 500;
      if (node.file) {
        files[node.file] = new TextEncoder().encode(fields.content);
      } else {
        node.content = fields.content;
      }
      node._el.style.width = node.width + 'px';
      const htitle = node._el.querySelector('.node-handle span:nth-child(2)');
      if (htitle) htitle.textContent = node.title || '';
      const body = node._el.querySelector('.node-body');
      await renderNodeContent(node, body);
      markDirty();
      Modal.close();
      showToast(cfg().editToast || 'Sparad');
    });
    wireLiveButton();
  }

  return { openAdd, openEdit };
})();

ModuleRegistry.register('mermaid', MermaidModule);
document.getElementById('add-mm').onclick = () => MermaidModule.openAdd();
