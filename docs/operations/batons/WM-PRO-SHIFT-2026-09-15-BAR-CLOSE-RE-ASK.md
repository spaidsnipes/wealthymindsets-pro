<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# WM Pro — the bar-close proof is re-asked when the clock alone changes it

**Date:** 2026-09-15
**Commit:** `bd35b7a`
**Route:** `/charts`
**Status:** CLOSED — PROVEN LIVE on https://wealthymindsetspro.com
**Law:** canon Weakness #1 — multi-price disagreement on one page · §35 PROTECTED TRUTH
**Closes:** open finding §5.2 of `WM-PRO-SHIFT-2026-09-15-MARKET-FIELD-ONE-MATERIAL-OWNER.md`

---

## 1. What was wrong

Measured live at `2026-09-15T18:23:39Z`, TSLA 15m, both numbers taken in ONE DOM
read so neither can be blamed on read skew:

| owner | reading |
|---|---|
| OHLCV strip | `C 357.87` — tooltip *"this bar's interval has fully elapsed … It will not change."* |
| decision spine | `357.47 LAST 15m BAR CLOSE` · `UNAVAILABLE · asOf 18:14:00Z` |

Two prices, one page, one instrument, one moment, **both wearing the word
"close"**. A trader reading them side by side has no way to know one is a bar
behind.

---

## 2. Root cause — a pure function that is not time-invariant

`deriveLastBarClose` is pure and correct. It names the newest bar only when it
can PROVE the interval elapsed, otherwise the bar before. But that proof

```ts
Math.round(newest.time * 1000) + intervalMs <= nowMs
```

**flips from false to true because the CLOCK ADVANCED** — with no change to
`bars` and no change to `timeframe`.

`usePublishChartMarketState` recomputes only when its inputs change. So on a
quiet tape nothing re-ran for nine minutes and canonical state kept publishing
the runner-up bar long after the newer one had closed.

Both owners were internally honest. `357.47` really *was* the last provably
closed bar **as of 18:14**. The defect is that 18:14 was nine minutes ago and
**nothing was ever going to ask again** — while the price line says
`LAST 15m BAR CLOSE`, a claim about the present.

**Why only the spine was stale.** MainChart's strip is driven by a 1 Hz
countdown `setInterval` that also sets `nowMs`, so its grader re-asked every
second. The publisher had no clock of its own. Same proof, two cadences — that
asymmetry *was* the disagreement.

---

## 3. The fix is a RE-ASK, not a relaxation

The tempting repair is to let the deriver name the newest bar. That trades a
one-bar understatement for a published close that never happened. §35 forbids
it, and `deriveLastBarClose`'s own header argues the point at length. **The
conservatism stays. What changes is WHEN the question is asked.**

- `lastBarCloseRecheckAtMs` returns the single instant the answer can change by
  itself, or `null` when there is nothing to wait for.
- It shares `rankBars` with the deriver. A scheduler carrying its own copy of
  the arithmetic would be a **SECOND OWNER of the same proof** — the exact
  VACUOUS AGREEMENT shape this codebase keeps finding, since two copies agree
  right up until one is edited.
- The publisher arms **one timer** for that instant. **Not a poller:** at most
  one extra publication per bar boundary, and none once the newest bar has
  closed.

---

## 4. Proof — LIVE, across a real bar boundary, without a reload

The initial post-deploy read proves only that the *first* publish works. The
defect lives in what happens **when nothing changes**, so the proof had to
cross a bar boundary on a page that was never reloaded.

A probe was armed in the page at 18:49, then read again after 19:00:00Z:

| | before boundary | after boundary |
|---|---|---|
| read at | `18:49:33Z` | `19:00:48Z` |
| spine | `357.09 LAST 15m BAR CLOSE` | `357.01 LAST 15m BAR CLOSE` |
| `asOf` | `18:49:28Z` | **`19:00:00Z`** |
| `performance.now()` | `633200` | `681575` |

**Continuity control.** `window.__probe` survived and `performance.now()`
advanced monotonically by 48.4s. The page was **not reloaded** between the two
reads — so the republish was done by the running app, not by a fresh mount.

**The decisive number is `asOf 19:00:00Z`.** Not 19:00:48 (when it was read),
not a 5s or 15s poll tick — the *exact bar boundary* `lastBarCloseRecheckAtMs`
computed. The timer fired where the arithmetic said it would.

**Four owners, one number.** Screenshot at 19:00:48Z shows the whole viewport
agreeing:

| owner | reading |
|---|---|
| big price | `357.01` |
| OHLCV strip | `C 357.01` — word flipped `NOW` → `C` at the same boundary |
| axis price line | `357.01` |
| decision spine | `TSLA · 15m · 357.01 LAST 15m BAR CLOSE` · `asOf 19:00:00Z` |

Canon Weakness #1 is closed on this page.

Deploy arrival confirmed behaviourally: `/charts` chunkset digest
`92bdabf4fae4238ef782043d336c513c` → `148fcbc515b53ef497cba75e4477f502`.

---

## 5. Why a source-level gate, and REVIVE

`tsc --noEmit` is **structurally blind**: a missing dependency in a `useEffect`
array is perfectly well-typed. Worse, the old behaviour **renders correctly on
a busy tape** — an unrelated tick re-runs the effect within a second and hides
the staleness. It is visible only when the tape goes quiet, which is precisely
when no fixture would be looking.

Verified by **REVIVE (§22)**: `recheck` was removed from the publish effect's
dependency array **via Edit**, compiled clean at `TSC_EXIT=0`, and the Sentinel
failed **BY NAME** —

> × the publishing effect DEPENDS on the recheck nonce

— then restored. A revived defect that compiles is the definition of a class
the type system cannot hold.

New Sentinel: `src/lib/marketData/lastBarCloseRecheck.test.ts` (12 tests).

### Traps it encodes for its next reader

1. **The live defect is the fixture.** One test reproduces the disagreement
   from the measured numbers with only the clock differing between two calls.
   The bug is written down as arithmetic, not as prose.
2. **No-poll guard.** `lastBarCloseRecheckAtMs` must return `null` once the bar
   has closed. If it returned a timestamp there, the caller would re-arm
   forever and republish canonical state on a treadmill. Pinned explicitly,
   including at the exact boundary (the deriver's `<=` is inclusive).
3. **Declines wherever the deriver declines.** No timeframe, no clock, no bars
   → `null`. Scheduling a wake-up for a change that cannot come is a promise
   the function cannot keep.
4. **Unsorted + polluted input.** Shares `rankBars`, so a scheduler that timed
   the last array element (wrong on any newest-first provider) or counted a
   zero-close bar as newest turns this red.
5. **Over-correction guard.** Asserts the captured clock still reaches the
   deriver at all. Re-asking is ceremony if `capturedAt` is ever dropped.
6. **Vacuity guard** (per `lib/ops/sentinelsProveTheyScanned.test.ts`): the
   source-text half proves its read found material first.

### Engineering note worth keeping

`setTimeout` clamps delays past ~24.8 days to a **spurious immediate fire**. A
daily or weekly timeframe exceeds that, and an immediate fire would re-arm in a
hot loop. Those intervals are far coarser than the staleness being fixed, so
the effect **declines rather than spins**.

---

## 6. Gates

```
vitest run   → 7046 passed (7046), 604 files passed (604)   EXIT 0
tsc --noEmit →                                              EXIT 0
```

(Previous baton: 7034 / 603. Delta = +12 tests, +1 file.)

---

## 7. Checked during this atom — NOT defects

Recorded so the next reader does not re-open them.

### 7.1 `/command-deck` publishes no `bars`

`usePublishChartMarketState` is called there without a `bars` key, so canonical
`lastBar` is always null on that route. **Checked, not a silent drop:** the
deck has no chart and loads no candles — grep for `bars`/`candles`/`OHLCV` in
`app/command-deck/page.tsx` returns only prose. This is honest absence (H1 —
*absence is not zero*), not the forwarder-by-omission defect the publisher's
own header warns about. Do not invent bars to fill it.

### 7.2 The deck's own freshness clock

`/command-deck` already reads `useCanvasClock()` on a 5s cadence and lists it in
its memo deps, so the clock-staleness class does not exist there. Checked.

### 7.3 Delta Bubbles level ownership · Live VP render geometry

Both adoption Sentinels — `deltaBubbleLevels.adoption.sentinel.test.ts` and
`deltaVPGeometry.adoption.sentinel.test.ts` — **pass (14 tests)**. The
source-level halves of these gates are already landed and enforced: the
arithmetic cannot move back inline without failing by name. What remains is the
**raster half**, which needs a rendered canvas on real per-trade tape and stays
blocked (see §8).

### 7.4 Paper execution state machine realism

Thirty-plus `paper*` modules carry their own suites and are green in the full
run above, including `paperExecutionRealism`, `paperOrderStateMachine`,
`paperShortRealism`, `paperStopRealism`, `paperFillQueueBasis` and
`paperCancelCertainty`. The source-level gate is substantially closed. Live
proof of a filled/short/cancelled book must be done by injecting probe records
into an **isolated copy** of localStorage — never by submitting orders into the
Founder's live paper book.

---

## 8. Still blocked (unchanged)

- Decision Memory sealing — zero production callers. **Architectural; surface,
  do not rush-wire.** It needs a decision surface first.
- `executionConnectivity` orphaned — not a live defect; `/readiness` discloses
  honestly.
- Gate 4 responsive device proof — programmatic window resize does not take
  effect, `outerWidth` pinned.
- `/journal` detail canvas — 0 journal entries.
- Delta Bubbles / Live VP **raster** half — no per-trade tape on the free tier.
- Top chrome 178px / 21.2% of `/charts` (§5.1 of the previous baton). The room
  header is already the ATHOS fusion, locked by `chartsCategoryFusion.test.ts`
  and `chartPhoneControlReachability.test.ts`, with no horizontal room left.
  Reclaiming more means **deleting content — a Founder call.**
