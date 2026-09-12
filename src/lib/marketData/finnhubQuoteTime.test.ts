/**
 * The vendor's clock is not our clock.
 *
 * MEASURED on prod 2026-09-12 08:22 UTC (market closed), same symbol, same
 * minute, from the Founder's authenticated session:
 *
 *   /api/finnhub?sym=AAPL   price 332.27   ts 2026-09-11T20:00:00Z   12.38h old
 *   /api/market?symbol=AAPL price 332.27   timestamp = NOW            0.00h old
 *
 * These tests pin the SEPARATION of the two clocks, because that is where the
 * defect lived. A test asserting only that a timestamp field is a number would
 * have passed on every day this was in production.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { finnhubQuoteObservedAt } from "./finnhubQuoteTime";

describe("the vendor's trade time is carried, not replaced", () => {
  it("converts Finnhub's whole-second `t` to epoch milliseconds", () => {
    // 1757620800 === 2026-09-11T20:00:00Z, the exact value measured on prod.
    expect(finnhubQuoteObservedAt({ c: 332.27, t: 1757620800 })).toBe(1757620800000);
  });

  it("says NULL when the vendor did not state a time", () => {
    // The whole defect in one assertion: "I do not know when this was observed"
    // must never be spelled "observed just now".
    for (const raw of [{ c: 1 }, { c: 1, t: undefined }, { c: 1, t: null }, {}, null, undefined, "nope", 7]) {
      expect(finnhubQuoteObservedAt(raw)).toBeNull();
    }
  });

  it("refuses a non-finite or non-positive time rather than coercing it", () => {
    // `0` is the value a vendor sends for an empty quote. Multiplying it by
    // 1000 yields the Unix epoch — a 1970 timestamp reads as absurdly stale
    // rather than as absent, which sends a reader hunting a clock bug.
    for (const t of [0, -1, NaN, Infinity, -Infinity]) {
      expect(finnhubQuoteObservedAt({ c: 1, t })).toBeNull();
    }
  });

  it("never invents a time close to now", () => {
    const before = Date.now();
    const answer = finnhubQuoteObservedAt({ c: 332.27 });
    expect(answer).toBeNull();
    // Vacuity guard: if this ever returns a number, prove it is not simply the
    // current clock wearing the vendor's name.
    if (answer !== null) expect(Math.abs(answer - before)).toBeGreaterThan(60_000);
  });
});

describe("both Finnhub routes read the owner instead of retyping it", () => {
  const ROUTES = ["src/app/api/market/route.ts", "src/app/api/finnhub/route.ts"];
  const REPO_ROOT = resolve(__dirname, "..", "..", "..");

  function routeSource(rel: string): string {
    // Comments are stripped first. Both routes quote the deleted expression in
    // their docblocks to record what it cost, and a raw scan reads that prose
    // as the violation. A scan a comment can satisfy or break proves nothing
    // about what runs.
    return stripComments(readFileSync(resolve(REPO_ROOT, rel), "utf8"));
  }

  it("no route hand-multiplies the vendor's seconds into milliseconds", () => {
    const offenders: string[] = [];
    for (const rel of ROUTES) {
      const source = routeSource(rel);
      // `json.t * 1000` / `data.t * 1000` — the private copy this owner replaced.
      if (/\.t\s*\*\s*1000/.test(source)) offenders.push(rel);
    }
    expect(
      offenders,
      `A private copy of the vendor's time conversion is a live copy: the next ` +
        `reader edits the nearest thing that looks authoritative. The ask must ` +
        `come from finnhubQuoteObservedAt alone:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every Finnhub route imports the owner", () => {
    for (const rel of ROUTES) {
      expect(routeSource(rel), `${rel} does not read the observation-time owner`)
        .toContain("finnhubQuoteObservedAt");
    }
  });

  it("the priced answer from /api/market no longer stamps a bare `timestamp`", () => {
    // ANTI-REGRESSION on the exact deleted line. `timestamp: Date.now()` is the
    // field that reported a 12.38-hour-old close as zero seconds old.
    const source = routeSource("src/app/api/market/route.ts");
    expect(source).not.toMatch(/timestamp:\s*Date\.now\(\)/);
    expect(source).toContain("observedAt");
    expect(source).toContain("fetchedAt");
  });
});
