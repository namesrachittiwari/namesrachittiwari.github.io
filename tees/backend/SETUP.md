# Pokie Tees — one-time backend setup

The store at `/tees` is static (GitHub Pages). Its "server" is a free Google
Apps Script web app bound to a Google Sheet in **your** Google account. This is
the only part Claude cannot create for you — it must run as you. Budget ~10
minutes for §1–4. §6 (dropshipping) is separate and optional to start.

**What's automated once this is done:** order capture, server-side totals,
stock decrement + sold-out states, the order book, email/Telegram pings, UPI
reference capture, and (with §6) print + ship + tracking.
**What stays manual forever:** *verifying* payments (personal UPI has no API —
you check your UPI app and flip one cell), refunds, restocking counts.

---

## 1. Create the Sheet + script

1. Go to `sheets.new` → name it **Pokie Tees — Orders**.
2. Extensions → **Apps Script** → delete the placeholder → paste all of
   `Code.gs` (this folder) → save.
3. In the editor's function dropdown pick **`setupSheet`** → Run → grant the
   permissions it asks for. This builds both tabs — `Orders` (status dropdown +
   colours) and `Stock` (12 seeded design rows + the `custom-line` row for
   Studio tees) — so you never hand-build columns.

## 2. Script Properties (Project Settings ⚙ → Script Properties)

| Property | Value |
|---|---|
| `SECRET` | any random string, e.g. from a password generator — must match `CONFIG.SECRET` in `tees/tees.js` |
| `NOTIFY_EMAIL` | `rachittiwari10@gmail.com` |
| `UPI_VPA` | your UPI id, e.g. `rachit@okaxis` — served to the pay screen, **never committed to the repo** |
| `UPI_PAYEE` | `Rachit Tiwari` |
| `TELEGRAM_TOKEN` *(optional)* | from @BotFather, if you want Telegram pings |
| `TELEGRAM_CHAT_ID` *(optional)* | message your bot once, then read the id from `api.telegram.org/bot<TOKEN>/getUpdates` |

## 3. Deploy

Deploy → **New deployment** → type **Web app** →
Execute as: **Me** · Who has access: **Anyone** → Deploy → copy the
`https://script.google.com/macros/s/…/exec` URL.

> Gotcha that bites everyone: after editing code later, the URL only updates
> behaviour via **Deploy → Manage deployments → ✏ edit → Version: New
> version**. Creating a brand-new deployment mints a *different* URL.

## 4. Smoke-test from any terminal

```bash
# availability (expect {"ok":true,...})
curl -sL '<EXEC_URL>'

# test order (expect {"ok":true,"orderId":"PT-TEST-01","total":2980,...}; a row
# appears in Orders, stock for agent-01/M drops by 2, and you get the email)
curl -sL -X POST '<EXEC_URL>' -H 'Content-Type: text/plain' --data '{
  "type":"order","secret":"<SECRET>","orderId":"PT-TEST-01",
  "items":[{"designId":"agent-01","size":"M","qty":2}],
  "deliveryMode":"hostel","payMode":"upi","amountShown":2980,
  "buyer":{"name":"Smoke Test","room":"H0-000","phone":"9999999999"},
  "note":"delete me","self":true,"hp":"","t":9999}'
```

Delete the test row and restore the stock count afterwards.

## 5. Wire the site

Hand over (or edit `tees/tees.js` yourself): the `/exec` URL → `CONFIG.ENDPOINT`,
the secret → `CONFIG.SECRET`, your WhatsApp number (digits with country code,
e.g. `9198…`) → `CONFIG.WHATSAPP`. Also export your UPI QR from
GPay/PhonePe/Paytm (Receive → save QR) and replace `tees/assets/upi-qr.png`.
Note: committing the QR publishes your VPA — inherent to selling with a public
QR. Then fill real `price` + size counts (XS–2XL) in the `Stock` tab and go
live. Two seeded rows to know about: **`hunt-01` ("Still Hunting") at 0 stock
is the storefront's running joke** — leave it at 0 to keep the "Out of stock
(relatable)" gag, or stock it to sell it; and **`custom-line`** prices the
Studio "write your own" tees (its size cells stay blank — customs aren't
stock-tracked).

**Daily operation is one gesture:** order lands (email/Telegram ping) → buyer's
UTR arrives → check your UPI app → flip the row's status to **VERIFIED** →
later PRINTED → DELIVERED. Stock decrements itself; restock by editing counts.

---

## 6. Dropshipping (Qikink) — optional, activate whenever

The connector already lives in `Code.gs`, disabled. Your VERIFIED flip is what
releases each print job, so checkout can never spend your prepaid wallet.

1. Create a **Qikink** account (their own docs state GST is optional until
   ₹40L turnover — confirm at signup; policies change). Upload each design in
   their panel; note the per-size SKUs.
2. Paste those SKUs into `Stock` columns `podSkuXS…podSku2XL`.
   Studio custom tees have no pre-made SKU: when a VERIFIED order contains a
   custom line you get a notification to place that line by hand in the
   Qikink panel (their custom-order API is a later upgrade).
3. Script Properties to add: `QIKINK_CLIENT_ID`, `QIKINK_CLIENT_SECRET`,
   `POD_BASE` = `https://sandbox.qikink.com` (test) then
   `https://api.qikink.com` (live), `POD_ENABLED` = `1`, and for hostel-mode
   shipments to yourself: `OWNER_PHONE`, `OWNER_ADDRESS`.
4. Run **`setupTriggers`** once (installs the VERIFIED-flip trigger + 6-hourly
   tracking poll).
5. Test in sandbox first, then top up the wallet, switch `POD_BASE` to live,
   and run one real self-order end to end (`/tees/?self=1`).

The two `TODO(sandbox)` markers in `Code.gs` (order-create payload, status
endpoint fields) get pinned against Qikink's Postman docs
(`documenter.getpostman.com/view/26157218/2sB3QKqpma`) during the sandbox test
— field names in their API occasionally differ from the docs, so this is
deliberately verified live rather than guessed.

---

*Fine print: casual, small-scale selling below India's GST registration
thresholds doesn't require GST registration. This is not tax advice.*
