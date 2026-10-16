import { describe, expect, it } from "vitest";
import { findSweeps, medianOf, sizeCuts, sizeMixWords, sweepWords, tapeSpeed, tapeSpeedWords, tradeSizeMix, type TapePrint } from "./tapeIndicators";

const buy = (price: number, s: number, t?: number): TapePrint => ({ price, bid: 0, ask: s, timeMs: t });
const sell = (price: number, s: number, t?: number): TapePrint => ({ price, bid: s, ask: 0, timeMs: t });

describe("plate 29 · Tape Speed", () => {
  it("counts prints per second over the bar's seconds", () => {
    expect(tapeSpeed([buy(1, 1), sell(1, 2), buy(1, 0)], 2)).toBe(1);
    expect(tapeSpeed([], 0)).toBeNull();
  });
  it("names a fast bar against the median of the bars the tape reached", () => {
    expect(medianOf([1, 3, 2])).toBe(2);
    expect(tapeSpeedWords(31.2, 12)).toBe("31 prints/sec · fast");
    expect(tapeSpeedWords(4.25, 4)).toBe("4.3 prints/sec");
  });
});

describe("plate 29 · Trade Size Mix", () => {
  it("splits the bar's volume by the session's own size cuts", () => {
    const session = [Array.from({ length: 30 }, (_, i) => buy(1, i + 1))];
    const cuts = sizeCuts(session)!;
    expect(cuts.small).toBe(16);
    expect(cuts.large).toBe(28);
    const m = tradeSizeMix([buy(1, 30), buy(1, 20), buy(1, 10)], cuts)!;
    expect(m.large).toBeCloseTo(0.5);
    expect(m.mid).toBeCloseTo(20 / 60);
    expect(m.small).toBeCloseTo(10 / 60);
    expect(sizeMixWords(m)).toBe("Large 50% · Mid 33% · Small 17%");
  });
  it("no cuts from a handful of prints", () => {
    expect(sizeCuts([[buy(1, 1)]])).toBeNull();
  });
});

describe("plate 29 · Sweeps", () => {
  it("one buyer walking up four prices in a burst is a 4-level buy sweep", () => {
    const s = findSweeps([buy(100, 5, 0), buy(100.25, 5, 50), buy(100.5, 5, 90), buy(100.75, 5, 120), sell(100.5, 1, 2000)], 0.25);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ side: "buy", levels: 4, from: 100, to: 100.75, size: 20 });
    expect(sweepWords(s[0])).toBe("⚡ Buy sweep · 4 levels");
  });
  it("a pause, a turn back, or an untimed print breaks it", () => {
    expect(findSweeps([buy(100, 1, 0), buy(100.25, 1, 1000), buy(100.5, 1, 1100)], 0.25)).toHaveLength(0);
    expect(findSweeps([sell(100, 1, 0), sell(99.75, 1, 50), sell(100, 1, 80)], 0.25)).toHaveLength(0);
    expect(findSweeps([buy(100, 1), buy(100.25, 1), buy(100.5, 1)], 0.25)).toHaveLength(0);
  });
  it("three prints at one price are not a sweep", () => {
    expect(findSweeps([buy(100, 1, 0), buy(100, 1, 10), buy(100, 1, 20)], 0.25)).toHaveLength(0);
  });
});

import { bigTradePressure, bigTradePressureWords } from "./tapeIndicators";

describe("plate 29 · Big Trade Pressure", () => {
  it("nets only the big prints", () => {
    const cuts = { small: 5, large: 50 };
    expect(bigTradePressure([buy(1, 60), sell(1, 80), buy(1, 10)], cuts)).toBe(-20);
    expect(bigTradePressure([buy(1, 10)], cuts)).toBeNull();
    expect(bigTradePressureWords(1240)).toBe("+1,240 big-print net");
  });
});

describe("plate 29 · a 1-lot tape is small, not mid (serving 75ac800 NQ)", () => {
  it("prints at the median size count as small", () => {
    const ones = [Array.from({ length: 40 }, () => buy(1, 1))];
    const cuts = sizeCuts(ones)!;
    expect(tradeSizeMix(ones[0], cuts)).toEqual({ large: 0, mid: 0, small: 1 });
  });
});
