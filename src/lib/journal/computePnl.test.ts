import { describe, it, expect } from "vitest";
import {
  computeJournalPnl,
  computeJournalRealizedR,
  contractMultiplierFor,
  selectJournalPricing,
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

// ---------------------------------------------------------------------------
// CAN THIS TRADE BE PRICED AT ALL?
//
// The lie these stop: `computeJournalPnl` returns 0 for a trade it cannot
// price, `classifyFinancialOutcome(0)` returns "be", and the journal recorded
// a trade that never had a price as a BREAKEVEN AT 0.00R — which then counted
// in win rate, setup grades, and the -2R daily shutdown circuit breaker.
//
// The modal's live Realized-R tile already renders "Awaiting entry/exit/size"
// for this exact state. The screen was honest and the save was not.
// ---------------------------------------------------------------------------

describe("selectJournalPricing — absence is not breakeven", () => {
  const priced = { entry: 100, exit: 110, size: 10 };

  it("a fully priced trade is PRICEABLE and says nothing", () => {
    const v = selectJournalPricing(priced);
    expect(v.status).toBe("PRICEABLE");
    expect(v.note).toBeNull();
    expect(v.missing).toEqual([]);
  });

  it("THE DEFECT: the state the modal calls 'Awaiting entry/exit/size' is refused", () => {
    // Exactly what the live tile guards against, now guarded at the write.
    expect(selectJournalPricing({}).status).toBe("UNPRICEABLE");
    expect(selectJournalPricing({ entry: 100, size: 10 }).status).toBe("UNPRICEABLE");
  });

  it("names WHICH value is missing, so the trader can act on it", () => {
    const v = selectJournalPricing({ entry: 100, size: 10 });
    expect(v.missing).toEqual(["exit"]);
    expect(v.note).toContain("exit price");
    expect(v.note).not.toContain("entry price");
  });

  it("lists several missing values as English, not as a template", () => {
    const v = selectJournalPricing({});
    expect(v.missing).toEqual(["entry", "exit", "size"]);
    expect(v.note).toContain("entry price, exit price and size");
  });

  it("says what WM would otherwise have silently written down", () => {
    // The refusal has to name the alternative. A trader who is only told
    // "invalid" assumes a validation nit; they need to know the fallback was a
    // fabricated breakeven that would pollute their statistics.
    const note = selectJournalPricing({}).note!;
    expect(note).toContain("breakeven");
    expect(note).toContain("0.00R");
    expect(note).toMatch(/win rate|grades|daily R stop/);
  });

  it("0 and negative are ABSENCE of a price, not a price", () => {
    for (const bad of [0, -1, -0.01]) {
      expect(selectJournalPricing({ ...priced, exit: bad }).status).toBe("UNPRICEABLE");
    }
  });

  it("NaN is absence — the realistic shape of an empty numeric input", () => {
    // parseFloat("") is NaN, and classifyFinancialOutcome maps non-finite
    // straight to "be" as well, so this is the same lie by a second route.
    expect(selectJournalPricing({ ...priced, entry: NaN }).status).toBe("UNPRICEABLE");
    expect(selectJournalPricing({ ...priced, size: Infinity }).status).toBe("UNPRICEABLE");
  });

  it("M0 NO TRADE is a third state — not rounded to either neighbour", () => {
    // Canon §3: entry/exit/size are deliberately absent on a no-trade day. If
    // this rounded DOWN to UNPRICEABLE a legitimate reflective record could
    // never be saved; if it rounded UP to PRICEABLE a trade that never happened
    // would be priced.
    const v = selectJournalPricing({ isNoTradeDay: true });
    expect(v.status).toBe("NO_TRADE_DAY");
    expect(v.note).toBeNull();
    expect(v.status).not.toBe("UNPRICEABLE");
    expect(v.status).not.toBe("PRICEABLE");
  });

  it("a no-trade day stays a no-trade day even with stray numbers in the form", () => {
    // The trader may have typed values and THEN classified the day M0. The day
    // model wins: canon §3 M0 means no trade happened, whatever the inputs say.
    expect(selectJournalPricing({ ...priced, isNoTradeDay: true }).status).toBe("NO_TRADE_DAY");
  });

  it("a note exists if and only if the trade is refused", () => {
    const cases = [
      selectJournalPricing(priced),
      selectJournalPricing({ isNoTradeDay: true }),
      selectJournalPricing({}),
      selectJournalPricing({ entry: 1 }),
    ];
    for (const v of cases) {
      expect(v.note === null).toBe(v.status !== "UNPRICEABLE");
    }
  });

  it("is never an alarm and never a stub (§8 vocabulary)", () => {
    const note = selectJournalPricing({}).note!;
    expect(note).not.toMatch(/\b(ERROR|INVALID|FAILED|FATAL)\b/);
    expect(note).not.toMatch(/coming soon|needs wiring|try again later/i);
    expect(note.trim().length).toBeGreaterThan(60);
  });

  it("is pure — same input, equal verdict, no shared state", () => {
    const a = selectJournalPricing({ entry: 1 });
    const b = selectJournalPricing({ entry: 1 });
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
