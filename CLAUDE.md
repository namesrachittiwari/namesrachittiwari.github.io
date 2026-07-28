# namesrachittiwari.github.io

Personal GitHub Pages site for Rachit Tiwari. Root `index.html` is the personal
landing page (dark, Inter/JetBrains Mono) — do not restyle it when working on
other projects.

## Job Pilot (`/jobhunt/`)

A satirical AI job-hunt product: a Yoinky-inspired marketing site wrapped around
a ChatGPT-style app. Pure static HTML/CSS/JS — **no build step, no framework**.
Each page is self-contained; shared assets live in `jobhunt/fonts/` and
`jobhunt/vendor/`.

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

### Design tokens (extracted from the Yoinky reference)

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
  lenis.min.js + lenis.css — self-hosted because the proxy blocks CDNs. Motion
  must always degrade: no-JS/reduced-motion leaves the page fully readable.

### Verifying changes

Headless Chromium is at `/opt/pw-browsers/chromium`; Playwright is installed
globally (`NODE_PATH=$(npm root -g)`). Gotcha: raw `chromium --headless
--window-size=390,...` clamps to a 500px-wide window — use Playwright viewport
emulation for mobile checks. `file://` font preloads log CORS errors that
disappear over HTTP; they are noise. Check `document.scrollingElement.scrollWidth`
=== viewport width to catch horizontal overflow.

### Git

Work happens on `claude/job-hunt-frontend-*` branches, pushed with
`git push -u origin <branch>`. Never commit to `master` directly.

## Pokie (`/pokie/`)

Autonomous job-finding agent UI built from the "Pokie — Design Handoff" spec.
Dark theme: `#070707` bg, `#0B0B0B` panels, Poppins (own copy in
`pokie/fonts/`). Semantic colours: pink `#EB6BA8` (Pokie/destructive), green
`#1CE15F` (matched/auto), blue `#4791FF` (running), yellow `#ECE42E` (needs
you). `index.html` = shell + all CSS; `pokie.js` = data (verbatim from the
handoff view model), hash router (`#welcome ... #history`), screen renderers,
run simulation, interactions. Cold screens (welcome/onboard) render without
the rail. Below 900px the rail collapses to the 5-tab mobile bar and jobs
becomes list→detail push; `#brief` is the mobile morning-brief screen.
