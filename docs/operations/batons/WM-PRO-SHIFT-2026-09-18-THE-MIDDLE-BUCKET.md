# THE MIDDLE BUCKET — 2026-09-18

Five commits, one defect, four disguises.

    66e3f9e0  fix(market-state): a dimension is in exactly one bucket — PARTIAL gets a home
    1387e70e  fix(passport): the middle bucket cannot be reached by subtraction
    3a3d81a5  fix(hero-truth): the truth strip names the middle bucket instead of implying it
    edde7236  fix(canvas-pill): the withheld count is a fact, "open the canvas" is an instruction
    52bb844c  fix(equipment-rail): Market reality counts all three buckets, not two of three

## THE DEFECT

`MarketStateResolution` has THREE values — `RESOLVED | PARTIAL | UNKNOWN`. Two
surfaces each took the complement of a DIFFERENT half:

    chartMarketStatePublisher   resolution !== "RESOLVED"  → PARTIAL swept into MISSING
    selectMarketCanvas          resolution !== "UNKNOWN"   → PARTIAL swept into RESOLVED

Complements of different halves. Union = everything. **Intersection = PARTIAL.**
Neither predicate is wrong alone, which is why both survived review.

FOUND FROM USE, production `/charts?symbol=TSLA`. One page, one instant, one
instrument, three irreconcilable counts of how much WM knows:

    DECISION rail       "No chapter resolved (1/8 dimensions resolved)"
    Canvas pill         "WAIT · 7 unresolved · 8 blockers · 1 cleared"
    MarketCanvasPanel   RESOLVED (4) · UNRESOLVED (7)

**7 + 4 = 11, for EIGHT dimensions.** `location`, `aggression` and `profile`
printed in BOTH adjacent columns of the same panel, in the same frame.

## THE FOUR DISGUISES

1. **A LOOSE PREDICATE** — `!== "RESOLVED"` / `!== "UNKNOWN"`.  → `66e3f9e0`
2. **ARITHMETIC** — `totalCount - resolvedCount`. *Total minus resolved is the
   same lie as `!== "RESOLVED"`: the complement of one half of a three-valued
   type, reached by subtraction instead of a filter.* → `1387e70e`
3. **AN INCOMPLETE STRIP** — `HeroTruth` printed RESOLVED and UNKNOWN and
   invited the reader to subtract for the third. → `3a3d81a5`
4. **AN INCOMPLETE COUNT ROW** — both equipment rails counted `resolved` and
   `missing` and nothing else. *A rail that omits a bucket is the same lie as a
   predicate that mis-sorts one.* → `52bb844c`

**A COUNT THAT CAN ONLY BE REACHED BY SUBTRACTION HAS NO OWNER, and the middle
bucket is exactly what subtraction destroys.**

## WHAT HID IT

`/command-deck` printed "RESOLVED 4 of 8 … unknowns 4" and a code comment
reasoned the pair was correct. It sums only because that BTC frame carried ZERO
partials. **4 + 4 = 8 WAS LUCK, NOT A RULE.**

## THE REPAIR

`dimensionStanding` + `partitionDimensionStandings` in `canonicalMarketState.ts`
own the split. The partition is **disjoint and total BY CONSTRUCTION** — each key
is pushed exactly once through a `switch` total over `MarketStateResolution`.
`dimensionStandingIsAPartition.sentinel.test.ts` (14 tests) asserts the PROPERTY,
not any spelling of a predicate, so a future surface may compute standings
however it likes and still cannot produce overlapping columns.

`lifecycleOf` is deliberately NOT collapsed into `dimensionStanding` — the
passport's RESOLVED additionally requires `!!d.value?.trim()`.

## A SEPARATE PRINCIPLE, SAME SHIFT (edde7236)

**THE REMAINDER IS A FACT; "OPEN THE CANVAS" IS AN INSTRUCTION, AND ONLY ONE OF
THE TWO IS TRUE ON EVERY SURFACE.**

The pill's tooltip read `+5 more — open the canvas` on live `/charts`, which
passes no `scrollToSelector` — the pill was a static `<div role="status">`, there
is no button, and the Market Reality canvas is not on that page at all. The
truncation marker must survive (an unmarked truncation reads as a complete
list), so the COUNT is unconditional and the DIRECTION is earned.

## LIVE PROOF — production wealthymindsetspro.com/charts?symbol=TSLA

**`66e3f9e0` PROVEN.** Pill tooltip moved from `Unresolved dimensions (7)` to
`Unresolved dimensions (4)`, naming exactly Direction, Regime, Volatility, Order
Flow — while the story sentence in the SAME frame read "…location, aggression,
profile measured but not decision-grade." **1 + 3 + 4 = 8.**

**`1387e70e` PROVEN.** Workspace → Market object passport preview:

    1 resolved · 3 forming · 4 unresolved · 8 objects

Three counts by membership, summing to the total. No subtraction.

**`52bb844c` — THE DEFECT CAPTURED LIVE, PRE-DEPLOY.** Workspace → Market
reality preview on the same frame:

    1 resolved · 4 missing · 8 blocking

Five of eight. `location`, `aggression`, `profile` absent from the rail entirely
while the passport one press away listed three of them as FORMING. The fix is in
HEAD and pushed; the deployed build sits between `1387e70e` and `52bb844c`.
**Re-probe after deploy.**

## THE EQUIPMENT IS CONNECTED — an honest negative, resolved

A probe found 35 buttons on live `/charts` and ZERO matching
`/market reality|workspace|passport|order flow/i`, with no "WORKSPACE" text
anywhere. That looked like the room's equipment having no door.

It is not. `/charts` seeds `railDefaultOpen={false}` — the instrument room gives
the chart the screen. Pressing `[data-testid="os-rail-toggle"]` renders
`os-rail-workspace` with all three entries present and working:

    WORKSPACE
      Market reality           What is resolved, what is missing, what blocks entry
      Market object passport   Where each reading came from, and what would break it
      Order flow               Whether the side pressing is being paid for the effort

Both presses opened preview stage and reflected into the URL
(`?equip=market-reality&stage=preview`). **REACHABLE, FED, OBSERVABLE.**

A null probe for `equipment-count-*` is EXPECTED on a cold `/charts` — the
equipment is press-gated by design (`RoomEquipmentLayer`: "renders NOTHING until
the trader presses 'Market reality'"). Absence there is not evidence of breakage.

## GATES

Every commit: `./node_modules/.bin/vitest run` and `tsc --noEmit`, UNPIPED.

    3a3d81a5   VITEST EXIT=0   764 files   9531 passed | 2 skipped    TSC EXIT=0
    edde7236   VITEST EXIT=0   764 files   9534 passed | 2 skipped    TSC EXIT=0
    52bb844c   VITEST EXIT=0   764 files   9536 passed | 2 skipped    TSC EXIT=0

Mutation receipt on each: mutated the guarded token, confirmed RED **by test
name**, restored, confirmed green. A guard that has never been seen to fail is
not a guard.

## OPEN, HONEST

- `selectMarketStory.ts:441` still hand-writes `!== "RESOLVED"` for the union
  before splitting by `dimensionStanding`. Could route through the partition.
- `selectCLC.ts:66,82` — `contextPartial` / `locationPartial` use `!== "UNKNOWN"`
  as "some evidence exists". NOT audited; may be legitimate.
- `/charts` passes the pill no `scrollToSelector`, so the W14 jump-to-canvas
  button never renders on the primary trading surface. Honest post-`edde7236`,
  but the trader still has nowhere to go.
- `wm-canvas-summary-detail { display: none !important }` on phones is
  DELIBERATE semantic zoom with a locking test. Not a defect. Left alone.
