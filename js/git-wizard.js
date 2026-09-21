// ════════════════════════════════════════════════════════════
//  GIT WIZARD — steg-för-steg GitHub/GitLab + snabbväg (hub)
// ════════════════════════════════════════════════════════════
const GitWizard = (() => {
  const STEPS = [
    { id: 'provider', label: 'Leverantör' },
    { id: 'repo', label: 'Repo' },
    { id: 'folder', label: 'Mapp' },
    { id: 'token', label: 'Token' },
    { id: 'test', label: 'Klart' },
  ];

  let stepIndex = 0;
  let draft = {};
  let editingProfileId = null;
  let intent = 'open'; // open | save | setup
  let selectedPath = null;
  let hooks = {};

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function bg() { return document.getElementById('git-wizard-bg'); }
  function titleEl() { return document.getElementById('git-wizard-title'); }
  function brandEl() { return document.getElementById('git-wizard-brand'); }
  function headEl() { return document.getElementById('git-wizard-head'); }

  function showPanel(name) {
    document.querySelectorAll('[data-git-panel]').forEach(el => {
      el.hidden = el.getAttribute('data-git-panel') !== name;
    });
  }

  function setProviderTheme(provider) {
    const p = provider === 'gitlab' ? 'gitlab' : 'github';
    const head = headEl();
    const brand = brandEl();
    if (head) {
      head.classList.toggle('is-github', p === 'github');
      head.classList.toggle('is-gitlab', p === 'gitlab');
    }
    if (brand) {
      brand.innerHTML = p === 'gitlab'
        ? `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 21.16l3.47-10.68H8.53L12 21.16zm-3.9-11.9l-1.67 5.14L1.5 9.26h6.6zm7.8 0h6.6l-4.93 5.14-1.67-5.14zM12 2.84L9.53 9.26h4.94L12 2.84z"/></svg>`
        : `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.05A9.28 9.28 0 0112 6.84c.85.004 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.48A10.04 10.04 0 0022 12.26C22 6.58 17.52 2 12 2z"/></svg>`;
    }
  }

  function readDraftFromForm() {
    const provider = document.querySelector('input[name="gw-provider"]:checked')?.value
      || draft.gitProvider
      || 'github';
    draft.gitProvider = provider === 'gitlab' ? 'gitlab' : 'github';
    const host = document.getElementById('gw-host');
    const owner = document.getElementById('gw-owner');
    const repo = document.getElementById('gw-repo');
    const branch = document.getElementById('gw-branch');
    const path = document.getElementById('gw-path');
    const token = document.getElementById('gw-token');
    if (host) draft.gitHost = host.value.trim();
    if (owner) draft.gitOwner = owner.value.trim();
    if (repo) draft.gitRepo = repo.value.trim();
    if (branch) draft.gitBranch = branch.value.trim() || 'main';
    if (path) draft.gitPath = path.value.trim().replace(/^\/+|\/+$/g, '');
    if (token) draft.gitToken = token.value.trim();
  }

  function applyDraftToStorage() {
    if (typeof GitRemote === 'undefined') return;
    // Self-heal: glpat-… eller gitlab-host ⇒ provider gitlab (undvik /api/v3)
    const host = draft.gitHost || '';
    const token = draft.gitToken || '';
    if (
      draft.gitProvider !== 'gitlab' &&
      (GitRemote.resolveProvider?.(draft.gitProvider, host, token) === 'gitlab' ||
        /^glpat-/i.test(token) ||
        /gitlab/i.test(host))
    ) {
      draft.gitProvider = 'gitlab';
    }
    GitRemote.upsertProfile({
      name: draft.name || '',
      gitProvider: draft.gitProvider || 'github',
      gitHost: draft.gitHost || '',
      gitOwner: draft.gitOwner || '',
      gitRepo: draft.gitRepo || '',
      gitBranch: draft.gitBranch || 'main',
      gitPath: draft.gitPath || '',
      gitToken: draft.gitToken || '',
    }, editingProfileId);
    editingProfileId = GitRemote.getActiveProfile()?.id || editingProfileId;
    GitRemote.syncSettingsUi?.();
  }

  function loadDraftFromProfile(profile) {
    const s = profile || GitRemote?.getActiveProfile?.() || {};
    editingProfileId = s.id || null;
    draft = {
      name: s.name || '',
      gitProvider: s.gitProvider || 'github',
      gitHost: s.gitHost || '',
      gitOwner: s.gitOwner || '',
      gitRepo: s.gitRepo || '',
      gitBranch: s.gitBranch || 'main',
      gitPath: s.gitPath || '',
      gitToken: s.gitToken || '',
    };
  }

  function renderSteps() {
    const el = document.getElementById('git-wizard-steps');
    if (!el) return;
    el.innerHTML = STEPS.map((s, i) => {
      const cls = i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : '';
      return `<div class="git-wizard-step ${cls}"><span class="git-wizard-step-num">${i + 1}</span><span class="git-wizard-step-label">${esc(s.label)}</span></div>`;
    }).join('');
  }

  function tokenHelp(provider) {
    if (provider === 'gitlab') {
      return `
        <ol class="git-wizard-help">
          <li>Öppna GitLab → <strong>Preferences → Access Tokens</strong> (eller Project Access Token).</li>
          <li>Skapa en token med scope <code>api</code> <em>eller</em> <code>read_repository</code> + <code>write_repository</code>.</li>
          <li>Kopiera token (visas bara en gång) och klistra in nedan.</li>
        </ol>
        <p class="git-wizard-link-row">
          <a href="https://gitlab.com/-/user_settings/personal_access_tokens" target="_blank" rel="noopener">Öppna GitLab token-sida ↗</a>
        </p>
        <p class="git-wizard-note">Self-hosted: <code>https://DIN-HOST/-/user_settings/personal_access_tokens</code></p>`;
    }
    return `
      <ol class="git-wizard-help">
        <li>Öppna GitHub → <strong>Settings → Developer settings → Personal access tokens → Fine-grained tokens</strong>.</li>
        <li><strong>Repository access:</strong> Only select repositories → välj just ditt repo (t.ex. <code>yllemo/skills</code>).</li>
        <li><strong>Permissions → Repository permissions → Contents:</strong> sätt till <strong>Read and write</strong>
            (Read-only räcker för att lista filer men <em>inte</em> för att pusha —
            felet <em>Resource not accessible by personal access token</em> betyder nästan alltid detta).</li>
        <li>Kopiera token och klistra in nedan. Token sparas bara i den här webbläsaren.</li>
      </ol>
      <p class="git-wizard-note">Snabbare alternativ: <strong>klassisk</strong> PAT med scope <code>repo</code>.</p>
      <p class="git-wizard-link-row">
        <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener">Skapa fine-grained token ↗</a>
        <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener">Klassisk token (repo) ↗</a>
      </p>`;
  }

  function renderStepBody() {
    const body = document.getElementById('git-wizard-step-body');
    const next = document.getElementById('git-wizard-next');
    const back = document.getElementById('git-wizard-back');
    if (!body || !next || !back) return;

    const provider = draft.gitProvider === 'gitlab' ? 'gitlab' : 'github';
    setProviderTheme(provider);
    back.hidden = false;
    if (stepIndex === 0 && !GitRemote.hasProfiles?.()) back.hidden = true;
    next.textContent = stepIndex >= STEPS.length - 1 ? 'Spara & fortsätt' : 'Nästa';
    next.disabled = false;

    const id = STEPS[stepIndex].id;

    if (id === 'provider') {
      if (titleEl()) titleEl().textContent = 'Anslut till Git';
      body.innerHTML = `
        <p class="url-open-hint">Klistra in en repo-URL (t.ex. <code>https://github.com/yllemo/skills</code>) eller välj leverantör manuellt. Guiden sparar valet lokalt — inget skickas till Skill Canvas-servern.</p>
        <label class="url-open-label" for="gw-repo-url">Repo-URL</label>
        <div class="git-url-row">
          <input type="url" id="gw-repo-url" class="url-open-input" placeholder="https://github.com/yllemo/skills" autocomplete="off" spellcheck="false">
          <button type="button" class="mbtn mbtn-primary" id="gw-repo-url-apply">Använd</button>
        </div>
        <p class="git-status" id="gw-repo-url-status" hidden></p>
        <div class="git-provider-cards">
          <label class="git-provider-card ${provider === 'github' ? 'is-selected' : ''}">
            <input type="radio" name="gw-provider" value="github" ${provider === 'github' ? 'checked' : ''}>
            <span class="git-provider-icon github">${brandSvg('github')}</span>
            <span class="git-provider-name">GitHub</span>
            <span class="git-provider-desc">github.com eller GitHub Enterprise</span>
          </label>
          <label class="git-provider-card ${provider === 'gitlab' ? 'is-selected' : ''}">
            <input type="radio" name="gw-provider" value="gitlab" ${provider === 'gitlab' ? 'checked' : ''}>
            <span class="git-provider-icon gitlab">${brandSvg('gitlab')}</span>
            <span class="git-provider-name">GitLab</span>
            <span class="git-provider-desc">gitlab.com eller self-hosted</span>
          </label>
        </div>`;
      body.querySelectorAll('input[name="gw-provider"]').forEach(inp => {
        inp.addEventListener('change', () => {
          draft.gitProvider = inp.value;
          setProviderTheme(inp.value);
          body.querySelectorAll('.git-provider-card').forEach(c => {
            c.classList.toggle('is-selected', c.querySelector('input')?.value === inp.value);
          });
        });
      });
      wireRepoUrlField();
      return;
    }

    if (id === 'repo') {
      const isGl = provider === 'gitlab';
      if (titleEl()) titleEl().textContent = isGl ? 'GitLab-projekt' : 'GitHub-repository';
      body.innerHTML = `
        <p class="url-open-hint">Klistra in URL eller fyll i fälten. Exempel: <code>https://github.com/yllemo/skills</code></p>
        <label class="url-open-label" for="gw-repo-url">Repo-URL</label>
        <div class="git-url-row">
          <input type="url" id="gw-repo-url" class="url-open-input" placeholder="https://github.com/yllemo/skills" autocomplete="off" spellcheck="false">
          <button type="button" class="mbtn mbtn-primary" id="gw-repo-url-apply">Använd</button>
        </div>
        <p class="git-status" id="gw-repo-url-status" hidden></p>
        <label class="url-open-label" for="gw-host">Host ${isGl ? '(tom = gitlab.com)' : '(tom = github.com)'}</label>
        <input type="text" id="gw-host" class="url-open-input" value="${esc(draft.gitHost || '')}" placeholder="${isGl ? 'gitlab.example.com' : 'github.example.com'}" autocomplete="off" spellcheck="false">
        <div class="git-wizard-row">
          <div>
            <label class="url-open-label" for="gw-owner">${isGl ? 'Grupp / användare' : 'Ägare'}</label>
            <input type="text" id="gw-owner" class="url-open-input" value="${esc(draft.gitOwner || '')}" placeholder="min-org" autocomplete="off" spellcheck="false">
          </div>
          <div>
            <label class="url-open-label" for="gw-repo">Repository</label>
            <input type="text" id="gw-repo" class="url-open-input" value="${esc(draft.gitRepo || '')}" placeholder="mina-skills" autocomplete="off" spellcheck="false">
          </div>
        </div>
        <label class="url-open-label" for="gw-branch">Branch</label>
        <input type="text" id="gw-branch" class="url-open-input" value="${esc(draft.gitBranch || 'main')}" placeholder="main" autocomplete="off" spellcheck="false">`;
      wireRepoUrlField({ stayOnStep: true });
      return;
    }

    if (id === 'folder') {
      if (titleEl()) titleEl().textContent = 'Mapp i repot';
      body.innerHTML = `
        <p class="url-open-hint">Valfritt: begränsa till en undermapp där dina <code>.skill</code>-filer ligger. Lämna tomt för att söka i hela repot.</p>
        <label class="url-open-label" for="gw-path">Mapp</label>
        <input type="text" id="gw-path" class="url-open-input" value="${esc(draft.gitPath || '')}" placeholder="skills/" autocomplete="off" spellcheck="false">
        <div class="git-wizard-examples">
          <button type="button" class="git-chip" data-path="">Hela repot</button>
          <button type="button" class="git-chip" data-path="skills">skills/</button>
          <button type="button" class="git-chip" data-path="canvas">canvas/</button>
          <button type="button" class="git-chip" data-path="docs/skills">docs/skills/</button>
        </div>`;
      body.querySelectorAll('.git-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const input = document.getElementById('gw-path');
          if (input) input.value = btn.getAttribute('data-path') || '';
        });
      });
      return;
    }

    if (id === 'token') {
      if (titleEl()) titleEl().textContent = provider === 'gitlab' ? 'GitLab access token' : 'GitHub access token';
      body.innerHTML = `
        <p class="url-open-hint">Token behövs för att lista, hämta och pusha filer via API. Den sparas <strong>bara</strong> i <code>localStorage</code> på den här datorn.</p>
        ${tokenHelp(provider)}
        <label class="url-open-label" for="gw-token">Access token (PAT)</label>
        <input type="password" id="gw-token" class="url-open-input" value="${esc(draft.gitToken || '')}" placeholder="${provider === 'gitlab' ? 'glpat-…' : 'github_pat_… / ghp_…'}" autocomplete="off" spellcheck="false">`;
      return;
    }

    if (id === 'test') {
      if (titleEl()) titleEl().textContent = 'Testa anslutningen';
      const host = draft.gitHost || (provider === 'gitlab' ? 'gitlab.com' : 'github.com');
      const project = [draft.gitOwner, draft.gitRepo].filter(Boolean).join('/') || '—';
      body.innerHTML = `
        <div class="git-hub-card">
          <div class="git-hub-provider">${provider === 'gitlab' ? 'GitLab' : 'GitHub'} · ${esc(host)}</div>
          <div class="git-hub-meta">
            <div><strong>Projekt:</strong> ${esc(project)}</div>
            <div><strong>Branch:</strong> ${esc(draft.gitBranch || 'main')}</div>
            <div><strong>Mapp:</strong> ${esc(draft.gitPath || '(hela repot)')}</div>
            <div><strong>Token:</strong> ${draft.gitToken ? 'angiven (' + draft.gitToken.length + ' tecken)' : 'saknas'}</div>
          </div>
        </div>
        <p class="git-status" id="gw-test-status">Klicka <strong>Spara &amp; fortsätt</strong> för att lagra i webbläsaren och testa API-anropet.</p>`;
    }
  }

  function applyParsedUrl(parsed) {
    draft.gitProvider = parsed.gitProvider;
    draft.gitHost = parsed.gitHost || '';
    draft.gitOwner = parsed.gitOwner || '';
    draft.gitRepo = parsed.gitRepo || '';
    if (parsed.gitBranch) draft.gitBranch = parsed.gitBranch;
    if (parsed.gitPath) draft.gitPath = parsed.gitPath;
    if (parsed.name) draft.name = parsed.name;
    setProviderTheme(draft.gitProvider);
  }

  function setUrlStatus(msg, isError) {
    const el = document.getElementById('gw-repo-url-status');
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle('is-error', !!isError);
    el.classList.toggle('is-ok', !isError);
  }

  function wireRepoUrlField(opts = {}) {
    const input = document.getElementById('gw-repo-url');
    const btn = document.getElementById('gw-repo-url-apply');
    if (!input) return;

    function apply() {
      const parsed = GitRemote.parseRepoUrl?.(input.value);
      if (!parsed?.ok) {
        setUrlStatus(parsed?.error || 'Kunde inte tolka URL', true);
        return;
      }
      applyParsedUrl(parsed);
      const hostLabel = parsed.gitHost || (parsed.gitProvider === 'gitlab' ? 'gitlab.com' : 'github.com');
      setUrlStatus(
        `${parsed.gitProvider === 'gitlab' ? 'GitLab' : 'GitHub'}: ${parsed.gitOwner}/${parsed.gitRepo}` +
        (parsed.gitPath ? ` · mapp ${parsed.gitPath}/` : '') +
        ` · ${hostLabel}`,
        false
      );

      if (opts.stayOnStep) {
        const host = document.getElementById('gw-host');
        const owner = document.getElementById('gw-owner');
        const repo = document.getElementById('gw-repo');
        const branch = document.getElementById('gw-branch');
        if (host) host.value = draft.gitHost || '';
        if (owner) owner.value = draft.gitOwner || '';
        if (repo) repo.value = draft.gitRepo || '';
        if (branch) branch.value = draft.gitBranch || 'main';
        // Re-render if provider changed labels
        renderSteps();
        renderStepBody();
        const urlAgain = document.getElementById('gw-repo-url');
        if (urlAgain) urlAgain.value = input.value;
        setUrlStatus(
          `Ifylld: ${draft.gitOwner}/${draft.gitRepo}` + (draft.gitPath ? ` · ${draft.gitPath}/` : ''),
          false
        );
        return;
      }

      // Hoppa till repo-steget med ifyllda fält
      stepIndex = STEPS.findIndex(s => s.id === 'repo');
      if (stepIndex < 0) stepIndex = 1;
      renderSteps();
      renderStepBody();
      const urlAgain = document.getElementById('gw-repo-url');
      if (urlAgain) urlAgain.value = input.value;
      setUrlStatus(
        `Ifylld från URL: ${draft.gitOwner}/${draft.gitRepo}` + (draft.gitPath ? ` · mapp ${draft.gitPath}/` : ''),
        false
      );
    }

    btn?.addEventListener('click', apply);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); apply(); }
    });
    input.addEventListener('paste', () => {
      setTimeout(apply, 0);
    });
  }

  function brandSvg(p) {
    if (p === 'gitlab') {
      return `<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#E24329" d="M12 21.16l3.47-10.68H8.53L12 21.16z"/><path fill="#FC6D26" d="M8.1 9.26l-1.67 5.14L1.5 9.26h6.6zm7.8 0h6.6l-4.93 5.14-1.67-5.14z"/><path fill="#FCA326" d="M12 2.84L9.53 9.26h4.94L12 2.84z"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.05A9.28 9.28 0 0112 6.84c.85.004 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.48A10.04 10.04 0 0022 12.26C22 6.58 17.52 2 12 2z"/></svg>`;
  }

  function validateStep() {
    readDraftFromForm();
    const id = STEPS[stepIndex].id;
    if (id === 'repo') {
      if (!draft.gitOwner?.trim() && !draft.gitRepo?.trim()) {
        showToast?.('Ange minst ägare eller repository', 3500);
        return false;
      }
      if (!draft.gitRepo?.trim() && draft.gitOwner && !draft.gitOwner.includes('/')) {
        showToast?.('Ange repository-namn', 3500);
        return false;
      }
    }
    if (id === 'token') {
      if (!draft.gitToken?.trim()) {
        showToast?.('Klistra in en access token', 3500);
        return false;
      }
    }
    return true;
  }

  async function finishWizard() {
    readDraftFromForm();
    if (!draft.gitToken?.trim()) {
      showToast?.('Token saknas', 3500);
      return;
    }
    applyDraftToStorage();
    const status = document.getElementById('gw-test-status');
    const next = document.getElementById('git-wizard-next');
    if (next) next.disabled = true;
    if (status) {
      status.classList.remove('is-error', 'is-ok');
      status.textContent = 'Testar anslutning…';
    }
    try {
      const files = await GitRemote.listArchives();
      if (status) {
        status.classList.add('is-ok');
        if (files.length) {
          status.textContent = `Anslutning OK — ${files.length} .skill/.zip-fil(er) hittades. Sparat i localStorage.`;
        } else {
          status.innerHTML = `Anslutning OK — inga .skill/.zip ännu. <strong>Skapa en ny</strong> och pusha den till repot.`;
        }
      }
      showToast?.('Git-anslutning sparad lokalt', 3000);
      setTimeout(() => {
        if (intent === 'save') showSave({ suggestNew: !files.length });
        else if (intent === 'open') showBrowse();
        else if (!files.length) showBrowse();
        else showHub();
      }, 600);
    } catch (err) {
      console.error(err);
      if (status) {
        status.classList.add('is-error');
        status.textContent = err?.message || 'Kunde inte ansluta. Kontrollera token, repo och behörigheter.';
      }
      if (next) next.disabled = false;
    }
  }

  async function nextStep() {
    if (!validateStep()) return;
    readDraftFromForm();
    if (stepIndex >= STEPS.length - 1) {
      await finishWizard();
      return;
    }
    stepIndex += 1;
    renderSteps();
    renderStepBody();
  }

  function prevStep() {
    readDraftFromForm();
    if (stepIndex <= 0) {
      if (GitRemote.hasProfiles?.()) showHub();
      return;
    }
    stepIndex -= 1;
    renderSteps();
    renderStepBody();
  }

  function showHub() {
    const profiles = GitRemote.listProfiles?.() || [];
    if (!profiles.length) {
      startWizard(true);
      return;
    }

    showPanel('hub');
    setProviderTheme('github');
    if (titleEl()) titleEl().textContent = intent === 'save' ? 'Spara till Git' : 'Öppna från Git';

    const list = document.getElementById('git-profile-list');
    if (!list) return;
    list.innerHTML = '';

    const github = profiles.filter(p => (p.gitProvider || 'github') !== 'gitlab');
    const gitlab = profiles.filter(p => p.gitProvider === 'gitlab');

    function addGroup(label, items, provider) {
      if (!items.length) return;
      const head = document.createElement('div');
      head.className = 'git-profile-group';
      head.textContent = label;
      list.appendChild(head);
      items.forEach(p => {
        const sum = GitRemote.profileSummary(p);
        const row = document.createElement('div');
        row.className = `git-profile-item is-${provider}`;
        row.setAttribute('role', 'option');
        row.innerHTML = `
          <button type="button" class="git-profile-main" data-id="${esc(p.id)}">
            <span class="git-profile-badge">${provider === 'gitlab' ? 'GitLab' : 'GitHub'}</span>
            <span class="git-profile-name">${esc(sum.name)}</span>
            <span class="git-profile-meta">${esc(sum.host)} · ${esc(sum.branch)}${sum.path ? ' · ' + esc(sum.path) + '/' : ''}</span>
          </button>
          <div class="git-profile-actions">
            <button type="button" class="git-profile-btn" data-edit="${esc(p.id)}" title="Ändra">✎</button>
            <button type="button" class="git-profile-btn" data-del="${esc(p.id)}" title="Ta bort">✕</button>
          </div>`;
        list.appendChild(row);
      });
    }

    addGroup('GitHub', github, 'github');
    addGroup('GitLab', gitlab, 'gitlab');

    list.querySelectorAll('.git-profile-main').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        GitRemote.setActiveProfile(id);
        if (intent === 'save') showSave();
        else showBrowse();
      });
    });
    list.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.getAttribute('data-edit');
        const profile = GitRemote.getProfile(id);
        if (!profile) return;
        loadDraftFromProfile(profile);
        stepIndex = 0;
        showPanel('wizard');
        renderSteps();
        renderStepBody();
      });
    });
    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.getAttribute('data-del');
        const profile = GitRemote.getProfile(id);
        if (!profile) return;
        if (!confirm(`Ta bort anslutningen "${profile.name}" från den här webbläsaren?`)) return;
        GitRemote.removeProfile(id);
        showHub();
      });
    });
  }

  function startWizard(fromScratch) {
    if (fromScratch) {
      editingProfileId = null;
      draft = {
        name: '',
        gitProvider: 'github',
        gitHost: '',
        gitOwner: '',
        gitRepo: '',
        gitBranch: 'main',
        gitPath: '',
        gitToken: '',
      };
    } else if (!draft.gitToken && !editingProfileId) {
      loadDraftFromProfile(GitRemote.getActiveProfile());
    }
    stepIndex = 0;
    showPanel('wizard');
    renderSteps();
    renderStepBody();
  }

  async function showBrowse() {
    if (!GitRemote.isConfigured()) {
      startWizard(false);
      return;
    }
    showPanel('browse');
    setProviderTheme(GitRemote.config().provider);
    if (titleEl()) titleEl().textContent = 'Öppna från Git';
    const repo = document.getElementById('git-browse-repo');
    if (repo) {
      const info = GitRemote.describe();
      repo.textContent = `${info.label} · branch ${info.branch}${info.path ? ' · ' + info.path + '/' : ''}`;
    }
    await refreshBrowseList();
  }

  function setStatus(id, msg, isError) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle('is-error', !!isError);
    el.classList.toggle('is-ok', !isError && !!msg);
  }

  async function refreshBrowseList() {
    const list = document.getElementById('git-open-list');
    const submit = document.getElementById('git-open-submit');
    selectedPath = null;
    if (submit) submit.disabled = true;
    if (!list) return;
    list.innerHTML = '<div class="git-file-empty">Hämtar filer…</div>';
    setStatus('git-open-status', '');
    try {
      const files = await GitRemote.listArchives();
      if (!files.length) {
        const info = GitRemote.describe();
        const folderHint = info.path
          ? `i mappen <code>${esc(info.path)}/</code>`
          : 'i repot';
        list.innerHTML = `
          <div class="git-file-empty git-file-empty-cta">
            <p><strong>Inga .skill- eller .zip-filer</strong> hittades ${folderHint}.</p>
            <p class="git-file-empty-hint">Repot kan vara tomt, eller så ligger filerna i en annan mapp (ändra anslutningen). Du kan skapa en ny canvas och pusha den hit.</p>
            <button type="button" class="mbtn mbtn-primary" id="git-open-create">Skapa ny .skill och pusha</button>
          </div>`;
        document.getElementById('git-open-create')?.addEventListener('click', () => createNewAndPush());
        setStatus('git-open-status', 'Inga filer ännu — skapa en ny .skill för att komma igång.');
        return;
      }
      list.innerHTML = '';
      files.forEach(f => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'git-file-item';
        btn.dataset.path = f.path;
        btn.innerHTML = `<span class="git-file-name">${esc(f.path.split('/').pop())}</span><span class="git-file-path">${esc(f.path)}</span>`;
        btn.onclick = () => {
          list.querySelectorAll('.git-file-item').forEach(el => el.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          selectedPath = f.path;
          if (submit) submit.disabled = false;
        };
        btn.ondblclick = () => {
          selectedPath = f.path;
          submitBrowse();
        };
        list.appendChild(btn);
      });
    } catch (err) {
      console.error(err);
      list.innerHTML = `
        <div class="git-file-empty git-file-empty-cta">
          <p>Kunde inte lista filer.</p>
          <p class="git-file-empty-hint">${esc(err?.message || 'Fel')}</p>
          <button type="button" class="mbtn mbtn-primary" id="git-open-create">Skapa ny .skill och pusha</button>
        </div>`;
      document.getElementById('git-open-create')?.addEventListener('click', () => createNewAndPush());
      setStatus('git-open-status', err?.message || 'Fel', true);
    }
  }

  async function createNewAndPush() {
    intent = 'save';
    if (hooks.ensureCanvas) {
      const ok = await hooks.ensureCanvas();
      if (!ok) return;
    }
    showSave({ suggestNew: true });
  }

  async function submitBrowse() {
    if (!selectedPath) {
      showToast?.('Välj en fil', 3000);
      return;
    }
    if (hooks.confirmDiscard && !hooks.confirmDiscard()) return;
    const path = selectedPath;
    close();
    await hooks.onOpenFile?.(path);
  }

  function showSave(opts = {}) {
    if (!GitRemote.isConfigured()) {
      intent = 'save';
      startWizard(false);
      return;
    }
    showPanel('save');
    setProviderTheme(GitRemote.config().provider);
    if (titleEl()) titleEl().textContent = opts.suggestNew ? 'Skapa ny .skill' : 'Spara till Git';
    const repo = document.getElementById('git-save-repo');
    if (repo) {
      const info = GitRemote.describe();
      repo.textContent = opts.suggestNew
        ? `Inga filer i repot ännu — skapa och pusha en ny .skill till ${info.label} (${info.branch}).`
        : `Pushar till ${info.label} (${info.branch})`;
    }
    const pathInput = document.getElementById('git-save-path');
    const msgInput = document.getElementById('git-save-message');
    const preferred = hooks.defaultSavePath?.() || GitRemote.defaultSavePath('canvas.skill');
    if (pathInput) {
      pathInput.value = (!opts.suggestNew && hooks.getGitSource?.()?.path) || preferred;
    }
    if (msgInput) {
      msgInput.value = opts.suggestNew
        ? (hooks.defaultCommitMessage?.('create') || 'Add skill canvas')
        : (hooks.defaultCommitMessage?.() || 'Update skill canvas');
    }
    setStatus('git-save-status', opts.suggestNew ? 'Fyll i sökväg och pusha för att skapa filen i Git.' : '');
  }

  async function submitSave() {
    const pathInput = document.getElementById('git-save-path');
    const msgInput = document.getElementById('git-save-message');
    const path = GitRemote.normalizePath(String(pathInput?.value || '').trim());
    if (!path) {
      showToast?.('Ange sökväg i repot', 3000);
      pathInput?.focus();
      return;
    }
    if (!/\.(zip|skill)$/i.test(path)) {
      showToast?.('Sökvägen måste sluta med .skill eller .zip', 4000);
      return;
    }
    const message = String(msgInput?.value || '').trim() || `Update ${path}`;
    const submit = document.getElementById('git-save-submit');
    if (submit) submit.disabled = true;
    setStatus('git-save-status', 'Bygger och pushar…');
    try {
      await hooks.onSave?.(path, message);
      close();
    } catch (err) {
      setStatus('git-save-status', err?.message || 'Kunde inte pusha', true);
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function open(opts = {}) {
    intent = opts.mode === 'save' ? 'save' : opts.mode === 'setup' ? 'setup' : 'open';
    const el = bg();
    if (!el) return;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');

    const has = GitRemote?.hasProfiles?.() || GitRemote?.listProfiles?.()?.length > 0;

    if (opts.forceWizard || !has) {
      startWizard(true);
      return;
    }

    // Alltid hub med listan + wizard-knapp när konfigurationer finns
    showHub();
  }

  function close() {
    const el = bg();
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    selectedPath = null;
  }

  function clearConnection() {
    /* kept for API compat — use per-profile delete in hub */
  }

  function wire() {
    document.getElementById('git-wizard-close')?.addEventListener('click', close);
    document.getElementById('git-wizard-cancel')?.addEventListener('click', () => {
      if (GitRemote.hasProfiles?.()) showHub();
      else close();
    });
    document.getElementById('git-wizard-back')?.addEventListener('click', prevStep);
    document.getElementById('git-wizard-next')?.addEventListener('click', () => nextStep());
    document.getElementById('git-wizard-bg')?.addEventListener('click', e => {
      if (e.target?.id === 'git-wizard-bg') close();
    });

    document.getElementById('git-hub-close')?.addEventListener('click', close);
    document.getElementById('git-hub-new')?.addEventListener('click', () => startWizard(true));

    document.getElementById('git-open-back')?.addEventListener('click', () => {
      if (GitRemote.hasProfiles?.()) showHub();
      else startWizard(true);
    });
    document.getElementById('git-open-refresh')?.addEventListener('click', refreshBrowseList);
    document.getElementById('git-open-submit')?.addEventListener('click', submitBrowse);

    document.getElementById('git-save-back')?.addEventListener('click', () => {
      if (GitRemote.hasProfiles?.()) showHub();
      else close();
    });
    document.getElementById('git-save-submit')?.addEventListener('click', submitSave);
    document.getElementById('git-save-path')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submitSave(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    document.getElementById('git-save-message')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submitSave(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  function init(h = {}) {
    hooks = h;
    wire();
  }

  return { init, open, close, startWizard, showBrowse, showSave, showHub };
})();

window.GitWizard = GitWizard;
