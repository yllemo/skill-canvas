// ════════════════════════════════════════════════════════════
//  SKILL TREE — filöversikt i skill-paketet
// ════════════════════════════════════════════════════════════
const SkillTree = (() => {
  let drawerOpen = false;

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    if (ext === 'html' || ext === 'htm') return 'html';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    return 'file';
  }

  function kindLabel(kind) {
    return {
      skill: 'SKILL',
      md: 'MD',
      mermaid: 'MM',
      drawio: 'DIO',
      html: 'HTML',
      image: 'IMG',
      file: 'FIL',
    }[kind] || 'FIL';
  }

  function referencedPaths(nodesList) {
    const refs = new Set(['SKILL.md']);
    (nodesList || []).forEach(n => {
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
      const size = fileSize(f.path, ctx.filesMap);
      const virtual = f.path === 'SKILL.md' && ctx.filesMap['SKILL.md'] == null;
      const onCanvas = ctx.refs.has(f.path);
      const badges = [];
      if (virtual) badges.push('genereras vid export');
      else if (onCanvas) badges.push('på canvas');
      else if (f.path !== 'SKILL.md') badges.push('ej på canvas');
      html += `<div class="skill-tree-row skill-tree-file${onCanvas ? ' is-on-canvas' : ''}" style="padding-left:${pad}px" title="${esc(f.path)}">
        <span class="skill-tree-kind">${kindLabel(kind)}</span>
        <span class="skill-tree-name">${esc(f.name)}</span>
        <span class="skill-tree-meta">${formatSize(size)}${badges.length ? ' · ' + badges.join(' · ') : ''}</span>
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
      <p class="skill-tree-hint">Trädet visar filer i minnet — samma innehåll som exporteras till .zip / .skill. <code>SKILL.md</code> byggs från metadata och noderna vid export om den inte redan finns.</p>
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
    }
    return drawer;
  }

  function openDrawer(getFiles, getNodes) {
    const drawer = ensureDrawer();
    const body = drawer.querySelector('#skill-tree-body');
    const filesMap = typeof getFiles === 'function' ? getFiles() : (getFiles || {});
    const nodesList = typeof getNodes === 'function' ? getNodes() : (getNodes || []);
    if (body) body.innerHTML = renderContent(filesMap, nodesList);
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.getElementById('modal')?.classList.add('has-skill-tree');
    drawerOpen = true;
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

  function wireMetaButton(getFiles, getNodes) {
    setTimeout(() => {
      const footLeft = document.getElementById('modal-foot-left');
      if (!footLeft) return;
      footLeft.innerHTML = `<button type="button" class="mbtn mbtn-skill-tree" id="meta-skill-tree-btn">Skill-träd</button>`;
      document.getElementById('meta-skill-tree-btn')?.addEventListener('click', e => {
        e.preventDefault();
        toggleDrawer(getFiles, getNodes);
      });
    }, 0);
  }

  return { openDrawer, closeDrawer, toggleDrawer, wireMetaButton, renderContent };
})();
