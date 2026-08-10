import { describe, expect, it } from "vitest";
import { classifyFinancialOutcome } from "./journalOutcome";

describe("financial journal outcome", () => {
  it("does not invent a win for unresolved or zero P&L", () => {
    expect(classifyFinancialOutcome(0)).toBe("be");
    expect(classifyFinancialOutcome(Number.NaN)).toBe("be");
  });

  it("uses direction of actual P&L without arbitrary dollar thresholds", () => {
    expect(classifyFinancialOutcome(0.01)).toBe("win");
    expect(classifyFinancialOutcome(-0.01)).toBe("loss");
  });
});
