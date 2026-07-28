# EMPLOYEE STATUS

**Owner:** every employee updates their own row · **Last updated:** 2026-07-28 10:50 CDT

Update your row at the **start** of your session (after claiming) and at the **end**
(before your handoff). A row that has not moved in a day is a signal, not a detail.

| Employee | Role | Active task | Status | Branch | Last commit | Last handoff | Updated |
|---|---|---|---|---|---|---|---|
| **Sentinel** | COO — operations, verification, prioritization | Ops bus setup + WM Pro verification pass | ACTIVE | `main` | `fb063d0` (verified, not authored) | `handoffs/sentinel/2026-07-28-sentinel.md` | 2026-07-28 10:50 |
| **Forge** | Build Continuity Lead — research, architecture, tickets. **No production code.** | WM-RESEARCH-P1-01 | FORGE ACTIVE | `main` | `fb063d0` | `docs/WM_CHART_ARCHITECTURE_2026-07-28.md` | 2026-07-28 10:32 |
| **Noah** | Implementation engineer | WM-CHART-P0-01 | **AWAITING CLAIM** | — | — | none | — |
| **Atlas** | Knowledge indexing | Re-derive circulated "company health" figures from evidence | **CORRECTION REQUIRED** | — | — | none | — |
| **Research Lab** | Interaction documentation. **No production code.** | Support WM-RESEARCH-P1-01 | AWAITING CLAIM | — | — | none | — |

## Role boundaries (binding)

- **Sentinel** — does not write production code. Verifies, prioritizes, assigns, documents,
  and returns work that lacks evidence.
- **Forge** — research, architecture, ticket authoring. Does not write production code.
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

## Known role conflict — Founder decision required

Two conflicting role definitions for WM Pro exist in company memory, both dated recently:

- **WM Product Director** — oversight, verification, docs, prioritization; *never write
  production code*.
- **Senior Software Engineer (FORGE-QA)** — codes, tests, and fixes WM Pro on approved work.

This block is being run under the **oversight** interpretation (Sentinel verifies, Noah
implements). Recorded as **DEC-004** in `DECISIONS.md` pending the Founder's ruling.
