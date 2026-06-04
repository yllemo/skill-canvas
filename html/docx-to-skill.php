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
<title><?= $embed ? 'Importera DOCX' : 'DOCX → Markdown' ?></title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js"></script>
<script src="js/docx-converter.js"></script>
<style>
  :root {
    --gs-blue: #0077bc;
    --gs-blue-dark: #005799;
    --bg: #FFFFFE;
    --bg-nav: #F4F9FC;
    --text: #333;
    --text-sec: #6E6E6E;
    --border: #C8D0D8;
    --success: #5a8b3b;
    --error: #d24723;
  }
  [data-theme="dark"] {
    --bg: #1F1F1F;
    --bg-nav: #141414;
    --text: #fff;
    --text-sec: #B0BAC0;
    --border: #444;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    font-family: 'Goteborg', Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text);
    background: var(--bg);
    display: flex;
    flex-direction: column;
  }
  #hdr {
    flex-shrink: 0;
    height: 48px;
    background: var(--gs-blue);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
  }
  #hdr h1 { font-size: 15px; font-weight: 600; }
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
  .hdr-btn.primary { background: #27ae60; border-color: #1e8449; }
  .hdr-btn.primary:hover { background: #2ecc71; }
  .hdr-btn.primary:disabled { opacity: .45; cursor: not-allowed; }
  body.embed #hdr-actions-standalone { display: none; }
  body:not(.embed) #hdr-actions-embed { display: none; }

  #main {
    flex: 1;
    overflow: auto;
    padding: 16px 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
  }

  .drop-zone {
    border: 2px dashed var(--gs-blue);
    border-radius: 8px;
    background: var(--bg-nav);
    padding: 28px 20px;
    text-align: center;
    cursor: pointer;
    position: relative;
    transition: background .15s, border-color .15s;
  }
  .drop-zone.dragover { background: #e5f1fa; border-color: var(--gs-blue-dark); }
  [data-theme="dark"] .drop-zone.dragover { background: #1a3048; }
  .drop-zone input[type="file"] {
    position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
  }
  .drop-title { font-weight: 700; color: var(--gs-blue); margin-bottom: 4px; }
  .drop-hint { font-size: 12px; color: var(--text-sec); }

  .status {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-nav);
    font-size: 13px;
    min-height: 44px;
  }
  .status.working { border-color: var(--gs-blue); }
  .status.ok { border-color: var(--success); }
  .status.err { border-color: var(--error); }
  .status strong { display: block; }
  .status span { color: var(--text-sec); font-size: 12px; }

  .progress-wrap { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; display: none; }
  .progress-wrap.visible { display: block; }
  .progress-bar { height: 100%; width: 0; background: var(--gs-blue); transition: width .2s; }

  .preview-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text-sec); }
  #md-preview {
    width: 100%;
    min-height: 140px;
    max-height: 220px;
    resize: vertical;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg);
    color: var(--text);
    font-family: 'Courier New', Consolas, monospace;
    font-size: 12px;
    line-height: 1.45;
  }
  #md-preview:disabled { opacity: .6; }

  .img-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .img-thumb {
    width: 72px;
    text-align: center;
    font-size: 10px;
    color: var(--text-sec);
  }
  .img-thumb img {
    width: 72px;
    height: 54px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid var(--border);
    display: block;
    margin-bottom: 4px;
  }
  .img-empty { font-size: 12px; color: var(--text-sec); font-style: italic; }

  .merge-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-sec);
  }
  .merge-row input { accent-color: var(--gs-blue); }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--gs-blue);
    border-radius: 50%;
    animation: spin .7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body class="<?= $embed ? 'embed' : '' ?>">

<header id="hdr">
  <h1>📄 <?= $embed ? 'Importera DOCX' : 'DOCX → Markdown' ?></h1>
  <div id="hdr-actions-embed" style="display:flex;gap:8px">
    <button type="button" class="hdr-btn" id="btn-cancel">Avbryt</button>
    <button type="button" class="hdr-btn primary" id="btn-import" disabled>✓ Importera till editor</button>
  </div>
  <div id="hdr-actions-standalone" style="display:flex;gap:8px">
    <button type="button" class="hdr-btn" id="btn-copy" disabled>Kopiera markdown</button>
  </div>
</header>

<main id="main">
  <div class="drop-zone" id="drop-zone">
    <input type="file" id="file-input" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
    <div class="drop-title">Dra och släpp en .docx-fil här</div>
    <div class="drop-hint">eller klicka för att välja — text och bilder konverteras till Markdown</div>
  </div>

  <div class="progress-wrap" id="progress-wrap"><div class="progress-bar" id="progress-bar"></div></div>

  <div class="status" id="status">
    <span>💡</span>
    <div><strong>Redo</strong><span>Välj en Word-fil (.docx) för att börja.</span></div>
  </div>

  <div>
    <div class="preview-label">Markdown (förhandsgranskning)</div>
    <textarea id="md-preview" disabled placeholder="Konverterad markdown visas här…"></textarea>
  </div>

  <div>
    <div class="preview-label">Bilder (<span id="img-count">0</span>)</div>
    <div class="img-grid" id="img-grid"><span class="img-empty">Inga bilder än.</span></div>
  </div>

  <label class="merge-row" id="merge-row">
    <input type="checkbox" id="merge-append">
    Lägg till i slutet av befintligt innehåll (istället för att ersätta)
  </label>
</main>

<script>
var EMBED = <?= $embed ? 'true' : 'false' ?>;
var state = { ready: false, markdown: '', images: [] };

function setStatus(kind, icon, title, sub) {
  var el = document.getElementById('status');
  el.className = 'status' + (kind ? ' ' + kind : '');
  el.innerHTML = '<span>' + icon + '</span><div><strong>' + title + '</strong><span>' + sub + '</span></div>';
}

function setProgress(pct) {
  var wrap = document.getElementById('progress-wrap');
  var bar = document.getElementById('progress-bar');
  if (!pct) {
    wrap.classList.remove('visible');
    bar.style.width = '0%';
    return;
  }
  wrap.classList.add('visible');
  bar.style.width = pct + '%';
}

function renderImages() {
  var grid = document.getElementById('img-grid');
  var count = document.getElementById('img-count');
  count.textContent = state.images.length;
  if (!state.images.length) {
    grid.innerHTML = '<span class="img-empty">Inga bilder i dokumentet.</span>';
    return;
  }
  grid.innerHTML = state.images.map(function (img) {
    var url = URL.createObjectURL(img.blob);
    return '<div class="img-thumb"><img src="' + url + '" alt=""><div>' + img.path + '</div></div>';
  }).join('');
}

async function processFile(file) {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    setStatus('err', '⚠️', 'Fel filformat', 'Välj en .docx-fil.');
    return;
  }
  setStatus('working', '<span class="spinner"></span>', 'Konverterar…', file.name);
  document.getElementById('btn-import').disabled = true;
  document.getElementById('btn-copy').disabled = true;
  state.ready = false;

  try {
    var result = await DocxConverter.processDocxFile(file, {
      imageDir: 'images',
      onProgress: setProgress,
    });
    state.markdown = result.markdown;
    state.images = result.images;
    state.ready = true;
    document.getElementById('md-preview').value = result.markdown;
    document.getElementById('md-preview').disabled = false;
    renderImages();
    document.getElementById('btn-import').disabled = false;
    document.getElementById('btn-copy').disabled = false;
    var warn = result.warnings.length ? ' (' + result.warnings.length + ' varningar)' : '';
    setStatus('ok', '✅', 'Klar', result.images.length + ' bild(er) extraherade.' + warn);
    setTimeout(function () { setProgress(0); }, 600);
  } catch (err) {
    console.error(err);
    setStatus('err', '❌', 'Fel', err.message || String(err));
    setProgress(0);
  }
}

function getPayload() {
  return {
    markdown: document.getElementById('md-preview').value,
    images: state.images.map(function (img) {
      return { path: img.path, name: img.name, mimeType: img.mimeType, base64: img.base64 };
    }),
    merge: document.getElementById('merge-append').checked ? 'append' : 'replace',
  };
}

function postToParent(msg) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(msg, '*');
  }
}

function doImport() {
  if (!state.ready) return;
  var payload = getPayload();
  if (EMBED) {
    postToParent(Object.assign({ type: 'sc-docx-import' }, payload));
    return;
  }
  alert('Öppna via Skill Canvas markdown-editor för att importera till ett kort.');
}

function doCancel() {
  if (EMBED) postToParent({ type: 'sc-docx-cancel' });
}

document.getElementById('btn-import').onclick = doImport;
document.getElementById('btn-cancel').onclick = doCancel;
document.getElementById('btn-copy').onclick = function () {
  if (!state.ready) return;
  navigator.clipboard.writeText(document.getElementById('md-preview').value);
  setStatus('ok', '📋', 'Kopierat', 'Markdown i urklipp.');
};

var dropZone = document.getElementById('drop-zone');
var fileInput = document.getElementById('file-input');
dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', function (e) {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', function (e) {
  if (e.target.files[0]) processFile(e.target.files[0]);
});

if (EMBED) {
  postToParent({ type: 'sc-docx-ready' });
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'sc-docx-init') {
      if (d.hasContent) document.getElementById('merge-row').style.display = 'flex';
      else document.getElementById('merge-append').checked = false;
    }
  });
}
</script>
</body>
</html>
