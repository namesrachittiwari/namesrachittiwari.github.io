# JobHunt Frontend — Full Wireframe Spec v1

Phone-first web app at `jobs.rachittiwari.com`, consuming the frozen backend contract
(`jobhunt-backend/openapi.yaml`, v1.0.1, 46 endpoints) strictly read-only. Nothing in this
spec invents an API — every element maps to a contract route. Companion to
JOBHUNT_CONTINUITY.md; source for frontend design prompts.

## Design principles
1. **Needs-you-first** — the app's job is to need Rachit as little, and as clearly, as possible.
2. **Trust via proof** — every automatic action shows evidence (screenshots, field logs, evidence ids).
3. **Honesty visible** — UNSCORED/UNSCRAPED/gaps are explicit states in the UI, never hidden.
4. **One-thumb operation** — every critical action is a single tap reachable on a phone.

## Frozen enums (render exactly these)
- Application states (forward-only): `found → shortlisted → applying → applied → replied → oa → interview → offer` · terminal: `rejected`, `ghosted`
- Tiers: `hot | warm | cool` · Platform class: `ats_auto | one_tap | email`
- Score state: `scored | unscored` · Source health: `healthy | degraded | session_expired | needs_login | disabled`
- WebSocket `/ws` events: `needs_you`, `sweep_progress`, `escalation`, `state_change`, `alert`

---

## S1 · Home — "Needs You"
Purpose: to-do list, worst first. Landing screen (pending decision W1).

```
┌──────────────────────────────┐
│ JobHunt      ● running  $spend│  header: agent status + today's spend
├──────────────────────────────┤
│ ⚠ 3 confirms waiting        →│  red card, tap → S5 confirm queue
│ 2 doc reviews               →│  tap → S4
│ 1 escalation                →│  tap → S5 escalation answer
│ 1 broken source (linkedin)  →│  tap → S7 repair
│ 1 profile gap (blocks 4)    →│  tap → S8 gap fill
├──────────────────────────────┤
│ today: 12 found · 3 applied  │  compact activity strip
│ · 1 reply · sweep 14:00 ✓    │
├──────────────────────────────┤
│ ⌂ home  ⚲ jobs  ▤ pipeline ⚙ │  bottom tabs (pending decision W2)
└──────────────────────────────┘
```
Data: WS `needs_you` + `GET /applications/confirm_queue`, `GET /reviews/pending`,
`GET /sources/health`, `GET /vault/gaps`, `GET /activity/log`.
Empty state: "Nothing needs you. Agent is hunting." + today strip.

## S2 · Jobs feed
```
┌──────────────────────────────┐
│ Jobs        [search] [filter]│
│ [HOT 8] [warm 23] [cool 41]  │  tier chips = primary filter
│ score≥ · remote · geo · src  │  filter row (collapsible)
├──────────────────────────────┤
│ Senior PM — Stripe        91 │  card: title, company, score,
│ hot · greenhouse · 6h ago    │  tier, source, freshness,
│ ✦ auto-apply eligible        │  apply-class badge
├──────────────────────────────┤
│ PM Platform — Razorpay    84 │
│ hot · naukri · 22h · one-tap │
├──────────────────────────────┤
│ Product Lead — N26   UNSCORED│  unscored shown honestly, never a fake number
│ warm · wttj · 2d             │
│  … cursor pagination …       │
└──────────────────────────────┘
```
Data: `GET /jobs` (tier, min_score, geo, remote, source, cursor). Tap card → S3.

## S3 · Job detail
```
┌──────────────────────────────┐
│ Senior PM — Stripe  91 · hot │
│ [skills 88][domain 94]       │  4 subscore tiles
│ [seniority 90][logistics 85] │
├──────────────────────────────┤
│ requirement → your evidence  │  THE honesty table:
│ payments exp → ev#12 KYC ✓   │  each JD requirement mapped to a
│ b2b saas → ev#4 CRM ✓        │  vault evidence id, or shown as
│ SQL → gap (never in resume)  │  an explicit gap
├──────────────────────────────┤
│ JD summary · salary · link ↗ │
│ [ Generate docs → review ]   │  primary CTA → creates S4 review
│ [Dismiss(reason)] [Open ↗]   │
└──────────────────────────────┘
```
Data: `GET /jobs/{id}` (subscores + requirement→evidence map),
`POST /jobs/{id}/generate_docs`, `POST /jobs/{id}/dismiss {reason?}`.

## S4 · Doc review
```
┌──────────────────────────────┐
│ Review · Senior PM — Stripe  │
│ [resume][cover letter][answers]│ tabs per doc type
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │ one-page PDF preview   │  │  pinch-zoom; every bullet
│  │ bullet ← evidence id   │  │  traceable to vault evidence
│  └────────────────────────┘  │
│ ATS score 86 · keywords 9/11 │
├──────────────────────────────┤
│ [ Approve → queue apply ]    │  primary
│ [Revise + note]  [Reject]    │  revise note feeds memory proposals
└──────────────────────────────┘
```
Data: `GET /reviews/pending`, `GET /reviews/{id}` (docs by type),
`POST /reviews/{id}/approve | revise {note} | reject`.

## S5 · Applications & confirm queue
```
┌──────────────────────────────┐
│ Applications   [state filter]│
├──────────────────────────────┤
│ ⚠ CONFIRM · LinkedIn—Razorpay│  parked one_tap application
│ form filled · NOTHING SENT   │
│ ┌ full-form screenshot ────┐ │
│ [ Confirm & submit (1 tap) ] │  the one-tap moment
│ [Discard] [field-by-field log]│
├──────────────────────────────┤
│ ❓ ESCALATION                │
│ "Willing to relocate to Pune?"│
│ [answer box] → saved to Q&A, │  answered once, never re-asked
│ unblocks the application     │
├──────────────────────────────┤
│ applied · Stripe ✓ auto 09:12│  event trail + screenshots(2)
└──────────────────────────────┘
```
Data: `GET /applications` (state filter), `GET /applications/{id}` (event trail,
screenshots, fill log), `GET /applications/confirm_queue`,
`POST /applications/{id}/confirm | discard | answer_escalation {answer}`.

## S6 · Pipeline board
```
┌──────────────────────────────┐
│ Pipeline  funnel 214→38→12→3 │
│ ◄ swipe columns ►            │
│ [applied 12][replied 4][int 2]│ columns = frozen states
├──────────────────────────────┤
│ Stripe · interview Thu       │
│   brief ready →              │  interview transition auto-briefs
│ N26 · replied · followup d3  │
│ Razorpay · d12 · ghost in 2d │  auto-ghost countdown visible
└──────────────────────────────┘
```
Data: `GET /pipeline/board`, `GET /pipeline/funnel_stats`. States move forward only.

## S7 · Sources
```
┌──────────────────────────────┐
│ Sources   13 healthy · 1 ⚠   │
├──────────────────────────────┤
│ ⚠ linkedin · session_expired │
│ [ Repair → phone login tunnel]│  opens B1 session-repair URL
├──────────────────────────────┤
│ naukri · healthy · 14:00 · 22│  per-source: last sweep, found
│ iimjobs · healthy · 14:00 · 9│
│ greenhouse · 41 companies    │
│ deel · honest-empty          │  documented dead end shown as such
│ per-source: on/off · trust   │
└──────────────────────────────┘
```
Data: `GET /sources/health`, `POST /sources/{id}/toggle`,
`POST /sources/{id}/repair` (returns tunnel URL when repair active).

## S8 · Vault & memory
```
┌──────────────────────────────┐
│ Vault  profile·evidence·Q&A  │
├──────────────────────────────┤
│ ⚠ 2 gaps: notice period,     │
│   EU work auth · blocks 4    │
│   [ fill now ]               │
├──────────────────────────────┤
│ work evidence #1–23 [+ add]  │
│ Q&A bank (from escalations)  │
│ writing sample               │
├──────────────────────────────┤
│ Memory proposals (3)         │
│ "prefers remote-EU" ✓ ✗      │  accept/reject — NOTHING writes
│                              │  itself without user acceptance
└──────────────────────────────┘
```
Data: `/vault/*` (profile facts, work_evidence CRUD, qa_bank CRUD, writing_sample,
gaps), `/memory/proposals` + accept/reject, `/memory/facts`, `/memory/preferences`.

## S9 · Settings & system
```
┌──────────────────────────────┐
│ Settings                     │
│ auto threshold 85 · cap 8/day│  safety knobs
│ follow-up mode: auto         │
│ model routing frontier↔fast  │
├──────────────────────────────┤
│ System                       │
│ heartbeats api✓ sched✓ gmail✓│
│ backups 02:00✓ offsite✓      │
│ restore verified Sun         │
│ spend LLM $1.84 · proxy      │
│ push notifications ⏻         │
│ activity log (day-grouped) → │
└──────────────────────────────┘
```
Data: `GET/PUT /settings/safety`, `GET/PUT /settings/model_routing`,
`GET /system/heartbeats | backups | spend`, `GET /activity/log`,
`POST /push/subscribe`, `DELETE /push/unsubscribe`.

---

## Cross-cutting
- **Live updates:** WS `/ws` drives S1 badges, S2 sweep progress, S5 escalations,
  S6 state changes, global alert toasts.
- **Auth:** login (email+password) → bearer access+refresh (`/auth/login`, `/auth/refresh`).
  CORS locked to https://jobs.rachittiwari.com.
- **Errors:** single shape `{code, message, details}` → one toast/inline pattern.
- **Push:** web push for needs_you items (confirm, escalation, broken source).

## Open design decisions
- **W1 — landing screen:** Needs-You home (recommended) | jobs feed | pipeline.
- **W2 — bottom tabs:** Home·Jobs·Pipeline·More (recommended) | Applications as first-class tab.
- Visual identity (color, type, motion): unset — to be defined in the frontend/design track
  (Impeccable + claude-design), then locked in DESIGN.md.
