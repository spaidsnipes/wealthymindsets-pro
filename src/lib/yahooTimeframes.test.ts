import { describe, expect, it } from "vitest";
import { aggregateYahooBars, resolveYahooTimeframe, type YahooOhlcvBar } from "./yahooTimeframes";

const bar = (time: number, open: number, high: number, low: number, close: number, volume: number): YahooOhlcvBar =>
  ({ time, open, high, low, close, volume });

describe("Yahoo timeframe truth", () => {
  it("reconstructs unsupported intraday intervals from a finer valid base", () => {
    expect(resolveYahooTimeframe("3m")).toMatchObject({ interval: "1m", multiplier: 3, sourceMode: "reconstructed" });
    expect(resolveYahooTimeframe("10m")).toMatchObject({ interval: "5m", multiplier: 2, sourceMode: "reconstructed" });
    expect(resolveYahooTimeframe("2h")).toMatchObject({ interval: "60m", multiplier: 2, sourceMode: "reconstructed" });
    expect(resolveYahooTimeframe("4h")).toMatchObject({ interval: "60m", multiplier: 4, sourceMode: "reconstructed" });
  });

  it("fails closed for an unknown timeframe instead of silently returning daily bars", () => {
    expect(resolveYahooTimeframe("7m")).toBeNull();
    expect(resolveYahooTimeframe("")).toBeNull();
  });

  it("aggregates OHLCV without relabeling a coarser source bar", () => {
    const plan = resolveYahooTimeframe("3m")!;
    const result = aggregateYahooBars([
      bar(0, 10, 12, 9, 11, 100),
      bar(60, 11, 14, 10, 13, 150),
      bar(120, 13, 15, 12, 14, 200),
    ], plan, 10);
    expect(result).toEqual([bar(0, 10, 15, 9, 14, 450)]);
  });

  it("does not aggregate across an intraday data gap", () => {
    const plan = resolveYahooTimeframe("3m")!;
    const result = aggregateYahooBars([
      bar(0, 10, 11, 9, 10, 10),
      bar(60, 10, 12, 10, 11, 20),
      bar(600, 20, 22, 19, 21, 30),
    ], plan, 10);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(bar(0, 10, 12, 9, 11, 30));
    expect(result[1]).toEqual(bar(600, 20, 22, 19, 21, 30));
  });

  it("uses calendar boundaries for yearly reconstruction", () => {
    const plan = resolveYahooTimeframe("1Y")!;
    const jan = Date.UTC(2025, 0, 1) / 1000;
    const dec = Date.UTC(2025, 11, 1) / 1000;
    const nextJan = Date.UTC(2026, 0, 1) / 1000;
    const result = aggregateYahooBars([
      bar(jan, 10, 12, 9, 11, 100),
      bar(dec, 11, 14, 10, 13, 150),
      bar(nextJan, 20, 22, 19, 21, 200),
    ], plan, 10);
    expect(result).toEqual([
      bar(jan, 10, 14, 9, 13, 250),
      bar(nextJan, 20, 22, 19, 21, 200),
    ]);
  });
});
