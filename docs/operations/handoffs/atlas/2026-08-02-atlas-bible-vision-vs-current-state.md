# ATLAS — Bible vision vs current state, momentum gap map

**From:** Atlas / Mission Control · **Written:** 2026-08-02 08:45 CDT
**Repo HEAD:** `499e504` · **Source of truth:** WealthyMindsets Pro Company Bible (Drive `1Yntm95DYMKnzNZ6AS5HNlMWdw75X15rPhlOOInBdKB0`, v1.0, last modified 2026-08-01 17:32)
**Founder correction that triggered this map:** *"if theres work to be done i shouldn't see stopping … go through my drive and see where we need to be … we still have so much to get to"*

## Why this handoff exists

The queue has been focused on triage (P0-05 badges, P0-06 tick guard, VP recurrence, scanner-a11y) — real work but **narrow.** The Bible defines 50+ sections of scope. I mapped the gap so the team can see what "done" actually looks like, and I filed the missing tickets into `ACTIVE_TASK_QUEUE.md` under **"BIBLE-DERIVED BACKLOG"**.

Momentum rule (Founder-ratified, this cycle): **parallel work on independent tickets is authorized**. Assembly line only applies to shared-file collisions. If a ticket doesn't touch another owner's active file, ship it.

## Bible-mandated features NOT in the pre-existing queue

Filed as tickets in this cycle. Owner routing per `TEAM_CHARTERS.md`.

### Markov Pro DLA integration (Bible §51 — CONFIRMED FOUNDER DECISION)
Codex has been publishing Pine Script iterations in Drive since 2026-08-01 (Markov Pro DLA, Tuesday Prop Assistant v6 5+ iterations). WM Pro must own the OS around the indicator per the Bible integration boundary.

| Ticket | Scope | Owner chain |
|---|---|---|
| `WM-DLA-P1-01` | Strategy Event schema — TradingView → WM Pro payload contract (symbol/timeframe/setup/regime/DLA states/zones/entry/invalidation/target/available-R/grade/data-confidence) | Forge → Noah → Sentinel |
| `WM-DLA-P1-02` | DLA Morning Game Plan card (scenarios/conditions/invalidation/uncertainty/alternatives — never framed as instruction) | Micah → Noah → Sentinel |
| `WM-DLA-P1-03` | Guided pre-trade checklist (no-pressure, DLA-context-aware) | Micah → Noah → Sentinel |
| `WM-DLA-P1-04` | Prop Guardian panel (user-entered rules, no auto orders) | Forge → Noah → Sentinel |
| `WM-DLA-P1-05` | Advanced R Manager (current R / protected R / active trail / runner state) | Forge → Noah → Sentinel |
| `WM-DLA-P1-06` | Stop Integrity monitor (planned vs actual stop, warn on widening) | Forge → Noah → Sentinel |
| `WM-DLA-P1-07` | Setup Expiration engine | Forge → Noah → Sentinel |
| `WM-DLA-P1-08` | Opportunity-Cost warning (attractive trade lacking 4-5R clean room) | Forge → Noah → Sentinel |
| `WM-DLA-P1-09` | Personal Edge Report (setup/session/confluence/confirmation/management) | Forge → Noah → Sentinel |
| `WM-DLA-P1-10` | Shared formula/version registry (TV + WM Pro identify which DLA rule set generated a signal) | Forge → Sentinel |

### Order Flow workspace (Bible §"Order Flow")
Order Flow is a **dedicated workspace, not a collection of indicators.**

| Ticket | Scope | Owner chain |
|---|---|---|
| `WM-OF-P1-01` | Time-and-Sales panel where feed available | Forge → Noah → Sentinel |
| `WM-OF-P1-02` | Auction labels (session-context tagging) | Forge → Noah → Sentinel |
| `WM-OF-P1-03` | Inferred absorption (with honest-limitation label — no MBO fabrication) | Forge → Noah → Sentinel |
| `WM-OF-P1-04` | Cumulative Delta (CVD) chart + divergence markers | Forge → Noah → Sentinel |

### Risk Management System (Bible §36 — "core, not premium decoration")

| Ticket | Scope | Owner chain |
|---|---|---|
| `WM-RISK-P1-01` | Position-size calculator (tick-value aware for futures) | Forge → Noah → Sentinel |
| `WM-RISK-P1-02` | Max daily loss / max trade loss / open-risk total | Forge → Noah → Sentinel |
| `WM-RISK-P1-03` | Portfolio concentration + correlated exposure | Forge → Noah → Sentinel |
| `WM-RISK-P1-04` | Daily lockout + cooldown after losses (no shaming copy) | Micah → Noah → Sentinel |
| `WM-RISK-P1-05` | R-multiple tracking against verified fills | Forge → Noah → Sentinel |

### Journal (Bible §"Journal" — both automatic AND reflective)

| Ticket | Scope | Owner chain |
|---|---|---|
| `WM-JRN-P1-01` | Auto-capture: symbol/entry/exit/size/fees/chart-state/session/timeframe/screenshots/data-quality | Forge → Noah → Sentinel |
| `WM-JRN-P1-02` | Reflection fields: thesis/trigger/invalidation/risk/emotion/execution-grade/rule-adherence/lessons | Micah → Noah → Sentinel |
| `WM-JRN-P1-03` | Process-quality metric surfacing (not just profit) | Forge → Noah → Sentinel |

### Replay (Bible §"Replay")
Reconstruct market from recorded events; modes: Market / Trade / Profile / Session Review / Challenge / Coach.

| Ticket | Scope | Owner chain |
|---|---|---|
| `WM-REPLAY-P1-01` | Event recorder (raw trades + candle formation) + storage layer | Forge → Noah → Sentinel |
| `WM-REPLAY-P1-02` | Playback UI + scrubber | Micah → Noah → Sentinel |
| `WM-REPLAY-P1-03` | Coach + Challenge modes (later — after core replay) | Micah → Forge → Noah → Sentinel |

### Alerts (Bible §35)

| Ticket | Scope | Owner chain |
|---|---|---|
| `WM-ALERT-P1-01` | Alert schema + evaluator (client-side + server-side distinction shown) | Forge → Noah → Sentinel |
| `WM-ALERT-P1-02` | Alert types: price/pct/volume/relvol/VWAP-cross/OR-break/POC-test/VAH-VAL-test/naked-POC/delta-threshold/large-trade/imbalance/profile-shape-transition/broker-disconnect/order-fill/risk-limit/econ-event/news | Forge → Noah → Sentinel |
| `WM-ALERT-P1-03` | Webhook out (Discord/Telegram) with opt-in + idempotency + rate limits | Forge → Noah → Sentinel |

### Verified Performance (Bible §37)

| Ticket | Scope | Owner chain |
|---|---|---|
| `WM-PERF-P1-01` | Performance categorization: broker-verified / paper-verified / self-reported / simulation / backtest / unverified — never mixed | Forge → Noah → Sentinel |
| `WM-PERF-P1-02` | Metrics surface: N-trades / net return / max DD / win rate / avg win-loss / expectancy / profit factor / avg risk / consistency / open-vs-closed P&L | Forge → Noah → Sentinel |

### Broker adapters (Bible §32 — expand beyond current tastytrade)

| Ticket | Scope | Owner chain |
|---|---|---|
| `WM-BROKER-P1-01` | IBKR adapter (OAuth if available, futures + equities + options) | Forge → Noah → Sentinel |
| `WM-BROKER-P1-02` | Tradier adapter | Forge → Noah → Sentinel |
| `WM-BROKER-P1-03` | Schwab adapter (evaluation only until Founder scope-approves) | Forge scope → Founder decide |
| `WM-BROKER-P1-04` | Order state machine with 15-state reconciliation (Draft → … → Unknown-reconcile) | Forge → Noah → Sentinel |

### Passport / auth (Bible §29 — plus already-open blockers §9/§10)

| Ticket | Scope | Owner chain |
|---|---|---|
| `WM-PASSPORT-P0-01` | Passport identity across WM Pro + ecosystem | Forge → Noah → Sentinel |
| `WM-SEC-P0-01` (open) | JWT_SECRET verified set in Vercel prod — **Founder-only** | Founder |
| `WM-SEC-P0-02` (open) | Supabase RLS from always-true to per-user policies — **Founder scope + backup window** | Founder |

### Testing matrix (Bible §44)
Sentinel drives — expand unit/integration/visual/E2E/stress coverage per Bible checklists. Existing suite is `vitest 102/102` (5 test files) — Bible mandates far more.

### VP Worlds (Bible §"VP Worlds" — signature feature per Founding Principle 6)

| Ticket | Scope | Owner chain |
|---|---|---|
| `WM-VPW-P1-01` | Define "VP Worlds" — Founder-source pointer OR abandon-the-name (VI found no DeepCharts precedent, so this is a WM original feature that needs the Founder to specify). Blocking. | Founder → Forge → Micah → Noah |

## Launch Readiness Gates map (Bible §46, current state)

| Gate | Status | What's missing |
|---|---|---|
| 1. Data truth | 🟡 | P0-05 badges done (`499e504`). Crypto-volume-zero (WM-VP-P0-01 REOPEN) violates it right now. |
| 2. Chart stability | 🔴 | Session VP crypto POC=0.00 open; drawing tools smooth (WM-DRAW-P0-01) awaiting Noah; order-flow master-toggle UX (WM-OF-P0-06) open. |
| 3. Trading safety | 🔴 | Paper lifecycle not verified end-to-end (Journal auto-capture not shipped, WM-JRN tickets P1). Live trading correctly disabled. |
| 4. Security | 🔴 | JWT_SECRET Founder-verify + Supabase RLS — both blocked on Founder. |
| 5. Legal/compliance | ⚪ | Not started. Terms / privacy / disclaimers / creator / subscription / copy-trading legal review — Elias to draft. |
| 6. Mobile quality | 🔴 | Zero-truncation sweep, touch parity, 4-viewport screenshots — Micah has WM-DRAW spec, mobile capture blocker on 1910px in-app browser. |
| 7. Support | ⚪ | Bug reporting / status page / account recovery / refund handling / incident response — not started. |

**Discord waitlist launch requires all seven green.** Current state: **1×🟡, 5×🔴, 2×⚪. Not close.**

## What this map means for the assembly-line reversal

Parallel work on independent tickets — the 40+ tickets above touch different subsystems. Assign owners, ship in parallel where files don't collide, only serialize when they do. Nehemiah tracks; Sentinel gates.

## Founder-only decision items visible in this map

- WM-SEC-P0-01 / WM-SEC-P0-02 — already open.
- WM-VPW-P1-01 — what IS VP Worlds. Source pointer or original spec.
- Broker expansion scope (IBKR/Tradier/Schwab which order + timing).
- Copy trading timing + jurisdiction (Bible §38).
- Legal review kickoff.
- Public performance defaults (Bible §37).
- Subscription tier structure + pricing (Bible §39).
- Token / WM$ (Bible §45 decision register).

## Next action per role (parallel launch)

- **Forge:** publish contracts for `WM-VP-P0-01 crypto-volume RC` + `WM-OF-P0-06 UX pick` + start `WM-DLA-P1-01 Strategy Event schema` (Bible-derived, unblocks TV↔WM Pro).
- **Noah:** ship `WM-DRAW-P0-01` (Micah spec exists) in parallel with waiting for VP/OF contracts.
- **Micah:** publish `WM-CHART-P0-05c` water-style Big Trades spec (owed since Fri) + `WM-DLA-P1-02` Morning Game Plan design.
- **Sentinel:** track her own live-recheck queue (F-B pre-market at open) + verify Forge's scanner reconciliation.
- **Nehemiah:** ingest this handoff into `EMPLOYEE_STATUS.md` + `ACTIVE_TASK_QUEUE.md` (append the BIBLE-DERIVED BACKLOG section from this doc's tables).
- **Video Intelligence:** intake Markov Pro DLA Pine Script (Drive) + Tuesday Prop Assistant v6 deltas + IMG_302* screenshots per prior dispatch.
- **Atlas (this thread):** commit + push this map + append the ticket rows to `ACTIVE_TASK_QUEUE.md`.

## Not this cycle (deferred to a later Founder decision)

- Automated trading, copy trading launch, token sale, full 3D world integration, public creator marketplace at scale — all Bible-flagged HOLD until first-release core is stable.

**No employee is "done" until Discord waitlist launches with all 7 gates green.**
