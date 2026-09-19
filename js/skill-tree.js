// ════════════════════════════════════════════════════════════
//  SKILL TREE — filöversikt i skill-paketet
// ════════════════════════════════════════════════════════════
const SkillTree = (() => {
  let drawerOpen = false;
  let hooks = {
    getFiles: () => ({}),
    getNodes: () => [],
    onActivateFile: null,
  };

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fileSize(path, filesMap) {
    const data = filesMap[path];
    if (data == null) return null;
    if (data instanceof Uint8Array) return data.byteLength;
    if (typeof data === 'string') return new TextEncoder().encode(data).byteLength;
    return String(data).length;
  }

  function formatSize(bytes) {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function fileKind(path) {
    const ext = (path.split('.').pop() || '').toLowerCase();
    if (path === 'SKILL.md') return 'skill';
    if (ext === 'md') return 'md';
    if (ext === 'mmd' || ext === 'mermaid') return 'mermaid';
    if (ext === 'drawio' || ext === 'dio') return 'drawio';
    if (ext === 'bpmn') return 'bpmn';
    if (ext === 'html' || ext === 'htm') return 'html';
    if (ext === 'puml' || ext === 'plantuml') return 'plantuml';
    if (ext === 'ac') return 'archicode';
    if (ext === 'svg') return 'svg';
    if (ext === 'json') return 'promptbook';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
    return 'file';
  }

  function kindLabel(kind) {
    return {
      skill: 'SKILL',
      md: 'MD',
      mermaid: 'MM',
      drawio: 'DIO',
      bpmn: 'BPMN',
      html: 'HTML',
      plantuml: 'PUML',
      archicode: 'AC',
      svg: 'SVG',
      promptbook: 'PB',
      image: 'IMG',
      file: 'FIL',
    }[kind] || 'FIL';
  }

  function referencedPaths(nodesList) {
    const refs = new Set();
    (nodesList || []).forEach(n => {
      if (n._skillMdPreview) refs.add('SKILL.md');
      if (n.file) refs.add(n.file);
      if (n.previewFile) refs.add(n.previewFile);
    });
    return refs;
  }

  function packagePaths(filesMap) {
    const paths = new Set(Object.keys(filesMap || {}));
    paths.add('SKILL.md');
    return [...paths].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  function buildTree(paths) {
    const root = { dirs: new Map(), files: [] };
    for (const path of paths) {
      const parts = path.split('/').filter(Boolean);
      let node = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        if (isLast) {
          node.files.push({ name: part, path });
        } else {
          if (!node.dirs.has(part)) node.dirs.set(part, { dirs: new Map(), files: [] });
          node = node.dirs.get(part);
        }
      }
    }
    return root;
  }

  function actionLabel(f, ctx) {
    if (f.path === 'SKILL.md') {
      return ctx.refs.has('SKILL.md') ? 'Visa' : 'Visa på canvas';
    }
    if (ctx.refs.has(f.path)) return 'Visa';
    if (fileKind(f.path) === 'file') return '';
    return 'Lägg till';
  }

  function renderNode(node, depth, ctx) {
    let html = '';
    const pad = depth * 14;
    const dirs = [...node.dirs.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name, dir] of dirs) {
      html += `<div class="skill-tree-row skill-tree-dir" style="padding-left:${pad}px"><span class="skill-tree-icon">📁</span><span class="skill-tree-name">${esc(name)}/</span></div>`;
      html += renderNode(dir, depth + 1, ctx);
    }
    const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));
    for (const f of files) {
      const kind = fileKind(f.path);
      const size = f.path === 'SKILL.md' && ctx.filesMap['SKILL.md'] == null
        ? null
        : fileSize(f.path, ctx.filesMap);
      const virtual = f.path === 'SKILL.md' && ctx.filesMap['SKILL.md'] == null;
      const onCanvas = ctx.refs.has(f.path);
      const badges = [];
      if (f.path === 'SKILL.md') {
        badges.push(virtual ? 'genereras vid export' : 'byggs om vid export');
        if (onCanvas) badges.push('förhandsvisning');
      } else if (onCanvas) {
        badges.push('på canvas');
      } else {
        badges.push('ej på canvas');
      }
      const action = actionLabel(f, ctx);
      const clickable = kind !== 'file' || f.path === 'SKILL.md';
      html += `<div class="skill-tree-row skill-tree-file${onCanvas ? ' is-on-canvas' : ''}${clickable ? ' is-actionable' : ''}" style="padding-left:${pad}px" title="${esc(f.path)}" data-skill-path="${esc(f.path)}">
        <span class="skill-tree-kind">${kindLabel(kind)}</span>
        <span class="skill-tree-name">${esc(f.name)}</span>
        <span class="skill-tree-meta">${formatSize(size)}${badges.length ? ' · ' + badges.join(' · ') : ''}</span>
        ${action ? `<button type="button" class="skill-tree-action" data-skill-path="${esc(f.path)}">${esc(action)}</button>` : ''}
      </div>`;
    }
    return html;
  }

  function renderContent(filesMap, nodesList) {
    const paths = packagePaths(filesMap);
    const refs = referencedPaths(nodesList);
    const ctx = { filesMap, refs };
    const tree = buildTree(paths);
    const totalBytes = paths.reduce((sum, p) => {
      const s = fileSize(p, filesMap);
      return sum + (s || 0);
    }, 0);
    const onCanvasCount = paths.filter(p => refs.has(p)).length;
    const orphanCount = paths.filter(p => p !== 'SKILL.md' && !refs.has(p)).length;

    return `
      <div class="skill-tree-summary">
        <span><strong>${paths.length}</strong> filer</span>
        <span><strong>${formatSize(totalBytes)}</strong> totalt</span>
        <span><strong>${onCanvasCount}</strong> kopplade till canvas</span>
        ${orphanCount ? `<span class="skill-tree-orphan">${orphanCount} utan nod</span>` : ''}
      </div>
      <div class="skill-tree-list">${renderNode(tree, 0, ctx)}</div>
      <p class="skill-tree-hint">Klicka på en fil eller <strong>Lägg till</strong> för att visa den på canvas. <code>SKILL.md</code> läggs till som skrivskyddad förhandsvisning — den byggs alltid om från metadata och noder vid export.</p>
    `;
  }

  function ensureDrawer() {
    let drawer = document.getElementById('skill-tree-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'skill-tree-drawer';
      drawer.className = 'skill-tree-drawer';
      drawer.setAttribute('aria-hidden', 'true');
      drawer.innerHTML = `
        <div class="skill-tree-head">
          <h4>Skill-träd</h4>
          <button type="button" class="skill-tree-close" id="skill-tree-close" aria-label="Stäng">×</button>
        </div>
        <div class="skill-tree-body" id="skill-tree-body"></div>
      `;
      document.getElementById('modal')?.appendChild(drawer);
      drawer.querySelector('#skill-tree-close')?.addEventListener('click', closeDrawer);
      drawer.addEventListener('click', e => {
        const btn = e.target.closest('[data-skill-path]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const path = btn.getAttribute('data-skill-path');
        if (!path || typeof hooks.onActivateFile !== 'function') return;
        hooks.onActivateFile(path);
      });
    }
    return drawer;
  }

  function openDrawer(getFiles, getNodes) {
    if (typeof getFiles === 'function') hooks.getFiles = getFiles;
    if (typeof getNodes === 'function') hooks.getNodes = getNodes;
    const drawer = ensureDrawer();
    const body = drawer.querySelector('#skill-tree-body');
    const filesMap = hooks.getFiles() || {};
    const nodesList = hooks.getNodes() || [];
    if (body) body.innerHTML = renderContent(filesMap, nodesList);
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.getElementById('modal')?.classList.add('has-skill-tree');
    drawerOpen = true;
  }

  function refreshDrawer() {
    if (!drawerOpen) return;
    openDrawer(hooks.getFiles, hooks.getNodes);
  }

  function closeDrawer() {
    const drawer = document.getElementById('skill-tree-drawer');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
    document.getElementById('modal')?.classList.remove('has-skill-tree');
    drawerOpen = false;
  }

  function toggleDrawer(getFiles, getNodes) {
    if (drawerOpen) closeDrawer();
    else openDrawer(getFiles, getNodes);
  }

  function wireMetaButton(getFilesOrHooks, getNodesMaybe) {
    // Bakåtkompat: (getFiles, getNodes) eller ({ getFiles, getNodes, onActivateFile })
    if (getFilesOrHooks && typeof getFilesOrHooks === 'object' && !Array.isArray(getFilesOrHooks)) {
      hooks = { ...hooks, ...getFilesOrHooks };
    } else {
      if (typeof getFilesOrHooks === 'function') hooks.getFiles = getFilesOrHooks;
      if (typeof getNodesMaybe === 'function') hooks.getNodes = getNodesMaybe;
    }
    setTimeout(() => {
      const footLeft = document.getElementById('modal-foot-left');
      if (!footLeft) return;
      footLeft.innerHTML = `<button type="button" class="mbtn mbtn-skill-tree" id="meta-skill-tree-btn">Skill-träd</button>`;
      document.getElementById('meta-skill-tree-btn')?.addEventListener('click', e => {
        e.preventDefault();
        toggleDrawer(hooks.getFiles, hooks.getNodes);
      });
    }, 0);
  }

  return {
    openDrawer,
    closeDrawer,
    toggleDrawer,
    refreshDrawer,
    wireMetaButton,
    renderContent,
    fileKind,
    referencedPaths,
  };
})();
