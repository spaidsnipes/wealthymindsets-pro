import { describe, expect, it } from "vitest";
import {
  CELL_MIN_PX,
  INSCRIPTION_PAD,
  aggPassiveRing,
  barTapeDelta,
  bigTradeCalloutLines,
  bigTradeCalloutSlots,
  bigTradeInscriptionLines,
  bigTradeResponsePath,
  fitBidAskCellText,
  fitBubbleInscription,
  footprintHistogramRow,
  imbalanceRunWord,
  imbalanceRuns,
  imbalanceStrength,
  memoBigTradeResponsePath,
  percentileOrdinal,
  pickBigTradeCallout,
  readImbalanceRows,
  sessionSizePercentile,
  signedFlowText,
} from "./footprintCanon";
import { selectBigTradeIntelligence, MIN_PRINTS_FOR_PERCENTILE } from "@/lib/marketData/viewModels/selectBigTradeIntelligence";
import { IMBALANCE_RATIO_PCT, MIN_STACK_LEVELS } from "@/lib/marketData/viewModels/selectStackedImbalance";
import selectPrintResponse, { RESPONSE_BARS } from "@/lib/marketData/viewModels/selectPrintResponse";
import { BIG_TRADE_MAX_R } from "@/lib/bubbleDrawGeometry";

/** The chart's volume formatter (MainChart `fmtV`), copied only to exercise the owner's callers. */
const fmtV = (v: number) => {
  if (!isFinite(v) || v <= 0) return "0";
  if (v < 0.005) return "<0.01";
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1000 ? `${(v / 1000).toFixed(1)}k`
    : v >= 10 ? `${Math.round(v)}`
    : v >= 1 ? v.toFixed(1)
    : v.toFixed(2);
};
/** A monospace measure: 0.6em per character. */
const mono = (text: string, px: number) => text.length * px * 0.6;

describe("one owner of a bar's tape delta", () => {
  it("silence is null, never a zero", () => {
    expect(barTapeDelta(null)).toBeNull();
    expect(barTapeDelta([])).toBeNull();
    expect(barTapeDelta([{ bid: 0, ask: 0 }])).toBeNull();
  });

  it("sums buyer-initiated (ask) against seller-initiated (bid)", () => {
    expect(barTapeDelta([{ bid: 0.1, ask: 0.02 }, { bid: 0, ask: 0.03 }])).toEqual({ buy: 0.05, sell: 0.1, delta: 0.05 - 0.1 });
  });

  it("REGRESSION (serving 2026-09-25): a negative delta reads negative, never '0'", () => {
    const bd = barTapeDelta([{ bid: 0.07, ask: 0.02 }])!;
    // The old column chip: `(isPos ? "+" : "") + fmtV(netDelta)` — fmtV maps every v ≤ 0 to "0".
    expect(fmtV(bd.delta)).toBe("0");
    expect(signedFlowText(bd.delta, fmtV)).toBe("−0.05");
    expect(signedFlowText(0.05, fmtV)).toBe("+0.05");
    expect(signedFlowText(0, fmtV)).toBe("0");
    expect(signedFlowText(Number.NaN, fmtV)).toBe("—");
  });
});

describe("Bid × Ask cell text fits its cell or is not printed", () => {
  it("prints M46's 'bid × ask' when the cell holds it", () => {
    const t = fitBidAskCellText(12, 23, fmtV, mono, 80, 12);
    expect(t).toEqual({ form: "PAIR", text: "12 × 23", px: 12 });
  });

  it("steps down through the tight pair and the dominant side, never overprinting", () => {
    const w = (txt: string, px: number) => mono(txt, px);
    const tight = fitBidAskCellText(12, 23, fmtV, w, w("12×23", CELL_MIN_PX) + 0.1, 12);
    expect(tight.form).toBe("PAIR_TIGHT");
    const dom = fitBidAskCellText(12, 23, fmtV, w, w("23", CELL_MIN_PX) + 0.1, 12);
    expect(dom).toMatchObject({ form: "DOMINANT", text: "23" });
    expect(fitBidAskCellText(12, 23, fmtV, w, 5, 12).form).toBe("NONE");
    for (const t of [tight, dom]) expect(w(t.text, t.px)).toBeLessThanOrEqual(w(t.form === "DOMINANT" ? "23" : "12×23", CELL_MIN_PX) + 0.1);
  });

  it("a side that did not trade is an empty slot, never a manufactured 0", () => {
    expect(fitBidAskCellText(0, 12, fmtV, mono, 200, 12).text).toBe("× 12");
    expect(fitBidAskCellText(7, 0, fmtV, mono, 200, 12).text).toBe("7.0 ×");
    expect(fitBidAskCellText(0, 0, fmtV, mono, 200, 12).form).toBe("NONE");
  });
});

describe("the per-candle histogram is the VP owner's length and split", () => {
  it("length ∝ the row's volume against the heaviest row; the two shares sum to it", () => {
    const poc = footprintHistogramRow({ bid: 4, ask: 6 }, 10, 40);
    expect(poc.width).toBe(40);
    expect(poc.buyWidth + poc.sellWidth).toBe(40);
    expect(poc.buyWidth).toBe(24);
    const half = footprintHistogramRow({ bid: 5, ask: 0 }, 10, 40);
    expect(half).toEqual({ width: 20, buyWidth: 0, sellWidth: 20 });
    expect(footprintHistogramRow({ bid: 0, ask: 0 }, 10, 40).width).toBe(0);
  });
});

describe("imbalance: the stacked-imbalance owner's 3:1 and weight floor", () => {
  it("a row leans at 3:1, not at 2.9:1", () => {
    const [a, b] = readImbalanceRows([{ bid: 1, ask: 3 }, { bid: 1, ask: 2.9 }, { bid: 2, ask: 2 }]);
    expect(a.side).toBe("buy");
    expect(a.ratioPct).toBeCloseTo(IMBALANCE_RATIO_PCT, 6);
    expect(b.side).toBeNull();
  });

  it("one lot against nothing is dust, not infinite conviction; a weighty one-sided row leans", () => {
    const reads = readImbalanceRows([{ bid: 0, ask: 0.01 }, { bid: 5, ask: 5 }, { bid: 6, ask: 4 }, { bid: 0, ask: 8 }]);
    expect(reads[0].side).toBeNull();
    expect(reads[3]).toMatchObject({ side: "buy", oneSided: true, ratioPct: IMBALANCE_RATIO_PCT });
  });

  it("words only for runs of ≥ MIN_STACK_LEVELS rows leaning one way, naming the weakest ratio", () => {
    const rows = [{ bid: 1, ask: 4 }, { bid: 1, ask: 3.1 }, { bid: 1, ask: 5 }, { bid: 3, ask: 3 }, { bid: 4, ask: 1 }, { bid: 3.5, ask: 1 }];
    const runs = imbalanceRuns(readImbalanceRows(rows));
    expect(MIN_STACK_LEVELS).toBe(3);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ from: 0, to: 2, side: "buy" });
    expect(imbalanceRunWord(runs[0])).toBe("≥310:100");
  });

  it("a run where every row is one-sided says so, never a 300:100 it did not measure", () => {
    const runs = imbalanceRuns(readImbalanceRows([{ bid: 0, ask: 5 }, { bid: 0, ask: 5 }, { bid: 0, ask: 5 }]));
    expect(runs[0].weakestPct).toBeNull();
    expect(imbalanceRunWord(runs[0])).toBe("one-sided");
  });

  it("tint strength is 0 at the threshold and saturates, never past 1", () => {
    expect(imbalanceStrength({ side: "buy", ratioPct: IMBALANCE_RATIO_PCT, oneSided: false })).toBe(0);
    expect(imbalanceStrength({ side: "buy", ratioPct: 1e9, oneSided: false })).toBe(1);
    expect(imbalanceStrength({ side: null, ratioPct: 0, oneSided: false })).toBe(0);
  });
});

describe("agg / passive proxy rings: side and WHERE in the bar, nothing more", () => {
  it("a buy into the top fifth and a sell into the bottom fifth are the passive proxy", () => {
    expect(aggPassiveRing(109, 100, 110, 0, 5)).toEqual({ side: "buy", volume: 5, role: "INTO_HIGH" });
    expect(aggPassiveRing(101, 100, 110, 5, 1)).toEqual({ side: "sell", volume: 5, role: "INTO_LOW" });
    expect(aggPassiveRing(105, 100, 110, 1, 4)).toEqual({ side: "buy", volume: 4, role: "AGGRESSIVE" });
    // A sell at the HIGH is aggressive selling, not "into the low".
    expect(aggPassiveRing(109, 100, 110, 5, 1)?.role).toBe("AGGRESSIVE");
    expect(aggPassiveRing(105, 100, 110, 0, 0)).toBeNull();
  });
});

describe("big trades: rank in the session, in the Intelligence view's own convention", () => {
  const prints = Array.from({ length: 40 }, (_, i) => ({ bid: i % 2 ? i + 1 : 0, ask: i % 2 ? 0 : i + 1 }));

  it("agrees with selectBigTradeIntelligence's sizePercentile for the same prints", () => {
    const vm = selectBigTradeIntelligence(prints.map((p, i) => ({ time: i + 1, price: 100, size: p.bid + p.ask, side: p.ask > 0 ? "buy" : "sell", trade: true })));
    for (const lp of vm.largePrints) {
      expect(sessionSizePercentile(lp.size, [prints.slice(0, 13), prints.slice(13)]).pct).toBeCloseTo(lp.sizePercentile, 12);
    }
  });

  it("refuses a percentile below the owner's population floor", () => {
    const few = prints.slice(0, MIN_PRINTS_FOR_PERCENTILE - 1);
    expect(sessionSizePercentile(40, [few])).toEqual({ pct: null, prints: MIN_PRINTS_FOR_PERCENTILE - 1 });
  });

  it("speaks the plates' ordinal, floored so it never rounds up into a rank it did not reach", () => {
    expect(percentileOrdinal(0.987)).toBe("98.7TH");
    expect(percentileOrdinal(0.873)).toBe("87.3RD");
    expect(percentileOrdinal(0.911)).toBe("91.1ST");
    expect(percentileOrdinal(0.912)).toBe("91.2ND");
    expect(percentileOrdinal(0.99996)).toBe("99.9TH");
  });

  it("the callout's words come from the claim owner, the receipt names size and rank", () => {
    const w = bigTradeCalloutLines({ bid: 2341, ask: 0, price: 5272.25, priceText: "5272.25", pct: 0.987, prints: 1000 })!;
    expect(w.lines).toEqual(["AGGRESSIVE SELL", "2,341 @ 5272.25", "98.7TH PERCENTILE"]);
    expect(w.receipt).toBe("ONE:2,341@98.7");
    const inferred = bigTradeCalloutLines({ bid: 0, ask: 0.25, price: 84000, priceText: "84000.00", aggressorMethod: "TICK_RULE", pct: null, prints: 7 })!;
    expect(inferred.lines[0]).toBe("INFERRED BUY PRINT");
    expect(inferred.lines[2]).toBe("UNRANKED · 7 SESSION PRINTS");
    expect(inferred.receipt).toBe("ONE:0.25@UNRANKED");
    expect(bigTradeCalloutLines({ bid: 0, ask: 0, price: 1, priceText: "1", pct: null, prints: 0 })).toBeNull();
  });
});

describe("F07A: the inscription lives INSIDE the disc", () => {
  /** Inter-ish proportional measure: 0.55em a glyph. */
  const inter = (t: string, px: number) => t.length * px * 0.55;
  const lines = (r: number) => bigTradeInscriptionLines(r, "0.25", "02:16:06 PM", "↑ 84000.00");

  it("every placed line fits the chord of the circle at its own height", () => {
    for (let r = 4; r <= BIG_TRADE_MAX_R; r++) {
      for (const l of fitBubbleInscription(r, lines(r), inter)) {
        const worst = Math.max(Math.abs(l.dy - l.px / 2), Math.abs(l.dy + l.px / 2));
        expect(worst).toBeLessThan(r);
        expect(inter(l.text, l.px)).toBeLessThanOrEqual(2 * Math.sqrt(r * r - worst * worst) - 2 * INSCRIPTION_PAD + 1e-9);
      }
    }
  });

  it("the frame's loudest disc carries SIZE / TIME / ↑PRICE; smaller ones fewer lines; a dot nothing", () => {
    expect(fitBubbleInscription(BIG_TRADE_MAX_R, lines(BIG_TRADE_MAX_R), inter).map(l => l.text)).toEqual(["0.25", "02:16:06 PM", "↑ 84000.00"]);
    // A shorter price (a stock, an FX pair) earns its line on a smaller disc.
    expect(fitBubbleInscription(26, bigTradeInscriptionLines(26, "2.3k", "10:24:37", "↓ 247.19"), inter).map(l => l.text)).toContain("↓ 247.19");
    expect(fitBubbleInscription(12, lines(12), inter).map(l => l.text)).toEqual(["0.25"]);
    expect(fitBubbleInscription(5, lines(5), inter)).toEqual([]);
  });

  it("a growing disc never loses a line", () => {
    let prev = 0;
    for (let r = 4; r <= BIG_TRADE_MAX_R; r++) {
      const n = fitBubbleInscription(r, lines(r), inter).length;
      expect(n, `r=${r}`).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });

  it("lines are stacked top to bottom in F07A's order, centred on the print", () => {
    const placed = fitBubbleInscription(BIG_TRADE_MAX_R, lines(BIG_TRADE_MAX_R), inter);
    expect(placed[0].dy).toBeLessThan(placed[1].dy);
    expect(placed[1].dy).toBeLessThan(placed[2].dy);
    const top = placed[0].dy - placed[0].px / 2, bottom = placed[2].dy + placed[2].px / 2;
    expect(top + bottom).toBeCloseTo(0, 9);
  });
});

describe("G04: at most ONE callout, and it waits to be asked for at NEAR", () => {
  const bubbles = [
    { key: "a", magnitude: 5, onCamera: true },
    { key: "b", magnitude: 9, onCamera: true },
    { key: "c", magnitude: 50, onCamera: false },
  ];
  it("MID: the dominant print on camera, never an off-camera one", () => {
    expect(pickBigTradeCallout(bubbles, { depth: "MID", selectedKey: null, hoveredKey: null })).toMatchObject({ target: { key: "b" }, reason: "DOMINANT" });
  });
  it("the selected print outranks the hovered, which outranks the dominant, at any depth", () => {
    expect(pickBigTradeCallout(bubbles, { depth: "NEAR", selectedKey: "a", hoveredKey: "b" })).toMatchObject({ target: { key: "a" }, reason: "SELECTED" });
    expect(pickBigTradeCallout(bubbles, { depth: "FAR", selectedKey: null, hoveredKey: "a" })).toMatchObject({ target: { key: "a" }, reason: "HOVERED" });
  });
  it("NEAR keeps its numbers in the rows and the discs; FAR speaks macro", () => {
    expect(pickBigTradeCallout(bubbles, { depth: "NEAR", selectedKey: null, hoveredKey: null })).toEqual({ target: null, reason: "NEAR_QUIET" });
    expect(pickBigTradeCallout(bubbles, { depth: "FAR", selectedKey: null, hoveredKey: null })).toEqual({ target: null, reason: "FAR" });
    expect(pickBigTradeCallout([], { depth: "MID", selectedKey: null, hoveredKey: null })).toEqual({ target: null, reason: "NO_PRINT" });
  });
  it("slots sit clear of the disc, up-right first", () => {
    const b = { x: 200, y: 200, r: 20 };
    const slots = bigTradeCalloutSlots(b, { w: 120, h: 40 });
    expect(slots[0].x).toBeGreaterThan(b.x + b.r);
    expect(slots[0].y + slots[0].h).toBeLessThan(b.y - b.r);
    for (const s of slots) {
      const nx = Math.max(s.x, Math.min(s.x + s.w, b.x)), ny = Math.max(s.y, Math.min(s.y + s.h, b.y));
      expect(Math.hypot(nx - b.x, ny - b.y)).toBeGreaterThan(b.r);
    }
  });
});

describe("F07A response path: real closed bars only", () => {
  const bar = (i: number, close: number) => ({ time: 1000 + i * 60, open: close, high: close + 1, low: close - 1, close });
  const bars = [bar(0, 100), bar(1, 101), bar(2, 102), bar(3, 104), bar(4, 103), bar(5, 106), bar(6, 107)];
  const print = { timeSec: 1000 + 2 * 60 + 12, price: 102.5, side: "buy" as const };

  it("runs from the print through each response bar's close to where price went", () => {
    const pts = bigTradeResponsePath(print, bars, null)!;
    expect(pts).toHaveLength(1 + RESPONSE_BARS);
    expect(pts[0]).toEqual({ time: print.timeSec, price: print.price });
    const pr = selectPrintResponse(print, bars, { formingBarTime: null });
    expect(pts[pts.length - 1]).toEqual({ time: pr.endTime, price: pr.endClose });
    expect(pts.slice(1).map(p => p.price)).toEqual([104, 103, 106]);
  });

  it("no path until the last response bar has CLOSED — never a partial line", () => {
    expect(bigTradeResponsePath(print, bars.slice(0, 5), null)).toBeNull();
    // The newest bar still forming is not a response bar.
    expect(bigTradeResponsePath(print, bars.slice(0, 6), 1000 + 5 * 60)).toBeNull();
    expect(bigTradeResponsePath(print, bars.slice(0, 6), null)).not.toBeNull();
  });

  it("the memo answers per bars array and forming bar, and recomputes when either moves", () => {
    const a = memoBigTradeResponsePath("k", print, bars, null);
    expect(memoBigTradeResponsePath("k", print, bars, null)).toBe(a);
    expect(memoBigTradeResponsePath("k", print, bars, 1000 + 5 * 60)).toBeNull();
    expect(memoBigTradeResponsePath("k", print, [...bars], null)).toEqual(a);
  });
});
