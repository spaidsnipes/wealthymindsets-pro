import { describe, expect, it } from "vitest";

import selectZoneLifecycle, { type ZoneInput } from "./selectZoneLifecycle";

const bar = (time: number, low: number, high: number, close?: number) => ({
  time, open: (low + high) / 2, high, low, close: close ?? (low + high) / 2, volume: 100,
});
const demand: ZoneInput = { side: "DEMAND", low: 100, high: 101, birthTime: 0 };

describe("state is what happened after birth", () => {
  it("untouched → ALIVE", () => {
    const v = selectZoneLifecycle(demand, [bar(0, 100, 101), bar(60, 103, 104), bar(120, 104, 105)]);
    expect(v.state).toBe("ALIVE");
    expect(v.touches).toEqual([]);
    expect(v.barsSinceBirth).toBe(2);
  });

  it("entered and left upward → one REJECTED touch → DEFENDED", () => {
    const v = selectZoneLifecycle(demand, [
      bar(0, 100, 101), bar(60, 102, 103), bar(120, 100.5, 102), bar(180, 101.2, 102.5),
    ]);
    expect(v.touches).toHaveLength(1);
    expect(v.touches[0]).toMatchObject({ start: 120, end: 120, response: "REJECTED", swept: false });
    expect(v.state).toBe("DEFENDED");
  });

  it("consecutive bars inside are ONE touch episode", () => {
    const v = selectZoneLifecycle(demand, [
      bar(0, 100, 101), bar(60, 100.5, 101.5), bar(120, 100.2, 100.8), bar(180, 101.5, 102),
    ]);
    expect(v.touches).toHaveLength(1);
    expect(v.touches[0].bars).toBe(2);
  });

  it("a close beyond the far edge → INVALIDATED touch, INVALID state, lifecycle stops", () => {
    const v = selectZoneLifecycle(demand, [
      bar(0, 100, 101), bar(60, 102, 103), bar(120, 99, 100.8, 99.5), bar(180, 100.2, 102),
    ]);
    expect(v.state).toBe("INVALID");
    expect(v.invalidatedAt).toBe(120);
    expect(v.touches.at(-1)!.response).toBe("INVALIDATED");
    expect(v.touches).toHaveLength(1); // nothing after invalidation is read
  });

  it("wick through the far edge without a close beyond → swept → CONSUMED", () => {
    const v = selectZoneLifecycle(demand, [
      bar(0, 100, 101), bar(60, 102, 103), bar(120, 99.5, 101.5, 100.8), bar(180, 101.5, 102.5),
    ]);
    expect(v.touches[0].swept).toBe(true);
    expect(v.state).toBe("CONSUMED");
  });

  it("still inside at the newest bar → OPEN touch → TESTED", () => {
    const v = selectZoneLifecycle(demand, [bar(0, 100, 101), bar(60, 102, 103), bar(120, 100.4, 101.4)]);
    expect(v.touches[0].response).toBe("OPEN");
    expect(v.state).toBe("TESTED");
  });

  it("supply mirrors demand", () => {
    const supply: ZoneInput = { side: "SUPPLY", low: 100, high: 101, birthTime: 0 };
    const v = selectZoneLifecycle(supply, [
      bar(0, 100, 101), bar(60, 98, 99), bar(120, 99, 100.5), bar(180, 98, 99.2),
    ]);
    expect(v.state).toBe("DEFENDED");
    expect(v.invalidationPrice).toBe(101);
  });

  it("the birth bar and earlier bars are never read as touches", () => {
    const v = selectZoneLifecycle({ ...demand, birthTime: 120 }, [
      bar(0, 100, 101), bar(60, 100, 101), bar(120, 100, 101), bar(180, 103, 104),
    ]);
    expect(v.touches).toEqual([]);
    expect(v.barsSinceBirth).toBe(1);
  });

  it("carries no probability, half-life or strength field", () => {
    const v = selectZoneLifecycle(demand, [bar(0, 100, 101)]);
    expect(Object.keys(v).some(k => /prob|half|strength|score|confidence/i.test(k))).toBe(false);
  });
});
