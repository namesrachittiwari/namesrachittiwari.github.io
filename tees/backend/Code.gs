/**
 * Pokie Tees — order backend (Google Apps Script web app). Contract v2.
 *
 * This file is versioned here for reference; it RUNS in the owner's Google
 * account, bound to a Google Sheet (see SETUP.md). The static store at /tees
 * talks to the deployed /exec URL.
 *
 * Wire notes (why the client does what it does):
 * - POSTs arrive as text/plain JSON: custom content-types trigger a CORS
 *   preflight that Apps Script cannot answer; text/plain does not. The body
 *   is read from e.postData.contents.
 * - ContentService can only return HTTP 200, via a 302 redirect to
 *   script.googleusercontent.com (Access-Control-Allow-Origin: *). fetch()
 *   with default redirect:'follow' and NO custom headers handles this.
 *   Errors are therefore always {ok:false, error:CODE} in a 200 body.
 * - The client "secret" ships in public JS, so it is a bot filter, not
 *   security. Real guards: honeypot, min-fill-time, length caps, daily cap,
 *   and server-side price computation (the client's price is never trusted).
 *
 * v2 (multi-item cart, matching the v7 storefront):
 * - One order = one row = MANY line items (items[] in the POST; each line is
 *   a catalogue tee {designId,size,qty} or a Studio line {custom:{text},...}).
 *   One payment, one VERIFIED flip, one Qikink order with line_items[].
 * - Sizes are XS S M L XL 2XL (the design's row).
 * - payMode 'upi' (QR + UTR claim) or 'cod' (hostel hand-delivery only,
 *   cash at handover — row just stays NEW until the owner collects).
 * - Shipping: ship mode only — ₹79 under ₹2,500 subtotal, free above.
 * - Custom lines are priced from the Stock row 'custom-line' and are NOT
 *   stock-tracked; they flag the order for manual POD handling (no SKU).
 *
 * Status ladder (Orders!C): NEW → CLAIMED → VERIFIED → PRINTED → DELIVERED
 * (or CANCELLED). The owner's flip to VERIFIED is the single manual step:
 * it confirms payment (personal UPI has no API) and — when POD_ENABLED=1 —
 * releases the Qikink print job via the onEdit trigger.
 */

var ORDERS = 'Orders';
var STOCK = 'Stock';
var SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
var STATUSES = ['NEW', 'CLAIMED', 'VERIFIED', 'PRINTED', 'DELIVERED', 'CANCELLED'];
var DAILY_CAP = 40;
var MAX_LINES = 8;
var FREE_SHIP_AT = 2500;
var SHIP_FEE = 79;
var CUSTOM_ID = 'custom-line';

/* Orders columns (A–Z):
 *  A orderId  B createdAt  C status  D items(summary)  E itemsJson  F units
 *  G subtotal H shipping   I total   J amountClientShown  K payMode
 *  L buyerName M room  N phone  O address  P city  Q pin  R note  S self
 *  T utr  U claimedAt  V adminNotes  W deliveryMode  X podOrderId
 *  Y tracking  Z podStatus
 */
var COL = { status: 3, itemsJson: 5, buyerName: 12, phone: 14, address: 15,
  city: 16, pin: 17, utr: 20, claimedAt: 21, deliveryMode: 23,
  podOrderId: 24, tracking: 25, podStatus: 26 };

/* ============ HTTP entry points ============ */

function doGet(e) {
  try {
    return json_(availability_());
  } catch (err) {
    return json_({ ok: false, error: 'SERVER', detail: String(err) });
  }
}

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    if (b.type === 'order') return json_(handleOrder_(b));
    if (b.type === 'claim') return json_(handleClaim_(b));
    return json_({ ok: false, error: 'BAD_REQUEST' });
  } catch (err) {
    return json_({ ok: false, error: 'SERVER', detail: String(err) });
  }
}

/* ============ availability (public, read-only) ============ */

function availability_() {
  var p = props_();
  var rows = sheet_(STOCK).getDataRange().getValues();
  var stock = {};
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var sizes = {};
    for (var s = 0; s < SIZES.length; s++) {
      var v = r[3 + s];
      if (v !== '' && v !== null) sizes[SIZES[s]] = Number(v) || 0;
    }
    stock[String(r[0])] = { title: String(r[1] || ''), price: Number(r[2]) || 0, sizes: sizes };
  }
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    payment: { vpa: p.UPI_VPA || '', payee: p.UPI_PAYEE || '' },
    stock: stock,
  };
}

/* ============ order create (multi-item) ============ */

function handleOrder_(b) {
  var p = props_();
  if (!b.secret || b.secret !== p.SECRET) return { ok: false, error: 'SECRET' };
  if (b.hp) return { ok: false, error: 'BAD_REQUEST' };            // honeypot filled
  if (!(Number(b.t) >= 3000)) return { ok: false, error: 'TOO_FAST' };

  var orderId = clip_(b.orderId, 24);
  var items = b.items;
  var buyer = b.buyer || {};
  var name = clip_(buyer.name, 60);
  var room = clip_(buyer.room, 30);
  var phone = clip_(buyer.phone, 15);
  var address = clip_(buyer.address, 300);
  var city = clip_(buyer.city, 60);
  var pin = clip_(buyer.pin, 10);
  var note = clip_(b.note, 200);
  var deliveryMode = b.deliveryMode === 'ship' ? 'ship' : 'hostel';
  var payMode = (b.payMode === 'cod' && deliveryMode === 'hostel') ? 'cod' : 'upi';

  if (!/^PT-[0-9A-Z-]{4,}$/.test(orderId)) return { ok: false, error: 'BAD_REQUEST' };
  if (!name) return { ok: false, error: 'BAD_REQUEST' };
  if (!(items instanceof Array) || items.length < 1 || items.length > MAX_LINES) {
    return { ok: false, error: 'BAD_REQUEST' };
  }
  if (deliveryMode === 'ship' && !(address && pin)) return { ok: false, error: 'BAD_REQUEST' };
  if (dailyCount_() >= DAILY_CAP) return { ok: false, error: 'RATE_LIMITED' };

  // Normalise and pre-validate every line before touching the sheet.
  var lines = [];
  for (var li = 0; li < items.length; li++) {
    var it = items[li] || {};
    var size = String(it.size || '');
    var qty = Math.floor(Number(it.qty));
    if (SIZES.indexOf(size) < 0) return { ok: false, error: 'BAD_REQUEST' };
    if (!(qty >= 1 && qty <= 5)) return { ok: false, error: 'BAD_REQUEST' };
    if (it.custom && it.custom.text) {
      var text = clip_(it.custom.text, 60);
      if (!text) return { ok: false, error: 'BAD_REQUEST' };
      lines.push({ custom: true, text: text, size: size, qty: qty });
    } else {
      var designId = clip_(it.designId, 20);
      if (!designId) return { ok: false, error: 'BAD_REQUEST' };
      lines.push({ custom: false, designId: designId, size: size, qty: qty });
    }
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var st = sheet_(STOCK);
    var rows = st.getDataRange().getValues();
    var byId = {};
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0]) byId[String(rows[i][0])] = { idx: i, row: rows[i] };
    }

    var customPrice = byId[CUSTOM_ID] ? Number(byId[CUSTOM_ID].row[2]) || 0 : 0;
    if (!customPrice) customPrice = 1490;

    // Pass 1: check everything (no partial decrements on SOLD_OUT).
    var soldOut = {};
    for (var c = 0; c < lines.length; c++) {
      var ln = lines[c];
      if (ln.custom) { ln.price = customPrice; ln.title = 'Your line: “' + ln.text + '”'; continue; }
      var hit = byId[ln.designId];
      if (!hit) return { ok: false, error: 'UNKNOWN_DESIGN' };
      ln.rowIdx = hit.idx;
      ln.title = String(hit.row[1] || ln.designId);
      ln.price = Number(hit.row[2]) || 0;
      var have = Number(hit.row[3 + SIZES.indexOf(ln.size)]);
      if (isNaN(have) || have < ln.qty) soldOut[ln.designId] = { sizes: sizesOf_(hit.row) };
    }
    if (Object.keys(soldOut).length) return { ok: false, error: 'SOLD_OUT', stock: soldOut };

    // Pass 2: decrement.
    for (var d = 0; d < lines.length; d++) {
      var l2 = lines[d];
      if (l2.custom) continue;
      var col = 3 + SIZES.indexOf(l2.size);
      var have2 = Number(byId[l2.designId].row[col]);
      st.getRange(l2.rowIdx + 1, col + 1).setValue(have2 - l2.qty);
      byId[l2.designId].row[col] = have2 - l2.qty;   // same design twice in one cart
    }

    var subtotal = 0, units = 0;
    var summary = lines.map(function (l) {
      subtotal += l.price * l.qty; units += l.qty;
      return l.qty + '× ' + l.title + ' (' + l.size + ')';
    }).join('; ');
    var shipping = deliveryMode === 'ship' ? (subtotal >= FREE_SHIP_AT ? 0 : SHIP_FEE) : 0;
    var total = subtotal + shipping;
    var hasCustom = lines.some(function (l) { return l.custom; });

    sheet_(ORDERS).appendRow([
      orderId, new Date().toISOString(), 'NEW',
      summary, JSON.stringify(lines), units,
      subtotal, shipping, total, Number(b.amountShown) || '', payMode,
      name, room, phone, address, city, pin, note, b.self === true,
      '', '', '',                                     // utr, claimedAt, adminNotes
      deliveryMode, '', '', hasCustom ? 'HAS_CUSTOM' : '',
    ]);
    bumpDaily_();

    notify_('Tee order ' + orderId + ' — ₹' + total + (payMode === 'cod' ? ' (COD)' : ''), [
      summary + (b.self === true ? '  [SELF]' : ''),
      'Buyer: ' + name + (room ? ' · ' + room : '') + (phone ? ' · ' + phone : ''),
      deliveryMode === 'ship' ? 'Ship to: ' + address + ', ' + city + ' ' + pin : 'Hostel hand-delivery',
      note ? 'Note: ' + note : '',
      hasCustom ? 'Has a CUSTOM line — needs manual placement with the POD supplier.' : '',
      payMode === 'cod'
        ? 'COD: collect ₹' + total + ' at handover, then set status VERIFIED in the Sheet.'
        : 'Awaiting payment (₹' + total + ' on UPI). Verify in your UPI app, then set status VERIFIED in the Sheet.',
    ]);

    return {
      ok: true, orderId: orderId, amount: subtotal, shipping: shipping, total: total,
      status: 'NEW', payment: { vpa: p.UPI_VPA || '', payee: p.UPI_PAYEE || '' },
    };
  } finally {
    lock.releaseLock();
  }
}

/* ============ payment claim (buyer submits UPI reference) ============ */

function handleClaim_(b) {
  var p = props_();
  if (!b.secret || b.secret !== p.SECRET) return { ok: false, error: 'SECRET' };
  if (b.hp) return { ok: false, error: 'BAD_REQUEST' };

  var orderId = clip_(b.orderId, 24);
  var utr = String(b.utr || '').replace(/\D/g, '');
  if (!/^(\d{12}|\d{4})$/.test(utr)) return { ok: false, error: 'BAD_REQUEST' };

  var os = sheet_(ORDERS);
  var cell = os.getRange('A:A').createTextFinder(orderId).matchEntireCell(true).findNext();
  if (!cell) return { ok: false, error: 'NOT_FOUND' };
  var row = cell.getRow();
  var status = String(os.getRange(row, COL.status).getValue());
  if (STATUSES.indexOf(status) > STATUSES.indexOf('CLAIMED')) {
    return { ok: false, error: 'ALREADY_VERIFIED' };
  }
  os.getRange(row, COL.status).setValue('CLAIMED');
  os.getRange(row, COL.utr).setValue(utr);
  os.getRange(row, COL.claimedAt).setValue(new Date().toISOString());

  notify_('Payment claimed ' + orderId, [
    'UTR/ref: ' + utr,
    'Check your UPI app, then set status VERIFIED in the Sheet.',
  ]);
  return { ok: true, orderId: orderId, status: 'CLAIMED' };
}

/* ============ Qikink dropshipping connector (inert until POD_ENABLED=1) ====
 * Activation (SETUP.md §6): create the Qikink account, upload designs, put
 * per-size SKUs in Stock!J:O, set Script Properties QIKINK_CLIENT_ID /
 * QIKINK_CLIENT_SECRET / POD_BASE (sandbox first: https://sandbox.qikink.com)
 * / POD_ENABLED=1, and install the two triggers (setupTriggers()).
 * Exact request/response field names: Qikink's Postman docs
 * (documenter.getpostman.com/view/26157218/2sB3QKqpma) — the TODO markers
 * below are pinned against those docs during sandbox testing.
 */

function onVerifiedEdit(e) {                 // installable onEdit trigger
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    if (sh.getName() !== ORDERS || e.range.getColumn() !== COL.status) return;
    if (String(e.range.getValue()) !== 'VERIFIED') return;
    if (props_().POD_ENABLED !== '1') return;
    podDispatch_(e.range.getRow());
  } catch (err) {
    notify_('POD dispatch failed', [String(err)]);
  }
}

function podDispatch_(row) {
  var os = sheet_(ORDERS);
  var r = os.getRange(row, 1, 1, 26).getValues()[0];
  if (r[COL.podOrderId - 1]) return;                       // already dispatched
  var deliveryMode = String(r[COL.deliveryMode - 1] || 'hostel');
  var p = props_();

  var lines = safeJson_(String(r[COL.itemsJson - 1])) || [];
  var lineItems = [];
  var manualLines = [];
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    if (ln.custom) { manualLines.push(ln); continue; }     // no SKU — owner places by hand
    var sku = podSku_(String(ln.designId), String(ln.size));
    if (!sku) { os.getRange(row, COL.podStatus).setValue('NO_SKU ' + ln.designId + '/' + ln.size); return; }
    lineItems.push({ sku: sku, quantity: Number(ln.qty) });
  }
  if (manualLines.length) {
    notify_('Order ' + r[0] + ' has ' + manualLines.length + ' CUSTOM line(s)', [
      'Place these by hand in the Qikink panel:',
      manualLines.map(function (l) { return l.qty + '× “' + l.text + '” (' + l.size + ')'; }).join('\n'),
    ]);
  }
  if (!lineItems.length) {
    os.getRange(row, COL.podStatus).setValue('ALL_CUSTOM (manual)');
    return;
  }

  var shipTo = deliveryMode === 'ship'
    ? { name: String(r[COL.buyerName - 1]), phone: String(r[COL.phone - 1]),
        address: String(r[COL.address - 1]) + ', ' + String(r[COL.city - 1]) + ' ' + String(r[COL.pin - 1]) }
    : { name: p.UPI_PAYEE || 'Owner', phone: p.OWNER_PHONE || '', address: p.OWNER_ADDRESS || '' };

  // TODO(sandbox): pin exact payload field names against Qikink's docs.
  var payload = {
    order_number: String(r[0]),
    payment_type: 'prepaid',
    line_items: lineItems,
    shipping_address: shipTo,
  };
  var res = UrlFetchApp.fetch(podBase_() + '/api/order/create', {
    method: 'post', contentType: 'application/json',
    headers: podAuthHeaders_(), payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  var body = safeJson_(res.getContentText());
  if (res.getResponseCode() < 300 && body) {
    os.getRange(row, COL.podOrderId).setValue(String(body.order_id || body.id || 'OK'));
    os.getRange(row, COL.podStatus).setValue('DISPATCHED');
    notify_('Qikink order placed for ' + r[0], ['Supplier ref: ' + (body.order_id || body.id || '?')]);
  } else {
    os.getRange(row, COL.podStatus).setValue('DISPATCH_FAILED ' + res.getResponseCode());
    notify_('Qikink dispatch FAILED for ' + r[0], [res.getContentText().slice(0, 500)]);
  }
}

function podPoll_() {                        // time-driven trigger (6h)
  if (props_().POD_ENABLED !== '1') return;
  var os = sheet_(ORDERS);
  var data = os.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var podId = data[i][COL.podOrderId - 1], podStatus = String(data[i][COL.podStatus - 1] || '');
    if (!podId || podStatus.indexOf('DELIVERED') === 0) continue;
    // TODO(sandbox): pin exact status endpoint + fields against Qikink's docs.
    var res = UrlFetchApp.fetch(podBase_() + '/api/order/status?order_id=' + encodeURIComponent(podId), {
      headers: podAuthHeaders_(), muteHttpExceptions: true,
    });
    var body = safeJson_(res.getContentText());
    if (body && body.status) {
      os.getRange(i + 1, COL.podStatus).setValue(String(body.status));
      if (body.tracking_number || body.awb) {
        os.getRange(i + 1, COL.tracking).setValue(String(body.courier || '') + ' ' + String(body.tracking_number || body.awb));
      }
    }
  }
}

function podAuthHeaders_() {
  var p = props_();
  var cache = CacheService.getScriptCache();
  var tok = cache.get('qikink_token');
  if (!tok) {
    var res = UrlFetchApp.fetch(podBase_() + '/api/token', {
      method: 'post',
      payload: { ClientId: p.QIKINK_CLIENT_ID, client_secret: p.QIKINK_CLIENT_SECRET },
      muteHttpExceptions: true,
    });
    var body = safeJson_(res.getContentText()) || {};
    tok = String(body.Accesstoken || body.access_token || '');
    if (tok) cache.put('qikink_token', tok, 3000);
  }
  return { ClientId: p.QIKINK_CLIENT_ID, Accesstoken: tok };
}

function podBase_() { return props_().POD_BASE || 'https://sandbox.qikink.com'; }

function podSku_(designId, size) {
  var rows = sheet_(STOCK).getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === designId) return String(rows[i][9 + SIZES.indexOf(size)] || ''); // J:O
  }
  return '';
}

/* ============ notifications ============ */

function notify_(subject, lines) {
  var p = props_();
  var text = lines.filter(function (l) { return l; }).join('\n');
  try {
    if (p.NOTIFY_EMAIL) MailApp.sendEmail(p.NOTIFY_EMAIL, '[Pokie Tees] ' + subject, text);
  } catch (e) {}
  try {
    if (p.TELEGRAM_TOKEN && p.TELEGRAM_CHAT_ID) {
      UrlFetchApp.fetch('https://api.telegram.org/bot' + p.TELEGRAM_TOKEN + '/sendMessage', {
        method: 'post',
        payload: { chat_id: p.TELEGRAM_CHAT_ID, text: subject + '\n' + text },
        muteHttpExceptions: true,
      });
    }
  } catch (e) {}
}

/* ============ one-time setup (run manually from the editor) ============ */

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var os = ss.getSheetByName(ORDERS) || ss.insertSheet(ORDERS);
  var st = ss.getSheetByName(STOCK) || ss.insertSheet(STOCK);

  os.getRange(1, 1, 1, 26).setValues([[
    'orderId', 'createdAt', 'status', 'items', 'itemsJson', 'units',
    'subtotal', 'shipping', 'total', 'amountClientShown', 'payMode',
    'buyerName', 'room', 'phone', 'address', 'city', 'pin', 'note', 'self',
    'utr', 'claimedAt', 'adminNotes',
    'deliveryMode', 'podOrderId', 'tracking', 'podStatus',
  ]]).setFontWeight('bold');
  os.setFrozenRows(1);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
  os.getRange('C2:C1000').setDataValidation(rule);
  setStatusColors_(os);

  st.getRange(1, 1, 1, 15).setValues([[
    'designId', 'title', 'price', 'XS', 'S', 'M', 'L', 'XL', '2XL',
    'podSkuXS', 'podSkuS', 'podSkuM', 'podSkuL', 'podSkuXL', 'podSku2XL',
  ]]).setFontWeight('bold');
  st.setFrozenRows(1);
  if (st.getLastRow() < 2) {
    var seed = [
      ['del-01', 'Main Character'], ['del-02', 'Assembled Wrong'],
      ['del-03', 'Full Confidence'], ['del-04', 'Group Chat'],
      ['grind-01', 'Mess Food'], ['grind-02', 'Attendance'],
      ['grind-03', 'Legends Sleep'], ['grind-04', 'Last Minute'],
      ['aud-01', 'Said It'], ['aud-02', 'Energy Efficient'],
      ['aud-03', 'Unavailable'], ['aud-04', 'Out Of Office'],
    ].map(function (r) { return [r[0], r[1], 1490, 0, 0, 0, 0, 0, 0, '', '', '', '', '', '']; });
    seed.push([CUSTOM_ID, 'Your line (Studio)', 1490, '', '', '', '', '', '', '', '', '', '', '', '']);
    st.getRange(2, 1, seed.length, 15).setValues(seed);
  }
}

function setupTriggers() {                   // run manually after enabling POD
  ScriptApp.newTrigger('onVerifiedEdit').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onEdit().create();
  ScriptApp.newTrigger('podPoll_').timeBased().everyHours(6).create();
}

function setStatusColors_(os) {
  var range = os.getRange('C2:C1000');
  var rules = [
    ['NEW', '#fff3c4'], ['CLAIMED', '#cfe3ff'], ['VERIFIED', '#c9f7d5'],
    ['PRINTED', '#c9f7d5'], ['DELIVERED', '#c9f7d5'], ['CANCELLED', '#f4c7c3'],
  ].map(function (p) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(p[0]).setBackground(p[1]).setRanges([range]).build();
  });
  os.setConditionalFormatRules(rules);
}

/* ============ helpers ============ */

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet tab: ' + name + ' — run setupSheet() once.');
  return sh;
}

function props_() { return PropertiesService.getScriptProperties().getProperties(); }

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function clip_(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }

function sizesOf_(row) {
  var out = {};
  for (var s = 0; s < SIZES.length; s++) {
    var v = row[3 + s];
    if (v !== '' && v !== null) out[SIZES[s]] = Number(v) || 0;
  }
  return out;
}

function safeJson_(s) { try { return JSON.parse(s); } catch (e) { return null; } }

function dailyCount_() {
  var c = CacheService.getScriptCache().get('orders_' + today_());
  return c ? Number(c) : 0;
}

function bumpDaily_() {
  var key = 'orders_' + today_();
  var cache = CacheService.getScriptCache();
  cache.put(key, String(dailyCount_() + 1), 86400);
}

function today_() { return new Date().toISOString().slice(0, 10); }
