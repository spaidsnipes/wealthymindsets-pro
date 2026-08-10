import { describe, expect, it } from "vitest";
import { classifyProcessOutcome } from "./journalProcess";

describe("Journal process versus outcome", () => {
  it.each([
    ["FOLLOWED_PLAN", 100, "EARNED_WIN"],
    ["FOLLOWED_PLAN", -100, "PROFESSIONAL_LOSS"],
    ["BROKE_RULES", 100, "DANGEROUS_WIN"],
    ["BROKE_RULES", -100, "PREVENTABLE_LOSS"],
  ] as const)("classifies %s with P&L %s as %s", (quality, pnl, expected) => {
    expect(classifyProcessOutcome(quality, pnl)).toBe(expected);
  });

  it("does not infer process quality from flat, invalid, or unresolved outcomes", () => {
    expect(classifyProcessOutcome("FOLLOWED_PLAN", 0)).toBe("UNRESOLVED");
    expect(classifyProcessOutcome("FOLLOWED_PLAN", Number.NaN)).toBe("UNRESOLVED");
    expect(classifyProcessOutcome("UNRESOLVED", 1_000)).toBe("UNRESOLVED");
  });
});
