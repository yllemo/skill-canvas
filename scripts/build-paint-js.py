#!/usr/bin/env python3
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html = (root / "html" / "paint-skill-editor.html").read_text(encoding="utf-8")
css = re.search(r"<style>(.*?)</style>", html, re.S).group(1)
js = re.search(r"<script>(.*?)</script>", html, re.S).group(1)

# Trim standalone-only blocks
cuts = [
    'document.getElementById("zipIn")',
    "function toggleTheme()",
    'document.addEventListener("DOMContentLoaded"',
    "function buildMd()",
    "async function doZip()",
    "function exportPng()",
]
for cut in cuts:
    idx = js.find(cut)
    if idx > 0:
        js = js[:idx]

js = js.replace("function syncMd() {\n  document.getElementById('mdOut').value = buildMd();\n  updateInfo();\n}", "function syncMd() { updateInfo(); }")
# drop eager fillWhite — PaintEditor.init() runs after DOM
js = js.replace("// Init white background\nfillWhite();\n\n", "")

embed_css = """
/* Embed shell (paint-skill-editor.php) */
html, body.paint-embed { height: 100%; overflow: hidden; display: flex; flex-direction: column; }
#paint-embed-hdr {
  height: 48px; flex-shrink: 0; background: var(--gs-blue); color: #fff;
  display: flex; align-items: center; justify-content: space-between; padding: 0 14px; gap: 12px;
}
#paint-embed-hdr h1 { font-size: 15px; font-weight: 600; }
#paint-hdr-status { font-size: 12px; opacity: .85; flex: 1; text-align: center; }
.paint-hdr-actions { display: flex; gap: 8px; }
.paint-hdr-btn {
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.35); color: #fff;
  border-radius: 4px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit;
}
.paint-hdr-btn:hover { background: rgba(255,255,255,.25); }
.paint-hdr-btn.save { background: #27ae60; border-color: #1e8449; }
.paint-hdr-btn.save:hover { background: #2ecc71; }
.paint-hdr-btn:disabled { opacity: .45; cursor: not-allowed; }
#paint-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
#paint-foot {
  flex-shrink: 0; padding: 6px 14px; font-size: 11px; color: var(--tx2);
  border-top: 1px solid var(--brd); background: var(--bg);
}
"""

(root / "html" / "css").mkdir(exist_ok=True)
(root / "html" / "css" / "paint-editor.css").write_text(css + embed_css, encoding="utf-8")

wrapper = f"""(function (global) {{
  'use strict';
{js}
  async function loadFromDataUrl(url) {{
    if (!url) {{
      fillWhite();
      updateInfo();
      return;
    }}
    const img = new Image();
    await new Promise((res, rej) => {{
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    }});
    const max = 2048;
    let w = img.naturalWidth || 1024;
    let h = img.naturalHeight || 640;
    if (w > max || h > max) {{
      const s = Math.min(max / w, max / h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }}
    canvas.width = w;
    canvas.height = h;
    fillWhite();
    ctx.drawImage(img, 0, 0, w, h);
    undoStack = [];
    redoStack = [];
    updateUndoButtons();
    updateInfo();
  }}

  global.PaintEditor = {{
    init(opts) {{
      global.PAINT_EMBED = !!(opts && opts.embed);
      fillWhite();
      syncMd();
      updateInfo();
    }},
    getPngDataUrl,
    loadFromDataUrl,
    applyTheme(theme) {{
      global.document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    }},
    setStatus(text) {{
      const el = global.document.getElementById('paint-hdr-status');
      if (el) el.textContent = text;
      const foot = global.document.getElementById('paint-foot');
      if (foot) foot.textContent = text;
    }},
  }};
  global.setTool = setTool;
  global.toggleFilled = toggleFilled;
  global.updateSizePreview = updateSizePreview;
  global.updateOpacityLabel = updateOpacityLabel;
  global.openColorPicker = openColorPicker;
  global.pickCustomColor = pickCustomColor;
  global.showSizeDialog = showSizeDialog;
  global.hideSizeDialog = hideSizeDialog;
  global.applySize = applySize;
  global.clearCanvas = clearCanvas;
  global.undo = undo;
  global.redo = redo;
  global.commitText = commitText;
}})(typeof window !== 'undefined' ? window : globalThis);
"""

(root / "html" / "js").mkdir(exist_ok=True)
(root / "html" / "js" / "paint-editor.js").write_text(wrapper, encoding="utf-8")
print("built paint-editor.js", len(wrapper))
