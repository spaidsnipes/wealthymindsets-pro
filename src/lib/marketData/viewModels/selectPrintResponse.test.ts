import { describe, expect, it } from "vitest";
import selectPrintResponse, { RESPONSE_BARS } from "./selectPrintResponse";

const bar = (i: number, low: number, high: number) => ({ time: i * 60, low, high, close: (low + high) / 2 });
const flat = Array.from({ length: 10 }, (_, i) => bar(i, 100, 101)); // median range 1

describe("force → response on the same print", () => {
  it("a buy print followed by price moving ≥ 1 median range up reads FOLLOWED", () => {
    const bars = [...flat, bar(10, 101, 102), bar(11, 101.5, 102.8), bar(12, 102, 103)];
    const v = selectPrintResponse({ timeSec: 9 * 60 + 30, price: 101, side: "buy" }, bars);
    expect(v.verdict).toBe("FOLLOWED");
    expect(v.withForce).toBe(2);
    expect(v.againstForce).toBe(0);
    expect(v.responseBars).toBe(RESPONSE_BARS);
    // The RESPONSE arrow lands on the last response bar's own close.
    expect(v.endClose).toBe(102.5);
  });
  it("a buy print that price leaves downward reads FADED", () => {
    const bars = [...flat, bar(10, 99.5, 100.8), bar(11, 99, 100), bar(12, 98.6, 99.5)];
    const v = selectPrintResponse({ timeSec: 9 * 60, price: 100.8, side: "buy" }, bars);
    expect(v.verdict).toBe("FADED");
    expect(v.againstForce).toBeCloseTo(2.2, 6);
  });
  it("a sell print measures WITH the force downward", () => {
    const bars = [...flat, bar(10, 99, 100.5), bar(11, 98.5, 99.5), bar(12, 98, 99)];
    const v = selectPrintResponse({ timeSec: 9 * 60, price: 100.5, side: "sell" }, bars);
    expect(v.dir).toBe(-1);
    expect(v.verdict).toBe("FOLLOWED");
    expect(v.withForce).toBeCloseTo(2.5, 6);
  });
  it("little movement either way reads MUTED", () => {
    const bars = [...flat, bar(10, 100.2, 100.8), bar(11, 100.3, 100.9), bar(12, 100.1, 100.7)];
    expect(selectPrintResponse({ timeSec: 9 * 60, price: 100.5, side: "buy" }, bars).verdict).toBe("MUTED");
  });
  it("before three bars exist the verdict is PENDING — never a forecast — but what printed is reported", () => {
    const bars = [...flat, bar(10, 101, 103)];
    const v = selectPrintResponse({ timeSec: 9 * 60, price: 101, side: "buy" }, bars);
    expect(v.verdict).toBe("PENDING");
    expect(v.responseBars).toBe(1);
    expect(v.withForce).toBe(2);
  });
  it("a print before the first bar is refused", () => {
    expect(selectPrintResponse({ timeSec: -5, price: 100, side: "buy" }, flat).reason).toBe("PRINT_OUTSIDE_BARS");
  });
});
