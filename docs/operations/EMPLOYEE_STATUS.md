# EMPLOYEE STATUS

**Owner:** every employee updates their own row · **Last updated:** 2026-07-28 10:50 CDT

Update your row at the **start** of your session (after claiming) and at the **end**
(before your handoff). A row that has not moved in a day is a signal, not a detail.

| Employee | Role | Active task | Status | Branch | Last commit | Last handoff | Updated |
|---|---|---|---|---|---|---|---|
| **Sentinel** | COO — operations, verification, prioritization | Ops bus setup + WM Pro verification pass | ACTIVE | `main` | `fb063d0` (verified, not authored) | `handoffs/sentinel/2026-07-28-sentinel.md` | 2026-07-28 10:50 |
| **Forge** | Build Continuity Lead — research, architecture, tickets, **and production engineering (DEC-008, 2026-07-28)** | WM-CHART-P0-01 (`d2ea511`), P0-02 (`c53e429`), WM-RESP-P0-02 (`9f2c68d`) — all shipped, awaiting Sentinel | AWAITING VERIFICATION | `main` | `9f2c68d` | `handoffs/forge/2026-07-28-forge-wm-resp-p0-02.md` | 2026-07-28 |
| **Noah** | Implementation engineer | WM-CHART-P0-03 — Fail-closed provider interval mapping | NOAH ACTIVE | `main` | `176fe7f` (base) | pending | 2026-07-29 |
| **Atlas** | Knowledge indexing | Re-derive circulated "company health" figures from evidence | **CORRECTION REQUIRED** | — | — | none | — |
| **Research Lab** | Interaction documentation, competitive analysis, evidence synthesis. **No production code.** | RL-RESEARCH-P1-01 (**BLOCKED — DEC-010**); DB-OPS-P1-01 evidence corrected | **BLOCKED — awaiting Founder ruling DEC-010** | ops bus `main` · subject `dreamboard` `origin/main` `2049bdd` | none authored (docs-only) | `handoffs/research/2026-07-28-research.md` | 2026-07-28 |

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
