# ATH COMMAND CENTER

**Owner:** Sentinel (COO) · **Last updated:** 2026-07-28 10:50 CDT by Sentinel
**This file is the single entry point for every ATH employee.** Read it before doing anything.

> **Communication bus rule.** Separate AI chat sessions cannot message or activate each
> other. This repository is the bus. If it is not written here or in
> `ACTIVE_TASK_QUEUE.md`, it did not happen. No employee may work from stale chat memory
> when newer repository documentation exists.

---

## Active product

**Wealthy Mindsets Pro** — `spaidsnipes/wealthymindsets-pro`

Other ATH products (Dreamboard, WOW World, ATHOS, Video Intelligence) are **not** in this
work block. Their state is summarised in §"Other products" below and is deliberately
marked UNKNOWN where no evidence exists in this repository.

## Active milestone

**Chart / Heatmap / State correctness** — remove the fragmented timeframe system and the
untrustworthy state model before any new surface is built.

## Current release objective

Friday **2026-07-31**: chart and heatmap agree on what a timeframe is, no stale response
can overwrite the active view, heatmap stops issuing ~120 upstream requests per period
change, and nothing on screen is fabricated.

## Current repository and branch

| Field | Value |
|---|---|
| Repository | `spaidsnipes/wealthymindsets-pro` |
| Canonical local clone | `/Users/dspaidnoosleep/wealthymindsets-pro` |
| Branch | `main` |
| Deployment | `wealthymindsets-pro.vercel.app` (Vercel auto-deploys `main`) |

**Stale clones — DO NOT USE.** `~/Desktop/wealthymindsets-pro` (`6afaf82`, 2026-07-07) and
`~/Desktop/wealthymindsets-pro 2` (`2dded78`, 2026-07-06). VERIFIED stale by Sentinel
2026-07-28. Editing either produces work that will be silently lost.

## Current verified HEAD

`ab31e3c` — *docs(ops): establish ATH operations bus + Sentinel verification pass*

Two commits landed **during** the ops-bus session, both docs-only:
- `89f963e` (Forge) — Wyckoff P0 fabrication finding + implementation spec.
  **Sentinel re-verified the finding in source — CONFIRMED, see RISK-011 / V-004.**
- `ab31e3c` (Sentinel) — this operations structure.

Build/type/test evidence below was taken at `fb063d0`; both later commits touch only
`docs/`, so it carries forward.

| Check | Result | Evidence |
|---|---|---|
| Local `HEAD` == `origin/main` | **VERIFIED** | both `fb063d076e2c…`, 2026-07-28 10:32 CDT |
| TypeScript `tsc --noEmit` | **VERIFIED PASS** — 0 errors | Sentinel ran 2026-07-28 10:48 |
| Tests `npm test` (vitest) | **VERIFIED PASS** — 11/11 | Sentinel ran 2026-07-28 10:48 |
| Production build 69/69 | **PARTIALLY VERIFIED** | Forge ran at `a73aae1`; not re-run at `fb063d0` (docs-only delta) |
| Production deploy contains `a73aae1` | **UNKNOWN** | no authenticated/production access — see RISK-001 |

**Uncommitted in the working tree (not owned by any active ticket):**
- `src/app/lounge/page.tsx` — ~192-line "Universal Lounge" hero WIP. **Exists only on this
  machine, on no branch, in no commit.** Owner unidentified. See `RISKS_AND_BLOCKERS.md`
  RISK-004.
- `tsconfig.tsbuildinfo` — build artifact, ignorable.

`npx` is broken on this machine (`Cannot find module '../lib/cli.js'`). Use
`./node_modules/.bin/tsc` and `npm test` directly.

---

## Active P0 tasks

| Ticket | Title | Owner | Status |
|---|---|---|---|
| WM-CHART-P0-01 | Canonical Timeframe System | Noah | READY FOR NOAH |
| WM-CHART-P0-02 | Chart Context + Stale-Request Protection | — | BACKLOG (blocked by P0-01) |
| WM-HEAT-P0-01 | Heatmap Request Correctness | — | BACKLOG (blocked by P0-01) |
| WM-STATE-P0-01 | Timeframe-Aware Regime + Markov | — | BACKLOG (blocked by P0-01, P0-02) |
| WM-TEST-P0-01 | Cross-Timeframe Regression Suite | — | BACKLOG |
| WM-SEC-P0-01 | Confirm `JWT_SECRET` in Vercel production | Founder | BLOCKED — Founder decision |
| WM-SEC-P0-02 | Apply staged Supabase RLS fixes | — | BLOCKED — Founder approval |
| WM-DATA-P0-01 | Cross-tab tape dedupe | — | BACKLOG |
| WM-VERIFY-P0-01 | Live-verify `a73aae1` auth fix in production | Sentinel | BLOCKED — RISK-001 |

## Active P1 tasks

| Ticket | Title | Owner | Status |
|---|---|---|---|
| WM-RESEARCH-P1-01 | Competitor interaction study (TradingView + tastytrade) | Forge + Research | FORGE ACTIVE |
| WM-HEAT-P0-02 | Heatmap Rendering Performance *(demoted to P1)* | — | BACKLOG |
| WM-STATE-P1-01 | Wyckoff Phase Engine | — | DEFERRED — descope from Friday |
| WM-UX-P1-01 | State Display + Transition Polish | — | BACKLOG |
| WM-ENV-P1-01 | Env var ↔ Vercel reconciliation | Founder | BLOCKED |
| WM-ENV-P1-02 | Rename `NEXT_PUBLIC_ALPACA_*` server-only fallbacks | — | BACKLOG |
| WM-ENV-P1-03 | `NEXT_PUBLIC_SITE_URL` vs `NEXT_PUBLIC_APP_URL` inconsistency | — | BACKLOG |
| WM-DATA-P1-01 | Futures tape missing entirely (ES1!/NQ1!) | — | BLOCKED — paid feed decision |

Full records with acceptance criteria live in [`ACTIVE_TASK_QUEUE.md`](ACTIVE_TASK_QUEUE.md).

## Blocked tasks

| Ticket | Blocked by |
|---|---|
| WM-VERIFY-P0-01 | RISK-001 browser connector / no authenticated session |
| WM-SEC-P0-01 | Founder must confirm the Vercel env var (do not paste its value) |
| WM-SEC-P0-02 | Founder approval + backup before applying RLS policy changes |
| WM-ENV-P1-01 | Founder access to Vercel env settings |
| WM-DATA-P1-01 | Founder decision on a paid futures feed |
| WM-STATE-P1-01 | Deliberately deferred — no Wyckoff engine exists; shipping a label would fabricate data |

## Tasks awaiting Forge

- **WM-RESEARCH-P1-01** — competitor interaction study. Forge has a VERIFIED quantitative
  TradingView baseline (§B of the architecture report) but has **honestly recorded that the
  20-minutes-each requirement was not met** (~3 minutes measured). The qualitative workflow
  study is outstanding: option-chain construction, alerts, layouts, workspace persistence,
  multi-timeframe, loading feedback, error recovery.
- **Constraint:** tastytrade is a **live brokerage account**. Read-only observation only.
  No order tickets, no settings, no account numbers recorded, no trades. Ever.
- Forge does **not** write production code.

## Tasks ready for Noah

- **WM-CHART-P0-01 — Canonical Timeframe System.** Approved by Sentinel 2026-07-28.
  This is the only ticket Noah may start. It blocks everything else.
  Required reading before writing a line: `docs/HANDOFF_2026-07-28_FORGE.md`,
  `docs/WM_CHART_ARCHITECTURE_2026-07-28.md` (§C1, §D1, §E), this file, and
  `ACTIVE_TASK_QUEUE.md`.
  **Noah must not implement Wyckoff classifications and must not start with cosmetic labels.**

## Tasks awaiting Sentinel verification

| Ticket | What Sentinel must verify | Status |
|---|---|---|
| WM-CHART-P0-01 | See acceptance + verification in the queue | not yet submitted |
| WM-VERIFY-P0-01 | Production deploy + trapped-user repro | BLOCKED |

Sentinel's completed review of `a73aae1` (AuthContext guard) is recorded in
[`handoffs/sentinel/2026-07-28-sentinel.md`](handoffs/sentinel/2026-07-28-sentinel.md) —
**verdict: correct, null-safe, approved**, with one low-severity observation.

## Current risks

| ID | Risk | Severity |
|---|---|---|
| RISK-001 | No authenticated/live verification is possible — every "live" claim about WM Pro is UNKNOWN | **HIGH** |
| RISK-002 | `JWT_SECRET` may be unset in production; `src/lib/auth.ts:12` silently falls back to a committed value | **HIGH** |
| RISK-003 | Supabase RLS: always-true write/delete policies on lounge tables | **HIGH** — launch blocker |
| RISK-004 | 192 lines of uncommitted Lounge work exist on one machine only, unowned | **MEDIUM** |
| RISK-005 | Tickets `#76`/`#78` referenced across docs and memory **do not exist** — the GitHub issue tracker is empty | **MEDIUM** |
| RISK-006 | Stale Desktop clones invite lost work | **MEDIUM** |
| RISK-007 | Unverified "company health" numbers circulating (82%, 18 videos, 42 packages, 3 dead files) | **MEDIUM** |

Detail and mitigations: [`RISKS_AND_BLOCKERS.md`](RISKS_AND_BLOCKERS.md).

## Latest handoffs

| Role | File | Date |
|---|---|---|
| Sentinel | [`handoffs/sentinel/2026-07-28-sentinel.md`](handoffs/sentinel/2026-07-28-sentinel.md) | 2026-07-28 |
| Forge | [`../HANDOFF_2026-07-28_FORGE.md`](../HANDOFF_2026-07-28_FORGE.md) + [`../WM_CHART_ARCHITECTURE_2026-07-28.md`](../WM_CHART_ARCHITECTURE_2026-07-28.md) | 2026-07-28 |
| Noah | none yet | — |
| Atlas | none yet | — |
| Research | none yet | — |

Pre-existing Forge documents were **not** moved or rewritten — they remain the canonical
engineering record and are linked, not duplicated.

## Next highest-value action

1. **Noah** — start **WM-CHART-P0-01**. It is unblocked, approved, low-risk (additive
   module), and blocks four other P0s.
2. **Founder** — confirm `JWT_SECRET` is set in Vercel production (**do not paste the
   value anywhere**). Two minutes; closes the highest-severity resolvable risk.
3. **Founder** — resolve RISK-001 by moving `Google Chrome.app` from Desktop into
   `/Applications` and relaunching, or by signing in to WM Pro yourself in the browser pane.
   This single action unblocks WM-VERIFY-P0-01 and the entire "is it actually smooth?"
   question.
4. **Forge** — continue WM-RESEARCH-P1-01 qualitative study within the read-only constraint.

---

## Other products — state of evidence

| Product | Evidence available to Sentinel | Status |
|---|---|---|
| **Dreamboard** | `~/dreamboard`, branch `feature/project-memory-health`, last commit `ba91915` (2026-07-23). **3 uncommitted untracked files** (`app/memory.tsx`, `lib/creative-health.ts`, `supabase/dreamboard-project-memory.sql`, 164 lines) sitting unpushed for 5 days. Repo `spaidsnipes/ABOVE_THE_HILL_DEVELOPMENTS_BUILT_APP_DREAM_BOARD`. | **AT RISK** — unpushed WIP |
| **WOW World** | No repository found under `spaidsnipes`. No local clone. | **UNKNOWN** |
| **ATHOS** | No repository found. No local clone. | **UNKNOWN** |
| **Video Intelligence** | Pipeline folders (`00_Inbox` … `07_Deletion_Manifests`) are **not present on this machine** — presumably Google Drive. Not reachable from this repo. | **UNKNOWN** |

Sentinel will not report progress on a product for which no evidence exists.

---

One Brain.
One Knowledge Base.
One Company Memory.
