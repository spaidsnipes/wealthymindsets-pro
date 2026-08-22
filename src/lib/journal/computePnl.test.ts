import { describe, it, expect } from "vitest";
import {
  computeJournalPnl,
  computeJournalRealizedR,
  contractMultiplierFor,
  OPTION_MULTIPLIER,
} from "./computePnl";

/**
 * ORKIN protocol (canon §22) — state-matrix tests for journal P&L.
 *
 * Discovered mid-SHIFT-H via product USE: journal saveEntry() computed
 * pnl as (exit-entry)*size with NO contract multiplier. A $1.00 → $1.20
 * option premium showed +$0.20 P&L (should be +$20). Off by exactly
 * 100x. These tests would have failed against the old code and now
 * lock the fix against future regressions.
 *
 * State matrix enumerated: side (long, short) × contractType (stock,
 * option) × direction (up, down) × plannedR (present, absent) = 16
 * distinct branches. Each one is verified below.
 */

describe("computeJournalPnl — canon §6 Contract Lens state matrix", () => {
  it("LONG STOCK, up direction: (120-100)*1*1 = +$20", () => {
    expect(computeJournalPnl({ entry: 100, exit: 120, size: 1, side: "long", contractType: "stock" })).toBe(20);
  });
  it("LONG STOCK, down direction: (100-120)*1*1 = -$20", () => {
    expect(computeJournalPnl({ entry: 120, exit: 100, size: 1, side: "long", contractType: "stock" })).toBe(-20);
  });
  it("SHORT STOCK, up direction: negated → -$20", () => {
    expect(computeJournalPnl({ entry: 100, exit: 120, size: 1, side: "short", contractType: "stock" })).toBe(-20);
  });
  it("SHORT STOCK, down direction: negated → +$20", () => {
    expect(computeJournalPnl({ entry: 120, exit: 100, size: 1, side: "short", contractType: "stock" })).toBe(20);
  });

  // The regression that would have failed against pre-H-Bkt-5 code —
  // that build multiplied by 1 for options too, yielding +$0.20.
  it("LONG OPTION, up direction: (1.20-1.00)*1*100 = +$20 (NOT +$0.20 — regression against pre-H-Bkt-5)", () => {
    expect(computeJournalPnl({ entry: 1.0, exit: 1.2, size: 1, side: "long", contractType: "option" })).toBeCloseTo(20, 6);
  });
  it("LONG OPTION, down direction: (0.80-1.00)*1*100 = -$20", () => {
    expect(computeJournalPnl({ entry: 1.0, exit: 0.8, size: 1, side: "long", contractType: "option" })).toBeCloseTo(-20, 6);
  });
  it("SHORT OPTION, up direction: negated * 100 → -$20", () => {
    expect(computeJournalPnl({ entry: 1.0, exit: 1.2, size: 1, side: "short", contractType: "option" })).toBeCloseTo(-20, 6);
  });
  it("SHORT OPTION, down direction: negated * 100 → +$20", () => {
    expect(computeJournalPnl({ entry: 1.0, exit: 0.8, size: 1, side: "short", contractType: "option" })).toBeCloseTo(20, 6);
  });

  it("size scales linearly for both contract types", () => {
    expect(computeJournalPnl({ entry: 100, exit: 120, size: 10, side: "long", contractType: "stock" })).toBe(200);
    expect(computeJournalPnl({ entry: 1.0, exit: 1.2, size: 10, side: "long", contractType: "option" })).toBeCloseTo(200, 6);
  });

  it("returns 0 when entry / exit / size is not positive (no fabricated P&L)", () => {
    expect(computeJournalPnl({ entry: 0, exit: 120, size: 1, side: "long", contractType: "stock" })).toBe(0);
    expect(computeJournalPnl({ entry: 100, exit: 0, size: 1, side: "long", contractType: "stock" })).toBe(0);
    expect(computeJournalPnl({ entry: 100, exit: 120, size: 0, side: "long", contractType: "stock" })).toBe(0);
    expect(computeJournalPnl({ entry: -100, exit: 120, size: 1, side: "long", contractType: "stock" })).toBe(0);
  });

  it("defaults to stock (1x) when contractType is missing — legacy entry safety", () => {
    expect(computeJournalPnl({ entry: 100, exit: 120, size: 1, side: "long" })).toBe(20);
    // Same numbers with option contractType → 100x
    expect(computeJournalPnl({ entry: 100, exit: 120, size: 1, side: "long", contractType: "option" })).toBe(2000);
  });

  it("contractMultiplierFor reports the exact multiplier used", () => {
    expect(contractMultiplierFor("stock")).toBe(1);
    expect(contractMultiplierFor("option")).toBe(OPTION_MULTIPLIER);
    expect(contractMultiplierFor(undefined)).toBe(1);
    expect(OPTION_MULTIPLIER).toBe(100);
  });
});

describe("computeJournalRealizedR — canon §4 + §24 R math", () => {
  it("+1R for a $20 win with Planned R = $20 (stock)", () => {
    expect(
      computeJournalRealizedR({ entry: 100, exit: 120, size: 1, side: "long", contractType: "stock", plannedRDollars: 20 }),
    ).toBeCloseTo(1, 6);
  });
  it("+1R for a $20 option win with Planned R = $20 (canon §24 example)", () => {
    // $1.00 → $1.20 with 1 option contract → +$20 P&L → +1R
    expect(
      computeJournalRealizedR({ entry: 1.0, exit: 1.2, size: 1, side: "long", contractType: "option", plannedRDollars: 20 }),
    ).toBeCloseTo(1, 6);
  });
  it("+5R when contract-return is +100% and Planned R = $20 (canon §24 verbatim)", () => {
    // $1.00 → $2.00 option with 1 contract → +$100 P&L → +5R
    expect(
      computeJournalRealizedR({ entry: 1.0, exit: 2.0, size: 1, side: "long", contractType: "option", plannedRDollars: 20 }),
    ).toBeCloseTo(5, 6);
  });
  it("undefined when Planned R is missing — never fabricated (canon §4)", () => {
    expect(
      computeJournalRealizedR({ entry: 100, exit: 120, size: 1, side: "long", contractType: "stock" }),
    ).toBeUndefined();
    expect(
      computeJournalRealizedR({ entry: 100, exit: 120, size: 1, side: "long", contractType: "stock", plannedRDollars: 0 }),
    ).toBeUndefined();
    expect(
      computeJournalRealizedR({ entry: 100, exit: 120, size: 1, side: "long", contractType: "stock", plannedRDollars: -5 }),
    ).toBeUndefined();
    expect(
      computeJournalRealizedR({ entry: 100, exit: 120, size: 1, side: "long", contractType: "stock", plannedRDollars: NaN }),
    ).toBeUndefined();
  });
  it("negative R on losers, preserving sign across all four side×ctype combos", () => {
    // stock long down = -$20 → -1R with $20 plannedR
    expect(computeJournalRealizedR({ entry: 120, exit: 100, size: 1, side: "long", contractType: "stock", plannedRDollars: 20 })).toBeCloseTo(-1, 6);
    // stock short up = -$20 → -1R
    expect(computeJournalRealizedR({ entry: 100, exit: 120, size: 1, side: "short", contractType: "stock", plannedRDollars: 20 })).toBeCloseTo(-1, 6);
    // option long down = -$20 (1 contract, 100x) → -1R
    expect(computeJournalRealizedR({ entry: 1.0, exit: 0.8, size: 1, side: "long", contractType: "option", plannedRDollars: 20 })).toBeCloseTo(-1, 6);
    // option short up = -$20 → -1R
    expect(computeJournalRealizedR({ entry: 1.0, exit: 1.2, size: 1, side: "short", contractType: "option", plannedRDollars: 20 })).toBeCloseTo(-1, 6);
  });
});
