import { describe, expect, it } from "vitest";
import { barSlotAt } from "./barSlotAt";

const T = [100, 160, 220, 280];
describe("barSlotAt", () => {
  it("an exact bar time is its own slot", () => { expect(barSlotAt(T, 160)).toBe(160); });
  it("a moment inside a bar belongs to the bar that opened before it", () => {
    expect(barSlotAt(T, 199)).toBe(160);
    expect(barSlotAt(T, 9999)).toBe(280);
  });
  it("before the first bar there is no slot", () => { expect(barSlotAt(T, 99)).toBeNull(); });
  it("milliseconds are read as seconds", () => { expect(barSlotAt(T, 1_700_000_000_000)).toBe(280); });
  it("no bars, no slot", () => { expect(barSlotAt([], 5)).toBeNull(); expect(barSlotAt(T, NaN)).toBeNull(); });
});
