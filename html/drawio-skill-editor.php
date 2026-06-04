<?php
declare(strict_types=1);

$embed = isset($_GET['embed']) && $_GET['embed'] === '1';
$theme = in_array($_GET['theme'] ?? '', ['light', 'dark'], true) ? $_GET['theme'] : 'light';
if (!$embed) {
    header('Location: drawio-skill-editor.php?embed=1&theme=' . urlencode($theme));
    exit;
}
?>
<!DOCTYPE html>
<html lang="sv" data-theme="<?= htmlspecialchars($theme, ENT_QUOTES, 'UTF-8') ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Draw.io — Skill Canvas</title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<style>
  :root {
    --gs-blue: #0077bc;
    --bg: #FFFFFE;
    --text-sec: #6E6E6E;
    --border: #C8D0D8;
    --hdr-h: 48px;
  }
  [data-theme="dark"] {
    --bg: #1F1F1F;
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
  #drawio-frame {
    flex: 1;
    width: 100%;
    border: none;
    min-height: 0;
  }
  #drawio-status {
    flex-shrink: 0;
    padding: 6px 14px;
    font-size: 11px;
    color: var(--text-sec);
    border-top: 1px solid var(--border);
    background: var(--bg);
  }
</style>
</head>
<body>

<header id="hdr">
  <h1>Draw.io</h1>
  <span id="hdr-status">Väntar…</span>
  <div class="hdr-actions">
    <button type="button" class="hdr-btn" id="btn-cancel">Avbryt</button>
    <button type="button" class="hdr-btn save" id="btn-save">✓ Spara till kort</button>
  </div>
</header>

<iframe id="drawio-frame"
  src="about:blank"
  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-modals"
  allow="clipboard-read; clipboard-write; fullscreen"
  title="draw.io editor"></iframe>
<p id="drawio-status">Ritningen sparas som XML i skill-exporten och som bild på kortet.</p>

<script src="js/drawio-embed.js"></script>
<script>
  DrawioEmbed.init();
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
