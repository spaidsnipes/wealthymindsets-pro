import { describe, expect, it } from "vitest";
import selectPrintResponse, { RESPONSE_BARS, YARDSTICK_BARS } from "./selectPrintResponse";

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

describe("the yardstick is measured before the print — no lookahead", () => {
  const response = [bar(10, 101, 102), bar(11, 101.5, 102.8), bar(12, 102, 103)];
  const force = { timeSec: 9 * 60 + 30, price: 101, side: "buy" as const };

  it("wide bars after the print do not widen the envelope or mute a real follow-through", () => {
    // A news expansion after the response: twenty 10-point bars. Graded over
    // every loaded bar, the median became 10 and a 2-point follow-through
    // through a 1-point market read MUTED.
    const later = Array.from({ length: 20 }, (_, k) => bar(13 + k, 100, 110));
    const v = selectPrintResponse(force, [...flat, ...response, ...later]);
    expect(v.medianRange).toBe(1);
    expect(v.verdict).toBe("FOLLOWED");
  });

  it("one print gets one grade however much later history is loaded", () => {
    const later = Array.from({ length: 20 }, (_, k) => bar(13 + k, 100, 110));
    const short = selectPrintResponse(force, [...flat, ...response]);
    const long = selectPrintResponse(force, [...flat, ...response, ...later]);
    expect(long.medianRange).toBe(short.medianRange);
    expect(long.verdict).toBe(short.verdict);
  });

  it("the event bar's own range is not part of the yardstick", () => {
    // Bar 9 holds the print; whatever it did after the print is response.
    const bars = [bar(8, 100, 101), bar(9, 95, 105), ...response];
    expect(selectPrintResponse(force, bars).medianRange).toBe(1);
  });

  it("the yardstick is the recent window before the print, not all history", () => {
    const old = Array.from({ length: 200 }, (_, k) => bar(k, 100, 105));
    const recent = Array.from({ length: YARDSTICK_BARS }, (_, k) => bar(200 + k, 100, 101));
    const t = 200 + YARDSTICK_BARS;
    const v = selectPrintResponse({ timeSec: t * 60, price: 101, side: "buy" },
      [...old, ...recent, bar(t, 100, 101), bar(t + 1, 101, 102), bar(t + 2, 101.5, 102.8), bar(t + 3, 102, 103)]);
    expect(v.medianRange).toBe(1);
  });

  it("a print with no ranged bar before it is refused, never called MUTED", () => {
    const v = selectPrintResponse({ timeSec: 30, price: 100.5, side: "buy" }, flat);
    expect(v.drawn).toBe(false);
    expect(v.reason).toBe("NO_PRIOR_RANGE");
  });
});
