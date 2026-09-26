import { describe, it, expect } from "vitest";
import {
  computeJournalPnl,
  computeJournalRealizedR,
  contractMultiplierFor,
  describeLegacyFuturesMoney,
  FUTURES_POINT_VALUE_SINCE,
  journalContractBasis,
  journalMoneyFor,
  selectContractChip,
  selectJournalPricing,
  selectJournalSaveMoney,
  selectRecordedMoney,
  OPTION_MULTIPLIER,
} from "./computePnl";
import { hydrateJournalEntry } from "./hydrateJournalEntries";
import { classifyFinancialOutcome } from "@/lib/journalOutcome";
import { WEBULL_FUTURES_ES_INSTRUMENTS_FIXTURE } from "@/lib/broker/adapters/__fixtures__/webullResponses";
import { CONTRACT_MULTIPLIERS } from "@/lib/paperTrade";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

// ---------------------------------------------------------------------------
// FUTURES MONEY — Garden 16 §17: a chart can look right and still be
// financially wrong.
//
// THE DEFECT: ContractType was "stock" | "option", so an ES trade journaled as
// ES1! 5000 -> 5010, 1 contract, was written down as +$10.00. The real money
// is +$500.00 ($50 per point). The sign was right, so the win rate never
// flinched; the dollars, R and the daily -2R stop were 50x too small.
// ---------------------------------------------------------------------------

describe("computeJournalPnl — futures are priced at their point value", () => {
  it("THE DEFECT: ES1! 5000 -> 5010, 1 contract long = +$500, not +$10", () => {
    const pnl = computeJournalPnl({ entry: 5000, exit: 5010, size: 1, side: "long", contractType: "stock", symbol: "ES1!" });
    expect(pnl).toBe(500);
    expect(pnl).not.toBe(10);
  });

  it("ES is the same money in every notation (ES1!, ES=F, /ES, lower case)", () => {
    for (const symbol of ["ES1!", "ES=F", "/ES", "es1!"]) {
      expect(computeJournalPnl({ entry: 5000, exit: 5010, size: 1, side: "long", symbol })).toBe(500);
    }
  });

  it("NQ: $20/pt — 18000 -> 18005 x2 long = +$200", () => {
    expect(computeJournalPnl({ entry: 18000, exit: 18005, size: 2, side: "long", symbol: "NQ1!" })).toBe(200);
  });

  it("GC: $100/pt — 2400.0 -> 2401.5 x1 long = +$150", () => {
    expect(computeJournalPnl({ entry: 2400, exit: 2401.5, size: 1, side: "long", symbol: "GC=F" })).toBeCloseTo(150, 6);
  });

  it("CL: $1,000/pt — 75.00 -> 74.50 x1 SHORT = +$500 (sign follows side)", () => {
    expect(computeJournalPnl({ entry: 75, exit: 74.5, size: 1, side: "short", symbol: "/CL" })).toBeCloseTo(500, 6);
    expect(computeJournalPnl({ entry: 75, exit: 74.5, size: 1, side: "long", symbol: "/CL" })).toBeCloseTo(-500, 6);
  });

  it("realized R uses futures money: ES +10pts on a $250 1R = +2.00R, not +0.04R", () => {
    const r = computeJournalRealizedR({ entry: 5000, exit: 5010, size: 1, side: "long", symbol: "ES1!", plannedRDollars: 250 });
    expect(r).toBeCloseTo(2, 6);
  });

  it("the journal reads the ONE point-value owner — every CONTRACT_MULTIPLIERS row, no second table", () => {
    for (const [key, pv] of Object.entries(CONTRACT_MULTIPLIERS)) {
      const m = journalMoneyFor({ symbol: key });
      expect(m.status).toBe("PRICED");
      if (m.status === "PRICED") {
        expect(m.basis).toBe("futures");
        expect(m.multiplier).toBe(pv);
      }
    }
    const src = readFileSync(resolve(__dirname, "computePnl.ts"), "utf8");
    expect(src).toMatch(/import \{[^}]*\binstrumentEconomics\b[^}]*\} from "@\/lib\/marketData\/contractEconomics"/);
    // No point value is restated here: no `"ES1!": 50` style row, and no
    // import of the raw table behind the owner's back.
    expect(src).not.toMatch(/import[^;]*\bCONTRACT_MULTIPLIERS\b/);
    expect(src).not.toMatch(/from "@\/lib\/paperTrade"/);
    expect(src).not.toMatch(/["'](?:ES|NQ|GC|CL|RTY)1!["']\s*:/);
  });
});

describe("unpriced futures — named, never 1x, never a 0 breakeven", () => {
  for (const symbol of ["YM1!", "MES1!", "MES=F", "/YM"]) {
    it(`${symbol}: no published point value -> UNPRICED with a named reason`, () => {
      const m = journalMoneyFor({ symbol, contractType: "stock" });
      expect(m.status).toBe("UNPRICED");
      if (m.status !== "UNPRICED") return;
      expect(m.refusal).toBe("NO_POINT_VALUE");
      expect(m.reason).toMatch(/no published point value on file for (YM|MES)/);
      // Neither the 1x number nor 0 comes out of the math.
      const pnl = computeJournalPnl({ entry: 40000, exit: 40010, size: 1, side: "long", symbol });
      expect(Number.isNaN(pnl)).toBe(true);
      expect(pnl).not.toBe(10);
      expect(pnl).not.toBe(0);
      expect(computeJournalRealizedR({ entry: 40000, exit: 40010, size: 1, side: "long", symbol, plannedRDollars: 100 })).toBeUndefined();
    });
  }

  it("a micro never inherits its big brother's multiplier (MES is not $50)", () => {
    expect(journalMoneyFor({ symbol: "MES1!" }).status).toBe("UNPRICED");
    expect(journalMoneyFor({ symbol: "ES1!" }).status).toBe("PRICED");
  });

  it("THE SAVE GATE refuses YM through the existing pricing verdict, by name", () => {
    const v = selectJournalPricing({ entry: 40000, exit: 40010, size: 1, symbol: "YM1!", contractType: "stock" });
    expect(v.status).toBe("UNPRICEABLE");
    if (v.status !== "UNPRICEABLE") return;
    expect(v.money?.refusal).toBe("NO_POINT_VALUE");
    expect(v.money?.root).toBe("YM");
    expect(v.missing).toEqual([]); // no typed value can fix it — not "add the missing value"
    expect(v.note).toContain("YM");
    expect(v.note).toContain("no published point value on file for YM");
    expect(v.note).toContain("$1 per point");
    expect(v.note).toContain("0.00R");
    expect(v.note).not.toMatch(/Add the missing value/);
    expect(v.note).not.toMatch(/\b(ERROR|INVALID|FAILED|FATAL)\b/);
  });

  it("the instrument refusal wins even when values are also missing (the right fix is named)", () => {
    const v = selectJournalPricing({ symbol: "MES1!" });
    expect(v.status).toBe("UNPRICEABLE");
    if (v.status === "UNPRICEABLE") expect(v.money?.root).toBe("MES");
  });

  it("M0 no-trade day stays savable whatever the symbol", () => {
    expect(selectJournalPricing({ isNoTradeDay: true, symbol: "YM1!" }).status).toBe("NO_TRADE_DAY");
  });

  it("a priced futures trade passes the gate", () => {
    const v = selectJournalPricing({ entry: 5000, exit: 5010, size: 1, symbol: "ES1!", contractType: "stock" });
    expect(v.status).toBe("PRICEABLE");
    expect(v.note).toBeNull();
  });

  it("an OPTION on a futures symbol is refused, not priced at the equity 100x", () => {
    const m = journalMoneyFor({ symbol: "ES1!", contractType: "option" });
    expect(m.status).toBe("UNPRICED");
    if (m.status === "UNPRICED") expect(m.refusal).toBe("OPTION_ON_FUTURES");
    expect(Number.isNaN(computeJournalPnl({ entry: 10, exit: 12, size: 1, side: "long", contractType: "option", symbol: "ES1!" }))).toBe(true);
    expect(selectJournalPricing({ entry: 10, exit: 12, size: 1, contractType: "option", symbol: "ES1!" }).status).toBe("UNPRICEABLE");
  });
});

describe("stock and option money is unchanged by the futures fix", () => {
  it("TSLA stock 1x; TSLA option 100x", () => {
    expect(computeJournalPnl({ entry: 250, exit: 255, size: 10, side: "long", contractType: "stock", symbol: "TSLA" })).toBe(50);
    expect(computeJournalPnl({ entry: 1.0, exit: 1.2, size: 1, side: "long", contractType: "option", symbol: "TSLA" })).toBeCloseTo(20, 6);
    expect(computeJournalPnl({ entry: 1.0, exit: 1.2, size: 1, side: "long", contractType: "option", symbol: "TSLA260918C00365000" })).toBeCloseTo(20, 6);
  });

  it("bare ES (no futures notation) is a share — it is also Eversource Energy — and the label says so", () => {
    const m = journalMoneyFor({ symbol: "ES", contractType: "stock" });
    expect(m.status).toBe("PRICED");
    if (m.status === "PRICED") {
      expect(m.basis).toBe("share");
      expect(m.multiplier).toBe(1);
      expect(m.label).toBe("STOCK · 1x");
    }
  });

  it("symbols the class owner cannot name (BRK.B, empty) keep stock/option money — no journaling dead end", () => {
    expect(computeJournalPnl({ entry: 400, exit: 410, size: 1, side: "long", symbol: "BRK.B" })).toBe(10);
    expect(computeJournalPnl({ entry: 400, exit: 410, size: 1, side: "long", symbol: "" })).toBe(10);
    expect(selectJournalPricing({ entry: 400, exit: 410, size: 1, symbol: "BRK.B" }).status).toBe("PRICEABLE");
  });

  it("labels say the money each picker button would price", () => {
    expect(journalMoneyFor({ symbol: "TSLA", contractType: "option" }).label).toBe("OPTION · 100x");
    expect(journalMoneyFor({ symbol: "ES1!", contractType: "stock" }).label).toBe("FUTURES ES · $50.00 / pt");
    expect(journalMoneyFor({ symbol: "CL1!" }).label).toBe("FUTURES CL · $1,000.00 / pt");
    expect(journalMoneyFor({ symbol: "YM1!" }).label).toBe("FUTURES YM · UNPRICED");
  });
});

describe("selectRecordedMoney — a stored futures P&L that is not futures money says so", () => {
  const es = { symbol: "ES1!", contractType: "stock" as const, entry: 5000, exit: 5010, size: 1, side: "long" as const };

  it("a legacy ES entry stored at 1x ($10) is flagged with both numbers", () => {
    const r = selectRecordedMoney({ ...es, pnl: 10 });
    expect(r.label).toBe("FUTURES ES · $50.00 / pt");
    expect(r.mismatch).toContain("$10.00");
    expect(r.mismatch).toContain("$500.00");
  });

  it("an ES entry stored at its real money is quiet", () => {
    expect(selectRecordedMoney({ ...es, pnl: 500 }).mismatch).toBeNull();
  });

  it("a legacy YM entry stored at 1x is flagged as not YM money", () => {
    const r = selectRecordedMoney({ ...es, symbol: "YM1!", entry: 40000, exit: 40010, pnl: 10 });
    expect(r.label).toBe("FUTURES YM · UNPRICED");
    expect(r.mismatch).toContain("not YM money");
  });

  it("stock and option entries are never second-guessed (fees / imported figures)", () => {
    expect(selectRecordedMoney({ ...es, symbol: "TSLA", pnl: 9.5 }).mismatch).toBeNull();
    expect(selectRecordedMoney({ ...es, symbol: "TSLA", contractType: "option", entry: 1, exit: 1.2, pnl: 19 }).mismatch).toBeNull();
  });
});

describe("selectJournalSaveMoney — review RED: an M0 day is never priced, a NaN is never written", () => {
  // The record saveEntry builds, minus the parts money does not touch.
  function savedRecord(form: {
    symbol: string; entry: number; exit: number; size: number; side: "long" | "short";
    contractType?: "stock" | "option"; plannedRDollars?: number; dayModel?: "M0" | "M1" | "M2";
  }) {
    const money = selectJournalSaveMoney({ ...form, isNoTradeDay: form.dayModel === "M0" });
    if (money.status !== "WRITE") return { money, record: null };
    const record = {
      id: "t1", date: "2026-09-26", symbol: form.symbol, side: form.side,
      entry: form.entry, exit: form.exit, size: form.size,
      pnl: money.pnl, pct: 0, result: classifyFinancialOutcome(money.pnl),
      dayModel: form.dayModel, contractType: form.contractType,
      plannedRDollars: form.plannedRDollars, realizedR: money.realizedR,
    };
    return { money, record };
  }

  it("THE DEFECT: an M0 day on YM1! with hidden entry/exit/size saves a finite 0, not NaN", () => {
    const form = { symbol: "YM1!", entry: 40000, exit: 40010, size: 1, side: "long" as const, dayModel: "M0" as const, plannedRDollars: 100 };
    // The gate still lets the no-trade day through, as canon §3 requires...
    expect(selectJournalPricing({ ...form, isNoTradeDay: true }).status).toBe("NO_TRADE_DAY");
    // ...and computeJournalPnl on the same form is the NaN that used to be written.
    expect(computeJournalPnl(form)).toBeNaN();
    const { money, record } = savedRecord(form);
    expect(money).toEqual({ status: "WRITE", pnl: 0, realizedR: undefined });
    expect(record!.result).toBe("be");
  });

  it("that M0 record survives the round trip the old one did not (JSON -> hydrate)", () => {
    const { record } = savedRecord({ symbol: "YM1!", entry: 40000, exit: 40010, size: 1, side: "long", dayModel: "M0", plannedRDollars: 100 });
    const back = hydrateJournalEntry(JSON.parse(JSON.stringify(record)));
    expect(back).not.toBeNull();
    expect(back!.pnl).toBe(0);
    expect(back!.result).toBe("be");
    expect(back!.dayModel).toBe("M0");
    expect(back!.realizedR).toBeUndefined();
    // NEGATIVE CONTROL — the old write, pnl NaN, is exactly what the reader refuses.
    expect(hydrateJournalEntry(JSON.parse(JSON.stringify({ ...record, pnl: Number.NaN })))).toBeNull();
  });

  it("M0 has no realized R whatever the hidden values say (the modal promises 'undefined')", () => {
    const { money } = savedRecord({ symbol: "TSLA", entry: 100, exit: 110, size: 10, side: "long", dayModel: "M0", plannedRDollars: 50 });
    expect(money).toEqual({ status: "WRITE", pnl: 0, realizedR: undefined });
  });

  it("refuses a non-finite P&L by name instead of writing it", () => {
    // The gate refuses YM1! first; this is the second lock on the same door.
    const r = selectJournalSaveMoney({ symbol: "YM1!", entry: 40000, exit: 40010, size: 1, side: "long" });
    expect(r.status).toBe("REFUSED");
    if (r.status === "REFUSED") expect(r.reason).toBe("WM cannot price this YM trade: no published point value on file for YM");
    // Overflow is non-finite too, and is refused rather than written as null.
    const huge = selectJournalSaveMoney({ symbol: "TSLA", entry: 1, exit: 1e308, size: 1e308, side: "long" });
    expect(huge).toEqual({ status: "REFUSED", reason: "WM could not compute a finite P&L for this trade" });
  });

  it("a priced trade writes the same money computeJournalPnl / computeJournalRealizedR give", () => {
    const es = { symbol: "ES1!", entry: 5000, exit: 5010, size: 1, side: "long" as const, plannedRDollars: 250 };
    expect(selectJournalSaveMoney(es)).toEqual({ status: "WRITE", pnl: 500, realizedR: 2 });
    const opt = { symbol: "TSLA", contractType: "option" as const, entry: 1, exit: 1.2, size: 1, side: "long" as const };
    const o = selectJournalSaveMoney(opt);
    expect(o.status).toBe("WRITE");
    if (o.status === "WRITE") expect(o.pnl).toBeCloseTo(20, 6);
    expect(selectJournalSaveMoney({ symbol: "TSLA", entry: 250, exit: 255, size: 10, side: "long" })).toEqual({ status: "WRITE", pnl: 50, realizedR: undefined });
  });

  it("an M1 ESZ6 trade round-trips with its futures money intact", () => {
    const { record } = savedRecord({ symbol: "ESZ6", entry: 5000, exit: 4990, size: 2, side: "long", dayModel: "M1", plannedRDollars: 500 });
    const back = hydrateJournalEntry(JSON.parse(JSON.stringify(record)))!;
    expect(back.pnl).toBe(-1000);
    expect(back.result).toBe("loss");
    expect(back.realizedR).toBe(-2);
  });
});

describe("dated contract codes are priced as their root (review YELLOW)", () => {
  it("ESZ6 / /ESZ6 / ESZ26 / ESZ2026 are ES at $50/pt — the form the broker names contracts in", () => {
    for (const sym of ["ESZ6", "/ESZ6", "ESZ26", "ESZ2026", "esz6"]) {
      expect(computeJournalPnl({ entry: 5000, exit: 5010, size: 1, side: "long", symbol: sym }), sym).toBe(500);
    }
    expect(computeJournalPnl({ entry: 18000, exit: 18005, size: 2, side: "long", symbol: "NQH27" })).toBe(200);
  });

  it("agrees with the broker's own instrument record (Webull ESU6: code ES, size 50)", () => {
    const [rec] = WEBULL_FUTURES_ES_INSTRUMENTS_FIXTURE;
    const m = journalMoneyFor({ symbol: rec.symbol });
    expect(m.status).toBe("PRICED");
    if (m.status === "PRICED") {
      expect(m.root).toBe(rec.code);
      expect(m.multiplier).toBe(Number(rec.size));
    }
  });

  it("a dated micro stays unpriced by name (MESZ6 is not $50)", () => {
    const m = journalMoneyFor({ symbol: "MESZ6" });
    expect(m.status).toBe("UNPRICED");
    expect(m.root).toBe("MES");
  });

  it("bare roots stay shares — ES is Eversource, CL is Colgate-Palmolive", () => {
    for (const sym of ["ES", "CL", "GC", "NQ"]) {
      expect(computeJournalPnl({ entry: 100, exit: 110, size: 1, side: "long", symbol: sym }), sym).toBe(10);
    }
  });
});

describe("journalContractBasis / selectContractChip — review NIT: futures are not stock", () => {
  const row = { entry: 5000, exit: 5010, size: 1, side: "long" as const, pnl: 500 };

  it("the basis follows the journal money, not the stock/option picker", () => {
    expect(journalContractBasis({ symbol: "ES1!", contractType: "stock" })).toBe("futures");
    expect(journalContractBasis({ symbol: "ESZ6" })).toBe("futures");
    expect(journalContractBasis({ symbol: "YM1!" })).toBe("futures");
    expect(journalContractBasis({ symbol: "TSLA", contractType: "stock" })).toBe("stock");
    expect(journalContractBasis({ symbol: "TSLA" })).toBe("stock");
    expect(journalContractBasis({ symbol: "ES", contractType: "stock" })).toBe("stock");
    expect(journalContractBasis({ symbol: "TSLA", contractType: "option" })).toBe("option");
    expect(journalContractBasis({ symbol: "ES1!", contractType: "option" })).toBe("option");
  });

  it("a share has no chip; an option keeps OPT; a futures row names its root", () => {
    expect(selectContractChip({ ...row, symbol: "TSLA", contractType: "stock" })).toBeNull();
    expect(selectContractChip({ ...row, symbol: "TSLA", contractType: "option" })).toMatchObject({ basis: "option", text: "OPT", flagged: false });
    expect(selectContractChip({ ...row, symbol: "ES1!" })).toEqual({ basis: "futures", text: "FUT ES", words: "FUTURES ES · $50.00 / pt", flagged: false });
  });

  it("a legacy 1x futures row says so on its chip, with both numbers in its words", () => {
    const c = selectContractChip({ ...row, symbol: "ES1!", pnl: 10 })!;
    expect(c.text).toBe("FUT ES · SAVED AT 1x");
    expect(c.flagged).toBe(true);
    expect(c.words).toContain("$10.00");
    expect(c.words).toContain("$500.00");
    // A stored figure that is neither 1x nor the point value is not called 1x.
    expect(selectContractChip({ ...row, symbol: "ES1!", pnl: 123 })!.text).toBe("FUT ES · MONEY MISMATCH");
    expect(selectContractChip({ ...row, symbol: "YM1!", entry: 40000, exit: 40010, pnl: 10 })!.text).toBe("FUT YM · SAVED AT 1x");
  });

  it("an M0 record is never told its money is wrong", () => {
    expect(selectRecordedMoney({ ...row, symbol: "ES1!", pnl: 0, dayModel: "M0" }).mismatch).toBeNull();
    expect(selectContractChip({ ...row, symbol: "ES1!", pnl: 0, dayModel: "M0" })!.text).toBe("FUT ES");
    // Found on the glass: an M0 day on an unpriced root claimed "UNPRICED".
    expect(selectContractChip({ ...row, symbol: "YM1!", entry: 40000, exit: 40010, pnl: 0, dayModel: "M0" }))
      .toMatchObject({ text: "FUT YM", flagged: false });
  });
});

describe("describeLegacyFuturesMoney — review YELLOW: totals say what they hold", () => {
  const es = { symbol: "ES1!", entry: 5000, exit: 5010, size: 1, side: "long" as const };

  it("counts futures trade records saved at 1x and says so, dated, and that re-pricing is not built", () => {
    const d = describeLegacyFuturesMoney([
      { ...es, pnl: 10 },
      { ...es, symbol: "NQ1!", entry: 18000, exit: 18005, pnl: 5 },
      { ...es, pnl: 500 },
      { ...es, symbol: "TSLA", pnl: 10 },
    ]);
    expect(d.count).toBe(2);
    expect(d.note).toBe(
      `2 futures entries were not priced at their point value when saved — before ${FUTURES_POINT_VALUE_SINCE} the journal priced futures at $1 per point. `
      + "They are counted here as recorded, so these dollars and R understate them. "
      + "Open one to see its futures money; re-pricing saved entries is not available yet.",
    );
  });

  it("is silent on a book with no such entry, and singular for one", () => {
    expect(describeLegacyFuturesMoney([{ ...es, pnl: 500 }, { ...es, symbol: "AAPL", pnl: 3 }])).toEqual({ count: 0, note: null });
    expect(describeLegacyFuturesMoney([])).toEqual({ count: 0, note: null });
    expect(describeLegacyFuturesMoney([{ ...es, pnl: 10 }]).note).toMatch(/^1 futures entry was not priced at its point value/);
  });

  it("never counts an M0 no-trade day, and never changes the stored figure", () => {
    const rec = { ...es, pnl: 10 };
    expect(describeLegacyFuturesMoney([{ ...es, pnl: 0, dayModel: "M0" }]).count).toBe(0);
    describeLegacyFuturesMoney([rec]);
    expect(rec.pnl).toBe(10);
  });
});
