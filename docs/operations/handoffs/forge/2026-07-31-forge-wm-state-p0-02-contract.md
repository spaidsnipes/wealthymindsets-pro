# WM-STATE-P0-02 — Markov first-consumer contract (Forge)

**From:** Forge (Principal Architect) · **Date:** 2026-08-01 (00:xx CDT cycle; dispatch received 2026-07-31 23:25) · **Repo HEAD:** `32f2268`
**Type:** Architecture contract for Noah. Forge does not ship (DEC-008 lane split / DEC-012). Engine algorithm is frozen — do **not** touch `src/lib/markov.ts`.
**Sentinel V-009 (`866fc4b`):** `markov.ts` still zero-importers — "PARTIALLY VERIFIED, not shipped." This ticket makes it a live, honest consumer.

---

## 1. Chosen surface (recommendation accepted)

**The existing regime section of the Confluence panel** — `src/components/smart-money/SmartMoneyPanel.tsx`, section key `regime`, labeled **"Markov / Wyckoff Regime"** (SmartMoneyPanel.tsx:161, rows 19–24). It already renders:
- a **heuristic** "Regime" signal derived from delta/VWAP (`generateSignals`, L129–130) — *not* the Markov engine, and
- an honest Wyckoff `"Unavailable — phase model not implemented"` line (~L966) — DEC-009 correctly honored, leave it.

Single symbol (`SmartMoneyPanel` already receives `symbol`), single component, one honesty gate. This is the bounded first consumer.

## 2. What "first consumer" means here (read this before coding)

The goal is **not** to make a green regime badge appear. Per the Markov architecture doc (`WM_MARKOV_CONFLUENCE_ARCHITECTURE_2026-07-29.md`, L86–87): the per-timeframe `sideThreshold` values are **not yet derived from our own data**, so *"the engine ships behind a flag and renders `unavailable`."*

Therefore the correct, truthful first-consumer behavior is:

> **Wire the real `computeMarkov()` into the regime badge behind its own honesty gate. With no blessed threshold, it will honestly render `insufficient-evidence / no-threshold-configured`. That is a PASS** — it proves the engine is exercised (kills the zero-importer dead-code / "claims capability it isn't exercising" surface) *and* is honest. A follow-on ticket derives thresholds to flip it to `ready`.

Do not fabricate a state to make it look live. An honest `unavailable` from the real engine is the deliverable.

## 3. Exact contract

**Import path (the consumer will use):**
```ts
import { computeMarkov, type MarkovResult, type MarkovConfig } from "@/lib/markov";
import type { TFId } from "@/lib/timeframes";
```

**Call shape (`ComputeInput`):**
```ts
const result: MarkovResult = computeMarkov({
  bars,            // readonly Bar[] — see §4, MUST be real candles, ≥ 101 for any ready result
  config,          // MarkovConfig — see §5
  symbol,          // from panel props
  timeframe,       // TFId — canonical (WM-CHART-P0-01A); see §5
});
```

**Return shape — discriminated union, render per `status`:**

| `result.status` | Render in the regime badge |
|---|---|
| `"ready"` | `currentState` (BULL/BEAR/SIDE) as the regime; `direction` (LONG/SHORT/NEUTRAL); `confidence` (0–1) as a labeled confidence; optionally `edge`. Never show a number the union doesn't carry. |
| `"insufficient-evidence"` | Honest `unavailable` chip with the mapped `reason` (below). **No state, no percentage** — the union makes reading one a type error; keep it that way. |

**`reason` → honest copy (required):**

| `reason` | Badge copy |
|---|---|
| `no-threshold-configured` | "Regime engine live — threshold not yet blessed for this timeframe" |
| `too-few-bars` | "Insufficient history (need ≥101 bars)" |
| `too-few-transitions-total` | "Insufficient transitions observed" |
| `too-few-transitions-current` | "Current-state sample too small for a confident read" |
| `current-row-unobserved` | "Current state not yet observed transitioning" |

## 4. Bars source — the one hard constraint (learn from WM-VP-P0-01)

`SmartMoneyPanel` today has **no historical bar array** — it only uses `useWebSocket({symbol, timeframe:"1m"})` for ticks/`liveBar`. Markov needs ≥101 classified bars.

**Do NOT add a hardcoded provider fetch inside the panel.** That is exactly the WM-VP-P0-01 recurrence defect (a component running its own `/api/yahoo` pipeline, diverging from the chart). Instead:

- **Preferred:** pass `bars` (the chart's canonical candle series for `symbol` + the chosen `timeframe`) into `SmartMoneyPanel` as a prop, keyed to `dataVersion` (`src/lib/chartContext.ts`). The chart already fetched them.
- If the panel can genuinely not receive chart candles in its current mount, that is a **prerequisite coordination point** — raise it back to Forge; do not paper over it with an independent fetch.
- Until real bars flow, the honesty gate returns `too-few-bars` and the badge shows the honest copy. That is acceptable interim behavior.

Optionally publish the result into the reserved `ChartContext.markov` `StateSlot<unknown>` slot so future consumers (heatmap overlay) reuse one computation — but the first consumer may read `MarkovResult` directly.

## 5. Config & timeframe

- `MarkovConfig = { sideThreshold: number | null; version: string }`. Pass the **blessed** threshold for the selected `TFId`. **None is blessed yet** → pass `sideThreshold: null` with an honest `version` (e.g. `"unblessed-2026-08"`) → engine returns `no-threshold-configured`. This is correct.
- `timeframe` must be a canonical `TFId` (WM-CHART-P0-01A). Pick one defined timeframe for this single-symbol consumer (the panel's active timeframe, or a fixed `1D` for a daily regime read — Noah's choice, documented).

## 6. Acceptance criteria (for Noah → Sentinel)

1. `grep -rln 'from "@/lib/markov"' src/` returns **at least one non-test runtime importer** (the panel). Zero-importer state is gone.
2. The regime badge renders **from `computeMarkov()`**, not from the delta/VWAP heuristic, for that section's Markov line.
3. With no blessed threshold, the badge shows the honest `no-threshold-configured` copy — **not** a fabricated regime, **not** a silent blank.
4. When fed ≥101 real bars **and** a (test-)blessed threshold, it renders a real `ready` regime with confidence — proving the wired path produces live output.
5. No edit to `src/lib/markov.ts` (algorithm frozen). No independent provider fetch added to the panel (WM-VP-P0-01 constraint).
6. Type-check + full test suite + 69-page production build all green.
7. **Sentinel** independently confirms: (a) a runtime importer exists, (b) the honesty gate renders the honest unavailable state on the live app, (c) no fabricated state.

## 7. Open / prerequisite (not Noah's, tracked)

- **PREREQ-1 (Forge/data):** derive per-`TFId` `sideThreshold` values from our own data so the engine can flip from `no-threshold-configured` to `ready`. Follow-on ticket; **must not** be curve-fit to a screenshot (arch doc L35). Until then, honest `unavailable` is the shipped state.
- **PREREQ-2 (coordination):** confirm `SmartMoneyPanel` can receive the chart's canonical `bars` + `dataVersion`. If not, resolve the mount/data-flow before wiring, per §4.
