/**
 * A DIMENSION IS IN EXACTLY ONE BUCKET.
 *
 * FOUND FROM USE, production https://wealthymindsetspro.com/charts?symbol=TSLA,
 * 2026-09-18. One page, one instant, one instrument, three counts of "how much
 * does WM know?" that do not reconcile:
 *
 *   DECISION rail     "No chapter resolved (1/8 dimensions resolved)"
 *   Canvas pill       "WAIT · 7 unresolved · 8 blockers · 1 cleared"
 *   MarketCanvasPanel  RESOLVED (4) · UNRESOLVED (7)
 *
 * 7 + 4 = 11, for EIGHT dimensions. `location`, `aggression` and `profile`
 * were printed in BOTH adjacent columns of the same panel, in the same frame.
 * The pill's own tooltip said
 *
 *   "Location is unresolved until a verified engine publishes evidence."
 *
 * four lines above a story sentence, rendered from the SAME snapshot, saying
 *
 *   "…location, aggression, profile measured but not decision-grade."
 *
 * ROOT CAUSE — two loose predicates over a THREE-valued type:
 *
 *   chartMarketStatePublisher  `resolution !== "RESOLVED"` → swept PARTIAL into
 *                              `state.unknowns` (the MISSING column)
 *   selectMarketCanvas         `resolution !== "UNKNOWN"`  → swept PARTIAL into
 *                              `vm.resolved` (the RESOLVED column)
 *
 * Complements of DIFFERENT halves. Union = everything, intersection = PARTIAL.
 * Neither predicate is wrong alone, which is why both survived review.
 *
 * WHAT HID IT: `/command-deck` printed "RESOLVED 4 of 8 … unknowns 4" and a
 * comment reasoned the pair was correct. It sums only because that BTC frame
 * carried ZERO partials. 4 + 4 = 8 was LUCK, NOT A RULE — the same shape as
 * seven-of-eight one-word dimension keys on the NAME axis.
 *
 * The guards below assert the PROPERTY (disjoint + total), not any spelling of
 * the predicates, so a future surface may compute standings however it likes
 * and still cannot produce overlapping columns.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import {
  MARKET_STATE_DIMENSION_KEYS,
  dimensionStanding,
  partitionDimensionStandings,
} from "./canonicalMarketState";
import type { MarketStateResolution } from "./canonicalMarketState";
import { selectMarketCanvas } from "./viewModels/selectMarketCanvas";

const RESOLUTIONS: readonly MarketStateResolution[] = ["RESOLVED", "PARTIAL", "UNKNOWN"];

function stateWith(
  assign: (key: string, i: number) => MarketStateResolution,
): Record<string, { resolution: MarketStateResolution }> {
  const out: Record<string, { resolution: MarketStateResolution }> = {};
  MARKET_STATE_DIMENSION_KEYS.forEach((k, i) => {
    out[k] = { resolution: assign(k, i) };
  });
  return out;
}

describe("dimension standing is a partition", () => {
  it("× THE OVERLAP: the three buckets are disjoint and total, for every mix", () => {
    // Every assignment of three resolutions across eight dimensions would be
    // 6561 cases; the rotating mixes below cover each resolution in each slot,
    // which is what the live defect needed (one snapshot with all three).
    for (let offset = 0; offset < 3; offset += 1) {
      const state = stateWith((_k, i) => RESOLUTIONS[(i + offset) % 3]);
      const p = partitionDimensionStandings(state);
      const all = [...p.RESOLVED, ...p.MEASURED, ...p.MISSING];
      expect(all.length, `offset ${offset}: buckets must sum to the key count`)
        .toBe(MARKET_STATE_DIMENSION_KEYS.length);
      expect(new Set(all).size, `offset ${offset}: no key in two buckets`).toBe(all.length);
      expect([...all].sort()).toEqual([...MARKET_STATE_DIMENSION_KEYS].sort());
    }
  });

  it("× THE MIDDLE BUCKET: PARTIAL is MEASURED — never RESOLVED, never MISSING", () => {
    expect(dimensionStanding({ resolution: "PARTIAL" })).toBe("MEASURED");
    expect(dimensionStanding({ resolution: "RESOLVED" })).toBe("RESOLVED");
    expect(dimensionStanding({ resolution: "UNKNOWN" })).toBe("MISSING");
  });

  it("an absent dimension discloses itself as MISSING rather than throwing", () => {
    expect(dimensionStanding(null)).toBe("MISSING");
    expect(dimensionStanding(undefined)).toBe("MISSING");
  });

  it("the buckets come back in canonical key order, not insertion order", () => {
    const p = partitionDimensionStandings(stateWith(() => "RESOLVED"));
    expect(p.RESOLVED).toEqual([...MARKET_STATE_DIMENSION_KEYS]);
  });
});

describe("the canvas columns cannot overlap", () => {
  it("× THE LIVE FRAME: no dimension is listed as both resolved and unresolved", () => {
    // The exact production reading: structure RESOLVED; location, aggression,
    // profile PARTIAL; direction, regime, volatility, orderFlow UNKNOWN.
    const partial = new Set(["location", "aggression", "profile"]);
    const state = stateWith((k) =>
      k === "structure" ? "RESOLVED" : partial.has(k) ? "PARTIAL" : "UNKNOWN",
    );
    // `unknowns` is what the publisher puts on the snapshot — MISSING only.
    const unknowns = partitionDimensionStandings(state).MISSING.map(
      (k) => `${k} is unresolved until a verified engine publishes evidence.`,
    );
    const vm = selectMarketCanvas(
      { ...state, unknowns } as never,
      null,
    );

    expect(vm.resolved).toEqual(["Structure"]);
    expect(vm.measured).toEqual(["Location", "Aggression", "Profile"]);
    expect(vm.missing).toHaveLength(4);

    // THE ARITHMETIC THAT FAILED LIVE: 4 + 7 = 11 for eight dimensions.
    expect(vm.resolved.length + vm.measured.length + vm.missing.length)
      .toBe(MARKET_STATE_DIMENSION_KEYS.length);

    // …and no name appears in two columns of the same panel.
    for (const name of vm.measured) {
      expect(vm.resolved, `${name} must not be in RESOLVED`).not.toContain(name);
      expect(vm.missing.join(" "), `${name} must not be in UNRESOLVED`).not.toContain(name);
    }
  });
});

describe("the former authors of the buckets now ask for them", () => {
  const read = (rel: string) =>
    stripComments(fs.readFileSync(path.join(process.cwd(), rel), "utf8"));

  it.each([
    "src/lib/marketData/chartMarketStatePublisher.ts",
    "src/lib/marketData/viewModels/selectMarketCanvas.ts",
  ])("%s no longer writes its own loose predicate", (rel) => {
    const src = read(rel);
    // The two predicates whose complements overlapped on PARTIAL.
    expect(src).not.toMatch(/resolution !== "RESOLVED"/);
    expect(src).not.toMatch(/resolution !== "UNKNOWN"/);
    expect(src).toContain("partitionDimensionStandings");
  });

  /**
   * THE SAME DEFECT WEARING ARITHMETIC INSTEAD OF A PREDICATE.
   *
   * `selectMarketObjectPassport` has ALWAYS had three lifecycles — `lifecycleOf`
   * returns RESOLVED | FORMING | UNRESOLVED and the panel prints each object's
   * own word. But the VM published only `resolvedCount` and `totalCount`, so
   * BOTH consumers wrote `${totalCount - resolvedCount} unresolved`.
   *
   * TOTAL MINUS RESOLVED IS THE SAME LIE AS `!== "RESOLVED"`. It is the
   * complement of one half of a three-valued type, reached by subtraction
   * instead of a filter. A FORMING object was counted as unresolved in the chip
   * while the panel one depth below labelled that same object FORMING.
   *
   * A count that can only be reached by subtraction has no owner.
   */
  it.each([
    "src/app/command-deck/page.tsx",
    "src/components/chart/ChartsDashboard.tsx",
  ])("%s does not reach the middle bucket by subtraction", (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/totalCount\s*-\s*\w*[Rr]esolvedCount/);
    expect(src).toContain("unresolvedCount");
    expect(src).toContain("formingCount");
  });

  /**
   * A RAIL THAT OMITS A BUCKET IS THE SAME LIE AS A PREDICATE THAT MIS-SORTS
   * ONE. Both Market-reality equipment rails counted `resolved` and `missing`
   * and nothing else, so on the live TSLA frame the rail read "1 resolved · 4
   * missing" — five of eight — while the panel one depth below listed the other
   * three under "Measured, not decision-grade".
   */
  it.each([
    "src/app/command-deck/page.tsx",
    "src/components/chart/ChartsDashboard.tsx",
  ])("%s equipment rail counts all three buckets", (rel) => {
    const src = read(rel);
    expect(src).toContain("equipment-count-resolved");
    expect(src).toContain("equipment-count-measured");
    expect(src).toContain("equipment-count-missing");
  });

  it("the passport publishes three counts that sum to the total", () => {
    const src = read("src/lib/marketData/viewModels/selectMarketObjectPassport.ts");
    for (const bucket of ["RESOLVED", "FORMING", "UNRESOLVED"] as const) {
      expect(
        src,
        `${bucket} must be counted by MEMBERSHIP, not left to a consumer's subtraction`,
      ).toContain(`o.lifecycle === "${bucket}"`);
    }
  });

  /**
   * THE TRUTH STRIP PRINTED TWO OF THREE BUCKETS AND A COMMENT SAYING SO WAS
   * FINE. `HeroTruth` showed "RESOLVED 4 of 8 … unknowns 4" with a comment
   * reasoning the pair was correct. It sums only on a frame with zero partials.
   * A strip that names RESOLVED and UNKNOWN but not MEASURED invites the reader
   * to do the subtraction the code no longer does.
   */
  it("the hero truth strip names the middle bucket instead of implying it", () => {
    const src = read("src/components/command-deck/HeroTruth.tsx");
    expect(src).toContain("partitionDimensionStandings");
    expect(src).toContain("hero-measured-dimensions");
    expect(src).toContain("hero-unknown-dimensions");
  });

  it("selectMarketStory consumes the rule it used to own privately", () => {
    const src = read("src/lib/marketData/viewModels/selectMarketStory.ts");
    expect(src).toContain("dimensionStanding");
    // The private local that was the ONLY home of this distinction.
    expect(src).not.toMatch(/resolution === "PARTIAL"/);
  });
});
