import { describe, expect, it } from "vitest";
import { majorSwings, selectFarRegimeEnvelope } from "./selectFarRegimeEnvelope";

/** Bars following a piecewise-linear path through the given turning prices. */
function path(turns: number[], stepsPerLeg = 10) {
  const out: { time: number; high: number; low: number }[] = [];
  let t = 0;
  for (let i = 0; i < turns.length - 1; i++) {
    for (let k = 0; k < stepsPerLeg; k++) {
      const p = turns[i] + ((turns[i + 1] - turns[i]) * k) / stepsPerLeg;
      out.push({ time: (t += 60), high: p + 0.1, low: p - 0.1 });
    }
  }
  return out;
}

describe("majorSwings", () => {
  it("ignores wiggles smaller than the threshold", () => {
    const s = majorSwings(path([100, 110, 109, 111, 100]), 5);
    expect(s.map(p => p.kind)).toEqual(["LOW", "HIGH"]);
    expect(s[1].price).toBeCloseTo(111, 0);
  });
});

describe("selectFarRegimeEnvelope", () => {
  it("refuses with too few bars or swings", () => {
    expect(selectFarRegimeEnvelope([], 0, 1e9).reason).toBe("TOO_FEW_PIVOTS");
    expect(selectFarRegimeEnvelope(path([100, 120]), 0, 1e9).reason).toBe("TOO_FEW_PIVOTS");
  });

  it("fits a rising channel through major swings and names them", () => {
    const vm = selectFarRegimeEnvelope(path([100, 120, 108, 128, 116, 136, 124, 140]), 0, 1e9);
    expect(vm.drawn).toBe(true);
    expect(vm.lean).toBe("UP");
    expect(vm.named.length).toBeGreaterThan(0);
    expect(vm.named.every(n => n.word.startsWith("HIGHER"))).toBe(true);
  });

  it("calls a falling channel DOWN", () => {
    const vm = selectFarRegimeEnvelope(path([140, 120, 132, 112, 124, 104, 116, 96]), 0, 1e9);
    expect(vm.lean).toBe("DOWN");
    expect(vm.named.every(n => n.word.startsWith("LOWER"))).toBe(true);
  });

  it("only reads bars inside the visible range", () => {
    const bars = path([100, 120, 108, 128, 116, 136, 124, 140]);
    expect(selectFarRegimeEnvelope(bars, 0, bars[5].time).drawn).toBe(false);
  });
});
