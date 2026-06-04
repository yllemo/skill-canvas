// ════════════════════════════════════════════════════════════
//  DOCX import popup — delas av markdown-modal och fullskärm
// ════════════════════════════════════════════════════════════
const DocxImport = (() => {
  let overlay = null;
  let iframe = null;
  let cleanup = null;
  let onComplete = null;

  function base64ToUint8(base64) {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return arr;
  }

  function applyImagesToMarkdown(markdown, images) {
    let md = markdown;
    for (const img of images) {
      const path = typeof uniqueFilePath === 'function'
        ? uniqueFilePath(img.path || `images/${img.name}`)
        : (img.path || `images/${img.name}`);
      files[path] = base64ToUint8(img.base64);
      const name = img.name || path.split('/').pop();
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      md = md.replace(new RegExp(`!\\[([^\\]]*)\\]\\(${esc}\\)`, 'g'), `![$1](${path})`);
      md = md.replace(new RegExp(`\\]\\(${esc}\\)`, 'g'), `](${path})`);
    }
    return md;
  }

  function mergeMarkdown(existing, incoming, mode) {
    const ex = (existing || '').trim();
    const inc = (incoming || '').trim();
    if (!inc) return ex;
    if (!ex || mode === 'replace') return inc;
    return ex + '\n\n---\n\n' + inc;
  }

  function mergeWithConfirm(existing, incoming, mergeMode) {
    const ex = (existing || '').trim();
    if (!ex) return incoming;
    if (mergeMode === 'append') return mergeMarkdown(ex, incoming, 'append');
    const replace = confirm(
      'Editorn har redan innehåll.\n\nOK = Ersätt allt\nAvbryt = Lägg till i slutet'
    );
    return mergeMarkdown(ex, incoming, replace ? 'replace' : 'append');
  }

  function close() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (iframe) iframe.src = 'about:blank';
    onComplete = null;
  }

  /**
   * @param {{ getContent: () => string, apply: (md: string) => void, hasContent?: boolean }} handlers
   */
  function open(handlers) {
    overlay = document.getElementById('docx-import-overlay');
    iframe = document.getElementById('docx-import-frame');
    if (!overlay || !iframe) {
      showToast('DOCX-import kunde inte öppnas', 4000);
      return;
    }

    close();

    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const url = `html/docx-to-skill.php?embed=1&theme=${encodeURIComponent(theme)}`;
    onComplete = handlers;

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== 'object') return;

      if (d.type === 'sc-docx-ready') {
        iframe.contentWindow.postMessage({
          type: 'sc-docx-init',
          hasContent: !!(handlers.getContent && handlers.getContent().trim()),
        }, '*');
      }

      if (d.type === 'sc-docx-import') {
        const md = applyImagesToMarkdown(d.markdown || '', d.images || []);
        const existing = handlers.getContent ? handlers.getContent() : '';
        const final = mergeWithConfirm(existing, md, d.merge);
        handlers.apply(final);
        markDirty();
        close();
        showToast('DOCX importerad');
      }

      if (d.type === 'sc-docx-cancel') {
        close();
      }
    }

    window.addEventListener('message', onMessage);
    cleanup = () => window.removeEventListener('message', onMessage);

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    iframe.src = url;
  }

  return { open, close, applyImagesToMarkdown };
})();
