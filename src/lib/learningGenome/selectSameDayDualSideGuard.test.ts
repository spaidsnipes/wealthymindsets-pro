import { describe, it, expect } from "vitest";

import { selectSameDayDualSideGuard } from "./selectSameDayDualSideGuard";
import type { DualSideEntry } from "./selectSameDayDualSideGuard";

function e(overrides: Partial<DualSideEntry>): DualSideEntry {
  return { date: "2026-08-25", symbol: "TSLA", side: "long", ...overrides };
}

describe("selectSameDayDualSideGuard — canon SAME-DAY DUAL-SIDE GUARD", () => {
  it("empty → empty result", () => {
    const r = selectSameDayDualSideGuard([]);
    expect(r.pairs).toEqual([]);
    expect(r.hazards).toEqual([]);
    expect(r.days_scanned).toBe(0);
  });

  it("single trade → no pair (nothing to pair)", () => {
    const r = selectSameDayDualSideGuard([e({ side: "long" })]);
    expect(r.pairs).toEqual([]);
    expect(r.hazards).toEqual([]);
  });

  it("all long-side same symbol same day → no pair (not opposing)", () => {
    const r = selectSameDayDualSideGuard([
      e({ side: "long" }),
      e({ side: "long" }),
      e({ side: "call" }),
    ]);
    expect(r.pairs).toEqual([]);
  });

  it("all short-side same symbol same day → no pair", () => {
    const r = selectSameDayDualSideGuard([
      e({ side: "short" }),
      e({ side: "put" }),
    ]);
    expect(r.pairs).toEqual([]);
  });

  it("canonical hazard: long + short same symbol same day → 1 hazard", () => {
    const r = selectSameDayDualSideGuard([
      e({ side: "long" }),
      e({ side: "short" }),
    ]);
    expect(r.hazards).toHaveLength(1);
    expect(r.hazards[0]!.symbol).toBe("TSLA");
    expect(r.hazards[0]!.long_side_count).toBe(1);
    expect(r.hazards[0]!.short_side_count).toBe(1);
    expect(r.hazards[0]!.exempted).toBe(false);
  });

  it("call + put same symbol same day → hazard (options bias sides)", () => {
    const r = selectSameDayDualSideGuard([
      e({ side: "call" }),
      e({ side: "put" }),
    ]);
    expect(r.hazards).toHaveLength(1);
  });

  it("mixed long/call + short/put same symbol → hazard, counts aggregate", () => {
    const r = selectSameDayDualSideGuard([
      e({ side: "long" }),
      e({ side: "call" }),
      e({ side: "short" }),
      e({ side: "put" }),
    ]);
    expect(r.hazards).toHaveLength(1);
    expect(r.hazards[0]!.long_side_count).toBe(2);
    expect(r.hazards[0]!.short_side_count).toBe(2);
  });

  it("cross-day pairs NOT flagged (canon: same-day gate)", () => {
    const r = selectSameDayDualSideGuard([
      e({ date: "2026-08-25", side: "long" }),
      e({ date: "2026-08-24", side: "short" }),
    ]);
    expect(r.hazards).toHaveLength(0);
  });

  it("cross-symbol pairs NOT flagged (canon: same-underlying only)", () => {
    const r = selectSameDayDualSideGuard([
      e({ symbol: "TSLA", side: "long" }),
      e({ symbol: "SPY", side: "short" }),
    ]);
    expect(r.hazards).toHaveLength(0);
  });

  it("predeclared straddle tag EXEMPTS the pair from hazard list", () => {
    const r = selectSameDayDualSideGuard([
      e({ side: "call", multiLegTag: "straddle" }),
      e({ side: "put" }), // tag on either entry exempts the pair
    ]);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0]!.exempted).toBe(true);
    expect(r.pairs[0]!.exempt_reason).toContain("straddle");
    expect(r.hazards).toHaveLength(0);
  });

  it("iron_condor / hedge / collar tags also exempt", () => {
    for (const tag of ["iron_condor", "hedge", "collar", "strangle"]) {
      const r = selectSameDayDualSideGuard([
        e({ side: "call", multiLegTag: tag }),
        e({ side: "put" }),
      ]);
      expect(r.hazards).toHaveLength(0);
    }
  });

  it("tag normalization: 'Iron-Condor' matches 'iron_condor'", () => {
    const r = selectSameDayDualSideGuard([
      e({ side: "call", multiLegTag: "Iron-Condor" }),
      e({ side: "put" }),
    ]);
    expect(r.hazards).toHaveLength(0);
  });

  it("random free-text tag does NOT exempt (only canonical tags)", () => {
    const r = selectSameDayDualSideGuard([
      e({ side: "long", multiLegTag: "gut feeling" }),
      e({ side: "short" }),
    ]);
    expect(r.hazards).toHaveLength(1);
  });

  it("symbol comparison is case-insensitive (tsla == TSLA)", () => {
    const r = selectSameDayDualSideGuard([
      e({ symbol: "tsla", side: "long" }),
      e({ symbol: "TSLA", side: "short" }),
    ]);
    expect(r.hazards).toHaveLength(1);
  });

  it("empty date or symbol strings are skipped", () => {
    const r = selectSameDayDualSideGuard([
      e({ date: "", side: "long" }),
      e({ symbol: "", side: "short" }),
    ]);
    expect(r.hazards).toHaveLength(0);
  });

  it("multiple hazards across different symbols same day all captured", () => {
    const r = selectSameDayDualSideGuard([
      e({ symbol: "TSLA", side: "long" }),
      e({ symbol: "TSLA", side: "short" }),
      e({ symbol: "SPY", side: "call" }),
      e({ symbol: "SPY", side: "put" }),
    ]);
    expect(r.hazards).toHaveLength(2);
  });
});
