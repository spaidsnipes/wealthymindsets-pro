import { describe, expect, it } from "vitest";
import {
  barFlow, chooseWedges, estimatedRuns, evidenceReceipt, findShelves, shelfTolerance, shelfWords,
  wedgeBudget, wedgeWidth, type EvidenceBar,
} from "./evidenceKinds";

const bar = (time: number, o: number, h: number, l: number, c: number, v = 100, counted: EvidenceBar["counted"] = null): EvidenceBar =>
  (void o, { time, high: h, low: l, close: c, volume: v, counted });

describe("plate 27 · a bar's split", () => {
  it("is counted when it is counted", () => {
    expect(barFlow(bar(1, 10, 12, 9, 11, 100, { buy: 70, sell: 30, source: "BAR_SIDES" }))).toEqual({ time: 1, buy: 70, sell: 30, source: "BAR_SIDES" });
  });
  it("is estimated from where it closed in its range when nothing is counted", () => {
    const f = barFlow(bar(1, 10, 20, 10, 17.5, 100))!;
    expect(f.source).toBe("ESTIMATED");
    expect(f.buy).toBeCloseTo(75);
    expect(f.sell).toBeCloseTo(25);
  });
  it("is nothing for a bar with no volume or no range", () => {
    expect(barFlow(bar(1, 10, 10, 10, 10, 100))).toBeNull();
    expect(barFlow(bar(1, 10, 12, 9, 11, 0))).toBeNull();
  });
});

describe("plate 27 · wedges", () => {
  it("only the strongest pushes speak, buys up and sells down, in time order", () => {
    const flows = [
      { time: 1, buy: 90, sell: 10, source: "BAR_SIDES" as const },
      { time: 2, buy: 52, sell: 48, source: "BAR_SIDES" as const },   // not a push
      { time: 3, buy: 5, sell: 95, source: "BAR_SIDES" as const },
      { time: 4, buy: 30, sell: 20, source: "BAR_SIDES" as const },   // a push, but small against the peak
    ];
    const w = chooseWedges(flows);
    expect(w.map(x => [x.time, x.side])).toEqual([[1, "buy"], [3, "sell"]]);
    expect(w[1].strength).toBeCloseTo(1);
  });
  it("an estimate never outranks a count", () => {
    const w = chooseWedges([
      { time: 1, buy: 900, sell: 0, source: "ESTIMATED" },
      { time: 2, buy: 60, sell: 20, source: "TAPE" },
    ]);
    expect(w.map(x => x.time)).toEqual([2]);
  });
  it("estimates speak only when nothing on camera is counted, and say so", () => {
    const w = chooseWedges([{ time: 1, buy: 90, sell: 10, source: "ESTIMATED" }]);
    expect(w[0].estimated).toBe(true);
  });
  it("about one wedge in six bars, 3..8, sized 10..20px", () => {
    expect(wedgeBudget(6)).toBe(3);
    expect(wedgeBudget(40)).toBe(7);
    expect(wedgeBudget(400)).toBe(8);
    expect(wedgeWidth(0, 20)).toBe(10);
    expect(wedgeWidth(1, 20)).toBe(20);
    expect(wedgeWidth(1, 4)).toBe(8);
  });
});

describe("plate 27 · shelves", () => {
  // A floor at 100 tested on bars 0, 3, 6; a ceiling at 110 tested on 1 and 5.
  const bars: EvidenceBar[] = [
    bar(0, 104, 106, 100, 105), bar(1, 105, 110, 103, 108), bar(2, 108, 109, 104, 104),
    bar(3, 104, 105, 100.1, 103), bar(4, 103, 107, 102, 106), bar(5, 106, 110.1, 105, 107),
    bar(6, 107, 108, 100, 101), bar(7, 101, 104, 101, 103),
  ];
  it("finds the floor buyers held 3× and the ceiling sellers held 2×", () => {
    const s = findShelves(bars, 0.3);
    expect(s.map(x => [x.side, x.price, x.holds])).toEqual([["buyers", 100, 3], ["sellers", 110, 2]]);
    expect(s[0].broken).toBe(false);
  });
  it("a close through the level ends it", () => {
    const broken = [...bars, bar(8, 103, 103, 98, 98.5)];
    expect(findShelves(broken, 0.3).find(x => x.side === "buyers")?.broken).toBe(true);
  });
  it("names the volume only when the tape reaches every test", () => {
    const all = findShelves(bars, 0.3, () => 400);
    expect(all[0].volume).toBe(1200);
    const some = findShelves(bars, 0.3, t => (t === 0 ? null : 400));
    expect(some[0].volume).toBeNull();
  });
  it("speaks in plain words", () => {
    expect(shelfWords({ side: "buyers", price: 100, tests: [0, 3, 6], holds: 3, volume: 1240, broken: false })).toBe("Buyers held 3× · 1,240 sold into them");
    expect(shelfWords({ side: "sellers", price: 110, tests: [1, 5], holds: 2, volume: null, broken: false })).toBe("Sellers held 2×");
  });
  it("tolerance is two ticks or 8% of the median range", () => {
    expect(shelfTolerance([{ high: 110, low: 100 }], 0.25)).toBeCloseTo(0.8);
    expect(shelfTolerance([{ high: 100.5, low: 100 }], 0.25)).toBeCloseTo(0.5);
  });
});

describe("plate 27 · estimated runs and receipt", () => {
  it("groups contiguous estimated bars", () => {
    const f = (s: "TAPE" | "ESTIMATED") => ({ time: 0, buy: 1, sell: 1, source: s });
    expect(estimatedRuns([f("TAPE"), f("ESTIMATED"), f("ESTIMATED"), null, f("ESTIMATED")], [1, 2, 3, 4, 5]))
      .toEqual([{ from: 2, to: 3, bars: 2 }, { from: 5, to: 5, bars: 1 }]);
  });
  it("receipt", () => {
    expect(evidenceReceipt(
      [{ time: 1, side: "buy", delta: 5, strength: 1, estimated: false }],
      [{ side: "buyers", price: 100, tests: [0, 3], holds: 2, volume: 5, broken: false }],
      [],
    )).toBe("W:1B/0S|S:BUYERS@100x2v|E:0");
  });
});
