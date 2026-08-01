# EMPLOYEE STATUS

**Owner:** every employee updates their own row · **Last updated:** 2026-07-30 (Sentinel reconciliation)

Update your row at the **start** of your session (after claiming) and at the **end**
(before your handoff). A row that has not moved in a day is a signal, not a detail.

**If your Active task is empty:** read your charter in
[`TEAM_CHARTERS.md`](TEAM_CHARTERS.md) → *Default when idle* section, pick the next
item, and update your row. Do NOT ask the Founder. Ratified by DEC-011.

| Employee | Role | Active task | Status | Branch | Last commit | Last handoff | Updated |
|---|---|---|---|---|---|---|---|
| **Sentinel** | COO — operations, verification, prioritization | V-009 verdict on WM-STATE-P0-01 = **PARTIALLY VERIFIED, not shipped** (returned to queue); DEC-012 backfill verify still open | ACTIVE | `main` | `866fc4b` (V-009) | `handoffs/sentinel/2026-07-30-sentinel-scanner-a11y-gate-verdict.md` | 2026-07-31 09:38 |
| **Forge** | Build Continuity Lead — research, architecture, tickets, **and production engineering (DEC-008, 2026-07-28)** | **WM-STATE-P0-02 contract DELIVERED** to Noah (Markov first-consumer → Confluence regime badge, honest `no-threshold-configured` until thresholds blessed; PREREQ-1 threshold derivation raised). Prior: 3 root-cause contracts (VP/OF/BROKER) + broker matrix in Noah's queue | HANDED OFF | `main` | (this commit) | `handoffs/forge/2026-07-31-forge-wm-state-p0-02-contract.md` | 2026-08-01 |
| **Noah** | Implementation engineer | **ACTIVE** — (1) Shipped **WM-UX-P0-01** (Delta count control → SM panel, `0270590`); Sentinel verifying (my visual capture blocked by /login gate). (2) **ACK'd + reverted WM-SEC-VIOLATION-01** — removed tastytrade order/cancel surface per DEC-005 (`627be87`, tsc+build clean, grep-zero refs); Sentinel re-verify pending, NO-GO holds. Next after clear: WM-VP-P0-01. Queued: WM-OF-P0-05, WM-DRAW-P0-01 | ACTIVE | `main` | `627be87` | `handoffs/noah/2026-07-31-noah-wm-sec-violation-01-revert.md` | 2026-07-31 10:20 |
| **Micah** | Experience / accessibility / WOW polish | 3 specs DELIVERED (draw, delta-panel migration, DEC-012 backfill verdicts) + dispatched to Noah at 0940; **also** authored the real `WM-A11Y-SCANNER-01` (shipped `866fc4b`, retiring phantom scanner-a11y gate) | HANDED OFF | `main` | `e5ef13b` (dispatch) | `handoffs/micah/2026-07-31-micah-wm-draw-p0-01-spec.md` (+2: `-wm-ux-p0-01-delta-panel-migration`, `-dec012-backfill-verdicts`) | 2026-07-31 09:40 |
| **Nehemiah** | Operations & critical path | **10:35 CDT sweep:** published Friday overnight ship list (Founder-glanceable, 7 landings + Session-VP dispute + SEC blockers); retired 2 satisfied Sentinel dispatches (627be87 closed the loop); filed **WM-CHART-P0-07** (Big Trades collision) + **WM-CHART-P0-05c** (water markers) queue rows; routed RISK-011 ID collision to Sentinel (register owner). RISK-012→013 already reconciled; "44%/27" retired. | ACTIVE | `main` | (this commit) | `handoffs/nehemiah/2026-07-31-nehemiah-risk-011-duplication-flag.md` | 2026-07-31 10:35 |
| **Atlas** | Knowledge indexing + Mission Control dispatches | Morning dispatch waves (08:55–09:00 + 09:26/09:35/09:40 relay) + DEC-012 ratified; **still owes** re-derive of circulated "company health" figures. **V-010 (Sentinel, 2026-08-01): 2 post-DEC-012 `src/` commits under Atlas's Claude-Opus-4.8 co-author** — `aa68aa0` (tastytrade order-placement, DEC-005 violation, already self-caught and fully reverted at `627be87`) and `0270590` (UI ownership violation, live RETURN, not reverted per DEC-012's own no-revert-if-code-works clause). Violation count: **2 new, total 10.** | **CORRECTION REQUIRED + 1 live RETURN (`0270590`)** | `main` | `50dc7cb` (dispatch relay, `-C2` role) | none authored (dispatches only) | 2026-07-31 09:40 |
| **Research Lab** | Interaction documentation, competitive analysis, evidence synthesis. **No production code.** | RL-RESEARCH-P1-01 (**BLOCKED — DEC-010**); DB-OPS-P1-01 evidence corrected | **BLOCKED — awaiting Founder ruling DEC-010** | ops bus `main` · subject `dreamboard` `origin/main` `2049bdd` | none authored (docs-only) | `handoffs/research/2026-07-28-research.md` | 2026-07-28 |
| **Video Intelligence** | Video/transcript intelligence + competitive gap analysis. **No production code.** | DeepCharts gap matrix (VP Worlds + full order-flow) published; 8 gap tickets filed | HANDED OFF | `main` | `50dc7cb` (base, not authored) | `handoffs/video-intelligence/2026-07-31-vi-deepcharts-gap-matrix.md` | 2026-07-31 |

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
