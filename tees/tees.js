/* Pokie Tees — storefront logic (v7 design).
 *
 * MOUNT CONTRACT: this file binds ONLY to [data-tees="…"] mounts —
 * screen, detail, popup, cart, toast, status, resume, cartbtn, count —
 * plus [data-nav] in the static nav. A reskin keeps those attributes
 * and this file is untouched.
 *
 * BACKEND: Google Apps Script (see backend/Code.gs + backend/SETUP.md).
 * POSTs go as text/plain JSON (no CORS preflight; Apps Script answers via a
 * 302 that fetch follows). With ENDPOINT empty the store still browses and
 * orders fall back to WhatsApp/email — that is the pre-setup state.
 */
'use strict';

var CONFIG = {
  ENDPOINT: '',            // Apps Script /exec URL — '' until SETUP.md §5
  SECRET: '',              // must match Script Properties SECRET
  WHATSAPP: '',            // owner's number, digits with country code ('' = mailto fallback only)
  EMAIL: 'rachittiwari10@gmail.com',
  FALLBACK_VPA: '',        // optional: lets the upi:// link work even in fallback mode
  PAYEE: 'Rachit Tiwari',
  AVAIL_TTL_MS: 60000,
  MIN_FILL_MS: 3000,
  FETCH_TIMEOUT_MS: 8000,
};

/* ---- catalogue (copy is final — verbatim from the design handoff) ---- */

var PRICE = 1490;
var SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
var SOLD_OUT_IDX = 8;                     // "Still Hunting" — the joke, kept
var FREE_SHIP_AT = 2500;
var SHIP_FEE = 79;
var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

var TEES = [
  { id: 'agent-01',  name: 'It Hunts',              sentence: 'It hunts. I decide.',                          collection: 'The agent',      origin: 'The whole product in four words. Printed the day Pokie made its first overnight run.' },
  { id: 'agent-02',  name: 'While You Slept',       sentence: 'Applied while you were sleeping.',             collection: 'The agent',      origin: 'What the morning summary actually says, most days.' },
  { id: 'agent-03',  name: 'Just Decided',          sentence: 'My agent applied. I just decided.',            collection: 'The agent',      origin: 'For the part of the process that should have been the only part.' },
  { id: 'agent-04',  name: 'Night Shift',           sentence: 'Nights are for hunting.',                      collection: 'The agent',      origin: 'Pokie works while the postings are fresh and nobody else is awake.' },
  { id: 'reject-01', name: 'On File',               sentence: 'We’ll keep your CV on file.',             collection: 'The rejections', origin: 'Nobody in recorded history has been contacted from the file.' },
  { id: 'reject-02', name: 'Strong Profile',        sentence: 'Strong profile. Moving forward with others.',  collection: 'The rejections', origin: 'Verbatim. That full stop is doing an enormous amount of work.' },
  { id: 'reject-03', name: 'Senior And Junior',     sentence: 'Too senior. Also too junior.',                 collection: 'The rejections', origin: 'Two rejections from the same company, eleven days apart.' },
  { id: 'reject-04', name: 'Algorithm',             sentence: 'Rejected by an algorithm. Hired by a human.',  collection: 'The rejections', origin: 'Both halves are true, which is exactly the problem.' },
  { id: 'hunt-01',   name: 'Still Hunting',         sentence: 'Still hunting.',                               collection: 'The hunt',       origin: 'The shortest line in the catalogue and the one people ask for most.' },
  { id: 'hunt-02',   name: 'No Nonsense',           sentence: 'Open to work. Not open to nonsense.',          collection: 'The hunt',       origin: 'A banner with a boundary.' },
  { id: 'hunt-03',   name: 'All Of It',             sentence: 'I read the JD. All of it.',                    collection: 'The hunt',       origin: 'Including the bit about being a rockstar who thrives in ambiguity.' },
  { id: 'hunt-04',   name: 'Between Opportunities', sentence: 'Between opportunities to be underpaid.',       collection: 'The hunt',       origin: 'Written at 2am, kept exactly as it was typed.' },
];

var SIDE_FILTERS = [
  { label: 'Classics',  key: 'The hunt' },
  { label: 'Overnight', key: 'The agent' },
  { label: 'Rejected',  key: 'The rejections' },
];

var MAT_COPY = '240 GSM cotton, black until proven otherwise. White ink, one colour. Wash inside out, cold — the print will outlive most employment. Do not iron the joke.';
var FIT_COPY = 'Oversized, drop shoulder, true to size. Fits like you have somewhere to be. Between sizes? Size up — it reads as confidence.';

/* ---- state ---- */

var S = {
  screen: 'shop', filter: 'All',
  detail: -1, arch: -1, matOpen: false, fitOpen: false, size: 'M',
  cart: [], cartOpen: false,
  text: '', studioSize: 'M',
  phase: 'form',                 // checkout: form | pay | placed | fallback
  deliveryMode: 'hostel', pay: 'upi',
  form: { name: '', room: '', addr: '', city: '', pin: '', phone: '' },
  orderId: '', payment: null, serverTotal: 0, claimed: false, err: '',
};

var avail = null;
var loadedAt = Date.now();
var toastT = null;
var IS_SELF = /[?&]self=1/.test(location.search);

var $m = function (k) { return document.querySelector('[data-tees="' + k + '"]'); };
var el = {
  screen: $m('screen'), detail: $m('detail'), popup: $m('popup'), cart: $m('cart'),
  toast: $m('toast'), status: $m('status'), resume: $m('resume'),
  cartbtn: $m('cartbtn'), count: $m('count'),
};

var fmt = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };
var sizeFor = function (s) { var l = (s || '').length; return l > 38 ? '8.4cqw' : l > 28 ? '9.6cqw' : l > 18 ? '11.5cqw' : '14cqw'; };

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function short(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

/* ---- availability (real stock beats the joke; joke survives offline) ---- */

function fetchAvailability() {
  if (!CONFIG.ENDPOINT) { setStatus(''); return; }
  var cached = readCache();
  if (cached && Date.now() - cached.at < CONFIG.AVAIL_TTL_MS) { avail = cached.data; render(); return; }
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, CONFIG.FETCH_TIMEOUT_MS);
  fetch(CONFIG.ENDPOINT, { signal: ctrl.signal })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      clearTimeout(timer);
      if (!data || !data.ok) throw new Error('bad payload');
      try { localStorage.setItem('tees.avail', JSON.stringify({ at: Date.now(), data: data })); } catch (e) {}
      avail = data; setStatus(''); render();
    })
    .catch(function () {
      clearTimeout(timer);
      if (cached) { avail = cached.data; render(); return; }
      setStatus('live stock unavailable — sold-out tees will bounce at checkout');
    });
}
function readCache() {
  try { return JSON.parse(localStorage.getItem('tees.avail') || 'null'); } catch (e) { return null; }
}
function setStatus(msg) {
  if (!el.status) return;
  el.status.textContent = msg || '';
  el.status.className = 'strip' + (msg ? ' on' : '');
}

function stockFor(id) { return (avail && avail.stock && avail.stock[id]) || null; }
function priceFor(t) { var s = stockFor(t.id); return s && s.price > 0 ? s.price : PRICE; }
function sizeCount(t, z) {
  var s = stockFor(t.id);
  if (!s || !s.sizes) return null;          // unknown → treat as in stock
  return Number(s.sizes[z] || 0);
}
function isSold(t, i) {
  var s = stockFor(t.id);
  if (s && s.sizes) return SIZES.every(function (z) { return !(Number(s.sizes[z]) > 0); });
  return i === SOLD_OUT_IDX;                // offline: only the joke is sold out
}
function customPrice() { var s = stockFor('custom-line'); return s && s.price > 0 ? s.price : PRICE; }

/* ---- tee visual (shared fragment) ---- */

function teeVisual(sentence, opts) {
  opts = opts || {};
  var cls = 'tee-visual' + (opts.flip ? ' flip' : '') + (opts.contain ? ' contain' : '');
  var fd = opts.delay ? ' style="--fd:' + opts.delay + '"' : '';
  return '<div class="' + cls + '"' + fd + '>' +
    '<img class="front" src="assets/tee-clean-front.png" alt="" draggable="false">' +
    (opts.flip ? '<img class="back" src="assets/tee-clean-back.png" alt="" draggable="false">' : '') +
    '<div class="zone"><div class="print" style="font-size:' + sizeFor(sentence) + '">' + esc(sentence) + '</div></div>' +
    '</div>';
}

/* ---- render plumbing ---- */

function set(patch) { Object.keys(patch).forEach(function (k) { S[k] = patch[k]; }); render(); }

function goScreen(scr) {
  S.screen = scr; S.cartOpen = false; S.detail = -1; S.arch = -1; S.err = '';
  if (scr === 'checkout' && S.phase === 'placed') { /* keep placed until user leaves */ }
  else if (scr !== 'checkout') S.phase = 'form';
  render();
  window.scrollTo(0, 0);
}

function render() { renderNav(); renderScreen(); renderDetail(); renderPopup(); renderCart(); }

/* overlay re-render: skip if unchanged; suppress entry animation unless newly opened */
function finishOverlay(mount, html, memoKey, wasOpen, rootSel) {
  if (wasOpen && html === last[memoKey]) return 'skip';
  last[memoKey] = html;
  mount.innerHTML = html;
  if (wasOpen) {
    var root = mount.querySelector(rootSel);
    if (root) root.classList.add('noanim');
  }
}

function renderNav() {
  document.querySelectorAll('.nav-link[data-nav]').forEach(function (b) {
    b.classList.toggle('active', S.screen === b.getAttribute('data-nav'));
  });
  if (el.count) el.count.textContent = S.cart.reduce(function (a, c) { return a + c.qty; }, 0);
}

function say(msg) {
  S.toastMsg = msg;
  el.toast.innerHTML = msg ? '<div class="toast">' + esc(msg) + '</div>' : '';
  clearTimeout(toastT);
  if (msg) toastT = setTimeout(function () { el.toast.innerHTML = ''; }, 2400);
}

/* ---- screens ---- */

var last = { screenKey: '', screenHTML: '', detail: -1, arch: -1, cartOpen: false, detailHTML: '', popupHTML: '', cartHTML: '' };

function renderScreen() {
  var h = '';
  if (S.screen === 'shop') h = shopHTML();
  else if (S.screen === 'archive') h = archiveHTML();
  else if (S.screen === 'studio') h = studioHTML();
  else if (S.screen === 'checkout') h = checkoutHTML();
  var key = S.screen + '|' + S.phase;
  var fresh = key !== last.screenKey;               // real navigation → animate in
  if (!fresh && h === last.screenHTML) return;      // nothing changed → keep DOM (and animations) alive
  last.screenKey = key; last.screenHTML = h;
  var ns = el.screen.querySelector('noscript');
  el.screen.innerHTML = h;
  if (ns) el.screen.appendChild(ns);
  if (!fresh) {
    var root = el.screen.querySelector('.screen');
    if (root) root.classList.add('noanim');         // in-place update → no entry replay
  }
  wireScreen();
}

function shopHTML() {
  var side = SIDE_FILTERS.map(function (f) {
    return '<button type="button" class="side-link' + (S.filter === f.key ? ' active' : '') + '" data-filter="' + esc(f.key) + '">' + esc(f.label) + '</button>';
  }).join('');
  var tiles = TEES.map(function (t, i) { return { t: t, i: i }; })
    .filter(function (x) { return S.filter === 'All' || x.t.collection === S.filter; })
    .map(function (x) {
      var t = x.t, i = x.i;
      var delay = (-((i * 1.37 + (i % 5) * 0.61) % 3.6)).toFixed(2) + 's';
      var sold = isSold(t, i);
      return '<button type="button" class="tile" data-open="' + i + '">' +
        teeVisual(t.sentence, { flip: true, delay: delay }) +
        '<span class="tile-name">' + esc(t.name) + '</span>' +
        '<span class="tile-price">' + (sold ? 'Out of stock' : fmt(priceFor(t))) + '</span>' +
        '</button>';
    }).join('');
  return '<div class="screen shop">' +
    '<div class="side">' + side +
    '<div class="side-gap"></div>' +
    '<button type="button" class="side-link all' + (S.filter === 'All' ? ' active' : '') + '" data-filter="All">Shop all</button>' +
    '<div class="side-gap"></div>' +
    '<button type="button" class="side-link print-yours" data-goto="studio">Print yours →</button>' +
    '</div>' +
    '<div class="grid">' + tiles + '</div>' +
    '</div>';
}

function archiveHTML() {
  var tiles = TEES.map(function (t, i) {
    var delay = (-((i * 2.11 + (i % 4) * 0.47) % 3.6)).toFixed(2) + 's';
    return '<button type="button" class="arch-tile" data-arch="' + i + '">' +
      teeVisual(t.sentence, { flip: true, delay: delay }) +
      '</button>';
  }).join('');
  return '<div class="screen arch">' +
    '<div class="arch-head">' +
    '<span class="l">Archive — every run that filled and closed</span>' +
    '<span class="r">Click one. It won’t come back.</span>' +
    '</div>' +
    '<div class="arch-grid">' + tiles + '</div>' +
    '</div>';
}

function studioHTML() {
  var text = S.text.trim();
  var printText = text || 'your line goes here';
  var sizes = SIZES.map(function (z) {
    return '<button type="button" class="st-size' + (S.studioSize === z ? ' sel' : '') + '" data-stsize="' + z + '">' + z + '</button>';
  }).join('');
  return '<div class="screen studio">' +
    '<h2 class="st-h">Write your own.</h2>' +
    '<p class="st-sub">One line. White ink. We print it, you wear it.</p>' +
    '<div class="st-grid">' +
    '<div class="st-preview">' +
    '<img src="assets/tee-clean-front.png" alt="" draggable="false">' +
    '<div class="print-area"><span class="tag">Print area</span>' +
    '<div class="inset"><div class="print" data-st="print" style="font-size:' + sizeFor(printText) + '">' + esc(printText) + '</div></div>' +
    '</div></div>' +
    '<div class="st-side">' +
    '<textarea class="st-text" data-st="text" rows="3" maxlength="60" placeholder="One breath long. Readable from six feet.">' + esc(S.text) + '</textarea>' +
    '<div class="st-notes"><span class="st-note" data-st="note">' + esc(charNote(text.length)) + '</span>' +
    '<span class="st-count"><span data-st="count">' + text.length + '</span>/60</span></div>' +
    '<div class="st-sizes">' + sizes + '</div>' +
    '<div><button type="button" class="st-cta" data-act="add-custom">' +
    (text ? 'Put it on a shirt · ' + fmt(customPrice()) : 'Type something first') +
    '</button></div>' +
    '</div></div></div>';
}

function charNote(n) {
  return n === 0 ? 'Blank shirts are a cry for help.'
    : n < 12 ? 'Short. Confident. Suspicious.'
    : n < 30 ? 'That’s a tee. That’s exactly a tee.'
    : n < 48 ? 'Getting wordy. People read for one second.'
    : 'This is a paragraph. Nobody squints at a stranger’s chest.';
}

/* ---- checkout (form → pay → placed, or fallback) ---- */

function cartSub() { return S.cart.reduce(function (a, c) { return a + c.qty * c.price; }, 0); }
function shipFee(sub) { return S.deliveryMode === 'ship' ? (sub >= FREE_SHIP_AT ? 0 : SHIP_FEE) : 0; }

function checkoutHTML() {
  if (S.phase === 'pay') return payHTML();
  if (S.phase === 'placed') return placedHTML();
  if (S.phase === 'fallback') return fallbackHTML();
  var sub = cartSub();
  var ship = shipFee(sub);

  var delivery = [
    { key: 'hostel', label: 'Hostel hand-delivery', note: 'I bring it to your room. Free.' },
    { key: 'ship', label: 'Ship it', note: sub >= FREE_SHIP_AT ? 'courier, free over ' + fmt(FREE_SHIP_AT) : 'courier, ' + fmt(SHIP_FEE) + ' under ' + fmt(FREE_SHIP_AT) },
  ].map(function (d) {
    return '<button type="button" class="radio-row' + (S.deliveryMode === d.key ? ' sel' : '') + '" data-dm="' + d.key + '">' +
      '<span class="radio-dot"></span><span class="radio-lab">' + esc(d.label) + '</span><span class="radio-note">' + esc(d.note) + '</span></button>';
  }).join('');

  var fields = (S.deliveryMode === 'hostel'
    ? [
      { key: 'name', label: 'Name (the one on the doorbell)', ph: 'Rachit T.' },
      { key: 'room', label: 'Hostel / room', ph: 'H4-212' },
      { key: 'phone', label: 'Phone (for the delivery guy’s one call)', ph: '98••••••••' },
    ]
    : [
      { key: 'name', label: 'Name (the one on the doorbell)', ph: 'Rachit T.' },
      { key: 'addr', label: 'Where should this land?', ph: 'Flat, street, the landmark you always use' },
      { key: 'city', label: 'City', ph: 'Bengaluru' },
      { key: 'pin', label: 'PIN code', ph: '560001' },
      { key: 'phone', label: 'Phone (for the delivery guy’s one call)', ph: '98••••••••' },
    ]).map(function (f) {
    return '<label class="field"><span class="lab">' + esc(f.label) + '</span>' +
      '<input data-f="' + f.key + '" value="' + esc(S.form[f.key]) + '" placeholder="' + esc(f.ph) + '"></label>';
  }).join('');

  var codOff = S.deliveryMode !== 'hostel';
  var pays = [
    { key: 'upi', label: 'UPI', note: 'the national sport', off: false },
    { key: 'card', label: 'Card', note: 'feels formal — machine’s in the shop', off: true },
    { key: 'cod', label: 'Cash on delivery', note: codOff ? 'hostel hand-delivery only' : 'a trust exercise', off: codOff },
  ].map(function (p) {
    return '<button type="button" class="radio-row' + (S.pay === p.key && !p.off ? ' sel' : '') + (p.off ? ' off' : '') + '"' +
      (p.off ? '' : ' data-pm="' + p.key + '"') + '>' +
      '<span class="radio-dot"></span><span class="radio-lab">' + esc(p.label) + '</span><span class="radio-note">' + esc(p.note) + '</span></button>';
  }).join('');

  var totals =
    '<div class="trow"><span>Subtotal</span><span class="v">' + fmt(sub) + '</span></div>' +
    '<div class="trow"><span>' + (ship === 0 ? 'Shipping (free)' : 'Shipping') + '</span><span class="v">' + (ship === 0 ? '₹0' : fmt(ship)) + '</span></div>' +
    '<div class="trow grand"><span>Total</span><span class="v">' + fmt(sub + ship) + '</span></div>';

  var btnLabel = sub === 0 ? 'Nothing to pay for'
    : S.pay === 'cod' ? 'Place order · ' + fmt(sub + ship)
    : 'Pay ' + fmt(sub + ship);

  return '<div class="screen co">' +
    '<span class="eyebrow">Checkout</span>' +
    '<form class="co-form" data-act="place">' +
    '<div class="radio-group">' + delivery + '</div>' +
    fields +
    '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
    '<div class="radio-group">' + pays + '</div>' +
    '<div class="totals">' + totals + '</div>' +
    '<div class="co-err">' + esc(S.err) + '</div>' +
    '<button type="submit" class="pay-btn">' + esc(btnLabel) + '</button>' +
    '</form></div>';
}

function payHTML() {
  var vpa = (S.payment && S.payment.vpa) || CONFIG.FALLBACK_VPA;
  var payee = (S.payment && S.payment.payee) || CONFIG.PAYEE;
  var total = S.serverTotal;
  var link = vpa ? upiLink(vpa, payee, total, S.orderId) : '';
  return '<div class="screen co">' +
    '<span class="eyebrow">Payment — order ' + esc(S.orderId) + '</span>' +
    '<div class="pay-panel">' +
    '<div class="pay-amt">' + fmt(total) + '</div>' +
    '<img src="assets/upi-qr.png" alt="UPI QR code" width="200" height="200">' +
    (link ? '<a class="upi-btn" href="' + link + '">Pay in UPI app</a>' : '') +
    '<div class="pay-hint">Scan the QR, or tap the button on your phone. Put <b>' + esc(S.orderId) + '</b> in the payment note if you can.</div>' +
    '</div>' +
    '<div class="co-form">' +
    '<label class="field"><span class="lab">After paying: UPI reference (12-digit UTR, or last 4 digits)</span>' +
    '<input data-f="utr" inputmode="numeric" maxlength="20" placeholder="4225 1234 5678"></label>' +
    '<div class="co-err">' + esc(S.err) + '</div>' +
    '<button type="button" class="pay-btn" data-act="claim">I’ve paid — submit reference</button>' +
    '<button type="button" class="ghost-btn" data-act="skip-claim">I’ll send the reference later</button>' +
    '</div></div>';
}

function placedHTML() {
  var note = S.pay === 'cod'
    ? 'Keep cash near the door and your dignity intact. We’ll email once it ships.'
    : 'You’ll get exactly one email when it ships, and none of the ones you’re dreading.';
  var sub = S.pay === 'cod' ? ''
    : S.claimed
      ? 'Your payment gets a manual once-over in my UPI app before printing.'
      : 'Send the payment reference when you have it — the strip at the top of the shop brings you back here.';
  return '<div class="screen co"><div class="placed">' +
    '<span class="eyebrow">Order ' + esc(S.orderId) + '</span>' +
    '<h2>It’s happening.</h2>' +
    '<p class="note">' + esc(note) + '</p>' +
    (sub ? '<p class="sub">' + esc(sub) + '</p>' : '') +
    '<div class="row"><button type="button" class="back-btn" data-goto="shop">Back to the shop</button></div>' +
    '</div></div>';
}

function fallbackHTML() {
  var summary = orderSummaryText();
  var wa = CONFIG.WHATSAPP ? 'https://wa.me/' + CONFIG.WHATSAPP + '?text=' + encodeURIComponent(summary) : '';
  var mail = 'mailto:' + CONFIG.EMAIL + '?subject=' + encodeURIComponent('Tee order ' + S.orderId) +
    '&body=' + encodeURIComponent(summary);
  return '<div class="screen co">' +
    '<span class="eyebrow">Almost there</span>' +
    '<div class="fb">' +
    '<p>The order server didn’t answer, but nothing is lost — send this order in one tap and I’ll take it from there:</p>' +
    '<div class="fb-sum">' + esc(summary) + '</div>' +
    (wa ? '<a class="fb-btn" href="' + wa + '" target="_blank" rel="noopener">Send on WhatsApp</a>' : '') +
    '<a class="fb-btn' + (wa ? ' ghost' : '') + '" href="' + mail + '">Send by email</a>' +
    '<button type="button" class="fb-btn ghost" data-act="back-to-form">Back</button>' +
    '</div></div>';
}

function orderSummaryText() {
  var lines = S.cart.map(function (c) {
    return c.qty + '× ' + (c.custom ? 'CUSTOM “' + c.sentence + '”' : c.name) + ' (' + c.size + ')';
  }).join(', ');
  var sub = cartSub(); var ship = shipFee(sub);
  return 'Tee order ' + S.orderId + ' — ' + lines +
    ' — ' + S.form.name +
    (S.deliveryMode === 'hostel'
      ? (S.form.room ? ', ' + S.form.room : '')
      : ' — ship to: ' + S.form.addr + ', ' + S.form.city + ' ' + S.form.pin) +
    (S.form.phone ? ' — ' + S.form.phone : '') +
    ' — ' + (S.pay === 'cod' ? 'COD' : 'UPI') +
    ' — total ' + fmt(sub + ship);
}

/* ---- overlays ---- */

function renderDetail() {
  if (S.detail < 0) { el.detail.innerHTML = ''; last.detail = -1; last.detailHTML = ''; return; }
  var t = TEES[S.detail];
  var sold = isSold(t, S.detail);
  var sizes = SIZES.map(function (z) {
    var n = sizeCount(t, z);
    var dead = sold || n === 0;
    return '<button type="button" class="size-btn' + (dead ? ' dead' : S.size === z ? ' sel' : '') + '"' +
      (dead ? '' : ' data-size="' + z + '"') + '>' + z + '</button>';
  }).join('');
  var h =
    '<div class="detail">' +
    '<button type="button" class="d-close" data-act="close-detail" aria-label="Close">✕</button>' +
    '<div class="d-grid">' +
    '<div class="d-stage"><div class="d-float">' + teeVisual(t.sentence, { flip: true }) + '</div></div>' +
    '<div class="d-info">' +
    '<h1 class="d-name">' + esc(t.name) + '</h1>' +
    '<span class="d-price">' + fmt(priceFor(t)) + '</span>' +
    '<p class="d-desc">' + esc(t.origin) + ' Black tee, white ink, printed only when the run fills.</p>' +
    '<div class="d-sizes">' + sizes + '</div>' +
    '<div class="d-cta-row"><button type="button" class="d-cta' + (sold ? ' dead' : '') + '" data-act="add-detail">' +
    (sold ? 'Out of stock (relatable)' : 'Take it · ' + fmt(priceFor(t))) + '</button></div>' +
    '<div class="accs">' +
    '<button type="button" class="acc-btn" data-act="toggle-mat"><span class="acc-title">Materials &amp; Care</span><span class="acc-sign">' + (S.matOpen ? '−' : '+') + '</span></button>' +
    (S.matOpen ? '<p class="acc-body">' + esc(MAT_COPY) + '</p>' : '') +
    '<div class="acc-rule"></div>' +
    '<button type="button" class="acc-btn" data-act="toggle-fit"><span class="acc-title">Size &amp; Fit</span><span class="acc-sign">' + (S.fitOpen ? '−' : '+') + '</span></button>' +
    (S.fitOpen ? '<p class="acc-body">' + esc(FIT_COPY) + '</p>' : '') +
    '<div class="acc-rule"></div>' +
    '</div></div></div></div>';
  var skipped = finishOverlay(el.detail, h, 'detailHTML', last.detail === S.detail, '.detail');
  last.detail = S.detail;
  if (skipped === 'skip') return;                   // DOM untouched → listeners already attached
  wireDetail();
}

function renderPopup() {
  if (S.arch < 0) { el.popup.innerHTML = ''; last.arch = -1; last.popupHTML = ''; return; }
  var t = TEES[S.arch];
  var h =
    '<div class="pop-back" data-act="close-arch">' +
    '<div class="pop-win" data-stop>' +
    '<div class="pop-bar"><span class="pop-title">' + esc(t.name) + '</span>' +
    '<button type="button" class="pop-x" data-act="close-arch">✕</button></div>' +
    '<div class="pop-body">' +
    '<div class="pop-screen">' + teeVisual(t.sentence, { flip: true, contain: true }) + '</div>' +
    '<p class="pop-cap">RELEASED ' + MONTHS[S.arch % 12] + ' 2026 [ARCHIVED]</p>' +
    '<p class="pop-origin">' + esc(t.origin) + '</p>' +
    '</div></div></div>';
  var skipped = finishOverlay(el.popup, h, 'popupHTML', last.arch === S.arch, '.pop-back');
  last.arch = S.arch;
  if (skipped === 'skip') return;
  wirePopup();
}

function renderCart() {
  if (!S.cartOpen) { el.cart.innerHTML = ''; last.cartOpen = false; last.cartHTML = ''; return; }
  var sub = cartSub();
  var rows;
  if (!S.cart.length) {
    rows = '<div class="cart-empty"><p class="t">Nothing in here</p>' +
      '<p class="s">Your torso is currently unemployed.</p>' +
      '<button type="button" class="fix" data-goto="shop">Fix that</button></div>';
  } else {
    rows = S.cart.map(function (c, i) {
      return '<div class="c-row">' +
        '<div class="c-thumb"><img src="assets/tee-clean-front.png" alt="" draggable="false">' +
        '<div class="zone"><div class="print" style="font-size:' + sizeFor(c.sentence) + '">' + esc(c.sentence) + '</div></div></div>' +
        '<div class="c-mid">' +
        '<span class="c-name">' + esc(c.name) + '</span>' +
        '<span class="c-meta">' + esc(c.meta) + '</span>' +
        '<div class="stepper"><button type="button" data-qty="-1" data-i="' + i + '">−</button>' +
        '<span class="n">' + c.qty + '</span>' +
        '<button type="button" data-qty="1" data-i="' + i + '">+</button></div>' +
        '</div>' +
        '<span class="c-line">' + fmt(c.qty * c.price) + '</span>' +
        '</div>';
    }).join('');
  }
  var foot = S.cart.length
    ? '<div class="cart-foot">' +
      '<div class="sub-row"><span>Subtotal</span><span class="v">' + fmt(sub) + '</span></div>' +
      '<p class="ship-joke">' + (sub >= FREE_SHIP_AT
        ? 'Shipping’s free. Don’t make it weird.'
        : '₹79 to move it across the country. Add one more and it’s free.') + '</p>' +
      '<button type="button" class="co-btn" data-act="to-checkout">Checkout</button></div>'
    : '';
  var h =
    '<div class="cart-back" data-act="close-cart">' +
    '<div class="cart-panel" data-stop role="dialog" aria-modal="true" aria-label="Shopping cart">' +
    '<div class="cart-head"><span class="cart-title">Shopping cart</span>' +
    '<button type="button" class="cart-x" data-act="close-cart" aria-label="Close cart">✕</button></div>' +
    '<div class="cart-body">' + rows + '</div>' + foot +
    '</div></div>';
  var skipped = finishOverlay(el.cart, h, 'cartHTML', last.cartOpen === true, '.cart-back');
  last.cartOpen = true;
  if (skipped === 'skip') return;
  wireCart();
}

/* ---- cart ops ---- */

function addToCart(item) {
  var at = -1;
  S.cart.forEach(function (c, i) { if (c.key === item.key) at = i; });
  if (at > -1) {
    if (S.cart[at].qty >= 5) { say('Five per line is plenty — ping me for bulk.'); return; }
    S.cart[at].qty += 1;
  } else {
    item.qty = 1;
    S.cart.push(item);
  }
  say(item.custom ? 'Your line is in the bag.' : 'In the bag. Bold choice.');
  render();
}

function bumpQty(i, d) {
  var c = S.cart[i];
  if (!c) return;
  c.qty = Math.min(5, c.qty + d);
  if (c.qty <= 0) S.cart.splice(i, 1);
  render();
}

/* ---- wiring ---- */

function wireScreen() {
  el.screen.querySelectorAll('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () { set({ filter: b.getAttribute('data-filter') }); });
  });
  el.screen.querySelectorAll('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function () { goScreen(b.getAttribute('data-goto')); });
  });
  el.screen.querySelectorAll('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      set({ detail: Number(b.getAttribute('data-open')), matOpen: false, fitOpen: false });
    });
  });
  el.screen.querySelectorAll('[data-arch]').forEach(function (b) {
    b.addEventListener('click', function () { set({ arch: Number(b.getAttribute('data-arch')) }); });
  });

  /* studio: targeted updates so the textarea keeps focus */
  var ta = el.screen.querySelector('[data-st="text"]');
  if (ta) {
    ta.addEventListener('input', function () {
      S.text = ta.value.slice(0, 60);
      var text = S.text.trim();
      var printText = text || 'your line goes here';
      var p = el.screen.querySelector('[data-st="print"]');
      if (p) { p.textContent = printText; p.style.fontSize = sizeFor(printText); }
      var n = el.screen.querySelector('[data-st="note"]');
      if (n) n.textContent = charNote(text.length);
      var c = el.screen.querySelector('[data-st="count"]');
      if (c) c.textContent = text.length;
      var cta = el.screen.querySelector('[data-act="add-custom"]');
      if (cta) cta.textContent = text ? 'Put it on a shirt · ' + fmt(customPrice()) : 'Type something first';
    });
  }
  el.screen.querySelectorAll('[data-stsize]').forEach(function (b) {
    b.addEventListener('click', function () { set({ studioSize: b.getAttribute('data-stsize') }); });
  });
  var addC = el.screen.querySelector('[data-act="add-custom"]');
  if (addC) addC.addEventListener('click', function () {
    var text = S.text.trim();
    if (!text) { say('Empty shirt. Bold, but no.'); return; }
    addToCart({
      key: 'custom:' + text + ':' + S.studioSize, custom: true,
      name: 'Your line', meta: text + ' · ' + S.studioSize,
      sentence: text, size: S.studioSize, price: customPrice(),
    });
  });

  /* checkout form */
  el.screen.querySelectorAll('[data-dm]').forEach(function (b) {
    b.addEventListener('click', function () {
      var dm = b.getAttribute('data-dm');
      if (dm !== 'hostel' && S.pay === 'cod') S.pay = 'upi';
      set({ deliveryMode: dm, err: '' });
    });
  });
  el.screen.querySelectorAll('[data-pm]').forEach(function (b) {
    b.addEventListener('click', function () { set({ pay: b.getAttribute('data-pm'), err: '' }); });
  });
  el.screen.querySelectorAll('[data-f]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var k = inp.getAttribute('data-f');
      if (k !== 'utr') S.form[k] = inp.value;
    });
  });
  var form = el.screen.querySelector('form[data-act="place"]');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); placeOrder(); });

  el.screen.querySelectorAll('[data-act="claim"]').forEach(function (b) { b.addEventListener('click', submitClaim); });
  el.screen.querySelectorAll('[data-act="skip-claim"]').forEach(function (b) {
    b.addEventListener('click', function () { persistPending(); set({ phase: 'placed', claimed: false }); });
  });
  el.screen.querySelectorAll('[data-act="back-to-form"]').forEach(function (b) {
    b.addEventListener('click', function () { set({ phase: 'form', err: '' }); });
  });
}

function wireDetail() {
  el.detail.querySelectorAll('[data-act="close-detail"]').forEach(function (b) {
    b.addEventListener('click', function () { set({ detail: -1 }); });
  });
  el.detail.querySelectorAll('.size-btn[data-size]').forEach(function (b) {
    b.addEventListener('click', function () { set({ size: b.getAttribute('data-size') }); });
  });
  var mat = el.detail.querySelector('[data-act="toggle-mat"]');
  if (mat) mat.addEventListener('click', function () { set({ matOpen: !S.matOpen }); });
  var fit = el.detail.querySelector('[data-act="toggle-fit"]');
  if (fit) fit.addEventListener('click', function () { set({ fitOpen: !S.fitOpen }); });
  var add = el.detail.querySelector('[data-act="add-detail"]');
  if (add) add.addEventListener('click', function () {
    var t = TEES[S.detail];
    if (isSold(t, S.detail)) { say('Gone. Like the roles you were perfect for.'); return; }
    if (sizeCount(t, S.size) === 0) { say('That size just went. Pick another.'); return; }
    addToCart({
      key: t.id + ':' + S.size, id: t.id,
      name: t.name, meta: t.sentence + ' · ' + S.size,
      sentence: t.sentence, size: S.size, price: priceFor(t),
    });
  });
}

function wirePopup() {
  el.popup.querySelectorAll('[data-act="close-arch"]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      if (e.target.closest('[data-stop]') && !e.target.closest('.pop-x')) return;
      set({ arch: -1 });
    });
  });
}

function wireCart() {
  el.cart.querySelectorAll('[data-act="close-cart"]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      if (e.target.closest('[data-stop]') && !e.target.closest('.cart-x')) return;
      set({ cartOpen: false });
    });
  });
  el.cart.querySelectorAll('[data-qty]').forEach(function (b) {
    b.addEventListener('click', function () {
      bumpQty(Number(b.getAttribute('data-i')), Number(b.getAttribute('data-qty')));
    });
  });
  el.cart.querySelectorAll('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function () { goScreen(b.getAttribute('data-goto')); });
  });
  var co = el.cart.querySelector('[data-act="to-checkout"]');
  if (co) co.addEventListener('click', function () { S.phase = 'form'; goScreen('checkout'); });
}

/* ---- server calls ---- */

function post(body) {
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, CONFIG.FETCH_TIMEOUT_MS);
  return fetch(CONFIG.ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(body),               // text/plain by default → no preflight
    signal: ctrl.signal,
  }).then(function (r) { clearTimeout(timer); return r.json(); });
}

function placeOrder() {
  var sub = cartSub();
  if (sub === 0) { say('Bag’s empty. Go on.'); return; }
  if (!S.form.name.trim()) { set({ err: 'Your name, at least.' }); return; }
  if (S.deliveryMode === 'hostel' && !S.form.room.trim()) { set({ err: 'Which room do I knock on?' }); return; }
  if (S.deliveryMode === 'ship' && !(S.form.addr.trim() && S.form.pin.trim())) { set({ err: 'Shipping needs an address and a PIN.' }); return; }

  S.orderId = makeOrderId();
  var ship = shipFee(sub);
  var hpEl = el.screen.querySelector('.hp');

  if (!CONFIG.ENDPOINT) { set({ phase: 'fallback' }); return; }
  set({ err: 'Placing order…' });

  post({
    type: 'order', secret: CONFIG.SECRET,
    orderId: S.orderId,
    items: S.cart.map(function (c) {
      return c.custom
        ? { custom: { text: c.sentence }, size: c.size, qty: c.qty }
        : { designId: c.id, size: c.size, qty: c.qty };
    }),
    deliveryMode: S.deliveryMode, payMode: S.pay,
    buyer: {
      name: S.form.name.trim(), phone: S.form.phone.trim(),
      room: S.form.room.trim(), address: S.form.addr.trim(),
      city: S.form.city.trim(), pin: S.form.pin.trim(),
    },
    note: '', self: IS_SELF, amountShown: sub + ship,
    hp: (hpEl && hpEl.value) || '', t: Date.now() - loadedAt,
  }).then(function (res) {
    if (res && res.ok) {
      S.payment = res.payment || null;
      S.serverTotal = res.total || res.amount || (sub + ship);
      S.cart = [];
      if (S.pay === 'cod') { set({ phase: 'placed', claimed: false, err: '' }); }
      else { persistPending(); set({ phase: 'pay', err: '' }); }
      window.scrollTo(0, 0);
    } else if (res && res.error === 'SOLD_OUT') {
      if (avail && avail.stock && res.stock) {
        Object.keys(res.stock).forEach(function (id) {
          if (avail.stock[id]) avail.stock[id].sizes = res.stock[id].sizes || {};
        });
      }
      set({ phase: 'form', err: 'Something sold out while you were ordering — check the bag.' });
    } else {
      set({ phase: 'fallback' });
    }
  }).catch(function () { set({ phase: 'fallback' }); });
}

function submitClaim() {
  var input = el.screen.querySelector('[data-f="utr"]');
  var utr = ((input && input.value) || '').replace(/\D/g, '');
  if (!/^(\d{12}|\d{4})$/.test(utr)) {
    set({ err: 'That doesn’t look like a UPI reference — 12 digits, or just the last 4.' });
    return;
  }
  if (!CONFIG.ENDPOINT) { clearPending(); set({ phase: 'placed', claimed: true }); return; }
  set({ err: 'Submitting…' });
  post({ type: 'claim', secret: CONFIG.SECRET, orderId: S.orderId, utr: utr, hp: '', t: Date.now() - loadedAt })
    .then(function (res) {
      if (res && (res.ok || res.error === 'ALREADY_VERIFIED')) {
        clearPending(); set({ phase: 'placed', claimed: true, err: '' });
      } else {
        set({ err: 'Couldn’t submit — try again, or send it on WhatsApp: ' + utr });
      }
    })
    .catch(function () { set({ err: 'Couldn’t submit — try again, or send it on WhatsApp: ' + utr }); });
}

function upiLink(vpa, payee, amount, orderId) {
  return 'upi://pay?pa=' + encodeURIComponent(vpa) +
    '&pn=' + encodeURIComponent(payee) +
    '&am=' + encodeURIComponent(String(amount)) +
    '&cu=INR&tn=' + encodeURIComponent(orderId);
}

/* ---- pending order resume ---- */

function persistPending() {
  try {
    localStorage.setItem('tees.lastOrder', JSON.stringify({
      orderId: S.orderId, total: S.serverTotal,
      vpa: (S.payment && S.payment.vpa) || '', payee: (S.payment && S.payment.payee) || '',
      at: Date.now(),
    }));
  } catch (e) {}
}
function clearPending() { try { localStorage.removeItem('tees.lastOrder'); } catch (e) {} }

function resumePending() {
  var p;
  try { p = JSON.parse(localStorage.getItem('tees.lastOrder') || 'null'); } catch (e) { return; }
  if (!p || !el.resume) return;
  if (Date.now() - p.at > 7 * 86400000) { clearPending(); return; }
  el.resume.classList.add('on');
  el.resume.innerHTML =
    'Unfinished payment for <b>' + esc(p.orderId) + '</b> — ' + fmt(p.total) +
    '<button type="button" class="btn-mini" data-resume>Finish payment</button>' +
    '<button type="button" class="btn-ghost-mini" data-dismiss>Dismiss</button>';
  el.resume.querySelector('[data-resume]').addEventListener('click', function () {
    S.orderId = p.orderId; S.serverTotal = p.total;
    S.payment = { vpa: p.vpa || CONFIG.FALLBACK_VPA, payee: p.payee || CONFIG.PAYEE };
    S.pay = 'upi'; S.phase = 'pay'; S.claimed = false;
    goScreen('checkout'); S.phase = 'pay'; render();
  });
  el.resume.querySelector('[data-dismiss]').addEventListener('click', function () {
    clearPending(); el.resume.classList.remove('on'); el.resume.innerHTML = '';
  });
}

/* ---- utils / boot ---- */

function makeOrderId() {
  var r = Math.random().toString(36).slice(2, 4).toUpperCase();
  return 'PT-' + Date.now().toString(36).toUpperCase() + '-' + r;
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (S.arch > -1) set({ arch: -1 });
  else if (S.cartOpen) set({ cartOpen: false });
  else if (S.detail > -1) set({ detail: -1 });
});

document.querySelectorAll('[data-nav]').forEach(function (b) {
  b.addEventListener('click', function () { goScreen(b.getAttribute('data-nav')); });
});
if (el.cartbtn) el.cartbtn.addEventListener('click', function () { set({ cartOpen: true }); });

if (IS_SELF) { document.body.classList.add('self'); S.form.name = 'Rachit (self)'; }

render();
resumePending();
fetchAvailability();
