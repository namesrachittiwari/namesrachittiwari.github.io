/* Job Pilot app — chat drives the canvas. The chrome is ChatGPT; the soul is unemployed. */
'use strict';

/* ================= Data ================= */
const JOBS = [
  { id: 'papercrane', co: 'Papercrane', role: 'Design Engineer', match: 96, salMin: 52, salMax: 68,
    where: 'Hybrid · Bengaluru', remote: false, ghost: false, family: false, rockstar: false, salListed: true,
    tags: ['Design systems', 'React', 'Storybook'],
    note: 'Founder replies to email within a day. We tested it. Twice.' },
  { id: 'mintleaf', co: 'Mintleaf', role: 'Senior Frontend Engineer', match: 92, salMin: 45, salMax: 60,
    where: 'Remote · India', remote: true, ghost: false, family: false, rockstar: false, salListed: true,
    tags: ['React', 'TypeScript', 'Fintech'],
    note: 'Zero mentions of “hustle”. Suspiciously healthy.' },
  { id: 'snackbar', co: 'Snackbar', role: 'React Developer', match: 84, salMin: 38, salMax: 50,
    where: 'Remote · anywhere', remote: true, ghost: false, family: false, rockstar: false, salListed: true,
    tags: ['Next.js', '4-day week'],
    note: 'A real 4-day week, not the LinkedIn-post kind.' },
  { id: 'bunker', co: 'Bunker Labs', role: 'Frontend Architect', match: 81, salMin: 55, salMax: 75,
    where: 'Hybrid · Pune', remote: false, ghost: false, family: false, rockstar: false, salListed: true,
    tags: ['Vue', 'Micro-frontends'],
    note: '🚩 Says “fast-paced” twice — but pays like it means it.' },
  { id: 'lumen', co: 'Lumenware', role: 'UI Engineer', match: 78, salMin: 40, salMax: 52,
    where: 'Remote · IST overlap', remote: true, ghost: false, family: false, rockstar: false, salListed: true,
    tags: ['React', 'Data viz'],
    note: 'Recruiter replied in 3 hours. Frame this.' },
  { id: 'glowfish', co: 'Glowfish', role: 'Staff UI Engineer', match: 67, salMin: null, salMax: null,
    where: 'On-site · Gurugram', remote: false, ghost: false, family: true, rockstar: false, salListed: false,
    tags: ['Angular', 'Free snacks ×4'],
    note: '🚩🚩 “We’re a family” ×3. Bring a therapist to the interview.' },
  { id: 'hexadecimal', co: 'Hexadecimal', role: 'Frontend Ninja', match: 12, salMin: null, salMax: null,
    where: 'Posted 247 days ago', remote: true, ghost: true, family: false, rockstar: true, salListed: false,
    tags: ['👻 Ghost job'],
    note: '“Urgently hiring” since last Diwali. It’s a fossil.' },
  { id: 'copperbeam', co: 'Copperbeam', role: 'Frontend Rockstar', match: 44, salMin: 18, salMax: 24,
    where: 'On-site · Noida', remote: false, ghost: false, family: false, rockstar: true, salListed: true,
    tags: ['jQuery', '“Equity”'],
    note: '🚩 Wants a “rockstar” for ₹18L. The audacity is the perk.' },
];

/* ================= Comedy pools (varied so the 100th time still lands) ================= */
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const GREETINGS = [
  'Where should the money come from, Rachit?',
  'The boards refreshed themselves. You’re welcome.',
  'Day 47 of “just following up”. Let’s hunt instead.',
  'Recruiters rest. Job Pilot doesn’t.',
  'Your uncle “knows a guy”. I know 42 job boards. Your move.',
];
const THINKING = [
  'Reading the posting so you don’t have to…',
  'Counting the red flags…',
  'Translating HR into English…',
  'Checking if the salary is real…',
  'Cross-examining the word “family”…',
  'Carbon-dating the listing…',
];
const PLACEHOLDERS = [
  'Ask anything — roles, filters, roasts…',
  'Type “roast my resume” if you dare…',
  'Say “remote only” and watch the canvas obey…',
  'The recruiters aren’t going to ignore themselves…',
];
const HINTS = [
  'Job Pilot can make mistakes. Check important info. Especially salaries.',
  'No recruiters were harmed in this hunt. Emotionally? No promises.',
  'Every “quick call” is 45 minutes. Plan accordingly.',
  'Ghost jobs are hidden by default. Grief is opt-in.',
];
const NEW_HUNT = [
  'One hunt at a time. Finish grieving this one first.',
  'New hunt? This one isn’t even ghosted yet.',
  'Ambitious. Let’s land the current one before starting a sequel.',
];
const YEET_TOASTS = [
  null,
  'Two in a row. The void appreciates the consistency.',
  'Three yeets. Somewhere, an HR dashboard just flinched.',
  'Four. At this point it’s cardio.',
  'Five. You’re not filtering anymore, you’re performing.',
];
const GENERIC = [
  'Noted. Filed under “handle before Rachit’s next existential crisis”.',
  'Interesting. The 42 boards have no opinion, but I do: let’s get you paid.',
  'I hear you. Meanwhile, Papercrane’s recruiter is online right now. Just saying.',
];

const REPLIES = [
  [/roast.*resume|resume/i, [
    'Your resume lists “Microsoft Word” as a skill — in 2026 that’s not a skill, it’s a confession. Two date formats in one column, and an objective statement nobody has read since 2011. The actual work? Genuinely strong. Lead with the design system you shipped, delete the rest, and stop underselling yourself in Calibri.',
    'Roast, round two: your bullet points all start with “Worked on”. Buildings are “worked on”. You *shipped* things — say that. Also, “team player with attention to detail” appears twice, which is one kind of attention to detail, I suppose.',
  ]],
  [/why.*ghost|ghosted/i, [
    'Statistically: budget freeze (40%), CEO’s nephew (25%), the role never existed (20%), or your email lives in a folder called “later” that no recruiter has ever reopened (15%). None of these are about you. Want a follow-up with plausible deniability?',
    'You were ghosted because closure costs companies ₹0 and they still won’t pay it. My professional advice: one polite nudge, then we redirect that energy to the three roles in the canvas that actually deserve you.',
  ]],
  [/follow.?up|desperate/i, [
    'Drafted: “Hi Priya — following up on the Design Engineer role. Still very interested, happy to share the case study we discussed. If timelines shifted, no problem — a quick heads-up would be great.” Zero instances of “circling back”. Your dignity survives.',
    'Follow-up drafted with surgical politeness: interested but not desperate, warm but not clingy, and precisely one exclamation mark (zero). Send it Tuesday, 10:15 AM — statistically when recruiters feel the most guilt.',
  ]],
  [/translate|competitive/i, [
    'Translation service: “fast-paced” → understaffed. “Wear many hats” → three jobs, one salary. “Rockstar” → applause instead of money. “Like a family” → boundaries optional. “Competitive salary” → competitive for whom, they won’t say.',
  ]],
  [/cover.?letter/i, [
    'Draft: “Dear Hiring Manager — I have read the job description, which is already more than the last three applicants can say. I build frontends that load fast and don’t make designers cry. My greatest weakness is answering this question honestly. Available immediately; negotiable on everything except dignity.” Want it 20% more corporate?',
  ]],
  [/linkedin/i, [
    'LinkedIn is the only place where people congratulate each other for leaving each other. You need 12 minutes a day there, maximum. I’ll watch it so you can close the tab — that’s the whole product.',
  ]],
  [/interview|prep/i, [
    'Tuesday prep: “tell me about yourself” is 90 seconds, not your autobiography. Prepare one conflict story where you were mildly heroic. And when they ask “any questions?”, ask what happened to the last person in this role. Watch the face.',
  ]],
  [/salary|ask for|negotiat/i, [
    'Ask for ₹58L. You’ll feel sick saying it. Say it anyway. Worst case they say ₹52L, which was their plan all along. Never give your number first — “I’m flexible for the right role” is a complete sentence.',
    'Negotiation rule: the first person to say a number loses, and it will not be you. If they push, quote a range where your real target is the floor. Then stop talking. Silence is a salary strategy.',
  ]],
  [/what.*ghost job|ghost job\?/i, [
    'A ghost job is a posting that’s been “urgently hiring” for 8+ months — kept alive to look like growth, collect resumes, or scare the current team. I carbon-date every listing and bury the fossils so your cover letters go to the living.',
  ]],
  [/^(hi|hello|hey|yo)\b/i, [
    'Hi. The market waits for no one — want fresh listings, a roast, or emotional support? I do all three.',
  ]],
  [/thank/i, [
    'Don’t thank me yet. Thank me at the offer stage. Then again at the raise.',
  ]],
  [/help|what can you do/i, [
    'I find roles, filter them when you talk (“remote only”, “above 40L”, “hide ghost jobs”), pin the winners, roast resumes, draft follow-ups that aren’t desperate, and run deep hunts across 9 sources. I also provide commentary you didn’t ask for. Like this.',
  ]],
];

const DEEP_CORE = [
  ['Searching linkedin.com for senior frontend roles in India…', 'linkedin.com'],
  ['Checking glassdoor.com for “work-life balance” horror stories…', 'glassdoor.com'],
  ['Carbon-dating listings — hexadecimal.io has been “urgent” for 247 days…', 'hexadecimal.io'],
  ['Cross-referencing funding rounds on crunchbase.com…', 'crunchbase.com'],
  ['Estimating real salaries from levels.fyi. Some numbers hurt…', 'levels.fyi'],
  ['Reading founder tweets. Some things cannot be unread…', 'x.com'],
  ['Scanning wellfound.com — filtering “equity & vibes” compensation…', 'wellfound.com'],
];
const DEEP_FILLER = [
  ['Reading 312 postings. 41 are the same job wearing different hats…', null],
  ['Asking a founder why it says “like a family”. He said “exactly”…', null],
  ['Checking if “flexible hours” means flexible for you, or for them…', null],
  ['Deduplicating “Frontend Developer” from “Front-End Developer” from “Front End Dev”…', null],
  ['Skipping a posting that requires 10 years of experience in a 6-year-old framework…', null],
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

/* ================= State ================= */
const state = {
  filters: {},
  pinned: new Set(),
  applied: new Set(),
  yeeted: new Set(),
  sort: 'match',
  canvasOpen: false,
  deepMode: false,
  model: '5',
  view: 'cards',
  busy: false,
  yeetStreak: 0,
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 40) : ms));

/* ================= Elements ================= */
const app = $('#app'), feed = $('#feed'), chat = $('#chat'), work = $('#work');
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
  if (!b) return;
  const k = b.dataset.drop;
  dropFilter(k);
  if (k === 'ghost') hauntCanvas();
  botSay(pick([
    'Filter removed. Standards: adjusted downward. I don’t judge. (I judge a little.)',
    'Gone. The floodgates are open — may the odds be ever in your inbox.',
  ]));
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
function salText(j) { return j.salListed ? `₹${j.salMin}–${j.salMax}L` : '“Competitive” 🙄'; }

function jobCardHTML(j) {
  return `<article class="jcard ${state.pinned.has(j.id) ? 'pinned' : ''} ${j.ghost ? 'ghosty' : ''}" data-id="${j.id}">
    <div class="j-top">
      <span class="j-logo">${j.co[0]}</span>
      <span class="j-name"><b>${j.role}</b><span>${j.co} · ${j.where}</span></span>
      <span class="j-match" title="How much this role deserves you">${j.match}% match</span>
    </div>
    <div class="j-mid">
      <span class="j-sal">${salText(j)}</span>
      ${j.tags.map(t => `<span class="j-tag">${t}</span>`).join('')}
    </div>
    <p class="j-note">${j.note}</p>
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
      js.map(j => `<tr data-id="${j.id}"><td><span class="r">${state.pinned.has(j.id) ? '📌 ' : ''}${j.role}</span><span class="c">${j.co} · ${j.where}</span></td><td>${salText(j)}</td><td class="mm">${j.match}%</td><td><button class="jb pin ${state.pinned.has(j.id) ? 'did' : ''}" data-a="pin">📌</button></td></tr>`).join('')
    }</tbody></table>`;
  } else {
    paneList.innerHTML = js.map(jobCardHTML).join('');
  }
}

/* Tiny ✦ burst on Apply — under a second, skipped on reduced motion */
function sparkle(btn) {
  if (reduced) return;
  const host = btn.closest('.jcard') || btn.parentElement;
  host.style.position = 'relative';
  const r = btn.getBoundingClientRect(), h = host.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.textContent = '✦';
    s.style.left = (r.left - h.left + r.width / 2) + 'px';
    s.style.top = (r.top - h.top) + 'px';
    s.style.setProperty('--dx', (Math.random() * 70 - 35) + 'px');
    s.style.setProperty('--dy', (-20 - Math.random() * 40) + 'px');
    host.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}

/* A ghost drifts up when the fossil is un-hidden */
function hauntCanvas() {
  openCanvas('list');
  if (reduced) return;
  setTimeout(() => {
    const card = paneList.querySelector('.ghosty');
    if (!card) return;
    card.style.position = 'relative';
    const g = document.createElement('span');
    g.className = 'boo';
    g.textContent = '👻';
    card.appendChild(g);
    setTimeout(() => g.remove(), 1600);
  }, 350);
}

paneList.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const host = b.closest('[data-id]');
  const j = JOBS.find(x => x.id === host.dataset.id);

  if (b.dataset.a === 'pin') {
    state.pinned.has(j.id) ? state.pinned.delete(j.id) : state.pinned.add(j.id);
    renderJobs();
    const n = state.pinned.size;
    showToast(!state.pinned.has(j.id)
      ? `Unpinned ${j.co}. It never saw it coming.`
      : n >= 3
        ? `Pinned. That’s ${n} now — very attached for someone “keeping it casual”. 📌`
        : `Pinned ${j.co}. It floats to the top now. 📌`);
  }

  if (b.dataset.a === 'apply') {
    if (j.ghost) { showToast('You applied to a fossil. Archaeologists will find your cover letter. 👻'); return; }
    if (state.applied.has(j.id)) return;
    state.applied.add(j.id);
    sparkle(b);
    renderJobs();
    state.yeetStreak = 0;
    const live = visibleJobs().filter(x => !x.ghost);
    if (live.length && live.every(x => state.applied.has(x.id))) {
      showToast('That’s everything on the board. Impressive. Concerning, but impressive. 🫡');
    } else if (state.applied.size === 2) {
      showToast('Two applications. Momentum, or panic? Either works.');
    } else {
      showToast(`Applied to ${j.co}. Resume v14 deployed. 🫡`);
    }
  }

  if (b.dataset.a === 'yeet') {
    state.yeeted.add(j.id);
    state.yeetStreak++;
    const undo = () => { state.yeeted.delete(j.id); state.yeetStreak = 0; renderJobs(); };
    const card = host.classList.contains('jcard') ? host : null;
    if (card && !reduced) {
      card.classList.add('gone');
      setTimeout(renderJobs, 320);
    } else renderJobs();
    const streakLine = YEET_TOASTS[Math.min(state.yeetStreak, YEET_TOASTS.length) - 1];
    showToast(streakLine || `Yeeted ${j.co} into the void. The void says thanks.`, 'Undo', undo);
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
function clearZero() {
  work.classList.remove('zero');
  const h = $('#zeroH');
  if (h) h.remove();
}

function userSay(text) {
  clearZero();
  feed.appendChild(el(`<div class="m usr"><div class="bub">${escapeHtml(text)}</div></div>`));
  scrollDown();
}
function miniify(text) {
  if (state.model !== 'mini') return text;
  const first = text.split(/(?<=[.!?])\s/)[0];
  return `${first} — mini out. 🎤`;
}
function botSay(html, { headline, raw } = {}) {
  clearZero();
  const body = raw || html.startsWith('<') ? html : `<p>${miniify(html)}</p>`;
  const m = el(`<div class="m bot"><div class="bub">${headline ? `<p class="hl">${headline}</p>` : ''}${body}</div></div>`);
  feed.appendChild(m);
  scrollDown();
  rotateChrome();
  return m;
}
async function botThink(ms = 700) {
  clearZero();
  const t = el(`<div class="m bot"><div class="bub"><span class="typing"><i></i><i></i><i></i></span><span class="think-line">${pick(THINKING)}</span></div></div>`);
  feed.appendChild(t); scrollDown();
  const line = t.querySelector('.think-line');
  const cycler = setInterval(() => { line.textContent = pick(THINKING); }, 900);
  await wait(ms);
  clearInterval(cycler);
  t.remove();
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function rotateChrome() {
  input.placeholder = pick(PLACEHOLDERS);
  $('#hint').textContent = state.deepMode
    ? 'Deep hunt reads ~9 sources and takes about 40 seconds. Stretch your legs.'
    : pick(HINTS);
}

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
  else if (/show.*(ghost|fossil)/.test(lower)) { dropFilter('ghost'); hauntCanvas(); acts.push('Fine — the fossil is back. Hexadecimal has been “urgent” for 247 days. Manage your expectations.'); }
  if (/family/.test(lower) && /no|without|hide|filter|repel/.test(lower)) { addFilter('family', FILTER_DEFS.family.label, FILTER_DEFS.family.fn); acts.push('“We’re a family” companies filtered. Your therapist sends regards.'); }
  if (/rockstar|ninja/.test(lower) && /no|without|hide|filter/.test(lower)) { addFilter('rockstar', FILTER_DEFS.rockstar.label, FILTER_DEFS.rockstar.fn); acts.push('Rockstars and ninjas escorted out. This is a workplace.'); }
  if (/salary listed|has salary|with salary/.test(lower)) { addFilter('salary', FILTER_DEFS.salary.label, FILTER_DEFS.salary.fn); acts.push('“Competitive salary” cowards removed.'); }

  const under = lower.match(/under\s*₹?\s*(\d{2,3})\s*l?/);
  if (under) { const cap = +under[1]; addFilter('salMax', `💰 Under ₹${cap}L`, j => j.salListed && j.salMin <= cap); acts.push(`Capped at ₹${cap}L. Reasonable. Boring, but reasonable.`); }
  const above = lower.match(/(?:above|over|at least|\+)\s*₹?\s*(\d{2,3})\s*l|₹?(\d{2,3})\s*l\s*\+/);
  if (above) { const fl = +(above[1] || above[2]); addFilter('salMin', `💰 Above ₹${fl}L`, j => j.salListed && j.salMax >= fl); acts.push(`Floor set at ₹${fl}L. Know your worth. Then add 20%.`); }

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
    botSay(`<p>${miniify(acts.join(' '))}</p><p>${js.length} role${js.length === 1 ? '' : 's'} survive${js.length === 1 ? 's' : ''} in the canvas — ${summarize(js)}</p>`);
  } else if (wantsJobs) {
    openCanvas('list');
    await botThink(800);
    renderJobs();
    const js = visibleJobs();
    botSay(`<p>Canvas is up with ${js.length} roles from last night’s sweep — ${summarize(js)}</p><p>Talk to me to filter: “remote only”, “above 40L”, “hide ghost jobs”, “pin the top two”. The canvas obeys the chat.</p>`);
  } else {
    const hit = REPLIES.find(([re]) => re.test(t));
    await botThink(750);
    botSay(hit ? pick(hit[1]) : pick(GENERIC));
  }
  done();
  function done() { state.busy = false; send.disabled = false; input.focus(); }
}

function summarize(js) {
  if (!js.length) return 'technically. Your filters ate everything.';
  const best = js[0];
  const flags = js.filter(j => /🚩/.test(j.note)).length;
  const ghosts = js.filter(j => j.ghost).length;
  return `best is ${best.co} (${best.match} match, ${salText(best)})${flags ? `, ${flags} carrying red flags 🚩` : ''}${ghosts ? `, ${ghosts} fossil 👻` : ''}.`;
}

/* ================= Deep hunt ================= */
function deepSteps() {
  const fillers = [...DEEP_FILLER].sort(() => Math.random() - 0.5).slice(0, 3);
  const steps = [...DEEP_CORE];
  steps.splice(1, 0, fillers[0]);
  steps.splice(4, 0, fillers[1]);
  steps.splice(7, 0, fillers[2]);
  steps.push(['Ranking 8 finalists by match, money, and glassdoor trauma score…', null]);
  return steps;
}

async function runDeepHunt() {
  setDeep(false);
  openCanvas('act');
  $('#tabAct').hidden = false; $('#tabSrc').hidden = false;
  paneAct.innerHTML = ''; paneSrc.innerHTML = '';
  let srcCount = 0;
  const STEPS = deepSteps();

  await botThink(500);
  const card = botSay(`<div class="deep" id="deepCard">
      <div class="deep-head"><span class="sig">🔎</span><span style="flex:1"><b>Deep hunt</b><span class="st" id="deepSt">Warming up the boards…</span></span></div>
      <div class="deep-prog"><i id="deepBar"></i></div>
      <div class="deep-foot"><span id="deepMeta">0 sources · 0 steps</span><button id="deepView">View activity</button></div>
    </div>`, { raw: true });
  $('#deepView', card).addEventListener('click', () => openCanvas('act'));
  const bar = $('#deepBar', card), st = $('#deepSt', card), meta = $('#deepMeta', card);

  for (let i = 0; i < STEPS.length; i++) {
    const [text, src] = STEPS[i];
    const live = el(`<div class="act-li live"><span class="tk"><i></i></span><span>${text}</span><span class="tm">${i * 4 + 2}s</span></div>`);
    paneAct.appendChild(live);
    paneAct.scrollTop = paneAct.scrollHeight;
    st.textContent = text;
    bar.style.width = `${Math.round(((i + 1) / (STEPS.length + 1)) * 100)}%`;
    await wait(900 + Math.random() * 700);
    live.classList.remove('live');
    live.querySelector('.tk').innerHTML = '✓';
    if (src && SOURCES[src]) {
      srcCount++;
      const [fv, note] = SOURCES[src];
      paneSrc.appendChild(el(`<div class="src-li"><span class="fv">${fv}</span><span><b>${src}</b><span>${note}</span></span><span class="ix">[${srcCount}]</span></div>`));
      $('#srcN').textContent = srcCount;
    }
    meta.textContent = `${srcCount} sources · ${i + 1} of ${STEPS.length} steps`;
  }

  bar.style.width = '100%';
  card.querySelector('.deep').classList.add('done');
  card.querySelector('.sig').textContent = '✓';
  st.textContent = `Done in 38s · ${srcCount} sources · 8 roles ranked`;
  state.sort = 'match';
  renderJobs();

  await wait(500);
  botSay(
    `<p>Eight roles survived — the market is better than your mood suggests. Papercrane wants a <b>Design Engineer</b> at ₹52–68L <button class="cite" data-src>1</button>, and their founder actually answers email. Mintleaf pays ₹45–60L fully remote with zero “hustle” mentions <button class="cite" data-src>2</button>.</p>
     <p>Warnings from the field: Glowfish says “family” three times <button class="cite" data-src>3</button>, Copperbeam wants a rockstar for ₹18L <button class="cite" data-src>5</button>, and Hexadecimal’s posting is officially a fossil — 247 days <button class="cite" data-src>4</button>.</p>
     <p>Everything’s ranked in the canvas. Say “pin the top two” and I’ll hold them. Or “remote only, above 40L” and watch the list obey.</p>`,
    { headline: 'The state of your market', raw: true }
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
  input.placeholder = on ? 'Deep hunt armed — describe the dream role and hit send…' : pick(PLACEHOLDERS);
  $('#hint').textContent = on ? 'Deep hunt reads ~9 sources and takes about 40 seconds. Stretch your legs.' : pick(HINTS);
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
function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; }
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
  state.model = o.dataset.m;
  $('#modelName').textContent = o.dataset.m === '5' ? '5' : o.dataset.m;
  model.classList.remove('open');
  if (o.dataset.m === 'pro') {
    showToast('Pro mode: it applies while you sleep. Sweet dreams.');
    setTimeout(() => {
      const targets = visibleJobs().filter(j => !j.ghost && !state.applied.has(j.id)).slice(0, 2);
      if (!targets.length) return;
      targets.forEach(j => state.applied.add(j.id));
      renderJobs();
      openCanvas('list');
      showToast(`Pro auto-applied to ${targets.map(j => j.co).join(' and ')} while you were reading this. 🫡`);
    }, 2600);
  } else if (o.dataset.m === 'mini') {
    showToast('Mini mode: faster, cheaper, one sentence per thought.');
  } else {
    showToast('Job Pilot 5: full power. Your future is being considered.');
  }
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
$('#newHunt').addEventListener('click', () => {
  showToast(pick(NEW_HUNT) + ' …fine, follow me.');
  setTimeout(() => { location.href = 'create.html'; }, 1400);
});

let toastTimer;
function showToast(text, actionLabel, action) {
  clearTimeout(toastTimer);
  toast.innerHTML = `<span>${text}</span>${actionLabel ? `<button>${actionLabel}</button>` : ''}`;
  if (actionLabel) toast.querySelector('button').addEventListener('click', () => { action?.(); toast.classList.remove('show'); });
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

/* ================= Ambient jokes ================= */
const baseTitle = document.title;
document.addEventListener('visibilitychange', () => {
  document.title = document.hidden ? 'Come back. The jobs miss you.' : baseTitle;
});

/* ================= Init ================= */
const zh = $('#zeroH');
if (zh) zh.textContent = pick(GREETINGS);
rotateChrome();
renderFilters();
renderJobs();
const params = new URLSearchParams(location.search);
if (document.body.dataset.autostart === 'deep') {
  setDeep(true);
  setTimeout(() => handle('Run a deep hunt on senior frontend roles'), 600);
} else if (params.get('deep') === '1') {
  setDeep(true);
  setTimeout(() => handle(params.get('q') || 'Run a deep hunt'), 700);
} else if (params.get('q')) {
  setTimeout(() => handle(params.get('q')), 700);
}
console.log('%c◆ Job Pilot — you checked the console. That is exactly the energy that gets people hired.', 'font-weight:600;font-size:12px');
console.log('Tip: the ghost job filter is doing more work than most recruiters.');
