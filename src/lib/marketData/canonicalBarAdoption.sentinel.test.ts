/**
 * M8 — THE CANONICALBAR ARTERY, AND THE PRIVATE PASTS BESIDE IT.
 *
 * The count below started at twenty-two on 2026-09-18 and is FOUR as of the
 * same day. The prose that follows is the original measurement and is left
 * standing, because the shape of the problem did not change when some of the
 * shapes were deleted — only its size.
 *
 * TWENTY-TWO TO FOUR IS NOT EIGHTEEN MIGRATIONS. It is seventeen renames-or-
 * deletes plus one measurement correction, and ZERO INGRESSES MIGRATED. The
 * array's docblock separates the kinds line by line so nobody reads this header
 * as eighteen ingresses routed through the artery. None were. Not one.
 *
 * ── THE FINDING THAT REFRAMES THE WHOLE BREAKER (measured 2026-09-18) ───────
 *
 * The remaining four shapes are, for the first time since this census was
 * opened, GENUINELY DIFFERENT SHAPES rather than one tuple under many labels.
 * NOT ONE BYTE-FOR-BYTE DUPLICATE OF `LegacyOhlcvTuple` REMAINS. The nearest
 * thing to one, `DeckMarketChart::Candle`, differs by `volume?` — and that
 * optionality is load-bearing, not sloppiness, because the deck deliberately
 * forwards no volume. The other three describe different facts entirely.
 *
 * WHICH MEANS THE CHEAP HALF OF M8 IS FINISHED AND THE EXPENSIVE HALF HAS NOT
 * STARTED. Every remaining line on this list needs a judgement, not a rename,
 * and none of them delivers canonical identity either.
 *
 * That makes most of the remaining list a RENAME rather than a migration, and
 * it was important not to let the ease flatter the result: renaming a
 * declaration to one name removes one duplicate DECISION and delivers
 * zero canonical identity. `LegacyOhlcvTuple` is the legacy shape on purpose.
 * The adoption half of M8 — symbolId, sessionId, fidelity, provenance,
 * truthEpoch on the live path — is untouched by every rename and stays owed.
 *
 * A NAME THAT IMPLIES A PROVENANCE THE SHAPE CANNOT HOLD is the sharpest form
 * of the defect, and two of the renames landed on it directly: `KrakenOHLC` and
 * `YahooCandle` both announced a source in the identifier while carrying no
 * `source` field, so a Kraken row and a Yahoo row were freely assignable to
 * each other's names and nothing in either type could object. The honest fix
 * for that is CanonicalBar, which has `source` and `provenance` as real fields.
 * The rename is the smaller, true move: stop claiming in the name what the type
 * cannot carry.
 *
 * ── THE MEASUREMENT, TAKEN 2026-09-18 ──────────────────────────────────────
 *
 * `src/lib/marketData/canonicalBar.ts` is a complete, well-tested artery. It
 * carries every field the order names — barId, symbolId, sessionId, timeframe,
 * OHLCV, asOf, receivedAt, fidelity, source, provenance, truthEpoch — it mints
 * deterministic ids so a bar redelivered across a reconnect is the same bar,
 * and it treats a backfill correction as a NEW fact rather than a silent
 * overwrite of something the trader may already have acted on.
 *
 * It has ZERO production consumers. Not few: none. Every import of it in this
 * repo is a test importing it to test it.
 *
 * Meanwhile production declares its own open/high/low/close in twenty-two
 * other places. That is not twenty-two styles, it is twenty-two PASTS: two
 * modules can hold a different 09:31 for the same symbol and neither is wrong
 * by its own lights, because neither has an identity that could disagree.
 *
 * ── WHY THIS FILE IS A RATCHET AND NOT A FIX ───────────────────────────────
 *
 * Routing every ingress through the artery is a migration, not an edit, and a
 * migration that runs across many commits has one characteristic failure: the
 * thing being migrated AWAY from keeps growing while the migration is in
 * flight. A twenty-third private bar shape added next week would cost nothing
 * to write, would break no test, and would quietly extend the work.
 *
 * So the census is frozen below. It is allowed to SHRINK and nothing else.
 * Adding a shape fails. Removing one also fails — deliberately — because the
 * list is the scoreboard, and a scoreboard someone forgot to update is how a
 * finished migration still reads as unfinished a quarter later.
 *
 * ── WHAT THIS FILE DOES NOT CLAIM ──────────────────────────────────────────
 *
 * It does not claim any adoption. It does not make the artery load-bearing. A
 * green run here means "the sprawl has not grown", which is the honest reading
 * and the only one available until a real ingress is migrated. A comment is
 * not retirement, and neither is a census.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";

import { CanonicalBar } from "./canonicalBar";

/** Repo root, from this file's location. */
const SRC = path.resolve(__dirname, "..", "..");

/**
 * Production TypeScript. Tests are excluded ON PURPOSE: a fixture that builds
 * a bar-shaped literal to exercise a selector is not a second past, it is a
 * test doing its job. What this gate is counting is shapes the PRODUCT holds.
 */
function productionSources(): readonly string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const p = path.join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(p) && !/\.test\.|\.d\.ts$/.test(p)) out.push(p);
    }
  })(SRC);
  return out;
}

/**
 * A declaration that carries its own open, high, low AND close.
 *
 * All four, deliberately. Requiring fewer would sweep in every partial
 * projection — a `{ close }` price fact is not a second bar, it is a reading
 * OF one, and the distinction is the whole difference between this gate
 * finding real duplication and it finding noise.
 *
 * AND ALL FOUR AS SCALAR NUMBERS, added 2026-09-18 after the first version of
 * this matcher was found counting two things that are not bars. The same
 * sentence above already contained the principle; it just was not enforced.
 *
 *   `ExecContext` in `lib/pine/interpreter.ts` declares `open: number[]` — the
 *   Pine interpreter's execution frame, holding the WHOLE series as parallel
 *   columns. There is exactly one of these per script run and it cannot hold a
 *   competing 09:31, because it is not a record of a bar at all.
 *
 *   `DataWindowBarScope` in `lib/chart/dataWindowBarScope.ts` declares
 *   `open: DataWindowCell`, and a `DataWindowCell` is `{ label, title }` — two
 *   strings for a panel. It carries NO price. It is the view-model of a data
 *   window, which is a reading OF a bar in exactly the sense the paragraph
 *   above already excludes.
 *
 * So the four fields must be annotated `number`, and `number[]` must not
 * qualify. The negative lookahead is the whole point of the expression and is
 * guarded by a test below, because losing it silently re-inflates the census
 * with shapes nobody can migrate.
 */
function ohlcDeclarations(src: string): readonly string[] {
  const DECL = /(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_]+)\s*(?:=\s*)?\{([\s\S]*?)\n\s*\}/g;
  const names: string[] = [];
  for (const m of src.matchAll(DECL)) {
    const body = m[2];
    const carries = (field: string) =>
      new RegExp(`\\b${field}\\s*\\??\\s*:\\s*number\\b(?!\\s*\\[)`).test(body);
    if (carries("open") && carries("high") && carries("low") && carries("close")) {
      names.push(m[1]);
    }
  }
  return names;
}

/** `<path relative to src>::<TypeName>` for every OHLC shape in production. */
function census(): readonly string[] {
  const found: string[] = [];
  for (const file of productionSources()) {
    for (const name of ohlcDeclarations(readFileSync(file, "utf8"))) {
      found.push(`${path.relative(SRC, file)}::${name}`);
    }
  }
  return found.sort();
}

/**
 * The artery's OWN declarations, which are the destination rather than part of
 * the sprawl. Excluded by name rather than by path so that moving the file
 * cannot quietly excuse a different module.
 */
const THE_ARTERY: readonly string[] = [
  "lib/marketData/canonicalBar.ts::CanonicalBar",
  /* The deliberate escape hatch back to `[time, o, h, l, c, v]` for consumers
     that have not migrated. It exists so migration can be incremental, which
     makes it part of the destination, not part of the problem. */
  "lib/marketData/canonicalBar.ts::LegacyOhlcvTuple",
];

/**
 * FROZEN 2026-09-18 at twenty-two. LOWERED TO TWENTY-ONE, THEN TO TWENTY, THEN
 * TO EIGHTEEN, THEN TO SEVENTEEN, all on 2026-09-18. The third step is a
 * different KIND of change from the others and is labelled as such below.
 *
 * Each line is one place the product decided what a bar is without asking the
 * artery. Sorted, so a diff on this array reads as exactly what changed.
 *
 * RETIRED: `hooks/useWebSocket.ts::OHLCVBar`. It was a verbatim six-field copy
 * of `liveBarPolicy.ts::LiveBar` — the very module that produced every value
 * the hook stored in it — so the hook's hot-path ref now says `LiveBar` and the
 * PUBLISHED bar says `LegacyOhlcvTuple`, the artery's one sanctioned legacy
 * name. Two names for one shape became one name for one shape.
 *
 * THE SMALLER CLAIM IS THE TRUE ONE, and it is recorded here so a later reader
 * does not inflate it: this retirement did not give the live path canonical
 * IDENTITY. The published bar still carries no symbolId, sessionId, fidelity,
 * provenance or truthEpoch. A duplicate past was deleted; identity is owed.
 *
 * RETIRED: `types/index.ts::OHLCVBar`, by deleting the whole file it lived in.
 * That barrel had ZERO importers — not few, none. Nothing in the repo referenced
 * `@/types` or `src/types/index`, there is no `export *` anywhere that could have
 * re-exported it, and the only path alias is `@/*` to `./src/*`, so the
 * resolution had nowhere else to come from. Two of its twelve exports, `Post`
 * and `SignalStrength`, had already been RE-DECLARED inside the files that
 * wanted them — `app/lounge/page.tsx` and `components/smart-money/
 * SmartMoneyPanel.tsx` — which is the signature of a barrel that was abandoned
 * rather than one that was still being written toward.
 *
 * THE WHOLE FILE WENT, NOT JUST THE BAR. Excising one interface and leaving
 * eleven other unreferenced ones behind would have moved this number while
 * leaving the actual poison in place: a future reader greps `OHLCVBar`, finds
 * `@/types`, and learns that importing a bar from there is a thing this product
 * does. Deleting only the counted line would have been a change made for the
 * scoreboard rather than for the code.
 *
 * AND THE CLAIM HERE IS SMALLER STILL THAN THE ONE ABOVE IT. This did not
 * migrate an ingress. It removed a declaration that no ingress was using —
 * dead source that the census was counting as if it were live. The number is
 * honest either way, but a reader comparing twenty-two to twenty should know
 * that only ONE of those two steps touched running code.
 *
 * ── TWENTY TO EIGHTEEN IS A MEASUREMENT CORRECTION, NOT A RETIREMENT ───────
 *
 * NOTHING WAS MIGRATED AND NOTHING WAS DELETED for this step. Both shapes are
 * still in the product, unchanged, exactly where they were. What changed is the
 * matcher: it was requiring open/high/low/close and accepting ANY type for
 * them, so it counted two declarations that are not records of a bar —
 * `lib/pine/interpreter.ts::ExecContext`, whose four fields are `number[]`
 * columns of a whole series, and `lib/chart/dataWindowBarScope.ts::
 * DataWindowBarScope`, whose four fields are `DataWindowCell` label/title pairs
 * carrying no price at all. Neither can hold a competing 09:31, which is the
 * only thing this census exists to count.
 *
 * THIS IS RECORDED RATHER THAN QUIETLY DROPPED because the rule above says
 * removing an entry fails deliberately, on the grounds that the list is the
 * scoreboard. Two entries leaving with no note would read as two migrations
 * that never happened — the exact inverse of the failure the freeze was built
 * to prevent, and the more flattering one. The number went down; the work did
 * not. Eighteen was always the true size of M8.
 *
 * THE FLATTERING REPAIR WAS AVAILABLE AND WAS REFUSED: name-excluding these two
 * entries would have produced the same eighteen while leaving the matcher still
 * wrong, so the NEXT `open: number[]` anyone declares would have re-inflated the
 * census with a shape nobody can migrate. The predicate was narrowed instead,
 * and the narrowing is guarded by its own test.
 *
 * ── EIGHTEEN TO SEVENTEEN IS A REAL RETIREMENT, AND A SMALL ONE ────────────
 *
 * RETIRED: `lib/markov.ts::Bar`. Six fields, all `number`, byte-for-byte the
 * same fields as `LegacyOhlcvTuple`. The engine now speaks the artery's legacy
 * name at both its use sites — `classifyBar(bar, threshold)` and the
 * `bars: readonly LegacyOhlcvTuple[]` input — and so does its only importer,
 * `markov.test.ts`. No alias was left behind: re-exporting `Bar` from this
 * module would have put the retired noun straight back into the vocabulary the
 * change exists to shrink, and would have made the census read seventeen while
 * the product still spoke eighteen names.
 *
 * WHY THIS ONE FIRST. It has exactly one importer, and that importer is its own
 * test file, so the whole blast radius is two files and no surface moves. It is
 * the cheapest possible proof that the rename path works before it is walked
 * across the twelve heavier modules behind it.
 *
 * AND THE CLAIM STAYS SMALL. `LegacyOhlcvTuple` is the LEGACY shape by design —
 * six numbers, no symbolId, no sessionId, no fidelity, no provenance, no
 * truthEpoch. The Markov engine still counts transitions over a past that
 * cannot say which symbol or which session it belongs to. One duplicate
 * DECISION about what a bar is was removed. Identity is still owed, and no
 * rename in this list will ever deliver it.
 *
 * ── SEVENTEEN TO THIRTEEN: THE FOUR WITH NO EXTERNAL IMPORTERS ─────────────
 *
 * RETIRED TOGETHER: `app/api/exchange/route.ts::Bar`,
 * `components/chart/WatchlistGrid.tsx::Candle`, `lib/api/kraken.ts::KrakenOHLC`
 * and `lib/yahooCandleConsumer.ts::YahooCandle`. All four are byte-for-byte
 * `LegacyOhlcvTuple` and all four now say so.
 *
 * WHY THESE FOUR ARE ONE ATOM, and it is a measured reason rather than a
 * batching convenience: every remaining census entry was measured for
 * exported-ness and for importers outside its own module, and these four were
 * exactly the ones with ZERO external importers. A name no other module imports
 * is a name no other module can be agreeing or disagreeing with, so collapsing
 * it changes one file's vocabulary and nothing else's. That is a different risk
 * class from `indicators.ts::Bar` (seven importers) or `pine/types.ts::OHLCVBar`
 * (seven), and grouping across that line would have hidden the difference.
 *
 * MAINCHART WAS DELIBERATELY EXCLUDED even though it also has zero importers.
 * `components/chart/MainChart.tsx::Bar` has roughly fifty references inside the
 * live-chart hot path, including a `useRef<Bar[]>` the tick handler MUTATES.
 * `LegacyOhlcvTuple` declares all six fields `readonly`, so that rename is a
 * question about whether the live path writes into its own bars — a real
 * finding, and one that deserves its own atom rather than a ride on this one.
 * Taking it here would have made the number four instead of three-plus-one and
 * bought that with an unexamined mutation in the chart.
 *
 * TWO OF THE FOUR WERE THE PROVENANCE-IN-THE-NAME CASE described in the header:
 * `KrakenOHLC` and `YahooCandle` named a venue that the type could not carry.
 * Neither now claims it. Neither now has it either — that is CanonicalBar's job
 * and CanonicalBar still has no production consumer.
 *
 * ── THIRTEEN TO TWELVE: THE CHART, AND THE MUTATION QUESTION IT ANSWERED ───
 *
 * RETIRED: `components/chart/MainChart.tsx::Bar`, the one held back above. It
 * was held back because `LegacyOhlcvTuple` declares all six fields `readonly`
 * and this file de-spikes wicks by assigning to `.high` and `.low`, so the
 * rename was a live question rather than a mechanical one.
 *
 * THE COMPILER ANSWERED IT AND THE FIRST READING WAS WRONG. Reading the call
 * sites said "these objects are locally owned, so nothing is at risk" — true
 * about ownership, and irrelevant to whether it compiles. `tsc` rejected four
 * lines across two de-spike passes and named every one. Both clamps now REPLACE
 * the bar instead of editing it, which is the shape they should have had: a bar
 * that can be edited after publication is the exact mechanism by which a
 * corrected value silently replaces the one a trader already acted on, and
 * making that impossible is what CanonicalBar's truthEpoch is for.
 *
 * NO STORED BAR WAS EVER EDITED, which is the finding worth keeping. Every
 * write landed on an object the chart had just constructed; nothing reached
 * back into `barsRef.current`. The live chart's history is append-only in
 * practice, and after this change the type system enforces that rather than a
 * convention — one real precondition for canonical identity on the live path.
 *
 * THE BLAST RADIUS WAS SEVENTY-TWO REFERENCES, not the two of the markov atom,
 * and one of them was a trap: `barsRef.current as IND.Bar[]` names the type
 * `indicators.ts` exports, not the chart's own. A blanket rename rewrote it and
 * `tsc` caught that too. It is restored and commented, because retiring
 * `indicators.ts::Bar` — seven importers — is its own atom.
 *
 * ── TWELVE TO TEN: TWO SHAPES WHOSE ONLY IMPORTER WAS THEIR OWN TEST ───────
 *
 * RETIRED: `lib/backtest/engine.ts::Bar` and `lib/timeframes.ts::Candle`, both
 * byte-for-byte `LegacyOhlcvTuple`, each with exactly ONE importer, and in both
 * cases that importer is the module's own test file. Same grouping logic as the
 * four-file atom, same blast radius as the markov atom. `tsc` clean first try;
 * neither module assigns to a bar field, so `readonly` cost nothing here.
 *
 * A CORRECTION TO WHAT I WROTE TWO ATOMS AGO. The gate row for the four-file
 * atom called `indicators.ts::Bar` (seven importers) and `pine/types.ts` (seven)
 * "a different risk class" on the strength of the raw count. Re-measuring shows
 * the count conflates test importers with production ones: of the seven on
 * `indicators.ts::Bar`, five are that module's own test files, one more is
 * `selectMarketStructure.test.ts`, and exactly ONE is production. Of the seven
 * on `pine/types.ts::OHLCVBar`, three are production. The risk is real but
 * smaller than the number I quoted, and the number I quoted was the wrong
 * measurement to quote.
 *
 * THE AGGREGATOR IS THE INTERESTING HALF. `timeframes.ts::aggregateCandles`
 * MANUFACTURES bars that never came from a provider — it folds N into one — and
 * neither the old local `Candle` nor the shared legacy tuple has anywhere to
 * record that a folded bar has a different fidelity from a fetched one. The
 * rename does not close that; it just stops the module from voting on what a
 * bar is. The gap is written into the source at the declaration site so the
 * next reader finds it there rather than here.
 *
 * ── TEN TO SEVEN: THE LIVE PATH, THE SESSION, AND THE LAST FALSE PROVENANCE ─
 *
 * RETIRED: `lib/marketData/liveBarPolicy.ts::LiveBar`, `lib/sessionVP.ts::
 * Candle`, `lib/yahooTimeframes.ts::YahooOhlcvBar`. All three byte-for-byte.
 *
 * THIS ATOM PROVED THE NO-ALIAS RULE WAS DOING REAL WORK. Because each module
 * stopped EXPORTING a bar type rather than re-exporting one under a new name,
 * `tsc` immediately failed five importers with TS2459 "declares it locally but
 * it is not exported". Every one of them now imports `LegacyOhlcvTuple` from
 * the artery directly. Had an alias been left behind, all five would still be
 * routing their idea of a bar through a module that has no business owning one,
 * and the census would have read lower for it.
 *
 * `liveBarPolicy::LiveBar` IS THE ONE THAT MATTERS. That module is on the live
 * path — every websocket tick goes through `applyTickToLiveBar` — and it
 * already implements the right instinct: a late event does not get to rewrite a
 * bar. But it enforces that on a shape with no `truthEpoch` to enforce it
 * against. The policy is correct and the type cannot carry the policy's own
 * reasoning. Renaming the type does not change that by one field.
 *
 * `yahooTimeframes::YahooOhlcvBar` WAS THE THIRD AND LAST PROVENANCE-IN-THE-
 * NAME CASE, and the sharpest, because that module is where bars are
 * RECONSTRUCTED: several plans are `sourceMode: "reconstructed"`, so bars the
 * caller receives were folded from a finer interval and never traded at the
 * requested timeframe anywhere. The old name said "Yahoo" about both the native
 * and the reconstructed kind. `sourceMode` is known right there at the planner
 * and there is nowhere on the bar to put it.
 *
 * TWO LEGACY TESTS WERE REMODELLED IN THE SAME CHANGE, per M4. First, the
 * FALSE_RIPENESS floor below asserted the raw scan found MORE THAN TEN
 * declarations — a number calibrated to a bigger census, which would have
 * failed the moment the migration succeeded. It is a matcher-liveness check,
 * not a size assertion, and is now floored at three. Second,
 * `screenReach.enforcement.test.ts` uses an import statement as a parser
 * fixture and that string named `LiveBar`; it does not resolve types, so it
 * would have stayed green while teaching the retired noun.
 *
 * ── SEVEN TO SIX: THE PROFILE ENGINE BEHIND A PUBLISHED MARKET STATE ───────
 *
 * RETIRED: `lib/vpEngine.ts::ProfileBar`, byte-for-byte, four namers of which
 * two are production — `chartMarketStatePublisher.ts` and
 * `viewModels/selectLivingProfile.ts`.
 *
 * WHY THIS ONE IS NOT JUST ANOTHER RENAME TO NOTE: a volume profile is a claim
 * about how much traded at each price during a window, and it gets PUBLISHED as
 * market state. The shape it is computed from cannot say which session the
 * window belongs to, at what fidelity the volume was observed, or whether a
 * later correction supersedes it. The publisher ships the result anyway,
 * because there is nothing on the bar to gate it with. That is the adoption
 * half of M8 stated as a concrete product consequence rather than as a list of
 * missing fields, and the rename does not touch it.
 *
 * ── SIX TO FIVE: THE ENGINE THAT RUNS CODE A TRADER WROTE ──────────────────
 *
 * RETIRED: `lib/pine/types.ts::OHLCVBar`, byte-for-byte, eight namers of which
 * three are production — `ChartsDashboard.tsx`, `CustomIndicatorBuilder.tsx`
 * and `lib/pine/interpreter.ts`. NO ALIAS WAS LEFT BEHIND; `pine/types.ts`
 * stopped exporting a bar type entirely and all eight now import
 * `LegacyOhlcvTuple` from the artery.
 *
 * WHY THIS ONE IS NOT JUST ANOTHER RENAME TO NOTE: every other shape in this
 * census is consumed by code WE wrote. This one is consumed by code a TRADER
 * wrote. `interpretPine` hands six anonymous numbers to a user-authored script
 * whose output the trader will act on, and the engine cannot tell that script
 * which symbol, which session, at what fidelity, from what source, or whether a
 * correction has superseded the values. A script reading `close` has no way to
 * know it is reading a RECONSTRUCTED bar folded from a finer interval — the
 * exact case `yahooTimeframes` manufactures under `sourceMode: "reconstructed"`.
 * A wrong number the PRODUCT computed is a bug; a wrong number a trader
 * computed from bars that could not describe themselves is a bug they will
 * attribute to their own logic. The rename does not close that. It is named
 * here and at `pine/types.ts` so it is not mistaken for closed.
 *
 * THE PROSE WAS REMODELLED WITH THE CODE (M4/M6). Fourteen files carried
 * comments teaching `OHLCVBar` as a live noun — `OHLCVBar.time is in SECONDS`,
 * `OHLCVBar carries no aggressor split` — none of which any type-checker reads.
 * Left alone they would have stayed green while teaching a retired name. The
 * THREE files that name `OHLCVBar` as HISTORY — this census, `canonicalBar.ts`
 * and `useWebSocket.ts`, each recording an EARLIER, different `OHLCVBar` that
 * was retired days before — were deliberately NOT rewritten, because those
 * sentences are still true and blanket-renaming them would have falsified the
 * record.
 *
 * ── FIVE TO FOUR: THE LAST BYTE-FOR-BYTE DUPLICATE, AND THE BIGGEST ────────
 *
 * RETIRED: `components/chart/indicators.ts::Bar`. Deliberately left for last:
 * that file mentions the bare word `Bar` SIXTY times, many of them English
 * prose (`it nonetheless ASKED for a full Bar`), so a blanket rename was never
 * safe until each of the sixty had been classified as type or sentence. Ten
 * namers, of which exactly TWO are production — `MainChart.tsx` and
 * `viewModels/selectMarketStructure.ts`.
 *
 * THE COMPILER OVERRULED ME AGAIN, AND THE RECORD SAYS SO. I wrote a comment
 * in `MainChart.tsx` asserting the cast could stay as `IND.LegacyOhlcvTuple`
 * because the module "re-exports the artery's type". It does not, and it must
 * not — that would be precisely the ALIAS LEFT BEHIND this census forbids.
 * `tsc` answered TS2694 `Namespace has no exported member`. The comment was
 * wrong in the same direction as the last time the compiler overruled me: it
 * assumed a convenience the no-alias rule exists to deny. `MainChart` now
 * names the artery's type through the artery, which is the rule working.
 *
 * WHAT THIS BUYS, STATED HONESTLY: zero canonical identity, as every rename in
 * this block has. But the specific consequence at THIS site is worth naming,
 * because the file is fifty indicator functions long. `vwap`, `cvd`, `obv`,
 * `mfi` and every other volume-weighted function compute a number that is only
 * as meaningful as the FIDELITY of the volume handed to them, and no parameter
 * type here can say whether that volume was observed trade-by-trade, folded
 * from a coarser feed, or reconstructed for a timeframe that never traded. A
 * VWAP computed from reconstructed volume is not a VWAP, and the signature
 * cannot refuse it. Compare `PivotBar`, declared in the same file: that type
 * exists because `swingHighLow` reads three fields and asking for six was a
 * lie about its requirements. NARROWING A REQUIREMENT IS REAL WORK. RENAMING A
 * DUPLICATE IS NOT, and nothing in this block should be read as the former.
 *
 * WITH THIS ATOM THE DUPLICATE-ELIMINATION HALF OF M8 IS DONE. No shape in the
 * census is byte-for-byte `LegacyOhlcvTuple` any more. NOT ONE INGRESS HAS
 * BEEN MIGRATED. `canonicalBar.ts` still has ZERO production consumers. The
 * count fell from twenty-two to four and the artery is as unused as it was at
 * twenty-two, which is the single most important sentence in this file.
 *
 * ── THAT SENTENCE STOPPED BEING TRUE ON 2026-09-18 ──────────────────────────
 *
 * `/api/yahoo`'s candle path now mints CanonicalBars through
 * `lib/marketData/yahooCandleIngress.ts`. ONE ingress, out of many. The census
 * above did not move and SHOULD NOT HAVE — this atom retired no shape, and a
 * census that fell here would be measuring the wrong thing again.
 *
 * WHY THAT INGRESS WENT FIRST, since "highest value" needs a reason: it is the
 * only one that could fill a canonical field with a fact it ALREADY HELD.
 * `yahooTimeframes.ts` computes `sourceMode: "reconstructed"` for nine of its
 * eighteen plans and had nowhere to record it, so a 4h candle folded from 60m
 * bars went onto the wire indistinguishable from one a venue printed.
 * `BAR_PROVENANCES.DERIVED` is that sentence. Every other candidate ingress
 * would have had to INVENT at least one field to migrate, and inventing is the
 * failure `toLegacyTuple`'s deliberately-missing inverse exists to prevent.
 *
 * WHAT THE MIGRATION DID NOT BUY, named so it is not mistaken for bought:
 * those bars carry `SESSION_UNKNOWN`, because Yahoo does not report a session
 * and `includePrePost=true` merges RTH with pre- and after-hours into one
 * undifferentiated array. They are therefore INDICATIVE and can never be
 * EXECUTABLE. That is an assertion of ignorance travelling with the bar — the
 * third door past the wall documented in `canonicalBar.ts`, not a placeholder,
 * and not progress toward one.
 *
 * THE SECOND RATCHET BELOW is the scoreboard for the half that is left. The
 * census counts what we are migrating AWAY from and may only SHRINK; the
 * consumer list is what we are migrating TOWARD and may only GROW. One number
 * alone can always be gamed — twenty-two to four proved that, at length.
 */
const FROZEN_PRIVATE_BAR_SHAPES: readonly string[] = [
  "components/experience/DeckMarketChart.tsx::Candle",
  "lib/marketData/marketEvent.ts::CanonicalMarketEvent",
  "lib/marketData/selectAbsorptionAnatomy.ts::AnatomyBar",
  "lib/marketData/selectAbsorptionAnatomy.ts::AnatomyBarInput",
];

describe("M8 · the private-bar census is a ratchet", () => {
  /**
   * FALSE_RIPENESS GUARD, and this repo has shipped the vacuous green it
   * prevents. If the walk ever returns nothing — a moved directory, a changed
   * extension, a thrown `statSync` swallowed by a refactor — the census is
   * empty, `toEqual` against an empty expectation would be the obvious next
   * edit, and this gate would report clean forever while scanning nothing.
   */
  it("scanned the real product before reporting anything about it", () => {
    const files = productionSources();
    expect(files.length, "production sources walked").toBeGreaterThan(500);
    expect(
      files.some((f) => f.endsWith(path.join("lib", "marketData", "canonicalBar.ts"))),
      "the artery itself is inside the scanned tree",
    ).toBe(true);
    // And the matcher genuinely matches — not just that files were read.
    // FLOOR LOWERED WITH THE CENSUS, 2026-09-18. This number exists to prove
    // the matcher still MATCHES, not to assert a census size — the frozen
    // array above is what asserts the size. Left at 10 it would have failed
    // the moment the migration succeeded, which is the exact shape of a
    // legacy test protecting a legacy architecture. It must stay BELOW the
    // frozen count and ABOVE zero.
    expect(census().length, "OHLC declarations found").toBeGreaterThan(3);
  });

  /**
   * THE NARROWING IS THE MATCHER, so it gets a guard of its own rather than
   * being trusted to survive a later tidy of the regex. Explicit source text
   * rather than real files on purpose: a case pointed at `interpreter.ts` stops
   * testing the predicate the day that file is edited for an unrelated reason.
   */
  it("counts a SCALAR ohlc shape as a bar and a non-scalar one as nothing", () => {
    const decl = (fields: string) => `interface X {\n${fields}\n}`;

    expect(
      ohlcDeclarations(decl("  open: number; high: number; low: number; close: number;")),
      "a plain four-scalar shape is a private past and must be counted",
    ).toEqual(["X"]);

    expect(
      ohlcDeclarations(
        decl("  readonly open: number;\n  readonly high: number;\n" +
             "  readonly low: number;\n  readonly close?: number;"),
      ),
      "readonly and optional are still scalar prices — still a bar",
    ).toEqual(["X"]);

    expect(
      ohlcDeclarations(decl("  open: number[]; high: number[]; low: number[]; close: number[];")),
      "columns of a whole series cannot hold a competing 09:31 — not a bar",
    ).toEqual([]);

    expect(
      ohlcDeclarations(
        decl("  open: DataWindowCell; high: DataWindowCell;\n" +
             "  low: DataWindowCell; close: DataWindowCell;"),
      ),
      "a label/title view-model carries no price — a reading OF a bar, not one",
    ).toEqual([]);

    expect(
      ohlcDeclarations(decl("  open: number; high: number; low: number;")),
      "three of four is a partial projection and was never counted",
    ).toEqual([]);
  });

  it("holds at four private pasts and may only SHRINK", () => {
    const found = census().filter((entry) => !THE_ARTERY.includes(entry));
    const added = found.filter((f) => !FROZEN_PRIVATE_BAR_SHAPES.includes(f));
    const removed = FROZEN_PRIVATE_BAR_SHAPES.filter((f) => !found.includes(f));

    expect(
      added,
      `A NEW private bar shape. Two modules that each decide what a bar is ` +
        `can hold a different 09:31 for the same symbol and neither is wrong ` +
        `by its own lights — that is the defect M8 exists to end, and this ` +
        `adds to it while the migration away from it is still in flight. ` +
        `Route it through CanonicalBar instead:\n  ` + added.join("\n  "),
    ).toEqual([]);

    expect(
      removed,
      `A private bar shape is GONE, which is the good direction — and this ` +
        `list is the scoreboard, so lower it in the same commit that retired ` +
        `the shape. A migration whose scoreboard nobody updated still reads ` +
        `as unfinished a quarter after it finished:\n  ` + removed.join("\n  "),
    ).toEqual([]);
  });
});

describe("M8 · the artery cannot be narrowed before anyone uses it", () => {
  /**
   * An unused module is the easiest thing in a codebase to trim "since nothing
   * depends on it". Every field below is named in the order, and each answers
   * a question the twenty-two shapes above cannot answer at all — which is
   * precisely why they must survive the wait for their first consumer.
   */
  it("carries every field the order names", () => {
    const bar: CanonicalBar = {
      barId: "b", symbolId: "TSLA", sessionId: "s", timeframe: "1m",
      open: 1, high: 2, low: 0.5, close: 1.5, volume: 10,
      asOf: 1, receivedAt: 2,
      fidelity: "INDICATIVE", source: "test", provenance: "REST_BACKFILL", truthEpoch: 0,
    };
    for (const field of [
      "barId", "symbolId", "sessionId", "timeframe",
      "open", "high", "low", "close", "volume",
      "asOf", "receivedAt",
      "fidelity", "source", "provenance", "truthEpoch",
    ] as const) {
      expect(field in bar, `CanonicalBar lost ${field}`).toBe(true);
    }
  });

  /**
   * THE ADOPTION RATCHET — the number the census could never measure.
   *
   * Every file below is PRODUCTION code (the walker excludes `.test.`) that
   * imports the artery. It is a floor, not a freeze: adding a consumer is the
   * work, so the list may GROW freely. Losing one fails, because an ingress
   * that silently stops minting CanonicalBars is exactly the regression this
   * whole census exists to notice, and it would otherwise leave no trace — the
   * wire shape is identical either way.
   *
   * A file may leave this list only by being deleted or renamed, and then this
   * expectation is edited in the SAME commit with the reason written down.
   *
   * ── WHY THIS DEMANDS A *VALUE* IMPORT, WHICH THE FIRST VERSION DID NOT ────
   *
   * The first version of this gate matched ANY import of `canonicalBar`, and a
   * mutation receipt caught it passing while broken: pointing `route.ts` at a
   * nonexistent ingress module left this green, because the route ALSO carries
   * `import type { LegacyOhlcvTuple } from ".../canonicalBar"` — and a
   * type-only import is erased by the compiler. The emitted bundle would have
   * contained no reference to the artery at all while this gate reported
   * adoption. That is precisely the vacuous green the census was opened over,
   * reappearing inside the gate written to prevent it.
   *
   * So each entry names the module it must reach ON A RUNTIME EDGE. Only
   * `screenReach.enforcement.test.ts` caught the mutant, because it already
   * excludes type-only edges; this gate now agrees with it rather than
   * depending on it.
   */
  const REQUIRED_ARTERY_EDGES: readonly { readonly from: string; readonly to: string }[] = [
    // The ingress must reach the artery for values, not just its types.
    { from: "lib/marketData/yahooCandleIngress.ts", to: "canonicalBar" },
    // And the route must actually call the ingress.
    { from: "app/api/yahoo/route.ts", to: "yahooCandleIngress" },
    // SECOND INGRESS, 2026-09-18. This list may only GROW.
    { from: "lib/marketData/exchangeCandleIngress.ts", to: "canonicalBar" },
    { from: "app/api/exchange/route.ts", to: "exchangeCandleIngress" },
  ];

  it("has at least the production consumers it had when the migration began", () => {
    const files = productionSources();
    // FALSE_RIPENESS: the same guard the census uses. Without it an empty walk
    // would make every lookup below fail for the wrong reason.
    expect(files.length, "production sources walked").toBeGreaterThan(500);

    const byRelPath = new Map(
      files.map(f => [path.relative(SRC, f).split(path.sep).join("/"), f] as const),
    );

    for (const edge of REQUIRED_ARTERY_EDGES) {
      const abs = byRelPath.get(edge.from);
      expect(abs, `${edge.from} is gone from the production walk`).toBeDefined();
      const src = readFileSync(abs as string, "utf8");

      // `import {` / `import x from` — but NOT `import type {`, which the
      // compiler erases and which therefore proves nothing about the bundle.
      //
      // The gap is `(?!;|import)` rather than a bare `[\s\S]`, and that matters.
      // FOUND 2026-09-18 while adding the second ingress: `/api/exchange`
      // carries a type-only import of `canonicalBar` AND a value import of
      // something else, and a gap that may cross statement boundaries would
      // happily start at one `import`, run past a semicolon, and finish at a
      // LATER statement's `from` clause — reporting a runtime edge assembled
      // out of two unrelated imports. Refusing `;` and `import` inside the gap
      // pins the match to a single statement, which is the only thing that
      // answers the question being asked.
      const valueImport = new RegExp(
        String.raw`import\s+(?!type\s)(?:(?!;|\bimport\b)[\s\S]){0,400}?from\s+["'][^"']*`
        + edge.to + String.raw`["']`,
      );
      expect(
        valueImport.test(src),
        `${edge.from} no longer has a RUNTIME import of ${edge.to}. An ingress `
        + "silently left the artery, and the wire shape looks identical either "
        + "way — which is why this is a gate and not a code review.",
      ).toBe(true);
    }
  });

  it("proves the first ingress fills provenance from a fact it already held", () => {
    // Not a restatement of the unit test. This asserts the LINKAGE the baton
    // claims: that the planner's `sourceMode` is what decides provenance, so
    // nobody can later hard-code REST_BACKFILL and keep the gate green.
    const src = readFileSync(path.join(__dirname, "yahooCandleIngress.ts"), "utf8");
    expect(src, "the scan read the real ingress").toContain("export function ingestYahooCandles");
    expect(src).toMatch(/sourceMode === "reconstructed"/);
    expect(src).toContain("BAR_PROVENANCES.DERIVED");
    // And that it never claims a session or an executability it cannot back.
    expect(src).toContain("SESSION_UNKNOWN");
    expect(src).toContain("MARKET_FIDELITIES.INDICATIVE");
    expect(src).not.toContain("MARKET_FIDELITIES.EXECUTABLE");
  });

  it("proves the second ingress says NO SESSIONS rather than copying UNKNOWN", () => {
    // The cheap way to migrate a second ingress is to paste the first and
    // leave SESSION_UNKNOWN in place. That would pass every unit test in this
    // repo and would be false: a crypto book has no open, close or pre/post,
    // so "unknown" would report an absence of information that is not absent.
    const src = readFileSync(path.join(__dirname, "exchangeCandleIngress.ts"), "utf8");
    expect(src, "the scan read the real ingress").toContain("export function ingestExchangeCandles");

    // ASSIGNMENT FORM, not bare mention. Found immediately: the first version
    // of this gate used `not.toContain("SESSION_UNKNOWN")` and failed against
    // correct code, because the ingress's own header NAMES SESSION_UNKNOWN
    // while explaining why it is the wrong answer here. A gate that cannot
    // tell an explanation from a decision would be pressure to delete the
    // explanation — the reasoning is the most valuable thing in the file.
    expect(src).toContain("sessionId: SESSION_CONTINUOUS,");
    expect(src).not.toContain("sessionId: SESSION_UNKNOWN");

    // Still INDICATIVE — for a reason SESSION_CONTINUOUS does not repair. No
    // execution adapter routes through a public REST proxy.
    expect(src).toContain("fidelity: MARKET_FIDELITIES.INDICATIVE,");
    expect(src).not.toContain("fidelity: MARKET_FIDELITIES.EXECUTABLE");

    // Never DERIVED: resolveExchangeTimeframe REFUSES a timeframe a venue does
    // not natively publish rather than folding a finer one into it, so a
    // DERIVED branch here would be unreachable — and an unreachable branch is
    // an invitation to reach it.
    expect(src).toContain("provenance: BAR_PROVENANCES.REST_BACKFILL,");
    expect(src).not.toContain("provenance: BAR_PROVENANCES.DERIVED");
  });

  it("proves venue identity is part of the crypto instrument, not decoration", () => {
    // mintBarId keys on symbolId|timeframe|asOf|epoch. Dropping the venue
    // prefix would make Coinbase's 15:00 BTC and Kraken's 15:00 BTC mint the
    // SAME id, and admitBar would discard the second as a redelivery — a real
    // bar from a real venue silently deleted. They are two order books with
    // two prices, so they are two instruments.
    const src = readFileSync(path.join(__dirname, "exchangeCandleIngress.ts"), "utf8");
    expect(src).toContain("export function exchangeSymbolId");
    expect(src).toMatch(/\$\{exchange\.toUpperCase\(\)\}:/);
    expect(src, "the ingress must mint through exchangeSymbolId, not inline a coin")
      .toContain("const symbolId = exchangeSymbolId(");
  });

  it("keeps heard-at and happened-at as two different facts", () => {
    // Collapsing them is the cheapest-looking simplification in the file and
    // the most expensive: `receivedAt` is when the socket delivered, `asOf` is
    // when the market printed. Ordering by the former reorders the market
    // during a reconnect burst, and the chart would show a past that never
    // happened in that order.
    const src = readFileSync(path.join(__dirname, "canonicalBar.ts"), "utf8");
    expect(src, "the scan read the real artery").toContain("interface CanonicalBar");
    expect(src).toMatch(/readonly asOf: number/);
    expect(src).toMatch(/readonly receivedAt: number/);
  });
});
