/**
 * Pokie Tees — order backend (Google Apps Script web app).
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
 * Status ladder (Orders!C): NEW → CLAIMED → VERIFIED → PRINTED → DELIVERED
 * (or CANCELLED). The owner's flip to VERIFIED is the single manual step:
 * it confirms payment (personal UPI has no API) and — when POD_ENABLED=1 —
 * releases the Qikink print job via the onEdit trigger.
 */

var ORDERS = 'Orders';
var STOCK = 'Stock';
var SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
var STATUSES = ['NEW', 'CLAIMED', 'VERIFIED', 'PRINTED', 'DELIVERED', 'CANCELLED'];
var DAILY_CAP = 40;

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

/* ============ order create ============ */

function handleOrder_(b) {
  var p = props_();
  if (!b.secret || b.secret !== p.SECRET) return { ok: false, error: 'SECRET' };
  if (b.hp) return { ok: false, error: 'BAD_REQUEST' };            // honeypot filled
  if (!(Number(b.t) >= 3000)) return { ok: false, error: 'TOO_FAST' };

  var orderId = clip_(b.orderId, 24);
  var designId = clip_(b.designId, 20);
  var size = String(b.size || '');
  var qty = Math.floor(Number(b.qty));
  var buyer = b.buyer || {};
  var name = clip_(buyer.name, 60);
  var room = clip_(buyer.room, 30);
  var phone = clip_(buyer.phone, 15);
  var note = clip_(b.note, 200);
  var deliveryMode = b.deliveryMode === 'ship' ? 'ship' : 'hostel';
  var address = deliveryMode === 'ship' ? clip_(b.address, 300) : '';

  if (!/^PT-[0-9A-Z-]{4,}$/.test(orderId)) return { ok: false, error: 'BAD_REQUEST' };
  if (!name || !designId || SIZES.indexOf(size) < 0) return { ok: false, error: 'BAD_REQUEST' };
  if (!(qty >= 1 && qty <= 5)) return { ok: false, error: 'BAD_REQUEST' };
  if (deliveryMode === 'ship' && !address) return { ok: false, error: 'BAD_REQUEST' };
  if (dailyCount_() >= DAILY_CAP) return { ok: false, error: 'RATE_LIMITED' };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var st = sheet_(STOCK);
    var rows = st.getDataRange().getValues();
    var rowIdx = -1;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === designId) { rowIdx = i; break; }
    }
    if (rowIdx < 0) return { ok: false, error: 'UNKNOWN_DESIGN' };

    var sizeCol = 3 + SIZES.indexOf(size);          // 0-based in values
    var have = Number(rows[rowIdx][sizeCol]);
    var title = String(rows[rowIdx][1] || designId);
    var price = Number(rows[rowIdx][2]) || 0;
    if (isNaN(have) || have < qty) {
      return { ok: false, error: 'SOLD_OUT', sizes: sizesOf_(rows[rowIdx]) };
    }
    st.getRange(rowIdx + 1, sizeCol + 1).setValue(have - qty);

    var amount = price * qty;
    sheet_(ORDERS).appendRow([
      orderId, new Date().toISOString(), 'NEW',
      designId, title, size, qty, price, amount, Number(b.amountShown) || '',
      name, room, phone, note, b.self === true,
      '', '', '',                                     // utr, claimedAt, adminNotes
      deliveryMode, address, '', '', '',              // podOrderId, tracking, podStatus
    ]);
    bumpDaily_();

    notify_('Tee order ' + orderId + ' — ₹' + amount, [
      title + ' / ' + size + ' ×' + qty + (b.self === true ? '  [SELF]' : ''),
      'Buyer: ' + name + (room ? ' · ' + room : '') + (phone ? ' · ' + phone : ''),
      deliveryMode === 'ship' ? 'Ship to: ' + address : 'Hostel hand-delivery',
      note ? 'Note: ' + note : '',
      'Awaiting payment (₹' + amount + ' on UPI). Verify in your UPI app, then set status VERIFIED in the Sheet.',
    ]);

    return {
      ok: true, orderId: orderId, amount: amount, status: 'NEW',
      payment: { vpa: p.UPI_VPA || '', payee: p.UPI_PAYEE || '' },
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
  var status = String(os.getRange(row, 3).getValue());
  if (STATUSES.indexOf(status) > STATUSES.indexOf('CLAIMED')) {
    return { ok: false, error: 'ALREADY_VERIFIED' };
  }
  os.getRange(row, 3).setValue('CLAIMED');
  os.getRange(row, 16).setValue(utr);                       // P: utr
  os.getRange(row, 17).setValue(new Date().toISOString()); // Q: claimedAt

  notify_('Payment claimed ' + orderId, [
    'UTR/ref: ' + utr,
    'Check your UPI app, then set status VERIFIED in the Sheet.',
  ]);
  return { ok: true, orderId: orderId, status: 'CLAIMED' };
}

/* ============ Qikink dropshipping connector (inert until POD_ENABLED=1) ====
 * Activation (SETUP.md §6): create the Qikink account, upload designs, put
 * per-size SKUs in Stock!I:M, set Script Properties QIKINK_CLIENT_ID /
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
    if (sh.getName() !== ORDERS || e.range.getColumn() !== 3) return;
    if (String(e.range.getValue()) !== 'VERIFIED') return;
    if (props_().POD_ENABLED !== '1') return;
    podDispatch_(e.range.getRow());
  } catch (err) {
    notify_('POD dispatch failed', [String(err)]);
  }
}

function podDispatch_(row) {
  var os = sheet_(ORDERS);
  var r = os.getRange(row, 1, 1, 23).getValues()[0];
  if (r[20]) return;                                        // U: podOrderId already set
  var deliveryMode = String(r[18] || 'hostel');
  var p = props_();
  var sku = podSku_(String(r[3]), String(r[5]));
  if (!sku) { os.getRange(row, 23).setValue('NO_SKU'); return; }

  var shipTo = deliveryMode === 'ship'
    ? { name: String(r[10]), phone: String(r[12]), address: String(r[19]) }
    : { name: p.UPI_PAYEE || 'Owner', phone: p.OWNER_PHONE || '', address: p.OWNER_ADDRESS || '' };

  // TODO(sandbox): pin exact payload field names against Qikink's docs.
  var payload = {
    order_number: String(r[0]),
    payment_type: 'prepaid',
    line_items: [{ sku: sku, quantity: Number(r[6]) }],
    shipping_address: shipTo,
  };
  var res = UrlFetchApp.fetch(podBase_() + '/api/order/create', {
    method: 'post', contentType: 'application/json',
    headers: podAuthHeaders_(), payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  var body = safeJson_(res.getContentText());
  if (res.getResponseCode() < 300 && body) {
    os.getRange(row, 21).setValue(String(body.order_id || body.id || 'OK')); // U
    os.getRange(row, 23).setValue('DISPATCHED');                              // W
    notify_('Qikink order placed for ' + r[0], ['Supplier ref: ' + (body.order_id || body.id || '?')]);
  } else {
    os.getRange(row, 23).setValue('DISPATCH_FAILED ' + res.getResponseCode());
    notify_('Qikink dispatch FAILED for ' + r[0], [res.getContentText().slice(0, 500)]);
  }
}

function podPoll_() {                        // time-driven trigger (6h)
  if (props_().POD_ENABLED !== '1') return;
  var os = sheet_(ORDERS);
  var data = os.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var podId = data[i][20], podStatus = String(data[i][22] || '');
    if (!podId || podStatus.indexOf('DELIVERED') === 0) continue;
    // TODO(sandbox): pin exact status endpoint + fields against Qikink's docs.
    var res = UrlFetchApp.fetch(podBase_() + '/api/order/status?order_id=' + encodeURIComponent(podId), {
      headers: podAuthHeaders_(), muteHttpExceptions: true,
    });
    var body = safeJson_(res.getContentText());
    if (body && body.status) {
      os.getRange(i + 1, 23).setValue(String(body.status));
      if (body.tracking_number || body.awb) {
        os.getRange(i + 1, 22).setValue(String(body.courier || '') + ' ' + String(body.tracking_number || body.awb));
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
    if (String(rows[i][0]) === designId) return String(rows[i][8 + SIZES.indexOf(size)] || ''); // I:M
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

  os.getRange(1, 1, 1, 23).setValues([[
    'orderId', 'createdAt', 'status', 'designId', 'designTitle', 'size', 'qty',
    'unitPrice', 'amount', 'amountClientShown', 'buyerName', 'room', 'phone',
    'note', 'self', 'utr', 'claimedAt', 'adminNotes',
    'deliveryMode', 'address', 'podOrderId', 'tracking', 'podStatus',
  ]]).setFontWeight('bold');
  os.setFrozenRows(1);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
  os.getRange('C2:C1000').setDataValidation(rule);
  setStatusColors_(os);

  st.getRange(1, 1, 1, 13).setValues([[
    'designId', 'title', 'price', 'S', 'M', 'L', 'XL', 'XXL',
    'podSkuS', 'podSkuM', 'podSkuL', 'podSkuXL', 'podSkuXXL',
  ]]).setFontWeight('bold');
  st.setFrozenRows(1);
  if (st.getLastRow() < 2) {
    var seed = [
      ['agent-01'], ['agent-02'], ['agent-03'], ['agent-04'],
      ['reject-01'], ['reject-02'], ['reject-03'], ['reject-04'],
      ['hunt-01'], ['hunt-02'], ['hunt-03'], ['hunt-04'],
    ].map(function (r) { return [r[0], '', 0, 0, 0, 0, 0, 0, '', '', '', '', '']; });
    st.getRange(2, 1, seed.length, 13).setValues(seed);
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
