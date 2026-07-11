// ════════════════════════════════════════════════════════════
//  SKILL IMPORT — validering + fallback från zip/.skill
// ════════════════════════════════════════════════════════════
const SkillImport = (() => {
  const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
  const SKIP_PREFIXES = ['__macosx/', '.git/'];
  const SKIP_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

  function normalizeZipPath(path) {
    return String(path || '').replace(/\\/g, '/').replace(/^\.\//, '');
  }

  function shouldSkipPath(path) {
    const norm = normalizeZipPath(path).toLowerCase();
    if (!norm || norm.endsWith('/')) return true;
    const base = norm.split('/').pop() || norm;
    if (SKIP_NAMES.has(base)) return true;
    return SKIP_PREFIXES.some(p => norm.startsWith(p));
  }

  function findSkillMdPath(filesMap) {
    if (filesMap['SKILL.md']) return 'SKILL.md';
    const key = Object.keys(filesMap).find(p => p.toLowerCase() === 'skill.md');
    return key || null;
  }

  function tryParseSkillYaml(raw) {
    const fm = String(raw || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) return { ok: false, reason: 'no_frontmatter' };
    try {
      const meta = jsyaml.load(fm[1]);
      if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
        return { ok: false, reason: 'invalid_meta' };
      }
      const body = raw.slice(fm[0].length).replace(/^\s+/, '');
      return { ok: true, meta, body };
    } catch (e) {
      return { ok: false, reason: 'yaml_error', error: e.message };
    }
  }

  function isSkillCanvasFormat(meta) {
    return !!(meta && typeof meta === 'object' && Array.isArray(meta.nodes));
  }

  function metaFromPartial(parsed, fileName) {
    const base = String(fileName || 'import').replace(/\.(zip|skill)$/i, '');
    const meta = parsed?.ok ? parsed.meta : {};
    const tags = meta.tags;
    return {
      name: meta.name || meta.title || base || 'imported-skill',
      description: meta.description || '',
      author: meta.author || '',
      version: String(meta.version || '1.0'),
      tags: Array.isArray(tags) ? tags.join(', ') : (tags || ''),
    };
  }

  function titleFromPath(path) {
    const base = (path.split('/').pop() || path).replace(/\.[^.]+$/, '');
    const t = base.replace(/[-_]+/g, ' ').trim();
    if (!t) return 'Untitled';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function extOf(path) {
    const m = path.toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }

  function detectType(path, skillPath) {
    const norm = normalizeZipPath(path);
    const lower = norm.toLowerCase();
    const ext = extOf(norm);
    if (skillPath && norm === skillPath) return 'markdown';
    if (lower.startsWith('taxonomi/') && ext === 'md') return 'taxonomi';
    if (lower.startsWith('mindmap/') && ext === 'md') return 'mindmap';
    if (lower.startsWith('svg/') && ext === 'svg') return 'svg';
    if (ext === 'md') return 'markdown';
    if (ext === 'mmd' || ext === 'mermaid') return 'mermaid';
    if (ext === 'puml' || ext === 'plantuml') return 'plantuml';
    if (ext === 'ac') return 'archicode';
    if (ext === 'drawio' || ext === 'dio') return 'drawio';
    if (ext === 'bpmn') return 'bpmn';
    if (ext === 'html' || ext === 'htm') return 'html';
    if (ext === 'json' && lower.startsWith('promptbook/')) return 'promptbook';
    if (IMAGE_EXT.has(ext)) return 'image';
    return null;
  }

  function findArchicodePreview(path, filesMap) {
    const base = path.replace(/\.ac$/i, '');
    for (const ext of ['svg', 'png', 'jpg', 'jpeg']) {
      const candidate = `${base}.${ext}`;
      if (filesMap[candidate]) return candidate;
    }
    return null;
  }

  function findDrawioPreview(path, filesMap) {
    const base = path.replace(/\.(drawio|dio)$/i, '');
    for (const ext of ['png', 'svg', 'jpg', 'jpeg']) {
      const candidate = `${base}.${ext}`;
      if (filesMap[candidate]) return candidate;
    }
    return null;
  }

  function findBpmnPreview(path, filesMap) {
    const base = path.replace(/\.bpmn$/i, '');
    for (const ext of ['png', 'svg', 'jpg', 'jpeg']) {
      const candidate = `${base}.${ext}`;
      if (filesMap[candidate]) return candidate;
    }
    return null;
  }

  function findMdSiblingPreview(path, filesMap) {
    const base = path.replace(/\.md$/i, '');
    for (const ext of ['png', 'svg', 'jpg', 'jpeg']) {
      const candidate = `${base}.${ext}`;
      if (filesMap[candidate]) return candidate;
    }
    return null;
  }

  function findPumlPreview(path, filesMap) {
    const base = path.replace(/\.(puml|plantuml)$/i, '');
    for (const ext of ['png', 'svg', 'jpg', 'jpeg']) {
      const candidate = `${base}.${ext}`;
      if (filesMap[candidate]) return candidate;
    }
    return null;
  }

  function defaultWidth(type) {
    const nodes = window.SC_DEFAULTS?.nodes || {};
    return nodes[type]?.width || { markdown: 720, mermaid: 500, plantuml: 500, image: 400, drawio: 480, bpmn: 480, html: 640, promptbook: 420, archicode: 520, taxonomi: 520, mindmap: 520, svg: 480 }[type] || 400;
  }

  function defaultHeight(type) {
    const nodes = window.SC_DEFAULTS?.nodes || {};
    return nodes[type]?.height;
  }

  function layoutNodes(list, opts = {}) {
    const colW = opts.colWidth || 420;
    const rowH = opts.rowHeight || 300;
    const gap = opts.gap || 36;
    const cols = opts.cols || 3;
    const x0 = opts.x0 ?? 80;
    const y0 = opts.y0 ?? 80;
    list.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      node.x = x0 + col * (colW + gap);
      node.y = y0 + row * (rowH + gap);
      if (!node.width) node.width = defaultWidth(node.type);
    });
    return list;
  }

  function buildImportFromArchive(filesMap, skillRaw, fileName) {
    const skillPath = findSkillMdPath(filesMap);
    const parsed = skillRaw ? tryParseSkillYaml(skillRaw) : { ok: false };
    const meta = metaFromPartial(parsed, fileName);
    const usedPaths = new Set();
    const importNodes = [];

    function addNode(spec) {
      importNodes.push({
        id: typeof genId === 'function' ? genId() : `n${importNodes.length}`,
        ...spec,
      });
      if (spec.file) usedPaths.add(spec.file);
    }

    if (skillPath) {
      const title = parsed.ok && (parsed.meta.name || parsed.meta.title)
        ? String(parsed.meta.name || parsed.meta.title)
        : titleFromPath('SKILL');
      addNode({
        type: 'markdown',
        file: skillPath,
        title,
        width: defaultWidth('markdown'),
        height: defaultHeight('markdown') || 600,
      });
    }

    const paths = Object.keys(filesMap)
      .filter(p => !shouldSkipPath(p))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    for (const path of paths) {
      if (usedPaths.has(path)) continue;
      const type = detectType(path, skillPath);
      if (!type) continue;

      if (type === 'drawio') {
        const preview = findDrawioPreview(path, filesMap);
        if (preview) usedPaths.add(preview);
        addNode({
          type: 'drawio',
          file: path,
          previewFile: preview || undefined,
          title: titleFromPath(path),
          width: defaultWidth('drawio'),
        });
        continue;
      }

      if (type === 'bpmn') {
        const preview = findBpmnPreview(path, filesMap);
        if (preview) usedPaths.add(preview);
        addNode({
          type: 'bpmn',
          file: path,
          previewFile: preview || undefined,
          title: titleFromPath(path),
          width: defaultWidth('bpmn'),
        });
        continue;
      }

      if (type === 'taxonomi' || type === 'mindmap') {
        const preview = findMdSiblingPreview(path, filesMap);
        if (preview) usedPaths.add(preview);
        addNode({
          type,
          file: path,
          previewFile: preview || undefined,
          title: titleFromPath(path),
          width: defaultWidth(type),
        });
        continue;
      }

      if (type === 'plantuml') {
        const preview = findPumlPreview(path, filesMap);
        if (preview) usedPaths.add(preview);
        addNode({
          type: 'plantuml',
          file: path,
          previewFile: preview || undefined,
          title: titleFromPath(path),
          width: defaultWidth('plantuml'),
          height: defaultHeight('plantuml') || 600,
        });
        continue;
      }

      if (type === 'svg') {
        addNode({
          type: 'svg',
          file: path,
          title: titleFromPath(path),
          width: defaultWidth('svg'),
        });
        continue;
      }

      if (type === 'archicode') {
        const preview = findArchicodePreview(path, filesMap);
        if (preview) usedPaths.add(preview);
        addNode({
          type: 'archicode',
          file: path,
          previewFile: preview || undefined,
          title: titleFromPath(path),
          width: defaultWidth('archicode'),
        });
        continue;
      }

      if (type === 'image') {
        addNode({
          type: 'image',
          file: path,
          title: titleFromPath(path),
          alt: titleFromPath(path),
          width: defaultWidth('image'),
        });
        continue;
      }

      if (type === 'html') {
        addNode({
          type: 'html',
          source: 'file',
          file: path,
          title: titleFromPath(path),
          width: defaultWidth('html'),
          height: window.SC_DEFAULTS?.nodes?.html?.height || 400,
        });
        continue;
      }

      if (type === 'promptbook') {
        addNode({
          type: 'promptbook',
          file: path,
          title: titleFromPath(path),
          width: defaultWidth('promptbook'),
          height: window.SC_DEFAULTS?.nodes?.promptbook?.height || 360,
        });
        continue;
      }

      addNode({
        type,
        file: path,
        title: titleFromPath(path),
        width: defaultWidth(type),
        ...(type === 'markdown' ? { height: defaultHeight('markdown') || 600 } : {}),
      });
    }

    if (!importNodes.length) {
      throw new Error('Inga importerbara filer hittades i arkivet.');
    }

    layoutNodes(importNodes);

    return {
      meta,
      nodes: importNodes,
      edges: [],
      usedFallback: true,
    };
  }

  function isArchiveFileName(name) {
    const n = String(name || '').toLowerCase();
    return n.endsWith('.zip') || n.endsWith('.skill');
  }

  function parseRemoteArchiveUrl(raw, baseHref) {
    const s = String(raw || '').trim();
    if (!s) return { ok: false, error: 'Ingen URL angiven' };
    let url;
    try {
      url = new URL(s, baseHref || (typeof location !== 'undefined' ? location.href : undefined));
    } catch {
      return { ok: false, error: 'Ogiltig URL' };
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, error: 'Endast http/https-URL:er stöds' };
    }
    const path = url.pathname.toLowerCase();
    if (!isArchiveFileName(path.split('/').pop() || '')) {
      return { ok: false, error: 'URL måste peka på en .zip- eller .skill-fil' };
    }
    return { ok: true, url: url.href };
  }

  function fileNameFromUrl(urlStr) {
    try {
      const u = new URL(urlStr);
      const base = u.pathname.split('/').pop() || 'remote.skill';
      return decodeURIComponent(base);
    } catch {
      return 'remote.skill';
    }
  }

  return {
    normalizeZipPath,
    shouldSkipPath,
    findSkillMdPath,
    tryParseSkillYaml,
    isSkillCanvasFormat,
    buildImportFromArchive,
    isArchiveFileName,
    parseRemoteArchiveUrl,
    fileNameFromUrl,
  };
})();
