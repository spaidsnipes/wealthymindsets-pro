import { describe, expect, it } from "vitest";
import { tapeHorizonBarStart } from "./tapeHorizon";

describe("Tape Horizon coordinate ownership", () => {
  it("maps a non-boundary trade to its containing five-minute candle", () => {
    const candleStart = 1_786_335_000;
    expect(tapeHorizonBarStart(candleStart + 143, 300)).toBe(candleStart);
  });

  it("keeps an exact candle boundary unchanged", () => {
    expect(tapeHorizonBarStart(1_786_335_000, 300)).toBe(1_786_335_000);
  });

  it("uses the active interval instead of silently assuming one minute", () => {
    const timestamp = 1_786_335_743;
    expect(tapeHorizonBarStart(timestamp, 60)).toBe(1_786_335_720);
    expect(tapeHorizonBarStart(timestamp, 900)).toBe(1_786_335_300);
  });

  it("fails closed on invalid timestamps and intervals", () => {
    expect(() => tapeHorizonBarStart(Number.NaN, 300)).toThrow(/timestamp/);
    expect(() => tapeHorizonBarStart(100, 0)).toThrow(/interval/);
  });
});
