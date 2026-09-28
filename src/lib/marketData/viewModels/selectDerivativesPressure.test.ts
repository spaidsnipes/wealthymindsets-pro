import { describe, expect, it } from "vitest";
import type { CboeOptionRow, CboeOptionsReceipt } from "@/lib/marketData/cboeDelayedOptions";
import { bsGamma, selectDerivativesPressure, wallLife } from "./selectDerivativesPressure";

const NOW = Date.parse("2026-09-27T07:00:00Z");
const receipt = (rows: CboeOptionRow[], spot = 100): CboeOptionsReceipt => ({
  source: "CBOE_DELAYED", underlying: "XYZ", spot, iv30: 40, chainAsOf: "2026-09-27 00:57:30", underlyingAsOf: "2026-09-25T15:59:59", rows, dropped: 0,
});
const row = (type: "call" | "put", strike: number, oi: number, exp = "2026-10-16"): CboeOptionRow =>
  ({ contract: `XYZ${type}${strike}`, type, expiration: exp, strike, openInterest: oi, gamma: null, iv: 0.4, volume: null });
const ladder = (fn: (k: number) => CboeOptionRow[]) => Array.from({ length: 41 }, (_, i) => 80 + i).flatMap(fn);
const bar = (time: number, o: number, h: number, l: number, c: number) => ({ time, open: o, high: h, low: l, close: c });

describe("bsGamma", () => {
  it("peaks at the money and is zero for degenerate input", () => {
    expect(bsGamma(100, 100, 0.4, 0.1)).toBeGreaterThan(bsGamma(100, 130, 0.4, 0.1));
    expect(bsGamma(100, 100, 0, 0.1)).toBe(0);
    expect(bsGamma(NaN, 100, 0.4, 0.1)).toBe(0);
  });
});

describe("climate is read from the SIGN of dealer exposure, never as direction", () => {
  it("call-heavy positioning → DAMPING; put-heavy → AMPLIFYING", () => {
    const calls = selectDerivativesPressure(receipt(ladder(k => [row("call", k, 1000), row("put", k, 100)])), [], NOW);
    const puts = selectDerivativesPressure(receipt(ladder(k => [row("call", k, 100), row("put", k, 1000)])), [], NOW);
    expect(calls.drawn && calls.climate).toBe("DAMPING");
    expect(puts.drawn && puts.climate).toBe("AMPLIFYING");
  });
  it("a zero-gamma front sits where the geography changes sign", () => {
    // Puts below 100, calls above: amplifying below, damping above.
    const vm = selectDerivativesPressure(receipt(ladder(k => (k < 100 ? [row("put", k, 1500)] : [row("call", k, 1500)]))), [], NOW);
    expect(vm.drawn).toBe(true);
    if (vm.drawn) {
      expect(vm.zeroGamma).not.toBeNull();
      expect(Math.abs(vm.zeroGamma! - 100)).toBeLessThan(4);
      expect(vm.epistemic.exposure).toBe("INFERRED");
      expect(vm.fidelity).toBe("DELAYED");
      expect(vm.clocks.oiAsOf).toBe("PRIOR_SESSION");
    }
  });
  it("a concentrated call strike becomes a wall", () => {
    const vm = selectDerivativesPressure(receipt(ladder(k => [row("call", k, k === 105 ? 30000 : 300), row("put", k, 300)])), [], NOW);
    expect(vm.drawn && vm.walls.map(w => w.strike)).toContain(105);
  });
});

describe("honest silences", () => {
  it("no chain / too few contracts / no spot are named, never drawn", () => {
    expect(selectDerivativesPressure(null, [], NOW)).toMatchObject({ drawn: false, reason: "NO_CHAIN" });
    expect(selectDerivativesPressure(receipt([row("call", 100, 10)]), [], NOW)).toMatchObject({ drawn: false, reason: "TOO_FEW_CONTRACTS" });
    expect(selectDerivativesPressure({ ...receipt([]), spot: null }, [], NOW)).toMatchObject({ drawn: false, reason: "NO_SPOT" });
  });
});

describe("wall lifecycle is OBSERVED from the chart's own bars, per session", () => {
  const DAY = 86_400, T0 = 1_789_000_000 - (1_789_000_000 % DAY) + 14 * 3600; // 14:00 UTC
  const day = (i: number, o: number, h: number, l: number, c: number) => bar(T0 + i * DAY, o, h, l, c);
  it("no touch → BORN; each rejected session is a test; enough tests → DEFENDED / WEAKENING", () => {
    expect(wallLife(110, [day(0, 100, 101, 99, 100), day(1, 100, 102, 99, 101)], 101).life).toBe("BORN");
    const tests = (n: number) => [day(0, 100, 101, 99, 100), ...Array.from({ length: n }, (_, i) => day(i + 1, 105, 110.5, 104, 106))];
    expect(wallLife(110, tests(1), 106)).toMatchObject({ life: "TESTED", tests: 1 });
    expect(wallLife(110, tests(2), 106).life).toBe("DEFENDED");
    expect(wallLife(110, tests(5), 106).life).toBe("WEAKENING");
  });
  it("closes beyond the wall are acceptance: BREAKING, then BROKEN", () => {
    const up = [day(0, 100, 101, 99, 100), day(1, 108, 111, 107, 111), day(2, 111, 112, 110.5, 112)];
    expect(wallLife(110, up.slice(0, 2), 111).life).toBe("BREAKING");
    expect(wallLife(110, up, 112).life).toBe("BROKEN");
  });
  it("the same week reads the same on 5m and on 1D (timeframe-invariant)", () => {
    const daily = [day(0, 100, 101, 99, 100), day(1, 105, 110.5, 104, 106), day(2, 106, 110.2, 105, 107)];
    const intraday = daily.flatMap(d => [
      bar(d.time, d.open, d.open + 0.1, d.open - 0.1, d.open),
      bar(d.time + 300, d.open, d.high, d.low, (d.open + d.close) / 2),
      bar(d.time + 600, (d.open + d.close) / 2, d.high - 0.3, d.low + 0.1, d.close),
    ]);
    expect(wallLife(110, intraday, 107)).toMatchObject({ life: wallLife(110, daily, 107).life, tests: wallLife(110, daily, 107).tests });
  });
});

describe("a wall says how much history its tests were counted over", () => {
  it("hours on a short chart, nothing once the window is covered", async () => {
    const { wallTestSpanWords, WALL_TEST_WINDOW_DAYS } = await import("./selectDerivativesPressure");
    expect(wallTestSpanWords(6 * 3600)).toBe("6h seen");
    expect(wallTestSpanWords(3.2 * 86_400)).toBe("3.2d seen");
    expect(wallTestSpanWords(WALL_TEST_WINDOW_DAYS * 86_400)).toBeNull();
  });
});
