/**
 * PromptBook — Skill Canvas embed (chat | editor) + standalone.
 * Node data via postMessage; LLM settings in localStorage only.
 */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const EMBED = params.get('embed') === '1';
  const MODE = params.get('mode') === 'chat' ? 'chat' : (params.get('mode') === 'editor' ? 'editor' : 'standalone');
  const LLM_KEY = 'sc-promptbook-llm';

  const PROVIDER_DEFAULTS = {
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', label: 'OpenAI' },
    lmstudio: { baseUrl: 'http://localhost:1234/v1', model: '', label: 'LM Studio' },
    ollama: { baseUrl: 'http://localhost:11434', model: 'llama3.1', label: 'Ollama' },
    openai_compat: { baseUrl: 'http://localhost:8080/v1', model: '', label: 'OpenAI-kompatibel' },
  };

  let nodeData = emptyNodeData();
  let cardTitle = '';
  let chatEnabled = false;
  let mdViewMode = false;
  let syncTimer = null;
  let llmProxyUrl = '';
  let excludeSkillFile = '';
  let skillMdFilesCache = [];
  let parentMsgSeq = 0;
  const parentMsgWait = new Map();
  const MAX_CONTEXT_FILES = 20;

  function resolveLlmProxyUrl() {
    if (llmProxyUrl) return llmProxyUrl;
    const path = location.pathname.replace(/\/html\/[^/]*$/, '');
    return location.origin + path + '/api/llm-proxy.php';
  }

  function isLocalHostUrl(url) {
    try {
      const u = new URL(String(url || '').replace(/\/$/, '') || 'http://localhost');
      const h = u.hostname.toLowerCase();
      return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
    } catch {
      return false;
    }
  }

  function isLocalAppHost() {
    const h = location.hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
  }

  /** Server-proxy när PHP och Ollama/LM Studio kör på samma dator (t.ex. localhost). */
  function shouldUseLlmProxy(baseUrl) {
    return isLocalHostUrl(baseUrl) && isLocalAppHost();
  }

  async function fetchLlm(baseUrl, path, body, method = 'POST') {
    const base = String(baseUrl || '').replace(/\/$/, '');

    async function direct() {
      return fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: method === 'POST' ? JSON.stringify(body) : undefined,
      });
    }

    async function viaProxy() {
      const r = await fetch(resolveLlmProxyUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: base, path, method, body }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const msg = typeof err.error === 'string' ? err.error : r.statusText;
        throw new Error(msg || 'LLM-proxy misslyckades');
      }
      return r;
    }

    if (shouldUseLlmProxy(base)) {
      return viaProxy();
    }

    try {
      return await direct();
    } catch (err) {
      if (isLocalHostUrl(base) && location.protocol === 'https:') {
        throw new Error(
          'Kan inte nå localhost från HTTPS-webbhotel (webbläsaren blockerar). ' +
          'Kör Skill Canvas lokalt (http://localhost), eller exponera Ollama via t.ex. ngrok och ange HTTPS-URL som Base URL.'
        );
      }
      if (isLocalHostUrl(base)) {
        throw new Error(
          'Kunde inte nå ' + base + '. Kontrollera att Ollama körs. ' +
          'Vid extern domän: sätt OLLAMA_ORIGINS=' + location.origin + ' i Ollama-miljön.'
        );
      }
      throw err;
    }
  }

  function llmErrorMessage(r, fallback) {
    return r.json().catch(() => ({})).then(e => {
      throw new Error(e.error?.message || e.message || e.error || fallback || r.statusText);
    });
  }

  function emptyNodeData() {
    return {
      version: 2,
      systemPrompt: 'Du är en hjälpsam assistent. Svara kort och tydligt på svenska.',
      variables: {},
      messages: [],
      mdOutput: '',
      contextFiles: [],
    };
  }

  function defaultLlm() {
    return { provider: '', apiKey: '', baseUrl: '', model: '', maxTokens: 4000, temperature: 0.7 };
  }

  function loadLlm() {
    try {
      const raw = localStorage.getItem(LLM_KEY);
      return raw ? { ...defaultLlm(), ...JSON.parse(raw) } : defaultLlm();
    } catch {
      return defaultLlm();
    }
  }

  function saveLlm(s) {
    localStorage.setItem(LLM_KEY, JSON.stringify(s));
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg, type = 'ok') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.background = type === 'err' ? 'var(--err)' : type === 'warn' ? 'var(--warn)' : 'var(--pb-ink)';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function normalizeIncoming(raw) {
    if (!raw || typeof raw !== 'object') return emptyNodeData();
    if (raw.version === 2) {
      return {
        version: 2,
        systemPrompt: String(raw.systemPrompt || ''),
        variables: raw.variables && typeof raw.variables === 'object' && !Array.isArray(raw.variables) ? raw.variables : {},
        messages: Array.isArray(raw.messages) ? raw.messages : [],
        mdOutput: String(raw.mdOutput || ''),
        contextFiles: Array.isArray(raw.contextFiles) ? raw.contextFiles.filter(p => typeof p === 'string') : [],
      };
    }
    if (Array.isArray(raw.promptbooks) && raw.promptbooks.length) {
      const pb = raw.promptbooks.find(p => p.id === raw.activePbId) || raw.promptbooks[0];
      const chat = raw.chatByPb?.[pb.id] || [];
      return {
        version: 2,
        systemPrompt: String(pb.content || ''),
        variables: pb.variables || {},
        messages: chat.map(m => ({ role: m.role, content: m.content, ts: m.ts || Date.now() })),
        mdOutput: String(raw.mdOutput || ''),
      };
    }
    return emptyNodeData();
  }

  function getNodeSnapshot() {
    if (MODE === 'editor') readEditorFields();
    return JSON.parse(JSON.stringify(nodeData));
  }

  function postParent(msg) {
    if (EMBED && window.parent !== window) window.parent.postMessage(msg, '*');
  }

  function waitParentMessage(type, requestId, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        parentMsgWait.delete(requestId);
        reject(new Error('Timeout vid hämtning från Skill Canvas'));
      }, timeoutMs);
      parentMsgWait.set(requestId, { type, resolve, reject, timer });
    });
  }

  function handleParentFileMessages(d) {
    if (!d?.requestId || !parentMsgWait.has(d.requestId)) return;
    const pending = parentMsgWait.get(d.requestId);
    if (d.type !== pending.type) return;
    clearTimeout(pending.timer);
    parentMsgWait.delete(d.requestId);
    pending.resolve(d);
  }

  async function listSkillFilesFromParent() {
    if (skillMdFilesCache.length) return skillMdFilesCache;
    if (!EMBED) return [];
    const requestId = `pb-list-${++parentMsgSeq}`;
    postParent({ type: 'sc-promptbook-list-files', requestId, excludePaths: excludeSkillFile ? [excludeSkillFile] : [] });
    const res = await waitParentMessage('sc-promptbook-files-list', requestId);
    skillMdFilesCache = Array.isArray(res.files) ? res.files : [];
    return skillMdFilesCache;
  }

  async function readSkillFilesFromParent(paths) {
    if (!EMBED || !paths?.length) return {};
    const requestId = `pb-read-${++parentMsgSeq}`;
    postParent({ type: 'sc-promptbook-read-files', requestId, paths });
    const res = await waitParentMessage('sc-promptbook-files-content', requestId, 30000);
    return res.files && typeof res.files === 'object' ? res.files : {};
  }

  function formatFileSize(bytes) {
    if (bytes == null || bytes < 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function renderContextFiles() {
    const list = document.getElementById('contextFileList');
    if (!list) return;
    const paths = nodeData.contextFiles || [];
    if (!paths.length) {
      list.innerHTML = '';
      return;
    }
    list.innerHTML = paths.map(p => `
      <li class="context-file-item">
        <span class="cf-path" title="${esc(p)}">${esc(p)}</span>
        <button type="button" class="cf-remove" data-path="${esc(p)}" title="Ta bort" aria-label="Ta bort ${esc(p)}">×</button>
      </li>
    `).join('');
    list.querySelectorAll('.cf-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.dataset.path;
        nodeData.contextFiles = (nodeData.contextFiles || []).filter(x => x !== path);
        renderContextFiles();
      });
    });
  }

  function addContextFile(path) {
    if (!path) return;
    if (!nodeData.contextFiles) nodeData.contextFiles = [];
    if (nodeData.contextFiles.includes(path)) {
      toast('Filen är redan bifogad', 'warn');
      return;
    }
    if (nodeData.contextFiles.length >= MAX_CONTEXT_FILES) {
      toast(`Max ${MAX_CONTEXT_FILES} filer`, 'warn');
      return;
    }
    nodeData.contextFiles.push(path);
    renderContextFiles();
    closeSkillFileModal();
    toast('Fil bifogad');
  }

  async function openSkillFileModal() {
    if (!EMBED) {
      toast('Endast tillgängligt i Skill Canvas', 'warn');
      return;
    }
    const modal = document.getElementById('skillFileModal');
    const listEl = document.getElementById('skillFilePickerList');
    const search = document.getElementById('skillFileSearch');
    if (!modal || !listEl) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    if (search) search.value = '';
    listEl.innerHTML = '<div class="skill-file-picker-empty">Laddar Markdown-filer…</div>';
    try {
      let files = skillMdFilesCache;
      if (!files.length) files = await listSkillFilesFromParent();
      if (!files.length) {
        listEl.innerHTML = '<div class="skill-file-picker-empty">Inga .md-filer i skill-minnet.</div>';
        return;
      }
      renderSkillFilePicker(files, '');
      if (search) {
        search.oninput = () => renderSkillFilePicker(files, search.value.trim().toLowerCase());
        search.focus();
      }
    } catch (err) {
      listEl.innerHTML = `<div class="skill-file-picker-empty">${esc(err.message)}</div>`;
    }
  }

  function closeSkillFileModal() {
    const modal = document.getElementById('skillFileModal');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
  }

  function renderSkillFilePicker(allFiles, filter) {
    const listEl = document.getElementById('skillFilePickerList');
    if (!listEl) return;
    const attached = new Set(nodeData.contextFiles || []);
    let files = allFiles;
    if (filter) files = files.filter(f => f.path.toLowerCase().includes(filter));
    if (!files.length) {
      listEl.innerHTML = '<div class="skill-file-picker-empty">Inga filer matchar.</div>';
      return;
    }
    listEl.innerHTML = files.map(f => {
      const isAttached = attached.has(f.path);
      const meta = [formatFileSize(f.size), isAttached ? 'bifogad' : ''].filter(Boolean).join(' · ');
      return `<button type="button" class="skill-file-picker-item${isAttached ? ' is-attached' : ''}" data-path="${esc(f.path)}" ${isAttached ? 'disabled' : ''} title="${esc(f.path)}">
        <span class="sf-kind">MD</span>
        <span class="sf-path">${esc(f.path)}</span>
        <span class="sf-meta">${esc(meta)}</span>
      </button>`;
    }).join('');
    listEl.querySelectorAll('.skill-file-picker-item:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => addContextFile(btn.dataset.path));
    });
  }

  function scheduleSync() {
    if (!EMBED || MODE !== 'chat') return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      postParent({ type: 'sc-promptbook-sync', data: getNodeSnapshot(), title: cardTitle });
    }, 350);
  }

  function readEditorFields() {
    if (MODE !== 'editor' && MODE !== 'standalone') return;
    const sp = document.getElementById('systemPrompt');
    const vj = document.getElementById('variablesJson');
    const ct = document.getElementById('cardTitle');
    const md = document.getElementById('mdOut');
    if (sp) {
      const trimmed = sp.value.trim();
      if (trimmed) nodeData.systemPrompt = trimmed;
    }
    if (md) nodeData.mdOutput = md.value;
    if (ct) cardTitle = ct.value.trim();
    if (vj) {
      const s = vj.value.trim();
      if (!s) nodeData.variables = autoVars(nodeData.systemPrompt, {});
      else {
        try { nodeData.variables = autoVars(nodeData.systemPrompt, JSON.parse(s)); }
        catch { /* keep */ }
      }
    }
  }

  function autoVars(prompt, vars) {
    const out = { ...vars };
    [...String(prompt || '').matchAll(/\[([^\]]+)\]/g)].forEach(m => { if (!out[m[1]]) out[m[1]] = m[1]; });
    return out;
  }

  function applyNodeData(data, title) {
    nodeData = normalizeIncoming(data);
    cardTitle = String(title || '');
    if (MODE === 'editor' || MODE === 'standalone') fillEditorFields();
    refreshChatUi();
  }

  function fillEditorFields() {
    const sp = document.getElementById('systemPrompt');
    const vj = document.getElementById('variablesJson');
    const ct = document.getElementById('cardTitle');
    const md = document.getElementById('mdOut');
    if (sp) sp.value = nodeData.systemPrompt || '';
    if (vj) vj.value = Object.keys(nodeData.variables || {}).length ? JSON.stringify(nodeData.variables, null, 2) : '';
    if (ct) ct.value = cardTitle;
    if (md) md.value = nodeData.mdOutput || '';
    renderContextFiles();
    if (mdViewMode) renderMdPreview();
  }

  function canUseChatInput() {
    if (MODE === 'editor' || MODE === 'standalone') return true;
    return chatEnabled && MODE === 'chat';
  }

  function setChatEnabled(on) {
    chatEnabled = !!on;
    const input = document.getElementById('userInput');
    const btn = document.getElementById('sendBtn');
    const can = canUseChatInput();
    if (input) input.disabled = !can;
    if (btn) btn.disabled = !can;
  }

  function refreshChatUi() {
    updateProvBar();
    if (MODE !== 'chat') updateSysPreview();
    renderVars();
    renderMessages();
    const title = document.getElementById('chatTitle');
    if (title) {
      title.textContent = MODE === 'chat' ? '' : (cardTitle ? `Chatt — ${cardTitle}` : 'Chatt');
    }
    const sub = document.getElementById('headerSubtitle');
    if (sub && MODE === 'chat') sub.textContent = cardTitle || 'PromptBook';
  }

  function updateProvBar() {
    const s = loadLlm();
    const dot = document.getElementById('provDot');
    const name = document.getElementById('provName');
    const model = document.getElementById('provModel');
    if (s.provider) {
      dot?.classList.add('ok');
      const label = PROVIDER_DEFAULTS[s.provider]?.label || s.provider;
      const modelName = s.model || '';
      if (name) name.textContent = label;
      if (model) model.textContent = modelName;
    } else {
      dot?.classList.remove('ok');
      if (name) name.textContent = MODE === 'chat' ? 'Ingen LLM' : 'Konfigurera LLM (⚙)';
      if (model) model.textContent = '';
    }
  }

  function updateSysPreview() {
    const p = (nodeData.systemPrompt || '').slice(0, 55) + ((nodeData.systemPrompt || '').length > 55 ? '…' : '');
    const prev = document.getElementById('sysPreview');
    const body = document.getElementById('sysContent');
    if (prev) prev.textContent = p;
    if (body) body.textContent = nodeData.systemPrompt || '';
  }

  function renderVars() {
    const bar = document.getElementById('varsBar');
    const grid = document.getElementById('varsGrid');
    const keys = Object.keys(nodeData.variables || {});
    if (!bar || !grid) return;
    if (!keys.length) { bar.hidden = true; return; }
    bar.hidden = false;
    const readOnly = MODE === 'chat';
    grid.innerHTML = keys.map(k => {
      const val = String(nodeData.variables[k] ?? '');
      return `
      <div class="var-field">
        <label>${esc(k)}</label>
        <input type="text" data-var="${esc(k)}" value="${esc(val)}" placeholder="${esc(val || k)}" ${readOnly ? 'readonly tabindex="-1"' : ''}>
      </div>
    `;
    }).join('');
  }

  function getVarValues() {
    const vals = {};
    document.querySelectorAll('[data-var]').forEach(el => { vals[el.dataset.var] = el.value.trim(); });
    return vals;
  }

  function renderMessages() {
    const area = document.getElementById('msgArea');
    if (!area) return;
    const msgs = nodeData.messages || [];
    if (!msgs.length) {
      area.innerHTML = '<div class="msg-empty">Skriv ett meddelande för att starta.</div>';
      return;
    }
    area.innerHTML = msgs.map(m => {
      const user = m.role === 'user';
      const ts = m.ts ? new Date(m.ts).toLocaleTimeString('sv', { hour: '2-digit', minute: '2-digit' }) : '';
      return `<div class="msg ${m.role}">
        <div class="msg-role">${user ? 'Du' : 'AI'}</div>
        <div class="msg-bubble">${markdownToHtml(m.content)}</div>
        <div class="msg-meta">${ts}</div>
      </div>`;
    }).join('');
    area.scrollTop = area.scrollHeight;
  }

  function showThinking() {
    const area = document.getElementById('msgArea');
    const el = document.createElement('div');
    el.className = 'msg assistant';
    el.id = 'thinkingDots';
    el.innerHTML = '<div class="msg-role">AI</div><div class="thinking"><span></span><span></span><span></span></div>';
    area?.appendChild(el);
    if (area) area.scrollTop = area.scrollHeight;
  }

  function hideThinking() { document.getElementById('thinkingDots')?.remove(); }

  async function sendMsg() {
    if (MODE === 'chat' && !chatEnabled) return;
    const input = document.getElementById('userInput');
    const txt = input?.value?.trim();
    if (!txt) return;

    const llm = loadLlm();
    if (!llm.provider) {
      toast('Konfigurera LLM i Redigera-läge', 'err');
      return;
    }

    if (MODE === 'editor') readEditorFields();

    input.value = '';
    input.style.height = 'auto';

    nodeData.messages.push({ role: 'user', content: txt, ts: Date.now() });
    renderMessages();
    showThinking();
    document.getElementById('sendBtn').disabled = true;
    input.disabled = true;

    try {
      const sys = await buildSystemPrompt();
      const hist = nodeData.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
      const reply = await callLLM(sys, hist, txt);
      hideThinking();
      nodeData.messages.push({ role: 'assistant', content: reply, ts: Date.now() });
      renderMessages();
      if (EMBED && MODE === 'chat') scheduleSync();
    } catch (err) {
      hideThinking();
      nodeData.messages.push({ role: 'assistant', content: `**Fel:** ${err.message}`, ts: Date.now() });
      renderMessages();
      toast(err.message, 'err');
      if (EMBED && MODE === 'chat') scheduleSync();
    }

    if (MODE === 'chat') setChatEnabled(chatEnabled);
    else {
      setChatEnabled(true);
      input.focus();
    }
  }

  async function buildSystemPrompt() {
    let sys = nodeData.systemPrompt || '';
    Object.entries(getVarValues()).forEach(([k, v]) => {
      if (v) sys = sys.replace(new RegExp(`\\[${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g'), v);
    });
    const paths = nodeData.contextFiles || [];
    if (EMBED && paths.length) {
      try {
        const contents = await readSkillFilesFromParent(paths);
        for (const path of paths) {
          const entry = contents[path];
          if (entry?.content) {
            sys += `\n\n---\n## Fil: ${path}\n\n${entry.content}\n---`;
          } else if (entry?.error) {
            sys += `\n\n---\n## Fil: ${path}\n\n(Fel: ${entry.error})\n---`;
          }
        }
      } catch (err) {
        console.warn('contextFiles:', err);
        sys += `\n\n(Kunde inte läsa bifogade filer: ${err.message})`;
      }
    }
    return sys;
  }

  async function callLLM(systemPrompt, history, userMsg) {
    const s = loadLlm();
    const messages = [...history, { role: 'user', content: userMsg }];
    if (s.provider === 'ollama') return callOllama(systemPrompt, messages, s);
    return callOpenAICompat(systemPrompt, messages, s);
  }

  async function callOpenAICompat(systemPrompt, messages, s) {
    const def = PROVIDER_DEFAULTS[s.provider] || PROVIDER_DEFAULTS.openai;
    const base = (s.baseUrl || def.baseUrl).replace(/\/$/, '');
    const payload = {
      model: s.model || def.model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: parseInt(s.maxTokens, 10) || 4000,
      temperature: parseFloat(s.temperature) || 0.7,
    };
    let r;
    if (shouldUseLlmProxy(base)) {
      r = await fetchLlm(base, '/v1/chat/completions', payload);
    } else {
      const url = base.includes('/chat/completions') ? base : `${base}/chat/completions`;
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      if (s.apiKey) headers.Authorization = `Bearer ${s.apiKey}`;
      r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    }
    if (!r.ok) await llmErrorMessage(r, 'LLM-anrop misslyckades');
    const d = await r.json();
    return d.choices?.[0]?.message?.content || '';
  }

  async function callOllama(systemPrompt, messages, s) {
    const base = (s.baseUrl || PROVIDER_DEFAULTS.ollama.baseUrl).replace(/\/$/, '');
    const payload = {
      model: s.model || PROVIDER_DEFAULTS.ollama.model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: false,
      options: { temperature: parseFloat(s.temperature) || 0.7 },
    };
    const r = await fetchLlm(base, '/api/chat', payload);
    if (!r.ok) await llmErrorMessage(r, 'Ollama-anrop misslyckades');
    const d = await r.json();
    return d.message?.content || '';
  }

  function markdownToHtml(md) {
    if (!md) return '';
    let h = esc(md);
    h = h.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, c) => `<pre><code>${c}</code></pre>`);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/\n/g, '<br>');
    return h;
  }

  // ── LLM modal ──
  const LLM_UI = {
    openai: {
      prov: 'Molnbaserad API från OpenAI. Skapa en API-nyckel på platform.openai.com. Nyckeln lagras endast i webbläsaren och följer inte med i .skill-export.',
      apiKey: 'Klistra in nyckeln som börjar med sk-… Krävs för alla anrop.',
      base: '',
      model: 'Vanliga modeller: gpt-4o-mini (snabb/billig), gpt-4o, gpt-4.1.',
      basePlaceholder: '',
      modelPlaceholder: 'gpt-4o-mini',
    },
    lmstudio: {
      prov: 'Lokal inferens via LM Studio. Starta Local Server i LM Studio (Developer-fliken) innan du testar.',
      apiKey: '',
      base: 'Standard är http://localhost:1234/v1. På samma nätverk kan du använda datorns IP, t.ex. http://192.168.50.50:1234/v1. Vid Skill Canvas på localhost används server-proxy automatiskt.',
      model: 'Ange exakt modellnamn som visas i LM Studio när servern är igång.',
      basePlaceholder: 'http://localhost:1234/v1',
      modelPlaceholder: 'modell från LM Studio',
    },
    ollama: {
      prov: 'Ollama på samma dator eller i LAN. Base URL utan /v1. localhost fungerar ofta — annars datorns IP, t.ex. http://192.168.50.50:11434.',
      apiKey: '',
      base: 'Kontrollera med ollama list och curl http://192.168.50.50:11434/api/tags. Vid extern HTTPS-sida kan webbläsaren blockera — kör då Skill Canvas via http://localhost eller använd en HTTPS-tunnel (ngrok).',
      model: 'Exakt namn från ollama list, t.ex. llama3.1, gemma2:27b, mistral.',
      basePlaceholder: 'http://localhost:11434',
      modelPlaceholder: 'llama3.1',
    },
    openai_compat: {
      prov: 'Valfri server med OpenAI-kompatibelt API (vLLM, LocalAI, text-generation-webui m.fl.).',
      apiKey: 'Fyll i om servern kräver Bearer-token — lämna tom om ingen auth behövs.',
      base: 'Base URL ska peka på /v1-roten, t.ex. http://localhost:8080/v1 eller http://192.168.50.50:8080/v1.',
      model: 'Modellnamn enligt serverns dokumentation eller /v1/models.',
      basePlaceholder: 'http://localhost:8080/v1',
      modelPlaceholder: 'modellnamn',
    },
  };

  function updateLlmProviderUi(p) {
    const ui = LLM_UI[p] || LLM_UI.openai;
    const provHint = document.getElementById('llmProvHint');
    const apiHint = document.getElementById('llmApiKeyHint');
    const baseHint = document.getElementById('llmBaseUrlHint');
    const modelHint = document.getElementById('modelHint');
    const baseInput = document.getElementById('llmBaseUrl');
    const modelInput = document.getElementById('llmModel');

    if (provHint) provHint.textContent = ui.prov || '';
    if (apiHint) apiHint.textContent = ui.apiKey || '';
    if (baseHint) baseHint.textContent = ui.base || '';
    if (modelHint) modelHint.textContent = ui.model || '';
    if (baseInput) baseInput.placeholder = ui.basePlaceholder || 'http://localhost:11434';
    if (modelInput) modelInput.placeholder = ui.modelPlaceholder || '';
  }

  function selectProv(p) {
    document.querySelectorAll('.prov-btn').forEach(b => b.classList.toggle('on', b.dataset.p === p));
    document.getElementById('sec-apikey')?.classList.toggle('visible', p === 'openai' || p === 'openai_compat');
    document.getElementById('sec-local')?.classList.toggle('visible', p === 'ollama' || p === 'lmstudio' || p === 'openai_compat');
    const base = document.getElementById('llmBaseUrl');
    if (base && !base.value.trim() && PROVIDER_DEFAULTS[p]) base.value = PROVIDER_DEFAULTS[p].baseUrl;
    document.getElementById('llmModal')?.setAttribute('data-provider', p);
    updateLlmProviderUi(p);
  }

  function readLlmForm() {
    const p = document.getElementById('llmModal')?.getAttribute('data-provider') || document.querySelector('.prov-btn.on')?.dataset.p || '';
    return {
      provider: p,
      apiKey: document.getElementById('llmApiKey')?.value?.trim() || '',
      baseUrl: document.getElementById('llmBaseUrl')?.value?.trim() || '',
      model: document.getElementById('llmModel')?.value?.trim() || '',
      maxTokens: parseInt(document.getElementById('llmMaxTokens')?.value, 10) || 4000,
      temperature: parseFloat(document.getElementById('llmTemp')?.value) || 0.7,
    };
  }

  function fillLlmForm(s) {
    selectProv(s.provider || 'openai');
    const map = { llmApiKey: 'apiKey', llmBaseUrl: 'baseUrl', llmModel: 'model', llmMaxTokens: 'maxTokens', llmTemp: 'temperature' };
    Object.entries(map).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el && s[key] != null) el.value = s[key];
    });
    const tv = document.getElementById('tempVal');
    if (tv) tv.textContent = document.getElementById('llmTemp')?.value || '0.7';
  }

  function openLLMModal() {
    fillLlmForm(loadLlm());
    document.getElementById('llmTestResult').textContent = '';
    document.getElementById('llmModal')?.classList.add('open');
  }

  function closeLLMModal() { document.getElementById('llmModal')?.classList.remove('open'); }

  async function testLLM() {
    const res = document.getElementById('llmTestResult');
    if (res) res.textContent = 'Testar…';
    const prev = loadLlm();
    saveLlm(readLlmForm());
    try {
      const reply = await callLLM('Svara bara: OK', [], 'Hej');
      if (res) res.textContent = 'OK: ' + reply.slice(0, 40);
    } catch (e) {
      if (res) res.textContent = 'Fel: ' + e.message;
    }
    saveLlm(prev);
  }

  function saveLLMModal() {
    saveLlm(readLlmForm());
    closeLLMModal();
    updateProvBar();
    toast('LLM-inställningar sparade');
  }

  // ── Markdown ──
  function appendToMd() {
    if (!nodeData.messages?.length) { toast('Ingen chatt', 'warn'); return; }
    readEditorFields();
    const ts = new Date().toLocaleString('sv');
    const header = `## ${cardTitle || 'PromptBook'}\n\n*${ts}*\n\n`;
    let block = '';
    nodeData.messages.forEach(m => {
      block += `**${m.role === 'user' ? 'Du' : 'AI'}**\n\n${m.content}\n\n`;
    });
    nodeData.mdOutput = (nodeData.mdOutput ? nodeData.mdOutput + '\n\n---\n\n' : '') + header + block;
    const md = document.getElementById('mdOut');
    if (md) md.value = nodeData.mdOutput.trim();
    toast('Lagt till i Markdown');
    if (mdViewMode) renderMdPreview();
  }

  function copyMd() {
    const t = document.getElementById('mdOut')?.value;
    if (!t) return;
    navigator.clipboard.writeText(t);
    toast('Kopierat');
  }

  function downloadMd() {
    const t = document.getElementById('mdOut')?.value;
    if (!t) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([t], { type: 'text/markdown' }));
    a.download = (cardTitle || 'promptbook').replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.md';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toggleMdView() {
    mdViewMode = !mdViewMode;
    const area = document.getElementById('mdOut');
    const prev = document.getElementById('mdPreview');
    const btn = document.getElementById('mdViewBtn');
    if (mdViewMode) {
      renderMdPreview();
      if (area) area.style.display = 'none';
      prev?.classList.add('visible');
      if (btn) btn.textContent = 'Redigera';
    } else {
      if (area) area.style.display = 'block';
      prev?.classList.remove('visible');
      if (btn) btn.textContent = 'Förhandsgranska';
    }
  }

  function renderMdPreview() {
    const prev = document.getElementById('mdPreview');
    const raw = document.getElementById('mdOut')?.value || '';
    if (prev) prev.innerHTML = markdownToHtml(raw);
  }

  async function clearChat() {
    if (!confirm('Rensa chatten?')) return;
    nodeData.messages = [];
    renderMessages();
    if (EMBED && MODE === 'chat') scheduleSync();
  }

  function requestSave() {
    readEditorFields();
    if (!nodeData.systemPrompt?.trim()) {
      toast('Skriv en systemprompt i vänster panel', 'err');
      document.getElementById('systemPrompt')?.focus();
      return;
    }
    postParent({ type: 'sc-promptbook-save', data: getNodeSnapshot(), title: cardTitle });
  }

  function wireEmbedMessages() {
    if (window.__pbEmbedMsgWired) return;
    window.__pbEmbedMsgWired = true;
    window.addEventListener('message', e => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'sc-promptbook-files-list' || d.type === 'sc-promptbook-files-content') {
        handleParentFileMessages(d);
        return;
      }
      if (!EMBED) return;
      if (d.type === 'sc-promptbook-init') {
        applyNodeData(d.data, d.title);
        if (d.theme) document.documentElement.setAttribute('data-theme', d.theme);
        if (d.llmProxyUrl) llmProxyUrl = d.llmProxyUrl;
        if (d.excludeFile) excludeSkillFile = d.excludeFile;
        if (Array.isArray(d.skillMdFiles)) skillMdFilesCache = d.skillMdFiles;
        setChatEnabled(!!d.chatEnabled);
      } else if (d.type === 'sc-promptbook-set-theme' && d.theme) {
        document.documentElement.setAttribute('data-theme', d.theme);
      } else if (d.type === 'sc-promptbook-set-active') {
        setChatEnabled(!!d.chatEnabled);
      }
    });
  }

  function wireEmbed() {
    postParent({ type: 'sc-promptbook-ready' });
  }

  function wireUi() {
    document.getElementById('btnAddContextFile')?.addEventListener('click', () => { void openSkillFileModal(); });
    document.getElementById('closeSkillFileModal')?.addEventListener('click', closeSkillFileModal);
    document.getElementById('cancelSkillFileModal')?.addEventListener('click', closeSkillFileModal);
    document.getElementById('skillFileModal')?.addEventListener('click', e => {
      if (e.target.id === 'skillFileModal') closeSkillFileModal();
    });

    document.getElementById('btnLLM')?.addEventListener('click', openLLMModal);
    document.getElementById('btnSaveEmbed')?.addEventListener('click', requestSave);
    document.getElementById('btnCancelEmbed')?.addEventListener('click', () => postParent({ type: 'sc-promptbook-cancel' }));
    document.getElementById('btnTheme')?.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      if (!EMBED) localStorage.setItem('sc-pb-theme', next);
    });
    document.getElementById('sendBtn')?.addEventListener('click', () => sendMsg());
    document.getElementById('userInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
    document.getElementById('userInput')?.addEventListener('input', e => {
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
      document.getElementById('charHint').textContent = el.value.length ? el.value.length + ' tkn' : '';
    });
    document.getElementById('sysToggle')?.addEventListener('click', () => {
      const btn = document.getElementById('sysToggle');
      const body = document.getElementById('sysContent');
      const open = btn?.classList.toggle('open');
      if (body) body.hidden = !open;
    });
    document.getElementById('clearChatBtn')?.addEventListener('click', clearChat);
    document.getElementById('appendMdBtn')?.addEventListener('click', appendToMd);
    document.getElementById('mdViewBtn')?.addEventListener('click', toggleMdView);
    document.getElementById('copyMdBtn')?.addEventListener('click', copyMd);
    document.getElementById('downloadMdBtn')?.addEventListener('click', downloadMd);
    document.getElementById('closeLLMModal')?.addEventListener('click', closeLLMModal);
    document.getElementById('cancelLLMModal')?.addEventListener('click', closeLLMModal);
    document.getElementById('saveLLMBtn')?.addEventListener('click', saveLLMModal);
    document.getElementById('testLLMBtn')?.addEventListener('click', testLLM);
    document.getElementById('llmTemp')?.addEventListener('input', e => {
      const tv = document.getElementById('tempVal');
      if (tv) tv.textContent = e.target.value;
    });
    document.querySelectorAll('.prov-btn').forEach(b => b.addEventListener('click', () => selectProv(b.dataset.p)));

    ['systemPrompt', 'variablesJson', 'cardTitle'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        readEditorFields();
        refreshChatUi();
      });
    });
    document.getElementById('mdOut')?.addEventListener('input', () => {
      nodeData.mdOutput = document.getElementById('mdOut').value;
    });

    document.getElementById('llmModal')?.addEventListener('click', e => {
      if (e.target.id === 'llmModal') closeLLMModal();
    });

    if (MODE === 'editor' || MODE === 'standalone') {
      setChatEnabled(true);
    }
  }

  function init() {
    const theme = EMBED ? (params.get('theme') || 'light') : (localStorage.getItem('sc-pb-theme') || params.get('theme') || 'light');
    document.documentElement.setAttribute('data-theme', theme);
    wireEmbedMessages();
    wireUi();
    if (EMBED) wireEmbed();
    else {
      applyNodeData(emptyNodeData(), '');
      fillEditorFields();
    }
  }

  init();
})();
