# FORGE → SENTINEL — VERIFICATION REQUEST for WM-CHART-P0-02

**Date:** 2026-07-29 · **Requester:** Forge · **Ticket:** WM-CHART-P0-02 (Chart Context + Stale-Request Protection)
**Commit under review:** `c53e429` — `feat(charts): ChartContext + dataVersion stale-request guard — WM-CHART-P0-02`
**Status:** Shipped and running in `main` since 2026-07-29; **no independent Sentinel verification handoff on record**
**Ask:** please confirm or reject against the acceptance criteria below.

---

## 1. Why this is being requested now

Every other P0 I've shipped this week has a Sentinel verification handoff on record —
`WM-CHART-P0-01` (DB-V/V-006), `WM-RESP-P0-02` (verified at `176fe7f`), `WM-WYCK-P0-01` (V-005).
`WM-CHART-P0-02` shipped in the same batch but never got its own verification handoff. It is
also a load-bearing dependency for the just-shipped `WM-STATE-P0-01` (the Markov engine's UI
wiring will rely on `DataVersionGuard`), so a formal verification pass matters more than usual.

Not a re-verification request — an initial one that was skipped.

---

## 2. Acceptance criteria — from the ticket

From `docs/operations/ACTIVE_TASK_QUEUE.md`, `WM-CHART-P0-02`:

> A forced-slow 1m response arriving after switching to 4h is **discarded, never rendered**.
> No stale candles persist across symbol change. Every async result carries the `dataVersion`
> it was requested under. `AbortController` fires on supersede.

---

## 3. What the commit actually did — Forge's own account

Files touched (from `git show c53e429 --stat`):

```
src/components/chart/MainChart.tsx |  50 ++++++++++-----
src/lib/chartContext.test.ts       | 124 ++++++++++++++++++++++++++++++++++++
src/lib/chartContext.ts            | 126 +++++++++++++++++++++++++++++++++++++
3 files changed, 283 insertions(+), 17 deletions(-)
```

- **`src/lib/chartContext.ts` (new)** — `DataVersionGuard` class + `applyIfCurrent<T>()` helper +
  `createChartContext()`, `unavailableSlot<T>()`, and the shared type shapes.
- **`src/lib/chartContext.test.ts` (new)** — 124 lines of unit tests including the exact
  ticket scenario (a delayed 1m response arriving after a switch to 4h must be dropped).
- **`src/components/chart/MainChart.tsx`** — imported `DataVersionGuard`, added
  `versionGuardRef`, threaded `AbortSignal` through the five candle-fetch helpers, and gated
  the state-set on `applyIfCurrent()`.

### Notes for the review

- **`DataVersionGuard` DOES have a live importer** — `MainChart.tsx:687` uses it directly. My
  own earlier drive-by grep called this module "inert" and that claim was wrong; it was based
  on a `grep -v "lib/chartContext"` that filtered by line-content rather than file-path and so
  excluded the import line I was looking for. Recording it here so the review starts from
  correct facts.
- **Contrast with `WM-CHART-P0-01`:** five exports there (`assertGranularity`, `resolveFetchPlan`,
  `aggregateCandles`, `hasEnoughBarsForState`, `normalizeTFId`) genuinely have zero non-test
  importers today. That gap is `WM-CHART-P0-03`'s job (fail-closed provider mapping) — which is
  Noah's active ticket. Not this ticket's problem.

---

## 4. Suggested verification method

1. **Repo grep.**
   - `grep -rn "DataVersionGuard\|applyIfCurrent\|createChartContext" src/` — confirm the
     module has real importers (my check found `MainChart.tsx:687`).
   - `grep -n "AbortSignal" src/components/chart/MainChart.tsx` — confirm each of the five
     `fetch*Candles` helpers accepts and forwards it.

2. **Fixture test.** Run `vitest run src/lib/chartContext.test.ts`. The "stale 1m response
   arriving after a switch to 4h" scenario is encoded there and should pass. If it fails, the
   guard is broken and everything downstream is affected.

3. **Full gates.** `tsc --noEmit` clean, `vitest run` currently 78/78, `next build` 69/69.
   These already pass on `main` post-`e0a5ed7`.

4. **Live behaviour (optional, blocked by auth on `/charts`).** Rapid-fire 6 timeframe changes
   in 3 seconds and confirm the final render matches the final selection. This is the manual
   test the ticket calls for; I have not run it because `/charts` is auth-gated and I do not
   enter the Founder's password. If you have a signed-in session you can drive, this is the
   sharpest single check.

---

## 5. What I cannot certify myself

- **Live verification of the trapped-user scenario in production.** Same auth block as before.
  The engine is unit-tested against the exact ticket scenario, but "the test passes" and
  "production behaves correctly under fast user input" are different claims.
- **Interaction with other refetch paths.** The change threads `AbortSignal` through the five
  helpers I could see; if other unrelated code paths in `MainChart.tsx` set candle state
  directly without going through `applyIfCurrent`, they would bypass the guard. Sentinel eyes
  on this catches an issue I might miss.

---

## 6. If verification fails

If the review turns up a defect, I'll fix it before starting the Confluence Meter
implementation — the Meter depends on this pattern being correct.

If it passes, `WM-CHART-P0-02` gets a proper VERIFIED status in the queue matching the other
shipped P0s, and the record is consistent.

Not urgent, but overdue.
