<?php
declare(strict_types=1);

$embed = isset($_GET['embed']) && $_GET['embed'] === '1';
$theme = in_array($_GET['theme'] ?? '', ['light', 'dark'], true) ? $_GET['theme'] : 'light';
?>
<!DOCTYPE html>
<html lang="sv" data-theme="<?= htmlspecialchars($theme, ENT_QUOTES, 'UTF-8') ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Markdown Editor</title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">

<!-- Mermaid (@latest with icon support) -->
<script src="https://cdn.jsdelivr.net/npm/mermaid@latest/dist/mermaid.min.js"></script>

<!-- Monaco Editor -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/editor/editor.main.min.css">

<!-- marked.js for Markdown rendering -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>

<!-- highlight.js for code blocks -->
<link rel="stylesheet" id="hljs-theme-light" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<link rel="stylesheet" id="hljs-theme-dark" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" disabled>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

<style>
  :root {
    --gs-blue: #0077bc;
    --gs-blue-dark: #005799;
    --bg-color: #FFFFFE;
    --bg-footer: #F4F9FC;
    --bg-nav: #F4F9FC;
    --bg-info: #F2F9F9;
    --text-color: #333333;
    --text-secondary: #6E6E6E;
    --link-color: #005799;
    --border-color: #C8D0D8;
    --editor-bg: #FFFFFE;
    --divider-color: #0077bc;
    --header-height: 48px;
    --toolbar-height: 36px;
  }

  [data-theme="dark"] {
    --bg-color: #1F1F1F;
    --bg-footer: #141414;
    --bg-nav: #141414;
    --bg-info: #282828;
    --text-color: #FFFFFF;
    --text-secondary: #B0BAC0;
    --link-color: #479EF5;
    --border-color: #444444;
    --editor-bg: #1F1F1F;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    height: 100%;
    overflow: hidden;
    font-family: 'Goteborg', Arial, Helvetica, sans-serif;
    background: var(--bg-color);
    color: var(--text-color);
  }

  /* ── Header ── */
  #header {
    height: var(--header-height);
    background: var(--gs-blue);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    user-select: none;
    flex-shrink: 0;
    z-index: 100;
  }

  #header-title {
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  #header-title svg { flex-shrink: 0; }

  #header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-btn {
    background: rgba(255,255,255,0.15);
    color: #fff;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
    white-space: nowrap;
  }
  .header-btn:hover { background: rgba(255,255,255,0.25); }
  .header-btn-save {
    background: #27ae60;
    border-color: #1e8449;
    font-weight: 700;
  }
  .header-btn-save:hover { background: #2ecc71; }

  body.embed-mode .header-btn-standalone { display: none; }
  body:not(.embed-mode) .header-btn-embed { display: none; }

  /* ── Toolbar ── */
  #toolbar {
    height: var(--toolbar-height);
    background: var(--bg-nav);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 2px;
    flex-shrink: 0;
    overflow-x: auto;
  }

  .tb-btn {
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--text-color);
    cursor: pointer;
    padding: 3px 7px;
    font-size: 13px;
    font-family: 'Goteborg', Arial, Helvetica, sans-serif;
    font-weight: 600;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
    line-height: 1;
  }
  .tb-btn:hover { background: var(--gs-blue); color: #fff; }

  .tb-sep {
    width: 1px;
    height: 18px;
    background: var(--border-color);
    margin: 0 4px;
    flex-shrink: 0;
  }

  /* ── Main split layout ── */
  #layout {
    display: flex;
    height: calc(100vh - var(--header-height) - var(--toolbar-height));
    overflow: hidden;
  }

  /* ── Panes ── */
  .pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .pane-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-secondary);
    padding: 5px 14px 4px;
    background: var(--bg-footer);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
    user-select: none;
  }

  /* ── Divider ── */
  #divider {
    width: 4px;
    background: var(--divider-color);
    cursor: col-resize;
    flex-shrink: 0;
    position: relative;
    transition: background 0.15s;
  }
  #divider:hover, #divider.dragging { background: #005799; }
  #divider::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 40px;
    border-radius: 2px;
    background: rgba(255,255,255,0.4);
  }

  /* ── Editor pane ── */
  #editor-container {
    flex: 1;
    overflow: hidden;
  }

  /* ── Preview pane ── */
  #preview-container {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-color);
    padding: 28px 36px;
    scroll-behavior: smooth;
  }

  /* ── Markdown preview styles ── */
  #preview-container h1,
  #preview-container h2,
  #preview-container h3,
  #preview-container h4,
  #preview-container h5,
  #preview-container h6 {
    color: var(--text-color);
    margin: 1.4em 0 0.5em;
    line-height: 1.3;
    font-family: 'Goteborg', Arial, Helvetica, sans-serif;
  }
  #preview-container h1 { font-size: 2em; border-bottom: 2px solid var(--gs-blue); padding-bottom: 0.2em; }
  #preview-container h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.15em; }
  #preview-container h3 { font-size: 1.2em; }
  #preview-container h4 { font-size: 1em; }

  #preview-container p { margin: 0.7em 0; line-height: 1.7; }

  #preview-container a { color: var(--link-color); text-decoration: underline; }
  #preview-container a:hover { opacity: 0.8; }

  #preview-container ul, #preview-container ol {
    padding-left: 1.6em;
    margin: 0.6em 0;
    line-height: 1.7;
  }
  #preview-container li { margin: 0.2em 0; }

  #preview-container blockquote {
    border-left: 4px solid var(--gs-blue);
    margin: 1em 0;
    padding: 8px 16px;
    background: var(--bg-info);
    color: var(--text-secondary);
    border-radius: 0 4px 4px 0;
  }

  #preview-container code {
    font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
    font-size: 0.88em;
    background: var(--bg-nav);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    padding: 1px 5px;
  }

  #preview-container pre {
    background: var(--bg-nav);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 1em 0;
  }
  #preview-container pre code {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.87em;
  }

  #preview-container table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 0.95em;
  }
  #preview-container th {
    background: var(--gs-blue);
    color: #fff;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
  }
  #preview-container td {
    padding: 7px 12px;
    border-bottom: 1px solid var(--border-color);
  }
  #preview-container tr:nth-child(even) td { background: var(--bg-nav); }

  #preview-container hr {
    border: none;
    border-top: 2px solid var(--border-color);
    margin: 1.5em 0;
  }

  #preview-container img {
    max-width: 100%;
    border-radius: 4px;
    margin: 0.5em 0;
  }

  #preview-container strong { font-weight: 700; }
  #preview-container em { font-style: italic; }

  /* ── Sync indicator ── */
  #sync-indicator {
    position: fixed;
    bottom: 14px;
    right: 14px;
    background: var(--gs-blue);
    color: #fff;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 12px;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
    z-index: 1000;
    font-family: inherit;
  }

  /* ── Status bar ── */
  #statusbar {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: 22px;
    background: var(--gs-blue);
    color: rgba(255,255,255,0.85);
    font-size: 11px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    gap: 16px;
    z-index: 200;
    user-select: none;
  }
  #statusbar span { opacity: 0.9; }

  /* ── Import modal ── */
  #import-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 2000;
    align-items: center;
    justify-content: center;
  }
  #import-overlay.open { display: flex; }

  #import-modal {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    width: min(860px, 96vw);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 40px rgba(0,0,0,0.3);
    overflow: hidden;
  }

  #import-header {
    background: var(--gs-blue);
    color: #fff;
    padding: 12px 18px;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  #import-close {
    background: none;
    border: none;
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
    padding: 0 4px;
    opacity: 0.8;
  }
  #import-close:hover { opacity: 1; }

  #import-body {
    display: flex;
    gap: 0;
    flex: 1;
    overflow: hidden;
  }

  .import-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 14px 16px;
    gap: 8px;
    overflow: hidden;
    min-width: 0;
  }

  .import-col + .import-col {
    border-left: 1px solid var(--border-color);
  }

  .import-col-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .import-col-desc {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.4;
    flex-shrink: 0;
  }

  .import-textarea {
    flex: 1;
    resize: none;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-nav);
    color: var(--text-color);
    font-family: 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    padding: 10px 12px;
    line-height: 1.5;
    outline: none;
    min-height: 180px;
    max-height: 340px;
  }
  .import-textarea:focus { border-color: var(--gs-blue); }

  .import-col-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .import-btn {
    background: var(--bg-footer);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 5px 12px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.12s;
    white-space: nowrap;
  }
  .import-btn:hover { background: var(--border-color); }
  .import-btn.primary {
    background: var(--gs-blue);
    color: #fff;
    border-color: var(--gs-blue);
  }
  .import-btn.primary:hover { background: #005799; }
  .import-btn.danger {
    color: #d24723;
    border-color: #d24723;
  }
  .import-btn.danger:hover { background: #d24723; color: #fff; }

  #import-preview-area {
    border-top: 1px solid var(--border-color);
    padding: 12px 16px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  #import-preview-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  #import-preview-box {
    background: var(--bg-nav);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-family: 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    color: var(--text-color);
    padding: 10px 12px;
    max-height: 130px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
  }

  #import-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
    gap: 10px;
    flex-wrap: wrap;
  }

  #import-status {
    font-size: 12px;
    color: var(--text-secondary);
    flex: 1;
    min-width: 120px;
  }
  #import-status.ok { color: #5a8b3b; }
  #import-status.err { color: #d24723; }

  /* richtext placeholder */
  #rich-input:empty::before {
    content: attr(data-placeholder);
    color: var(--text-secondary);
    pointer-events: none;
    display: block;
  }
  #rich-input:focus { outline: none; border-color: var(--gs-blue); }
</style>
</head>
<body<?= $embed ? ' class="embed-mode"' : '' ?>>

<!-- Header -->
<div id="header">
  <div id="header-title">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
    Markdown Editor
  </div>
  <div id="header-actions">
    <button class="header-btn header-btn-embed header-btn-save" onclick="embedSave()" title="Spara tillbaka till kortet">✓ Spara till kort</button>
    <button class="header-btn header-btn-embed" onclick="embedCancel()" title="Stäng utan att spara">✕ Avbryt</button>
    <button class="header-btn header-btn-embed" onclick="openImport()" title="Importera HTML eller richtext">📥 Importera</button>
    <button class="header-btn header-btn-embed" onclick="openDocxImport()" title="Importera Word (.docx) med bilder">📄 DOCX</button>
    <button class="header-btn header-btn-standalone" onclick="copyMarkdown()" title="Kopiera markdown">📋 Kopiera</button>
    <button class="header-btn header-btn-standalone" onclick="downloadMarkdown()" title="Ladda ner som .md fil">⬇️ Ladda ner</button>
    <button class="header-btn header-btn-standalone" onclick="openImport()" title="Importera HTML eller richtext">📥 Importera</button>
    <button class="header-btn header-btn-standalone" onclick="openDocxImport()" title="Importera Word (.docx)">📄 DOCX</button>
    <button class="header-btn header-btn-standalone" onclick="clearEditor()" title="Rensa">🗑 Rensa</button>
    <button class="header-btn header-btn-standalone" onclick="toggleTheme()" id="theme-btn">🌙 Mörkt</button>
  </div>
</div>

<!-- Toolbar -->
<div id="toolbar">
  <button class="tb-btn" onclick="insert('**', '**')" title="Bold">B</button>
  <button class="tb-btn" onclick="insert('*', '*')" title="Italic" style="font-style:italic;font-weight:400">I</button>
  <button class="tb-btn" onclick="insert('~~', '~~')" title="Strikethrough" style="text-decoration:line-through;font-weight:400">S</button>
  <button class="tb-btn" onclick="insert('`', '`')" title="Inline code" style="font-family:monospace">⌨</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" onclick="insertLine('# ')" title="H1">H1</button>
  <button class="tb-btn" onclick="insertLine('## ')" title="H2">H2</button>
  <button class="tb-btn" onclick="insertLine('### ')" title="H3">H3</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" onclick="insertLine('- ')" title="Bullet list">• Lista</button>
  <button class="tb-btn" onclick="insertLine('1. ')" title="Numbered list">1. Lista</button>
  <button class="tb-btn" onclick="insertLine('> ')" title="Blockquote">❝ Citat</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" onclick="insertCodeBlock()" title="Code block">```Kod```</button>
  <button class="tb-btn" onclick="insertTable()" title="Table">⊞ Tabell</button>
  <button class="tb-btn" onclick="insertLine('---')" title="Horizontal rule">— Linje</button>
  <button class="tb-btn" onclick="insertLink()" title="Link">🔗 Länk</button>
  <button class="tb-btn" onclick="insertImage()" title="Image">🖼 Bild</button>
  <button class="tb-btn" onclick="insertMermaid()" title="Mermaid-diagram">🧩 Mermaid</button>
</div>

<!-- Main layout -->
<div id="layout">
  <!-- Editor pane -->
  <div class="pane" id="editor-pane">
    <div class="pane-label">✏️ Markdown</div>
    <div id="editor-container"></div>
  </div>

  <!-- Resizable divider -->
  <div id="divider"></div>

  <!-- Preview pane -->
  <div class="pane" id="preview-pane">
    <div class="pane-label">👁 Förhandsvisning</div>
    <div id="preview-container"></div>
  </div>
</div>

<!-- Import modal -->
<div id="import-overlay" onclick="overlayClick(event)">
  <div id="import-modal">
    <div id="import-header">
      <span>📥 Importera — klistra in HTML eller Richtext</span>
      <button id="import-close" onclick="closeImport()" title="Stäng">✕</button>
    </div>

    <div id="import-body">
      <!-- HTML column -->
      <div class="import-col">
        <div class="import-col-label">HTML-kod</div>
        <div class="import-col-desc">Klistra in rå HTML. Taggar, klasser och stilar rensas — struktur och text bevaras.</div>
        <textarea class="import-textarea" id="html-input" placeholder="&lt;h1&gt;Rubrik&lt;/h1&gt;&#10;&lt;p&gt;Text med &lt;strong&gt;fetstil&lt;/strong&gt;&lt;/p&gt;&#10;&lt;table&gt;...&lt;/table&gt;"></textarea>
        <div class="import-col-actions">
          <button class="import-btn" onclick="convertHtml()">🔄 Konvertera HTML</button>
          <button class="import-btn danger" onclick="clearInput('html-input')">✕ Rensa</button>
        </div>
      </div>

      <!-- Richtext column -->
      <div class="import-col">
        <div class="import-col-label">Richtext / Klistra från Word · Webb</div>
        <div class="import-col-desc">Klistra in formatterad text direkt från Word, e-post, webbsida eller PDF. Formatering tolkas automatiskt.</div>
        <div class="import-textarea" id="rich-input" contenteditable="true" spellcheck="false"
             style="overflow-y:auto;min-height:180px;max-height:340px;font-family:inherit;font-size:13px;"
             data-placeholder="Klistra in richtext här (Ctrl+V)…"></div>
        <div class="import-col-actions">
          <button class="import-btn" onclick="convertRich()">🔄 Konvertera Richtext</button>
          <button class="import-btn danger" onclick="clearRich()">✕ Rensa</button>
        </div>
      </div>
    </div>

    <!-- Preview -->
    <div id="import-preview-area">
      <div id="import-preview-label">Förhandsvisning — genererad markdown</div>
      <div id="import-preview-box">Konvertera HTML eller Richtext ovan för att se resultat här…</div>
    </div>

    <div id="import-footer">
      <span id="import-status">Väntar på inmatning…</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="import-btn" onclick="copyConverted()" id="btn-copy-converted" disabled>📋 Kopiera markdown</button>
        <button class="import-btn primary" onclick="importToEditor()" id="btn-import" disabled>✅ Importera till editor</button>
        <button class="import-btn" onclick="closeImport()">Avbryt</button>
      </div>
    </div>
  </div>
</div>

<!-- Sync indicator -->
<div id="sync-indicator">↕ Synkad scroll</div>

<!-- Status bar -->
<div id="statusbar">
  <span id="stat-words">0 ord</span>
  <span id="stat-chars">0 tecken</span>
  <span id="stat-lines">0 rader</span>
  <span id="stat-scroll" style="margin-left:auto">Scroll: 0%</span>
</div>

<!-- Monaco loader -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>

<script>
// ── Globals — all declared first to avoid TDZ ──────────
var EMBED_MODE = <?= $embed ? 'true' : 'false' ?>;
var INITIAL_THEME = <?= json_encode($theme, JSON_UNESCAPED_UNICODE) ?>;
var monacoEditor = null;
var syncLock = false;
var syncTimer = null;
var mermaidReady = false;

var DEFAULT_CONTENT = '';

var DEFAULT_CONTENT2 = [
  '# Välkommen till Markdown Editor',
  '',
  'En **snabb** och _smidig_ editor med live-förhandsvisning.',
  '',
  '## Funktioner',
  '',
  '- \u2705 Monaco-editor (samma som VS Code)',
  '- \u2705 Live markdown-rendering',
  '- \u2705 Synkad scroll',
  '- \u2705 M\u00f6rkt/ljust l\u00e4ge',
  '- \u2705 Syntaxmarkering f\u00f6r kod',
  '',
  '## Kodsyntax',
  '',
  '```javascript',
  '// Hello World',
  'function greet(name) {',
  '  return `Hej, ${name}!`;',
  '}',
  '',
  'console.log(greet("G\u00f6teborg"));',
  '```',
  '',
  '## Tabell',
  '',
  '| Funktion       | Status   | Kommentar         |',
  '|----------------|----------|-------------------|',
  '| Monaco editor  | \u2705 Klar  | Full VS Code UX   |',
  '| Live preview   | \u2705 Klar  | Realtidsrendering |',
  '| Sync scroll    | \u2705 Klar  | B\u00e5da r\u00f6r sig lika |',
  '| M\u00f6rkt l\u00e4ge     | \u2705 Klar  | Persistent        |',
  '',
  '## Mermaid-diagram',
  '',
  '```mermaid',
  'flowchart LR',
  '  A["\ud83d\udcdd Markdown"] --> B(Monaco Editor)',
  '  B --> C{Rendera}',
  '  C --> D["\ud83d\udcc4 Preview"]',
  '  C --> E["\u2b07\ufe0f Ladda ner .md"]',
  '```',
  '',
  '',
  '> "Arkitektur \u00e4r konsten att v\u00e4lja vad man ska utesluta."',
  '> \u2014 Henrik Yllemo',
  '',
  '## L\u00e4nkar',
  '',
  'Bes\u00f6k [aiwiki.se](https://aiwiki.se) f\u00f6r mer om AI och arkitektur.',
  '',
  '---',
  '',
  '*Redigera markdown till v\u00e4nster \u2014 se resultatet direkt till h\u00f6ger.*'
].join('\n');

// ── Marked config ──────────────────────────────────────
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }
});

// ── Theme ──────────────────────────────────────────────
var themeBtn = document.getElementById('theme-btn');

function applyTheme(theme, skipPersist) {
  document.documentElement.setAttribute('data-theme', theme);
  if (!skipPersist && !EMBED_MODE) {
    localStorage.setItem('theme', theme);
  }
  if (themeBtn) {
    themeBtn.textContent = theme === 'dark' ? '\u2600\ufe0f Ljust' : '\ud83c\udf19 M\u00f6rkt';
  }
  document.getElementById('hljs-theme-light').disabled = (theme === 'dark');
  document.getElementById('hljs-theme-dark').disabled  = (theme === 'light');
  if (monacoEditor) {
    monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
  }
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'default',
    securityLevel: 'loose',
    look: 'handDrawn',
    fontFamily: 'Arial, Helvetica, sans-serif',
  });
  renderPreview();
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function embedSave() {
  if (!EMBED_MODE || !monacoEditor || window.parent === window) return;
  window.parent.postMessage({ type: 'sc-markdown-save', content: monacoEditor.getValue() }, '*');
}

function embedCancel() {
  if (!EMBED_MODE || window.parent === window) return;
  window.parent.postMessage({ type: 'sc-markdown-cancel' }, '*');
}

function openDocxImport() {
  if (EMBED_MODE && window.parent !== window) {
    window.parent.postMessage({ type: 'sc-request-docx-import' }, '*');
    return;
  }
  alert('DOCX-import är tillgänglig från Skill Canvas markdown-kortet.');
}

function applyDocxMarkdown(md) {
  if (!monacoEditor || !md) return;
  monacoEditor.setValue(md);
  monacoEditor.focus();
  renderPreview();
  updateStats();
}

function initEmbedMessaging() {
  window.addEventListener('message', function(e) {
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'sc-markdown-init') {
      if (d.theme) applyTheme(d.theme, true);
      if (monacoEditor && d.content !== undefined) {
        monacoEditor.setValue(String(d.content));
        renderPreview();
        updateStats();
      }
    }
    if (d.type === 'sc-markdown-set-theme' && d.theme) {
      applyTheme(d.theme, true);
    }
    if (d.type === 'sc-docx-query-content' && monacoEditor) {
      if (e.source === window.parent) {
        window.parent.postMessage({ type: 'sc-markdown-content', content: monacoEditor.getValue() }, '*');
      }
    }
    if (d.type === 'sc-docx-apply' && monacoEditor) {
      applyDocxMarkdown(String(d.markdown || ''));
    }
  });
  window.parent.postMessage({ type: 'sc-markdown-ready' }, '*');
}

// ── Mermaid init ───────────────────────────────────────
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  look: 'handDrawn',
  fontFamily: 'Arial, Helvetica, sans-serif',
});
mermaidReady = true;

// ── Render ─────────────────────────────────────────────
function renderPreview() {
  var md = monacoEditor ? monacoEditor.getValue() : DEFAULT_CONTENT;

  // Pre-process: extract mermaid fences before marked parses them,
  // replace with placeholder divs so marked doesn't mangle them.
  var mermaidBlocks = [];
  var processed = md.replace(/```mermaid[ \t]*\r?\n([\s\S]*?)```/gi, function(_, code) {
    var idx = mermaidBlocks.length;
    mermaidBlocks.push(code.trim());
    return '<div class="mermaid-placeholder" data-idx="' + idx + '"></div>';
  });

  document.getElementById('preview-container').innerHTML = marked.parse(processed);

  // Syntax highlight non-mermaid code blocks
  document.querySelectorAll('#preview-container pre code:not(.hljs)').forEach(function(block) {
    hljs.highlightElement(block);
  });

  // Render mermaid placeholders
  if (mermaidReady && mermaidBlocks.length > 0) {
    document.querySelectorAll('#preview-container .mermaid-placeholder').forEach(function(el) {
      var idx  = parseInt(el.getAttribute('data-idx'), 10);
      var code = mermaidBlocks[idx];
      var id   = 'mermaid-' + Date.now() + '-' + idx;
      mermaid.render(id, code).then(function(result) {
        el.innerHTML = result.svg;
        el.style.overflowX = 'auto';
      }).catch(function(err) {
        el.innerHTML = '<pre style="color:#d24723;font-size:12px;padding:8px;background:var(--bg-nav);border-radius:4px">'
          + 'Mermaid-fel: ' + err.message + '</pre>';
      });
    });
  }
}

// ── Sync flash ─────────────────────────────────────────
function flashSyncIndicator() {
  var el = document.getElementById('sync-indicator');
  el.style.opacity = '1';
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function() { el.style.opacity = '0'; }, 800);
}

// ── Status bar ─────────────────────────────────────────
function updateStats() {
  if (!monacoEditor) return;
  var text  = monacoEditor.getValue();
  var words = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById('stat-words').textContent = words + ' ord';
  document.getElementById('stat-chars').textContent = text.length + ' tecken';
  document.getElementById('stat-lines').textContent = monacoEditor.getModel().getLineCount() + ' rader';
}

function updateScrollStat(ratio) {
  document.getElementById('stat-scroll').textContent = 'Scroll: ' + Math.round(ratio * 100) + '%';
}

// ── Sync scroll: preview → editor ─────────────────────
document.getElementById('preview-container').addEventListener('scroll', function() {
  if (syncLock || !monacoEditor) return;
  var preview = this;
  var previewScrollable = preview.scrollHeight - preview.clientHeight;
  if (previewScrollable <= 0) return;
  var ratio = preview.scrollTop / previewScrollable;
  syncLock = true;
  var editorScrollable = monacoEditor.getScrollHeight() - monacoEditor.getLayoutInfo().height;
  monacoEditor.setScrollTop(ratio * editorScrollable);
  updateScrollStat(ratio);
  flashSyncIndicator();
  setTimeout(function() { syncLock = false; }, 50);
});

// ── Toolbar actions ────────────────────────────────────
function insert(before, after) {
  if (!monacoEditor) return;
  var sel      = monacoEditor.getSelection();
  var selected = monacoEditor.getModel().getValueInRange(sel);
  monacoEditor.executeEdits('toolbar', [{ range: sel, text: before + (selected || 'text') + after }]);
  monacoEditor.focus();
}

function insertLine(prefix) {
  if (!monacoEditor) return;
  var pos   = monacoEditor.getPosition();
  var model = monacoEditor.getModel();
  var line  = model.getLineContent(pos.lineNumber);
  var range = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, line.length + 1);
  monacoEditor.executeEdits('toolbar', [{
    range: range,
    text: prefix + (line.startsWith(prefix) ? line.slice(prefix.length) : (line || 'text'))
  }]);
  monacoEditor.focus();
}

function insertCodeBlock() {
  if (!monacoEditor) return;
  monacoEditor.executeEdits('toolbar', [{ range: monacoEditor.getSelection(), text: '```javascript\n// kod h\u00e4r\n```' }]);
  monacoEditor.focus();
}

function insertTable() {
  if (!monacoEditor) return;
  monacoEditor.executeEdits('toolbar', [{ range: monacoEditor.getSelection(),
    text: '\n| Kolumn 1 | Kolumn 2 | Kolumn 3 |\n|----------|----------|----------|\n| Rad 1    | Data     | Data     |\n| Rad 2    | Data     | Data     |\n'
  }]);
  monacoEditor.focus();
}

function insertLink() {
  if (!monacoEditor) return;
  var sel      = monacoEditor.getSelection();
  var selected = monacoEditor.getModel().getValueInRange(sel) || 'l\u00e4nktext';
  monacoEditor.executeEdits('toolbar', [{ range: sel, text: '[' + selected + '](https://)' }]);
  monacoEditor.focus();
}

function insertImage() {
  if (!monacoEditor) return;
  var sel      = monacoEditor.getSelection();
  var selected = monacoEditor.getModel().getValueInRange(sel) || 'beskrivning';
  monacoEditor.executeEdits('toolbar', [{ range: sel, text: '![' + selected + '](https://)' }]);
  // Place cursor inside the URL parens — move back 1 char from end
  var model    = monacoEditor.getModel();
  var newSel   = monacoEditor.getSelection();
  var endLine  = newSel.endLineNumber;
  var endCol   = newSel.endColumn - 1; // before trailing )
  monacoEditor.setPosition({ lineNumber: endLine, column: endCol });
  monacoEditor.focus();
}

function insertMermaid() {
  if (!monacoEditor) return;
  var snippet = [
    '```mermaid',
    'flowchart TD',
    '  Start([Start]) --> Input[Samla in data]',
    '  Input --> Check{Data OK?}',
    '  Check -- Ja --> Render[Rendera preview]',
    '  Check -- Nej --> Fixa[Rätta till data]',
    '  Fixa --> Input',
    '  Render --> End([Klar])',
    '```'
  ].join('\n');
  monacoEditor.executeEdits('toolbar', [{ range: monacoEditor.getSelection(), text: snippet }]);
  monacoEditor.focus();
}

function copyMarkdown() {
  if (!monacoEditor) return;
  navigator.clipboard.writeText(monacoEditor.getValue());
}

function downloadMarkdown() {
  if (!monacoEditor) return;
  var content = monacoEditor.getValue();
  var now     = new Date();
  var pad     = function(n) { return String(n).padStart(2, '0'); };
  var suffix  = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  var filename = 'dokument_' + suffix + '.md';
  var blob    = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  var url     = URL.createObjectURL(blob);
  var a       = document.createElement('a');
  a.href      = url;
  a.download  = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import modal ───────────────────────────────────────
var convertedMarkdown = '';

function openImport() {
  document.getElementById('import-overlay').classList.add('open');
  setImportStatus('Väntar på inmatning\u2026', '');
}

function closeImport() {
  document.getElementById('import-overlay').classList.remove('open');
}

function overlayClick(e) {
  if (e.target === document.getElementById('import-overlay')) closeImport();
}

function clearInput(id) {
  document.getElementById(id).value = '';
}

function clearRich() {
  document.getElementById('rich-input').innerHTML = '';
}

function setImportStatus(msg, cls) {
  var el = document.getElementById('import-status');
  el.textContent = msg;
  el.className = cls || '';
}

function setConverted(md) {
  convertedMarkdown = md;
  document.getElementById('import-preview-box').textContent = md || '(tomt resultat)';
  var hasContent = md && md.trim().length > 0;
  document.getElementById('btn-copy-converted').disabled = !hasContent;
  document.getElementById('btn-import').disabled = !hasContent;
}

// ── HTML → Markdown converter ──────────────────────────
function htmlToMarkdown(html) {
  // Parse into DOM
  var doc = new DOMParser().parseFromString(html, 'text/html');

  // Strip scripts, styles, meta, comments
  ['script','style','head','nav','footer','aside','noscript','iframe','form','input','button','select','textarea'].forEach(function(tag) {
    doc.querySelectorAll(tag).forEach(function(el) { el.remove(); });
  });

  function nodeToMd(node, ctx) {
    ctx = ctx || { listDepth: 0, listType: 'ul', ordered: false };

    if (node.nodeType === 3) { // Text
      var t = node.textContent.replace(/\n+/g, ' ');
      return t;
    }
    if (node.nodeType !== 1) return '';

    var tag = node.tagName.toLowerCase();
    var children = Array.from(node.childNodes);

    function inner(extra) {
      return children.map(function(c) { return nodeToMd(c, extra || ctx); }).join('');
    }

    // Headings
    if (/^h[1-6]$/.test(tag)) {
      var level = parseInt(tag[1]);
      var hashes = '#'.repeat(level);
      return '\n\n' + hashes + ' ' + inner().trim() + '\n\n';
    }

    // Paragraphs / divs / sections
    if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main') {
      var content = inner().trim();
      if (!content) return '';
      return '\n\n' + content + '\n\n';
    }

    if (tag === 'br') return '  \n';
    if (tag === 'hr') return '\n\n---\n\n';

    // Inline formatting
    if (tag === 'strong' || tag === 'b') { var t = inner().trim(); return t ? '**' + t + '**' : ''; }
    if (tag === 'em' || tag === 'i')     { var t = inner().trim(); return t ? '_' + t + '_' : ''; }
    if (tag === 'del' || tag === 's')    { var t = inner().trim(); return t ? '~~' + t + '~~' : ''; }
    if (tag === 'mark')                  { var t = inner().trim(); return t ? '==' + t + '==' : ''; }
    if (tag === 'sup')  { return '^' + inner().trim(); }
    if (tag === 'sub')  { return '~' + inner().trim(); }

    // Code
    if (tag === 'code') {
      if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
        return inner();
      }
      return '`' + inner() + '`';
    }
    if (tag === 'pre') {
      var codeEl = node.querySelector('code');
      var lang = '';
      if (codeEl) {
        var cls = codeEl.className || '';
        var m = cls.match(/language-(\w+)/);
        if (m) lang = m[1];
      }
      var code = (codeEl ? codeEl.textContent : node.textContent).replace(/\n$/, '');
      return '\n\n```' + lang + '\n' + code + '\n```\n\n';
    }

    // Blockquote
    if (tag === 'blockquote') {
      var bq = inner().trim().split('\n').map(function(l) { return '> ' + l; }).join('\n');
      return '\n\n' + bq + '\n\n';
    }

    // Links
    if (tag === 'a') {
      var href = node.getAttribute('href') || '';
      var text = inner().trim();
      if (!text) return '';
      if (!href || href.startsWith('javascript') || href === '#') return text;
      return '[' + text + '](' + href + ')';
    }

    // Images
    if (tag === 'img') {
      var src = node.getAttribute('src') || '';
      var alt = node.getAttribute('alt') || '';
      if (!src) return alt;
      return '![' + alt + '](' + src + ')';
    }

    // Lists
    if (tag === 'ul' || tag === 'ol') {
      var newCtx = { listDepth: ctx.listDepth + 1, ordered: tag === 'ol', counter: 0 };
      var items = Array.from(node.children).filter(function(c) { return c.tagName.toLowerCase() === 'li'; });
      var result = items.map(function(li, i) {
        var indent = '  '.repeat(newCtx.listDepth - 1);
        var bullet = newCtx.ordered ? (i + 1) + '. ' : '- ';
        var liContent = Array.from(li.childNodes).map(function(c) { return nodeToMd(c, newCtx); }).join('').trim();
        return indent + bullet + liContent.replace(/\n{2,}/g, '\n' + indent + '  ');
      }).join('\n');
      return '\n\n' + result + '\n\n';
    }
    if (tag === 'li') {
      return inner().trim();
    }

    // Tables
    if (tag === 'table') {
      return tableToMd(node);
    }
    if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot' || tag === 'tr' || tag === 'th' || tag === 'td') {
      return inner();
    }

    // Details / Summary
    if (tag === 'summary') return '**' + inner().trim() + '**';
    if (tag === 'details') return '\n\n' + inner().trim() + '\n\n';

    // Span, abbr, cite, etc — just pass through
    return inner();
  }

  function tableToMd(table) {
    var rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return '';

    var data = rows.map(function(row) {
      return Array.from(row.querySelectorAll('th, td')).map(function(cell) {
        return cell.textContent.replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');
      });
    });

    if (!data.length || !data[0].length) return '';

    var cols = data[0].length;
    var header = data[0];
    var body   = data.slice(1);
    var sep    = header.map(function() { return '---'; });

    var lines = ['| ' + header.join(' | ') + ' |', '| ' + sep.join(' | ') + ' |'];
    body.forEach(function(row) {
      while (row.length < cols) row.push('');
      lines.push('| ' + row.slice(0, cols).join(' | ') + ' |');
    });

    return '\n\n' + lines.join('\n') + '\n\n';
  }

  var raw = nodeToMd(doc.body);

  // Clean up: collapse 3+ blank lines → 2, trim leading/trailing
  return raw
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function convertHtml() {
  var html = document.getElementById('html-input').value.trim();
  if (!html) { setImportStatus('Klistra in HTML-kod f\u00f6rst.', 'err'); return; }
  try {
    var md = htmlToMarkdown(html);
    setConverted(md);
    var lines = md.split('\n').length;
    setImportStatus('\u2705 Konverterat \u2014 ' + lines + ' rader markdown genererade.', 'ok');
  } catch(e) {
    setImportStatus('\u274c Fel vid konvertering: ' + e.message, 'err');
  }
}

// ── Richtext → Markdown converter ─────────────────────
function convertRich() {
  var el = document.getElementById('rich-input');
  var html = el.innerHTML.trim();
  if (!html || el.textContent.trim() === '') {
    setImportStatus('Klistra in richtext f\u00f6rst.', 'err');
    return;
  }
  try {
    var md = htmlToMarkdown(html);
    setConverted(md);
    var lines = md.split('\n').length;
    setImportStatus('\u2705 Konverterat fr\u00e5n richtext \u2014 ' + lines + ' rader markdown.', 'ok');
  } catch(e) {
    setImportStatus('\u274c Fel vid konvertering: ' + e.message, 'err');
  }
}

function copyConverted() {
  if (!convertedMarkdown) return;
  navigator.clipboard.writeText(convertedMarkdown).then(function() {
    setImportStatus('\ud83d\udccb Kopierat till urklipp!', 'ok');
  });
}

function importToEditor() {
  if (!convertedMarkdown || !monacoEditor) return;
  var current = monacoEditor.getValue().trim();
  var doReplace = true;
  if (current) {
    doReplace = confirm('Editorn har redan inneh\u00e5ll.\nErs\u00e4tt allt — eller l\u00e4gg till i slutet?\n\nOK = Ers\u00e4tt\nAvbryt = L\u00e4gg till i slutet');
  }
  if (doReplace) {
    monacoEditor.setValue(convertedMarkdown);
  } else {
    var existing = monacoEditor.getValue();
    monacoEditor.setValue(existing + '\n\n---\n\n' + convertedMarkdown);
  }
  monacoEditor.focus();
  closeImport();
  setImportStatus('Väntar p\u00e5 inmatning\u2026', '');
  setConverted('');
}

function clearEditor() {
  if (!monacoEditor) return;
  if (confirm('Rensa allt inneh\u00e5ll?')) { monacoEditor.setValue(''); monacoEditor.focus(); }
}

// ── Resizable divider ──────────────────────────────────
(function() {
  var divider     = document.getElementById('divider');
  var layout      = document.getElementById('layout');
  var editorPane  = document.getElementById('editor-pane');
  var previewPane = document.getElementById('preview-pane');
  var dragging    = false;

  divider.addEventListener('mousedown', function(e) {
    dragging = true;
    divider.classList.add('dragging');
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    var rect    = layout.getBoundingClientRect();
    var leftPct = Math.max(20, Math.min(80, ((e.clientX - rect.left) / (rect.width - 4)) * 100));
    editorPane.style.flex  = 'none';
    editorPane.style.width = leftPct + '%';
    previewPane.style.flex = '1';
    previewPane.style.width = '';
    if (monacoEditor) monacoEditor.layout();
  });

  document.addEventListener('mouseup', function() {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('dragging');
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    if (monacoEditor) monacoEditor.layout();
  });
})();

// ── Keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (EMBED_MODE) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); embedSave(); return; }
    if (e.key === 'Escape') { embedCancel(); return; }
  }
  if (!EMBED_MODE && (e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); toggleTheme(); }
  if (e.key === 'Escape') { closeImport(); }
});

// ── Monaco init ────────────────────────────────────────
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

require(['vs/editor/editor.main'], function() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  monacoEditor = monaco.editor.create(document.getElementById('editor-container'), {
    value: DEFAULT_CONTENT,
    language: 'markdown',
    theme: isDark ? 'vs-dark' : 'vs',
    fontSize: 14,
    lineHeight: 22,
    wordWrap: 'on',
    minimap: { enabled: true, scale: 1 },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    renderWhitespace: 'none',
    folding: true,
    lineNumbers: 'on',
    glyphMargin: false,
    padding: { top: 12, bottom: 40 },
    fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
    fontLigatures: true,
    automaticLayout: true,
  });

  renderPreview();

  monacoEditor.onDidChangeModelContent(function() {
    renderPreview();
    updateStats();
  });

  monacoEditor.onDidScrollChange(function(e) {
    if (syncLock) return;
    var scrollable = monacoEditor.getScrollHeight() - monacoEditor.getLayoutInfo().height;
    if (scrollable <= 0) return;
    var ratio = e.scrollTop / scrollable;
    syncLock = true;
    var preview           = document.getElementById('preview-container');
    var previewScrollable = preview.scrollHeight - preview.clientHeight;
    preview.scrollTop     = ratio * previewScrollable;
    updateScrollStat(ratio);
    flashSyncIndicator();
    setTimeout(function() { syncLock = false; }, 50);
  });

  updateStats();

  if (EMBED_MODE) {
    initEmbedMessaging();
  }

  // ── Smart Enter: fortsätt listor och kryssrutor ────────
  monacoEditor.addCommand(monaco.KeyCode.Enter, function() {
    var model    = monacoEditor.getModel();
    var pos      = monacoEditor.getPosition();
    var line     = model.getLineContent(pos.lineNumber);

    // Checkbox: "- [ ] text" or "- [x] text"
    var cbMatch = line.match(/^(\s*)-\s\[([ xX])\]\s(.*)$/);
    if (cbMatch) {
      var indent  = cbMatch[1];
      var content = cbMatch[3].trim();
      if (!content) {
        // Empty checkbox → exit list, replace line with blank
        var range = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, line.length + 1);
        monacoEditor.executeEdits('enter', [{ range: range, text: '' }]);
        return;
      }
      // Insert new unchecked checkbox
      var insert = '\n' + indent + '- [ ] ';
      monacoEditor.executeEdits('enter', [{
        range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text: insert
      }]);
      return;
    }

    // Unordered list: "- text" or "* text"
    var ulMatch = line.match(/^(\s*)([-*])\s(.*)$/);
    if (ulMatch) {
      var indent  = ulMatch[1];
      var bullet  = ulMatch[2];
      var content = ulMatch[3].trim();
      if (!content) {
        // Empty item → exit list
        var range = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, line.length + 1);
        monacoEditor.executeEdits('enter', [{ range: range, text: '' }]);
        return;
      }
      var insert = '\n' + indent + bullet + ' ';
      monacoEditor.executeEdits('enter', [{
        range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text: insert
      }]);
      return;
    }

    // Ordered list: "1. text" or "  2. text"
    var olMatch = line.match(/^(\s*)(\d+)\.\s(.*)$/);
    if (olMatch) {
      var indent  = olMatch[1];
      var num     = parseInt(olMatch[2], 10);
      var content = olMatch[3].trim();
      if (!content) {
        // Empty item → exit list
        var range = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, line.length + 1);
        monacoEditor.executeEdits('enter', [{ range: range, text: '' }]);
        return;
      }
      var insert = '\n' + indent + (num + 1) + '. ';
      monacoEditor.executeEdits('enter', [{
        range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text: insert
      }]);
      return;
    }

    // Default — let Monaco handle it normally
    monacoEditor.trigger('keyboard', 'type', { text: '\n' });
  });
});

// ── Init theme (LAST — after all functions defined) ────
if (EMBED_MODE) {
  applyTheme(INITIAL_THEME, true);
} else {
  (function() {
    var saved = localStorage.getItem('theme') || 'light';
    applyTheme(saved);
  })();
}
</script>
</body>
</html>
