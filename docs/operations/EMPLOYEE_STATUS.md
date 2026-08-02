# EMPLOYEE STATUS

**Owner:** every employee updates their own row · **Last updated:** 2026-07-30 (Sentinel reconciliation)

Update your row at the **start** of your session (after claiming) and at the **end**
(before your handoff). A row that has not moved in a day is a signal, not a detail.

**If your Active task is empty:** read your charter in
[`TEAM_CHARTERS.md`](TEAM_CHARTERS.md) → *Default when idle* section, pick the next
item, and update your row. Do NOT ask the Founder. Ratified by DEC-011.

| Employee | Role | Active task | Status | Branch | Last commit | Last handoff | Updated |
|---|---|---|---|---|---|---|---|
| **Sentinel** | COO — operations, verification, prioritization | **NOW:** live-verify of Noah's `WM-VP-P0-01` fix (`e06ade9`) against Forge's 3 repro states — dispatched `2350-noah-to-sentinel-vp-live-verify.md`, session active. Prior (Aug 1): APPROVED `WM-CHART-P0-05` badges (`720355d`); published Session-VP not-reproduced finding. Row freshened by Atlas checkpoint — Sentinel, update on your own next commit. | ACTIVE | `main` | `720355d` | `handoffs/sentinel/2026-08-01-sentinel-p0-05-badge-visibility-verdict.md` | 2026-08-01 23:44 (Atlas refresh) |
| **Forge** | Build Continuity Lead — research, architecture, tickets, **and production engineering (DEC-008, 2026-07-28)** | **WM-SCANNER-RECONCILE-01 contract SHIPPED** — resolved the two-branch scanner collision. Corrected the baton premise (not 2 designs of 1 cache: 1 real cache-fork + 2 unique modules): **synthesis** = A's canonical `ScannerRsiIdentity` key + B's 15m-TTL eviction; **keep BOTH** `scannerRequestIdentity.ts` + `yahooCandleConsumer.ts`; take main's `e06ade9` WMSessionVP untouched. Baton → Noah. No DEC-014 needed (nothing regresses). | ACTIVE | `main` | (this commit) | `handoffs/forge/2026-08-01-forge-scanner-cache-reconciliation.md` | 2026-08-01 |
| **Noah** | Implementation engineer | **SHIPPED WM-VP-P0-01** (`e06ade9`) — Session VP now a pure projection of the chart's canonical candles; deleted internal /api/yahoo fetch, fixed F-A/F-B/F-C + dataVersion race guard. Pure logic → `src/lib/sessionVP.ts`; 5 tests. tsc clean, vitest 102/102, next build clean. Sentinel dispatched for live verify (auth-gated, mine can't self-capture). Prior: WM-UX-P0-01 (`0270590`, stays), WM-SEC-VIOLATION-01 revert (`627be87`). Next: WM-DRAW-P0-01 | ACTIVE | `main` | `e06ade9` | `handoffs/noah/2026-08-01-noah-wm-vp-p0-01-shipping.md` | 2026-08-01 23:50 |
| **Micah** | Experience / accessibility / WOW polish | 3 specs DELIVERED (draw, delta-panel migration, DEC-012 backfill verdicts) + dispatched to Noah at 0940; **also** authored the real `WM-A11Y-SCANNER-01` (shipped `866fc4b`, retiring phantom scanner-a11y gate) | HANDED OFF | `main` | `e5ef13b` (dispatch) | `handoffs/micah/2026-07-31-micah-wm-draw-p0-01-spec.md` (+2: `-wm-ux-p0-01-delta-panel-migration`, `-dec012-backfill-verdicts`) | 2026-07-31 09:40 |
| **Nehemiah** | Operations & critical path | **10:35 CDT sweep:** published Friday overnight ship list (Founder-glanceable, 7 landings + Session-VP dispute + SEC blockers); retired 2 satisfied Sentinel dispatches (627be87 closed the loop); filed **WM-CHART-P0-07** (Big Trades collision) + **WM-CHART-P0-05c** (water markers) queue rows; routed RISK-011 ID collision to Sentinel (register owner). RISK-012→013 already reconciled; "44%/27" retired. | ACTIVE | `main` | (this commit) | `handoffs/nehemiah/2026-07-31-nehemiah-risk-011-duplication-flag.md` | 2026-07-31 10:35 |
| **Atlas** | Knowledge indexing + Mission Control dispatches | 23:44 checkpoint: ratified **DEC-013** (assembly-line, per-surface); reconciled queue for Noah's `WM-VP-P0-01` ship (`e06ade9`); committed 3 stray untracked handoffs; no `src/` touched, no new violations. **Still carrying:** re-derive of circulated "company health" figures; the `0270590` live RETURN note from V-010 (not reverted per DEC-012's no-revert-if-code-works clause — Sentinel's `2026-08-01-sentinel-session-vp-regression-not-reproduced.md` since exonerated it). Violation count unchanged: **2 new, total 10.** | ACTIVE (coordinator) | `main` | `1e13877` (reconciled against) | none authored (dispatches/queue only) | 2026-08-01 23:44 |
| **Research Lab** | Interaction documentation, competitive analysis, evidence synthesis. **No production code.** | RL-RESEARCH-P1-01 (**BLOCKED — DEC-010**); DB-OPS-P1-01 evidence corrected | **BLOCKED — awaiting Founder ruling DEC-010** | ops bus `main` · subject `dreamboard` `origin/main` `2049bdd` | none authored (docs-only) | `handoffs/research/2026-07-28-research.md` | 2026-07-28 |
| **Video Intelligence** | Video/transcript intelligence + competitive gap analysis. **No production code.** | **VP Worlds deep-crawl DONE** — evidence: "VP Worlds"/"VP Wars" are NOT DeepCharts feature names (absent from help center/features/dxFeed/VP-lit/`src/`); `WM-VP-WORLDS-DEF-01` → BLOCKED awaiting Founder source pointer. Video intake `video-queue.md` created (`VI-WM-P0-03` open). Prior: gap matrix + 8 tickets (`79a9aaf`). | HANDED OFF | `main` | (this commit) | `handoffs/video-intelligence/2026-07-31-vi-vp-worlds-evidence.md` | 2026-08-01 |

## Role boundaries (binding)

- **Sentinel** — does not write production code. Verifies, prioritizes, assigns, documents,
  and returns work that lacks evidence.
- **Forge** — research, architecture, ticket authoring, **and production engineering on
  approved tickets** (DEC-008, 2026-07-28 — supersedes the earlier "no production code"
  restriction). Same discipline as Noah applies: one primary ticket at a time, no
  duplicating another employee's active claim, no scope expansion mid-ticket.
- **Noah** — implements approved tickets only. One primary task at a time. Does not expand
  scope mid-ticket; a discovered adjacent problem becomes a new queue entry, not an edit.
- **Atlas** — indexes **verified** findings only. Categories must stay separate: *verified
  fact* / *source observation* / *Founder intent* / *Forge recommendation* / *experimental
  idea* / *unverified claim*. **A proposed improvement does not become a company standard
  until Sentinel approves it.**
- **Research Lab** — documents interaction findings. No production code.

## Standing prohibitions — all employees

- Never enter the Founder's credentials, mint or forge a session token, or bypass auth.
- Never place a trade, submit an order, or change brokerage settings. tastytrade is a
  **live account** — read-only observation only.
- Never record account numbers, balances, or positions in any document or commit.
- Never publish a secret's value in a document, commit message, or audit — record the
  finding, redact the value.
- Never claim another employee completed work unless its **commit and handoff both exist**.
- Never fabricate data to fill a UI. If it is not computed, display *unavailable*.
- Never work from a stale Desktop clone. Canonical clone only.

## Role conflict — RESOLVED (DEC-008)

DEC-004 (Product Director vs. Senior Engineer) was put to the Founder directly and ruled
**2026-07-28: "Forge codes."** The engineer interpretation applies. See `DECISIONS.md`
DEC-008 for the full ruling and consequences. DEC-004 itself is left unedited above it,
per the append-only rule.
