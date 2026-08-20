# namesrachittiwari.github.io

Personal GitHub Pages site for Rachit Tiwari (rachittiwari.com). Pure static
HTML/CSS/JS — **no build step, no framework**. Each page is self-contained.

| Path | What it is | System |
|---|---|---|
| `/` (`index.html`) | Personal landing page | **Shared dark system** (below) |
| `/tees` | Pokie Tees store (v7 design; see its section below) | **Exception**: v7 handoff tokens (bg `#000`, Bebas Neue print font) |
| `/jobhunt/` | Job Pilot — satirical AI job-hunt product | **Exception**: own cream system |
| `/pokie/` | Pokie job agent (staging copy) | Shared dark system |

The live Pokie is a **separate repo** — `namesrachittiwari/pokie`, `gh-pages`
branch, serving pokie.rachittiwari.com. The `/pokie/` folder here is a second
copy; changing one does not change the other.

---

## Design system — the default for this repo

**Use this unless you are working inside `/jobhunt/`.** The root landing page
and Pokie share this token set exactly; anything new (including Pokie Tees)
inherits it.

### Colour

| Token | Value | Role |
|---|---|---|
| `--black` | `#070707` | Page background |
| `--panel` | `#0B0B0B` | Cards, panels |
| `--panel-hov` | `#141414` | Panel hover |
| `--elev` | `#212121` | Raised surface |
| `--text` | `#ffffff` | Primary text |
| `--t2` | `#9A9A9A` | Secondary text |
| `--t3` | `#5c5c5c` | Tertiary / disabled |
| `--t4` | `#3a3a3a` | Faintest |
| `--pink` | `#EB6BA8` | Pokie brand + primary accent |
| `--green` | `#1CE15F` | Matched / auto / success |
| `--blue` | `#4791FF` | Running / in-progress |
| `--yellow` | `#ECE42E` | Needs-you / attention |
| `--hair` | `rgba(255,255,255,.07)` | Hairline dividers |
| `--border` | `rgba(255,255,255,.09)` | Default border |
| `--bstrong` | `rgba(255,255,255,.14)` | Emphasised border |
| `--bstronger` | `rgba(255,255,255,.22)` | Strongest border |

Pink/green/blue/yellow carry **status meaning** in Pokie. Don't reuse them
decoratively — it reads as status noise. Stay on pink + neutrals unless the
semantics apply.

### Type

**Poppins, weights 400/500/600 only.** No other family anywhere in this system.
Stack: `'Poppins', system-ui, sans-serif`. The root page loads it from Google
Fonts; Pokie self-hosts woff2 in `pokie/fonts/`. Prefer self-hosting for new
pages — the proxy blocks CDNs.

### Shape

Pills and circles are the signature — everything interactive is fully rounded,
nothing is square. Radii in use: `999px`/`99px` (buttons, chips, tags), `50%`
(avatars, icon chips), `9–10px` (cards, inputs), `2–6px` (bars, indicators).

### Motion

- Signature easing: **`cubic-bezier(.16,1,.3,1)`** (Pokie's `--ease`). Use it for
  essentially everything.
- Durations: `.2s` hover/colour, `.22s` label reveal, `.3s` background,
  `.9s` loader panel.
- Idle-animation tempo is a **4s master loop** with sub-animations phase-locked
  to it (see the Tees launcher).
- **Motion must always degrade**: no-JS and `prefers-reduced-motion` leave the
  page fully readable and usable. Respected everywhere in this repo.

### Breakpoint

**820px** across the root page (`MOB = 820` in JS, matching media queries).
Pokie uses 900px internally.

---

## Root landing page (`/`)

Dark, Poppins, sticky top nav. Do not restyle it when working on other projects.

Nav order: Work · Ventures · Numbers · Capabilities · hobby-projects
disclosure (three-line icon → Tees; more rows to come) · Get in touch.
The five `#work` cards open **case-study overlays** on click (`data-case`
attr → `CASES` object in the end-of-body script; a new study = one object +
one attribute; the ventures cards deliberately have none).
`data-mob="…"` attributes on elements are inline-style overrides swapped
in below 820px by `applyMob()`; class-styled components don't need them.

### Hobby-projects disclosure + Pokie Tees glyph

Tees lives under **one three-line minimiser** (`details.more` `#moreMenu`,
owner-requested): a hamburger `summary` in the text-link group
that expands a `.more-menu` panel of icon+label rows on both breakpoints.
Native `<details>` = works without JS; a small end-of-body script adds
click-outside/Escape/after-click closing. Adding a hobby project = one more
`.more-item` row.

- Bar hierarchy is now: quiet text links → one three-line disclosure → one
  white CTA. (Historically two adjacent standalone pink glyphs always
  competed — the disclosure is what finally resolved it. Don't promote either
  glyph back into the bar.)
- Brand facts the Tees row fixes: name **Pokie Tees**, tagline **"one
  sentence, one tee"** (`aria-label`), label "Tees".
- The tee glyph's single chest bar is deliberate — one sentence, one tee. It
  types on once per 4s loop (the site's idle tempo, shared easing) and
  freezes on hover.
- **Never draw the glyph with hairline strokes.** At 20px an authored stroke
  resolves to fractional device pixels and antialiases to grey. It is a fill;
  the body's same-colour round-join stroke exists only to round corners. The
  bar is 2.4 viewBox units tall for the same reason — thinner merges to mush.
- The bar needs `transform-box: fill-box`, or `transform-origin` resolves
  against the SVG viewport instead of the bar.
- The mobile padding override needs `!important` to beat the inline style.

---

## Pokie Tees (`/tees/`)

Hobby tee store built pixel-perfect from the user's **v7 design handoff**
("Rachit_Pokie_Tees__Complete_Handoff.md" — high-fidelity, copy final).
A black-spotlight SPA: Shop (sidebar filters + photo grid), Product Detail
overlay, Archive (on-brand demand cards with pre-filled email interest), Studio (write-your-own line),
multi-item Cart drawer, Checkout → UPI pay screen → Placed.
`index.html` = static skeleton + all CSS; `tees.js` = state + renderers +
network layer.

- **Design-system exception**: uses the handoff's own tokens — bg `#000000`
  (not `--black`), accent `#EB6BA8`, borders `rgba(255,255,255,.18)`, Poppins
  UI. **Print theme (owner reference, supersedes the handoff's Bebas caps):**
  Poppins 600, sentence case, left-aligned, flat white, `white-space:
  pre-line` (sentences may carry explicit `\n` breaks); Bebas Neue stays
  self-hosted in `tees/fonts/` but unused. Signature: front/back product
  shots hard-cut every 1.8s (3.6s `teeFront`/`teeBack` loop, per-tile
  negative delays), print line in a fixed chest zone (33.5%/34%/28%,
  `container-type: inline-size`, cqw sizing via `sizeFor()` — tuned for
  Poppins widths).
- 12 tees + sold-out joke: `grind-02` "Attendance 74.9%." seeds at 0 stock — real
  availability drives sold-out everywhere; offline, only the joke shows out.
  Catalogue copy is the owner's v8 set (Delusion/Grind/Audacity collections,
  ids `del-*`/`grind-*`/`aud-*`) — it supersedes the handoff's job-hunt lines.
- **Image designs**: a tee with an `image` field (none currently in the
  catalogue — Stop Staring and the archive error visual were both added then
  reverted on the owner's ask) renders that artwork statically — no flip, no
  print overlay. Owner-pasted designs are recreated as square 1400px PNGs in
  `tees/assets/designs/` via the render-HTML-then-screenshot pipeline
  (chat-pasted images never land as files). Adding one = drop the PNG + one
  `TEES` line + one Stock seed row.
- **Backend is NOT in this repo's deploy**: a Google Apps Script web app +
  Sheet in the owner's account. Source and click-by-click setup live in
  `tees/backend/Code.gs` + `tees/backend/SETUP.md`. POSTs are text/plain JSON
  (no CORS preflight); errors always `{ok:false}` in a 200 body.
- **Contract v2 is multi-item**: `order` POST carries `items[]` (catalogue
  `{designId,size,qty}` or Studio `{custom:{text},size,qty}`), `deliveryMode`
  hostel|ship, `payMode` upi|cod (COD = hostel only; Card row is a disabled
  joke). One order = one Sheet row = one Qikink `line_items[]` dispatch.
  Sizes are XS–2XL. Shipping ₹79 under ₹2,500, free above, ship mode only.
- `tees.js` binds ONLY to `[data-tees="screen|detail|popup|cart|toast|status|
  resume|cartbtn|count"]` mounts + `[data-nav]` — a reskin replaces the shell,
  never the JS.
- `CONFIG` at the top of `tees.js` holds ENDPOINT/SECRET/WHATSAPP; empty
  ENDPOINT = fallback mode (browse works, orders go to WhatsApp/mailto).
  Owner's VPA is served by the backend, **never committed**.
- Payment verification is manual by design (personal UPI has no API); the
  owner's VERIFIED flip in the Sheet is also what triggers Qikink dispatch.
  Custom Studio lines have no SKU → flagged for manual POD placement.
- Qikink connector lives in Code.gs behind `POD_ENABLED`; the two
  `TODO(sandbox)` payload markers get pinned against Qikink's Postman docs
  during sandbox activation (SETUP.md §6).

## Job Pilot (`/jobhunt/`) — design-system exception

A satirical AI job-hunt product: a Yoinky-inspired marketing site wrapped around
a ChatGPT-style app. **This is the one area that does not use the dark system
above.** Shared assets live in `jobhunt/fonts/` and `jobhunt/vendor/`.

### Pages

| File | What it is |
|---|---|
| `jobhunt/index.html` | Landing page (hero scene, how-it-works carousel, feature rows, comparison, FAQ, dark footer). GSAP/Lenis motion layer at the bottom of the file. |
| `jobhunt/app.html` | ChatGPT-style app: sidebar, chat, composer, model picker, and the **Canvas** panel (job listings). Chat messages apply filters to the canvas. Logic in `app.js`. |
| `jobhunt/research.html` | Same shell as `app.html` with `<body data-autostart="deep">` — auto-runs the Deep Hunt (deep-research UI). **Generated**: never edit directly; regenerate with the sed command below after editing `app.html`. |
| `jobhunt/app.js` | All app logic: job data, chat intent parsing → filters, canvas rendering (cards/table), deep-hunt sequence (activity + sources tabs), toasts. Reads `?q=` and `?deep=1` URL params to auto-run a prompt. |
| `jobhunt/create.html` | "Pilot AI" prompt launcher (Framer-AI-concept style: light neutral UI, SVG robot mascot, prompt card, category chips, suggestions). Launches `app.html?q=…`. Self-contained, system font — not the Yoinky palette. |

Regenerate research.html after changing app.html:

```bash
cd jobhunt && sed 's|<title>Job Pilot — app</title>|<title>Job Pilot — deep hunt</title>|; s|<body>|<body data-autostart="deep">|' app.html > research.html
```

### Job Pilot design tokens (extracted from the Yoinky reference)

| Token | Value | Role |
|---|---|---|
| `--cream` | `#FBF1E6` | Page background |
| `--cream-2` | `#F4E7D6`/`#F6E8D8` | Second neutral (sidebar, table header) |
| `--ink` | `#1E1A16` | Text |
| `--gray` | `#A39A8E` / `#8B8172` | Dimmed serif headlines / muted UI |
| `--pink` | `#F0439B` (deep `#D42E86`, soft `#FCDDEE`) | The one accent: actions, selection, labels |
| `--dark` | `#121110` | Nav pill, footer |
| sunset | `#2E51D4 → #8F4CD1 → #FF7D93 → #FFB36B` | Hero scenes, avatars, glass-card backdrops |

- **Fonts** (self-hosted woff2 in `jobhunt/fonts/`, loaded via `fonts/fonts.css`):
  Fraunces 400–700 + italic (display serif — headlines only), Poppins 400/500/600
  (all UI). Never put the serif on buttons/labels/data.
- **Shapes**: pill buttons (`border-radius: 999px`), cards 18–28px radius,
  hairlines `#EBDFCC`.
- **Signature elements**: two-tone serif headlines (`ink` + `.dim` gray), pink
  label chips, glass cards (blur + translucent purple) over the SVG sunset
  scene (`<symbol id="landscape">` + CSS gradient sky), outline chips that turn
  pink when selected, dark chip marquee in the footer.
- **Vendor** (`jobhunt/vendor/`): gsap.min.js, ScrollTrigger.min.js,
  lenis.min.js + lenis.css — self-hosted because the proxy blocks CDNs.

---

## Pokie (`/pokie/`)

Autonomous job-finding agent UI built from the "Pokie — Design Handoff" spec.
Uses the shared dark system above. `index.html` = shell + all CSS; `pokie.js` =
data (verbatim from the handoff view model), hash router, screen renderers, run
simulation, interactions. Backend contract in `pokie/API.md` (REST + SSE); no
backend exists yet — all data is hardcoded and the live run is a timer.

**List density (owner-requested).** Chat answers and History are one row per
item on both breakpoints, not a card each: History rows are `time · one line ·
action` (the `detail` field is still carried in the data and by `api.js`, just
not rendered), and chat answers are `dot · title · meta · action →` with the
whole row acting as the primary action. Don't reintroduce per-row description
sub-lines. The timestamp stays visible on mobile — it used to be `display:none`
there, which was the main complaint. `.thread > * { flex-shrink:0 }` is
load-bearing: without it the thread's lists collapse instead of scrolling.

Routing: the app lands directly on `#chat`; there is no welcome screen. `onboard`
is the one cold screen (renders without the rail) and is reachable at `#onboard`.
Unknown hashes fall back to chat. Below 900px the rail collapses to a 5-tab
mobile bar, jobs becomes list→detail push, and `#brief` is the mobile
morning-brief screen.

---

## Verifying changes

Headless Chromium is at `/opt/pw-browsers/chromium`; Playwright is installed
globally (`NODE_PATH=$(npm root -g)`). Gotchas:

- Raw `chromium --headless --window-size=390,...` clamps to a 500px-wide window
  — use Playwright viewport emulation for mobile checks.
- `file://` font preloads log CORS errors that disappear over HTTP; noise.
- Check `document.scrollingElement.scrollWidth === window.innerWidth` to catch
  horizontal overflow.
- Playwright's actionability check waits for elements to be *stable*. Infinitely
  animated elements (the Tees chip) never settle — use `.hover({force: true})`,
  or inject `* { animation-play-state: paused !important }` before measuring.

## Git

Never commit to `master` directly. Work on a `claude/*` branch and push with
`git push -u origin <branch>`.
