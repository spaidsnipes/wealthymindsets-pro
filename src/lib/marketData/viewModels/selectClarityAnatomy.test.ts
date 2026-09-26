/**
 * F05 CLARITY — the laws the anatomy owner answers to. Every word decided on
 * prices; the plate's PRESSURE SPLIT refused (H-701: no candle-colour buyers).
 */

import { describe, expect, it } from "vitest";

import {
  BALANCE_BAND,
  BREATH_MIN_BARS,
  gapOf,
  selectClarityAnatomy,
  wickIntentOf,
  type ClarityBar,
} from "./selectClarityAnatomy";

const bar = (open: number, high: number, low: number, close: number): ClarityBar => ({ open, high, low, close });
const flatRanges = (n: number, width = 1, at = 100): ClarityBar[] =>
  Array.from({ length: n }, () => bar(at, at + width / 2, at - width / 2, at));
const line = (vm: ReturnType<typeof selectClarityAnatomy>, key: string) => vm.lines.find(l => l.key === key)?.value ?? "";

describe("body efficiency — how much of the range the body kept", () => {
  it("a full-bodied bar reads 100%, a doji-with-range reads 0%", () => {
    expect(selectClarityAnatomy({ bar: bar(100, 110, 100, 110), priorBars: [], dp: 2 }).bodyEfficiencyPct).toBe(100);
    expect(selectClarityAnatomy({ bar: bar(105, 110, 100, 105), priorBars: [], dp: 2 }).bodyEfficiencyPct).toBe(0);
  });

  it("the plate's shape: 78% of the range in the body", () => {
    const vm = selectClarityAnatomy({ bar: bar(100, 110, 99.5, 107.8 + 0.39), priorBars: [], dp: 2 });
    expect(vm.bodyEfficiencyPct).toBe(78);
    expect(line(vm, "BODY")).toMatch(/^78% · body 8\.19 of 10\.50$/);
  });

  it("a one-price bar has no range and says so instead of dividing by zero", () => {
    const vm = selectClarityAnatomy({ bar: bar(5, 5, 5, 5), priorBars: [], dp: 2 });
    expect(vm.state).toBe("READ");
    expect(vm.bodyEfficiencyPct).toBeNull();
    expect(line(vm, "BODY")).toContain("no range");
    expect(vm.balance).toBeNull();
  });
});

describe("wick intent — decided on price shares, never pixels", () => {
  it("a long upper wick twice the lower is an upper rejection", () => {
    expect(wickIntentOf(bar(100, 110, 99, 101))).toBe("UPPER_REJECTION");
  });
  it("a long lower wick is a lower rejection", () => {
    expect(wickIntentOf(bar(109, 110, 100, 110))).toBe("LOWER_REJECTION");
  });
  it("long wicks on both ends are rejected both ends", () => {
    expect(wickIntentOf(bar(104, 110, 100, 106))).toBe("TWO_SIDED_REJECTION");
  });
  it("a marubozu rejects nothing", () => {
    expect(wickIntentOf(bar(100, 110, 100, 110))).toBe("NO_REJECTION");
  });
  it("prints the shares it decided on", () => {
    const vm = selectClarityAnatomy({ bar: bar(100, 110, 99, 101), priorBars: [], dp: 2 });
    expect(line(vm, "WICK")).toBe("Upper rejection · upper 82% · lower 9% of range");
  });
});

describe("truth gap — from the prior close, filled only if this bar's range went back", () => {
  const prior = bar(99, 100, 98, 100);
  it("opening at the prior close is no gap — a float wobble under half a tick is not one", () => {
    expect(gapOf(bar(100, 101, 99, 100.5), prior, 2)).toBe("NO_GAP");
    expect(gapOf(bar(100.004, 101, 99, 100.5), prior, 2)).toBe("NO_GAP");
  });
  it("up and down, filled and open", () => {
    expect(gapOf(bar(101, 102, 99.9, 101.5), prior, 2)).toBe("GAP_UP_FILLED");
    expect(gapOf(bar(101, 102, 100.5, 101.5), prior, 2)).toBe("GAP_UP_OPEN");
    expect(gapOf(bar(99, 100.2, 98, 98.5), prior, 2)).toBe("GAP_DOWN_FILLED");
    expect(gapOf(bar(99, 99.5, 98, 98.5), prior, 2)).toBe("GAP_DOWN_OPEN");
  });
  it("the tick is the market's: a 0.0003 gap is real on a 4-dp pair, noise on cents", () => {
    const fxPrior = bar(1.1, 1.1003, 1.0999, 1.1);
    expect(gapOf(bar(1.1003, 1.1005, 1.1002, 1.1004), fxPrior, 4)).toBe("GAP_UP_OPEN");
    expect(gapOf(bar(100.003, 101, 100.002, 100.5), prior, 2)).toBe("NO_GAP");
  });
  it("the first bar held has nothing to gap from", () => {
    expect(gapOf(bar(1, 2, 0, 1), undefined, 2)).toBe("NO_PRIOR_BAR");
  });
  it("names the prior close it filled back to, at the market's decimals", () => {
    const vm = selectClarityAnatomy({ bar: bar(101.25, 102, 99.75, 101.5), priorBars: [prior], dp: 2 });
    expect(line(vm, "GAP")).toBe("Gap up 1.25 · filled back to 100.00");
  });
});

describe("close location — the plate's balance, stated as geometry", () => {
  it("within the plate's 0.03 band is on the centerline", () => {
    const vm = selectClarityAnatomy({ bar: bar(100, 110, 100, 105 + 10 * (BALANCE_BAND - 0.01)), priorBars: [], dp: 2 });
    expect(line(vm, "BALANCE")).toContain("D ≈ 0.00 · on the centerline");
  });
  it("a close near the high reads the upper half with a signed D", () => {
    const vm = selectClarityAnatomy({ bar: bar(100, 110, 100, 109), priorBars: [], dp: 2 });
    expect(vm.closeLocationPct).toBe(90);
    expect(line(vm, "BALANCE")).toBe("90% of range · D +0.40 · upper half");
  });
  it("never speaks of buyers, sellers, bulls, bears or pressure — H-701", () => {
    const cases = [bar(100, 110, 100, 109), bar(109, 110, 100, 101), bar(104, 110, 100, 106)];
    for (const b of cases) {
      const text = selectClarityAnatomy({ bar: b, priorBars: flatRanges(12), dp: 2 }).lines.map(l => `${l.label} ${l.value}`).join(" ");
      expect(text).not.toMatch(/\b(buy|buyer|buyers|sell|seller|sellers|bull|bulls|bullish|bear|bears|bearish|pressure|aggress)/i);
    }
  });
});

describe("breath — this range against the median range before it", () => {
  it("unmeasured below the floor of prior bars, and says how many it had", () => {
    const vm = selectClarityAnatomy({ bar: bar(100, 101, 99, 100), priorBars: flatRanges(BREATH_MIN_BARS - 1), dp: 2 });
    expect(vm.breath).toBe("UNMEASURED");
    expect(line(vm, "BREATH")).toContain(`${BREATH_MIN_BARS - 1} of ${BREATH_MIN_BARS}`);
  });
  it("wide, narrow and ordinary against a median of 1.0", () => {
    const prior = flatRanges(20, 1);
    expect(selectClarityAnatomy({ bar: bar(100, 101, 99, 100), priorBars: prior, dp: 2 }).breath).toBe("EXPANDING");
    expect(selectClarityAnatomy({ bar: bar(100, 100.3, 99.9, 100), priorBars: prior, dp: 2 }).breath).toBe("CONTRACTING");
    expect(selectClarityAnatomy({ bar: bar(100, 100.5, 99.5, 100), priorBars: prior, dp: 2 }).breath).toBe("ORDINARY");
  });
  it("uses the median, so one monster bar before cannot grade this one small", () => {
    const prior = [...flatRanges(19, 1), bar(100, 200, 0, 100)];
    expect(selectClarityAnatomy({ bar: bar(100, 101, 99, 100), priorBars: prior, dp: 2 }).breath).toBe("EXPANDING");
  });
});

describe("refusals", () => {
  it("no bar, no anatomy", () => {
    expect(selectClarityAnatomy({ bar: null, priorBars: [], dp: 2 })).toMatchObject({ state: "UNREAD", lines: [] });
  });
  it("an unreadable or inverted bar is refused, not guessed", () => {
    expect(selectClarityAnatomy({ bar: bar(NaN, 1, 0, 1), priorBars: [], dp: 2 }).state).toBe("UNREAD");
    expect(selectClarityAnatomy({ bar: bar(1, 0, 2, 1), priorBars: [], dp: 2 }).state).toBe("UNREAD");
  });
  it("prints in the plate's order: range, body, wick, gap, balance, breath", () => {
    const vm = selectClarityAnatomy({ bar: bar(100, 110, 99, 101), priorBars: flatRanges(12), dp: 2 });
    expect(vm.lines.map(l => l.key)).toEqual(["RANGE", "BODY", "WICK", "GAP", "BALANCE", "BREATH"]);
  });
});
