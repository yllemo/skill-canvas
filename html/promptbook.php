<?php
declare(strict_types=1);

$embed = isset($_GET['embed']) && $_GET['embed'] === '1';
$mode = in_array($_GET['mode'] ?? '', ['chat', 'editor'], true) ? $_GET['mode'] : ($embed ? 'editor' : 'standalone');
$theme = in_array($_GET['theme'] ?? '', ['light', 'dark'], true) ? $_GET['theme'] : 'light';
$bodyClass = trim(implode(' ', array_filter([
    $embed ? 'embed-mode' : 'standalone-mode',
    'mode-' . $mode,
])));
?>
<!DOCTYPE html>
<html lang="sv" data-theme="<?= htmlspecialchars($theme, ENT_QUOTES, 'UTF-8') ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PromptBook<?= $embed ? ' — Skill Canvas' : '' ?></title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/promptbook.css">
</head>
<body class="<?= htmlspecialchars($bodyClass, ENT_QUOTES, 'UTF-8') ?>">

<header id="pbHeader">
  <div class="logo">
    <span class="logo-mark" aria-hidden="true">📖</span>
    <span class="logo-name">PromptBook</span>
    <span class="logo-sub" id="headerSubtitle">Skill Canvas</span>
  </div>
  <div class="hbtns" id="headerActions">
    <button type="button" class="hbtn hbtn-editor" id="btnLLM">⚙ LLM</button>
    <button type="button" class="hbtn hbtn-editor" id="btnCancelEmbed">Avbryt</button>
    <button type="button" class="hbtn save hbtn-editor" id="btnSaveEmbed">Spara &amp; stäng</button>
    <button type="button" class="hbtn hbtn-standalone" id="btnTheme" title="Byt tema">🌓</button>
  </div>
</header>

<div class="app">
  <!-- Prompt (editor only) -->
  <aside class="col col-prompt" id="colPrompt">
    <div class="col-header">
      <span class="col-title">Prompt</span>
    </div>
    <div class="col-body prompt-panel">
      <div class="form-row">
        <label for="cardTitle">Korttitel</label>
        <input type="text" id="cardTitle" placeholder="Visas på canvas-kortet…">
      </div>
      <div class="form-row code">
        <label for="systemPrompt">Systemprompt</label>
        <textarea id="systemPrompt" spellcheck="false" placeholder="Du är en expert…&#10;&#10;Använd [variabel] för dynamiska fält."></textarea>
        <p class="hint-text">En prompt per kort. Variabler skrivs som [namn].</p>
      </div>
      <div class="form-row">
        <label for="variablesJson">Variabler (JSON)</label>
        <textarea id="variablesJson" rows="3" spellcheck="false" placeholder='{"ämne": "Beskrivning"}'></textarea>
      </div>
      <div class="form-row context-files-row">
        <label>Markdown från skill</label>
        <ul id="contextFileList" class="context-file-list" aria-label="Bifogade Markdown-filer"></ul>
        <button type="button" class="btn btn-secondary btn-sm" id="btnAddContextFile">+ Lägg till .md…</button>
        <p class="hint-text">Endast .md-filer i skill-minnet. Innehållet läses in vid varje chattmeddelande och skickas till LLM.</p>
      </div>
    </div>
  </aside>

  <!-- Chat -->
  <main class="col col-chat chat-wrap">
    <div class="col-header col-header-chat">
      <span class="col-title" id="chatTitle">Chatt</span>
      <div class="chat-toolbar hbtn-editor">
        <button type="button" class="btn btn-secondary btn-sm" id="clearChatBtn" title="Rensa chatt">Rensa</button>
        <button type="button" class="btn btn-secondary btn-sm" id="appendMdBtn" title="Lägg till i markdown">→ MD</button>
      </div>
    </div>

    <div class="provider-bar">
      <div class="status-dot" id="provDot"></div>
      <span id="provName" class="prov-label">Ingen LLM konfigurerad</span>
      <span class="prov-model" id="provModel"></span>
    </div>

    <div class="sys-collapse">
      <button type="button" class="sys-toggle" id="sysToggle">
        <span class="arrow">▶</span>
        <span>Systemprompt</span>
        <span class="sys-preview" id="sysPreview"></span>
      </button>
      <pre class="sys-content" id="sysContent" hidden></pre>
    </div>

    <div class="vars-bar" id="varsBar" hidden>
      <div class="vars-bar-title">Variabler</div>
      <div class="vars-grid" id="varsGrid"></div>
    </div>

    <div id="msgArea" class="msg-area"></div>

    <div class="chat-input-wrap">
      <textarea id="userInput" rows="1" placeholder="Skriv meddelande… (Shift+Enter = ny rad)" disabled></textarea>
      <div class="send-col">
        <button type="button" class="btn btn-primary btn-sm" id="sendBtn" disabled>Skicka</button>
        <span class="char-hint" id="charHint"></span>
      </div>
    </div>
  </main>

  <!-- Markdown (editor only) -->
  <aside class="col col-md" id="colMd">
    <div class="col-header">
      <span class="col-title">Markdown</span>
      <div class="md-toolbar">
        <button type="button" class="btn btn-secondary btn-sm" id="mdViewBtn">Förhandsgranska</button>
        <button type="button" class="btn btn-secondary btn-sm" id="copyMdBtn">Kopiera</button>
        <button type="button" class="btn btn-primary btn-sm" id="downloadMdBtn">Spara</button>
      </div>
    </div>
    <textarea id="mdOut" placeholder="# PromptBook&#10;&#10;Exportera svar med → MD."></textarea>
    <div id="mdPreview" class="md-preview"></div>
  </aside>
</div>

<!-- LLM modal (editor + standalone) -->
<div class="modal-bg" id="llmModal">
  <div class="modal">
    <h2>LLM-inställningar
      <button type="button" class="modal-close" id="closeLLMModal">✕</button></h2>
    <p class="hint-text llm-modal-lead">Globala inställningar för alla PromptBook-kort — sparas i webbläsaren (localStorage).</p>
    <p class="hint-text llm-prov-hint" id="llmProvHint"></p>
    <div class="form-row">
      <label>Provider</label>
      <div class="provider-btns" id="provBtnRow">
        <button type="button" class="prov-btn" data-p="openai">OpenAI</button>
        <button type="button" class="prov-btn" data-p="lmstudio">LM Studio</button>
        <button type="button" class="prov-btn" data-p="ollama">Ollama</button>
        <button type="button" class="prov-btn" data-p="openai_compat">OpenAI-kompatibel</button>
      </div>
    </div>
    <hr class="section-sep">
    <div class="llm-section" id="sec-apikey">
      <div class="form-row">
        <label for="llmApiKey">API-nyckel</label>
        <input type="password" id="llmApiKey" autocomplete="off" placeholder="sk-…">
        <p class="hint-text" id="llmApiKeyHint"></p>
      </div>
    </div>
    <div class="llm-section" id="sec-local">
      <div class="form-row">
        <label for="llmBaseUrl">Base URL</label>
        <input type="text" id="llmBaseUrl" placeholder="http://localhost:11434">
        <p class="hint-text" id="llmBaseUrlHint"></p>
      </div>
    </div>
    <div class="form-row">
      <label for="llmModel">Modell</label>
      <input type="text" id="llmModel" placeholder="gpt-4o-mini">
      <p class="hint-text" id="modelHint"></p>
    </div>
    <div class="form-row">
      <label for="llmMaxTokens">Max tokens</label>
      <input type="number" id="llmMaxTokens" value="4000" min="100" max="32000">
    </div>
    <div class="form-row">
      <label for="llmTemp">Temperatur (<span id="tempVal">0.7</span>)</label>
      <input type="range" id="llmTemp" min="0" max="1" step="0.05" value="0.7">
    </div>
    <div class="modal-acts">
      <button type="button" class="btn btn-secondary" id="cancelLLMModal">Avbryt</button>
      <button type="button" class="btn btn-secondary" id="testLLMBtn">Testa</button>
      <button type="button" class="btn btn-primary" id="saveLLMBtn">Spara</button>
    </div>
    <div id="llmTestResult" class="llm-test-result"></div>
  </div>
</div>

<div id="toast"></div>

<!-- Välj fil från skill-minnet (embed) -->
<div class="modal-bg" id="skillFileModal" aria-hidden="true">
  <div class="modal skill-file-modal">
    <h2>Markdown-filer i skill-minnet
      <button type="button" class="modal-close" id="closeSkillFileModal" aria-label="Stäng">✕</button>
    </h2>
    <p class="hint-text">Välj en .md-fil som redan finns i det öppna skill-paketet. Innehållet bifogas till prompten vid chatt.</p>
    <input type="search" id="skillFileSearch" class="skill-file-search" placeholder="Filtrera på sökväg…" autocomplete="off">
    <div id="skillFilePickerList" class="skill-file-picker-list" role="listbox"></div>
    <div class="modal-acts">
      <button type="button" class="btn btn-secondary" id="cancelSkillFileModal">Stäng</button>
    </div>
  </div>
</div>

<script src="js/promptbook-app.js?v=<?= is_file(__DIR__ . '/js/promptbook-app.js') ? filemtime(__DIR__ . '/js/promptbook-app.js') : '1' ?>"></script>
</body>
</html>
