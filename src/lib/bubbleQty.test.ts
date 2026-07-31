import { describe, it, expect } from "vitest";
import { validateBubbleQtyInput, isCustomActive, BUBBLE_MIN, BUBBLE_MAX } from "./bubbleQty";

describe("validateBubbleQtyInput — WM-CHART-P0-05b honest reject rule", () => {
  it("empty draft is empty, not an error", () => {
    expect(validateBubbleQtyInput("", 0).kind).toBe("empty");
    expect(validateBubbleQtyInput("   ", 0).kind).toBe("empty");
  });

  it("integer within range is valid", () => {
    const r = validateBubbleQtyInput("300", 0);
    expect(r.kind).toBe("valid");
    if (r.kind === "valid") {
      expect(r.value).toBe(300);
      expect(r.isCustom).toBe(true);
      expect(r.matchesCurrent).toBe(false);
    }
  });

  it("preset value is valid but flagged not custom", () => {
    const r = validateBubbleQtyInput("150", 0);
    expect(r.kind).toBe("valid");
    if (r.kind === "valid") expect(r.isCustom).toBe(false);
  });

  it("non-integer is rejected (not clamped)", () => {
    for (const bad of ["3.5", "1e2", "0.1", "abc", "3.0.0"]) {
      const r = validateBubbleQtyInput(bad, 0);
      expect(r.kind).toBe("invalid");
    }
  });

  it("out-of-range is rejected with the specific reason (never silently clamped)", () => {
    const low = validateBubbleQtyInput("0", 0);
    expect(low.kind).toBe("invalid");
    if (low.kind === "invalid") expect(low.reason).toBe("out-of-range");

    const high = validateBubbleQtyInput("5001", 0);
    expect(high.kind).toBe("invalid");
    if (high.kind === "invalid") expect(high.reason).toBe("out-of-range");

    const neg = validateBubbleQtyInput("-1", 0);
    expect(neg.kind).toBe("invalid");
  });

  it("boundary values are accepted", () => {
    expect(validateBubbleQtyInput(String(BUBBLE_MIN), 0).kind).toBe("valid");
    expect(validateBubbleQtyInput(String(BUBBLE_MAX), 0).kind).toBe("valid");
  });

  it("matchesCurrent flags whether SET would be a no-op", () => {
    const r = validateBubbleQtyInput("300", 300);
    expect(r.kind).toBe("valid");
    if (r.kind === "valid") expect(r.matchesCurrent).toBe(true);
  });
});

describe("isCustomActive — preset detection", () => {
  it("0 (All) is not custom", () => { expect(isCustomActive(0)).toBe(false); });
  it("presets 25/50/75/100/150/200 are not custom", () => {
    for (const p of [25, 50, 75, 100, 150, 200]) expect(isCustomActive(p)).toBe(false);
  });
  it("300 is custom", () => { expect(isCustomActive(300)).toBe(true); });
  it("1 (min) is custom", () => { expect(isCustomActive(1)).toBe(true); });
  it("5000 (max) is custom", () => { expect(isCustomActive(5000)).toBe(true); });
});
