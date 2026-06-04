<?php
declare(strict_types=1);

$embed = isset($_GET['embed']) && $_GET['embed'] === '1';
$theme = in_array($_GET['theme'] ?? '', ['light', 'dark'], true) ? $_GET['theme'] : 'light';
if (!$embed) {
    header('Location: paint-skill-editor.php?embed=1&theme=' . urlencode($theme));
    exit;
}
?>
<!DOCTYPE html>
<html lang="sv" data-theme="<?= htmlspecialchars($theme, ENT_QUOTES, 'UTF-8') ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Måla — Skill Canvas</title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/paint-editor.css">
</head>
<body class="paint-embed">

<header id="paint-embed-hdr">
  <h1>Måla</h1>
  <span id="paint-hdr-status">Väntar…</span>
  <div class="paint-hdr-actions">
    <button type="button" class="paint-hdr-btn" id="btn-paint-cancel">Avbryt</button>
    <button type="button" class="paint-hdr-btn save" id="btn-paint-save">✓ Spara till kort</button>
  </div>
</header>

<main id="paint-main">
  <div id="toolbar">
    <button type="button" class="ttool on" id="tPen" onclick="setTool('pen')" title="Penna (P)">✏️ Penna</button>
    <button type="button" class="ttool" id="tBrush" onclick="setTool('brush')" title="Pensel (B)">🖌 Pensel</button>
    <button type="button" class="ttool" id="tLine" onclick="setTool('line')" title="Linje (L)">╱ Linje</button>
    <button type="button" class="ttool" id="tRect" onclick="setTool('rect')" title="Rektangel (R)">▭ Rekt.</button>
    <button type="button" class="ttool" id="tEllipse" onclick="setTool('ellipse')" title="Ellips (E)">◯ Ellips</button>
    <button type="button" class="ttool" id="tFill" onclick="setTool('fill')" title="Fyll (F)">🪣 Fyll</button>
    <button type="button" class="ttool" id="tText" onclick="setTool('text')" title="Text (T)">T Text</button>
    <button type="button" class="ttool" id="tEraser" onclick="setTool('eraser')" title="Suddgummi (X)">🧹 Sudda</button>
    <button type="button" class="ttool" id="tEyedrop" onclick="setTool('eyedrop')" title="Färgpipett (I)">💉 Pipett</button>
    <div class="tsep"></div>
    <div class="size-wrap">
      <span>Storlek</span>
      <input type="range" id="brushSize" min="1" max="80" value="4" oninput="updateSizePreview()">
      <div id="sizePreview"><span id="sizeDot" style="width:4px;height:4px"></span></div>
    </div>
    <div class="tsep"></div>
    <div class="opacity-wrap">
      <span>Opacitet</span>
      <input type="range" id="opacitySlider" min="1" max="100" value="100" oninput="updateOpacityLabel()">
      <span id="opacityLabel">100%</span>
    </div>
    <div class="tsep"></div>
    <button type="button" class="ttool" id="tFilled" onclick="toggleFilled()" title="Fyllda former">□ Fylld</button>
    <div class="tsep"></div>
    <div class="swatch-wrap" id="swatchWrap"></div>
    <button type="button" id="customColorBtn" title="Välj valfri färg" onclick="openColorPicker()"></button>
    <input type="color" id="customColorInput" value="#0077bc" oninput="pickCustomColor(this.value)">
    <div class="tsep"></div>
    <button type="button" class="ttool" onclick="showSizeDialog()" title="Ändra storlek">📐 Storlek</button>
    <button type="button" class="ttool danger" onclick="clearCanvas()" title="Rensa canvas">🗑 Rensa</button>
    <button type="button" class="ttool" onclick="undo()" title="Ångra (Ctrl+Z)" id="undoBtn">↩ Ångra</button>
    <button type="button" class="ttool" onclick="redo()" title="Gör om (Ctrl+Y)" id="redoBtn">↪ Gör om</button>
  </div>
  <div id="canvasWrap">
    <canvas id="mainCanvas" width="1024" height="640"></canvas>
  </div>
</main>

<p id="paint-foot">Rita eller redigera bilden och spara tillbaka till kortet.</p>

<div class="dialog-bg" id="sizeDialog">
  <div class="dialog">
    <h2>📐 Ändra canvas-storlek</h2>
    <p style="font-size:.82rem;color:var(--tx2);margin-bottom:.9rem">OBS: Ändring rensar canvas-innehållet.</p>
    <div class="dialog-row"><label>Bredd</label><input type="number" id="dW" value="1024" min="100" max="4000"> px</div>
    <div class="dialog-row"><label>Höjd</label><input type="number" id="dH" value="640" min="100" max="4000"> px</div>
    <div class="dialog-acts">
      <button type="button" class="bs" onclick="hideSizeDialog()">Avbryt</button>
      <button type="button" class="bp" onclick="applySize()">Tillämpa</button>
    </div>
  </div>
</div>

<input type="text" id="textInput" placeholder="Skriv text…"
  style="display:none;position:fixed;z-index:100;border:2px dashed var(--gs-blue);
  background:rgba(255,255,255,.92);color:#000;font-size:18px;padding:4px 8px;
  border-radius:4px;min-width:120px;outline:none;"
  onkeydown="commitText(event)">
<div id="cursorRing"></div>

<script src="js/paint-editor.js"></script>
<script src="js/paint-embed.js"></script>
<script>PaintEmbed.init();</script>
</body>
</html>
