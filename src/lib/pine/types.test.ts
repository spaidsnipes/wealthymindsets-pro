/**
 * Pine Script types — truth-lock for the PineSeries runtime class.
 *
 * The rest of this file is TypeScript-only types (compile-time). Only
 * PineSeries carries executable behavior. `series.get(i)` uses the
 * Pine convention (0 = latest bar, N = N bars ago) which is the OPPOSITE
 * of a naive array index — a common bug source when consumers refactor
 * to native arrays. This test locks the direction + the null fallback.
 */

import { describe, it, expect } from "vitest";
import { PineSeries } from "./types";

describe("PineSeries constructor + length", () => {
  it("default constructor produces an empty series", () => {
    const s = new PineSeries();
    expect(s.length).toBe(0);
    expect(s.values).toEqual([]);
  });

  it("constructor accepts an initial values array", () => {
    const s = new PineSeries([1, 2, 3]);
    expect(s.length).toBe(3);
    expect(s.values).toEqual([1, 2, 3]);
  });

  it("accepts nulls in the values array (na bars)", () => {
    const s = new PineSeries([1, null, 3]);
    expect(s.length).toBe(3);
    expect(s.values[1]).toBeNull();
  });
});

describe("PineSeries.get — Pine convention (0 = latest, N = N bars ago)", () => {
  it("get(0) returns the LAST pushed value (latest bar)", () => {
    const s = new PineSeries([10, 20, 30]);
    expect(s.get(0)).toBe(30);
    expect(s.get()).toBe(30); // default i = 0
  });

  it("get(1) returns the previous bar", () => {
    const s = new PineSeries([10, 20, 30]);
    expect(s.get(1)).toBe(20);
  });

  it("get(N-1) returns the FIRST bar (oldest)", () => {
    const s = new PineSeries([10, 20, 30]);
    expect(s.get(2)).toBe(10);
  });

  it("get(i) beyond series length returns null (na, not undefined)", () => {
    const s = new PineSeries([10, 20]);
    expect(s.get(2)).toBeNull();
    expect(s.get(999)).toBeNull();
  });

  it("get(negative) reaches BEYOND latest — returns null (would be a future bar)", () => {
    // values.length - 1 - (-1) = length → out of bounds → null
    const s = new PineSeries([10, 20, 30]);
    expect(s.get(-1)).toBeNull();
  });

  it("get on an empty series returns null (never throws)", () => {
    const s = new PineSeries();
    expect(s.get(0)).toBeNull();
    expect(s.get(5)).toBeNull();
  });

  it("get returns null when the underlying value is null (na bar)", () => {
    const s = new PineSeries([10, null, 30]);
    // get(1) → values[1] which is null
    expect(s.get(1)).toBeNull();
  });
});

describe("PineSeries.push — append to latest end", () => {
  it("push extends length by 1 and becomes get(0)", () => {
    const s = new PineSeries([1, 2]);
    s.push(3);
    expect(s.length).toBe(3);
    expect(s.get(0)).toBe(3);
    expect(s.get(1)).toBe(2);
    expect(s.get(2)).toBe(1);
  });

  it("push accepts null (na bar)", () => {
    const s = new PineSeries([1, 2]);
    s.push(null);
    expect(s.length).toBe(3);
    expect(s.get(0)).toBeNull();
    expect(s.get(1)).toBe(2);
  });

  it("push preserves chronological order (older values stay accessible via higher i)", () => {
    const s = new PineSeries();
    s.push(1);
    s.push(2);
    s.push(3);
    s.push(4);
    expect(s.get(0)).toBe(4);
    expect(s.get(3)).toBe(1);
  });
});

describe("PineSeries — length property is dynamic", () => {
  it("length reflects mutation via push", () => {
    const s = new PineSeries();
    expect(s.length).toBe(0);
    s.push(1);
    expect(s.length).toBe(1);
    s.push(null);
    expect(s.length).toBe(2);
  });
});
