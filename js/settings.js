// ════════════════════════════════════════════════════════════
//  APP SETTINGS — localStorage, canvas-bakgrund, utbyggbart
// ════════════════════════════════════════════════════════════
const SCSettings = (() => {
  const cfg = () => window.SC_SETTINGS || { defaults: {}, storageKey: 'sc-settings' };
  const storageKey = () => cfg().storageKey || 'sc-settings';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function themeColor(key) {
    const theme = currentTheme();
    const colors = cfg().themeColors?.[theme] || cfg().themeColors?.light || {};
    if (key === 'canvasBgColor') return colors.canvasBg || '#E8EEF4';
    if (key === 'canvasGridColor') return colors.grid || 'rgba(0,119,188,0.08)';
    return '';
  }

  function cssRootColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function effectiveColor(key, stored) {
    if (stored) return stored;
    if (key === 'canvasBgColor') return cssRootColor('--canvas-bg') || themeColor(key);
    if (key === 'canvasGridColor') return cssRootColor('--grid') || themeColor(key);
    return '';
  }

  function loadRaw() {
    try {
      const raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function getAll() {
    return { ...(cfg().defaults || {}), ...loadRaw() };
  }

  function get(key) {
    return getAll()[key];
  }

  function save(next) {
    localStorage.setItem(storageKey(), JSON.stringify(next));
  }

  function set(key, value) {
    const stored = loadRaw();
    if (value === '' || value == null) {
      delete stored[key];
    } else {
      stored[key] = value;
    }
    save(stored);
    apply(getAll());
    window.dispatchEvent(new CustomEvent('sc-settings-change', { detail: getAll() }));
  }

  function syncColorUi(settings) {
    ['canvasBgColor', 'canvasGridColor'].forEach(key => {
      const input = document.querySelector(`input[data-setting-key="${key}"][data-setting-type="color"]`);
      const display = document.querySelector(`[data-setting-display="${key}"]`);
      const reset = document.querySelector(`[data-setting-reset="${key}"]`);
      const custom = Boolean(settings[key]);
      const shown = custom ? settings[key] : themeColor(key);

      if (input instanceof HTMLInputElement) {
        input.value = hexFromCssColor(shown);
      }
      if (display) {
        display.textContent = custom ? settings[key].toUpperCase() : 'Temastandard';
      }
      if (reset instanceof HTMLButtonElement) {
        reset.hidden = !custom;
      }
    });

    const bgMode = settings.canvasBackground || cfg().defaults?.canvasBackground || 'dots';
    document.querySelectorAll('[data-when-background]').forEach(el => {
      const modes = (el.getAttribute('data-when-background') || '').split(',').map(s => s.trim());
      el.classList.toggle('settings-field-hidden', modes.length > 0 && !modes.includes(bgMode));
    });
  }

  function hexFromCssColor(color) {
    const c = (color || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toUpperCase();
    const m = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) {
      const r = Number(m[1]).toString(16).padStart(2, '0');
      const g = Number(m[2]).toString(16).padStart(2, '0');
      const b = Number(m[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }
    return '#888888';
  }

  function applyCanvasColors(cw, settings) {
    const bg = effectiveColor('canvasBgColor', settings.canvasBgColor || '');
    const grid = effectiveColor('canvasGridColor', settings.canvasGridColor || '');

    if (settings.canvasBgColor) {
      cw.style.setProperty('--canvas-bg', settings.canvasBgColor);
    } else {
      cw.style.removeProperty('--canvas-bg');
    }

    if (settings.canvasGridColor) {
      cw.style.setProperty('--grid', settings.canvasGridColor);
    } else {
      cw.style.removeProperty('--grid');
    }

    const panel = document.getElementById('settings-panel');
    if (panel) {
      panel.style.setProperty('--canvas-bg', bg);
      panel.style.setProperty('--grid', grid);
    }
  }

  function apply(settings) {
    const cw = document.getElementById('cw');
    if (!cw) return;

    const bg = settings.canvasBackground || cfg().defaults?.canvasBackground || 'dots';
    cw.dataset.canvasBg = bg;
    applyCanvasColors(cw, settings);
    syncColorUi(settings);

    document.querySelectorAll('[data-setting-key]').forEach(input => {
      if (!(input instanceof HTMLInputElement)) return;
      const k = input.dataset.settingKey;
      if (!k || input.type !== 'radio') return;
      input.checked = String(settings[k]) === input.value;
    });
  }

  function wirePanel() {
    const wrap = document.getElementById('settings-wrap');
    const btn = document.getElementById('btn-settings');
    const panel = document.getElementById('settings-panel');
    if (!wrap || !btn || !panel) return;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      wrap.classList.toggle('open');
      document.getElementById('open-wrap')?.classList.remove('open');
      document.getElementById('export-wrap')?.classList.remove('open');
    });

    panel.addEventListener('change', e => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement)) return;
      const key = input.dataset.settingKey;
      if (!key) return;
      set(key, input.value);
    });

    panel.addEventListener('input', e => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.dataset.settingType !== 'color') return;
      const key = input.dataset.settingKey;
      if (!key) return;
      set(key, input.value.toUpperCase());
    });

    panel.addEventListener('click', e => {
      const btnReset = e.target.closest('[data-setting-reset]');
      if (!btnReset) return;
      const key = btnReset.getAttribute('data-setting-reset');
      if (key) set(key, '');
    });
  }

  function init() {
    apply(getAll());
    wirePanel();
    window.addEventListener('sc-theme-change', () => apply(getAll()));
  }

  return { get, getAll, set, apply, init };
})();

window.SCSettings = SCSettings;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SCSettings.init());
} else {
  SCSettings.init();
}
