/**
 * contractEconomics — Garden 16 §17 economic chain for the frozen certificate
 * (A TSLA · B ES1! · C GC1!) and the named refusals around it.
 *
 * The chain every PRICED case must satisfy:
 *   PRICE MOVE → TICKS → POINT VALUE → CURRENCY VALUE PER UNIT
 * and the tick table must be the other half of the ONE point-value owner.
 */
import { describe, expect, it } from "vitest";
import { CONTRACT_MULTIPLIERS } from "@/lib/paperTrade";
import {
  CONTRACT_TICK_SIZES,
  formatMoney,
  formatTicks,
  formatUsd,
  instrumentEconomics,
  selectRiskEconomics,
  snapToTick,
} from "./contractEconomics";

describe("contract spec — one owner, two halves", () => {
  it("every contract with a point value has a tick, and no tick exists without one", () => {
    expect(Object.keys(CONTRACT_TICK_SIZES).sort()).toEqual(Object.keys(CONTRACT_MULTIPLIERS).sort());
  });

  it("tick sizes match the broker's instrument record (Webull US_FUTURES, 2026-09-26)", () => {
    expect(CONTRACT_TICK_SIZES).toEqual({ "NQ1!": 0.25, "ES1!": 0.25, "RTY1!": 0.1, "GC1!": 0.1, "CL1!": 0.01 });
  });

  it("tick values are the published ones", () => {
    const tv = (s: string) => {
      const e = instrumentEconomics(s, 100);
      return e.status === "PRICED" ? e.tickValue : null;
    };
    expect(tv("ES1!")).toBe(12.5);
    expect(tv("NQ1!")).toBe(5);
    expect(tv("RTY1!")).toBe(5);
    expect(tv("GC1!")).toBeCloseTo(10, 10);
    expect(tv("CL1!")).toBe(10);
  });
});

describe("certificate A · TSLA", () => {
  it("is one share, $1 a point, cents grid", () => {
    const e = instrumentEconomics("TSLA", 380);
    expect(e).toMatchObject({ status: "PRICED", assetClass: "EQUITY", unit: "share", pointValue: 1, tickSize: 0.01, currency: "USD" });
  });

  it("a 5-point stop is 500 ticks and $5.00 per share", () => {
    const r = selectRiskEconomics("TSLA", { entry: 380, stop: 375, target: 392 });
    expect(r.status).toBe("PRICED");
    if (r.status !== "PRICED") return;
    expect(r.stopTicks).toBeCloseTo(500, 6);
    expect(r.riskPerUnit).toBe(5);
    expect(r.rewardPerUnit).toBe(12);
    expect(r.words).toBe("500 ticks × $0.01 = $5.00 per 1 share");
    expect(r.receipt).toBe("PRICED:TSLA:tick=0.01:pv=1:ticks=500:risk=5.00:reward=12.00:share");
  });

  it("a sub-dollar stock quotes in hundredths of a cent", () => {
    const e = instrumentEconomics("ABCD", 0.42);
    expect(e.status === "PRICED" && e.tickSize).toBe(0.0001);
  });
});

describe("certificate B · ES1!", () => {
  it("is one contract, $50 a point, quarter ticks worth $12.50", () => {
    expect(instrumentEconomics("ES1!", 6500)).toMatchObject({
      status: "PRICED", assetClass: "FUTURES", root: "ES", unit: "contract", pointValue: 50, tickSize: 0.25, tickValue: 12.5,
    });
  });

  it("the SAME 5-point stop is 20 ticks and $250.00 per contract", () => {
    const r = selectRiskEconomics("ES1!", { entry: 6512.25, stop: 6507.25, target: 6524.25 });
    expect(r.status === "PRICED" && r.words).toBe("20 ticks × $12.50 = $250.00 per 1 contract");
    expect(r.receipt).toBe("PRICED:ES:tick=0.25:pv=50:ticks=20:risk=250.00:reward=600.00:contract");
  });

  it("the target states its reward from the same chain", () => {
    const r = selectRiskEconomics("ES1!", { entry: 6512.25, stop: 6507.25, target: 6524.25 });
    expect(r.status === "PRICED" && r.rewardWords).toBe("reward $600.00 per 1 contract");
    const noTarget = selectRiskEconomics("ES1!", { entry: 6512.25, stop: 6507.25, target: null });
    expect(noTarget.status === "PRICED" && noTarget.rewardWords).toBeNull();
    expect(selectRiskEconomics("YM1!", { entry: 100, stop: 99, target: 110 }).status === "REFUSED").toBe(true);
    const refused = selectRiskEconomics("YM1!", { entry: 100, stop: 99, target: 110 });
    expect(refused.status === "REFUSED" && refused.rewardWords).toBeNull();
  });

  it("every notation of the contract gets the same money", () => {
    for (const s of ["ES1!", "ES=F", "/ES", "es1!"]) {
      const e = instrumentEconomics(s, 6500);
      expect(e.status === "PRICED" && [e.root, e.pointValue, e.tickSize]).toEqual(["ES", 50, 0.25]);
    }
  });
});

describe("certificate C · GC1!", () => {
  it("is one contract, $100 a point, dime ticks worth $10", () => {
    expect(instrumentEconomics("GC1!", 3400)).toMatchObject({
      status: "PRICED", root: "GC", unit: "contract", pointValue: 100, tickSize: 0.1,
    });
  });

  it("the SAME 5-point stop is 50 ticks and $500.00 per contract (float noise does not leak)", () => {
    const r = selectRiskEconomics("GC1!", { entry: 2650.3, stop: 2645.3, target: null });
    expect(r.status === "PRICED" && r.words).toBe("50 ticks × $10.00 = $500.00 per 1 contract");
    expect(r.receipt).toBe("PRICED:GC:tick=0.1:pv=100:ticks=50:risk=500.00:reward=NA:contract");
  });
});

describe("refusals are named, never priced at 1x", () => {
  it("a futures contract with no published point value refuses (Dow, Silver, a micro)", () => {
    for (const [s, root] of [["YM1!", "YM"], ["SI1!", "SI"], ["MES1!", "MES"], ["MGC1!", "MGC"]] as const) {
      const r = selectRiskEconomics(s, { entry: 100, stop: 99, target: null });
      expect(r.status).toBe("REFUSED");
      expect(r.receipt).toBe(`REFUSED:NO_POINT_VALUE:${root}`);
      expect(r.words).toBe(`$ risk withheld — no published point value on file for ${root}`);
    }
  });

  it("spot FX, spot gold and a cash index refuse with their own reason", () => {
    expect(selectRiskEconomics("EURUSD", { entry: 1.14, stop: 1.13, target: null }).receipt).toBe("REFUSED:SPOT_FX_LOT:EURUSD");
    expect(selectRiskEconomics("XAUUSD", { entry: 3400, stop: 3390, target: null }).receipt).toBe("REFUSED:SPOT_FX_LOT:XAUUSD");
    expect(instrumentEconomics("^VIX", 20)).toMatchObject({ status: "REFUSED", refusal: "CASH_INDEX" });
  });

  it("crypto in USD is priced per coin without inventing a tick", () => {
    const r = selectRiskEconomics("BTC-USD", { entry: 84000, stop: 83500, target: null });
    expect(r.status === "PRICED" && r.words).toBe("$500.00 per 1 coin");
    expect(r.receipt).toBe("PRICED:BTC-USD:tick=NA:pv=1:ticks=NA:risk=500.00:reward=NA:coin");
  });
});

describe("snapToTick — a plan is placed where an order could be", () => {
  it("rounds to each certificate instrument's own grid", () => {
    expect(snapToTick("TSLA", 366.9931)).toBe(366.99);
    expect(snapToTick("TSLA", 369.9904)).toBe(369.99);
    expect(snapToTick("ES1!", 6512.37)).toBe(6512.25);
    expect(snapToTick("ES1!", 6512.38)).toBe(6512.5);
    expect(snapToTick("GC1!", 2650.349)).toBe(2650.3);
    expect(snapToTick("GC1!", 2650.351)).toBe(2650.4);
    expect(snapToTick("CL1!", 91.7349)).toBe(91.73);
    expect(snapToTick("ABCD", 0.41237)).toBe(0.4124);
  });

  it("leaves no float noise behind", () => {
    expect(String(snapToTick("GC1!", 2650.30000001))).toBe("2650.3");
    expect(String(snapToTick("ES1!", 0.1 + 0.2))).toBe("0.25");
  });

  it("does not invent a grid it does not have (FX, crypto, contracts without a spec)", () => {
    expect(snapToTick("EURUSD", 1.142371)).toBe(1.142371);
    expect(snapToTick("BTC-USD", 84012.337)).toBe(84012.337);
    expect(snapToTick("YM1!", 42017.3)).toBe(42017.3);
    expect(snapToTick("MES1!", 6512.37)).toBe(6512.37);
    expect(Number.isNaN(snapToTick("ES1!", NaN))).toBe(true);
  });

  it("a snapped plan states whole ticks on the rail (the glass read ≈299.7)", () => {
    const r = selectRiskEconomics("TSLA", { entry: snapToTick("TSLA", 369.9904), stop: snapToTick("TSLA", 366.9931), target: snapToTick("TSLA", 375.985) });
    expect(r.status === "PRICED" && r.words).toBe("300 ticks × $0.01 = $3.00 per 1 share");
    expect(r.status === "PRICED" && r.rewardWords).toBe("reward $6.00 per 1 share");
  });
});

describe("words", () => {
  it("money is grouped, two decimals, locale-free", () => {
    expect(formatUsd(250)).toBe("$250.00");
    expect(formatUsd(12345.678)).toBe("$12,345.68");
    expect(formatUsd(1000000)).toBe("$1,000,000.00");
  });

  it("an off-grid stop says its tick count is approximate", () => {
    expect(formatTicks(20)).toBe("20");
    expect(formatTicks(20.36)).toBe("≈20.4");
    const r = selectRiskEconomics("ES1!", { entry: 6512.3, stop: 6507.2, target: null });
    // Off the grid a rounded tick count would not multiply out (Sheriff,
    // 2026-09-26), so the line states points and still adds up.
    expect(r.status === "PRICED" && r.words).toBe("off tick grid · 5.1 pts × $50.00 = $255.00 per 1 contract");
  });
});

describe("the line always adds up (Sheriff review, 2026-09-26)", () => {
  it("a sub-dollar stock's money keeps its digits instead of reading $0.00", () => {
    const r = selectRiskEconomics("ABCD", { entry: 0.4125, stop: 0.4088, target: 0.4199 });
    expect(r.status === "PRICED" && r.words).toBe("37 ticks × $0.0001 = $0.0037 per 1 share");
    expect(r.status === "PRICED" && r.rewardWords).toBe("reward $0.0074 per 1 share");
    expect(r.receipt).toBe("PRICED:ABCD:tick=0.0001:pv=1:ticks=37:risk=0.0037:reward=0.0074:share");
  });

  it("money formatting: cents at and above a cent, digits below", () => {
    expect(formatMoney(250)).toBe("$250.00");
    expect(formatMoney(0.01)).toBe("$0.01");
    expect(formatMoney(0.0037)).toBe("$0.0037");
    expect(formatMoney(0.000037)).toBe("$0.000037");
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(-0.0037)).toBe("-$0.0037");
  });

  it("one tick is one tick", () => {
    const r = selectRiskEconomics("ES1!", { entry: 6512.25, stop: 6512, target: null });
    expect(r.status === "PRICED" && r.words).toBe("1 tick × $12.50 = $12.50 per 1 contract");
  });

  it("a plan without finite prices is named, never printed as $NaN", () => {
    for (const plan of [{ entry: NaN, stop: 1, target: null }, { entry: 10, stop: Infinity, target: null }, { entry: 10, stop: 9, target: NaN }]) {
      const r = selectRiskEconomics("TSLA", plan);
      expect(r.status).toBe("REFUSED");
      expect(r.words).toBe("$ risk withheld — the plan has no finite prices");
      expect(r.receipt).toBe("REFUSED:NO_PLAN_PRICES:TSLA");
    }
  });
});
