# Markov Pro DLA — Milestone 1 Architecture Plan (M25)

**Bible §51 Pine Script Separation.** **Adopted:** 2026-08-09.
**Status:** doc-only architecture; Pine work happens in a **separate repository** (`wealthymindsets-pine`), not `wealthymindsets-pro`.
**Anchor:** "Markov Pro DLA — 100% Completion Blueprint" (Drive `1ovSJX99dTDdpOXPmAyWXUjsvhMET6I6k2rZ5-0Axy0E`).

## Milestone 1 objective (verbatim from Blueprint)

> "Preserve and convert Markov Pro v2 foundation to Pine v6 without deleting existing Keltner, PDH/PDL, benchmark, dashboard, or alert behavior."

## Why "preserve first"

Markov Pro v2 has been actively used on live charts. Rewriting to v6 without keeping v2 behaviour identical means the trader's next screen-load looks different — a small change in indicator behaviour is a large behavioural intervention in a trading process. Directive Part XCV (Human Agency): tools do not surprise the trader.

## Scope split

| Element | v2 behaviour | v6 target | Change class |
|---|---|---|---|
| Keltner channel | ATR-based, configurable multiplier | Same math, Pine v6 syntax | **Preserve** |
| PDH/PDL lines | Session-based prior day high/low | Same, v6 request.security | **Preserve** |
| Benchmark comparison | Rolling correlation vs SPY | Same, v6 request.security | **Preserve** |
| Dashboard table | Real-time metric table | Same layout, v6 table.new | **Preserve** |
| Alert conditions | Fixed 5 alerts | Same triggers, v6 alertcondition | **Preserve** |
| Markov state engine | v2 discrete states (3) | v6 same-state contract + optional 5-state extension **behind a toggle** | **Preserve default; extend opt-in** |

## Migration invariants

1. **Bar-for-bar identity.** Any bar where v2 fires an alert, v6 must fire the same alert; any bar where v2 draws a level, v6 must draw it within Pine's float-representation tolerance.
2. **Toggle defaults preserve v2 exactly.** New v6 features (5-state extension, richer dashboard) are all `input.bool(false, ...)`.
3. **No indicator repainting.** Every calculation uses `barstate.isconfirmed` gating where the v2 code did.
4. **No lookahead.** `request.security` calls stay `lookahead=barmerge.lookahead_off` to match v2.
5. **Version marker in title.** `title = "Markov Pro DLA v6.M1 (v2-parity)"` so the user can tell which build they're on from the chart legend.

## Deliverables (Pine repo — NOT this repo)

- `pine/markov-pro-dla/v6/main.pine` — v6 script preserving v2 behaviour.
- `pine/markov-pro-dla/v6/tests/parity.pine` — visual parity harness: overlay v2 and v6, plot difference; diff should be zero across a representative day.
- `pine/markov-pro-dla/v6/CHANGELOG.md` — v2 → v6 diff at line-by-line function level.
- `pine/markov-pro-dla/v6/README.md` — how to install, how to run parity test, what to expect.

## What this repo DOES touch

Nothing in `src/`. The only WM-Pro-repo artefact is this doc, so Forge / Founder can navigate to it and see the plan without hunting in the Pine repo.

## Doctrine alignment

- **Bible §51:** Pine and WM Pro TypeScript are separate repos. This doc respects that boundary.
- **JKD:** v2 preserved as base; v6 adds only what's earned by user demand.
- **Human agency (directive Part XCV):** trader's chart looks the same on install day.
