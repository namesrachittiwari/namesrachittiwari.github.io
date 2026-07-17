# JOBHUNT_CONTINUITY.md — cross-session resume pack

Last updated: 2026-07-17 · era: **harness definition (pre-build)** · maintained by the working agent session.
Lives on branch `claude/job-app-finding-architecture-0e30h1` of `namesrachittiwari.github.io` (the always-writable repo; jobhunt-backend `main` stays clean until the harness is ratified — after ratification this file's contents migrate to the harness home chosen in decision D1 and this file becomes a pointer).

**If you are a fresh Claude session resuming JobHunt: read this entire file first, then follow §0. Never restart from zero.**

---

## 0. Resume protocol (fresh session, in order)

1. Add + clone both private repos (access was fixed 2026-07-17; `add_repo` works):
   `namesrachittiwari/jobhunt-backend`, `namesrachittiwari/jobhunt-frontend` (frontend is EMPTY, 0 commits — expected).
2. In jobhunt-backend read, in order: `REPO_MAP.md` → `PROGRESS.md` → `BUILD.md` → `CLAUDE.md` → `BACKEND_PACK.md`. That is the canonical build state; this file does not duplicate it.
3. Re-attach the **review console** (user-mandated, see §2.1): artifact titled "JobHunt — Session Review" at
   `https://claude.ai/code/artifact/7c8a2e50-6e79-4301-a50f-f0e19717f27a`.
   From a new conversation, update it by passing that URL as the `url` parameter of the Artifact tool (or find it via Artifact `action: "list"`). Every substantive reply redeploys it as a versioned, annotatable brief. Keep the 🎯 favicon and the title stable.
4. Check §3: if the harness is still UNRATIFIED, do **not** build — re-present the open decisions and wait for the user's picks (they may arrive as pasted console feedback, format: `JobHunt review feedback (vN): - [section] PICKED/AGREE/CHANGE — note: "..."`).
5. At session end — and proactively whenever context feels near exhaustion — update this file (or its post-ratification successor) and push. That is a standing rule (§2.3).

## 1. State snapshot (2026-07-17)

- **jobhunt-backend** (private): ~29.3k LOC Python, 573 passing tests, mature docs. Cloud rebuild status: C0 API contract FROZEN (`openapi.yaml` v1.0.1, 46 paths); B1 cloud base CODE COMPLETE (commit 9b64c50) awaiting live acceptance; B2–B10 pending. Frozen order: B2 → [B3,B4,B9] → [B5,B6,B8] → B10 → B7 alone → integration.
- **jobhunt-frontend** (private): EMPTY. Frontend pack never landed (Session-0 handover step that was missed). Blocked on decision D5.
- **namesrachittiwari.github.io**: joke landing page on `master`; Session-0 kickoff report on branch `claude/jobhunt-setup-build-order-e24k0c` (superseded by this file — that branch is deletable after harness ratification); this file on `claude/job-app-finding-architecture-0e30h1`.
- **Open GitHub issue**: jobhunt-backend #3 — five user-side resources for B1 live acceptance (Hetzner CX32 VPS + IP, DNS A record `api`→IP, Discord webhook, Indian residential proxy, repo secrets incl. `VPS_HOST`, `VPS_SSH_KEY`, `DISCORD_WEBHOOK_URL`, proxy creds, `AUTH_EMAIL/PASSWORD`, `OPENROUTER_API_KEY`). Blocks B1 live verification only, not code.
- Other user-side laters: OpenRouter top-up (B4+ live LLM tests), Gmail OAuth re-consent (B8), Backblaze + UptimeRobot (B9), Apify token (B4).

## 2. Binding decisions from the current chat (user-mandated, already in force)

1. **Review console loop**: every substantive agent reply publishes/updates the annotatable review page (URL in §0.3). User annotates (agree/change/question + notes + decision picks) and pastes compiled feedback back into chat; that feedback is binding input and gets logged.
2. **Harness first**: no build work (B2 etc.) until the Agent Harness is ratified by the user.
3. **Continuity protocol** (this file): the working session persists chat-level decisions + state to git so a fresh chat resumes with zero loss. Update cadence: at session end and before context exhaustion. This becomes harness rule L2 at ratification.

## 3. Agent Harness draft v0.1 — status: UNRATIFIED (published on console as v2, 2026-07-17)

Governs HOW agents work; BACKEND_PACK.md governs WHAT gets built. On conflict: user's words → pack → harness → repo CLAUDE.md → agent judgment; structural conflicts stop and ask.

- **L0 Scope & precedence**: harness applies to every agent session on all three repos; versioned + frozen like the API contract (changes only via explicit user approval, amendments logged).
- **L1 Roles & models**: Fable 5 orchestrator (plan, decompose, review, integration, all commits; writes no bulk code a subagent can). Subagents with explicitly pinned models (inheritance bug 07-07); one module per stream; shared/integration files orchestrator-only; ambiguity → stop and return the question, never invent.
- **L2 Session lifecycle**: start ritual = REPO_MAP → PROGRESS → BUILD + verify test baseline; plan gate for modules >1 day (plan to console for approval); end ritual in the same commit = tests green + live-verify → commit (module id in message) → PROGRESS entry → BUILD refresh → docs/status.html update → fresh-session recommendation when heavy. Plus continuity rule §2.3. One module per session, finished or cleanly parked.
- **L3 Communication & review loop**: console per reply (§2.1); questions = GitHub issue labeled `question` + console decision card + status.html, pausing only the affected stream; phone-only invariant (no human-terminal steps, ever — every op gets a phone path); surfaces: console=review/decide, status.html=live state, PROGRESS=history, BUILD=current, Discord=alerts only.
- **L4 Quality gates**: (1) all tests green pre-commit, baseline never drops; (2) live-verify the actual behavior pre-commit, not just tests; (3) module DoD = pack §4 on the VPS, local green ≠ done; no silent anything (UNSCORED/UNSCRAPED/escalate, caps announced).
- **L5 Product guardrails** (restated from frozen pack §1; changes are pack amendments): reuse over rewrite; never fabricate (resume bullets trace to vault evidence ids); auto-submit only Greenhouse/Lever/Ashby forms + email, logged-in platforms park at one-tap; loud failures → Discord; browser sources 9am–9pm IST + human pacing + captcha→human + daily cap 8; vault/memory writes only via accepted proposals; secrets only in env.
- **L6 Doc homes**: backend CLAUDE.md exists (amend to point at harness home); frontend CLAUDE.md missing (create at ratification: openapi.yaml strictly read-only, mock-first, GitHub Pages deploys); landing repo = pointer only.

### Open decisions (user picks pending — recommendations first)
- **D1 harness home**: (rec) `HARNESS.md` in jobhunt-backend + CLAUDE.md pointers | full copy per repo | separate ops repo.
- **D2 branch policy once push-to-main deploys**: (rec) module branches `module/bN`, merge to main at module DoD | keep trunk-to-main | defer to B1 live acceptance.
- **D3 subagent models**: (rec) Sonnet for well-specified + Opus for hard (pack §0 default) | all Opus | Sonnet-first escalate on failure.
- **D4 adversarial review gate**: (rec) every module before DoD (07-08 audit found 15 real bugs tests missed) | only B7 + final integration | per parallel wave.
- **D5 frontend pack**: (rec) agent derives FRONTEND_PACK.md + DESIGN/PRODUCT drafts from frozen openapi.yaml, user ratifies via console | user supplies original pack from the Fable chat (wins if it exists).

### Also open — wireframe decisions (console v3→v4, 2026-07-17)
The console contains the full frontend wireframe: 9 phone-first screens (S1 Needs-You home, S2 jobs feed, S3 job detail w/ evidence map, S4 doc review, S5 applications+confirm queue, S6 pipeline board, S7 sources health+repair, S8 vault+memory, S9 settings+system), each mapped to frozen openapi.yaml routes — step one of the D5-recommended derived frontend pack. New open decisions: **W1** landing screen (rec: Needs-You home | jobs feed | pipeline) and **W2** bottom tabs (rec: Home·Jobs·Pipeline·More | Applications as first-class tab).

### Feedback channel (console v4, 2026-07-17 — user-mandated, no copy-paste)
Console v4 annotation model: every section card has 👍 Looks-good / 💬 Comment buttons; decisions are tap-to-pick; a **Send to Claude** button writes the compiled feedback into the user's **Google Drive** via the artifact `mcp` capability (declared: `{mcp:{servers:[{server:"Google Drive",tools:["create_file"]}]}}`, runtime contract 0.1.12). Call shape verified live this session: `create_file {title, textContent, contentMimeType:'text/plain'}` → converts to a Google Doc. File naming: `JobHunt Feedback — v4 — <ISO timestamp>`.
**Agent retrieval protocol (binding): at the start of every turn after the user returns, search Drive** — `mcp__Google_Drive__search_files` with query `title contains 'JobHunt Feedback' and owner = 'me'` — read any file newer than the last processed one (`read_file_content` or the search contentSnippet), act on it, and log which files were processed here or in PROGRESS.md. Copy-paste fallback still exists on the page ("copy instead"). The user's claude.ai connectors (for future capability work): Canva, Figma, Gmail, Google Calendar, Google Drive, Jam — NO GitHub connector, which is why Drive is the channel.
Processed so far: none (channel-test doc 2026-07-17 only, not feedback).

### Ratification path
User annotates/picks → agent resolves changes in next console version → on approval commit harness v1.0 to its D1 home + amended backend CLAUDE.md + new frontend CLAUDE.md, PROGRESS.md logs the approval verbatim → build resumes (B2 was the recommended lane, user pick still open).

## 3b. Conversation topology (user decision 2026-07-17) + meetyoinky recon status
Two tracks: **Backend = the existing Claude Code session** (this continuity file's owner); **Frontend/Design = a separate claude.ai conversation** using the Figma connector (there is no "claude-design" MCP on this account — Figma is the design surface; its mobile app gives phone commenting).
**meetyoinky.com 1:1 recreation task — BLOCKED in the backend session:** the environment's network egress policy 403s general web CONNECTs (meetyoinky.com, google.com, web.archive.org all denied at the gateway), the site 403s the harness WebFetch and reader proxies (bot protection), and it is absent from search indexes. Playwright itself works (pre-provisioned Chromium launches; recon script ready in-session at scratchpad/recon/recon.js — trivially re-derivable). No fabrication: no tokens or Figma file were invented.
Unblock paths: **(A — recommended)** run recon+design in the Frontend conversation: user attaches full-page phone screenshots (desktop-mode + mobile) or claude.ai fetches the site; derive design_tokens.md; build Figma desktop 1440 + mobile 390 artboards; fidelity-first; numbered assumptions; share Figma link for phone comments. **(B)** user saves full-page screenshots to Google Drive; backend session reads them (read_file_content supports png/jpeg) and drives the Figma build itself. **(C)** recreate the environment with a permissive network policy.
⚠ **Backend implication of the same egress policy:** future B-module live verifications (scrapers, LLM calls, VPS reachability tests) from THIS environment will hit the same wall — live testing must run on the VPS via GitHub Actions (already the plan) or in a permissive-network environment. Do not burn sessions debugging "broken scrapers" that are actually gateway 403s.

## 4. Pending user actions (phone-doable)
1. Ratify the harness: pick D1–D5 + agree/change per layer on the console, paste feedback (or just reply in chat).
2. Issue #3 checklist (unblocks B1 live acceptance; ~15 min for VPS+DNS+webhook).
3. Decide the build lane after ratification (B2 recommended).
