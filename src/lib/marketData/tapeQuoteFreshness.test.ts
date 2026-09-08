/**
 * A PRICE THAT STOPPED UPDATING MUST STOP CLAIMING IT IS CURRENT.
 *
 * OBSERVED, /command-deck 2026-09-08: `/api/yahoo` and `/api/finnhub` were
 * forced to reject for 39 seconds — 309 requests, zero answers. The rail's
 * rendered text was byte-identical before and after, and contained no
 * staleness word. `rowFor` derived `live: true` from `price > 0`, so a number
 * that had merely EXISTED once was rendered as one being received now.
 *
 * These tests own the rule that decides it.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  TAPE_QUOTE_FRESH_MS,
  formatQuoteAge,
  selectTapeQuoteFreshness,
} from "./tapeQuoteFreshness";

const NOW = 1_757_000_000_000;

describe("tape quote freshness", () => {
  it("calls a quote observed 39 seconds ago STALE, and says how old", () => {
    // The measured number from the incident, not a round one.
    const result = selectTapeQuoteFreshness(NOW - 39_000, NOW);
    expect(result.kind).toBe("STALE");
    expect(result.kind === "STALE" && result.ageMs).toBe(39_000);
  });

  it("keeps a quote from the current poll round FRESH", () => {
    expect(selectTapeQuoteFreshness(NOW - 2_000, NOW).kind).toBe("FRESH");
  });

  it("does not flicker a healthy tape on one dropped round", () => {
    // The rail refetches every 10s. If the boundary were one interval wide, a
    // single slow round would paint every row stale on a perfectly live feed —
    // a false alarm is a truth failure in the other direction.
    expect(TAPE_QUOTE_FRESH_MS).toBeGreaterThanOrEqual(30_000);
    expect(selectTapeQuoteFreshness(NOW - 11_000, NOW).kind).toBe("FRESH");
  });

  it("holds the boundary exactly: at the limit is still fresh, past it is not", () => {
    expect(selectTapeQuoteFreshness(NOW - TAPE_QUOTE_FRESH_MS, NOW).kind).toBe("FRESH");
    expect(selectTapeQuoteFreshness(NOW - TAPE_QUOTE_FRESH_MS - 1, NOW).kind).toBe("STALE");
  });

  it("refuses to certify an observation whose time it cannot state", () => {
    // Defaulting a missing stamp to "fresh" is exactly how the defect would
    // return: every legacy cache entry would be reborn as a live quote.
    for (const bad of [undefined, null, NaN, Infinity]) {
      expect(selectTapeQuoteFreshness(bad as number | null | undefined, NOW).kind).toBe("UNOBSERVED");
    }
    expect(selectTapeQuoteFreshness(NOW, NaN).kind).toBe("UNOBSERVED");
  });

  it("treats a future stamp as clock skew, not as extra freshness", () => {
    // A stamp 10 minutes ahead must not buy a quote 10 extra minutes of life.
    const skewed = selectTapeQuoteFreshness(NOW + 600_000, NOW);
    expect(skewed.kind).toBe("FRESH");
    expect(skewed.kind === "FRESH" && skewed.ageMs).toBe(0);
  });

  it("never rounds an age UP, so the label cannot overstate recency", () => {
    expect(formatQuoteAge(59_900)).toBe("59s");
    expect(formatQuoteAge(119_999)).toBe("1m");
    expect(formatQuoteAge(0)).toBe("0s");
    expect(formatQuoteAge(3_600_000)).toBe("1h");
  });
});

const TAPE = fs.readFileSync(
  path.join(process.cwd(), "src/components/layout/TickerTape.tsx"),
  "utf8",
);

describe("ticker tape — staleness reaches the rail", () => {
  it("stamps every accepted quote with the time it arrived", () => {
    // Without the stamp the rule above has nothing to judge.
    expect(TAPE).toMatch(/observedAt:\s*Date\.now\(\)/);
  });

  it("asks the one owner rather than re-deriving the boundary", () => {
    expect(TAPE).toContain('from "@/lib/marketData/tapeQuoteFreshness"');
    expect(TAPE).toContain("selectTapeQuoteFreshness(q.observedAt");
    // A second hardcoded 30_000 here is a second definition of "current".
    expect(TAPE).not.toContain("30_000");
  });

  it("has a renderer branch for a stale row, before the pending fallback", () => {
    const staleAt = TAPE.indexOf("item.staleAgeMs !== undefined ?");
    const pendingAt = TAPE.indexOf("quote pending<");
    expect(staleAt, "no stale branch in the renderer").toBeGreaterThan(-1);
    expect(pendingAt).toBeGreaterThan(-1);
    expect(staleAt).toBeLessThan(pendingAt);
  });

  it("a stale row is not rendered as live", () => {
    // `live` gates the fidelity badge and the green/red change. A stale row
    // keeping `live: true` would restore the entire defect while still
    // carrying an age nobody reads.
    const rowFor = TAPE.slice(TAPE.indexOf("function rowFor("), TAPE.indexOf("\n}", TAPE.indexOf("function rowFor(")));
    const staleReturn = rowFor.slice(rowFor.indexOf('freshness.kind === "STALE"'));
    expect(staleReturn).toMatch(/live:\s*false/);
    expect(staleReturn).toMatch(/staleAgeMs:\s*freshness\.ageMs/);
  });

  it("repaints after a round that produced nothing at all", () => {
    // Total feed death is the failure mode that changes no data — so if the
    // round clock were recorded after the empty-round early return, the rail
    // would never re-render and prices would age invisibly on screen.
    const doFetch = TAPE.slice(TAPE.indexOf("const doFetch = async ()"));
    const stampAt = doFetch.indexOf("setRoundAt(Date.now())");
    const earlyReturnAt = doFetch.indexOf("!Object.keys(answered).length");
    expect(stampAt).toBeGreaterThan(-1);
    expect(earlyReturnAt).toBeGreaterThan(-1);
    expect(stampAt).toBeLessThan(earlyReturnAt);
  });
});
