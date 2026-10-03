import { describe, expect, it } from "vitest";
import { readLadderLevels, type FlowLadderBar } from "./flowLadder";

const row = (entries: [number, number, number][]): FlowLadderBar =>
  new Map(entries.map(([p, bid, ask]) => [p, { bid, ask }]));

describe("readLadderLevels — plate 75 local footprint", () => {
  it("lists levels high → low with delta and the one POC lit", () => {
    const r = readLadderLevels(row([[100, 5, 2], [101, 10, 40], [99, 0, 3]]))!;
    expect(r.levels.map(l => l.price)).toEqual([101, 100, 99]);
    expect(r.levels.map(l => l.delta)).toEqual([30, -3, 3]);
    expect(r.levels.filter(l => l.poc).map(l => l.price)).toEqual([101]);
    expect(r.hidden).toBe(0);
  });
  it("keeps the window nearest the POC and counts what it hid", () => {
    const entries: [number, number, number][] = Array.from({ length: 20 }, (_, i) => [i, 1, 1]);
    entries[3] = [3, 50, 50];
    const r = readLadderLevels(row(entries), 5)!;
    expect(r.levels).toHaveLength(5);
    expect(r.levels.some(l => l.poc && l.price === 3)).toBe(true);
    expect(r.hidden).toBe(15);
  });
  it("is null for an empty or volume-less row", () => {
    expect(readLadderLevels(null)).toBeNull();
    expect(readLadderLevels(row([[1, 0, 0]]))).toBeNull();
  });
});
