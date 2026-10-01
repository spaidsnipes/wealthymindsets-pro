import { describe, expect, it } from "vitest";

import { decimals } from "./TradePanel";

describe("Trade ticket prices print at the contract's own tick", () => {
  it("0.25 → 2 places (MNQ 30609.75, never 30609.8)", () => {
    expect(decimals(0.25)).toBe(2);
    expect((30609.75).toFixed(decimals(0.25))).toBe("30609.75");
    expect(decimals(0.01)).toBe(2);
    expect(decimals(0.5)).toBe(1);
    expect(decimals(1)).toBe(0);
    expect(decimals(0.0001)).toBe(4);
    expect(decimals(null)).toBe(2);
  });
});
