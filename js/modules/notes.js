// ════════════════════════════════════════════════════════════
//  NOTES MODULE — post-it med inline-redigering
// ════════════════════════════════════════════════════════════
const NotesModule = (() => {
  const TYPE = 'note';
  const cfg = () => window.SC_DEFAULTS?.modules?.notes || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.note || {};

  function colors() {
    return cfg().colors || [
      { label: 'Gul', value: '#fff9a8' },
      { label: 'Rosa', value: '#ffd4e5' },
      { label: 'Blå', value: '#cce5ff' },
      { label: 'Grön', value: '#d4f4dd' },
      { label: 'Orange', value: '#ffe0b2' },
      { label: 'Lila', value: '#e8d4ff' },
    ];
  }

  function applyColor(node, color) {
    node.color = color;
    if (node._el) {
      node._el.style.background = color;
      const bar = node._el.querySelector('.node-bar');
      if (bar) bar.style.background = color;
    }
    markDirty();
  }

  function buildHandleHTML(node) {
    const swatches = colors().map(c => {
      const active = (node.color || nodeDefaults().color) === c.value ? ' active' : '';
      return `<button type="button" class="note-color-btn${active}" data-color="${c.value}" title="${c.label}" style="--swatch:${c.value}"></button>`;
    }).join('');

    return `<span class="node-type-label">${typeLabel(TYPE)}</span>
      <span class="note-handle-colors">${swatches}</span>
      <span class="node-handle-actions">
        <button title="Ta bort" data-action="del">${iconDel()}</button>
      </span>`;
  }

  function renderContent(node, body) {
    const color = node.color || nodeDefaults().color || '#fff9a8';
    const fontSize = node.fontSize || nodeDefaults().fontSize || 14;
    if (node._el) {
      node._el.style.background = color;
      const bar = node._el.querySelector('.node-bar');
      if (bar) bar.style.background = color;
    }
    body.style.padding = '14px 16px 12px';
    body.innerHTML = '';
    const text = document.createElement('div');
    text.className = 'note-text';
    text.contentEditable = 'true';
    text.spellcheck = true;
    text.dataset.placeholder = cfg().placeholder || 'Skriv här…';
    text.style.fontSize = fontSize + 'px';
    text.textContent = node.content || '';
    body.appendChild(text);
  }

  function focusEditor(node) {
    const text = node._el?.querySelector('.note-text');
    if (!text) return;
    selectNode(node.id);
    text.focus();
    const range = document.createRange();
    range.selectNodeContents(text);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function beginDrag(node, el, e) {
    if (e.target.closest('[data-action]') || e.target.closest('.note-color-btn')) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    selectNode(node.id);
    dragNode = node;
    dragNode._mx = e.clientX;
    dragNode._my = e.clientY;
    dragNode._ox = node.x;
    dragNode._oy = node.y;
    el.classList.add('dragging');
  }

  function attachEvents(node, el, handle, rz) {
    const text = el.querySelector('.note-text');
    if (!text) return;

    handle.addEventListener('mousedown', e => beginDrag(node, el, e));

    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      ctxTargetId = node.id;
      showCtx(e.clientX, e.clientY);
    });

    rz.addEventListener('mousedown', e => {
      e.stopPropagation();
      e.preventDefault();
      selectNode(node.id);
      resizeNode = node;
      resizeSX = e.clientX;
      resizeSY = e.clientY;
      resizeOW = node.width || el.offsetWidth;
      resizeOH = node.height || el.offsetHeight;
    });

    text.addEventListener('mousedown', e => e.stopPropagation());
    text.addEventListener('pointerdown', e => e.stopPropagation());
    text.addEventListener('click', e => e.stopPropagation());
    text.addEventListener('focus', () => selectNode(node.id));

    text.addEventListener('input', () => {
      node.content = text.innerText;
      markDirty();
    });

    text.addEventListener('blur', () => {
      node.content = text.innerText;
    });

    text.addEventListener('keydown', e => {
      e.stopPropagation();
    });

    handle.querySelector('[data-action="del"]').onclick = e => {
      e.stopPropagation();
      deleteNode(node.id);
    };

    handle.querySelectorAll('.note-color-btn').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        applyColor(node, btn.dataset.color);
        handle.querySelectorAll('.note-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
    });
  }

  function readSelectedColor() {
    const picked = document.querySelector('input[name="note-color"]:checked');
    return picked?.value || nodeDefaults().color || '#fff9a8';
  }

  async function openAdd() {
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const defaults = nodeDefaults();
      const width = parseInt(document.getElementById('note-width')?.value, 10) || defaults.width || 220;
      const id = genId();
      const node = {
        id,
        type: TYPE,
        x: pos.x,
        y: pos.y,
        width,
        color: readSelectedColor(),
        content: '',
      };
      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      Modal.close();
      showToast(cfg().addToast || 'Note tillagd');
      setTimeout(() => focusEditor(node), 80);
    });
  }

  async function openEdit() {
    // Inline-redigering — ingen edit-popup
  }

  return {
    openAdd,
    openEdit,
    buildHandleHTML,
    renderContent,
    attachEvents,
    focusEditor,
    applyColor,
  };
})();

ModuleRegistry.register('note', NotesModule);
document.getElementById('add-note').onclick = () => NotesModule.openAdd();
