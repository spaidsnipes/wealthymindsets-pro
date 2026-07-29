# FORGE HANDOFF — WM-CHART-P0-02 Chart Context + Stale-Request Protection

**Date:** 2026-07-28 · **Employee:** Forge · **Ticket:** WM-CHART-P0-02
**Repo:** `spaidsnipes/wealthymindsets-pro` · **Branch:** `main` · **Commit:** `c53e429`
**Status:** **COMPLETE — awaiting Sentinel verification**
**Next owner:** Sentinel (verify), then Forge/Noah on `WM-HEAT-P0-01` or `WM-TEST-P0-01`

---

## 1. What shipped

`src/lib/chartContext.ts` (new) — the canonical `dataVersion` primitive per architecture
doc §D2, plus `ChartContext`/`StateSlot` types.

- **`DataVersionGuard`** — `next()` issues a monotonic `dataVersion` + a fresh
  `AbortSignal`, aborting whatever the previous call to `next()` still had in flight.
  `isCurrent(version)` tells a caller whether a tagged result is still current.
  `dispose()` aborts without starting a new version (unmount path).
- **`applyIfCurrent()`** — applies a value only if its tagged version is still current;
  returns `false` (and never calls the setter) otherwise.
- **`ChartContext`/`StateSlot<T>`** — match §D2 exactly. `regime`/`markov`/`wyckoff`
  default to `unavailable` and are **not populated by this ticket** — that's
  WM-STATE-P0-01. Per DEC-009 no Wyckoff engine exists, so that slot must stay
  `unavailable` until one does; shipping anything else would fabricate a phase.

**Wired into `src/components/chart/MainChart.tsx`** (the actual candle-fetch path):

- Added a `versionGuardRef = useRef(new DataVersionGuard())`, sitting alongside the
  existing `chartRef`.
- The bootstrap effect calls `versionGuardRef.current.next()` at the top of every run,
  getting `myDataVersion` + `myAbortSignal` for that symbol/timeframe/candleType/
  extendedHours combination.
- `myAbortSignal` is now passed into **every** fetch in the provider fallback chain —
  exchange, Alpaca, Finnhub-direct, Yahoo, Finnhub, Polygon — plus the parallel
  spot-price fetch. All five helper functions (`fetchAlpacaCandles`,
  `fetchFinnhubCandlesDirect`, `fetchYahooCandles`, `fetchFinnhubCandles`,
  `fetchPolygonOHLCV`) gained an optional trailing `signal?: AbortSignal` parameter.
- The existing pre-ticket guard (`buildId`/`disposed`, right before the fetched data is
  applied to the chart) is **left in place** — it already worked. I added
  `versionGuardRef.current.isCurrent(myDataVersion)` as a second check at the same
  checkpoint, so the canonical primitive and the effect's own mechanism must **both**
  agree the response is still current before it touches the chart.
- Cleanup now calls `versionGuardRef.current.dispose()` alongside the existing
  `disposed = true` / `__buildId = -1`, so changing symbol/timeframe **aborts** the
  previous run's in-flight HTTP requests instead of only letting their results be
  silently ignored once they land.

**Files changed (3):** `src/lib/chartContext.ts` (new), `src/lib/chartContext.test.ts`
(new), `src/components/chart/MainChart.tsx`.

**Deliberately not touched:** `src/app/lounge/page.tsx` (unrelated WIP, preserved dirty,
RISK-004) and all `docs/operations/*` edits belonging to other employees.

---

## 2. Why this was additive, not a rewrite

`MainChart.tsx` is 7,200+ lines and already had a working, purpose-built stale-response
guard (`buildId` + `disposed`, engineered specifically to fix an earlier blank-chart bug —
see the comments at the top of that effect). Ripping it out to force a full migration onto
the new shared primitive in one pass, in a file I cannot live-test end-to-end (see §4),
would have been the kind of large risky rewrite the operating rules warn against.

Instead: the new canonical `DataVersionGuard` is now genuinely driving real behavior
(the `AbortController` wiring — previously **absent** entirely, confirmed by grep before
I started) and stands as a second, independent confirmation alongside the proven
`buildId`/`disposed` check. Fully retiring the old mechanism in favor of the shared one is
low-risk follow-up, not required for this ticket's acceptance criteria.

---

## 3. Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | A forced-slow 1m response arriving after switching to 4h is discarded, never rendered | **MET** — unit-tested directly (§4); enforced live by the `isCurrent()` check before chart application |
| 2 | No stale candles persist across symbol change | **MET** — same guard applies on symbol change (effect dep array includes `symbol`) |
| 3 | Every async result carries the `dataVersion` it was requested under | **MET** — `myDataVersion` captured once per effect run, threaded through the whole fallback chain |
| 4 | `AbortController` fires on supersede | **MET** — `next()` aborts the prior signal; cleanup also calls `dispose()` |

---

## 4. Verification evidence

| Check | Result |
|---|---|
| `tsc --noEmit` | **0 errors** |
| `npm test` | **56/56 passing** (13 new in `chartContext.test.ts`) |
| `npm run build` | **Clean, 69/69 pages** |
| grep confirms no pre-existing `AbortController` usage in `MainChart.tsx`'s fetch chain | **Confirmed absent before this change** |

**Unit test directly modeling the ticket's own example scenario** (`chartContext.test.ts`,
*"simulates a forced-slow 1m response arriving after a 4h switch"*): issues a version for
a 1m request, supersedes it with a 4h request before the (simulated slow) 1m response
resolves, applies the fast 4h result, then applies the late 1m result — asserts the
render is still `"4h-candles"`, never overwritten by the stale `"1m-candles"`.

**Manual verification (6 rapid timeframe changes in 3s, on the live chart): NOT
PERFORMED.** WM Pro `/charts` sits behind auth and remains unreachable without a session
(RISK-001, unresolved since the prior handoff — I do not enter credentials). This is the
same constraint that blocked pixel-level proof on `WM-CHART-P0-01`. The unit test above is
the strongest evidence obtainable under that constraint; it is not a substitute for
driving the real chart.

---

## 5. Risks / honest gaps

- **Live manual verification is still impossible** — RISK-001 unresolved. Sentinel cannot
  certify the "6 rapid timeframe changes" criterion by interaction evidence until it's
  fixed (Chrome relaunched from `/Applications`, or Founder signs in in the Browser pane).
- **`buildId`/`disposed` and the new `DataVersionGuard` are currently redundant, not
  unified.** Both must agree for data to apply — belt-and-suspenders, not a single source
  of truth yet. Fully retiring the old mechanism is safe, small follow-up work, not filed
  as its own ticket since it's a pure simplification with no behavior change.
- **Only the candle-fetch path is wired.** `ChartContext`'s `regime`/`markov`/`wyckoff`
  slots exist but are inert placeholders — WM-STATE-P0-01 depends on this ticket for the
  shape, not the other way around.
- **Queue note for Sentinel:** earlier in this session this ticket briefly, incorrectly
  showed `"VERIFIED — CLOSED at d2ea511"` in `ACTIVE_TASK_QUEUE.md`. `d2ea511` is the
  WM-CHART-P0-01 commit and contains zero occurrences of `dataVersion` or
  `AbortController` (verified via `git show d2ea511 | grep -c`). That entry was already
  corrected in the queue before this handoff was written; noted here only so the false
  record doesn't resurface.

---

## 6. Next ticket

**Recommended: `WM-HEAT-P0-01` (Heatmap Request Correctness) or `WM-TEST-P0-01`
(Cross-Timeframe Regression Suite — non-perf half).** Both list `WM-CHART-P0-01` as their
dependency and are now unblocked; `WM-TEST-P0-01` in particular can validate this ticket's
`dataVersion` guarantee against the real fetch chain once written.

**For Sentinel:** confirm the grep/diff evidence in §4, review whether the
belt-and-suspenders (`buildId` + `DataVersionGuard`) approach is acceptable for closure or
whether full consolidation should be a follow-up ticket, and re-flag RISK-001 as the
blocker on manual verification for this and every other chart-facing ticket.
