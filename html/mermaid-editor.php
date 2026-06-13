<?php
declare(strict_types=1);

$embed = isset($_GET['embed']) && $_GET['embed'] === '1';
$theme = in_array($_GET['theme'] ?? '', ['light', 'dark'], true) ? $_GET['theme'] : 'light';
?>
<!DOCTYPE html>
<html lang="sv" data-theme="<?= htmlspecialchars($theme, ENT_QUOTES, 'UTF-8') ?>">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Mermaid Editor</title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/editor-credit.css">
<script>
(function(){
  var t = document.documentElement.getAttribute('data-theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
})();
</script>
<style>
/* ── TOKENS ── */
:root {
  --accent:        #0077bc;
  --accent-hover:  #005799;
  --accent-dim:    rgba(0,119,188,.15);

  --bg:            #FFFFFE;
  --bg-panel:      #F4F9FC;
  --bg-toolbar:    #F4F9FC;
  --bg-header:     #0077bc;
  --bg-statusbar:  #0077bc;
  --bg-preview:    #E8EEF4;
  --bg-card:       #FFFFFE;

  --text:          #333333;
  --text-bright:   #1F1F1F;
  --text-muted:    #6E6E6E;
  --text-header:   #ffffff;

  --border:        #C8D0D8;
  --border-light:  #B0BAC0;
  --radius:        4px;
  --shadow:        0 2px 8px rgba(0,0,0,.09);
  --success:       #27ae60;
  --error:         #d24723;
  --warning:       #cca700;
}
[data-theme="dark"] {
  --bg:            #1F1F1F;
  --bg-panel:      #242B32;
  --bg-toolbar:    #141414;
  --bg-header:     #0077bc;
  --bg-preview:    #111519;
  --bg-card:       #242B32;
  --text:          #FFFFFF;
  --text-bright:   #FFFFFF;
  --text-muted:    #B0BAC0;
  --border:        #444444;
  --border-light:  #555555;
  --shadow:        0 2px 8px rgba(0,0,0,.45);
}

*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html,body { height: 100%; overflow: hidden; font-family: -apple-system, 'Segoe UI', Arial, sans-serif; font-size: 13px; background: var(--bg); color: var(--text); }

/* ── HEADER ── */
header {
  height: 40px;
  background: var(--bg-header);
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 10px;
  flex-shrink: 0;
  border-bottom: 1px solid #000;
  position: relative;
  z-index: 100;
}
.logo-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-icon {
  width: 22px; height: 22px;
  background: var(--accent);
  border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.logo-icon svg { width: 14px; height: 14px; fill: #fff; }
.logo-name {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: .01em;
}
.logo-badge {
  background: var(--accent);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  letter-spacing: .05em;
  text-transform: uppercase;
}
.header-spacer { flex: 1; }

/* header link buttons */
.h-link {
  display: flex;
  align-items: center;
  gap: 5px;
  color: rgba(255,255,255,.65);
  font-size: 12px;
  text-decoration: none;
  padding: 4px 9px;
  border-radius: var(--radius);
  border: 1px solid rgba(255,255,255,.12);
  transition: all .15s;
  white-space: nowrap;
}
.h-link:hover { color: #fff; border-color: rgba(255,255,255,.35); background: rgba(255,255,255,.06); }
.h-link svg { width: 12px; height: 12px; fill: currentColor; flex-shrink: 0; }

/* header icon buttons */
.h-btn {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  color: rgba(255,255,255,.75);
  border-radius: var(--radius);
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  transition: all .15s;
  white-space: nowrap;
}
.h-btn:hover { background: rgba(255,255,255,.13); color: #fff; border-color: rgba(255,255,255,.3); }
.h-btn svg { width: 13px; height: 13px; fill: currentColor; }
.h-btn-accent {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.h-btn-accent:hover { background: var(--accent-hover); border-color: var(--accent-hover); color: #fff; }

/* ── TOOLBAR ── */
.toolbar {
  height: 38px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 6px;
  flex-shrink: 0;
  overflow-x: auto;
}
.toolbar::-webkit-scrollbar { height: 0; }
.toolbar-sep { width: 1px; height: 18px; background: var(--border-light); margin: 0 3px; flex-shrink: 0; }
.toolbar-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .07em;
  white-space: nowrap;
}

.tb-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text);
  border-radius: var(--radius);
  padding: 3px 9px;
  font-size: 12px;
  cursor: pointer;
  display: flex; align-items: center; gap: 5px;
  white-space: nowrap;
  transition: all .12s;
}
.tb-btn:hover { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
.tb-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.tb-btn svg { width: 12px; height: 12px; fill: currentColor; flex-shrink: 0; }

/* dropdown */
.dd { position: relative; }
.dd-menu {
  display: none;
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0,0,0,.5);
  z-index: 9000;
  min-width: 210px;
  padding: 4px 0;
}
.dd-menu.open { display: block; }
.dd-section {
  padding: 4px 12px 2px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .07em;
}
.dd-item {
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  color: var(--text);
  transition: background .1s;
}
.dd-item:hover { background: var(--accent-dim); color: var(--accent); }
.dd-item svg { width: 13px; height: 13px; fill: currentColor; opacity: .7; flex-shrink: 0; }

/* ── WORKSPACE ── */
.workspace {
  display: flex;
  height: calc(100vh - 40px - 38px - 22px);
  overflow: hidden;
}

/* ── EDITOR PANE ── */
.pane-editor {
  display: flex;
  flex-direction: column;
  width: 48%;
  min-width: 220px;
  background: var(--bg);
  border-right: 1px solid var(--border);
  position: relative;
}
.pane-bar {
  display: flex;
  align-items: center;
  padding: 0 10px;
  height: 30px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  gap: 6px;
  flex-shrink: 0;
}
.pane-tab {
  font-size: 12px;
  color: var(--text-muted);
  padding: 0 10px;
  height: 100%;
  display: flex; align-items: center; gap: 5px;
  border-bottom: 2px solid transparent;
  transition: color .12s;
}
.pane-tab.active { color: var(--text-bright); border-bottom-color: var(--accent); }
.pane-tab svg { width: 12px; height: 12px; fill: currentColor; }

#monaco-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── RESIZER ── */
.resizer {
  width: 5px;
  background: var(--border);
  cursor: col-resize;
  flex-shrink: 0;
  transition: background .15s;
  position: relative;
}
.resizer:hover, .resizer.dragging { background: var(--accent); }

/* ── PREVIEW PANE ── */
.pane-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-preview);
}
.preview-bar {
  display: flex;
  align-items: center;
  padding: 0 10px;
  height: 30px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  gap: 6px;
  flex-shrink: 0;
}
.zoom-row {
  display: flex; align-items: center; gap: 3px;
  margin-left: auto;
}
.z-btn {
  background: transparent;
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  border-radius: var(--radius);
  width: 22px; height: 22px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
  transition: all .12s;
}
.z-btn:hover { color: var(--accent); border-color: var(--accent); }
.z-btn.text { width: auto; padding: 0 7px; font-size: 11px; }
.z-label { font-size: 11px; color: var(--text-muted); min-width: 36px; text-align: center; }

.preview-canvas {
  flex: 1;
  overflow: hidden;
  position: relative;
  cursor: grab;
  user-select: none;
}
.preview-canvas.panning { cursor: grabbing; }

/* infinite canvas layer */
.canvas-layer {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}

.diagram-wrap {
  position: absolute;
  /* positioned by JS transform */
  transform-origin: 0 0;
  pointer-events: auto;
}
#diagram-out {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 28px;
  box-shadow: var(--shadow);
  min-width: 180px;
  display: inline-block;
}
#diagram-out svg { display: block; }
.empty-hint {
  color: var(--text-muted);
  font-size: 13px;
  padding: 8px 0;
  line-height: 1.7;
}
.err-box {
  background: rgba(241,76,76,.08);
  border: 1px solid rgba(241,76,76,.35);
  border-radius: var(--radius);
  padding: 14px 16px;
  color: #f14c4c;
  font-size: 12px;
  font-family: 'Cascadia Code','Fira Code',monospace;
  white-space: pre-wrap;
  max-width: 480px;
  line-height: 1.6;
}

/* ── STATUS BAR ── */
.statusbar {
  height: 22px;
  background: var(--bg-statusbar);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 14px;
  flex-shrink: 0;
}
.sb-item {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px;
  color: rgba(255,255,255,.85);
}
.sb-item svg { width: 11px; height: 11px; fill: currentColor; }
.sb-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.6); }
.sb-dot.ok { background: #4ec94e; }
.sb-dot.err { background: #f14c4c; }
.sb-dot.spin { background: #cca700; animation: spin-pulse .8s infinite; }
@keyframes spin-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
.sb-spacer { flex: 1; }

/* ── TOAST ── */
.toast-wrap {
  position: fixed; bottom: 32px; right: 16px;
  z-index: 9999;
  display: flex; flex-direction: column; gap: 6px;
}
.toast {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius);
  padding: 8px 14px;
  font-size: 12px;
  color: var(--text);
  box-shadow: var(--shadow);
  animation: tIn .18s ease;
  max-width: 280px;
}
.toast.ok { border-left-color: var(--success); }
.toast.err { border-left-color: var(--error); }
@keyframes tIn { from{transform:translateX(12px);opacity:0} to{transform:translateX(0);opacity:1} }

body.embed-mode .h-link:not(.editor-credit),
body.embed-mode .h-btn:not(.h-btn-embed),
body.embed-mode #themeBtn,
body.embed-mode header > .toolbar-sep { display: none !important; }
body.embed-mode .editor-credit {
  display: inline-flex !important;
  margin-left: 4px;
}
body:not(.embed-mode) .h-btn-embed { display: none !important; }
.h-btn-embed { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.25); color: #fff; }
.h-btn-embed.h-btn-accent { background: #27ae60; border-color: #1e8449; }
.h-btn-embed.h-btn-accent:hover { background: #2ecc71; border-color: #27ae60; }
</style>
</head>
<body<?= $embed ? ' class="embed-mode"' : '' ?>>

<!-- ══ HEADER ══ -->
<header>
  <div class="logo-wrap">
    <div class="logo-icon">
      <!-- Mermaid-inspired graph icon -->
      <svg viewBox="0 0 20 20"><circle cx="4" cy="10" r="2.5"/><circle cx="16" cy="4" r="2.5"/><circle cx="16" cy="16" r="2.5"/><line x1="6" y1="9" x2="14" y2="5" stroke="#fff" stroke-width="1.5" fill="none"/><line x1="6" y1="11" x2="14" y2="15" stroke="#fff" stroke-width="1.5" fill="none"/></svg>
    </div>
    <span class="logo-name">Mermaid Editor</span>
    <span class="logo-badge">v11.15.0</span>
  </div>

  <!-- Official project links -->
  <a class="h-link editor-credit" href="https://mermaid.js.org/" target="_blank" rel="noopener noreferrer" title="Officiell dokumentation för Mermaid">
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 1h-3a.5.5 0 000 1h1.793L6.146 8.146a.5.5 0 00.708.708L13 2.707V4.5a.5.5 0 001 0v-3A.5.5 0 0013.5 1z"/><path d="M11 2.5H3A1.5 1.5 0 001.5 4v9A1.5 1.5 0 003 14.5h9a1.5 1.5 0 001.5-1.5V8a.5.5 0 00-1 0v4.5a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5h8a.5.5 0 000-1z"/></svg>
    Powered by <strong>mermaid.js.org</strong>
  </a>
  <a class="h-link editor-credit" href="https://mermaid.live/" target="_blank" rel="noopener noreferrer" title="Officiell live-editor">
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 1h-3a.5.5 0 000 1h1.793L6.146 8.146a.5.5 0 00.708.708L13 2.707V4.5a.5.5 0 001 0v-3A.5.5 0 0013.5 1z"/><path d="M11 2.5H3A1.5 1.5 0 001.5 4v9A1.5 1.5 0 003 14.5h9a1.5 1.5 0 001.5-1.5V8a.5.5 0 00-1 0v4.5a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5h8a.5.5 0 000-1z"/></svg>
    <strong>mermaid.live</strong>
  </a>

  <div class="header-spacer"></div>

  <button class="h-btn h-btn-accent h-btn-embed" type="button" onclick="embedSave()" title="Spara tillbaka till kortet">✓ Spara till kort</button>
  <button class="h-btn h-btn-embed" type="button" onclick="embedCancel()" title="Stäng utan att spara">✕ Avbryt</button>

  <div class="toolbar-sep" style="background:rgba(255,255,255,.15);height:20px;margin:0 4px;"></div>

  <!-- Actions -->
  <button class="h-btn" onclick="exportPNG()">
    <svg viewBox="0 0 16 16"><path d="M2 2h8.5L13 4.5V14H2V2zm1 1v10h9V5h-3V3H3zm6 0v1.5h1.5L9 3zM4 7h8v1H4V7zm0 2h8v1H4V9zm0 2h5v1H4v-1z"/></svg>
    PNG
  </button>
  <button class="h-btn" onclick="exportSVG()">
    <svg viewBox="0 0 16 16"><path d="M2 2h8.5L13 4.5V14H2V2zm1 1v10h9V5h-3V3H3zm6 0v1.5h1.5L9 3zM5 8.5C5 7.12 6.12 6 7.5 6S10 7.12 10 8.5 8.88 11 7.5 11 5 9.88 5 8.5zm1 0C6 9.33 6.67 10 7.5 10S9 9.33 9 8.5 8.33 7 7.5 7 6 7.67 6 8.5z"/></svg>
    SVG
  </button>
  <button class="h-btn" onclick="copyImage()">
    <svg viewBox="0 0 16 16"><path d="M4 4h8v1H4V4zm0 2h8v1H4V6zm0 2h5v1H4V8zM1 1h10v2h1V1a1 1 0 00-1-1H1a1 1 0 00-1 1v11a1 1 0 001 1h2v-1H1V1z"/><path d="M4 5h10v10H4V5zm1 1v8h8V6H5z"/></svg>
    Kopiera bild
  </button>
  <button class="h-btn h-btn-accent" onclick="shareLink()">
    <svg viewBox="0 0 16 16"><path d="M6.354 5.5H4a3 3 0 000 6h3a3 3 0 002.83-2H8.87A2 2 0 017 10H4a2 2 0 010-4h2.354l1-1zM9 5a3 3 0 00-2.83 2H7.13A2 2 0 019 6h3a2 2 0 010 4h-2.354l-1 1H12a3 3 0 000-6H9z"/></svg>
    Dela
  </button>
  <button class="h-btn" onclick="toggleTheme()" id="themeBtn" title="Växla ljust/mörkt läge">
    <svg id="themeIcon" viewBox="0 0 16 16"><path d="M8 1a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 018 1zm0 11a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 018 12zm-5-4a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1A.5.5 0 013 8zm9.5-.5h1a.5.5 0 010 1h-1a.5.5 0 010-1zM5.05 3.636a.5.5 0 01.707 0L6.464 4.343a.5.5 0 01-.707.707L5.05 4.343a.5.5 0 010-.707zm5.536 6.364a.5.5 0 01.707 0l.707.707a.5.5 0 01-.707.707l-.707-.707a.5.5 0 010-.707zM3.636 10.95a.5.5 0 010 .707l-.707.707a.5.5 0 01-.707-.707l.707-.707a.5.5 0 01.707 0zm8.485-7.778a.5.5 0 010 .707l-.707.707a.5.5 0 11-.707-.707l.707-.707a.5.5 0 01.707 0zM8 5a3 3 0 100 6A3 3 0 008 5z"/></svg>
  </button>
</header>

<!-- ══ TOOLBAR ══ -->
<div class="toolbar">
  <span class="toolbar-label">Exempeldiagram</span>

  <!-- Flowcharts -->
  <div class="dd" id="dd-flow">
    <button class="tb-btn" onclick="ddToggle('dd-flow')">
      <svg viewBox="0 0 16 16"><path d="M6 3.5A1.5 1.5 0 017.5 2h1A1.5 1.5 0 0110 3.5v1A1.5 1.5 0 018.5 6h-1A1.5 1.5 0 016 4.5v-1zm1.5-.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm-5 6A1.5 1.5 0 013.5 8h1A1.5 1.5 0 016 9.5v1A1.5 1.5 0 014.5 12h-1A1.5 1.5 0 012 10.5v-1zm1.5-.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm7 0A1.5 1.5 0 0112.5 8h-1A1.5 1.5 0 0110 9.5v1a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-1zm-1.5-.5a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5h1zM8 5v1.5M8 6.5 4 8M8 6.5l4 1.5" stroke="currentColor" stroke-width="1" fill="none"/></svg>
      Diagram
      <svg viewBox="0 0 10 6" style="width:9px;height:9px;"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
    </button>
    <div class="dd-menu" id="dd-flowMenu">
      <div class="dd-section">Flöden &amp; Process</div>
      <div class="dd-item" onclick="loadSample('flowchart')"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>Flödesdiagram</div>
      <div class="dd-item" onclick="loadSample('sequence')"><svg viewBox="0 0 16 16"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>Sekvensdiagram</div>
      <div class="dd-item" onclick="loadSample('state')"><svg viewBox="0 0 16 16"><circle cx="4" cy="8" r="2.5" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="12" cy="8" r="2.5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M6.5 8h3" stroke="currentColor" stroke-width="1.2"/></svg>Tillståndsdiagram</div>
      <div class="dd-section">Data &amp; Modell</div>
      <div class="dd-item" onclick="loadSample('er')"><svg viewBox="0 0 16 16"><rect x="2" y="4" width="5" height="8" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="9" y="4" width="5" height="8" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="7" y1="8" x2="9" y2="8" stroke="currentColor" stroke-width="1.2"/></svg>ER-diagram</div>
      <div class="dd-item" onclick="loadSample('class')"><svg viewBox="0 0 16 16"><rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="3" y1="6" x2="13" y2="6" stroke="currentColor" stroke-width="1.2"/></svg>Klassdiagram</div>
      <div class="dd-section">Tid &amp; Planering</div>
      <div class="dd-item" onclick="loadSample('gantt')"><svg viewBox="0 0 16 16"><rect x="2" y="4" width="7" height="2" fill="currentColor" rx="1"/><rect x="5" y="7" width="9" height="2" fill="currentColor" rx="1" opacity=".6"/><rect x="3" y="10" width="5" height="2" fill="currentColor" rx="1" opacity=".4"/></svg>Gantt</div>
      <div class="dd-item" onclick="loadSample('timeline')"><svg viewBox="0 0 16 16"><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="8" r="1.5" fill="currentColor"/><circle cx="9" cy="8" r="1.5" fill="currentColor"/><circle cx="13" cy="8" r="1.5" fill="currentColor"/></svg>Tidslinje</div>
      <div class="dd-section">Övrigt</div>
      <div class="dd-item" onclick="loadSample('mindmap')"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="2" fill="currentColor"/><line x1="8" y1="6" x2="8" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="10" x2="8" y2="14" stroke="currentColor" stroke-width="1.2"/><line x1="6" y1="8" x2="2" y2="8" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.2"/></svg>Mindmap</div>
      <div class="dd-item" onclick="loadSample('quadrant')"><svg viewBox="0 0 16 16"><line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="1.2"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.2"/><circle cx="5" cy="5" r="1.2" fill="currentColor"/><circle cx="11" cy="4" r="1.2" fill="currentColor"/><circle cx="4" cy="11" r="1.2" fill="currentColor"/></svg>Quadrant</div>
      <div class="dd-item" onclick="loadSample('kanban')"><svg viewBox="0 0 16 16"><rect x="2" y="3" width="3" height="10" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="6.5" y="3" width="3" height="10" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="11" y="3" width="3" height="10" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>Kanban</div>
      <div class="dd-item" onclick="loadSample('xychart')"><svg viewBox="0 0 16 16"><polyline points="2,12 5,7 8,9 11,4 14,6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>XY-diagram</div>
      <div class="dd-item" onclick="loadSample('pie')"><svg viewBox="0 0 16 16"><path d="M8 2a6 6 0 016 6H8V2z" fill="currentColor" opacity=".8"/><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>Cirkeldiagram</div>
      <div class="dd-item" onclick="loadSample('sankey')"><svg viewBox="0 0 16 16"><path d="M2 4h4v2H2zm8 0h4v4h-4zM6 5c2 0 2 4 4 4" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>Sankey</div>
      <div class="dd-item" onclick="loadSample('architecture')"><svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="4" y="4" width="4" height="3" rx="1" fill="currentColor" opacity=".6"/><rect x="9" y="4" width="4" height="3" rx="1" fill="currentColor" opacity=".6"/><rect x="4" y="9" width="9" height="3" rx="1" fill="currentColor" opacity=".4"/></svg>Arkitektur</div>
      <div class="dd-item" onclick="loadSample('c4')"><svg viewBox="0 0 16 16"><circle cx="8" cy="4" r="2" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="2" y="8" width="4" height="3" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="10" y="8" width="4" height="3" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="8" y1="6" x2="4" y2="8" stroke="currentColor" stroke-width="1"/><line x1="8" y1="6" x2="12" y2="8" stroke="currentColor" stroke-width="1"/></svg>C4 Kontext</div>
      <div class="dd-item" onclick="loadSample('ishikawa')"><svg viewBox="0 0 16 16"><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.4"/><line x1="14" y1="8" x2="11" y2="6" stroke="currentColor" stroke-width="1.2"/><line x1="14" y1="8" x2="11" y2="10" stroke="currentColor" stroke-width="1.2"/><line x1="5" y1="8" x2="4" y2="5" stroke="currentColor" stroke-width="1"/><line x1="5" y1="8" x2="4" y2="11" stroke="currentColor" stroke-width="1"/><line x1="9" y1="8" x2="8" y2="5" stroke="currentColor" stroke-width="1"/><line x1="9" y1="8" x2="8" y2="11" stroke="currentColor" stroke-width="1"/></svg>Ishikawa (fiskben)</div>
    </div>
  </div>

  <div class="toolbar-sep"></div>
  <span class="toolbar-label">Åtgärder</span>

  <button class="tb-btn" onclick="copyCode()">
    <svg viewBox="0 0 16 16"><path d="M4 4h8v1H4V4zm0 2h8v1H4V6zm0 2h5v1H4V8zM1 1h10v2h1V1a1 1 0 00-1-1H1a1 1 0 00-1 1v11a1 1 0 001 1h2v-1H1V1z"/><path d="M4 5h10v10H4V5zm1 1v8h8V6H5z"/></svg>
    Kopiera kod
  </button>
  <button class="tb-btn" onclick="clearEditor()">
    <svg viewBox="0 0 16 16"><path d="M6.5 1h3a.5.5 0 01.5.5v1H6v-1a.5.5 0 01.5-.5zm5.5 1H4a.5.5 0 000 1h.5l.83 10.4A1 1 0 006.33 14h3.34a1 1 0 001-.6L11.5 3H12a.5.5 0 000-1zM5.52 3h4.96l-.78 9.8H6.3L5.52 3z"/></svg>
    Rensa
  </button>
  <button class="tb-btn" onclick="formatCode()">
    <svg viewBox="0 0 16 16"><path d="M1 2h14v1H1V2zm0 3h10v1H1V5zm0 3h14v1H1V8zm0 3h10v1H1v-1z"/></svg>
    Formatera
  </button>

  <div class="toolbar-sep"></div>

  <button class="tb-btn active" id="autoBtn" onclick="toggleAutoRender()">
    <svg viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 010 .708L8.207 10 6.5 8.293l-2.854 2.853a.5.5 0 01-.707-.707L6 7.293 7.707 9l5.44-5.354a.5.5 0 01.707 0z"/></svg>
    Auto
  </button>
  <button class="tb-btn" onclick="renderDiagram()">
    <svg viewBox="0 0 16 16"><path d="M6 3l8 5-8 5V3z" fill="currentColor"/></svg>
    Rendera
  </button>
</div>

<!-- ══ WORKSPACE ══ -->
<div class="workspace" id="workspace">

  <!-- EDITOR -->
  <div class="pane-editor" id="paneEditor">
    <div class="pane-bar">
      <div class="pane-tab active">
        <svg viewBox="0 0 16 16"><path d="M13.354 3.354L12.646 2.646 8 7.293 3.354 2.646l-.708.708L7.293 8l-4.647 4.646.708.708L8 8.707l4.646 4.647.708-.708L8.707 8z" fill="none" stroke="currentColor" stroke-width=".3"/><path d="M2 2h3v1H3v10h2v1H2V2zm9 0h3v12h-3v-1h2V3h-2V2z"/></svg>
        diagram.mmd
      </div>
    </div>
    <div id="monaco-container"></div>
  </div>

  <div class="resizer" id="resizer"></div>

  <!-- PREVIEW -->
  <div class="pane-preview">
    <div class="preview-bar">
      <div class="pane-tab active">
        <svg viewBox="0 0 16 16"><path d="M15 8s-3-5.5-7-5.5S1 8 1 8s3 5.5 7 5.5S15 8 15 8zM8 11.5A3.5 3.5 0 118 5a3.5 3.5 0 010 6.5zM8 7a1 1 0 100 2A1 1 0 008 7z"/></svg>
        Förhandsgranskning
      </div>
      <div class="zoom-row">
        <button class="z-btn" onclick="changeZoom(-15)" title="Zooma ut (−15%)">−</button>
        <span class="z-label" id="zoomLbl">100%</span>
        <button class="z-btn" onclick="changeZoom(15)" title="Zooma in (+15%)">+</button>
        <button class="z-btn text" onclick="resetZoom()">1:1</button>
        <button class="z-btn text" onclick="fitZoom()">Anpassa</button>
      </div>
    </div>
    <div class="preview-canvas" id="previewCanvas">
      <div class="diagram-wrap" id="diagWrap">
        <div id="diagram-out">
          <div class="empty-hint">Välj ett exempeldiagram i verktygsfältet<br>eller börja skriva Mermaid-kod.</div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══ STATUS BAR ══ -->
<div class="statusbar">
  <div class="sb-item">
    <div class="sb-dot" id="sbDot"></div>
    <span id="sbText">Redo</span>
  </div>
  <div class="sb-item">
    <svg viewBox="0 0 16 16"><path d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zM2 2h12v12H2V2z"/></svg>
    Mermaid v11
  </div>
  <div class="sb-spacer"></div>
  <div class="sb-item" id="sbChars">0 tecken</div>
  <div class="sb-item" id="sbLines">Rad 1, Kol 1</div>
</div>

<div class="toast-wrap" id="toasts"></div>

<!-- Monaco + Mermaid -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.0/min/vs/loader.min.js"></script>
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.esm.min.mjs';

const EMBED_MODE = <?= $embed ? 'true' : 'false' ?>;

/* ══ STATE ══ */
let autoRender = true;
let renderTimer = null;
let mCounter = 0;
let editor = null;

/* ══ MERMAID ══ */
function mermaidTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
}
// Register logos icon pack (AWS, GCP, Azure, etc.) for architecture-beta diagrams
mermaid.registerIconPacks([
  {
    name: 'logos',
    loader: () => fetch('https://unpkg.com/@iconify-json/logos@1/icons.json').then(r => r.json()),
  },
]);

function initMermaid() {
  mermaid.initialize({ startOnLoad:false, theme:mermaidTheme(), securityLevel:'loose', fontFamily:'Arial,sans-serif' });
}
/* initMermaid() is called in INIT after theme is applied */

/* ══ MONACO ══ */
// Suppress Monaco web worker warnings in CSP-sandboxed environments.
// Returning a stub (not null) prevents "Cannot read properties of null (reading 'then')"
// since Monaco sometimes calls .then() on the worker return value.
(function() {
  function NoopWorker() {
    this.postMessage = function() {};
    this.terminate   = function() {};
    this.addEventListener    = function() {};
    this.removeEventListener = function() {};
  }
  NoopWorker.prototype.then = undefined; // not a Promise
  window.MonacoEnvironment = { getWorker: function() { return new NoopWorker(); } };
})();

require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.0/min/vs' } });

require(['vs/editor/editor.main'], function() {
  /* ── Register Mermaid language ── */
  monaco.languages.register({ id: 'mermaid' });

  monaco.languages.setMonarchTokensProvider('mermaid', {
    keywords: [
      'graph','flowchart','sequenceDiagram','classDiagram','stateDiagram','stateDiagram-v2',
      'erDiagram','gantt','pie','gitGraph','mindmap','timeline','kanban','quadrantChart',
      'xychart-beta','sankey-beta','block-beta','architecture-beta','C4Context','C4Container',
      'C4Component','ishikawa-beta','ishikawa','TD','LR','RL','BT','TB'
    ],
    keywords2: [
      'participant','actor','activate','deactivate','loop','alt','else','opt','par','and',
      'end','note','over','left of','right of','section','title','dateFormat','axisFormat',
      'classDef','class','direction','subgraph','state','choice','fork','join','group',
      'service','in','Person','System','Rel','System_Ext','column','done','active',
      'click','callback','href','call','cause','X-Axis','Y-Axis','branches','branch'
    ],
    tokenizer: {
      root: [
        [/%%.*$/, 'comment'],
        [/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|kanban|quadrantChart|xychart-beta|sankey-beta|block-beta|architecture-beta|C4Context|C4Container|C4Component|ishikawa-beta|ishikawa)/, 'keyword.diagram'],
        [/\b(TD|LR|RL|BT|TB)\b/, 'keyword.direction'],
        [/\b(participant|actor|activate|deactivate|loop|alt|else|opt|par|and|end|note|over|section|title|dateFormat|axisFormat|classDef|class|direction|subgraph|state|group|service|in|column|done|active|Person|System|Rel|System_Ext)\b/, 'keyword'],
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],
        [/\[["'][^\]]*["']\]/, 'string'],
        [/\[[^\]]*\]/, 'type'],
        [/\([^)]*\)/, 'type'],
        [/\{[^}]*\}/, 'type'],
        [/-->|-->>|--|==|~~|\.\.|->|-\.-|==>|--\|/, 'operator.arrow'],
        [/\|[^|]*\|/, 'string.label'],
        [/:[^\n:]+/, 'string.label'],
        [/#[0-9a-fA-F]{3,6}\b/, 'number.hex'],
        [/\b\d+(\.\d+)?\b/, 'number'],
        [/[a-zA-Z_][\w\d_]*/, 'identifier'],
      ]
    }
  });

  monaco.editor.defineTheme('mermaid-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment',          foreground: '608b4e', fontStyle: 'italic' },
      { token: 'keyword.diagram',  foreground: '569cd6', fontStyle: 'bold' },
      { token: 'keyword.direction',foreground: 'c586c0' },
      { token: 'keyword',          foreground: '9cdcfe' },
      { token: 'string',           foreground: 'ce9178' },
      { token: 'string.label',     foreground: 'd7ba7d' },
      { token: 'type',             foreground: '4ec9b0' },
      { token: 'operator.arrow',   foreground: 'd4d4d4', fontStyle: 'bold' },
      { token: 'number',           foreground: 'b5cea8' },
      { token: 'number.hex',       foreground: 'ce9178' },
      { token: 'identifier',       foreground: 'dcdcaa' },
    ],
    colors: {
      'editor.background': '#1F1F1F',
      'editor.foreground': '#d4d4d4',
      'editorLineNumber.foreground': '#5a5a5a',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editor.selectionBackground': '#264f78',
      'editor.lineHighlightBackground': '#2a2a2a',
    }
  });

  monaco.editor.defineTheme('mermaid-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment',          foreground: '008000', fontStyle: 'italic' },
      { token: 'keyword.diagram',  foreground: '0077bc', fontStyle: 'bold' },
      { token: 'keyword.direction',foreground: 'af00db' },
      { token: 'keyword',          foreground: '001080' },
      { token: 'string',           foreground: 'a31515' },
      { token: 'string.label',     foreground: '795e26' },
      { token: 'type',             foreground: '267f99' },
      { token: 'operator.arrow',   foreground: '333333', fontStyle: 'bold' },
      { token: 'number',           foreground: '098658' },
      { token: 'number.hex',       foreground: 'a31515' },
      { token: 'identifier',       foreground: '795e26' },
    ],
    colors: {
      'editor.background': '#FFFFFE',
    }
  });

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  editor = monaco.editor.create(document.getElementById('monaco-container'), {
    language: 'mermaid',
    theme: isDark ? 'mermaid-dark' : 'mermaid-light',
    fontSize: 13,
    lineHeight: 21,
    fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
    fontLigatures: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'off',
    renderWhitespace: 'none',
    tabSize: 2,
    insertSpaces: true,
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
    overviewRulerLanes: 0,
    lineNumbers: 'on',
    roundedSelection: false,
    padding: { top: 12, bottom: 12 },
    suggest: { showKeywords: true },
  });

  // Status bar: position
  editor.onDidChangeCursorPosition(e => {
    document.getElementById('sbLines').textContent = `Rad ${e.position.lineNumber}, Kol ${e.position.column}`;
  });

  // Auto render on change
  editor.onDidChangeModelContent(() => {
    const val = editor.getValue();
    document.getElementById('sbChars').textContent = val.length + ' tecken';
    if (autoRender) {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(renderDiagram, 650);
    }
  });

  // Expose getCode
  window._getCode = () => editor.getValue();
  window._setCode = (v) => editor.setValue(v);

  if (window._pendingInit) {
    const pending = window._pendingInit;
    window._pendingInit = null;
    if (pending.content != null) {
      window._setCode(String(pending.content));
      renderDiagram();
    }
  } else if (!EMBED_MODE) {
    loadSample('flowchart');
  }
});

/* ══ RENDER ══ */
window.renderDiagram = async function() {
  const code = (window._getCode ? window._getCode() : '').trim();
  const out = document.getElementById('diagram-out');
  setStatus('spin','Renderar…');
  if (!code) {
    out.innerHTML = '<div class="empty-hint">Inget att rendera.</div>';
    setStatus('idle','Tomt');
    return;
  }
  mCounter++;
  const id = 'mmd-' + mCounter;
  try {
    const { svg } = await mermaid.render(id, code);
    out.innerHTML = svg;
    out.querySelector('svg').style.display = 'block';
    setStatus('ok','OK');
    // auto-fit after short delay so layout is painted
    setTimeout(fitDiagram, 60);
  } catch(e) {
    out.innerHTML = '<div class="err-box">⚠ Syntaxfel:\n\n' + e.message + '</div>';
    setStatus('err','Syntaxfel');
  }
};

function setStatus(state, msg) {
  const d = document.getElementById('sbDot');
  const t = document.getElementById('sbText');
  d.className = 'sb-dot' + (state==='ok'?' ok':state==='err'?' err':state==='spin'?' spin':'');
  t.textContent = msg;
}

/* ══ AUTO RENDER ══ */
window.toggleAutoRender = function() {
  autoRender = !autoRender;
  document.getElementById('autoBtn').classList.toggle('active', autoRender);
  toast(autoRender ? 'Auto-render på' : 'Auto-render av');
};

/* ══ PAN / ZOOM INFINITE CANVAS ══ */
let panX = 0, panY = 0;
let zoom = 1.0;
let isPanning = false, panStartX = 0, panStartY = 0, panStartPX = 0, panStartPY = 0;

function applyTransform(animate) {
  const wrap = document.getElementById('diagWrap');
  wrap.style.transition = animate ? 'transform .18s ease' : 'none';
  wrap.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
  document.getElementById('zoomLbl').textContent = Math.round(zoom*100) + '%';
}

function fitDiagram() {
  const canvas = document.getElementById('previewCanvas');
  const out    = document.getElementById('diagram-out');
  const svg    = out.querySelector('svg');
  if (!svg && !out.textContent.trim()) return;

  // Use natural SVG dimensions if possible, else card size
  const svgW = svg ? (parseFloat(svg.getAttribute('width'))  || out.scrollWidth)  : out.scrollWidth;
  const svgH = svg ? (parseFloat(svg.getAttribute('height')) || out.scrollHeight) : out.scrollHeight;
  const pad  = out.offsetWidth - (svg ? svg.getBoundingClientRect().width  / (zoom || 1) : 0);
  const dw   = out.scrollWidth  || 400;
  const dh   = out.scrollHeight || 300;

  const margin = 16; // px padding inside canvas
  const cw = canvas.clientWidth  - margin * 2;
  const ch = canvas.clientHeight - margin * 2;

  // Allow scaling UP beyond 1.0 to fill the canvas
  zoom = Math.max(0.05, Math.min(cw / dw, ch / dh));
  panX = (canvas.clientWidth  - dw * zoom) / 2;
  panY = (canvas.clientHeight - dh * zoom) / 2;
  applyTransform(true);
}

window.changeZoom = delta => {
  const canvas = document.getElementById('previewCanvas');
  const cx = canvas.clientWidth  / 2;
  const cy = canvas.clientHeight / 2;
  const oldZoom = zoom;
  zoom = Math.min(10, Math.max(0.05, zoom + delta/100));
  // zoom towards canvas centre
  panX = cx - (cx - panX) * (zoom / oldZoom);
  panY = cy - (cy - panY) * (zoom / oldZoom);
  applyTransform(false);
};
window.resetZoom = ()=> { zoom=1.0; fitDiagram(); };
window.fitZoom   = ()=> fitDiagram();

/* ── Mouse wheel zoom ── */
document.getElementById('previewCanvas').addEventListener('wheel', e => {
  e.preventDefault();
  const canvas = document.getElementById('previewCanvas');
  const rect   = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const delta = e.deltaY < 0 ? 0.1 : -0.1;
  const oldZoom = zoom;
  zoom = Math.min(10, Math.max(0.05, zoom + delta));
  panX = mx - (mx - panX) * (zoom / oldZoom);
  panY = my - (my - panY) * (zoom / oldZoom);
  applyTransform(false);
}, { passive: false });

/* ── Pan with mouse drag ── */
document.getElementById('previewCanvas').addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  // ignore if clicked on the diagram card itself for text selection
  isPanning = true;
  panStartX  = e.clientX;
  panStartY  = e.clientY;
  panStartPX = panX;
  panStartPY = panY;
  document.getElementById('previewCanvas').classList.add('panning');
});
document.addEventListener('mousemove', e => {
  if (!isPanning) return;
  panX = panStartPX + (e.clientX - panStartX);
  panY = panStartPY + (e.clientY - panStartY);
  applyTransform(false);
});
document.addEventListener('mouseup', e => {
  if (!isPanning) return;
  isPanning = false;
  document.getElementById('previewCanvas').classList.remove('panning');
});

/* ══ EXPORT ══ */
function getSVG() { return document.querySelector('#diagram-out svg'); }

// Get SVG natural pixel dimensions (ignore current transform/zoom)
function getSVGDimensions(svg) {
  // Try viewBox first (most reliable for Mermaid output)
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/);
    if (parts.length === 4) {
      const w = parseFloat(parts[2]);
      const h = parseFloat(parts[3]);
      if (w > 0 && h > 0) return { w, h };
    }
  }
  // Fall back to explicit width/height attrs
  const wa = parseFloat(svg.getAttribute('width'));
  const ha = parseFloat(svg.getAttribute('height'));
  if (wa > 0 && ha > 0) return { w: wa, h: ha };
  // Last resort: rendered size (may include zoom)
  const r = svg.getBoundingClientRect();
  return { w: r.width / zoom, h: r.height / zoom };
}

// Render SVG to canvas via inline data URI (avoids blob: CSP issues)
function svgToCanvas(svgEl, bgColor) {
  return new Promise((resolve, reject) => {
    const { w, h } = getSVGDimensions(svgEl);
    const SCALE = 2;
    const cvs = document.createElement('canvas');
    cvs.width  = Math.round(w * SCALE);
    cvs.height = Math.round(h * SCALE);
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = bgColor || '#ffffff';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Clone SVG and set explicit size so canvas draws at full resolution
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width',  w * SCALE);
    clone.setAttribute('height', h * SCALE);
    // Ensure xmlns
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Inline all <style> from document into SVG so fonts/colors render
    const styles = Array.from(document.styleSheets).flatMap(ss => {
      try { return Array.from(ss.cssRules).map(r => r.cssText); } catch(e) { return []; }
    }).join('\n');
    if (styles) {
      const styleEl = document.createElementNS('http://www.w3.org/2000/svg','style');
      styleEl.textContent = styles;
      clone.insertBefore(styleEl, clone.firstChild);
    }

    const serialized = new XMLSerializer().serializeToString(clone);
    // Use data URI instead of blob: — works in CSP-sandboxed iframes
    const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      resolve(cvs);
    };
    img.onerror = (e) => reject(new Error('SVG render failed: ' + e));
    img.src = dataUri;
  });
}

window.exportSVG = ()=> {
  const svg = getSVG();
  if (!svg) { toast('Inget diagram att exportera','err'); return; }
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const s = new XMLSerializer().serializeToString(clone);
  const a = document.createElement('a');
  a.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  a.download = 'diagram.svg';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast('SVG exporterad ✓','ok');
};

window.exportPNG = async ()=> {
  const svg = getSVG();
  if (!svg) { toast('Inget diagram att exportera','err'); return; }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  try {
    const cvs = await svgToCanvas(svg, isDark ? '#1e1e1e' : '#ffffff');
    cvs.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'diagram.png';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('PNG exporterad ✓','ok');
    }, 'image/png');
  } catch(e) { toast('Export misslyckades: ' + e.message,'err'); }
};

window.copyImage = async ()=> {
  const svg = getSVG();
  if (!svg) { toast('Inget diagram att kopiera','err'); return; }
  try {
    const cvs = await svgToCanvas(svg, '#ffffff');
    cvs.toBlob(async b => {
      try {
        await navigator.clipboard.write([new ClipboardItem({'image/png': b})]);
        toast('Bild kopierad till urklipp ✓','ok');
      } catch(e) {
        // Fallback: download instead
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'diagram.png';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        toast('Urklipp ej tillåtet — sparar som PNG','ok');
      }
    }, 'image/png');
  } catch(e) { toast('Misslyckades: ' + e.message,'err'); }
};

window.copyCode = ()=> {
  const v = window._getCode ? window._getCode() : '';
  navigator.clipboard.writeText(v).then(()=>toast('Kod kopierad','ok')).catch(()=>toast('Fel','err'));
};

window.clearEditor = ()=> {
  if (window._setCode) window._setCode('');
  document.getElementById('diagram-out').innerHTML = '<div class="empty-hint">Editorn rensad.</div>';
  setStatus('idle','Redo');
  document.getElementById('sbChars').textContent = '0 tecken';
};

window.formatCode = ()=> {
  if (!window._getCode) return;
  let lines = window._getCode().split('\n').map(l=>l.trimEnd());
  while (lines.length && !lines[lines.length-1].trim()) lines.pop();
  window._setCode(lines.join('\n'));
  toast('Formaterad');
};

window.shareLink = ()=> {
  const v = window._getCode ? window._getCode() : '';
  const encoded = btoa(unescape(encodeURIComponent(v)));
  const url = location.origin + location.pathname + '?code=' + encoded;
  navigator.clipboard.writeText(url).then(()=>toast('Länk kopierad','ok')).catch(()=>toast('Fel','err'));
};

/* ══ THEME ══ */
function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  if (!EMBED_MODE) {
    localStorage.setItem('gs-mermaid-theme', next);
    updateThemeIcon(next);
  }
  if (editor) monaco.editor.setTheme(next === 'dark' ? 'mermaid-dark' : 'mermaid-light');
  initMermaid();
  if (window._getCode && window._getCode().trim()) renderDiagram();
}

window.toggleTheme = ()=> {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
};

function embedSave() {
  window.parent.postMessage({
    type: 'sc-mermaid-save',
    content: window._getCode ? window._getCode() : '',
  }, '*');
}

function embedCancel() {
  window.parent.postMessage({ type: 'sc-mermaid-cancel' }, '*');
}

window.embedSave = embedSave;
window.embedCancel = embedCancel;

window.addEventListener('message', e => {
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'sc-mermaid-init') {
    if (d.theme) applyTheme(d.theme);
    const content = String(d.content ?? '');
    if (window._setCode) {
      window._setCode(content);
      if (content.trim()) renderDiagram();
      else {
        document.getElementById('diagram-out').innerHTML = '<div class="empty-hint">Skriv Mermaid-kod eller välj ett exempeldiagram.</div>';
        setStatus('idle', 'Redo');
      }
    } else {
      window._pendingInit = d;
    }
  }
  if (d.type === 'sc-mermaid-set-theme' && d.theme) applyTheme(d.theme);
});

if (EMBED_MODE) {
  window.parent.postMessage({ type: 'sc-mermaid-ready' }, '*');
}

document.addEventListener('keydown', e => {
  if (!EMBED_MODE) return;
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); embedSave(); }
  if (e.key === 'Escape') { e.preventDefault(); embedCancel(); }
});

function updateThemeIcon(theme) {
  // Sun icon for dark mode (click to go light), Moon for light mode
  const btn = document.getElementById('themeBtn');
  if (theme === 'dark') {
    btn.innerHTML = `<svg viewBox="0 0 16 16"><path d="M8 1a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 018 1zm0 11a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 018 12zm-5-4a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1A.5.5 0 013 8zm9.5-.5h1a.5.5 0 010 1h-1a.5.5 0 010-1zM5.05 3.636a.5.5 0 01.707 0L6.464 4.343a.5.5 0 01-.707.707L5.05 4.343a.5.5 0 010-.707zm5.536 6.364a.5.5 0 01.707 0l.707.707a.5.5 0 01-.707.707l-.707-.707a.5.5 0 010-.707zM3.636 10.95a.5.5 0 010 .707l-.707.707a.5.5 0 01-.707-.707l.707-.707a.5.5 0 01.707 0zm8.485-7.778a.5.5 0 010 .707l-.707.707a.5.5 0 11-.707-.707l.707-.707a.5.5 0 01.707 0zM8 5a3 3 0 100 6A3 3 0 008 5z"/></svg>`;
  } else {
    btn.innerHTML = `<svg viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 01.08.858 7.208 7.208 0 00-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 01.81.316.733.733 0 01-.031.893A8.349 8.349 0 018.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 016 .278z"/></svg>`;
  }
}

/* ══ TOAST ══ */
window.toast = function(msg, type='') {
  const c = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .25s'; el.style.opacity='0'; setTimeout(()=>el.remove(),260); }, 2200);
};

/* ══ DROPDOWN ══ */
window.ddToggle = function(id) {
  const menu = document.getElementById(id + 'Menu');
  const btn  = document.querySelector(`#${id} .tb-btn`);
  const isOpen = menu.classList.contains('open');
  document.querySelectorAll('.dd-menu.open').forEach(m => m.classList.remove('open'));
  if (!isOpen) {
    const r = btn.getBoundingClientRect();
    menu.style.left = r.left + 'px';
    menu.style.top  = (r.bottom + 4) + 'px';
    menu.classList.add('open');
    const close = e => {
      if (!document.getElementById(id).contains(e.target)) {
        menu.classList.remove('open');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
};

/* ══ SAMPLES ══ */
const SAMPLES = {
flowchart:`%% Diagram: Fakturaflöde – systemöversikt
flowchart TD
  ekonomi["<b>Ekonomisystem</b></br>Unit4 (intern)"]
  sentinet["<b>API Gateway</b></br>Sentinet (IBM)"]
  crm["<b>CRM</b></br>Extern leverantör"]
  process["<b>Fakturahantering</b></br>Process (inbound)"]
  fel["<b>Fel</b></br>Misslyckad överföring"]

  ekonomi -->|"Filöverföring (daglig)"| process
  process -->|"API (realtid)"| sentinet
  sentinet --> crm
  process --> fel

  classDef primaryNode fill:#004172,stroke:#004172,color:#FFFFFF;
  classDef processNode fill:#FFFFFF,stroke:#0077BC,color:#1F1F1F;
  classDef externalNode fill:#EBEBEB,stroke:#674B99,color:#1F1F1F;
  classDef errorNode fill:#83161C,stroke:#83161C,color:#FFFFFF;

  class ekonomi,sentinet primaryNode;
  class process processNode;
  class crm externalNode;
  class fel errorNode;`,

sequence:`%% Diagram: Autentiseringsflöde BankID
sequenceDiagram
  actor Användare
  participant App as Göteborgs App
  participant Auth as Autentiseringstjänst
  participant BankID

  Användare->>App: Logga in
  App->>Auth: Initiera session
  Auth->>BankID: Starta BankID-signering
  BankID-->>Användare: Öppna BankID-app
  Användare-->>BankID: Signerar
  BankID-->>Auth: Bekräftelse
  Auth-->>App: JWT-token
  App-->>Användare: Inloggad`,

state:`%% Diagram: Ärendehantering – tillståndsövergångar
stateDiagram-v2
  [*] --> Inkommen
  Inkommen --> UnderHandläggning : Tilldelas handläggare
  UnderHandläggning --> Kompletteras : Saknar uppgifter
  Kompletteras --> UnderHandläggning : Kompletterat
  UnderHandläggning --> Beslutad : Beslut fattat
  Beslutad --> [*]
  UnderHandläggning --> Avskriven : Återkallad
  Avskriven --> [*]`,

er:`%% Diagram: Styrande dokument – datamodell
erDiagram
  DOKUMENT {
    string id PK
    string titel
    string typ
    date giltigFrom
    date giltigTom
    string status
  }
  KATEGORI {
    string id PK
    string namn
  }
  ANSVARIG {
    string id PK
    string namn
    string roll
  }
  DOKUMENT }o--|| KATEGORI : "tillhör"
  DOKUMENT }o--|| ANSVARIG : "ägs av"`,

class:`%% Diagram: Klassmodell – Tjänsteportfölj
classDiagram
  class Tjänst {
    +String id
    +String namn
    +String status
    +register()
    +avregistrera()
  }
  class ITTjänst {
    +String teknikplattform
    +konfigurera()
  }
  class Förvaltning {
    +String ansvarig
    +granska()
  }
  Tjänst <|-- ITTjänst
  Tjänst "1" --> "1..*" Förvaltning : förvaltas av`,

gantt:`%% Diagram: Projektplan – systemmigrering
gantt
  title Migrering LIS till Ciceron DoÄ
  dateFormat YYYY-MM-DD
  section Förberedelse
    Behovsanalys       :done, a1, 2024-01-01, 2024-02-28
    Upphandling        :done, a2, 2024-02-01, 2024-04-30
  section Genomförande
    Pilot              :active, b1, 2024-05-01, 2024-08-31
    Breddinförande     :b2, 2024-09-01, 2025-03-31
  section Avveckling
    Stängning LIS      :c1, 2025-04-01, 2025-06-30`,

timeline:`%% Diagram: Projektfaser digitaliseringsinitiativ
timeline
  title Digitaliseringsplan 2024–2026
  2024 Q1 : Behovsanalys
           : Upphandling påbörjas
  2024 Q3 : Pilotdriftsättning
  2025 Q1 : Breddinförande fas 1
  2025 Q3 : Breddinförande fas 2
  2026 Q1 : Förvaltningsläge`,

mindmap:`%% Diagram: Gemensamma tjänster – Intraservice
mindmap
  root((Intraservice))
    Gemensamma tjänster
      IT-infrastruktur
      Systemförvaltning
      Integration
    Stöd
      HR
      Ekonomi
      Kommunikation
    Arkitektur
      Verksamhetsarkitektur
      Informationsarkitektur
      Teknisk arkitektur`,

quadrant:`%% Diagram: Systemprioriteringskarta
quadrantChart
  title Systemprioriteringsmatris
  x-axis Låg komplexitet --> Hög komplexitet
  y-axis Lågt affärsvärde --> Högt affärsvärde
  quadrant-1 Strategiska investeringar
  quadrant-2 Förenkla och optimera
  quadrant-3 Avveckla
  quadrant-4 Bevaka
  Sentinet: [0.8, 0.9]
  LIS/Domino: [0.3, 0.2]
  Ciceron DoÄ: [0.7, 0.8]
  Äldre portal: [0.2, 0.3]`,

kanban:`%% Diagram: Sprint-board arkitekturarbete
kanban
  column Todo
    Skriv ADD för ny integration
    Uppdatera målarkitektur
  column Pågående
    Granska säkerhetskrav
  column Klart
    Förmågekartering DI
    Arkitekturreview Ciceron`,

xychart:`%% Diagram: Ärendestatistik per kvartal
xychart-beta
  title "Inkomna ärenden 2024"
  x-axis ["Q1", "Q2", "Q3", "Q4"]
  y-axis "Antal ärenden" 0 --> 5000
  bar [2100, 3400, 2900, 4200]
  line [2100, 3400, 2900, 4200]`,

pie:`%% Diagram: IT-budgetfördelning 2024
pie title IT-budgetfördelning 2024
  "Infrastruktur" : 38
  "Licenser" : 22
  "Projekt" : 25
  "Support" : 15`,

sankey:`sankey-beta
%% source,target,value
Electricity grid,Over generation / exports,104.453
Electricity grid,Heating and cooling - homes,113.726
Electricity grid,H2 conversion,27.14`,

architecture:`%% Diagram: AWS-arkitektur med logos-ikoner
architecture-beta
    group api(logos:aws-lambda)[API]

    service db(logos:aws-aurora)[Database] in api
    service disk1(logos:aws-glacier)[Storage] in api
    service disk2(logos:aws-s3)[Storage] in api
    service server(logos:aws-ec2)[Server] in api

    db:L -- R:server
    disk1:T -- B:server
    disk2:T -- B:db`,

c4:`%% Diagram: C4 systemkontext – Göteborgs Stads digitala infrastruktur
C4Context
  title Systemkontext – Gemensamma tjänster

  Person(medborgare, "Medborgare", "Använder stadens e-tjänster")
  Person(handlaggare, "Handläggare", "Interna medarbetare")

  System(gs_plattform, "Göteborgs Stads plattform", "Integrationsplattform och gemensamma tjänster")
  System_Ext(bankid, "BankID", "Extern autentisering")
  System_Ext(skatteverket, "Skatteverket", "Folkbokföringsdata")

  Rel(medborgare, gs_plattform, "Använder e-tjänster", "HTTPS")
  Rel(handlaggare, gs_plattform, "Handlägger ärenden", "HTTPS")
  Rel(gs_plattform, bankid, "Autentiserar via", "API")
  Rel(gs_plattform, skatteverket, "Hämtar folkbokföring", "API")`,

ishikawa:`%% Diagram: Orsaker till integrationsproblem
ishikawa
  title: Integrationsproblem
  Människa
    Bristande dokumentation
    Kompetensgap
    Hög personalomsättning
  Teknik
    Gammal API-version
    Timeout-konfiguration
    Saknade tester
  Process
    Otydligt ägarskap
    Ingen testmiljö
    Bristande rutiner
  Material
    Inaktuella specifikationer
    Saknade exempeldata`
};

window.loadSample = function(key) {
  document.querySelectorAll('.dd-menu').forEach(m=>m.classList.remove('open'));
  if (!window._setCode) {
    // Monaco not ready yet — queue it
    setTimeout(()=>window.loadSample(key), 300); return;
  }
  window._setCode(SAMPLES[key]||'');
  document.getElementById('sbChars').textContent = (SAMPLES[key]||'').length + ' tecken';
  renderDiagram();
  toast('Exempeldiagram laddat');
};

/* ══ RESIZE ══ */
(()=>{
  const resizer = document.getElementById('resizer');
  const pane    = document.getElementById('paneEditor');
  const ws      = document.getElementById('workspace');
  let drag=false, sx=0, sw=0;
  resizer.addEventListener('mousedown', e=>{
    drag=true; sx=e.clientX; sw=pane.offsetWidth;
    resizer.classList.add('dragging');
    document.body.style.cursor='col-resize';
    document.body.style.userSelect='none';
  });
  document.addEventListener('mousemove', e=>{
    if(!drag)return;
    const nw=Math.min(ws.offsetWidth*.82, Math.max(180, sw+(e.clientX-sx)));
    pane.style.width=nw+'px';
  });
  document.addEventListener('mouseup', ()=>{
    drag=false; resizer.classList.remove('dragging');
    document.body.style.cursor=''; document.body.style.userSelect='';
  });
})();

/* ══ INIT ══ */
(()=>{
  if (EMBED_MODE) {
    applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  } else {
    const saved = localStorage.getItem('gs-mermaid-theme')
      || document.documentElement.getAttribute('data-theme')
      || 'light';
    applyTheme(saved);
  }

  window.addEventListener('resize', () => {
    if (document.querySelector('#diagram-out svg')) fitDiagram();
  });

  if (!EMBED_MODE) {
    const p = new URLSearchParams(location.search);
    const enc = p.get('code');
    if (enc) {
      try {
        const decoded = decodeURIComponent(escape(atob(enc)));
        setTimeout(()=>{ window._setCode && window._setCode(decoded); renderDiagram(); }, 400);
      } catch(e){}
    }
  }
})();
</script>
</body>
</html>
