/**
 * M8 — THE CANONICALBAR ARTERY, AND THE PRIVATE PASTS BESIDE IT.
 *
 * The count below started at twenty-two on 2026-09-18 and is SEVENTEEN as of the
 * same day. The prose that follows is the original measurement and is left
 * standing, because the shape of the problem did not change when some of the
 * shapes were deleted — only its size.
 *
 * TWENTY-TWO TO SEVENTEEN IS NOT FIVE RETIREMENTS. It is three retirements and
 * one measurement correction, and the array's docblock separates them line by
 * line so nobody reads this header as five ingresses migrated. None were.
 *
 * ── THE FINDING THAT REFRAMES THE WHOLE BREAKER (measured 2026-09-18) ───────
 *
 * The remaining shapes are not seventeen competing ideas of what a bar is.
 * THIRTEEN OF THEM ARE BYTE-FOR-BYTE THE SAME SIX FIELDS — `time, open, high,
 * low, close, volume`, every one of them `number` — which is also, exactly,
 * `LegacyOhlcvTuple` in the artery. A fourteenth, `DeckMarketChart::Candle`,
 * differs only by `volume?`. The sprawl is one anonymous six-field tuple
 * wearing a dozen module-local labels, and a sanctioned name for precisely it
 * already exists with a docblock saying so.
 *
 * That makes most of the remaining list a RENAME rather than a migration, and
 * it is important not to let the ease flatter the result: renaming thirteen
 * declarations to one name removes thirteen duplicate DECISIONS and delivers
 * zero canonical identity. `LegacyOhlcvTuple` is the legacy shape on purpose.
 * The adoption half of M8 — symbolId, sessionId, fidelity, provenance,
 * truthEpoch on the live path — is untouched by every rename and stays owed.
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
 */
const FROZEN_PRIVATE_BAR_SHAPES: readonly string[] = [
  "app/api/exchange/route.ts::Bar",
  "components/chart/MainChart.tsx::Bar",
  "components/chart/WatchlistGrid.tsx::Candle",
  "components/chart/indicators.ts::Bar",
  "components/experience/DeckMarketChart.tsx::Candle",
  "lib/api/kraken.ts::KrakenOHLC",
  "lib/backtest/engine.ts::Bar",
  "lib/marketData/liveBarPolicy.ts::LiveBar",
  "lib/marketData/marketEvent.ts::CanonicalMarketEvent",
  "lib/marketData/selectAbsorptionAnatomy.ts::AnatomyBar",
  "lib/marketData/selectAbsorptionAnatomy.ts::AnatomyBarInput",
  "lib/pine/types.ts::OHLCVBar",
  "lib/sessionVP.ts::Candle",
  "lib/timeframes.ts::Candle",
  "lib/vpEngine.ts::ProfileBar",
  "lib/yahooCandleConsumer.ts::YahooCandle",
  "lib/yahooTimeframes.ts::YahooOhlcvBar",
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
    expect(census().length, "OHLC declarations found").toBeGreaterThan(10);
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

  it("holds at seventeen private pasts and may only SHRINK", () => {
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
