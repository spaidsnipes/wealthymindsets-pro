# FVG / Imbalance — Methodology (DEFINITION_ID `FVG_3C`, DEFINITION_VERSION 1)

> **ONE OBJECT. ONE DEFINITION. ONE HISTORY. MANY VIEWS.**
> The executable law is `src/lib/marketData/fvg/fvgDefinition.ts`. If this document and that
> file disagree, the file is the law and this document is the defect.

Owners:

| Concern | Owner |
|---|---|
| Definition, constants, identity, size units, horizon table | `src/lib/marketData/fvg/fvgDefinition.ts` |
| Detector (incremental + history scan), lifecycle, as-of accessor, visibility budget, MarketObject projection | `src/lib/marketData/fvg/fvgEngine.ts` |
| Descriptive outcome statistics | `src/lib/marketData/fvg/fvgStats.ts` |
| Bars | `CanonicalBar` (`src/lib/marketData/canonicalBar.ts`) |
| Tick | `pricePrecision.instrumentTickFor` → `contractEconomics.instrumentEconomics` |
| Session | `sessionWindow.sessionWindowFor` / `sessionKeyOf` |
| Shared drawer | `marketObjectKinds.ts` kind `GAP_FVG` (no new kind, no "FVG room") |

Scanner, Market Home, Inspect, Memory, Replay, Backtest, Journal, Review, Personal Edge, Academy
and SpaidBot **read** these owners. None of them detects, ages or counts a gap of its own.

## What WM does not claim

* "Every FVG has to fill" is **not** market law. WM never encodes or displays MUST FILL. It
  measures what happened.
* No magic number. There is no "FVG STRENGTH 87". Displacement is recorded as context and is
  never folded into a grade.
* No probabilities. The statistics are counts with their denominators, labelled **DESCRIPTIVE**.

## 1. Definition

* **Bars:** three consecutive **closed** bars `b1, b2, b3` on one instrument and one timeframe.
  The forming bar is never read.
* **Bullish:** `low(b3) > high(b1)`. The territory is `[high(b1), low(b3)]`.
* **Bearish:** `high(b3) < low(b1)`. The territory is `[high(b3), low(b1)]`.
* **Strict inequality:** a zero-width gap is not a gap.

## 2. Wick treatment

The definition reads **wicks** (high/low), not bodies. Penetration and mitigation are also read
from wicks. Closes decide rejection, acceptance and trade-through.

## 3. Displacement bar

`b2`'s body must point in the gap's direction: `close > open` for bullish and `close < open` for
bearish. A doji or a counter-body `b2` is not an FVG under v1.

The following are recorded as **displacement context only**. They are not a further filter.

* `bodyRatio` = |close − open| ÷ (high − low)
* `rangeAtr` = (high − low) ÷ ATR(14) at b2

## 4. Minimum size

The gap must satisfy **size ≥ max(1 instrument tick, 0.10 × ATR(14) at b2)**.

* **ATR:** Wilder ATR(14), using the `marketBreathing.atrSeries` rule (an SMA seed of the first
  14 true ranges, then smoothed), read at b2 with b2 included.
* **Tick:** comes from the one tick owner. Where no tick is on file (crypto venues, spot FX), the
  ATR term stands alone. The object records `minimum.basis` (`TICK` or `ATR`).
* **Boundary:** the comparison is inclusive, with a 1e-9 relative tolerance for float noise.
* **Warm-up:** before ATR(14) exists at b2, nothing is detected. The skipped triples are counted
  in `warmupTriples`.

### Size units

Every gap carries its size in price, plus the units that apply to its asset class.

| Class | Primary unit | Also carried |
|---|---|---|
| Futures | ticks | points |
| US equity / index | points | ticks (cents) |
| FX | pips (0.0001; 0.01 for JPY-quoted pairs) | points |
| Crypto / unknown | points | — |

## 5. Timeframe

The timeframe is the bars' own timeframe. Two timeframes are two objects, with two ids.

## 6. Session treatment

* Each bar is keyed by the session owner:
  * US equities: ETH by default.
  * Futures: the Globex day (or grains/livestock hours).
  * FX: the 17:00 ET roll.
  * Crypto: the 00:00 UTC day.
  * Daily and longer: each bar is its own session.
* The object records b2's session key and a `segment` (`RTH` / `EXTENDED` for US equities,
  otherwise the window kind).
* `crossesSession` is set when b1..b3 span a session boundary, i.e. an opening gap. Such gaps
  **are** detected and flagged, so the statistics can split them.
* A timeframe with no registry clock (tick bars) must supply `closeTimeOf`, or every bar is
  refused with `NO_CLOCK`.

## 7. Creation and identity

* **Creation:** at the **close of b3**, never earlier. `createdAt` is b3's close time.
* **OBJECT_ID:** `FVG|<instrument>|<timeframe>|<b2 open time ms>|<BULLISH|BEARISH>|v1`.
  * It is minted once at birth, using the `mintBarId` pattern: deterministic, and null on any
    blank part.
  * It carries the definition version, so historical objects keep their version.
  * The object is **never respawned**. Every later fact is appended to the same object.

## 8. Lifecycle

The **near edge** is the one price returns to first (bullish: top; bearish: bottom).
**Penetration** = depth past the near edge ÷ size, clamped to [0, 1].

| State | Rule |
|---|---|
| BORN | At b3's close. |
| OPEN | A later bar closed without coming near. |
| APPROACHING | Untouched only. A wick came within **max(0.5 × size, 0.25 × ATR(14) at b2)** of the near edge. |
| TOUCHED | The first bar whose wick reaches the near edge (penetration 0). First-touch time, bars and sessions are recorded. |
| PARTIALLY_MITIGATED | Deepest penetration > 0 and < 50 %. |
| DEEPLY_MITIGATED | Deepest penetration ≥ 50 % and < 100 %. |
| FULLY_MITIGATED | A wick reached the far edge, with no close beyond it. |
| REJECTED (responded) | Within an interaction, inside its first **5 bars**, a bar **closed** back outside on the origin side while not fully mitigated. |
| ACCEPTED | Within an interaction, **2 consecutive closes** inside the territory (before any rejection). |
| TRADED_THROUGH | A bar **closed** beyond the far edge. This is the invalidation, and it is terminal. |
| MEMORY | The aging overlay (see §9). The object is not deleted, and a new interaction brings it straight back. |

How the state is reported:

* `state` is the latest observed event. Names derive only from observed interaction.
* `mitigation` is cumulative, so a shallow later touch never "un-mitigates".
* `remaining` is the band no wick has visited. It becomes null once the gap is fully mitigated.

### Interactions

An **interaction** is an episode of consecutive bars that trade into the territory, plus the bar
that closes it out. Each one records:

* Start and end.
* Deepest penetration.
* Its **first** response: REJECTED or ACCEPTED. It is TRADED_THROUGH only if that close came
  first, NONE if the episode ended without a response, and OPEN while the episode runs.
* A `tradedThrough` flag.
* **Post-touch displacement:** the furthest wick excursion away from the near edge on the origin
  side, over the 5 bars after the episode's first bar, in ATR(14)-at-b2 units.

## 9. Memory, aging and visibility

* **Scars become MEMORY:** a scar (traded through, or fully mitigated) becomes MEMORY 20 closed
  bars after its terminal event.
* **Idle gaps become MEMORY:** a live gap becomes MEMORY after 300 closed bars with no
  interaction. Birth counts as the last interaction.
* **Visibility budget** (`selectFvgVisibility`):
  * Up to 6 live gaps, ordered by distance from the last close to their remaining territory, then
    newest first. This is an **ordering, not a grade**.
  * The 3 most recent scars.
  * Everything else is counted as hidden. Nothing is deleted.

## 10. Horizons (descriptive, at first touch)

| Horizon | Rule |
|---|---|
| IMMEDIATE | ≤ 3 closed bars after creation, same session |
| SAME_SESSION | Same session, later than that |
| NEXT_SESSION | The very next session |
| LATER_SESSION | 2–4 sessions later |
| MULTI_DAY | 5 or more sessions later |
| STILL_OPEN_WITHIN_HORIZON | Not touched as of the reading |
| SESSION_UNKNOWN | Touched after > 3 bars, on a series with no session clock |

## 11. As-of-time truth

* Every lifecycle fact is an **event** stamped with the close time of the bar that revealed it.
* The object is the fold of its events (`foldFvgObject`).
* `fvgStateAsOf(ledger, t)` folds only the events known at `t`, using the same reducer as live.
* **Tested:**
  * Frozen right after formation, nothing later is visible.
  * One millisecond earlier, the object does not exist.
  * As-of at every bar equals a scan of exactly the bars closed by then.

## 12. Evidence per sense

| Sense | Evidence |
|---|---|
| Price geometry | **FULL**, from OHLC |
| Order flow, derivatives | `NOT_ATTACHED` until another owner's reading is attached **by reference** (`owner`, `ownerState` verbatim, `ref`) |

The FVG never upgrades or re-grades another owner's evidence.

## 13. Descriptive statistics

`describeFvgOutcomes` / `describeFvgOutcomesBy` (instrument, timeframe, session, regime,
direction, crossesSession) report the following. Every rate is `{count, of, share}`.

* **Detection and revisits:** detected, touched, revisit by horizon, same-session vs
  later-session.
* **Timing:** median bars and ms to first touch.
* **Depth:** partial / deep / full mitigation, average deepest penetration.
* **Responses:** rejection after touch, acceptance, trade-through.
* **Still open:** with a right-censoring count of gaps too young to have been revisited.
* **Displacement:** average post-touch displacement.

The label is **DESCRIPTIVE — counts of what happened; not probabilities**.
