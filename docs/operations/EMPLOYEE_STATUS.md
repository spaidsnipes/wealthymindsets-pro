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
| **Forge** | Build Continuity Lead — research, architecture, tickets, **and production engineering (DEC-008, 2026-07-28)** | 3 root-cause contracts DELIVERED to Noah (see 0935 dispatch); awaiting Noah implementation on VP/OF/BROKER + broker-matrix scope decision | HANDED OFF | `main` | `116d23c` | `handoffs/forge/2026-07-31-forge-wm-vp-p0-01-root-cause.md` (+3 more: `-wm-of-p0-05-toolset-audit`, `-wm-broker-p0-01-tastytrade-futures`, `-broker-expansion-matrix`) | 2026-07-31 09:37 |
| **Noah** | Implementation engineer | **UNHELD** — implementing Forge+Micah contracts. Shipped WM-BROKER-P0-01 server-side order lifecycle (dry-run-first, live gated); WM-VP-P0-01, WM-OF-P0-05, WM-DRAW-P0-01, WM-UX-P0-01 next in queue per 0935/0940 dispatches | ACTIVE | `main` | `aa68aa0` | pending | 2026-07-31 09:45 |
| **Micah** | Experience / accessibility / WOW polish | 3 specs DELIVERED (draw, delta-panel migration, DEC-012 backfill verdicts) + dispatched to Noah at 0940; **also** authored the real `WM-A11Y-SCANNER-01` (shipped `866fc4b`, retiring phantom scanner-a11y gate) | HANDED OFF | `main` | `e5ef13b` (dispatch) | `handoffs/micah/2026-07-31-micah-wm-draw-p0-01-spec.md` (+2: `-wm-ux-p0-01-delta-panel-migration`, `-dec012-backfill-verdicts`) | 2026-07-31 09:40 |
| **Nehemiah** | Operations & critical path | Go-live gate published (`97d0694`); this sweep: reconciled all 8 employee rows vs 8 new handoffs + 5 new commits; filing §9/§10 blocker dispatches to Founder | ACTIVE | `main` | `97d0694` | `handoffs/nehemiah/2026-07-30-nehemiah-command-board.md` | 2026-07-31 09:53 |
| **Atlas** | Knowledge indexing + Mission Control dispatches | Morning dispatch waves (08:55–09:00 + 09:26/09:35/09:40 relay) + DEC-012 ratified; **still owes** re-derive of circulated "company health" figures | **CORRECTION REQUIRED** | `main` | `50dc7cb` (dispatch relay, `-C2` role) | none authored (dispatches only) | 2026-07-31 09:40 |
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
