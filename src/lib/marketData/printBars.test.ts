/** printBars — FIXTURE prints (hand-written, not market data). */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { barsFromPrints } from "./printBars";

const T0 = 1_760_100_000;
describe("seconds bars from the venue's own prints", () => {
  it("buckets by the interval, first print opens, last closes, sizes sum, duplicate ids once, out-of-order sorted", () => {
    const bars = barsFromPrints([
      { time: (T0 + 3) * 1000, price: 101, size: 0.5, id: "b" },
      { time: (T0 + 1) * 1000, price: 100, size: 1, id: "a" },
      { time: (T0 + 3) * 1000, price: 101, size: 0.5, id: "b" }, // duplicate (reconnect replay)
      { time: T0 * 1000 + 14_999, price: 99, size: 0.25, id: "c" },
      { time: (T0 + 15) * 1000, price: 102, size: 2, id: "d" },
    ], 15);
    expect(bars).toEqual([
      { time: T0, open: 100, high: 101, low: 99, close: 99, volume: 1.75 },
      { time: T0 + 15, open: 102, high: 102, low: 102, close: 102, volume: 2 },
    ]);
  });
  it("refuses a non-positive interval and bad prints", () => {
    expect(barsFromPrints([{ time: T0 * 1000, price: 1, size: 1 }], 0)).toEqual([]);
    expect(barsFromPrints([{ time: NaN, price: 1, size: 1 }, { time: T0 * 1000, price: 0, size: 1 }], 15)).toEqual([]);
  });
  it("MainChart serves Coinbase seconds history from these prints", () => {
    const mc = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(mc.length).toBeGreaterThan(100000);
    expect(mc).toContain('const coinbaseSeconds: CanonicalCandleBatch | null = !skipVendors && exParsed?.exchange === "coinbase" && intervalSec < 60');
    expect(mc).toContain("if (!r.complete && bars.length) bars = bars.slice(1);");
  });
});
