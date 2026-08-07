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
| **Forge** | Build Continuity Lead — research, architecture, tickets, **and production engineering (DEC-008, 2026-07-28)** | **EMERGENCY `WM-DATA-P0-01` quote-pipeline audit SHIPPED** — `+0.00%` rail is a day-change collapse (`useWebSocket:116` prev→price fallthrough), NOT market-closed suppression (gate is cosmetic, `BottomIndexBar:16`); SPY dual-badge = 2 provenance writers (candle `b.live` vs feed `source`) → single resolver; tastytrade HAS dxFeed quotes but ZERO consumers → file `WM-BROKER-QUOTE-P0-01`. Honest-framed (Sun: equities/futures legit closed — don't fake). Fix contract + `isMarketOpen(assetClass,ts)` → Noah. Prior (parallel): VP crypto-volume, OF-P0-06, SCANNER-RECONCILE-01 (`2f9c065`). | ACTIVE | `main` | (this commit) | `handoffs/forge/2026-08-02-forge-wm-data-p0-01-quote-pipeline-audit.md` | 2026-08-02 |
| **Noah** | Implementation engineer | **M1 DONE — PR1 both RETURNs resolved** on branch `noah/scanner-cache-reconciled` (`04f0824`, pushed). Forge scanner-cache synthesis: A's canonical identity + B's 15m TTL (new `scannerFailureCache.ts`) + B's consumer; kept both unique modules; WMSessionVP byte-identical to main. tsc clean, vitest 140/140, a11y .mjs PASS, next build clean. Sentinel dispatched for §5 re-verify — **do not merge until APPROVE**. Prior: WM-VP-P0-01 (`e06ade9`), WM-DRAW-P0-01 rail (`d81a592`). Next: M3 WM-DATA-P0-01 | ACTIVE | `noah/scanner-cache-reconciled` | `04f0824` | `handoffs/noah/2026-08-05-noah-m1-scanner-reconcile.md` | 2026-08-05 23:20 |
| **Micah** | Experience / accessibility / WOW polish | 5 specs DELIVERED to date: draw / delta-panel migration / DEC-012 backfill verdicts / **water-style markers WM-CHART-P0-05c** (`375603d`, dispatch `da1d8eb`) / **WM-BRAND-W-TRIGGER-01 ownership** (`375603d`) / **WM-BROKER-P0-01 Part C broker connect UI pattern** (`926c783`); authored the real `WM-A11Y-SCANNER-01` (`866fc4b`, retiring phantom gate) | HANDED OFF | `main` | `926c783` | `handoffs/micah/2026-07-31-micah-wm-brand-w-trigger-01-ownership-spec.md` (+broker Part C) | 2026-08-01 |
| **Nehemiah** | Operations & critical path | **2026-08-03 10:40 CDT market-open sweep:** 6 commits reconciled from `adf13ac`. Filed 15 rows into ATQ (`WM-OPS-P1-01` Doctrine §7 ingestion + `WM-DLA-P1-11` DLA module-map + 4 Bible §46 gate-gap tickets `-PAPER/LEGAL/MOBILE/SUPPORT-P0-01` + 10 §45 Founder-only placeholders). Ingested Sentinel V-012/V-013 (`818bfee`) — Gate 2.4 static ≠ green (runtime evidence pending), Gate 4.2 CROSS-PRODUCT with Dreamboard (backup+DB-SEC-P1-01+DB reviewer preconditions). Assembly-line staleness recomputed — Noah bottleneck on 4/6 items; recommended #2→#1 serial, #3/#5/#6 parallel. Doctrine §7 already applied by Forge (`e768558`) to 2 in-flight Noah contracts. | ACTIVE | `main` | (this commit) | `handoffs/nehemiah/2026-08-02-nehemiah-1245-full-reconcile-and-7-gate-map.md` (+ dispatch `dispatches/2026-08-03/1040-nehemiah-market-open-sweep-…`) | 2026-08-03 10:40 |
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
