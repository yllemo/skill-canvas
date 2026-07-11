// ════════════════════════════════════════════════════════════
//  OKF index.md — Open Knowledge Format (Google OKF v0.1)
//  Progressive disclosure-lista för Skill Canvas .zip-paket.
//  Genereras automatiskt vid zip-export (saveZip). Mall: index.md i projektroten.
// ════════════════════════════════════════════════════════════
const OkfIndex = (() => {
  const FILE_HINTS = {
    'SKILL.md': 'Huvudmanifest — canvas-layout, noder, relationer och metadata.',
    md: 'Markdown-innehåll.',
    mmd: 'Mermaid-diagram.',
    puml: 'PlantUML-diagram.',
    ac: 'ArchiCode / ArchiMate-diagram.',
    drawio: 'Draw.io-diagram.',
    bpmn: 'BPMN-processdiagram.',
    png: 'Förhandsbild (PNG).',
    jpg: 'Bild.',
    jpeg: 'Bild.',
    gif: 'Bild.',
    webp: 'Bild.',
    svg: 'SVG-vektorgrafik.',
    html: 'HTML / iframe-innehåll.',
    htm: 'HTML / iframe-innehåll.',
    json: 'PromptBook-data.',
  };

  function escYaml(s) {
    const v = String(s ?? '').trim();
    if (!v) return '""';
    if (/[:#\[\]{}&*!|>'"%@`]|^\s|\s$/.test(v)) return JSON.stringify(v);
    return v;
  }

  function fileExt(path) {
    const i = path.lastIndexOf('.');
    return i >= 0 ? path.slice(i + 1).toLowerCase() : '';
  }

  function fileDescription(path) {
    if (path === 'SKILL.md') return FILE_HINTS['SKILL.md'];
    const ext = fileExt(path);
    if (path.startsWith('promptbook/') && ext === 'json') return FILE_HINTS.json;
    if (path.startsWith('images/')) return FILE_HINTS[ext] || 'Bildfil.';
    if (path.startsWith('taxonomi/') && ext === 'md') return 'Taxonomi (markdown).';
    if (path.startsWith('mindmap/') && ext === 'md') return 'Mindmap (markdown).';
    if (path.startsWith('svg/') && ext === 'svg') return FILE_HINTS.svg;
    return FILE_HINTS[ext] || 'Resursfil i paketet.';
  }

  function dirLabel(dir) {
    const labels = {
      '': 'Rot',
      nodes: 'nodes',
      diagrams: 'diagrams',
      images: 'images',
      html: 'html',
      promptbook: 'promptbook',
      taxonomi: 'taxonomi',
      mindmap: 'mindmap',
      svg: 'svg',
    };
    return labels[dir] ?? dir;
  }

  function groupPaths(paths) {
    const groups = new Map();
    const sorted = [...new Set(paths)].filter(Boolean).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    for (const path of sorted) {
      const slash = path.lastIndexOf('/');
      const dir = slash >= 0 ? path.slice(0, slash) : '';
      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir).push(path);
    }

    return [...groups.entries()].sort(([a], [b]) => {
      if (a === '') return -1;
      if (b === '') return 1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
  }

  /**
   * @param {{ name?: string, title?: string, description?: string }} meta
   * @param {string[]} paths — alla filsökvägar i paketet (inkl. SKILL.md)
   */
  function build(meta = {}, paths = []) {
    const title = String(meta.title || meta.name || 'Skill Canvas').trim() || 'Skill Canvas';
    const description = String(meta.description || '').trim();
    const allPaths = [...new Set(['SKILL.md', ...paths])].filter(Boolean);
    const groups = groupPaths(allPaths);

    const lines = [
      '---',
      'type: skill',
      `title: ${escYaml(title)}`,
      '---',
      '',
      `# ${title}`,
      '',
    ];

    if (description) {
      lines.push(description, '');
    }

    lines.push(
      'Översikt över filer i Skill Canvas-paketet (OKF — [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)).',
      'Relativa länkar matchar zip-arkivets struktur.',
      ''
    );

    for (const [dir, files] of groups) {
      lines.push(`## ${dirLabel(dir)}`, '');
      for (const path of files) {
        const name = path.includes('/') ? path.split('/').pop() : path;
        lines.push(`* [${name}](${path}) — ${fileDescription(path)}`);
      }
      lines.push('');
    }

    return lines.join('\n').trimEnd() + '\n';
  }

  return { build, fileDescription, groupPaths };
})();

window.OkfIndex = OkfIndex;
