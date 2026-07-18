/* Job Pilot app — chat drives the canvas. */
'use strict';

/* ================= Data ================= */
const JOBS = [
  { id: 'papercrane', co: 'Papercrane', role: 'Design Engineer', match: 96, salMin: 52, salMax: 68,
    where: 'Hybrid · Bengaluru', remote: false, ghost: false, family: false, rockstar: false, salListed: true,
    bg: '#6D3FB4', tags: ['Design systems', 'React', 'Storybook'],
    note: 'Founder replies to email within a day. We tested it. Twice.', kind: 'good' },
  { id: 'mintleaf', co: 'Mintleaf', role: 'Senior Frontend Engineer', match: 92, salMin: 45, salMax: 60,
    where: 'Remote · India', remote: true, ghost: false, family: false, rockstar: false, salListed: true,
    bg: '#1E9E6A', tags: ['React', 'TypeScript', 'Fintech'],
    note: 'Zero mentions of “hustle”. Suspiciously healthy.', kind: 'good' },
  { id: 'snackbar', co: 'Snackbar', role: 'React Developer', match: 84, salMin: 38, salMax: 50,
    where: 'Remote · anywhere', remote: true, ghost: false, family: false, rockstar: false, salListed: true,
    bg: '#B4540A', tags: ['Next.js', '4-day week'],
    note: 'A real 4-day week, not the LinkedIn-post kind.', kind: 'good' },
  { id: 'bunker', co: 'Bunker Labs', role: 'Frontend Architect', match: 81, salMin: 55, salMax: 75,
    where: 'Hybrid · Pune', remote: false, ghost: false, family: false, rockstar: false, salListed: true,
    bg: '#2E51D4', tags: ['Vue', 'Micro-frontends'],
    note: '🚩 Says “fast-paced” twice — but pays like it means it.', kind: 'bad' },
  { id: 'lumen', co: 'Lumenware', role: 'UI Engineer', match: 78, salMin: 40, salMax: 52,
    where: 'Remote · IST overlap', remote: true, ghost: false, family: false, rockstar: false, salListed: true,
    bg: '#D42E86', tags: ['React', 'Data viz'],
    note: 'Recruiter replied in 3 hours. Frame this.', kind: 'good' },
  { id: 'glowfish', co: 'Glowfish', role: 'Staff UI Engineer', match: 67, salMin: null, salMax: null,
    where: 'On-site · Gurugram', remote: false, ghost: false, family: true, rockstar: false, salListed: false,
    bg: '#8B8172', tags: ['Angular', 'Free snacks ×4'],
    note: '🚩🚩 “We’re a family” ×3. Bring a therapist to the interview.', kind: 'bad' },
  { id: 'hexadecimal', co: 'Hexadecimal', role: 'Frontend Ninja', match: 12, salMin: null, salMax: null,
    where: 'Posted 247 days ago', remote: true, ghost: true, family: false, rockstar: true, salListed: false,
    bg: '#59437E', tags: ['👻 Ghost job'],
    note: '“Urgently hiring” since last Diwali. It’s a fossil.', kind: 'ghost' },
  { id: 'copperbeam', co: 'Copperbeam', role: 'Frontend Rockstar', match: 44, salMin: 18, salMax: 24,
    where: 'On-site · Noida', remote: false, ghost: false, family: false, rockstar: true, salListed: true,
    bg: '#1E1A16', tags: ['jQuery', '“Equity”'],
    note: '🚩 Wants a “rockstar” for ₹18L. The audacity is the perk.', kind: 'bad' },
];

const DEEP_STEPS = [
  ['Searching linkedin.com for senior frontend roles in India…', 'linkedin.com'],
  ['Reading 312 postings. 41 are the same job wearing different hats…', null],
  ['Checking glassdoor.com for “work-life balance” horror stories…', 'glassdoor.com'],
  ['Carbon-dating listings — hexadecimal.io has been “urgent” for 247 days…', 'hexadecimal.io'],
  ['Cross-referencing funding rounds on crunchbase.com…', 'crunchbase.com'],
  ['Estimating real salaries from levels.fyi. Some numbers hurt…', 'levels.fyi'],
  ['Reading founder tweets. Some things cannot be unread…', 'x.com'],
  ['Scanning wellfound.com — filtering “equity & vibes” compensation…', 'wellfound.com'],
  ['Ranking 8 finalists by match, money, and glassdoor trauma score…', null],
];
const SOURCES = {
  'linkedin.com': ['💼', '312 postings scanned · 9 were real'],
  'glassdoor.com': ['🚪', 'Trauma reports cross-checked for 8 companies'],
  'hexadecimal.io': ['🦴', 'Fossil confirmed: 247 days “urgently hiring”'],
  'crunchbase.com': ['💰', 'Runway checked — 2 rivals quietly out of money'],
  'levels.fyi': ['📊', '“Competitive salary” translated into numbers'],
  'x.com': ['🐦', 'Founder timelines reviewed. Regrettably.'],
  'wellfound.com': ['🚀', '67 startups · 3 pay in exposure'],
};

const REPLIES = [
  [/roast.*resume|resume/i, 'Your resume lists “Microsoft Word” as a skill — in 2026 that’s not a skill, it’s a confession. Two date formats in one column, and an objective statement nobody has read since 2011. The actual work? Genuinely strong. Lead with the design system you shipped, delete the rest, and stop underselling yourself in Calibri.'],
  [/why.*ghost|ghosted/i, 'Statistically: budget freeze (40%), CEO’s nephew (25%), the role never existed (20%), or your email lives in a folder called “later” that no recruiter has ever reopened (15%). None of these are about you. Want a follow-up with plausible deniability?'],
  [/follow.?up|desperate/i, 'Drafted: “Hi Priya — following up on the Design Engineer role. Still very interested, happy to share the case study we discussed. If timelines shifted, no problem — a quick heads-up would be great.” Zero instances of “circling back”. Your dignity survives.'],
  [/translate|competitive/i, 'Translation service: “fast-paced” → understaffed. “Wear many hats” → three jobs, one salary. “Rockstar” → applause instead of money. “Like a family” → boundaries optional. “Competitive salary” → competitive for whom, they won’t say.'],
  [/interview|prep/i, 'Tuesday prep: they’ll ask “tell me about yourself” — that’s 90 seconds, not your autobiography. Prepare one conflict story where you were mildly heroic. And when they say “any questions?”, ask about the last person who held this role. Watch the face.'],
  [/salary|ask for|negotiat/i, 'Ask for ₹58L. You’ll feel sick saying it. Say it anyway. The worst case is they say ₹52L, which was their plan all along. Never give your number first — “I’m flexible for the right role” is a complete sentence.'],
];

/* ================= State ================= */
const state = {
  filters: {}, // key -> {label, fn}
  pinned: new Set(),
  applied: new Set(),
  yeeted: new Set(),
  sort: 'match',
  canvasOpen: false,
  deepMode: false,
  deepRan: false,
  view: 'cards',
  busy: false,
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 40) : ms));

/* ================= Elements ================= */
const app = $('#app'), feed = $('#feed'), chat = $('#chat'), zero = $('#zero');
const input = $('#input'), send = $('#send'), deepTog = $('#deepTog');
const canvasBtn = $('#canvasBtn'), cvCount = $('#cvCount'), canvasCt = $('#canvasCt');
const paneList = $('#paneList'), paneAct = $('#paneAct'), paneSrc = $('#paneSrc');
const cvFilters = $('#cvFilters'), toast = $('#toast');

/* ================= Filters ================= */
const FILTER_DEFS = {
  remote:   { label: '🏝 Remote only', fn: j => j.remote },
  ghost:    { label: '👻 No ghost jobs', fn: j => !j.ghost },
  family:   { label: '🫠 No “family” companies', fn: j => !j.family },
  rockstar: { label: '🎸 No rockstar/ninja titles', fn: j => !j.rockstar },
  salary:   { label: '💰 Salary listed', fn: j => j.salListed },
};
function addFilter(key, label, fn) {
  state.filters[key] = { label, fn };
  renderFilters(); renderJobs();
}
function dropFilter(key) {
  delete state.filters[key];
  renderFilters(); renderJobs();
}
function renderFilters() {
  const keys = Object.keys(state.filters);
  cvFilters.innerHTML = keys.length
    ? keys.map(k => `<span class="f-chip">${state.filters[k].label}<button aria-label="Remove filter" data-drop="${k}">×</button></span>`).join('')
    : '<span class="hint">No filters yet — just ask in chat: “remote only”, “under 60L”, “hide ghost jobs”…</span>';
}
cvFilters.addEventListener('click', e => {
  const b = e.target.closest('[data-drop]');
  if (b) { dropFilter(b.dataset.drop); botSay(`Filter removed. Standards: lowered. The ${b.dataset.drop === 'ghost' ? 'fossils are back 👻' : 'floodgates are open'}.`); }
});

function visibleJobs() {
  let js = JOBS.filter(j => !state.yeeted.has(j.id));
  for (const k of Object.keys(state.filters)) js = js.filter(state.filters[k].fn);
  js.sort((a, b) => state.sort === 'salary'
    ? (b.salMax || 0) - (a.salMax || 0)
    : b.match - a.match);
  return [...js.filter(j => state.pinned.has(j.id)), ...js.filter(j => !state.pinned.has(j.id))];
}

/* ================= Canvas render ================= */
function ringColor(m) { return m >= 90 ? '#F0439B' : m >= 70 ? '#6D3FB4' : m >= 50 ? '#B4540A' : '#8B8172'; }
function salText(j) { return j.salListed ? `₹${j.salMin}–${j.salMax}L` : '“Competitive” 🙄'; }

function jobCardHTML(j) {
  const C = 2 * Math.PI * 14.5, off = C * (1 - j.match / 100);
  const noteClass = j.kind === 'bad' ? 'bad' : j.kind === 'ghost' ? 'ghost' : '';
  return `<article class="jcard ${state.pinned.has(j.id) ? 'pinned' : ''} ${j.ghost ? 'ghosty' : ''}" data-id="${j.id}">
    <div class="j-top">
      <span class="j-logo" style="background:${j.bg}">${j.co[0]}</span>
      <span class="j-name"><b>${j.role}</b><span>${j.co} · ${j.where}</span></span>
      <span class="match" title="How much this role deserves you">
        <svg viewBox="0 0 36 36"><circle class="tr" cx="18" cy="18" r="14.5" fill="none" stroke-width="3.6"/>
        <circle class="br" cx="18" cy="18" r="14.5" fill="none" stroke-width="3.6" stroke="${ringColor(j.match)}" stroke-dasharray="${C}" stroke-dashoffset="${off}"/></svg>
        <span class="mn">${j.match}</span><span class="ml">match</span>
      </span>
    </div>
    <div class="j-mid">
      <span class="j-sal">${salText(j)}</span>
      ${j.tags.map(t => `<span class="j-tag">${t}</span>`).join('')}
    </div>
    <p class="j-note ${noteClass}">${j.note}</p>
    <div class="j-act">
      <button class="jb apply ${state.applied.has(j.id) ? 'did' : ''}" data-a="apply">${state.applied.has(j.id) ? 'Applied ✓' : 'Apply'}</button>
      <button class="jb pin ${state.pinned.has(j.id) ? 'did' : ''}" data-a="pin">${state.pinned.has(j.id) ? '📌 Pinned' : '📌 Pin'}</button>
      <button class="jb yeet" data-a="yeet" aria-label="Yeet ${j.co} into the void">Yeet 🗑</button>
    </div>
  </article>`;
}

function renderJobs() {
  const js = visibleJobs();
  cvCount.textContent = `${js.length} role${js.length === 1 ? '' : 's'}`;
  canvasCt.textContent = js.length;
  if (!js.length) {
    paneList.innerHTML = `<div class="cv-empty"><span class="big">Nothing survives your standards.</span>Remove a filter, or accept that you have taste.</div>`;
    return;
  }
  if (state.view === 'table') {
    paneList.innerHTML = `<table class="jtable"><thead><tr><th>Role</th><th>Salary</th><th>Match</th><th></th></tr></thead><tbody>${
      js.map(j => `<tr data-id="${j.id}"><td><span class="r">${state.pinned.has(j.id) ? '📌 ' : ''}${j.role}</span><span class="c">${j.co} · ${j.where}</span></td><td>${salText(j)}</td><td class="mm">${j.match}</td><td><button class="jb pin ${state.pinned.has(j.id) ? 'did' : ''}" data-a="pin">📌</button></td></tr>`).join('')
    }</tbody></table>`;
  } else {
    paneList.innerHTML = js.map(jobCardHTML).join('');
  }
}

paneList.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const host = b.closest('[data-id]');
  const j = JOBS.find(x => x.id === host.dataset.id);
  if (b.dataset.a === 'pin') {
    state.pinned.has(j.id) ? state.pinned.delete(j.id) : state.pinned.add(j.id);
    renderJobs();
    showToast(state.pinned.has(j.id) ? `Pinned ${j.co}. It floats to the top now. 📌` : `Unpinned ${j.co}. It never saw it coming.`);
  }
  if (b.dataset.a === 'apply') {
    if (j.ghost) { showToast('You applied to a fossil. Archaeologists will find your cover letter. 👻'); return; }
    state.applied.add(j.id); renderJobs();
    showToast(`Applied to ${j.co}. Resume v14 deployed. 🫡`);
  }
  if (b.dataset.a === 'yeet') {
    state.yeeted.add(j.id);
    const card = host.classList ? host : null;
    if (card && card.classList.contains('jcard') && !reduced) {
      card.classList.add('gone');
      setTimeout(renderJobs, 320);
    } else renderJobs();
    showToast(`Yeeted ${j.co} into the void. The void says thanks.`, 'Undo', () => { state.yeeted.delete(j.id); renderJobs(); });
  }
});

/* View toggle */
$('#vCards').addEventListener('click', () => setView('cards'));
$('#vTable').addEventListener('click', () => setView('table'));
function setView(v) {
  state.view = v;
  $('#vCards').setAttribute('aria-pressed', String(v === 'cards'));
  $('#vTable').setAttribute('aria-pressed', String(v === 'table'));
  renderJobs();
}

/* Canvas open/close + tabs */
function openCanvas(tab = 'list') {
  state.canvasOpen = true;
  app.classList.remove('no-canvas');
  canvasBtn.setAttribute('aria-pressed', 'true');
  selectTab(tab);
}
function closeCanvas() {
  state.canvasOpen = false;
  app.classList.add('no-canvas');
  canvasBtn.setAttribute('aria-pressed', 'false');
}
canvasBtn.addEventListener('click', () => state.canvasOpen ? closeCanvas() : openCanvas());
$('#cvClose').addEventListener('click', closeCanvas);
$('#openCanvasSide').addEventListener('click', () => { openCanvas(); setDrawer(false); });
$('#scrim').addEventListener('click', () => { closeCanvas(); setDrawer(false); });

function selectTab(name) {
  document.querySelectorAll('.cv-tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.pane === name)));
  paneList.hidden = name !== 'list';
  paneAct.hidden = name !== 'act';
  paneSrc.hidden = name !== 'src';
}
document.querySelectorAll('.cv-tab').forEach(t => t.addEventListener('click', () => selectTab(t.dataset.pane)));

/* ================= Chat ================= */
function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
function scrollDown() { chat.scrollTop = chat.scrollHeight; }
function clearZero() { if (zero.parentNode) zero.remove(); }

function userSay(text) {
  clearZero();
  feed.appendChild(el(`<div class="m usr"><div class="bub">${escapeHtml(text)}</div></div>`));
  scrollDown();
}
function botSay(html, { headline } = {}) {
  clearZero();
  const m = el(`<div class="m bot"><span class="who"><svg width="13" height="13"><use href="#logo-d"/></svg></span><div class="bub">${headline ? `<p class="hl">${headline}</p>` : ''}${html.startsWith('<') ? html : `<p>${html}</p>`}</div></div>`);
  feed.appendChild(m);
  scrollDown();
  return m;
}
async function botThink(ms = 700) {
  clearZero();
  const t = el(`<div class="m bot"><span class="who"><svg width="13" height="13"><use href="#logo-d"/></svg></span><div class="bub"><span class="typing"><i></i><i></i><i></i></span></div></div>`);
  feed.appendChild(t); scrollDown();
  await wait(ms);
  t.remove();
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---- Intent parsing: the chat IS the filter UI ---- */
async function handle(text) {
  if (state.busy) return;
  const t = text.trim();
  if (!t) return;
  state.busy = true; send.disabled = true;
  userSay(t);

  if (state.deepMode || /deep hunt|deep research/i.test(t)) { await runDeepHunt(); done(); return; }

  const acts = [];
  const lower = t.toLowerCase();

  if (/remote/.test(lower)) { addFilter('remote', FILTER_DEFS.remote.label, FILTER_DEFS.remote.fn); acts.push('Remote only — on. Commutes cancelled.'); }
  if (/ghost|fossil/.test(lower) && /hide|no |remove|without/.test(lower) || /hide.*ghost/.test(lower)) { addFilter('ghost', FILTER_DEFS.ghost.label, FILTER_DEFS.ghost.fn); acts.push('Ghost jobs hidden. The fossils rest in peace. 👻'); }
  else if (/show.*(ghost|fossil)/.test(lower)) { dropFilter('ghost'); acts.push('Fine — the fossil is back. Hexadecimal has been “urgent” for 247 days. Manage your expectations.'); }
  if (/family/.test(lower)) { addFilter('family', FILTER_DEFS.family.label, FILTER_DEFS.family.fn); acts.push('“We’re a family” companies filtered. Your therapist thanks you.'); }
  if (/rockstar|ninja/.test(lower) && /no|without|hide|filter/.test(lower)) { addFilter('rockstar', FILTER_DEFS.rockstar.label, FILTER_DEFS.rockstar.fn); acts.push('Rockstars and ninjas escorted out. This is a workplace.'); }
  if (/salary listed|has salary|with salary/.test(lower)) { addFilter('salary', FILTER_DEFS.salary.label, FILTER_DEFS.salary.fn); acts.push('“Competitive salary” cowards removed.'); }

  const under = lower.match(/under\s*₹?\s*(\d{2,3})\s*l?/);
  if (under) { const cap = +under[1]; addFilter('salMax', `💰 Under ₹${cap}L`, j => j.salListed && j.salMin <= cap); acts.push(`Capped at ₹${cap}L. Reasonable. Boring, but reasonable.`); }
  const above = lower.match(/(?:above|over|at least|\+)\s*₹?\s*(\d{2,3})\s*l|₹?(\d{2,3})\s*l\s*\+/);
  if (above) { const fl = +(above[1] || above[2]); addFilter('salMin', `💰 Above ₹${fl}L`, j => j.salListed && j.salMax >= fl); acts.push(`Floor set at ₹${fl}L. Know your worth. Add 20%.`); }

  if (/sort.*salary|by pay/.test(lower)) { state.sort = 'salary'; renderJobs(); acts.push('Sorted by money. The love of the craft comes second today.'); }
  if (/sort.*match/.test(lower)) { state.sort = 'match'; renderJobs(); acts.push('Sorted by match.'); }

  if (/pin.*top\s*(two|2|three|3)?|pin the best/.test(lower)) {
    const n = /three|3/.test(lower) ? 3 : 2;
    visibleJobs().slice(0, n).forEach(j => state.pinned.add(j.id));
    renderJobs();
    acts.push(`Top ${n} pinned. They live at the top now, rent-free. 📌`);
  }

  const wantsJobs = /find|show|role|job|opening|frontend|design|react|hunt/i.test(lower);

  if (acts.length) {
    openCanvas('list');
    await botThink(600);
    const js = visibleJobs();
    botSay(`<p>${acts.join(' ')}</p><p>${js.length} role${js.length === 1 ? '' : 's'} survive${js.length === 1 ? 's' : ''} in the canvas — ${summarize(js)}</p>`);
  } else if (wantsJobs) {
    openCanvas('list');
    await botThink(800);
    renderJobs();
    const js = visibleJobs();
    botSay(`<p>Canvas is up with ${js.length} roles from last night’s sweep — ${summarize(js)}</p><p>Talk to me to filter: “remote only”, “above 40L”, “hide ghost jobs”, “pin the top two”. The canvas obeys the chat.</p>`);
  } else {
    const hit = REPLIES.find(([re]) => re.test(t));
    await botThink(750);
    botSay(hit ? hit[1] : 'Noted. Filed under “things we handle before your next existential crisis”. Meanwhile — want me to run the boards, or roast something?');
  }
  done();
  function done() { state.busy = false; send.disabled = false; input.focus(); }
}

function summarize(js) {
  if (!js.length) return 'technically. Your filters ate everything.';
  const best = js[0];
  const flags = js.filter(j => j.kind === 'bad').length;
  const ghosts = js.filter(j => j.ghost).length;
  return `best is ${best.co} (${best.match} match, ${salText(best)})${flags ? `, ${flags} carrying red flags 🚩` : ''}${ghosts ? `, ${ghosts} fossil 👻` : ''}.`;
}

/* ================= Deep hunt ================= */
async function runDeepHunt() {
  setDeep(false);
  openCanvas('act');
  $('#tabAct').hidden = false; $('#tabSrc').hidden = false;
  paneAct.innerHTML = ''; paneSrc.innerHTML = '';
  let srcCount = 0;

  await botThink(500);
  const card = botSay(`<div class="deep" id="deepCard">
      <div class="deep-head"><span class="sig">🔭</span><span style="flex:1"><b>Deep hunt</b><span class="st" id="deepSt">Warming up the boards…</span></span></div>
      <div class="deep-prog"><i id="deepBar"></i></div>
      <div class="deep-foot"><span id="deepMeta">0 sources · 0 steps</span><button id="deepView">View activity</button></div>
    </div>`);
  $('#deepView', card).addEventListener('click', () => openCanvas('act'));
  const bar = $('#deepBar', card), st = $('#deepSt', card), meta = $('#deepMeta', card);

  for (let i = 0; i < DEEP_STEPS.length; i++) {
    const [text, src] = DEEP_STEPS[i];
    const live = el(`<div class="act-li live"><span class="tk"><i></i></span><span>${text}</span><span class="tm">${i * 4 + 2}s</span></div>`);
    paneAct.appendChild(live);
    paneAct.scrollTop = paneAct.scrollHeight;
    st.textContent = text;
    bar.style.width = `${Math.round(((i + 1) / (DEEP_STEPS.length + 1)) * 100)}%`;
    await wait(900 + Math.random() * 700);
    live.classList.remove('live');
    live.querySelector('.tk').innerHTML = '✓';
    if (src && SOURCES[src]) {
      srcCount++;
      const [fv, note] = SOURCES[src];
      paneSrc.appendChild(el(`<div class="src-li"><span class="fv">${fv}</span><span><b>${src}</b><span>${note}</span></span><span class="ix">[${srcCount}]</span></div>`));
      $('#srcN').textContent = srcCount;
    }
    meta.textContent = `${srcCount} sources · ${i + 1} of ${DEEP_STEPS.length} steps`;
  }

  bar.style.width = '100%';
  card.querySelector('.deep').classList.add('done');
  card.querySelector('.sig').textContent = '✓';
  st.textContent = `Done in 38s · ${srcCount} sources · 8 roles ranked`;
  state.deepRan = true;
  state.sort = 'match';
  renderJobs();

  await wait(500);
  botSay(
    `<p>Eight roles survived — the market is better than your mood suggests. Papercrane wants a <b>Design Engineer</b> at ₹52–68L <button class="cite" data-src>1</button>, and their founder actually answers email. Mintleaf pays ₹45–60L fully remote with zero “hustle” mentions <button class="cite" data-src>2</button>.</p>
     <p>Warnings from the field: Glowfish says “family” three times <button class="cite" data-src>3</button>, Copperbeam wants a rockstar for ₹18L <button class="cite" data-src>5</button>, and Hexadecimal’s posting is officially a fossil — 247 days <button class="cite" data-src>4</button>.</p>
     <p>Everything’s ranked in the canvas. Say “pin the top two” and I’ll hold them. Or “remote only, above 40L” and watch the list obey.</p>`,
    { headline: 'The state of <em>your market.</em>' }
  );
  showToast('Deep hunt complete. 8 roles ranked in the canvas. ✨');
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-src]')) openCanvas('src');
});

/* ================= Composer ================= */
function setDeep(on) {
  state.deepMode = on;
  deepTog.setAttribute('aria-pressed', String(on));
  send.classList.toggle('deep-on', on);
  input.placeholder = on ? 'Deep hunt armed — describe the dream role and hit send…' : 'Ask Job Pilot for roles, filters, roasts…';
  $('#hint').textContent = on ? 'Deep hunt reads ~9 sources and takes about 40 seconds. Stretch your legs.' : 'Job Pilot can make mistakes. So can recruiters — at least ours are funny.';
}
deepTog.addEventListener('click', () => setDeep(!state.deepMode));
$('#filtersTog').addEventListener('click', () => {
  openCanvas('list');
  showToast('Filters live in the chat. Try: “remote only, above 40L”.');
});

send.addEventListener('click', () => { const v = input.value; input.value = ''; autosize(); handle(v || (state.deepMode ? 'Run a deep hunt' : 'Find me frontend roles')); });
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send.click(); }
});
function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 130) + 'px'; }
input.addEventListener('input', autosize);

document.addEventListener('click', e => {
  const z = e.target.closest('[data-say]');
  if (!z) return;
  if (z.dataset.say === 'deep') { setDeep(true); handle('Run a deep hunt'); }
  else handle(z.dataset.say);
});

/* ================= Chrome ================= */
const model = $('#model');
$('#modelBtn').addEventListener('click', () => {
  model.classList.toggle('open');
  $('#modelBtn').setAttribute('aria-expanded', String(model.classList.contains('open')));
});
document.addEventListener('click', e => { if (!model.contains(e.target)) model.classList.remove('open'); });
document.querySelectorAll('.model-opt').forEach(o => o.addEventListener('click', () => {
  document.querySelectorAll('.model-opt .tick').forEach(t => t.remove());
  o.querySelector('b').insertAdjacentHTML('beforeend', ' <span class="tick">✓</span>');
  $('#modelName').textContent = o.dataset.m === '5' ? '5' : o.dataset.m;
  model.classList.remove('open');
  showToast(o.dataset.m === 'mini' ? 'Mini mode: faster, cheaper, occasionally unhinged.' : o.dataset.m === 'pro' ? 'Pro mode: it applies while you sleep. Sweet dreams.' : 'Job Pilot 5: full power. Your future is being considered.');
}));

const side = $('#side'), hamb = $('#hamb');
function setDrawer(open) {
  side.classList.toggle('open', open);
  hamb.setAttribute('aria-expanded', String(open));
  if (open) $('#scrim').style.display = 'block';
  else if (app.classList.contains('no-canvas') || innerWidth > 1140) $('#scrim').style.display = '';
}
hamb.addEventListener('click', () => setDrawer(!side.classList.contains('open')));
$('#sideClose').addEventListener('click', () => setDrawer(false));
$('#newHunt').addEventListener('click', () => showToast('One hunt at a time. Finish grieving this one first. 🐐'));

let toastTimer;
function showToast(text, actionLabel, action) {
  clearTimeout(toastTimer);
  toast.innerHTML = `<span>${text}</span>${actionLabel ? `<button>${actionLabel}</button>` : ''}`;
  if (actionLabel) toast.querySelector('button').addEventListener('click', () => { action?.(); toast.classList.remove('show'); });
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

/* ================= Init ================= */
renderFilters();
renderJobs();
if (document.body.dataset.autostart === 'deep') {
  setDeep(true);
  setTimeout(() => handle('Run a deep hunt on senior frontend roles'), 600);
}
console.log('%c◆ Job Pilot — you checked the console. That is exactly the energy that gets people hired.', 'color:#F0439B;font-weight:600;font-size:12px');
