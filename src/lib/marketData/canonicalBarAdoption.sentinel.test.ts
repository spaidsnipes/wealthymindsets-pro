/**
 * M8 — THE CANONICALBAR ARTERY, AND THE PRIVATE PASTS BESIDE IT.
 *
 * The count below started at twenty-two on 2026-09-18 and is TWENTY-ONE as of
 * the same day. The prose that follows is the original measurement and is left
 * standing, because the shape of the problem did not change when one duplicate
 * was deleted — only its size.
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
 */
function ohlcDeclarations(src: string): readonly string[] {
  const DECL = /(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_]+)\s*(?:=\s*)?\{([\s\S]*?)\n\s*\}/g;
  const names: string[] = [];
  for (const m of src.matchAll(DECL)) {
    const body = m[2];
    const carries = (field: string) => new RegExp(`\\b${field}\\s*\\??\\s*:`).test(body);
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
 * FROZEN 2026-09-18 at twenty-two. LOWERED TO TWENTY-ONE 2026-09-18.
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
 */
const FROZEN_PRIVATE_BAR_SHAPES: readonly string[] = [
  "app/api/exchange/route.ts::Bar",
  "components/chart/MainChart.tsx::Bar",
  "components/chart/WatchlistGrid.tsx::Candle",
  "components/chart/indicators.ts::Bar",
  "components/experience/DeckMarketChart.tsx::Candle",
  "lib/api/kraken.ts::KrakenOHLC",
  "lib/backtest/engine.ts::Bar",
  "lib/chart/dataWindowBarScope.ts::DataWindowBarScope",
  "lib/marketData/liveBarPolicy.ts::LiveBar",
  "lib/marketData/marketEvent.ts::CanonicalMarketEvent",
  "lib/marketData/selectAbsorptionAnatomy.ts::AnatomyBar",
  "lib/marketData/selectAbsorptionAnatomy.ts::AnatomyBarInput",
  "lib/markov.ts::Bar",
  "lib/pine/interpreter.ts::ExecContext",
  "lib/pine/types.ts::OHLCVBar",
  "lib/sessionVP.ts::Candle",
  "lib/timeframes.ts::Candle",
  "lib/vpEngine.ts::ProfileBar",
  "lib/yahooCandleConsumer.ts::YahooCandle",
  "lib/yahooTimeframes.ts::YahooOhlcvBar",
  "types/index.ts::OHLCVBar",
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

  it("holds at twenty-one private pasts and may only SHRINK", () => {
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
