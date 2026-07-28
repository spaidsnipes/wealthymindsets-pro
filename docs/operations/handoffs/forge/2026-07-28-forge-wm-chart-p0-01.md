# FORGE HANDOFF — WM-CHART-P0-01 Canonical Timeframe System

**Date:** 2026-07-28 · **Employee:** Forge · **Ticket:** WM-CHART-P0-01
**Repo:** `spaidsnipes/wealthymindsets-pro` · **Branch:** `main` · **Commit:** `d2ea511`
**Status:** **COMPLETE — awaiting Sentinel verification**
**Next owner:** Sentinel (verify), then Forge or Noah on `WM-CHART-P0-01b`

---

## 1. What shipped

`src/lib/timeframes.ts` — one canonical timeframe module. The three incompatible
literals are gone; all three call sites now derive from it.

| Before | After |
|---|---|
| `ChartToolbar.tsx:433` — `["1m",…,"D","W","M"]` | derives from `CHART_TF_SHIPPED` |
| `backtesting/page.tsx:27` — same literal | derives from `CHART_TF_SHIPPED` |
| `heatmaps/page.tsx:251` — `["1D",…,"5Y"]` | derives from `HEATMAP_TF_ORDER` |

**Files changed (5):** `src/lib/timeframes.ts` (new), `src/lib/timeframes.test.ts` (new),
`src/components/chart/ChartToolbar.tsx`, `src/app/heatmaps/page.tsx`,
`src/app/backtesting/page.tsx`.

**Deliberately not touched:** `src/app/lounge/page.tsx` (unrelated WIP, preserved dirty)
and all `docs/operations/*` edits belonging to other employees.

---

## 2. Architecture rationale

**Two axes, separated.** A timeframe was being treated as one value. It is a pair:
`candleIntervalSec` (bar size) and `defaultRangeSec` (visible history). "5Y" is a weekly
candle over five years, not a five-year candle. Conflating these is *why* the chart and
heatmap could not agree. They are now distinct fields.

**One vocabulary.** `"D"/"W"/"M"` and `"1D"/"1W"/"1M"` were two dialects for the same
thing. `TFId` is canonical; `normalizeTFId()` migrates persisted layouts so saved user
state does not break.

**Unknown stays unknown.** `maxRangeSec` is `number | null`. `null` means "not
established by probe" — the type makes an unmeasured cap representable rather than
forcing a guess.

---

## 3. Provider support — MEASURED, per ticket blocker

Probed Yahoo Finance v8, symbol AAPL, 2026-07-28. Recorded in `PROVIDER_EVIDENCE`
so a future engineer can re-run and diff rather than trust prose.

**Rejected outright** (provider's own error enumerates valid intervals):
`3m`, `10m`, `45m`, `2h`.

**Modelled as `aggregated` from an exact integer divisor** — the only aggregation the
module permits:

| Target | Source | Factor |
|---|---|---|
| `3m` | `1m` | ×3 |
| `10m` | `5m` | ×2 |
| `45m` | `15m` | ×3 |
| `2h` | `1h` | ×2 |

**Measured depth caps:** `1m` ≤ 8 days (provider states the limit explicitly);
`2m` OK 1mo / ERROR 3mo; `5m`,`15m`,`30m` OK 1mo / ERROR 2mo; `1h` OK 2y / ERROR 5y;
`4h` OK 2y; `1d`,`1wk`,`1mo` OK 10y.

### The silent-downgrade trap — new finding, worth Sentinel's attention

Yahoo does **not** reliably error on an unsupported interval/range pair. With
`range=max` it returns **HTTP 200** and `dataGranularity: "3mo"` **regardless of the
interval requested** — `1m`, `5m`, `1h` and `1d` all came back as 3-month bars.

Rendering that would put 3-month candles on screen labelled "1m" — fabricated-looking
data, barred by Founding Principle 3. `assertGranularity()` rejects any response whose
returned granularity differs from the one requested, and `resolveFetchPlan()` never
emits `range=max`.

**Method note:** my first probe reported "max works for every interval" because it kept
the last successful range and Yahoo silently coerced rather than failing. I caught the
false positive (identical 168-bar counts across every interval) and re-probed against
`dataGranularity`. The first result was wrong; the recorded one is the corrected one.

---

## 4. Verification evidence

| Check | Result |
|---|---|
| `tsc --noEmit` | **0 errors** |
| `npm test` | **43/43 passing** (32 new in `timeframes.test.ts`) |
| `npm run build` | **Clean, 69/69 pages** |
| AC#2 grep | Zero hardcoded literals; every `TIMEFRAMES` reference derives from the module |

**Render proof — exact values each toolbar will emit:**

```
CHART toolbar  -> 1m=>1m  2m=>2m  5m=>5m  15m=>15m  30m=>30m  1h=>1h  1D=>D  1W=>W  1M=>M
HEATMAP toolbar-> 1D  1W  1M  3M  6M  1Y  5Y

Fetch plans (measured caps applied):
  1m   -> provider=1m   x1 range=1d
  3m   -> provider=1m   x3 range=3d     (aggregated)
  45m  -> provider=15m  x3 range=30d    (aggregated)
  2h   -> provider=1h   x2 range=90d    (aggregated)
  5Y   -> provider=1wk  x1 range=1825d
```

**This is the regression evidence that matters:** the chart toolbar emits the *identical
nine strings* it emitted before, so the chart data path is provably untouched while the
module now owns the vocabulary.

**Pixel-level visual proof: NOT AVAILABLE.** The chart toolbar sits behind auth and
`/charts` is unreachable without a session (I do not enter credentials). A screenshot
could not show the toolbar regardless. The render proof above is the strongest evidence
obtainable under that constraint. A dev server on port 3000 belonging to another chat
session was left running and undisturbed.

---

## 5. Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Exactly one `TFId` definition repo-wide | **MET** |
| 2 | `grep TIMEFRAMES src/` → only canonical module + importers | **MET** |
| 3 | `"D"/"W"/"M"` unified with `"1D"/"1W"/"1M"` | **PARTIALLY MET** — canonical vocabulary and the mapping are centralized in one module, but the toolbar still *emits* the legacy string because six downstream consumers switch on it. See §6. |
| 4 | Every interval labelled from measured probes | **MET** |
| 5 | Aggregation only from exact integer divisors | **MET** — enforced in code and unit-tested |
| 6 | Unsupported renders disabled, never silently substituted | **MET in principle** — no timeframe currently ships as `unsupported`; the stronger protection is `assertGranularity()` against silent downgrade |
| 7 | No state-model change, no UI restyle | **MET** |

**AC#3 is reported honestly as partial rather than claimed complete.** Full unification
requires migrating the consumers, which is §6.

---

## 6. Discovered scope — filed, not absorbed

Migrating the toolbar to emit canonical `"1D"` would break the chart, because the legacy
form is consumed in at least six places:

`src/hooks/useWebSocket.ts:701` · `src/components/chart/MainChart.tsx:105, 160, 219, 1545`
· `src/components/chart/WMSessionVP.tsx:152` · `src/components/chart/indicatorConfig.ts:16`

Per the queue rule ("a discovered adjacent problem becomes a new queue entry, not an
edit") this is **WM-CHART-P0-01b**, not an expansion of this ticket — especially since I
cannot verify the chart data path without an authenticated session.

**Adjacent finding for triage (not fixed):** `MainChart.tsx:219` maps `"2h"` and `"4h"`
to provider interval `"60"`. If it does not aggregate afterwards, 2h may already be
rendering 60-minute bars under a 2h label. Yahoo *does* support native `4h` but rejects
`2h`. Worth a Sentinel look — potential pre-existing mislabel, unverified.

---

## 7. Risks

- **AC#3 partial** — two vocabularies still exist at runtime, though only one is authored.
- **Aggregated intervals defined but not exposed.** `CHART_TF_SHIPPED` deliberately
  withholds `3m/10m/45m/2h` until the fetch path aggregates. Exposing them first would
  ship mislabelled bars. This means the "19 timeframes" goal is **not** user-visible yet —
  the model supports it, the UI does not. Stated plainly so no one reports it as done.
- **Provider caps are point-in-time.** Measured 2026-07-28 against AAPL. Yahoo may change
  limits; `PROVIDER_EVIDENCE.probedAt` exists so staleness is visible.
- **Single-symbol probe.** Caps were measured on AAPL only; thinly-traded or non-US
  symbols may differ. Unverified.

---

## 8. Next ticket

**Recommended: `WM-CHART-P0-02` — Chart Context + Stale-Request Protection.** Its stated
dependency (P0-01) is now satisfied, and `resolveFetchPlan()` / `assertGranularity()` give
it the request-shaping primitives it needs.

`WM-CHART-P0-01b` (consumer migration) should be sequenced **with or after** P0-02, since
both rewrite the same call sites — running them in parallel would conflict.

**Blocked on the Founder either way:** WM Pro `/charts` remains unverifiable without an
authenticated session, so no chart-facing ticket can be certified by interaction evidence.
Either sign in yourself in the Browser pane, or apply the Chrome fix in
`docs/WM_CHART_ARCHITECTURE_2026-07-28.md` §A (Chrome is running from a Desktop copy,
which is why AppleScript-based tools report it as not running).

**For Sentinel:** re-run the AC#2 grep, inspect `PROVIDER_EVIDENCE` against a fresh probe,
confirm the emitted-string equivalence in §4, and rule on whether AC#3-partial is
acceptable for ticket closure or whether P0-01b must land first.
