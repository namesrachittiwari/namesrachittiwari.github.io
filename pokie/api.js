/* Pokie — live backend adapter.
 *
 * pokie.js ships the handoff's view model as top-level `const` arrays. This
 * file loads AFTER it, fetches the real API, and rewrites those arrays IN
 * PLACE (splice/push) before re-rendering — a const binding cannot be
 * reassigned, but the array it points at is mutable, so this needs no edits
 * to the view-model file at all.
 *
 * The other reason for in-place mutation: every call degrades to the mock
 * data it was going to replace. A failed fetch, a missing endpoint or a shape
 * the backend never had leaves that section exactly as pokie.js drew it, and
 * the page still renders. Nothing here may throw.
 *
 * The frontend was designed against pokie/API.md and the backend implements
 * openapi.yaml v1.0.1 — two different vocabularies. This file IS the mapping
 * between them; where the backend has no equivalent at all (CV versions,
 * undo, CV upload, the live-run stream) the mock data stays and is labelled.
 */
'use strict';

(function () {
  const API_BASE =
    localStorage.getItem('pokie.apiBase') || 'https://api.rachittiwari.com';
  const TOKEN_KEY = 'pokie.tokens';

  /* ================= colours (mirrors pokie.js) ================= */
  const C = {
    pink: '#EB6BA8', green: '#1CE15F', blue: '#4791FF',
    yellow: '#ECE42E', grey: '#9A9A9A',
  };

  /* ================= token storage ================= */
  const tokens = {
    get() {
      try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); }
      catch { return null; }
    },
    set(t) { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); },
    clear() { localStorage.removeItem(TOKEN_KEY); },
  };

  /* ================= fetch plumbing ================= */

  // One retry on 401 via the refresh token, then give up and ask for a login.
  // Returns null for any failure so callers can fall through to mock data.
  async function api(path, opts = {}, retrying = false) {
    const t = tokens.get();
    if (!t) return null;
    let res;
    try {
      res = await fetch(API_BASE + path, {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + t.access_token,
          ...(opts.headers || {}),
        },
      });
    } catch (err) {
      // Network/CORS/DNS — the API is unreachable, not merely unhappy.
      console.warn('[pokie] ' + path + ' unreachable:', err.message);
      return null;
    }
    if (res.status === 401 && !retrying && t.refresh_token) {
      const refreshed = await refresh(t.refresh_token);
      if (refreshed) return api(path, opts, true);
      tokens.clear();
      showLogin('Session expired — sign in again.');
      return null;
    }
    if (!res.ok) {
      console.warn('[pokie] ' + path + ' -> HTTP ' + res.status);
      return null;
    }
    try { return await res.json(); } catch { return null; }
  }

  async function refresh(refresh_token) {
    try {
      const res = await fetch(API_BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) return false;
      tokens.set(await res.json());
      return true;
    } catch { return false; }
  }

  async function login(email, password) {
    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error(res.status === 401
        ? 'Wrong email or password.'
        : 'Login failed (HTTP ' + res.status + ').');
    }
    tokens.set(await res.json());
  }

  /* ================= mappers: contract shape -> view model ================= */

  const initialsOf = (company) => (company || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase() || '?';

  function daysSince(iso) {
    if (!iso) return 999;
    const then = Date.parse(iso);
    if (Number.isNaN(then)) return 999;
    return Math.max(0, Math.round((Date.now() - then) / 86400000));
  }

  // "₹82–98L" / "82L-98L" / "1.1Cr" -> the leading number in lakhs, else null.
  // The filters compare against 80, so a Cr figure has to be scaled or a
  // ₹1.1Cr role would read as "1" and get filtered out as below the bar.
  function salaryFloor(salary) {
    if (!salary) return null;
    const m = String(salary).match(/(\d+(?:\.\d+)?)\s*(cr|l)?/i);
    if (!m) return null;
    const n = parseFloat(m[1]);
    if (Number.isNaN(n)) return null;
    return /cr/i.test(m[2] || '') ? Math.round(n * 100) : Math.round(n);
  }

  function scoreColour(score) {
    if (score == null) return C.grey;
    if (score >= 85) return C.green;
    if (score >= 70) return C.blue;
    if (score >= 60) return C.yellow;
    return C.grey;
  }

  function mapJob(j, index) {
    const score = typeof j.score === 'number' ? Math.round(j.score) : null;
    const ghost = j.ghost === true;
    const loc = j.location || '';
    const meta = [j.source, loc].filter(Boolean).join(' · ') || '—';
    const skills = (j.matched_skills || []).slice(0, 4).join(', ');
    const missing = (j.missing_skills || []).slice(0, 3).join(', ');

    let note = '', noteFg, noteBg;
    if (ghost) {
      note = 'likely ghost'; noteFg = C.grey; noteBg = '#1a1a1a';
    } else if (j.score_state && j.score_state !== 'scored') {
      // score_state is an enum in the contract; anything not-yet-final reads
      // as in-flight to the user rather than as a missing score.
      note = String(j.score_state).replace(/_/g, ' ');
      noteFg = C.blue; noteBg = 'rgba(71,145,255,.14)';
    }

    return {
      id: j.id,
      initials: initialsOf(j.company),
      color: scoreColour(score),
      role: j.title || 'Untitled role',
      company: j.company || 'Unknown',
      meta,
      comp: j.salary || 'band unclear',
      score: score == null ? '—' : String(score),
      salMin: salaryFloor(j.salary),
      postedDays: daysSince(j.posted_at || j.first_seen_at),
      domain: null,          // no backend equivalent; the AI filter won't match
      warm: false,           // warm paths are a Pokie concept the API lacks
      blrRemote: j.remote === true || /bangalore|bengaluru|remote/i.test(loc),
      note, noteFg, noteBg,
      opacity: ghost ? 0.55 : 1,
      dropped: ghost,
      full: index === 0,
      read: [
        skills && 'Matches: ' + skills,
        missing && 'Gaps: ' + missing,
        j.url && 'Source: ' + j.source,
      ].filter(Boolean).join(' · ') || 'No summary from the source yet.',
      _url: j.apply_url || j.url,
    };
  }

  const timeOf = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? '--:--'
      : String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
  };

  /* ================= hydrators ================= */
  // Each returns true when it replaced the mock data, false when it left it.

  function swap(target, rows) {
    if (!rows || !rows.length) return false;
    target.splice(0, target.length, ...rows);
    return true;
  }

  async function hydrateJobs() {
    const data = await api('/jobs?limit=50');
    if (!data || !Array.isArray(data.items)) return false;
    return swap(JOBS, data.items.map(mapJob));
  }

  async function hydrateMemory() {
    const [facts, prefs] = await Promise.all([
      api('/memory/facts'), api('/memory/preferences'),
    ]);
    const groups = [];
    const toItems = (r) => (r && Array.isArray(r.items) ? r.items : []).map(x => ({
      id: x.id,
      text: x.value,
      source: x.key + ' · updated ' + (x.updated_at || '').slice(0, 10),
    }));

    const factItems = toItems(facts);
    if (factItems.length) {
      groups.push({
        title: 'Identity', sub: 'facts Pokie holds about you',
        color: '#fff', items: factItems,
      });
    }
    const prefItems = toItems(prefs);
    if (prefItems.length) {
      groups.push({
        title: 'Preferences', sub: 'the bar you set',
        color: C.blue, items: prefItems,
      });
    }
    return swap(MEMORY, groups);
  }

  async function hydrateHistory() {
    const data = await api('/activity/log?limit=40');
    if (!data || !Array.isArray(data.days)) return false;
    const days = data.days.map(d => ({
      day: d.date || d.day || 'Earlier',
      rows: (d.entries || d.items || []).map(e => ({
        id: e.id,
        time: timeOf(e.occurred_at),
        actor: 'Pokie',
        text: e.message,
        detail: e.category,
        action: 'Inspect',   // no undo endpoint exists in v1.0.1
      })),
    })).filter(d => d.rows.length);
    return swap(HISTORY, days);
  }

  async function hydrateDecisions() {
    const data = await api('/reviews?limit=20');
    if (!data || !Array.isArray(data.items)) return false;
    const jobById = new Map(JOBS.map(j => [j.id, j]));
    const rows = data.items.map(r => {
      const job = jobById.get(r.job_id);
      return {
        kind: 'Needs you · ' + (r.status || 'pending'),
        kindColor: C.yellow, border: 'rgba(236,226,46,.35)',
        age: daysSince(r.created_at) + 'd old',
        title: job ? job.role + ' · ' + job.company : 'Review ' + r.id.slice(0, 8),
        sub: job ? job.comp + ' · scored ' + job.score : 'Waiting on your decision.',
        primary: 'Approve', primaryBg: C.green, secondary: 'Reject',
        _id: r.id,
      };
    });
    return swap(DECISIONS, rows);
  }

  /* ================= login overlay ================= */

  function showLogin(message) {
    if (document.getElementById('pokie-login')) return;
    const wrap = document.createElement('div');
    wrap.id = 'pokie-login';
    wrap.style.cssText =
      'position:fixed;inset:0;z-index:9999;background:rgba(7,7,7,.94);' +
      'display:flex;align-items:center;justify-content:center;padding:24px;' +
      'font-family:Poppins,system-ui,sans-serif';
    wrap.innerHTML =
      '<form style="width:100%;max-width:340px;background:#0B0B0B;border:1px solid #1e1e1e;' +
      'border-radius:18px;padding:26px">' +
      '<div style="color:#fff;font-size:17px;font-weight:600;margin-bottom:4px">Sign in to Pokie</div>' +
      '<div id="pk-msg" style="color:#8a8a8a;font-size:12.5px;margin-bottom:18px">' +
      (message || 'Connecting to your live backend.') + '</div>' +
      '<input id="pk-email" type="email" placeholder="Email" autocomplete="username" required ' +
      'style="width:100%;margin-bottom:10px;padding:11px 13px;border-radius:10px;border:1px solid #262626;' +
      'background:#121212;color:#fff;font-size:14px;font-family:inherit">' +
      '<input id="pk-pass" type="password" placeholder="Password" autocomplete="current-password" required ' +
      'style="width:100%;margin-bottom:16px;padding:11px 13px;border-radius:10px;border:1px solid #262626;' +
      'background:#121212;color:#fff;font-size:14px;font-family:inherit">' +
      '<button type="submit" id="pk-go" style="width:100%;padding:11px;border:0;border-radius:999px;' +
      'background:#EB6BA8;color:#0a0a0a;font-weight:600;font-size:14px;font-family:inherit;cursor:pointer">' +
      'Sign in</button>' +
      '<button type="button" id="pk-skip" style="width:100%;margin-top:9px;padding:9px;border:0;' +
      'background:none;color:#6f6f6f;font-size:12.5px;font-family:inherit;cursor:pointer">' +
      'Continue with sample data</button>' +
      '</form>';
    document.body.appendChild(wrap);

    wrap.querySelector('#pk-skip').onclick = () => wrap.remove();
    wrap.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = wrap.querySelector('#pk-go');
      const msg = wrap.querySelector('#pk-msg');
      btn.disabled = true; btn.textContent = 'Signing in…';
      try {
        await login(wrap.querySelector('#pk-email').value.trim(),
                    wrap.querySelector('#pk-pass').value);
        wrap.remove();
        await hydrateAll();
      } catch (err) {
        msg.textContent = err.message;
        msg.style.color = '#EB6BA8';
        btn.disabled = false; btn.textContent = 'Sign in';
      }
    };
  }

  /* ================= banner ================= */

  function banner(text, colour) {
    let el = document.getElementById('pokie-datasrc');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pokie-datasrc';
      el.style.cssText =
        'position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:9998;' +
        'padding:7px 14px;border-radius:999px;font:500 12px Poppins,system-ui,sans-serif;' +
        'border:1px solid #262626;background:#101010;pointer-events:none';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.color = colour;
  }

  /* ================= orchestration ================= */

  async function hydrateAll() {
    if (!tokens.get()) { showLogin(); return; }
    banner('Loading live data…', '#8a8a8a');

    // Jobs first: decisions map review.job_id against the loaded jobs.
    const jobsOk = await hydrateJobs();
    const [memOk, histOk, decOk] = await Promise.all([
      hydrateMemory(), hydrateHistory(), hydrateDecisions(),
    ]);

    const live = [
      jobsOk && 'jobs', memOk && 'memory',
      histOk && 'history', decOk && 'needs-you',
    ].filter(Boolean);

    if (typeof render === 'function') render();

    if (!live.length) {
      banner('Sample data — backend returned nothing', C.yellow);
    } else if (live.length === 4) {
      banner('Live: ' + live.join(', '), C.green);
    } else {
      banner('Live: ' + live.join(', ') + ' · rest is sample data', C.blue);
    }
  }

  /* Exposed so the console (and later screens) can drive it. */
  window.POKIE_API = {
    base: API_BASE, login, logout: () => { tokens.clear(); location.reload(); },
    hydrate: hydrateAll, showLogin, api,
  };

  hydrateAll();
})();
