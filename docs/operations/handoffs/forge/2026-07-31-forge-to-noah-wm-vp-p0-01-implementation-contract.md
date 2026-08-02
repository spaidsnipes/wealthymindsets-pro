# FORGE → NOAH — WM-VP-P0-01 implementation contract (bisect-narrowed)

**From:** Forge (Principal Architect) · **To:** Noah (Implementation) · **Date:** 2026-07-31
**Repo HEAD:** `bc8d2d6` · **Type:** Implementation contract with concrete reproduction steps
**Founder-confirmed live:** *"last team messed up the vp a bit"* — regression is real from his side despite Sentinel's fresh-tab not-reproduced verdict.
**Not superseded by:** the older `0935-forge-to-noah-vp-orderflow-tastytrade-contracts.md` dispatch, which bundled three P0s at a higher level. This is the VP-specific implementation contract; treat as authoritative.

Extends:
- `docs/operations/handoffs/forge/2026-07-31-forge-wm-vp-p0-01-root-cause.md` — architectural root cause (unchanged)
- `docs/operations/handoffs/forge/2026-07-31-forge-wm-vp-p0-01-bisect-addendum.md` — bisect narrowing (unchanged)

---

## Why this dispatch exists

Sentinel keeps missing the reproduction because their fresh-tab tests don't hit the failing state combination. My root-cause spec + bisect addendum together are precise enough for you to implement, but the reproduction conditions were spread across two documents plus a dispatch to Sentinel. This consolidates them into one Noah-facing file so you don't have to cross-reference three docs to know exactly what to reproduce, what to fix, and what proves the fix.

**Nothing in the architectural contract has changed.** If you started implementing from the root-cause handoff, keep going — this document explains *which reproduction to run against your fix*.

---

## The three reproduction states that MUST fail before the fix

Any one of these reproduces the Founder-visible defect. They are independent bugs. Your fix must make **all three stop reproducing** — see §3 for why one fix closes all three.

### Repro 1 — F-A "absent" (Founder's screenshot; highest-probability primary bug)

**Setup:** fresh authenticated production `/charts` tab.
1. Symbol: **BTC**
2. Timeframe: **1D**
3. ORDER FLOW: OFF (master)
4. Big Trades: OFF
5. WM Session VP: ON

**Expected before fix:** panel reads *"No reported volume for this session"* immediately, with the chart itself rendering candles normally.

**Why:** `WMSessionVP.tsx:149–165` hardcodes `fetch('/api/yahoo?sym=BTC&type=candles&tf=${profileTf}&bars=3000&ext=1')`. Yahoo does not cleanly serve crypto → empty response → `levels.length === 0` → empty state.

**This is the Founder's screenshot.** If your first fix passes this test, you have closed the primary defect.

### Repro 2 — F-B "wrong (yesterday's profile)" (early-session date bug)

**Setup:** fresh tab.
1. Symbol: **TSLA**
2. Timeframe: **15m**
3. Time: pre-market **or** first ~5 minutes of RTH open (i.e. before `/api/yahoo` has returned any intraday bars for today)
4. WM Session VP: ON

**Expected before fix:** panel renders a *full profile*. Verify against yesterday's TSLA close — the POC/VAH/VAL are yesterday's session, silently mis-labeled as today's.

**Why:** `selectSessionCandles()` at `WMSessionVP.tsx:90–109` picks `latestDate = eligible.at(-1)?.date`. When today's intraday hasn't landed yet, `latestDate` resolves to *yesterday*. No error surfaces — you see a plausible-looking profile that is 24 hours stale.

### Repro 3 — F-C "empty-gate hides live tape" (only bisect-plausible commit-triggered mode)

**Setup:** fresh tab, mid-session with live tape flowing.
1. Symbol: **TSLA**
2. Timeframe: **15m**
3. State A: ORDER FLOW OFF, Big Trades **OFF**, WM Session VP ON → note VP state.
4. State B: flip Big Trades **ON** → note whether VP breaks or changes.

**Expected before fix:** VP was partially rendering from the live tape layer before (State A). When Big Trades subscribes to the same tick-fold path (State B), the VP goes empty because L224 gates the entire panel on `loading || levels.length === 0` — the live layer is never allowed to paint if the bar layer is empty.

**Why:** Bisect verdict (see addendum §2): commit `3cbf3a9` (WS tick-fold symbol-identity gate, P0-06) tightened the tick-fold path in a way that plausibly starves the live-tape fallback WMSessionVP L193 relies on. `3cbf3a9` is the *trigger*; the empty-gate is the *root cause*.

**Non-triggers ruled out:** `a223fc5` (HUD badge overlay, visual only), `fd12f1e` (badge CSS), `0270590` (comment-only in MainChart — Noah's own forensic already confirmed).

---

## The fix — four required changes to `WMSessionVP.tsx`

Every fix below is already in the root-cause handoff §4. Restated here as a checklist so you can tick them off against your implementation. **All four are required.** A partial fix leaves one of the three reproductions passing.

### Fix 1 — Delete the internal `/api/yahoo` fetch (kills F-A)

`WMSessionVP.tsx:149–165` currently owns its own network call. Delete it. Accept the candle series and provenance from the chart's canonical source:

- Either accept as props from `MainChart` (simplest), or
- Read from a shared chart context that `MainChart` already writes to.

**Do not add a different provider fetch.** If historical session depth beyond the chart's loaded window is needed, that is a separate ticket routed through the canonical provider matrix (`WM-CHART-P0-01A`) — not a fetch inside VP.

### Fix 2 — Session date = live trading day, not "last date in the array" (kills F-B)

Replace `latestDate = eligible.at(-1)?.date` with the **live trading day** derived from the RTH clock. If today's session has no bars yet, render an honest `unavailable` state with reason `"Session starting — awaiting first bars"` — do **not** silently substitute yesterday.

### Fix 3 — Split the empty gate (kills F-C)

Line 224's `loading || levels.length === 0` short-circuits the render before the tick layer paints. Split into two independent conditions:

- Bar layer: paint whatever bar-derived levels exist (may be empty).
- Live-tape layer: paint whatever tick-derived levels exist (may be non-empty even when bar layer is empty).

Each layer labels itself. If both are empty, then render the honest empty state. Never let bar-emptiness suppress a non-empty tick layer.

### Fix 4 — Wire `dataVersion` (immunizes VP against future MainChart regressions)

Consume `dataVersion` from `src/lib/chartContext.ts` (WM-CHART-P0-02, `c53e429`). Use `DataVersionGuard.isCurrent` semantics — do not reinvent. On `dataVersion` change (symbol switch, timeframe switch, provider switch), drop `levels` and accumulated ticks atomically. This is what stops the same defect class as WM-CHART-P0-06 tick-fold from recurring here.

---

## Tests you must ship

Four tests, one per failure mode plus one architectural guard. **Every test must be an executable file under `tests/` or `src/**/__tests__/`, not a manual protocol.**

1. **No independent fetch.** Assert that `/api/yahoo` is not called by `WMSessionVP` under any test scenario. Mock `fetch` and fail if it is called with a Yahoo URL from the VP module.
2. **Symbol-switch race guard.** Render VP for symbol A, immediately switch to symbol B, resolve A's async work last. Assert VP's rendered levels never contain A's price bins after switching to B.
3. **Early-session honest state.** With today's intraday bars empty, VP renders the "awaiting bars" state — **not** yesterday's profile. Assert POC/VAH/VAL are absent, not yesterday's values.
4. **Crypto/exchange-provider honest state.** Render VP for a symbol whose chart provider is not Yahoo. Assert VP either populates from the canonical candles or renders `unavailable` with an honest reason — never blank-Yahoo.

Do not add per-commit tests keyed to `3cbf3a9` or any other bisect SHA — they rot the moment the commit is revised.

---

## Acceptance evidence Sentinel will check

- `tsc --noEmit` 0 errors, `vitest` green with the four new tests, `next build` clean 69/69.
- Reproduction 1 (BTC 1D): VP does not read *"No reported volume"* — either populates from canonical candles or renders an honest unavailable with a reason that names the provider constraint.
- Reproduction 2 (TSLA 15m pre-market): VP does not render yesterday's profile.
- Reproduction 3 (TSLA 15m Big-Trades toggle): VP state is independent of Big Trades toggle.
- Sentinel independently confirms on ≥2 providers live.
- Screenshot pack per WOW responsive standard (390×844 and 834×1194) showing the "unavailable" states rendering honestly at both breakpoints.

## Coordination

- `0270590` **stays**. Reverting it does not restore VP and would re-introduce a dual Delta control. Bisect confirms Noah's static analysis.
- Micah owns the Delta bubble control migration and drawing-tool specs — don't touch either.
- Sentinel is running Test 1/2/3 as their independent verification per my dispatch `1035-forge-to-sentinel-vp-bisect-repro-protocol.md`.
- DEC-011: do not ping the Founder. If you hit a decision that requires escalation, route via Nehemiah (dep coordination) or Elias (scope conflict).
- DEC-008/DEC-012: Forge does not ship this. You implement, Sentinel verifies.

## Not in scope

- The rest of WM-OF-P0-05 (order-flow toolset empty-states) — separate contract.
- Broker changes — separate contract.
- Any other consumer of `chartContext.ts` — do not migrate them opportunistically.
