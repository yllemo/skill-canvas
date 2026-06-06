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
    if (e.pointerType === 'mouse' && e.button !== 0) return;
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

  function startNoteResize(node, el, e) {
    e.stopPropagation();
    e.preventDefault();
    selectNode(node.id);
    resizeNode = node;
    resizeSX = e.clientX;
    resizeSY = e.clientY;
    resizeOW = node.width || el.offsetWidth;
    resizeOH = node.height || el.offsetHeight;
  }

  function attachEvents(node, el, handle, rz) {
    const text = el.querySelector('.note-text');
    if (!text) return;

    handle.addEventListener('pointerdown', e => {
      if (e.target.closest('.note-color-btn') || e.target.closest('[data-action]')) return;
      beginDrag(node, el, e);
      if (dragNode === node && handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
    });

    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      ctxTargetId = node.id;
      showCtx(e.clientX, e.clientY);
    });

    let longPressTimer = null;
    el.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      longPressTimer = setTimeout(() => {
        ctxTargetId = node.id;
        showCtx(e.touches[0].clientX, e.touches[0].clientY);
      }, 520);
    }, { passive: true });
    el.addEventListener('touchend', () => { if (longPressTimer) clearTimeout(longPressTimer); });
    el.addEventListener('touchmove', () => { if (longPressTimer) clearTimeout(longPressTimer); });

    rz.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      startNoteResize(node, el, e);
      if (rz.setPointerCapture) rz.setPointerCapture(e.pointerId);
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
      btn.addEventListener('pointerdown', e => e.stopPropagation());
      btn.addEventListener('mousedown', e => e.stopPropagation());
      btn.addEventListener('click', e => {
        e.stopPropagation();
        applyColor(node, btn.dataset.color);
        handle.querySelectorAll('.note-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function wireAddModalColors() {
    setTimeout(() => {
      const grid = document.getElementById('note-color-grid');
      if (!grid) return;
      const syncSelected = () => {
        grid.querySelectorAll('.note-color-swatch').forEach(label => {
          const input = label.querySelector('input[type=radio]');
          label.classList.toggle('is-selected', !!(input && input.checked));
        });
      };
      grid.querySelectorAll('input[name="note-color"]').forEach(input => {
        input.addEventListener('change', syncSelected);
      });
      syncSelected();
    }, 0);
  }

  function readSelectedColor() {
    const picked = document.querySelector('#note-color-grid input[name="note-color"]:checked')
      || document.querySelector('input[name="note-color"]:checked');
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
    wireAddModalColors();
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
