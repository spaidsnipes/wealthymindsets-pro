/**
 * selectMarketStructure — the compiled owner of the swing sequence.
 *
 * The property that matters most is the one the detector cannot escape: a
 * fractal pivot needs `lookback` bars on BOTH sides, so the newest `lookback`
 * bars can never be pivots. `unconfirmedBars` must therefore be non-zero on
 * every window, including a long healthy one — it is a property of the method,
 * not a symptom of a thin feed. Its own describe block guards that.
 */

import { describe, expect, it } from "vitest";
import {
  selectMarketStructure,
  STRUCTURE_DEFAULT_LOOKBACK,
  STRUCTURE_MIN_PIVOTS_PER_SIDE,
} from "./selectMarketStructure";
import type { Bar } from "@/components/chart/indicators";

function bar(t: number, high: number, low: number): Bar {
  const mid = (high + low) / 2;
  return { time: t, open: mid, high, low, close: mid, volume: 100 };
}

/** Flat filler that can never itself be a pivot against a taller neighbour. */
function flat(from: number, count: number, high = 100, low = 90): Bar[] {
  return Array.from({ length: count }, (_, i) => bar(from + i, high, low));
}

/**
 * Builds a window with pivots at KNOWN prices by planting spikes inside flat
 * filler. `lookback` bars of filler sit either side of every spike so the
 * detector can confirm it.
 */
function withPivots(
  spikes: readonly { high?: number; low?: number }[],
  lookback = STRUCTURE_DEFAULT_LOOKBACK,
): Bar[] {
  const bars: Bar[] = [];
  let t = 0;
  const push = (b: Bar[]) => { b.forEach(x => bars.push(x)); t += b.length; };
  push(flat(t, lookback));
  for (const s of spikes) {
    push([bar(t, s.high ?? 100, s.low ?? 90)]);
    push(flat(t, lookback));
  }
  return bars;
}

describe("selectMarketStructure — THE CONFIRMATION LAG IS PERMANENT", () => {
  it("reports unconfirmed bars even on a long, healthy, fully measured window", () => {
    const vm = selectMarketStructure(
      withPivots([{ high: 120 }, { low: 70 }, { high: 130 }, { low: 80 }]),
    );
    expect(vm.measured).toBe(true);
    // Not a shortage. More bars would not reduce this.
    expect(vm.unconfirmedBars).toBe(STRUCTURE_DEFAULT_LOOKBACK);
    expect(vm.confirmationLagNote).toMatch(/both sides/i);
    expect(vm.confirmationLagNote).toContain("unconfirmed");
  });

  it("states the lag in the lookback it actually used, not the default", () => {
    const vm = selectMarketStructure(withPivots([{ high: 120 }], 3), { lookback: 3 });
    expect(vm.lookback).toBe(3);
    expect(vm.confirmationLagNote).toContain("3 bars");
  });
});

describe("selectMarketStructure — refusals", () => {
  it("refuses on no bars at all, and says how many it would need", () => {
    const vm = selectMarketStructure([]);
    expect(vm.measured).toBe(false);
    expect(vm.bias).toBe("UNCLEAR");
    expect(vm.insufficientNote).toMatch(/Only 0 bars are loaded/);
    expect(vm.insufficientNote).toContain(String(STRUCTURE_DEFAULT_LOOKBACK * 2 + 1));
  });

  it("refuses on null/undefined without throwing", () => {
    expect(selectMarketStructure(null).measured).toBe(false);
    expect(selectMarketStructure(undefined).measured).toBe(false);
  });

  it("refuses below the pivot minimum but STILL PUBLISHES the pivots that confirmed", () => {
    // One high, one low — a level each, but no sequence.
    const vm = selectMarketStructure(withPivots([{ high: 120 }, { low: 70 }]));
    expect(vm.measured).toBe(false);
    expect(vm.insufficientNote).toContain(String(STRUCTURE_MIN_PIVOTS_PER_SIDE));
    // Withholding real pivots would be a second refusal the detector never made.
    expect(vm.swingHighs.length).toBe(1);
    expect(vm.swingLows.length).toBe(1);
    expect(vm.lastSwingHigh!.price).toBe(120);
    expect(vm.lastSwingLow!.price).toBe(70);
  });
});

describe("selectMarketStructure — the sequence", () => {
  it("HIGHER_HIGHS when both the last two highs and the last two lows rose", () => {
    const vm = selectMarketStructure(
      withPivots([{ high: 110 }, { low: 70 }, { high: 130 }, { low: 80 }]),
    );
    expect(vm.bias).toBe("HIGHER_HIGHS");
    expect(vm.biasNote).toMatch(/paying up/);
  });

  it("LOWER_LOWS when both the last two highs and the last two lows fell", () => {
    const vm = selectMarketStructure(
      withPivots([{ high: 130 }, { low: 80 }, { high: 110 }, { low: 70 }]),
    );
    expect(vm.bias).toBe("LOWER_LOWS");
    expect(vm.biasNote).toMatch(/accepting less/);
  });

  it("RANGE when the highs and the lows disagree about direction", () => {
    // Highs rise, lows fall — expansion, which is rotation and not a trend.
    const vm = selectMarketStructure(
      withPivots([{ high: 110 }, { low: 80 }, { high: 130 }, { low: 70 }]),
    );
    expect(vm.bias).toBe("RANGE");
    expect(vm.biasNote).toMatch(/rotation, not trend/);
  });

  it("reads only the LAST two of each side, so an old pivot cannot outvote a new one", () => {
    // An early towering high must not make the recent rise read as LOWER_LOWS.
    const vm = selectMarketStructure(
      withPivots([
        { high: 200 }, { low: 60 },
        { high: 110 }, { low: 70 },
        { high: 130 }, { low: 80 },
      ]),
    );
    expect(vm.swingHighs.length).toBeGreaterThanOrEqual(3);
    expect(vm.bias).toBe("HIGHER_HIGHS");
  });

  it("names the last confirmed pivot on each side", () => {
    const vm = selectMarketStructure(
      withPivots([{ high: 110 }, { low: 70 }, { high: 130 }, { low: 80 }]),
    );
    expect(vm.lastSwingHigh!.price).toBe(130);
    expect(vm.lastSwingLow!.price).toBe(80);
    expect(vm.insufficientNote).toBeNull();
  });
});
