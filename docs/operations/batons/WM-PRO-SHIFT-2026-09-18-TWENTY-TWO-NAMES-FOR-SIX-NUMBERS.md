# WM PRO SHIFT BATON — TWENTY-TWO NAMES FOR SIX NUMBERS

**Date:** 2026-09-18
**Breaker:** M8 — CANONICALBAR ADOPTION + MARKETOBJECT VOCABULARY
**Commits:** `2a600b3b`, `eb9cbc0c`, `97a9b73b`, `a70d97f3`, `04e27832`
**Census:** twenty-two private bar shapes → **six**

---

## THE HEADLINE, STATED SO IT CANNOT BE MISREAD

**Twenty-two to six is not sixteen migrations.** It is fifteen
renames-or-deletes plus one measurement correction, and **ZERO INGRESSES
MIGRATED**. Not one ingress now routes through the CanonicalBar artery.
`symbolId`, `sessionId`, `fidelity`, `source`, `provenance` and `truthEpoch`
remain absent from every bar the live path handles.

A number that falls is not automatically progress. Three things lower this
count and only one of them is a real retirement:

1. a retirement touching running code,
2. a deletion of dead source the census had counted as live,
3. a **measurement correction**, where nothing was retired at all.

This block was almost entirely category 1 in mechanism — real declarations
deleted, real importers repointed — and entirely **a rename in effect**. The
sprawl was never twenty-two competing ideas of what a bar is. It was one
anonymous six-field tuple wearing twenty-two module-local labels, and the
artery already had a sanctioned name for exactly it: `LegacyOhlcvTuple`.

---

## WHAT WAS RETIRED, IN ORDER

| Atom | Retired | Census |
|---|---|---|
| 2 (`2a600b3b`) | `exchange/route::OHLCBar`, `WatchlistGrid::Candle`, `kraken::KrakenOHLC`, `yahooCandleConsumer::YahooCandle` | 17 → 13 |
| 3 (`eb9cbc0c`) | `MainChart::Bar` | 13 → 12 |
| 4 (`97a9b73b`) | `backtest/engine::Bar`, `timeframes::Candle` | 12 → 10 |
| 5 (`a70d97f3`) | `liveBarPolicy::LiveBar`, `sessionVP::Candle`, `yahooTimeframes::YahooOhlcvBar` | 10 → 7 |
| 6 (`04e27832`) | `vpEngine::ProfileBar` | 7 → 6 |

**Remaining six:** `indicators::Bar`, `DeckMarketChart::Candle` (differs only by
`volume?`), `pine/types::OHLCVBar`, `marketEvent::CanonicalMarketEvent`,
`selectAbsorptionAnatomy::AnatomyBar`, `::AnatomyBarInput`. The last three are
genuinely different shapes, not duplicates.

---

## THE FOUR FINDINGS WORTH MORE THAN THE COUNT

### 1. The compiler overruled me, and the record says so

`MainChart::Bar` was held back from the group rename for a stated reason:
`LegacyOhlcvTuple` declares all six fields `readonly` and that file de-spikes
wicks by assigning to `.high` and `.low`. I read the call sites and wrote that
the rename would compile, because the objects being written are locally owned.

**`tsc` rejected four lines across two de-spike passes.** The ownership reading
was true about *ownership* and said nothing about whether the code *compiles*.
That distinction is now written into the source comment and the gate row rather
than quietly deleted after the fix.

**And the forced repair was strictly better code.** Both clamps now REPLACE the
bar instead of editing it. A bar that can be edited after publication is the
exact mechanism by which a corrected value silently replaces the one a trader
already acted on — which is what `truthEpoch` exists to prevent. The chart's
stored history was already append-only in practice; the type system now enforces
it. That is a real precondition for canonical identity on the live path, and it
is **only** a precondition.

### 2. A name that implies a provenance the shape cannot hold

The sharpest form of the M8 defect, and three renames landed on it directly:
`KrakenOHLC`, `YahooCandle` and `YahooOhlcvBar` each announced a source in the
identifier while carrying no `source` field. A Kraken row and a Yahoo row were
freely assignable to each other's names and nothing in either type could object.

`yahooTimeframes::YahooOhlcvBar` was the worst of the three, because that module
**reconstructs** bars: several plans are `sourceMode: "reconstructed"`, so bars
the caller receives were folded from a finer interval and never traded at the
requested timeframe on any exchange. The old name said "Yahoo" about both kinds.
`sourceMode` is known right there at the planner and there is nowhere on the bar
to put it.

### 3. NO ALIAS LEFT BEHIND was not a slogan — it paid out

Each module stopped **exporting** a bar type rather than re-exporting one under
a new name. In atom 5 that immediately failed five importers with TS2459
*"declares it locally but it is not exported"*, and every one now imports
`LegacyOhlcvTuple` from the artery directly. Had an alias been left behind, all
five would still be routing their idea of a bar through a module with no
business owning one — **and the census would have read lower for it.**

### 4. Raw importer count was the wrong measurement, and I published it

Atom 2's gate row called `indicators::Bar` (7 importers) and
`pine/types::OHLCVBar` (7) *"a different risk class"* on the strength of the raw
count. Re-measuring: of `indicators::Bar`'s seven, **five are that module's own
test files**, one more is `selectMarketStructure.test.ts`, and exactly **one** is
production. Of `pine/types::OHLCVBar`'s seven, three are production. The risk is
real and smaller than the number quoted. Corrected in atom 4's row.

---

## LEGACY TESTS REMODELLED IN THE SAME ATOMIC CHANGE (M4)

- **The FALSE_RIPENESS floor** asserted the raw scan found *more than ten*
  declarations. Calibrated to a bigger census, it would have failed **the moment
  the migration succeeded** — the exact shape of a legacy test protecting a
  legacy architecture. It is a matcher-liveness check, not a size assertion (the
  frozen array asserts the size), and is now floored at three.
- **`screenReach.enforcement.test.ts`** uses an import statement as a parser
  fixture, and that string named `LiveBar`. It does not resolve types, so it
  would have stayed green while teaching a retired noun.

---

## LIVE VERIFICATION — RECORDED AS NOT PROVEN

`/charts` was reloaded in the Founder's Chrome after `eb9cbc0c` went green and
renders correctly: 9 canvases, main chart 1564×616 CSS px, price line
`TSLA 364.30 LAST 5m BAR CLOSE`, `HISTORICAL BARS VERIFIED` true, `NO FEED`
absent, no React error.

**That is a no-regression observation and not proof the new bundle is serving.**
The repo contains only `sentinels.yml`; deploys run through Cloudflare's own git
integration, which `gh` cannot query, and the App Router page exposes no
`buildId` to correlate.

**Separately and more importantly: the de-spike rewrite is observationally
SILENT by construction.** Replace-versus-mutate produces identical numbers. No
pixel could distinguish the two builds even with a confirmed deploy. The
remaining atoms are type-alias renames, which have no runtime representation at
all. Claiming PROVEN here would have been fabrication in the precise sense the
standing order forbids.

---

## GATES

Every atom: `tsc --noEmit` **EXIT 0**; `./node_modules/.bin/vitest run`
**EXIT 0** at **808 files / 10207 passed / 2 skipped**, run unpiped.

**The total never moved, and that is the correct outcome** — no test was added
or removed in any atom. An unmoved suite total is a signal only when a test was
supposed to arrive.

Every atom carried a **mutation receipt**: restore one retired entry to the
frozen array, prove EXIT 1 with exactly one failure on the right test with the
right message, restore, re-verify EXIT 0.

---

## WHAT IS STILL OWED ON M8

**The adoption half, untouched by every rename in this block.** No ingress
routes through `canonicalBar.ts`; it still has zero production consumers. The
concrete consequences, each written at its own declaration site rather than
collected only here:

- `liveBarPolicy` enforces *a late event may not rewrite a bar* — the same
  instinct `truthEpoch` formalises — on a shape with no `truthEpoch` to enforce
  against.
- `vpEngine` feeds a **published** market state with a profile whose source bars
  cannot name their session, fidelity, or supersession.
- `timeframes::aggregateCandles` and `yahooTimeframes` **manufacture** bars that
  never came from a provider, with nowhere to record the different fidelity.
- `backtest/engine` cannot say which truth epoch its trades were computed
  against — the claim a backtest is most tempting to overstate.

M9 (frozen CanonicalBar ancestry and truth epochs for replay) depends on this
half and **must never be faked by slicing today's historical bars.**
