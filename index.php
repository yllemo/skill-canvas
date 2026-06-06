<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
?>
<!DOCTYPE html>
<html lang="<?= h($app['lang']) ?>" data-theme="<?= h($app['theme']) ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title><?= h($app['title']) ?></title>
<?php $favicon = $app['favicon'] ?? 'favicon.svg'; ?>
<link rel="icon" href="<?= h($favicon) ?>?v=<?= asset_version($favicon) ?>" type="image/svg+xml">
<link rel="stylesheet" href="style.css?v=<?= asset_version('style.css') ?>">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Kalam:wght@400;700&display=swap">
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
</head>
<body>
<!-- HEADER -->
<header id="hdr">
  <button type="button" id="hdr-title" class="hdr-title-btn"><?= h($app['title']) ?></button>
  <span id="hdr-skill"></span>
  <div class="hdr-export-wrap" id="open-wrap">
    <div class="hb hb-split">
      <button type="button" id="btn-open" class="hdr-split-main" title="Öppna zip" aria-label="Öppna zip-fil">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 3v10M5 8l5-5 5 5"/><path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1"/></svg>
        <span class="hb-txt">Öppna</span>
      </button>
      <button type="button" id="btn-open-toggle" class="hdr-split-caret" aria-label="Fler öppna-alternativ">
        <svg class="hdr-export-caret" viewBox="0 0 20 20" fill="currentColor"><path d="M5 8l5 5 5-5z"/></svg>
      </button>
    </div>
    <div class="hdr-export-menu" id="open-menu">
      <button type="button" data-open="zip">Öppna .zip / .skill</button>
      <button type="button" data-open="new">Ny tom canvas</button>
    </div>
  </div>
  <div class="sep"></div>
  <div class="hdr-export-wrap hidden" id="export-wrap">
    <button class="hb hb-save" id="btn-export" type="button" title="Exportera" aria-label="Exportera">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3h9l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M7 3v5h6V3M7 13h6"/></svg>
      <span class="hb-txt">Exportera</span>
      <svg class="hdr-export-caret" viewBox="0 0 20 20" fill="currentColor"><path d="M5 8l5 5 5-5z"/></svg>
    </button>
    <div class="hdr-export-menu" id="export-menu">
      <button type="button" data-export="zip">Spara .zip</button>
      <button type="button" data-export="png">Spara .png</button>
    </div>
  </div>
  <button class="hb hidden" id="btn-meta" title="Canvas-inställningar" aria-label="Canvas">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"/></svg>
    <span class="hb-txt">Canvas</span>
  </button>
  <button class="hb hidden" id="btn-fit" title="Centrera alla noder" aria-label="Centrera">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></svg>
    <span class="hb-txt">Centrera</span>
  </button>
  <div class="hdr-settings-wrap" id="settings-wrap">
    <button class="hb" id="btn-settings" type="button" title="Inställningar" aria-label="Inställningar" aria-haspopup="true">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a3 3 0 100-6 3 3 0 000 6z"/><path d="M10 1.5v2.5M10 16v2.5M1.5 10h2.5M16 10h2.5M3.8 3.8l1.8 1.8M14.4 14.4l1.8 1.8M3.8 16.2l1.8-1.8M14.4 5.6l1.8-1.8"/></svg>
      <span class="hb-txt">Inställningar</span>
    </button>
    <div class="settings-panel" id="settings-panel" role="dialog" aria-label="Inställningar">
      <?= render_settings_panel(settings_config()['defaults'] ?? []) ?>
    </div>
  </div>
  <button class="hb" id="btn-theme" title="Tema" aria-label="Byt tema">
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14V4a6 6 0 010 12z"/></svg>
    <span class="hb-txt">Tema</span>
  </button>
</header>

<!-- DROP ZONE -->
<div id="dz">
  <div id="dz-inner">
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--gs-blue)" stroke-width="1.5"><path d="M3 7a2 2 0 012-2h2l2-2h4l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M12 11v5M9.5 13.5L12 11l2.5 2.5"/></svg>
    <h2><?= h($app['title']) ?></h2>
    <p>Öppna en befintlig <strong>.zip</strong> eller <strong>.skill</strong>-fil, dra den till fönstret, eller skapa en ny canvas från grunden.</p>
    <button class="openbtn" id="btn-open-dz">Öppna fil</button>
    <button class="openbtn" id="btn-new" style="background:var(--gs-blue-dark)">Ny tom canvas</button>
    <p style="font-size:11px;color:var(--text-sec)">Allt sker lokalt — inget laddas upp.</p>
  </div>
</div>

<!-- CANVAS -->
<div id="cw"><div id="canvas"></div></div>

<!-- ADD PANEL -->
<div id="add-panel" class="hidden">
  <button class="add-btn add-md" id="add-md" title="Markdown" aria-label="Lägg till Markdown">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>
    <span class="add-label">Markdown</span>
  </button>
  <button class="add-btn add-img" id="add-img" title="Bild" aria-label="Lägg till bild">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="16" height="12" rx="2"/><circle cx="7" cy="9" r="1.5"/><path d="M2 14l4-4 3 3 2-2 5 5"/></svg>
    <span class="add-label">Bild</span>
  </button>
  <button class="add-btn add-mm" id="add-mm" title="Mermaid" aria-label="Lägg till Mermaid">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="10" r="2"/><circle cx="15" cy="6" r="2"/><circle cx="15" cy="14" r="2"/><path d="M7 10h2l4-4M7 10h2l4 4"/></svg>
    <span class="add-label">Mermaid</span>
  </button>
  <button class="add-btn add-lbl" id="add-lbl" title="Label" aria-label="Lägg till label">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h14M3 10h9M3 14h6"/></svg>
    <span class="add-label">Label</span>
  </button>
  <button class="add-btn add-note" id="add-note" title="Note" aria-label="Lägg till note">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="12" height="14" rx="1"/><path d="M8 7h4M8 10h4"/></svg>
    <span class="add-label">Note</span>
  </button>
  <button class="add-btn add-ann" id="add-ann" title="Annotation" aria-label="Lägg till annotation">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14l4-4 3 3 4-6"/><path d="M3 17h14"/></svg>
    <span class="add-label">Annotation</span>
  </button>
  <button class="add-btn add-dio" id="add-drawio" title="Draw.io" aria-label="Lägg till Draw.io">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 10h6M10 7v6"/></svg>
    <span class="add-label">Draw.io</span>
  </button>
  <div class="add-more-wrap" id="add-more-wrap">
    <button type="button"
            class="add-btn add-more"
            id="add-more-btn"
            title="<?= h(add_menu_config()['buttonLabel'] ?? 'Fler val') ?>"
            aria-label="<?= h(add_menu_config()['buttonLabel'] ?? 'Fler val') ?>"
            aria-haspopup="menu"
            aria-expanded="false">⋯</button>
    <div class="add-more-menu" id="add-more-menu" role="menu" aria-label="<?= h(add_menu_config()['buttonLabel'] ?? 'Fler val') ?>">
      <?= render_add_more_menu() ?>
    </div>
  </div>
</div>

<!-- ZOOM CONTROLS -->
<div id="zc" class="hidden">
  <button class="zb" id="zi">+</button>
  <div id="zlevel">100%</div>
  <button class="zb" id="zo">−</button>
</div>

<!-- CONTEXT MENU -->
<div id="ctxmenu">
  <div class="ctx-item" id="ctx-edit"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 3.5l2 2-10 10H4.5v-2L14.5 3.5z"/></svg>Redigera</div>
  <div class="ctx-item" id="ctx-dup"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M3 13V4a1 1 0 011-1h9"/></svg>Duplicera</div>
  <div class="ctx-item" id="ctx-front"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h12M4 10h12M4 14h8"/><path d="M14 4l3 3-3 3"/></svg>Flytta längst fram</div>
  <div class="ctx-sep"></div>
  <div class="ctx-item danger" id="ctx-del"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h12M9 7V4h2v3M6 7l1 9h6l1-9"/></svg>Ta bort</div>
</div>

<!-- MODAL -->
<div id="modal-bg">
  <div id="modal">
    <div id="modal-head"><h3 id="modal-title">Redigera</h3><button id="modal-close">×</button></div>
    <div id="modal-body"></div>
    <div id="modal-foot">
      <div id="modal-foot-left"></div>
      <div id="modal-foot-actions">
        <button class="mbtn mbtn-cancel" id="modal-cancel">Avbryt</button>
        <button class="mbtn mbtn-primary" id="modal-ok">Spara</button>
      </div>
    </div>
  </div>
</div>

<!-- LOADING / TOAST -->
<div id="loading"><div class="spin"></div></div>
<div id="toast"></div>
<input type="file" id="file-input" accept=".zip,.skill,application/zip">

<!-- MARKDOWN FULLSCREEN EDITOR -->
<div id="md-editor-overlay" aria-hidden="true">
  <iframe id="md-editor-frame" title="Markdown-editor"></iframe>
</div>

<!-- DOCX IMPORT -->
<div id="docx-import-overlay" aria-hidden="true">
  <iframe id="docx-import-frame" title="Importera DOCX"></iframe>
</div>

<!-- DRAW.IO EDITOR -->
<div id="drawio-editor-overlay" aria-hidden="true">
  <iframe id="drawio-editor-frame" title="Draw.io-editor"></iframe>
</div>

<!-- PAINT EDITOR -->
<div id="paint-editor-overlay" aria-hidden="true">
  <iframe id="paint-editor-frame" title="Måla / redigera bild"></iframe>
</div>

<script>
<?php
$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
$app['basePath'] = ($scriptDir === '/' || $scriptDir === '.' || $scriptDir === '') ? '' : rtrim($scriptDir, '/') . '/';
?>
window.SC_APP = <?= json_encode($app, JSON_UNESCAPED_UNICODE) ?>;
window.SC_DEFAULTS = <?= json_encode($defaults, JSON_UNESCAPED_UNICODE) ?>;
window.SC_MODULES = <?= json_encode(registered_modules(), JSON_UNESCAPED_UNICODE) ?>;
window.SC_SETTINGS = <?= json_encode(settings_config(), JSON_UNESCAPED_UNICODE) ?>;
window.SC_ADD_MENU = <?= json_encode(add_menu_config(), JSON_UNESCAPED_UNICODE) ?>;
</script>
<?php
$assetBase = h($app['basePath'] ?? '');
?>
<script src="<?= $assetBase ?>js/add-menu.js?v=<?= asset_version('js/add-menu.js') ?>"></script>
<script src="<?= $assetBase ?>js/settings.js?v=<?= asset_version('js/settings.js') ?>"></script>
<script src="<?= $assetBase ?>js/skill-import.js?v=<?= asset_version('js/skill-import.js') ?>"></script>
<script src="<?= $assetBase ?>js/skill-tree.js?v=<?= asset_version('js/skill-tree.js') ?>"></script>
<script src="<?= $assetBase ?>js/modal.js?v=<?= asset_version('js/modal.js') ?>"></script>
<script src="<?= $assetBase ?>js/connections.js?v=<?= asset_version('js/connections.js') ?>"></script>
<script src="<?= $assetBase ?>js/docx-import.js?v=<?= asset_version('js/docx-import.js') ?>"></script>
<script src="<?= $assetBase ?>js/modules/registry.js?v=<?= asset_version('js/modules/registry.js') ?>"></script>
<script src="<?= $assetBase ?>app.js?v=<?= asset_version('app.js') ?>"></script>
<?php foreach (registered_module_scripts() as $script): ?>
<script src="<?= $assetBase ?><?= h($script) ?>?v=<?= asset_version($script) ?>"></script>
<?php endforeach; ?>
<script>
if (typeof ModuleRegistry !== 'undefined' && ModuleRegistry.ensureRegistered) {
  ModuleRegistry.ensureRegistered();
}
</script>
</body>
</html>
