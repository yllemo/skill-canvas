// ════════════════════════════════════════════════════════════
//  GIT REMOTE — GitHub / GitLab Contents API (client-side)
//  Flera anslutningar sparas i localStorage (sc-git), aldrig på servern.
// ════════════════════════════════════════════════════════════
const GitRemote = (() => {
  const ARCHIVE_RE = /\.(zip|skill)$/i;
  const STORAGE_KEY = 'sc-git';
  const KEYS = ['gitProvider', 'gitHost', 'gitOwner', 'gitRepo', 'gitBranch', 'gitPath', 'gitToken'];

  const DEFAULTS = {
    gitProvider: 'github',
    gitHost: '',
    gitOwner: '',
    gitRepo: '',
    gitBranch: 'main',
    gitPath: '',
    gitToken: '',
  };

  function genId() {
    return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function emptyStore() {
    return { version: 2, activeId: null, profiles: [] };
  }

  function profileFields(raw = {}) {
    const out = { ...DEFAULTS };
    KEYS.forEach(k => {
      if (raw[k] != null) out[k] = raw[k];
    });
    return out;
  }

  function defaultProfileName(fields) {
    const f = profileFields(fields);
    const owner = String(f.gitOwner || '').trim();
    const repo = String(f.gitRepo || '').trim();
    if (repo.includes('/')) return repo;
    if (owner && repo) return `${owner}/${repo}`;
    return owner || repo || 'Git-anslutning';
  }

  function normalizeStore(parsed) {
    if (!parsed || typeof parsed !== 'object') return emptyStore();

    // Legacy flat config (v1)
    if (!Array.isArray(parsed.profiles) && (parsed.gitToken || parsed.gitOwner || parsed.gitRepo)) {
      const fields = profileFields(parsed);
      if (fields.gitToken || fields.gitOwner || fields.gitRepo) {
        const id = genId();
        return {
          version: 2,
          activeId: id,
          profiles: [{
            id,
            name: defaultProfileName(fields),
            ...fields,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }],
        };
      }
      return emptyStore();
    }

    const profiles = Array.isArray(parsed.profiles)
      ? parsed.profiles
        .filter(p => p && typeof p === 'object')
        .map(p => ({
          id: p.id || genId(),
          name: p.name || defaultProfileName(p),
          ...profileFields(p),
          createdAt: p.createdAt || Date.now(),
          updatedAt: p.updatedAt || Date.now(),
        }))
      : [];

    let activeId = parsed.activeId || null;
    if (activeId && !profiles.some(p => p.id === activeId)) activeId = profiles[0]?.id || null;
    if (!activeId && profiles.length) activeId = profiles[0].id;

    return { version: 2, activeId, profiles };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyStore();
      return normalizeStore(JSON.parse(raw));
    } catch {
      return emptyStore();
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent('sc-git-change', { detail: { store, active: getAll() } }));
  }

  function migrateFromScSettings() {
    try {
      const raw = localStorage.getItem('sc-settings');
      if (!raw) return;
      const all = JSON.parse(raw);
      if (!all || typeof all !== 'object') return;
      const migrated = {};
      let found = false;
      KEYS.forEach(k => {
        if (all[k] != null && String(all[k]).trim() !== '') {
          migrated[k] = all[k];
          found = true;
        }
        delete all[k];
      });
      if (found) {
        const store = loadStore();
        if (!store.profiles.length) {
          const id = genId();
          const fields = profileFields(migrated);
          store.profiles.push({
            id,
            name: defaultProfileName(fields),
            ...fields,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          store.activeId = id;
          saveStore(store);
        }
        localStorage.setItem('sc-settings', JSON.stringify(all));
      }
    } catch { /* ignore */ }
  }

  function listProfiles() {
    return loadStore().profiles.slice().sort((a, b) => {
      const pa = String(a.gitProvider || '');
      const pb = String(b.gitProvider || '');
      if (pa !== pb) return pa.localeCompare(pb);
      return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
    });
  }

  function getProfile(id) {
    return loadStore().profiles.find(p => p.id === id) || null;
  }

  function getActiveProfile() {
    const store = loadStore();
    if (!store.activeId) return null;
    return store.profiles.find(p => p.id === store.activeId) || store.profiles[0] || null;
  }

  function setActiveProfile(id) {
    const store = loadStore();
    if (!store.profiles.some(p => p.id === id)) return false;
    store.activeId = id;
    saveStore(store);
    syncSettingsUi();
    return true;
  }

  function upsertProfile(partial, id = null) {
    const store = loadStore();
    const fields = profileFields(partial);
    // Self-heal felaktig provider (GitLab-host/token sparad som github ⇒ /api/v3)
    fields.gitProvider = resolveProvider(fields.gitProvider, fields.gitHost, fields.gitToken);
    const name = String(partial.name || '').trim() || defaultProfileName(fields);
    const now = Date.now();

    if (id) {
      const idx = store.profiles.findIndex(p => p.id === id);
      if (idx >= 0) {
        store.profiles[idx] = {
          ...store.profiles[idx],
          ...fields,
          id,
          name,
          updatedAt: now,
        };
        store.activeId = id;
        saveStore(store);
        syncSettingsUi();
        return store.profiles[idx];
      }
    }

    const newId = genId();
    const profile = {
      id: newId,
      name,
      ...fields,
      createdAt: now,
      updatedAt: now,
    };
    store.profiles.push(profile);
    store.activeId = newId;
    saveStore(store);
    syncSettingsUi();
    return profile;
  }

  function removeProfile(id) {
    const store = loadStore();
    store.profiles = store.profiles.filter(p => p.id !== id);
    if (store.activeId === id) store.activeId = store.profiles[0]?.id || null;
    saveStore(store);
    syncSettingsUi();
  }

  function clearAllProfiles() {
    saveStore(emptyStore());
    syncSettingsUi();
  }

  function hasProfiles() {
    return listProfiles().length > 0;
  }

  function getAll() {
    const active = getActiveProfile();
    return active ? profileFields(active) : { ...DEFAULTS };
  }

  function set(key, value) {
    if (!KEYS.includes(key)) return;
    const store = loadStore();
    let active = store.profiles.find(p => p.id === store.activeId);
    if (!active) {
      const id = genId();
      active = { id, name: 'Git-anslutning', ...DEFAULTS, createdAt: Date.now(), updatedAt: Date.now() };
      store.profiles.push(active);
      store.activeId = id;
    }
    if (value === '' || value == null) {
      if (key === 'gitBranch') active[key] = 'main';
      else if (key === 'gitProvider') active[key] = 'github';
      else active[key] = '';
    } else {
      active[key] = value;
    }
    active.name = defaultProfileName(active);
    active.updatedAt = Date.now();
    saveStore(store);
    syncSettingsUi();
  }

  function setMany(partial) {
    const active = getActiveProfile();
    upsertProfile({ ...(active || {}), ...partial }, active?.id || null);
  }

  function isGitSettingKey(key) {
    return KEYS.includes(key);
  }

  function syncSettingsUi() {
    const settings = getAll();
    KEYS.forEach(key => {
      const val = settings[key] == null ? '' : String(settings[key]);
      document.querySelectorAll(`[data-setting-key="${key}"]`).forEach(input => {
        if (!(input instanceof HTMLInputElement)) return;
        if (input.type === 'radio') {
          input.checked = input.value === val;
        } else if (input.value !== val) {
          input.value = val;
        }
      });
    });
  }

  function looksLikeGitlabHost(host) {
    const h = String(host || '').trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (!h) return false;
    if (h === 'gitlab.com' || h === 'www.gitlab.com') return true;
    return h.includes('gitlab');
  }

  function looksLikeGitlabToken(token) {
    return /^glpat-/i.test(String(token || '').trim());
  }

  function resolveProvider(rawProvider, host, token) {
    const p = String(rawProvider || '').toLowerCase();
    if (p === 'gitlab' || looksLikeGitlabHost(host) || looksLikeGitlabToken(token)) {
      return 'gitlab';
    }
    return 'github';
  }

  function config() {
    const s = getAll();
    const host = String(s.gitHost || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    const owner = String(s.gitOwner || '').trim().replace(/^\/+|\/+$/g, '');
    const repo = String(s.gitRepo || '').trim().replace(/^\/+|\/+$/g, '');
    const branch = String(s.gitBranch || 'main').trim() || 'main';
    const path = normalizePath(String(s.gitPath || '').trim());
    const token = String(s.gitToken || '').trim();
    const provider = resolveProvider(s.gitProvider, host, token);
    return { provider, host, owner, repo, branch, path, token };
  }

  function normalizePath(p) {
    return String(p || '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
  }

  function projectPath(cfg) {
    if (!cfg.owner && !cfg.repo) return '';
    if (!cfg.owner) return cfg.repo;
    if (!cfg.repo) return cfg.owner;
    if (cfg.repo.includes('/')) return cfg.repo;
    return `${cfg.owner}/${cfg.repo}`;
  }

  function isConfigured() {
    const c = config();
    return Boolean(c.token && projectPath(c));
  }

  function missingConfigMessage() {
    return 'Ingen Git-anslutning sparad. Starta guiden för att lägga till GitHub eller GitLab.';
  }

  function profileSummary(profile) {
    const fields = profileFields(profile);
    const provider = resolveProvider(fields.gitProvider, fields.gitHost, fields.gitToken);
    const host = String(fields.gitHost || '').trim() || (provider === 'gitlab' ? 'gitlab.com' : 'github.com');
    const project = projectPath({
      owner: fields.gitOwner,
      repo: fields.gitRepo,
    });
    return {
      id: profile.id,
      name: profile.name || defaultProfileName(fields),
      provider,
      host,
      project,
      branch: fields.gitBranch || 'main',
      path: fields.gitPath || '',
      label: project ? `${provider}:${host}/${project}` : `${provider}:${host}`,
    };
  }

  /**
   * Tolka GitHub/GitLab-URL eller SSH till fält för wizarden.
   * Ex: https://github.com/yllemo/skills
   *     https://gitlab.com/group/sub/project/-/tree/main/skills
   *     git@github.com:yllemo/skills.git
   */
  function parseRepoUrl(raw) {
    const input = String(raw || '').trim();
    if (!input) return { ok: false, error: 'Tom URL' };

    let urlStr = input;
    // SSH: git@host:owner/repo.git
    const ssh = input.match(/^git@([^:]+):(.+)$/i);
    if (ssh) {
      urlStr = `https://${ssh[1]}/${ssh[2]}`;
    }
    if (!/^https?:\/\//i.test(urlStr)) {
      urlStr = 'https://' + urlStr.replace(/^\/+/, '');
    }

    let u;
    try {
      u = new URL(urlStr);
    } catch {
      return { ok: false, error: 'Ogiltig URL' };
    }

    const host = u.hostname.replace(/^www\./i, '');
    const isGithub = host === 'github.com' || host === 'api.github.com' || host.includes('github');
    const isGitlab = host === 'gitlab.com' || host.includes('gitlab');
    const provider = isGitlab && !isGithub ? 'gitlab'
      : isGithub ? 'github'
      : (host.includes('gitlab') ? 'gitlab' : 'github');

    let parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    // strip .git from last segment
    if (parts.length) {
      parts[parts.length - 1] = parts[parts.length - 1].replace(/\.git$/i, '');
    }

    let branch = '';
    let path = '';
    let owner = '';
    let repo = '';

    if (provider === 'github') {
      // owner/repo[/tree|blob|raw|commit/... ]
      owner = parts[0] || '';
      repo = parts[1] || '';
      const kind = (parts[2] || '').toLowerCase();
      if (kind === 'tree' || kind === 'blob' || kind === 'raw') {
        branch = parts[3] || '';
        path = parts.slice(4).join('/');
        if (kind === 'blob' || kind === 'raw') {
          // file path — keep folder portion only
          const segs = path.split('/').filter(Boolean);
          if (segs.length > 1) path = segs.slice(0, -1).join('/');
          else path = '';
        }
      }
    } else {
      // GitLab: group[/sub]/project[/-/tree|blob/branch/path]
      const dash = parts.indexOf('-');
      if (dash >= 0) {
        const projectParts = parts.slice(0, dash);
        const rest = parts.slice(dash + 1); // tree|blob, branch, ...
        if (projectParts.length >= 2) {
          owner = projectParts[0];
          repo = projectParts.slice(1).join('/');
        } else if (projectParts.length === 1) {
          repo = projectParts[0];
        }
        const kind = (rest[0] || '').toLowerCase();
        if (kind === 'tree' || kind === 'blob') {
          branch = rest[1] || '';
          path = rest.slice(2).join('/');
          if (kind === 'blob') {
            const segs = path.split('/').filter(Boolean);
            if (segs.length > 1) path = segs.slice(0, -1).join('/');
            else path = '';
          }
        }
      } else {
        if (parts.length >= 2) {
          owner = parts[0];
          repo = parts.slice(1).join('/');
        } else if (parts.length === 1) {
          repo = parts[0];
        }
      }
    }

    if (!owner && !repo) {
      return { ok: false, error: 'Kunde inte läsa ägare/repo från URL' };
    }

    const standardHost = provider === 'github' ? 'github.com' : 'gitlab.com';
    const customHost = host === standardHost || host === 'api.github.com' ? '' : host;

    return {
      ok: true,
      gitProvider: provider,
      gitHost: customHost,
      gitOwner: owner,
      gitRepo: repo,
      gitBranch: branch || 'main',
      gitPath: path.replace(/^\/+|\/+$/g, ''),
      name: defaultProfileName({ gitOwner: owner, gitRepo: repo }),
    };
  }

  function apiBase(cfg) {
    const host = String(cfg.host || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    // GitLab (cloud eller self-hosted) — alltid API v4. Aldrig /api/v3
    // (v3 ger: "API V3 is no longer supported. Use API V4 instead.")
    if (cfg.provider === 'gitlab' || looksLikeGitlabHost(host)) {
      const h = host || 'gitlab.com';
      return `https://${h}/api/v4`;
    }
    // github.com public API is https://api.github.com (NOT …/api/v3)
    if (!host || host === 'github.com' || host === 'www.github.com' || host === 'api.github.com') {
      return 'https://api.github.com';
    }
    // GitHub Enterprise Server
    return `https://${host}/api/v3`;
  }

  function authHeaders(cfg) {
    const h = {
      Accept: cfg.provider === 'gitlab' ? 'application/json' : 'application/vnd.github+json',
    };
    if (cfg.token) {
      // Fine-grained + classic PAT: Bearer fungerar för båda
      h.Authorization = `Bearer ${cfg.token}`;
    }
    if (cfg.provider === 'github') {
      h['X-GitHub-Api-Version'] = '2022-11-28';
    }
    return h;
  }

  function friendlyHttpError(status, detail, cfg) {
    const d = String(detail || '').trim();
    const project = cfg ? projectPath(cfg) : '';
    const inaccessible = /resource not accessible by personal access token/i.test(d);

    if (/API V3 is no longer supported|Use API V4/i.test(d)) {
      return (
        'GitLab kräver API v4. Kontrollera att leverantören är GitLab (inte GitHub) ' +
        'och att host är din GitLab-server — anrop ska gå till /api/v4.'
      );
    }

    if (status === 401) {
      if (cfg?.provider === 'gitlab') {
        return 'Ogiltig eller utgången GitLab-token. Skapa en ny med scope api (eller read_repository + write_repository).';
      }
      return 'Ogiltig eller utgången token. Skapa en ny fine-grained PAT med Contents: Read and write och tillgång till repot.';
    }
    if (status === 403 || inaccessible) {
      if (inaccessible || /permission|access|forbidden/i.test(d)) {
        return (
          `Token saknar skrivbehörighet till ${project || 'repot'}. ` +
          'På GitHub: Settings → Developer settings → Fine-grained tokens → redigera token → ' +
          'Repository access: välj just detta repo → Permissions → Repository permissions → ' +
          'Contents: Read and write (inte bara Read). Spara, uppdatera token i guiden och försök igen. ' +
          'Alternativ: klassisk PAT med scope «repo».'
        );
      }
      return d || 'Åtkomst nekad (403). Ge token Contents: Read and write för just detta repository.';
    }
    if (status === 404) {
      return d.includes('No commit') || d.includes('Not Found')
        ? (d || 'Repo/branch hittades inte. Tomt repo saknar commits — pusha en fil först, eller kontrollera branch-namn.')
        : `Hittades inte (404). Kontrollera ägare/repo/branch och att token har tillgång till ${project || 'repot'}.`;
    }
    return d || `HTTP ${status}`;
  }

  async function apiFetch(url, opts = {}) {
    const cfg = config();
    let res;
    try {
      res = await fetch(url, {
        ...opts,
        headers: {
          ...authHeaders(cfg),
          ...(opts.headers || {}),
        },
      });
    } catch (e) {
      const msg = e?.message || String(e);
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        throw new Error(
          'Nätverksfel mot Git-API (Failed to fetch). Kontrollera internet, API-URL (GitHub: api.github.com, GitLab: …/api/v4), och att ingen tillägg blockerar anropet.'
        );
      }
      throw e;
    }
    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.json();
        detail = data.message || data.error || data.error_description || '';
      } catch { /* ignore */ }
      const err = new Error(friendlyHttpError(res.status, detail, cfg));
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.arrayBuffer();
  }

  function bytesToBase64(bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      binary += String.fromCharCode(...u8.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function base64ToBytes(b64) {
    const clean = String(b64 || '').replace(/\s/g, '');
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function listGithub(cfg) {
    const project = projectPath(cfg);
    // Tomt repo (inga commits) → ingen branch-ref ännu
    let refRes;
    try {
      refRes = await apiFetch(`${apiBase(cfg)}/repos/${project}/git/ref/heads/${encodeURIComponent(cfg.branch)}`);
    } catch (e) {
      if (e.status === 404 || e.status === 409) {
        // Försök läsa repo-meta för tydligare fel
        try {
          const repoMeta = await apiFetch(`${apiBase(cfg)}/repos/${project}`);
          if (repoMeta?.size === 0 || repoMeta?.pushed_at == null) {
            return []; // tomt repo — OK, inga .skill-filer ännu
          }
        } catch { /* ignore */ }
        return [];
      }
      throw e;
    }
    const commitSha = refRes?.object?.sha;
    if (!commitSha) return [];

    const commit = await apiFetch(`${apiBase(cfg)}/repos/${project}/git/commits/${commitSha}`);
    const treeSha = commit?.tree?.sha;
    if (!treeSha) return [];

    const tree = await apiFetch(`${apiBase(cfg)}/repos/${project}/git/trees/${treeSha}?recursive=1`);
    const prefix = cfg.path ? cfg.path + '/' : '';
    const files = (tree?.tree || [])
      .filter(n => n.type === 'blob' && ARCHIVE_RE.test(n.path || ''))
      .filter(n => !prefix || n.path === cfg.path || n.path.startsWith(prefix))
      .map(n => ({
        path: n.path,
        size: n.size || 0,
        sha: n.sha,
      }))
      .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }));
    return files;
  }

  async function listGitlab(cfg) {
    const project = encodeURIComponent(projectPath(cfg));
    const base = `${apiBase(cfg)}/projects/${project}/repository/tree`;
    const prefix = cfg.path || '';
    const files = [];
    let page = 1;
    for (;;) {
      const qs = new URLSearchParams({
        ref: cfg.branch,
        recursive: 'true',
        per_page: '100',
        page: String(page),
      });
      if (prefix) qs.set('path', prefix);
      const batch = await apiFetch(`${base}?${qs}`);
      if (!Array.isArray(batch) || !batch.length) break;
      for (const n of batch) {
        if (n.type === 'blob' && ARCHIVE_RE.test(n.path || n.name || '')) {
          files.push({
            path: n.path || n.name,
            size: 0,
            sha: n.id || '',
          });
        }
      }
      if (batch.length < 100) break;
      page += 1;
      if (page > 50) break;
    }
    return files.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }));
  }

  async function listArchives() {
    const cfg = config();
    if (!isConfigured()) throw new Error(missingConfigMessage());
    if (cfg.provider === 'gitlab') return listGitlab(cfg);
    return listGithub(cfg);
  }

  async function getFile(path) {
    const cfg = config();
    if (!isConfigured()) throw new Error(missingConfigMessage());
    const filePath = normalizePath(path);
    if (!filePath) throw new Error('Ingen filsökväg angiven');

    if (cfg.provider === 'gitlab') {
      const project = encodeURIComponent(projectPath(cfg));
      const encoded = encodeURIComponent(filePath);
      const data = await apiFetch(
        `${apiBase(cfg)}/projects/${project}/repository/files/${encoded}?ref=${encodeURIComponent(cfg.branch)}`
      );
      const bytes = base64ToBytes(data.content);
      if (!bytes.length) throw new Error('Filen är tom i GitLab');
      return {
        path: filePath,
        sha: data.blob_id || data.commit_id || '',
        content: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        name: filePath.split('/').pop() || filePath,
      };
    }

    return getGithubFile(cfg, filePath);
  }

  /**
   * GitHub Contents (JSON) ger full content bara upp till 1 MB.
   * Större filer: encoding "none" / tom content — måste hämta med Accept: raw (upp till 100 MB).
   * Om vi ändå får base64 som är kortare än `size` är den trunkerad → använd raw.
   */
  async function getGithubFile(cfg, filePath) {
    const project = projectPath(cfg);
    const urlPath = filePath.split('/').map(encodeURIComponent).join('/');
    const contentsUrl =
      `${apiBase(cfg)}/repos/${project}/contents/${urlPath}?ref=${encodeURIComponent(cfg.branch)}`;

    const data = await apiFetch(contentsUrl);
    if (Array.isArray(data)) throw new Error('Sökvägen är en mapp, inte en fil');

    const expectedSize = Number(data.size) || 0;
    const encoding = String(data.encoding || '').toLowerCase();
    const name = data.name || filePath.split('/').pop() || filePath;
    const sha = data.sha || '';

    let bytes = null;
    const canUseInline =
      expectedSize > 0 &&
      expectedSize <= 1024 * 1024 &&
      encoding === 'base64' &&
      data.content;

    if (canUseInline) {
      bytes = base64ToBytes(data.content);
      // Trunkerad/korrupt base64 — lita inte på den
      if (!bytes.length || bytes.length !== expectedSize) bytes = null;
    }

    if (!bytes) {
      bytes = await fetchGithubFileBytes(cfg, {
        contentsUrl,
        downloadUrl: data.download_url || '',
        sha,
        project,
        expectedSize,
      });
    }

    if (!bytes || !bytes.length) {
      throw new Error(
        'Kunde inte läsa filinnehåll från GitHub. ' +
        'Filer över 100 MB stöds inte via API; kontrollera även Contents: Read på token.'
      );
    }

    if (expectedSize > 0 && bytes.length !== expectedSize) {
      throw new Error(
        `Ofullständig nedladdning från GitHub (${bytes.length} av ${expectedSize} byte). ` +
        'Försök igen, eller öppna filen lokalt.'
      );
    }

    // .skill/.zip ska börja med PK (zip local file header)
    if (ARCHIVE_RE.test(filePath) && !(bytes[0] === 0x50 && bytes[1] === 0x4b)) {
      const head = new TextDecoder().decode(bytes.slice(0, 80));
      if (/^version https:\/\/git-lfs\.github\.com\/spec/i.test(head)) {
        throw new Error('Filen är en Git LFS-pekare, inte själva zip-filen. Pusha .skill utan LFS, eller hämta LFS-objektet separat.');
      }
      throw new Error(
        'Nedladdningen ser inte ut som en zip/.skill (saknar PK-header). ' +
        'Kontrollera att filen på GitHub är en giltig Skill Canvas-arkivfil.'
      );
    }

    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return {
      path: filePath,
      sha,
      content: copy.buffer,
      name,
    };
  }

  async function fetchGithubFileBytes(cfg, { contentsUrl, downloadUrl, sha, project, expectedSize }) {
    // 1) Raw media type på Contents-API (rätt sätt för 1–100 MB)
    try {
      const raw = await apiFetchRaw(contentsUrl, { githubRaw: true });
      if (raw && raw.byteLength > 0 && (!expectedSize || raw.byteLength === expectedSize)) {
        return new Uint8Array(raw);
      }
    } catch (e) {
      if (e.status === 401 || e.status === 403) throw e;
    }

    // 2) Git Blob API (full base64 om inte truncated)
    if (sha) {
      try {
        const blob = await apiFetch(`${apiBase(cfg)}/repos/${project}/git/blobs/${sha}`);
        if (blob?.content && !blob.truncated) {
          const bytes = base64ToBytes(blob.content);
          if (bytes.length && (!expectedSize || bytes.length === expectedSize)) {
            return bytes;
          }
        }
      } catch (e) {
        if (e.status === 401 || e.status === 403) throw e;
      }
    }

    // 3) download_url (raw.githubusercontent.com) med auth
    if (downloadUrl) {
      const ab = await apiFetchRaw(downloadUrl, { githubRaw: false });
      if (ab && ab.byteLength > 0 && (!expectedSize || ab.byteLength === expectedSize)) {
        return new Uint8Array(ab);
      }
      // Acceptera även om size-header saknas i metadata
      if (ab && ab.byteLength > 0 && !expectedSize) return new Uint8Array(ab);
    }

    return null;
  }

  async function apiFetchRaw(url, opts = {}) {
    const cfg = config();
    const githubRaw = opts.githubRaw !== false && /api\.github\.com|\.github\./i.test(url);
    let res;
    try {
      res = await fetch(url, {
        headers: {
          ...authHeaders(cfg),
          // Överskriv JSON-Accept från authHeaders
          Accept: githubRaw ? 'application/vnd.github.raw' : '*/*',
        },
        redirect: 'follow',
      });
    } catch (e) {
      const msg = e?.message || String(e);
      if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        throw new Error(
          'Nätverksfel mot Git-API (Failed to fetch). Kontrollera internet och att ingen tillägg blockerar anropet.'
        );
      }
      throw e;
    }
    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.json();
        detail = data.message || data.error || '';
      } catch { /* ignore */ }
      const err = new Error(friendlyHttpError(res.status, detail, cfg));
      err.status = res.status;
      throw err;
    }
    return res.arrayBuffer();
  }

  async function putFile(path, arrayBuffer, opts = {}) {
    const cfg = config();
    if (!isConfigured()) throw new Error(missingConfigMessage());
    const filePath = normalizePath(path);
    if (!filePath) throw new Error('Ingen filsökväg angiven');
    const message = String(opts.message || `Update ${filePath}`).trim() || `Update ${filePath}`;
    const contentB64 = bytesToBase64(arrayBuffer);

    if (cfg.provider === 'gitlab') {
      const project = encodeURIComponent(projectPath(cfg));
      const encoded = encodeURIComponent(filePath);
      let exists = false;
      try {
        await apiFetch(
          `${apiBase(cfg)}/projects/${project}/repository/files/${encoded}?ref=${encodeURIComponent(cfg.branch)}`
        );
        exists = true;
      } catch (e) {
        if (e.status !== 404) throw e;
      }
      const body = {
        branch: cfg.branch,
        content: contentB64,
        encoding: 'base64',
        commit_message: message,
      };
      const method = exists ? 'PUT' : 'POST';
      await apiFetch(`${apiBase(cfg)}/projects/${project}/repository/files/${encoded}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const refreshed = await getFile(filePath);
      return { path: filePath, sha: refreshed.sha };
    }

    const project = projectPath(cfg);
    const urlPath = filePath.split('/').map(encodeURIComponent).join('/');
    let sha = opts.sha || '';
    if (!sha) {
      try {
        const existing = await apiFetch(
          `${apiBase(cfg)}/repos/${project}/contents/${urlPath}?ref=${encodeURIComponent(cfg.branch)}`
        );
        if (!Array.isArray(existing)) sha = existing.sha || '';
      } catch (e) {
        if (e.status !== 404) throw e;
      }
    }
    const body = {
      message,
      content: contentB64,
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    };
    const result = await apiFetch(`${apiBase(cfg)}/repos/${project}/contents/${urlPath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return {
      path: filePath,
      sha: result?.content?.sha || sha,
    };
  }

  function defaultSavePath(preferredName) {
    const cfg = config();
    const base = preferredName || 'canvas.skill';
    const name = /\.(zip|skill)$/i.test(base) ? base : `${base}.skill`;
    return cfg.path ? `${cfg.path}/${name}` : name;
  }

  function describe() {
    const c = config();
    const project = projectPath(c);
    const host = c.host || (c.provider === 'gitlab' ? 'gitlab.com' : 'github.com');
    const active = getActiveProfile();
    return {
      ...c,
      project,
      label: project ? `${c.provider}:${host}/${project}` : '',
      profileId: active?.id || null,
      profileName: active?.name || '',
    };
  }

  function init() {
    migrateFromScSettings();
    const store = loadStore();
    saveStore(store);
    syncSettingsUi();
  }

  return {
    STORAGE_KEY,
    KEYS,
    DEFAULTS,
    getAll,
    set,
    setMany,
    isGitSettingKey,
    syncSettingsUi,
    config,
    isConfigured,
    missingConfigMessage,
    listArchives,
    getFile,
    putFile,
    defaultSavePath,
    describe,
    normalizePath,
    listProfiles,
    getProfile,
    getActiveProfile,
    setActiveProfile,
    upsertProfile,
    removeProfile,
    clearAllProfiles,
    hasProfiles,
    profileSummary,
    defaultProfileName,
    parseRepoUrl,
    resolveProvider,
    looksLikeGitlabHost,
    init,
  };
})();

window.GitRemote = GitRemote;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => GitRemote.init());
} else {
  GitRemote.init();
}
