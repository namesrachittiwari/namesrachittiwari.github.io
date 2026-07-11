# JobHunt — Session 0 Kickoff Report (2026-07-11/12)

Filed in this repo only because it is the sole repo the cloud session can write to.
This file replaces the `question` issues I was instructed to open: issue creation
returned `403 Resource not accessible by integration` (the Claude GitHub App has
no Issues permission), and both JobHunt repos are unreachable (details below).
Delete this file once the blockers are cleared.

---

## 1. Root blocker — everything else is downstream of this

The cloud session's GitHub credential was denied on both:

- `add_repo namesrachittiwari/jobhunt-backend` → "you don't have access"
- `add_repo namesrachittiwari/jobhunt-frontend` → "you don't have access"

It can only see 4 public repos (`namesrachittiwari.github.io`, `matrix-resume`,
`contra-resume`, `academy-booking`). A private repo without app access is
indistinguishable from a repo that doesn't exist, so either:

1. **Most likely:** the repos exist but the Claude GitHub App is not installed on them.
2. **Rule out:** the laptop migration's push never actually landed.

### Phone fix (~2 minutes)

1. github.com → avatar → **Settings → Applications → Installed GitHub Apps → Claude → Configure**.
2. Under **Repository access**: add `jobhunt-backend` and `jobhunt-frontend`
   (or select All repositories). While there, also grant the app
   **Issues: Read & write** so the question-issue protocol works.
3. Verify on github.com that `jobhunt-backend` really has ~121 files including
   `CLAUDE.md` + `BACKEND_PACK.md`, and `jobhunt-frontend` has `CLAUDE.md` + its
   pack (handover step 2 — adding the packs from the Fable chat — was still on
   your phone to-do list; if the packs aren't in the repos yet, no build can start).
4. Start a fresh cloud session pointed at `jobhunt-backend`.

## 2. Build order — confirmed as specified

**jobhunt-backend first:**

1. Session 1: read `CLAUDE.md` + `BACKEND_PACK.md` fully → create `REPO_MAP.md`
   (one line per module) → generate `openapi.yaml` from BACKEND_PACK.md §2 →
   commit as frozen contract truth.
2. B1 → B10 in harness order, **B7 last and alone**.

**jobhunt-frontend in the gaps:**

1. Status page + GitHub Pages deploy.
2. `DESIGN.md` + `PRODUCT.md` via Impeccable.
3. Mock layer.
4. F1 → F9 in harness order, consuming `openapi.yaml` strictly read-only.

**Working method (binding):** orchestrator reviews only; Sonnet subagents execute
all well-specified work; Opus only where the harness names it. One module per
work stream. Every module ends with: commit + `PROGRESS.md` + `BUILD.md` +
`docs/status.html` + recommendation to start a fresh session. Plan mode (with
your approval) for any module estimated over one day.

**Hard rules acknowledged:** reuse the existing 21k LOC / 573 tests, never
rewrite tested modules without asking; never fabricate — `UNSCORED`,
`UNSCRAPED`, escalate, or ask; full-auto submit on ATS forms + email only,
logged-in platforms always park at one-tap confirm; everything deploys via
GitHub Actions; any step needing a human terminal is a design failure and gets
a phone path.

## 3. Port-vs-new-build list — deferred, cannot be produced honestly yet

The list requires reading `BACKEND_PACK.md` and the actual 21k LOC / 573 tests
to name source files. None of that is reachable from this session, and the
packs' no-fabrication rule forbids guessing it. It will be the first deliverable
(inside `REPO_MAP.md`) of the first real backend session, before `openapi.yaml`
is frozen.

## 4. Blocker list for the first three modules

| # | Blocker | Blocks | Fix |
|---|---------|--------|-----|
| 1 | Claude GitHub App not installed on `jobhunt-backend`/`jobhunt-frontend` | everything | §1 phone fix |
| 2 | App has no Issues write permission (403 on issue creation) | the question-issue protocol itself | grant Issues R/W in the same app-config screen |
| 3 | Unverified that pack files (`BACKEND_PACK.md`, frontend pack) were actually added to the repos | openapi.yaml freeze, DESIGN/PRODUCT, all modules | check on github.com while doing §1 |
| 4 | Handover note: OpenRouter credit is empty | not modules 1–3, but B-modules that call the agent's LLM brain will fail their live tests | top up openrouter.ai when convenient |

Nothing else can be determined until the packs are readable.
