// ════════════════════════════════════════════════════════════
//  PROMPTBOOK — iframe chat on card, fullscreen editor for settings
// ════════════════════════════════════════════════════════════
const PromptbookModule = (() => {
  const TYPE = 'promptbook';
  const cfg = () => window.SC_DEFAULTS?.modules?.promptbook || {};
  const nodeDefaults = () => window.SC_DEFAULTS?.nodes?.promptbook || {};

  let editorCleanup = null;
  let editingNodeId = null;
  const iframeCleanups = new Map();

  function editorUrl() {
    return cfg().editorUrl || 'html/promptbook.php';
  }

  function assetUrl(path) {
    const base = window.SC_APP?.basePath || '';
    const rel = String(path || '').replace(/^\//, '');
    return base + rel;
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
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

  const PB_MD_EXT = /\.(md|markdown)$/i;

  function isMdSkillFile(path) {
    if (!path) return false;
    if (path === 'SKILL.md') return true;
    return PB_MD_EXT.test(path);
  }

  function listInMemorySkillFiles(excludePaths = []) {
    const exclude = new Set((excludePaths || []).filter(Boolean));
    if (typeof files === 'undefined') return [];
    return Object.keys(files)
      .filter(p => isMdSkillFile(p) && !exclude.has(p))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(path => {
        const data = files[path];
        const size = data instanceof Uint8Array ? data.byteLength : 0;
        return { path, ext: 'md', size };
      });
  }

  async function readInMemorySkillFileTexts(paths) {
    const out = {};
    const maxChars = 120000;
    for (const path of paths || []) {
      if (!isMdSkillFile(path)) {
        out[path] = { error: 'Endast Markdown-filer (.md) stöds' };
        continue;
      }
      if (!files?.[path]) {
        out[path] = { error: 'Fil saknas i minnet' };
        continue;
      }
      try {
        let content = await readTextFile(path);
        if (content.length > maxChars) {
          content = content.slice(0, maxChars) + '\n\n[… innehållet trunkerades …]';
        }
        out[path] = { content };
      } catch (err) {
        out[path] = { error: String(err.message || err) };
      }
    }
    return out;
  }

  function replyPromptbookFileRequest(e) {
    const msg = e.data;
    if (!msg || typeof msg !== 'object' || !e.source?.postMessage) return;
    if (msg.type === 'sc-promptbook-list-files') {
      e.source.postMessage({
        type: 'sc-promptbook-files-list',
        requestId: msg.requestId,
        files: listInMemorySkillFiles(msg.excludePaths || []),
      }, '*');
      return;
    }
    if (msg.type === 'sc-promptbook-read-files') {
      readInMemorySkillFileTexts(msg.paths)
        .then(filesMap => {
          e.source.postMessage({
            type: 'sc-promptbook-files-content',
            requestId: msg.requestId,
            files: filesMap,
          }, '*');
        })
        .catch(err => {
          e.source.postMessage({
            type: 'sc-promptbook-files-content',
            requestId: msg.requestId,
            files: {},
            error: String(err.message || err),
          }, '*');
        });
    }
  }

  function setupPromptbookFileBridge() {
    if (window.__scPromptbookFileBridge) return;
    window.__scPromptbookFileBridge = true;
    window.addEventListener('message', e => {
      const t = e.data?.type;
      if (t === 'sc-promptbook-list-files' || t === 'sc-promptbook-read-files') {
        replyPromptbookFileRequest(e);
      }
    });
  }

  setupPromptbookFileBridge();

  function parseNodeData(raw) {
    if (!raw) return emptyNodeData();
    try {
      const data = JSON.parse(String(raw));
      if (!data || typeof data !== 'object') return emptyNodeData();
      if (data.version === 2) {
        return {
          version: 2,
          systemPrompt: String(data.systemPrompt || ''),
          variables: data.variables && typeof data.variables === 'object' && !Array.isArray(data.variables)
            ? data.variables : {},
          messages: Array.isArray(data.messages) ? data.messages : [],
          mdOutput: String(data.mdOutput || ''),
          contextFiles: Array.isArray(data.contextFiles) ? data.contextFiles.filter(p => typeof p === 'string') : [],
        };
      }
      if (Array.isArray(data.promptbooks) && data.promptbooks.length) {
        const pb = data.promptbooks.find(p => p.id === data.activePbId) || data.promptbooks[0];
        const chat = data.chatByPb?.[pb.id] || [];
        return {
          version: 2,
          systemPrompt: String(pb.content || ''),
          variables: pb.variables || {},
          messages: chat.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || ''),
            ts: m.ts || Date.now(),
          })),
          mdOutput: String(data.mdOutput || ''),
        };
      }
    } catch { /* */ }
    return emptyNodeData();
  }

  function serializeNodeData(data) {
    return JSON.stringify({
      version: 2,
      systemPrompt: data.systemPrompt || '',
      variables: data.variables || {},
      messages: data.messages || [],
      mdOutput: data.mdOutput || '',
      contextFiles: Array.isArray(data.contextFiles) ? data.contextFiles : [],
    }, null, 2);
  }

  async function readNodeData(node) {
    if (node._pbData) return node._pbData;
    if (node.file && files[node.file]) {
      node._pbData = parseNodeData(await readTextFile(node.file));
      return node._pbData;
    }
    node._pbData = emptyNodeData();
    return node._pbData;
  }

  async function persistNodeData(node, data, title, rerender = true) {
    node._pbData = data;
    if (title != null) node.title = title;
    const dir = nodeDefaults().fileDir || 'promptbook';
    if (!node.file) {
      node.file = `${dir}/${node.id}.json`;
      node._ownFile = true;
    }
    files[node.file] = new TextEncoder().encode(serializeNodeData(data));
    if (node._el) {
      const htitle = node._el.querySelector('.node-handle-title');
      if (htitle) htitle.textContent = node.title || '';
      if (rerender) {
        const body = node._el.querySelector('.node-body');
        if (body) await renderContent(node, body);
      }
    }
    markDirty();
  }

  function buildUrl(mode) {
    const qs = new URLSearchParams({
      embed: '1',
      mode,
      theme: currentTheme(),
      _: String(Date.now()),
    });
    return `${assetUrl(editorUrl())}?${qs.toString()}`;
  }

  function postToIframe(iframe, msg) {
    iframe?.contentWindow?.postMessage(msg, '*');
  }

  function cleanupIframe(nodeId) {
    const fn = iframeCleanups.get(nodeId);
    if (fn) {
      fn();
      iframeCleanups.delete(nodeId);
    }
  }

  function wireChatIframe(node, iframe) {
    cleanupIframe(node.id);
    let delivered = false;

    async function deliverInit() {
      if (delivered || !iframe.contentWindow) return;
      const data = await readNodeData(node);
      const selected = node._el?.classList.contains('selected');
      postToIframe(iframe, {
        type: 'sc-promptbook-init',
        data,
        title: node.title || '',
        theme: currentTheme(),
        chatEnabled: !!selected,
        llmProxyUrl: assetUrl('api/llm-proxy.php'),
        excludeFile: node.file || '',
        skillMdFiles: listInMemorySkillFiles(node.file ? [node.file] : []),
      });
      delivered = true;
    }

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'sc-promptbook-ready') {
        void deliverInit();
        return;
      }
      if (msg.type === 'sc-promptbook-sync' && msg.data) {
        void persistNodeData(node, msg.data, msg.title ?? node.title, false);
      }
    }

    function onThemeChange(e) {
      postToIframe(iframe, { type: 'sc-promptbook-set-theme', theme: e.detail });
    }

    window.addEventListener('message', onMessage);
    window.addEventListener('sc-theme-change', onThemeChange);
    iframeCleanups.set(node.id, () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('sc-theme-change', onThemeChange);
    });
  }

  function setChatActive(node, active) {
    const iframe = node._el?.querySelector('.promptbook-embed-frame');
    if (iframe?.contentWindow) {
      postToIframe(iframe, { type: 'sc-promptbook-set-active', chatEnabled: !!active });
    }
  }

  function refreshAllChatActive() {
    nodes.filter(n => n.type === TYPE).forEach(n => {
      setChatActive(n, n._el?.classList.contains('selected'));
    });
  }

  function closeEditor() {
    if (editorCleanup) {
      editorCleanup();
      editorCleanup = null;
    }
    const overlay = document.getElementById('pb-editor-overlay');
    const iframe = document.getElementById('pb-editor-frame');
    overlay?.classList.remove('open');
    overlay?.setAttribute('aria-hidden', 'true');
    if (iframe) iframe.src = 'about:blank';
    editingNodeId = null;
  }

  function openEditor(node) {
    const overlay = document.getElementById('pb-editor-overlay');
    const iframe = document.getElementById('pb-editor-frame');
    if (!overlay || !iframe) {
      showToast('PromptBook-editorn kunde inte öppnas', 4000);
      return;
    }

    if (editorCleanup) {
      editorCleanup();
      editorCleanup = null;
    }
    editingNodeId = node.id;
    selectNode(node.id);

    let initDelivered = false;
    const url = buildUrl('editor');

    async function deliverInit() {
      if (initDelivered || !iframe.contentWindow || editingNodeId !== node.id) return;
      const data = await readNodeData(node);
      iframe.contentWindow.postMessage({
        type: 'sc-promptbook-init',
        data,
        title: node.title || '',
        theme: currentTheme(),
        chatEnabled: true,
        llmProxyUrl: assetUrl('api/llm-proxy.php'),
        excludeFile: node.file || '',
        skillMdFiles: listInMemorySkillFiles(node.file ? [node.file] : []),
      }, '*');
      initDelivered = true;
    }

    function onMessage(e) {
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'sc-promptbook-ready') {
        if (e.source !== iframe.contentWindow) return;
        void deliverInit();
        return;
      }
      if (e.source !== iframe.contentWindow) return;

      if (msg.type === 'sc-promptbook-save') {
        const n = nodes.find(x => x.id === editingNodeId);
        if (!n || !msg.data) {
          closeEditor();
          return;
        }
        persistNodeData(n, msg.data, msg.title ?? n.title)
          .then(() => {
            showToast(cfg().saveToast || 'PromptBook sparat');
            setTimeout(closeEditor, 80);
          })
          .catch(err => {
            console.error(err);
            showToast('Sparning misslyckades', 4000);
          });
        return;
      }
      if (msg.type === 'sc-promptbook-cancel') closeEditor();
    }

    function onIframeLoad() {
      if (!iframe.src || iframe.src === 'about:blank') return;
      setTimeout(() => { void deliverInit(); }, 80);
    }

    function onThemeChange(e) {
      postToIframe(iframe, { type: 'sc-promptbook-set-theme', theme: e.detail });
    }

    window.addEventListener('message', onMessage);
    iframe.addEventListener('load', onIframeLoad);
    window.addEventListener('sc-theme-change', onThemeChange);
    editorCleanup = () => {
      window.removeEventListener('message', onMessage);
      iframe.removeEventListener('load', onIframeLoad);
      window.removeEventListener('sc-theme-change', onThemeChange);
    };

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    iframe.src = 'about:blank';
    iframe.src = url;
  }

  function createNodeFile(id, data) {
    const path = `${nodeDefaults().fileDir || 'promptbook'}/${id}.json`;
    files[path] = new TextEncoder().encode(serializeNodeData(data || emptyNodeData()));
    return path;
  }

  async function renderContent(node, body) {
    cleanupIframe(node.id);
    const height = node.height || nodeDefaults().height || 360;
    body.innerHTML = '';
    body.style.padding = '0';
    body.style.height = `${height}px`;
    body.style.overflow = 'hidden';

    const wrap = document.createElement('div');
    wrap.className = 'promptbook-embed-wrap';

    const iframe = document.createElement('iframe');
    iframe.className = 'promptbook-embed-frame';
    iframe.src = buildUrl('chat');
    iframe.setAttribute('width', '100%');
    iframe.style.height = `${height}px`;
    iframe.loading = 'lazy';
    iframe.setAttribute('frameborder', '0');
    iframe.title = node.title || 'PromptBook';
    wrap.appendChild(iframe);
    body.appendChild(wrap);

    wireChatIframe(node, iframe);
  }

  async function openAdd() {
    const pos = centerPos();
    await Modal.openFromType(TYPE, 'add', {}, async () => {
      const fields = Modal.readFields({
        title: 'pb-node-title',
        width: 'pb-node-width',
        height: 'pb-node-height',
      });
      const defaults = nodeDefaults();
      const id = genId();
      const data = emptyNodeData();
      const node = {
        id,
        type: TYPE,
        x: pos.x,
        y: pos.y,
        width: parseInt(fields.width, 10) || defaults.width || 420,
        height: parseInt(fields.height, 10) || defaults.height || 360,
        title: fields.title,
        file: createNodeFile(id, data),
        _ownFile: true,
        _pbData: data,
      };
      nodes.push(node);
      await buildNodeEl(node);
      markDirty();
      Modal.close();
      openEditor(node);
    });
  }

  async function openEdit(node) {
    openEditor(node);
  }

  return {
    openAdd,
    openEdit,
    openEditor,
    closeEditor,
    renderContent,
    refreshAllChatActive,
    setChatActive,
  };
})();

ModuleRegistry.register('promptbook', PromptbookModule);
window.addEventListener('sc-add-menu-select', e => {
  if (e.detail?.id === 'promptbook') PromptbookModule.openAdd();
});
