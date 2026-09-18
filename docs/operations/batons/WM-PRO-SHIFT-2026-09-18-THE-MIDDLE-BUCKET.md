# THE MIDDLE BUCKET — 2026-09-18

Six commits, one defect, five disguises.

    66e3f9e0  fix(market-state): a dimension is in exactly one bucket — PARTIAL gets a home
    1387e70e  fix(passport): the middle bucket cannot be reached by subtraction
    3a3d81a5  fix(hero-truth): the truth strip names the middle bucket instead of implying it
    edde7236  fix(canvas-pill): the withheld count is a fact, "open the canvas" is an instruction
    52bb844c  fix(equipment-rail): Market reality counts all three buckets, not two of three
    a4a9073e  fix(clc): a value printed without its standing reads as a resolved value

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

## THE FIVE DISGUISES

1. **A LOOSE PREDICATE** — `!== "RESOLVED"` / `!== "UNKNOWN"`.  → `66e3f9e0`
2. **ARITHMETIC** — `totalCount - resolvedCount`. *Total minus resolved is the
   same lie as `!== "RESOLVED"`: the complement of one half of a three-valued
   type, reached by subtraction instead of a filter.* → `1387e70e`
3. **AN INCOMPLETE STRIP** — `HeroTruth` printed RESOLVED and UNKNOWN and
   invited the reader to subtract for the third. → `3a3d81a5`
4. **AN INCOMPLETE COUNT ROW** — both equipment rails counted `resolved` and
   `missing` and nothing else. *A rail that omits a bucket is the same lie as a
   predicate that mis-sorts one.* → `52bb844c`
5. **AN IDENTICAL SENTENCE** — `${dim.value ?? "unresolved"}`. *A fallback on
   NULLISHNESS is not a fallback on STANDING, and PARTIAL is exactly the bucket
   that CARRIES a value. The `??` labelled the MISSING bucket and dressed the
   MEASURED bucket in RESOLVED's clothes — two standings, one sentence.*
   → `a4a9073e`

**A COUNT THAT CAN ONLY BE REACHED BY SUBTRACTION HAS NO OWNER, and the middle
bucket is exactly what subtraction destroys.**

**A VALUE PRINTED WITHOUT ITS STANDING READS AS A RESOLVED VALUE.**

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

**`52bb844c` — CAPTURED LIVE PRE-DEPLOY, THEN PROVEN POST-DEPLOY.** The defect
frame, Workspace → Market reality preview:

    1 resolved · 4 missing · 8 blocking

Five of eight. `location`, `aggression`, `profile` absent from the rail entirely
while the passport one press away listed three of them as FORMING.

Re-probed after deploy on the same route, same instrument:

    1 resolved · 3 measured · 4 missing · 8 blocking

**1 + 3 + 4 = 8.** All three buckets present, by membership. **PROVEN.**

**`66e3f9e0` RE-PROVEN in the same frame.** The `/charts` header pill:

    WAIT · 4 unresolved · 3 measured · 8 blockers · 1 cleared

The middle bucket has its own count on the primary trading surface.

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
    a4a9073e   VITEST EXIT=0   764 files   9547 passed | 2 skipped    TSC EXIT=0

Mutation receipt on each: mutated the guarded token, confirmed RED **by test
name**, restored, confirmed green. A guard that has never been seen to fail is
not a guard.

## TWO MORE COMMITS, SAME FAMILY

    317c67d8  fix(order-flow): the NO TAPE sentence answers wait-or-stop from the facts in hand
    dcecc624  fix(canvas-pill): the blocker count gets the door this room actually has

### `317c67d8` — A GENERAL RULE IS NOT AN ANSWER WHEN YOU HOLD THE PARTICULAR FACT

FOUND FROM USE, production `/charts?symbol=TSLA`. Workspace → Order flow read

    "Crypto streams it around the clock; stocks stream it during market hours"

over a TSLA chart, on a feed the OS chrome badged ACTIVE in the same frame. Half
the sentence was about an instrument the trader was not looking at; the other
half handed back a rule and left them to work out which side of it they were on.

Same family as the three-bucket defect: **a surface doing work in the reader's
head that the code could have done in its own.** The room already holds the
SYMBOL and a PROVEN session closure, so the sentence is compiled from them:

    crypto, no tape          → the clock is not the reason. STOP LOOKING.
    non-crypto, proven shut  → the clock IS the reason. WAIT, and say for what.
    non-crypto, not proven   → name the rule, but only the half about THIS
                               instrument.

`provenSessionClosure` is one-sided by design — `false` only where closure is
PROVEN, `null` everywhere else, never `true`. So the settle can only sharpen a
vague answer, never introduce a wrong one.

**PROVEN LIVE**, same route, post-deploy:

    "No per-trade buy/sell tape for TSLA yet. Stock tape streams during market hours."

No crypto clause. Names the instrument on the screen.

### `dcecc624` — A DESTINATION THAT IS NOT ON THE PAGE IS STILL A DESTINATION

`edde7236` (above) correctly stopped the pill saying "open the canvas" on a page
with no canvas — and left a count of 8 blockers with nowhere to go. That was
recorded as OPEN in this baton's own list.

`scrollToSelector` can only point at something ALREADY RENDERED, which is the
wrong shape for the instrument room: Market Reality there is **press-gated
equipment**, genuinely absent until requested on the equipment channel.

The pill now takes `openEquipment={{ roomHref, id }}`. **THE ROOM IS PART OF THE
ADDRESS** — the label is looked up in the canonical registry, never typed at the
call site, so an id this href does not list yields *no button at all*. The
refusal `edde7236` shipped is now ENFORCED rather than remembered, and the pill
cannot drift into calling one destination by a second name.

`canvasDisclosureTruth`'s openHint case RE-STATED: it pinned the exact spelling
`scrollToSelector ? "…" : ""`, welding the INTENT (only point somewhere
reachable) to ONE KIND of destination — and made the equipment door unreachable
BY CONSTRUCTION. **A test that pins a spelling does not defend a rule; it
freezes one implementation of it.**

Gates: `VITEST EXIT=0` 764 files 9544 passed | 2 skipped · `TSC EXIT=0`.
Mutation receipt: door lookup `.find(e => e.id === …)` → `.find(() => true)`,
RED **by name** on *"REFUSES a door this room does not have"*, restored, green.

## ALL FIVE BURIED ORDER-FLOW INVENTIONS — READ AT FULL DEPTH, LIVE

`?equip=order-flow&stage=full` on production TSLA. Each renders AND discloses its
own limit rather than printing an absence as a finding:

    STACKED IMBALANCE   "aggressor side on this tape is undisclosed — so these
                         levels are downstream of a guess, not of a venue stamp"
    ABSORPTION ANATOMY  "Aggressor side: not disclosed by the feed. Every number
                         above rests on sides this tape never stated."
    DELTA DIVERGENCE    "Two paths are needed to compare, and this window has not
                         produced one yet."
    LIQUIDITY WEATHER   "Measured from executed prints only … No order book is in
                         evidence here."
    WM VALUE CANDLE     "A Center of Gravity needs prints that carry both a price
                         and a size; none have been observed in this window."

PRESENT · REACHABLE · FED · OBSERVABLE, and honest about what it could not read.

### `a4a9073e` — THE FIFTH DISGUISE, FOUND FROM SOURCE, PROVEN REACHABLE FIRST

The baton's own OPEN list flagged `selectCLC.ts:66,82` as "NOT audited; may be
legitimate". **The predicates are legitimate** — `contextResolved ? … :
contextPartial ? … :` is a chained ternary, so the two branches are disjoint and
total and `!== "UNKNOWN"` there genuinely means "some evidence exists". CLEARED.

The defect was ONE LINE BELOW, in the sentence those predicates select:

    PARTIAL   `Regime ${state.regime.value ?? "unresolved"}, direction …`
    SATISFIED `Regime ${state.regime.value}, direction …`

`??` tests NULLISHNESS. **Nullishness is not a standing.** `PARTIAL` is precisely
the resolution that CARRIES a value, so the `??` never fires for it:

    regime RESOLVED "TRENDING" + direction RESOLVED "LONG" → "Regime TRENDING, direction LONG"
    regime RESOLVED "TRENDING" + direction PARTIAL  "LONG" → "Regime TRENDING, direction LONG"

Two standings, ONE SENTENCE, byte-for-byte. The fallback labelled the MISSING
bucket and dressed the MEASURED bucket in RESOLVED's clothes.

**The function convicted itself.** CONFIRMATION — the third leg, same function —
already printed `order flow ${state.orderFlow.resolution.toLowerCase()}` and so
named what it was looking at. One function, three legs, one of which disclosed.

**REACHABILITY PROVEN BEFORE THE FIX WAS CLAIMED:** `clc.narrative` is composed
from all three leg summaries → the `clc` node in `selectDecisionChain.ts` →
rendered at `DecisionChainPanel.tsx:295` `{node.narrative}`. A live surface.

Repair: `dimensionPhrase()` routes through the canonical `dimensionStanding`
switch, giving three distinct spellings for three standings. A fourth
`MarketStateResolution` now fails the BUILD rather than quietly picking one here.

Tests assert the PROPERTY — *measured sentence ≠ committed sentence*, *the value
is still SHOWN*, *an absent dimension is still called unresolved and never
"measured"* — never a spelling. Rewording stays free; regression does not.

Gates: `VITEST EXIT=0` 764 files **9547 passed** | 2 skipped (+3, matching the
three tests added) · `TSC EXIT=0`. Mutation receipt: MEASURED branch reverted to
`?? "unresolved"` → RED **by name** on *"CONTEXT does not print a PARTIAL
dimension the way it prints a RESOLVED one"* and *"LOCATION carries the same rule
— one leg fixed is one surface's good luck"*, restored by targeted edit, green.

## AN HONEST NEGATIVE — THE 8-vs-9 LEAD, CHASED AND CLEARED

A recorded live frame showed the rail at `EVIDENCE DEBT 8 OPEN` beside a cell
reading `0 of 9 paid`. I suspected a sixth disguise in
`standingFromOneStory.ts:113`:

    openEvidenceItems: debt && debt.payable > 0 ? debt.payable - debt.resolved : null

**It is not one.** `payable === resolved + missing + warn` is definitional, so
`payable - resolved` is a TRUE TWO-WAY complement — subtraction over a genuinely
binary split destroys nothing. Better: this line IS the 2026-09-16 fix for that
exact frame, where `debt.missing` had omitted the WARN bucket (`1 warned:
permission` → payable 9, missing 8).

Re-probed live: `8 OPEN` and `0 of 8 paid`. **Consistent.** Cleared, not fixed —
because there was nothing left to fix. *Read the file before claiming the defect.*

## OPEN, HONEST

- `selectMarketStory.ts:441` still hand-writes `!== "RESOLVED"` for the union
  before splitting by `dimensionStanding`. Audited and CLEARED as correct; could
  still route through the partition as a tidy-up. Not a defect.
- ~~`selectCLC.ts:66,82` — `contextPartial` / `locationPartial` use `!== "UNKNOWN"`
  … NOT audited.~~ **CLOSED by `a4a9073e`.** Predicates CLEARED; the real defect
  was the sentence below them.
- ~~`/charts` passes the pill no `scrollToSelector` … the trader still has
  nowhere to go.~~ **CLOSED by `dcecc624`** — the door was never a scroll target;
  it is press-gated equipment.
- ~~`dcecc624` is pushed but not yet observed live.~~ **PROVEN LIVE** — see below.
- `a4a9073e` is pushed but not yet observed live on the CLC chain node.
  **Re-probe `DecisionChainPanel`'s `clc` narrative after deploy**, on a frame
  carrying a PARTIAL regime/direction/location/structure.
- LIQUIDITY WEATHER at FULL depth prints a four-row legend (MEDIAN COST / LATEST
  VS PEERS / HALF OVER HALF / DISAGREEING) with no values beside "0 equal-count
  segments". Low priority, but a legend without values is a label without a fact.

## A PROBE CONSTRAINT THAT SILENTLY BLINDS

`innerText` returns `""` for any element nested inside a **closed `<details>`**,
even with a non-null `offsetParent` and a real `getBoundingClientRect().height`.
All seven `market-canvas-*` testids read empty this way; the panel sits inside two
nested `<details>`. **Use `textContent` for content probes.** This is a PROBE
ARTIFACT, not a defect — and earlier `innerText`-based findings in this shift may
have been blinded by it and are worth re-running.

## `dcecc624` — PROVEN LIVE, FULL LADDER

`https://wealthymindsetspro.com/charts?symbol=TSLA`, post-deploy:

    PRESENT      <button data-equipment-open="market-reality">  (role: null)
    REACHABLE    click → URL ?equip=market-reality&stage=preview
    FED          1 resolved · 3 measured · 4 missing · 8 blocking   (1+3+4 = 8)
    OBSERVABLE   tooltip "+5 more — open Market reality"

The label in that tooltip is the RAIL'S OWN, looked up from the canonical
registry — never typed at the call site. One destination, one name.
- `wm-canvas-summary-detail { display: none !important }` on phones is
  DELIBERATE semantic zoom with a locking test. Not a defect. Left alone.
