# SIX TIMES ONE SHAPE — AND THE LAST HARD-CODED STRING

**Block:** `a36339aa` → `6dca05ae` (three commits)
**Predecessor baton:** `WM-PRO-SHIFT-2026-09-17-FOUR-TIMES-ONE-SHAPE.md`

---

## WHAT SHIPPED

| SHA | Atom | Live status |
|---|---|---|
| `a36339aa` | Passport AGGRESSION reads the Asset 03 scatter | pushed; CI green; **deploy not yet observed** |
| `bc23cef1` | Passport STRUCTURE reads a compiled swing sequence | pushed; **deploy not yet observed** |
| `6dca05ae` | Auction matchers learn the STRUCTURE vocabulary | pushed; **deploy not yet observed** |

Carried over and now **PROVEN**: `be4d35a9` (LOCATION), left pending in the
previous baton, was measured live on production BTC this block:

```
BEFORE  LOCATION / UNRESOLVED / DNA · 0 REFS
AFTER   LOCATION / FORMING / INFERRED / 40% / DNA · 1 REF
        "Location is forming — … The value area this position is measured
         against was estimated from candles, not counted from trades."
```

The previous baton's OPEN item *"LOCATION live-verification — pushed, not yet
observed"* is therefore **CLOSED YES**.

---

## THE SHAPE IS NOW CLOSED

Six times the same defect has been found the same way: **by reading the live
product, not by running the tests.** ORDER FLOW, VOLATILITY, PROFILE, LOCATION,
AGGRESSION and now STRUCTURE were each hard-coded into
`chartMarketStatePublisher`'s unresolved list as an unconditional string,
because at the time nothing could measure them.

Each line outlived the incapacity that justified it.

**As of `bc23cef1`, `unresolvedDimensions` contains no unconditional strings at
all.** Every entry is now a conditional spread over a real resolution. The
defect class has no remaining instances in that array.

Every suite was green through all six. A green suite says the code does what it
says. Only the running product says whether the trader can see it.

---

## AGGRESSION — THE REFUSAL THAT MADE THE WIRE WORTH SHIPPING

"Aggression" in its strongest sense means WHO is pushing — buyer-initiated minus
seller-initiated. `ChartsDashboard` builds its bars with `askVol: null,
bidVol: null`, always. So `selectAggressionResponse` always publishes an
`EFFORT` axis and a null `netAggression`.

The deriver therefore **may not name a side**. What it ships instead is the
relationship the Founder's framework is actually named after — how much effort
the window spent against how much price it bought — at PARTIAL, carrying the
owner's own sentence verbatim:

> *"y is EFFORT, not net aggression — this tape never stated an aggressor side,
> so the axis shows how much traded rather than who was pushing"*

A dimension that says "EFFORT ABSORBED, and I cannot tell you by whom" is
strictly more use than one that says nothing. A dimension that says "BUYERS
PRESSING" off an unsigned tape is a fabrication. The branch matrix includes a
defence-in-depth case: the side is refused even when `netAggression` is somehow
populated on an EFFORT axis, because **the axis is the authority, not the number
beside it.**

### The window hazard, which is the subtler one

Every term in that VM is normalised against the window's OWN peak. The
efficiency ratio is therefore not a property of the market — it is a property of
the market **AND the window length**. Two surfaces reading identical bars over
`windowBars: 30` and `windowBars: 60` would disagree while both were correct,
and nothing would throw.

`passportAggressionMatchesTheScatter.sentinel.test.ts` asserts the publisher and
`ChartsDashboard` pass the **same number**. The number itself is free to change
— so long as it changes in both places on the same day.

---

## STRUCTURE — THE OWNER HAD TO BE BUILT BEFORE THE WIRE

The five repairs before this one each had a compiled VM waiting to be read.
Structure had **none**. The only thing in the repo that knows where a swing is
is `swingHighLow` in `components/chart/indicators.ts`, and `MainChart` calls it
**inline, four separate times, at two different lookbacks** (5 for Swing
High/Low and Strong Highs/Lows, 4 for Liquidity Pools and Change of Character).

Deriving the Passport verdict straight off the raw detector would have made the
publisher a **fifth inline caller** and a second opinion about the same swings —
the same defect the wire was written to close, pointing the other way. So
`selectMarketStructure` was written first, and the Passport only reads it.

### The refusal: the confirmation lag is PERMANENT

A fractal pivot needs `lookback` bars on **both** sides. So the newest
`lookback` bars can never be pivots — not through bad luck or a thin feed, but
by construction. The structure reading is always about a market that has already
moved past it.

Unlike every other caveat in this lane, **more bars do not cure it.** So
`confirmationLagNote` rides *every* stated verdict, **RESOLVED included**. A
RESOLVED structure reading with an empty `unknowns` array would be a silent
overclaim, and the value beside it would still be correct — only the admission
would be gone.

Fidelity is hard-capped at `INFERRED`. The detector sits under a header calling
itself *"Smart Money Concepts (visual, approximate)"*. The source names its own
class; this file does not get to promote it.

---

## THE DEFECT I CREATED, AND CAUGHT, IN THE SAME BLOCK

The moment `deriveStructureDimension` became the STRUCTURE producer, its entire
vocabulary — `HIGHER HIGHS`, `LOWER LOWS`, `ROTATING IN RANGE` — matched
**none** of `DEFAULT_AUCTION_MATCHERS`, which still listed `"bos"` / `"sweep"` /
`"none"` from an engine that never shipped.

**The symptom of that defect is nothing.** No throw, no red test, no console
warning. `selectAuctionState` falls through every structure branch and prints
its fallback narrative for the rest of the product's life, while the Passport
beside it displays a perfectly good structure verdict.

That is Canon Weakness #1 arriving not through a wrong computation but through
**two word lists quietly drifting apart** — precisely the hazard the
`AGGRESSION_VERDICTS` / `STRUCTURE_VERDICTS` exports were written to warn about,
found live in the one place the warning had not yet been applied.

The fix is small. The **test** is the deliverable:
`auctionMatchersKnowTheProducers.test.ts` iterates `STRUCTURE_VERDICTS` and
fails if any verdict goes unrecognised, plus asserts bucket-correctness, that no
structure verdict is mistaken for a liquidity sweep, and that a **PARTIAL**
dimension can never satisfy a matcher — an upgrade laundered through a word.

`ROTATING IN RANGE` is deliberately kept OUT of `structureBOS`: a rotation is
the *absence* of a break, and that absence is what lets BALANCING fire at all.

---

## EVERY SENTINEL IN THIS BLOCK WAS MUTATION-TESTED

A sentinel that cannot fail proves nothing. Each was deliberately broken and
observed red before being trusted:

| Mutation | Result |
|---|---|
| publisher `windowBars: 30` → `60` | `expected '60' to be '30'` ✅ |
| publisher `...(structure.resolution…)` → bare `"Structure",` | red ✅ |
| deriver `const unknowns = [vm.confirmationLagNote]` → `[]` | red ✅ |
| matcher list: remove `"higherhighs", "lowerlows"` | 3 tests red ✅ |

One sentinel regex was **wrong on first write** and was fixed in the TEST, not
the code: `/selectAggressionResponse\([^)]*\{\s*windowBars:/` returned null for
the publisher, because the publisher passes `profileBarsFrom(input.bars)` and
the `[^)]*` class terminates at that *inner* close-paren. The dashboard's call
has no inner parens, so it matched — and the asymmetry made a test bug look like
a code bug. The replacement carries a comment naming exactly why the `[^)]*`
form is wrong.

---

## GATES

- `./node_modules/.bin/tsc --noEmit` — exit 0, unpiped
- `./node_modules/.bin/vitest run` — **756 files, 9297 passed | 2 skipped**, unpiped
- ~50 new tests across `deriveAggressionDimension`, `selectMarketStructure`,
  `deriveStructureDimension`, two sentinels and the matcher-symmetry lock

---

## DEPLOY PIPELINE — A CORRECTION WORTH RECORDING

**CI is not the deploy gate.** Measured this block: `be4d35a9`'s Sentinels run
was **cancelled** (superseded by the next push) and yet LOCATION is **live**.
Meanwhile `a36339aa`'s run completed **success** and its change was **not** live
eleven minutes later.

`.github/workflows/` contains only `sentinels.yml`. Cloudflare's Git integration
deploys on its own asynchronous schedule. **A green CI run is not evidence that
production is updated, and a cancelled one is not evidence that it isn't.** Only
reading the live product settles it.

---

## OPEN, HONESTLY

- **AGGRESSION + STRUCTURE live-verification** — pushed, CI green, deploy not
  yet observed. Re-open the "Full evidence" drawer on production BTC and confirm
  AGGRESSION shows an effort verdict with 1 ref, and STRUCTURE leaves `0 REFS`.
  Written here as pending on purpose.
- **Auction State live-verification** — the matcher fix is unproven in the
  product. Its consumer is `selectDecisionChain`; whether that node visibly
  changes has not been measured.
- **`structureNone` is dead config** — populated in `DEFAULT_AUCTION_MATCHERS`
  and declared on the interface, but never read in `selectAuctionState`'s body.
  Left in place as part of the public matcher contract callers may override, now
  commented so the next reader does not assume it is wired.
- **MainChart's two lookbacks** — the chart draws structure at lookback 5 in two
  places and 4 in two others, inline. The compiled owner uses 5. Surfaced, not
  rush-changed; rewriting MainChart's draw path is not a one-atom job.
- **CHoCH is not claimed by the Passport.** `selectMarketStructure` scopes itself
  to the swing SEQUENCE deliberately, so it cannot contradict the chart's CHoCH
  markers drawn at a different lookback. That is the next honest lift.
- **Decision Receipt** has no `/charts` door, because Decision Memory sealing
  still has **zero production callers**. Architectural — surfaced, not
  rush-wired.
- **Question-Driven Mode**, **Order Flow bubbles / CVD anchored session path**,
  and **Mirror / Opening Bell** remain unbuilt from the pasted canon.
- **Gate 4 responsive proof** — still blocked; programmatic window resize does
  not take effect, `outerWidth` stays pinned.
- **`/journal` detail canvas** — still blocked on 0 journal entries.
- **Level-2 depth family** (Assets 08 / 19 / 20) — blocked behind a licensed
  depth provider.
- **Raise with Founder:** whether plain crypto symbols should prefer
  `/api/exchange` (Coinbase, bucket ratio ≈5.6) over Alpaca's thin keyless venue
  (≈139.5). That difference is *why* BTC reads candle-estimated, which is why
  PROFILE and LOCATION both cap at PARTIAL.
