import { describe, it, expect } from "vitest";
import { acceptOrderSubmit, ORDER_SUBMIT_MIN_GAP_MS } from "./orderSubmitGuard";

describe("acceptOrderSubmit — double-submit guard (found via live paper QA)", () => {
  it("accepts the first submit (no prior)", () => {
    expect(acceptOrderSubmit(0, 1_000)).toBe(true);
  });

  it("REJECTS a second submit within the min gap (the double-click case)", () => {
    // double-click ~120ms apart → the second is swallowed → one order, not two
    expect(acceptOrderSubmit(1_000, 1_120)).toBe(false);
    expect(acceptOrderSubmit(1_000, 1_000 + ORDER_SUBMIT_MIN_GAP_MS - 1)).toBe(false);
  });

  it("accepts a deliberate second submit at/after the min gap", () => {
    expect(acceptOrderSubmit(1_000, 1_000 + ORDER_SUBMIT_MIN_GAP_MS)).toBe(true);
    expect(acceptOrderSubmit(1_000, 2_000)).toBe(true);
  });

  it("honors a custom gap", () => {
    expect(acceptOrderSubmit(1_000, 1_500, 1_000)).toBe(false);
    expect(acceptOrderSubmit(1_000, 2_100, 1_000)).toBe(true);
  });

  it("rejects a non-positive now (defensive)", () => {
    expect(acceptOrderSubmit(0, 0)).toBe(false);
  });

  it("a rapid triple-click collapses to a single accepted order", () => {
    let last = 0;
    const clicks = [1_000, 1_090, 1_180]; // 3 clicks, all within one 400ms window of the first accept
    const accepted = clicks.filter((t) => {
      if (acceptOrderSubmit(last, t)) { last = t; return true; }
      return false;
    });
    expect(accepted).toEqual([1_000]); // only the first placed an order
  });
});
