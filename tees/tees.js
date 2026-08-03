/* Pokie Tees — storefront logic.
 *
 * RESKIN CONTRACT: this file binds ONLY to [data-tees="…"] mounts —
 * grid, flow, flowback, status, resume — never to classes or DOM shape.
 * A redesigned shell keeps those five attributes and this file is untouched.
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

var SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
var GROUPS = [
  { key: 'agent', label: 'The agent' },
  { key: 'reject', label: 'The rejections' },
  { key: 'hunt', label: 'The hunt' },
];
var CATALOG = [
  { id: 'agent-01',  group: 'agent',  sentence: 'It hunts. I decide.',                                        price: 499 },
  { id: 'agent-02',  group: 'agent',  sentence: 'Applied while you were sleeping.',                           price: 499 },
  { id: 'agent-03',  group: 'agent',  sentence: 'My agent applied. I just decided.',                          price: 499 },
  { id: 'agent-04',  group: 'agent',  sentence: 'Nights are for hunting.',                                    price: 499 },
  { id: 'reject-01', group: 'reject', sentence: 'We’ll keep your CV on file.',                           price: 499 },
  { id: 'reject-02', group: 'reject', sentence: 'Strong profile — moving forward with other candidates.', price: 499 },
  { id: 'reject-03', group: 'reject', sentence: 'We’re looking for someone more senior. And more junior.', price: 499 },
  { id: 'reject-04', group: 'reject', sentence: 'Rejected by an algorithm. Hired by a human.',                price: 499 },
  { id: 'hunt-01',   group: 'hunt',   sentence: 'Still hunting.',                                             price: 499 },
  { id: 'hunt-02',   group: 'hunt',   sentence: 'Open to work. Not open to nonsense.',                        price: 499 },
  { id: 'hunt-03',   group: 'hunt',   sentence: 'I read the JD. All of it.',                                  price: 499 },
  { id: 'hunt-04',   group: 'hunt',   sentence: 'Currently between opportunities to be underpaid.',           price: 499 },
];

var $ = function (sel) { return document.querySelector('[data-tees="' + sel + '"]'); };
var el = { grid: $('grid'), flow: $('flow'), back: $('flowback'), status: $('status'), resume: $('resume') };

var avail = null;                 // availability payload from GET
var order = null;                 // in-flight order state
var loadedAt = Date.now();
var IS_SELF = /[?&]self=1/.test(location.search);

/* ============ boot ============ */

function boot() {
  renderGrid();
  resumePending();
  fetchAvailability();
}

/* ============ availability ============ */

function fetchAvailability() {
  if (!CONFIG.ENDPOINT) { setStatus(''); return; }
  var cached = readCache();
  if (cached && Date.now() - cached.at < CONFIG.AVAIL_TTL_MS) { applyAvail(cached.data); return; }

  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, CONFIG.FETCH_TIMEOUT_MS);
  fetch(CONFIG.ENDPOINT, { signal: ctrl.signal })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      clearTimeout(timer);
      if (!data || !data.ok) throw new Error('bad payload');
      try { localStorage.setItem('tees.avail', JSON.stringify({ at: Date.now(), data: data })); } catch (e) {}
      applyAvail(data);
    })
    .catch(function () {
      clearTimeout(timer);
      if (cached) { applyAvail(cached.data); return; }   // stale-if-error
      setStatus('live stock unavailable — sold-out tees will bounce at checkout', true);
    });
}

function readCache() {
  try { return JSON.parse(localStorage.getItem('tees.avail') || 'null'); } catch (e) { return null; }
}

function applyAvail(data) {
  avail = data;
  setStatus('');
  renderGrid();
}

function setStatus(msg, warn) {
  if (!el.status) return;
  el.status.textContent = msg || '';
  el.status.className = 'strip' + (warn ? ' warn' : '');
}

function stockFor(id) { return (avail && avail.stock && avail.stock[id]) || null; }
function priceFor(d) { var s = stockFor(d.id); return s && s.price > 0 ? s.price : d.price; }
function sizesFor(d) {
  var s = stockFor(d.id);
  if (!s) return null;                        // unknown → all sizes enabled
  return s.sizes || {};
}
function allSoldOut(d) {
  var sizes = sizesFor(d);
  if (!sizes) return false;
  return SIZES.every(function (sz) { return !(sizes[sz] > 0); });
}

/* ============ catalogue ============ */

function renderGrid() {
  if (!el.grid) return;
  el.grid.querySelectorAll('.group').forEach(function (n) { n.remove(); });
  GROUPS.forEach(function (g) {
    var items = CATALOG.filter(function (d) { return d.group === g.key; });
    if (!items.length) return;
    var sec = document.createElement('section');
    sec.className = 'group rise';
    sec.innerHTML = '<h2>' + esc(g.label) + '</h2><div class="grid"></div>';
    var grid = sec.querySelector('.grid');
    items.forEach(function (d) {
      var out = allSoldOut(d);
      var card = document.createElement('button');
      card.className = 'card';
      card.setAttribute('data-design', d.id);
      if (out) card.setAttribute('aria-disabled', 'true');
      card.innerHTML =
        '<span class="sentence">“' + esc(d.sentence) + '”</span>' +
        '<span class="meta"><span class="price">₹' + priceFor(d) + '</span>' +
        (out ? '<span class="soldout">sold out</span>' : '<span class="cta">order →</span>') +
        '</span>';
      card.addEventListener('click', function () { if (!out) openFlow(d.id); });
      grid.appendChild(card);
    });
    el.grid.appendChild(sec);
  });
}

/* ============ checkout flow ============ */

function openFlow(designId) {
  var d = CATALOG.filter(function (x) { return x.id === designId; })[0];
  if (!d) return;
  order = {
    orderId: makeOrderId(), design: d, size: null, qty: 1,
    name: IS_SELF ? 'Rachit (self)' : '', room: '', phone: '', note: '',
    deliveryMode: 'hostel', address: '',
    amount: 0, self: IS_SELF, claimed: false,
  };
  showFlow(); renderStep('size');
}

function showFlow() { el.flow.classList.add('on'); el.back.classList.add('on'); }
function hideFlow() { el.flow.classList.remove('on'); el.back.classList.remove('on'); }
if (el.back) el.back.addEventListener('click', hideFlow);

function head(title) {
  return '<div class="head"><span class="t">' + esc(title) + '</span>' +
    '<button class="close" data-act="close">close</button></div>' +
    '<div class="selfpill' + (order && order.self ? ' on' : '') + '">SELF ORDER</div>' +
    '<div class="sentence">“' + esc(order.design.sentence) + '”</div>';
}

function renderStep(step) {
  order.step = step;
  var h = '';
  if (step === 'size') {
    var sizes = sizesFor(order.design);
    h = head('Pick a size') +
      '<div class="chips">' + SIZES.map(function (sz) {
        var known = sizes && (sz in sizes);
        var count = known ? sizes[sz] : null;
        var out = known && !(count > 0);
        var offered = !sizes || sz in sizes;
        if (!offered) return '';
        return '<button class="chip" data-size="' + sz + '" aria-pressed="' + (order.size === sz) + '"' +
          (out ? ' aria-disabled="true"' : '') + '>' + sz +
          (known && count > 0 && count <= 3 ? '<span class="left">' + count + ' left</span>' : '') +
          '</button>';
      }).join('') + '</div>' +
      '<div class="qty"><label style="color:var(--t2);font-size:13px">Quantity</label>' +
      '<button data-act="qty-" aria-label="less">−</button><b>' + order.qty + '</b>' +
      '<button data-act="qty+" aria-label="more">+</button></div>' +
      '<div class="err"></div>' +
      '<div class="stack"><button class="btn primary" data-act="to-details">Continue</button></div>';
  } else if (step === 'details') {
    h = head('Where does it go?') +
      '<label class="radio"><input type="radio" name="dm" value="hostel"' + (order.deliveryMode === 'hostel' ? ' checked' : '') + '>' +
      '<span>Hostel hand-delivery<br><span class="sub">I bring it to your room. Free.</span></span></label>' +
      '<label class="radio"><input type="radio" name="dm" value="ship"' + (order.deliveryMode === 'ship' ? ' checked' : '') + '>' +
      '<span>Ship it to me<br><span class="sub">Courier to your address, tracking included.</span></span></label>' +
      '<div class="field"><label for="f-name">Name</label><input id="f-name" maxlength="60" value="' + esc(order.name) + '"></div>' +
      '<div class="row2">' +
      '<div class="field" data-hostel-only><label for="f-room">Hostel / room</label><input id="f-room" maxlength="30" placeholder="H4-212" value="' + esc(order.room) + '"></div>' +
      '<div class="field"><label for="f-phone">Phone</label><input id="f-phone" maxlength="15" inputmode="numeric" value="' + esc(order.phone) + '"></div>' +
      '</div>' +
      '<div class="field" data-ship-only style="display:none"><label for="f-addr">Full address with PIN</label><textarea id="f-addr" rows="3" maxlength="300">' + esc(order.address) + '</textarea></div>' +
      '<div class="field"><label for="f-note">Note (optional)</label><input id="f-note" maxlength="200" value="' + esc(order.note) + '"></div>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="err"></div>' +
      '<div class="stack"><button class="btn primary" data-act="to-review">Review order</button>' +
      '<button class="btn ghost" data-act="to-size">Back</button></div>';
  } else if (step === 'review') {
    order.amount = priceFor(order.design) * order.qty;
    h = head('Review') +
      '<div class="summary">' +
      '<div class="line"><span>Tee</span><span>“' + esc(short(order.design.sentence, 34)) + '”</span></div>' +
      '<div class="line"><span>Size / qty</span><span>' + order.size + ' × ' + order.qty + '</span></div>' +
      '<div class="line"><span>Delivery</span><span>' + (order.deliveryMode === 'ship' ? 'Courier' : 'Hostel, by hand') + '</span></div>' +
      '<div class="line"><span>For</span><span>' + esc(order.name) + (order.room ? ' · ' + esc(order.room) : '') + '</span></div>' +
      '<div class="line total"><span>Total</span><span>₹' + order.amount + '</span></div>' +
      '</div>' +
      '<div class="err"></div>' +
      '<div class="stack"><button class="btn primary" data-act="place">Place order</button>' +
      '<button class="btn ghost" data-act="to-details">Back</button></div>';
  } else if (step === 'pay') {
    var vpa = order.vpa || '';
    var link = vpa ? upiLink(vpa, order.payee || CONFIG.PAYEE, order.amount, order.orderId) : '';
    h = head('Pay ₹' + order.amount) +
      '<div class="pay">' +
      '<div class="amt">₹' + order.amount + '</div>' +
      '<img src="assets/upi-qr.png" alt="UPI QR code" width="200" height="200">' +
      (link ? '<a class="btn primary" style="width:auto;padding:12px 30px" href="' + link + '">Pay in UPI app</a>' : '') +
      '<div class="hint">Scan the QR (or tap on your phone). Put <b>' + order.orderId + '</b> in the payment note if you can.</div>' +
      '</div>' +
      '<div class="field"><label for="f-utr">After paying: UPI reference (12-digit UTR, or last 4 digits)</label>' +
      '<input id="f-utr" inputmode="numeric" maxlength="20" placeholder="4225 1234 5678"></div>' +
      '<div class="err"></div>' +
      '<div class="stack"><button class="btn primary" data-act="claim">I’ve paid — submit reference</button>' +
      '<button class="btn ghost" data-act="skip-claim">I’ll send the reference later</button></div>';
  } else if (step === 'fallback') {
    var summary = 'Tee order ' + order.orderId + ' — “' + order.design.sentence + '” / ' +
      order.size + ' ×' + order.qty + ' — ' + order.name +
      (order.room ? ', ' + order.room : '') +
      (order.deliveryMode === 'ship' ? ' — ship to: ' + order.address : '') +
      ' — total ₹' + order.amount;
    var wa = CONFIG.WHATSAPP ? 'https://wa.me/' + CONFIG.WHATSAPP + '?text=' + encodeURIComponent(summary) : '';
    var mail = 'mailto:' + CONFIG.EMAIL + '?subject=' + encodeURIComponent('Tee order ' + order.orderId) +
      '&body=' + encodeURIComponent(summary);
    h = head('Almost there — send it to me directly') +
      '<p style="color:var(--t2);font-size:14px;padding-bottom:6px">The order server didn’t answer, but nothing is lost — send this order in one tap and I’ll take it from there:</p>' +
      '<div class="summary"><div class="line"><span>Your order</span><span style="text-align:right">' + esc(short(summary, 90)) + '</span></div></div>' +
      '<div class="stack">' +
      (wa ? '<a class="btn primary" href="' + wa + '" target="_blank" rel="noopener">Send on WhatsApp</a>' : '') +
      '<a class="btn ' + (wa ? 'ghost' : 'primary') + '" href="' + mail + '">Send by email</a>' +
      '<button class="btn ghost" data-act="close">Close</button></div>';
  } else if (step === 'done') {
    h = head('Order placed') +
      '<div class="done"><div class="mark">✓</div>' +
      '<div class="oid">' + order.orderId + '</div>' +
      '<p>Screenshot this. ' + (order.claimed
        ? 'I’ll verify the payment in my UPI app, then print. '
        : 'Send the payment reference when you have it — the banner on this page will bring you back here. ') +
      (order.deliveryMode === 'ship' ? 'You’ll get a tracking number once it ships.' : 'Delivery to your room once it’s ready.') + '</p>' +
      '<div class="stack" style="width:100%"><button class="btn primary" data-act="close">Done</button></div></div>';
  }
  el.flow.innerHTML = h;
  wireStep();
}

function wireStep() {
  el.flow.querySelectorAll('[data-act]').forEach(function (b) {
    b.addEventListener('click', function () { act(b.getAttribute('data-act')); });
  });
  el.flow.querySelectorAll('.chip[data-size]').forEach(function (c) {
    c.addEventListener('click', function () {
      if (c.getAttribute('aria-disabled') === 'true') return;
      order.size = c.getAttribute('data-size');
      renderStep('size');
    });
  });
  el.flow.querySelectorAll('input[name="dm"]').forEach(function (r) {
    r.addEventListener('change', function () {
      order.deliveryMode = r.value;
      var ship = el.flow.querySelector('[data-ship-only]');
      var hostel = el.flow.querySelector('[data-hostel-only]');
      if (ship) ship.style.display = r.value === 'ship' ? '' : 'none';
      if (hostel) hostel.style.display = r.value === 'ship' ? 'none' : '';
    });
  });
  var first = el.flow.querySelector('input:not(.hp), button.chip');
  if (first && matchMedia('(min-width:821px)').matches) first.focus();
}

function act(a) {
  var err = el.flow.querySelector('.err');
  if (a === 'close') { hideFlow(); return; }
  if (a === 'qty+') { order.qty = Math.min(5, order.qty + 1); renderStep('size'); return; }
  if (a === 'qty-') { order.qty = Math.max(1, order.qty - 1); renderStep('size'); return; }
  if (a === 'to-size') { renderStep('size'); return; }
  if (a === 'to-details') {
    if (!order.size) { err.textContent = 'Pick a size first.'; return; }
    renderStep('details'); return;
  }
  if (a === 'to-review') {
    grabDetails();
    if (!order.name) { err.textContent = 'Your name, at least.'; return; }
    if (order.deliveryMode === 'ship' && !order.address) { err.textContent = 'Shipping needs an address.'; return; }
    order.hp = (el.flow.querySelector('.hp') || {}).value || '';
    renderStep('review'); return;
  }
  if (a === 'place') { placeOrder(); return; }
  if (a === 'claim') { submitClaim(); return; }
  if (a === 'skip-claim') { persistPending(); renderStep('done'); return; }
}

function grabDetails() {
  var g = function (id) { var n = el.flow.querySelector(id); return n ? n.value.trim() : ''; };
  order.name = g('#f-name'); order.room = g('#f-room');
  order.phone = g('#f-phone'); order.note = g('#f-note');
  order.address = g('#f-addr');
}

/* ============ server calls ============ */

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
  var err = el.flow.querySelector('.err');
  var btn = el.flow.querySelector('[data-act="place"]');
  order.amount = priceFor(order.design) * order.qty;
  if (!CONFIG.ENDPOINT) { renderStep('fallback'); return; }
  btn.disabled = true; err.textContent = 'Placing order…';

  post({
    type: 'order', secret: CONFIG.SECRET,
    orderId: order.orderId, designId: order.design.id,
    size: order.size, qty: order.qty, amountShown: order.amount,
    buyer: { name: order.name, room: order.room, phone: order.phone },
    note: order.note, self: order.self,
    deliveryMode: order.deliveryMode, address: order.address,
    hp: order.hp || '', t: Date.now() - loadedAt,
  }).then(function (res) {
    if (res && res.ok) {
      order.vpa = (res.payment && res.payment.vpa) || CONFIG.FALLBACK_VPA;
      order.payee = (res.payment && res.payment.payee) || CONFIG.PAYEE;
      order.amount = res.amount;
      persistPending();
      renderStep('pay');
    } else if (res && res.error === 'SOLD_OUT') {
      if (avail && avail.stock && avail.stock[order.design.id]) avail.stock[order.design.id].sizes = res.sizes || {};
      renderGrid();
      renderStep('size');
      el.flow.querySelector('.err').textContent = 'Sold out while you were ordering — sizes updated.';
    } else {
      renderStep('fallback');
    }
  }).catch(function () { renderStep('fallback'); });
}

function submitClaim() {
  var err = el.flow.querySelector('.err');
  var input = el.flow.querySelector('#f-utr');
  var utr = (input.value || '').replace(/\D/g, '');
  if (!/^(\d{12}|\d{4})$/.test(utr)) {
    err.textContent = 'That doesn’t look like a UPI reference — 12 digits, or just the last 4.';
    return;
  }
  if (!CONFIG.ENDPOINT) { order.claimed = true; clearPending(); renderStep('done'); return; }
  err.textContent = 'Submitting…';
  post({ type: 'claim', secret: CONFIG.SECRET, orderId: order.orderId, utr: utr, hp: '', t: Date.now() - loadedAt })
    .then(function (res) {
      if (res && res.ok) { order.claimed = true; clearPending(); renderStep('done'); }
      else if (res && res.error === 'ALREADY_VERIFIED') { order.claimed = true; clearPending(); renderStep('done'); }
      else { err.innerHTML = 'Couldn’t submit — try again, or <a href="' + waLink('Payment ref for ' + order.orderId + ': ' + utr) + '">send it on WhatsApp</a>.'; }
    })
    .catch(function () {
      err.innerHTML = 'Couldn’t submit — try again, or <a href="' + waLink('Payment ref for ' + order.orderId + ': ' + utr) + '">send it on WhatsApp</a>.';
    });
}

/* ============ upi / links ============ */

function upiLink(vpa, payee, amount, orderId) {
  return 'upi://pay?pa=' + encodeURIComponent(vpa) +
    '&pn=' + encodeURIComponent(payee) +
    '&am=' + encodeURIComponent(String(amount)) +
    '&cu=INR&tn=' + encodeURIComponent(orderId);
}

function waLink(text) {
  return CONFIG.WHATSAPP
    ? 'https://wa.me/' + CONFIG.WHATSAPP + '?text=' + encodeURIComponent(text)
    : 'mailto:' + CONFIG.EMAIL + '?subject=' + encodeURIComponent('Pokie Tees') + '&body=' + encodeURIComponent(text);
}

/* ============ pending order resume ============ */

function persistPending() {
  try {
    localStorage.setItem('tees.lastOrder', JSON.stringify({
      orderId: order.orderId, designId: order.design.id, size: order.size,
      qty: order.qty, amount: order.amount, vpa: order.vpa || '', payee: order.payee || '',
      deliveryMode: order.deliveryMode, at: Date.now(),
    }));
  } catch (e) {}
}

function clearPending() { try { localStorage.removeItem('tees.lastOrder'); } catch (e) {} }

function resumePending() {
  var p;
  try { p = JSON.parse(localStorage.getItem('tees.lastOrder') || 'null'); } catch (e) { return; }
  if (!p || !el.resume) return;
  if (Date.now() - p.at > 7 * 86400000) { clearPending(); return; }
  var d = CATALOG.filter(function (x) { return x.id === p.designId; })[0];
  if (!d) { clearPending(); return; }
  el.resume.classList.add('on');
  el.resume.innerHTML =
    '<span class="grow">Unfinished payment for <b>' + esc(p.orderId) + '</b> — “' +
    esc(short(d.sentence, 40)) + '”, ₹' + p.amount + '</span>' +
    '<button class="btn primary" style="width:auto;padding:10px 22px" data-resume>Finish payment</button>' +
    '<button class="btn ghost" style="width:auto;padding:10px 18px" data-dismiss>Dismiss</button>';
  el.resume.querySelector('[data-resume]').addEventListener('click', function () {
    order = {
      orderId: p.orderId, design: d, size: p.size, qty: p.qty, amount: p.amount,
      vpa: p.vpa || CONFIG.FALLBACK_VPA, payee: p.payee || CONFIG.PAYEE,
      deliveryMode: p.deliveryMode || 'hostel',
      name: '', room: '', phone: '', note: '', address: '', self: IS_SELF, claimed: false,
    };
    showFlow(); renderStep('pay');
  });
  el.resume.querySelector('[data-dismiss]').addEventListener('click', function () {
    clearPending(); el.resume.classList.remove('on');
  });
}

/* ============ utils ============ */

function makeOrderId() {
  var r = Math.random().toString(36).slice(2, 4).toUpperCase();
  return 'PT-' + Date.now().toString(36).toUpperCase() + '-' + r;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function short(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && el.flow.classList.contains('on')) hideFlow();
});

boot();
