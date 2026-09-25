import { describe, expect, it } from "vitest";
import { majorPivots, selectFarRegimeEnvelope, type FarPivot } from "./selectFarRegimeEnvelope";
import { selectMarketStructure } from "./selectMarketStructure";

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

/** The envelope as MainChart builds it: bars + the ONE structure owner's reading. */
function envelope(bars: ReturnType<typeof path>, from = 0, to = 1e9) {
  return selectFarRegimeEnvelope({ structure: selectMarketStructure(bars), bars, visibleFrom: from, visibleTo: to });
}

describe("majorPivots — a zigzag over the owner's points", () => {
  const P = (kind: "HIGH" | "LOW", time: number, price: number): FarPivot => ({ kind, time, price });

  it("ignores swings smaller than the threshold", () => {
    const s = majorPivots([P("LOW", 1, 100), P("HIGH", 2, 110), P("LOW", 3, 109), P("HIGH", 4, 111), P("LOW", 5, 100)], 5);
    expect(s.map(p => p.kind)).toEqual(["LOW", "HIGH"]);
    expect(s[1].price).toBe(111);
  });

  it("never publishes the newest running extreme — nothing after it has confirmed it", () => {
    const s = majorPivots([P("LOW", 1, 100), P("HIGH", 2, 120), P("LOW", 3, 105), P("HIGH", 4, 130)], 5);
    expect(s.map(p => p.time)).toEqual([1, 2, 3]);
  });
});

describe("selectFarRegimeEnvelope", () => {
  it("refuses without the structure owner — it has no detector of its own", () => {
    const bars = path([100, 120, 108, 128, 116, 136, 124, 140]);
    const vm = selectFarRegimeEnvelope({ structure: null, bars, visibleFrom: 0, visibleTo: 1e9 });
    expect(vm.drawn).toBe(false);
    expect(vm.reason).toBe("NO_STRUCTURE");
  });

  it("refuses with too few bars or swings", () => {
    expect(envelope([]).reason).toBe("TOO_FEW_PIVOTS");
    expect(envelope(path([100, 120])).reason).toBe("TOO_FEW_PIVOTS");
  });

  it("fits a rising channel through the owner's major pivots", () => {
    const bars = path([100, 120, 108, 128, 116, 136, 124, 140]);
    const vm = envelope(bars);
    expect(vm.drawn).toBe(true);
    expect(vm.lean).toBe("UP");
    expect(vm.named.length).toBeGreaterThan(0);
    // ONE detector: every named pivot is a pivot the Market Structure owner confirmed.
    const owner = selectMarketStructure(bars);
    const ownerKeys = new Set([
      ...owner.swingHighs.map(p => `HIGH:${p.time}:${p.price}`),
      ...owner.swingLows.map(p => `LOW:${p.time}:${p.price}`),
    ]);
    for (const n of vm.named) expect(ownerKeys.has(`${n.kind}:${n.time}:${n.price}`)).toBe(true);
  });

  it("names scale only — the sequence verdict belongs to the structure owner", () => {
    for (const turns of [[100, 120, 108, 128, 116, 136, 124, 140], [140, 120, 132, 112, 124, 104, 116, 96]]) {
      const vm = envelope(path(turns));
      expect(vm.named.length).toBeGreaterThan(0);
      for (const n of vm.named) {
        expect(n.word).toBe(n.kind === "HIGH" ? "MAJOR HIGH" : "MAJOR LOW");
        expect(n.word).not.toMatch(/HIGHER|LOWER|EQUAL/);
      }
    }
  });

  it("calls a falling channel DOWN", () => {
    expect(envelope(path([140, 120, 132, 112, 124, 104, 116, 96])).lean).toBe("DOWN");
  });

  it("only reads bars and pivots inside the visible range", () => {
    const bars = path([100, 120, 108, 128, 116, 136, 124, 144, 132, 152, 140, 160]);
    expect(envelope(bars, 0, bars[5].time).drawn).toBe(false);
    const late = envelope(bars, bars[30].time, 1e9);
    expect(late.named.length).toBeGreaterThan(0);
    for (const n of late.named) expect(n.time).toBeGreaterThanOrEqual(bars[30].time);
  });
});
