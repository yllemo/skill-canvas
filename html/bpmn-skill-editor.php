<?php
declare(strict_types=1);

$embed = isset($_GET['embed']) && $_GET['embed'] === '1';
$theme = in_array($_GET['theme'] ?? '', ['light', 'dark'], true) ? $_GET['theme'] : 'light';
if (!$embed) {
    header('Location: bpmn-skill-editor.html');
    exit;
}
?>
<!DOCTYPE html>
<html lang="sv" data-theme="<?= htmlspecialchars($theme, ENT_QUOTES, 'UTF-8') ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BPMN — Skill Canvas</title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/editor-credit.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bpmn-js@18.18.0/dist/assets/diagram-js.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bpmn-js@18.18.0/dist/assets/bpmn-js.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bpmn-js@18.18.0/dist/assets/bpmn-font/css/bpmn-embedded.css">
<style>
  :root {
    --gs-blue: #0077bc;
    --bg: #FFFFFE;
    --bg-toolbar: #F4F9FC;
    --text-sec: #6E6E6E;
    --border: #C8D0D8;
    --hdr-h: 48px;
    --toolbar-h: 40px;
  }
  [data-theme="dark"] {
    --bg: #1F1F1F;
    --bg-toolbar: #141414;
    --text-sec: #B0BAC0;
    --border: #444;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    overflow: hidden;
    font-family: 'Goteborg', Arial, Helvetica, sans-serif;
    background: var(--bg);
    display: flex;
    flex-direction: column;
  }
  #hdr {
    height: var(--hdr-h);
    flex-shrink: 0;
    background: var(--gs-blue);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    gap: 12px;
  }
  #hdr h1 { font-size: 15px; font-weight: 600; }
  #hdr-status { font-size: 12px; opacity: .85; flex: 1; text-align: center; }
  .hdr-actions { display: flex; gap: 8px; }
  .hdr-btn {
    background: rgba(255,255,255,.15);
    border: 1px solid rgba(255,255,255,.35);
    color: #fff;
    border-radius: 4px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .hdr-btn:hover { background: rgba(255,255,255,.25); }
  .hdr-btn.save { background: #27ae60; border-color: #1e8449; }
  .hdr-btn.save:hover { background: #2ecc71; }
  .hdr-btn:disabled { opacity: .45; cursor: not-allowed; }
  #toolbar {
    height: var(--toolbar-h);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
  }
  .tb {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
  }
  .tb:hover { filter: brightness(.97); }
  .tb:disabled { opacity: .4; cursor: not-allowed; }
  .tsep { width: 1px; height: 22px; background: var(--border); margin: 0 2px; }
  #bpmn-wrap {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }
  #bpmn-canvas {
    width: 100%;
    height: 100%;
  }
  #bpmn-canvas .djs-container {
    width: 100% !important;
    height: 100% !important;
  }
  #bpmn-canvas svg {
    background: var(--bg) !important;
  }
  #bpmn-status {
    flex-shrink: 0;
    padding: 6px 14px;
    font-size: 11px;
    color: var(--text-sec);
    border-top: 1px solid var(--border);
    background: var(--bg);
  }
  .bjs-powered-by { display: none !important; }
  [data-theme="dark"] .djs-palette { background: var(--bg-toolbar) !important; border-color: var(--border) !important; }
  [data-theme="dark"] .djs-popup { background: var(--bg) !important; border-color: var(--border) !important; color: #fff !important; }
</style>
</head>
<body>

<header id="hdr">
  <div class="hdr-left">
    <h1>BPMN</h1>
    <a class="editor-credit" href="https://bpmn.io/" target="_blank" rel="noopener noreferrer" title="Officiell webbplats för bpmn.io och bpmn-js">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 1h-3a.5.5 0 000 1h1.793L6.146 8.146a.5.5 0 00.708.708L13 2.707V4.5a.5.5 0 001 0v-3A.5.5 0 0013.5 1z"/><path d="M11 2.5H3A1.5 1.5 0 001.5 4v9A1.5 1.5 0 003 14.5h9a1.5 1.5 0 001.5-1.5V8a.5.5 0 00-1 0v4.5a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5h8a.5.5 0 000-1z"/></svg>
      Powered by <strong>bpmn.io</strong>
    </a>
  </div>
  <span id="hdr-status">Väntar…</span>
  <div class="hdr-actions">
    <button type="button" class="hdr-btn" id="btn-cancel">Avbryt</button>
    <button type="button" class="hdr-btn save" id="btn-save">✓ Spara till kort</button>
  </div>
</header>

<div id="toolbar">
  <button type="button" class="tb" id="btn-zoom-in" title="Zooma in">+</button>
  <button type="button" class="tb" id="btn-zoom-out" title="Zooma ut">−</button>
  <button type="button" class="tb" id="btn-zoom-fit" title="Anpassa">Fit</button>
  <span class="tsep"></span>
  <button type="button" class="tb" id="btn-undo" title="Ångra">↩</button>
  <button type="button" class="tb" id="btn-redo" title="Gör om">↪</button>
  <span class="tsep"></span>
  <button type="button" class="tb" id="btn-delete" title="Ta bort valda">🗑</button>
</div>

<div id="bpmn-wrap"><div id="bpmn-canvas"></div></div>
<p id="bpmn-status">Diagrammet sparas som .bpmn i skill-exporten och som bild på kortet.</p>

<script src="https://cdn.jsdelivr.net/npm/bpmn-js@18.18.0/dist/bpmn-modeler.production.min.js"></script>
<script src="js/bpmn-embed.js"></script>
<script>
  BpmnEmbed.init();
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      document.getElementById('btn-save').click();
    }
    if (e.key === 'Escape') document.getElementById('btn-cancel').click();
  });
</script>
</body>
</html>
