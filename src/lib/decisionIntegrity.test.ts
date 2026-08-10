import { describe, expect, it } from "vitest";
import { evaluateClcEvidence } from "./decisionIntegrity";

describe("CLC decision integrity", () => {
  it("blocks an entry evaluation when location is unresolved", () => {
    expect(evaluateClcEvidence({ context: true, location: false, confirmation: true })).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      label: "INSUFFICIENT EVIDENCE",
      missing: ["location"],
    });
  });

  it("does not let tape confirmation replace context", () => {
    expect(evaluateClcEvidence({ context: false, location: true, confirmation: true }).status)
      .toBe("INSUFFICIENT_EVIDENCE");
  });

  it("advances only complete evidence to risk review, never directly to entry", () => {
    expect(evaluateClcEvidence({ context: true, location: true, confirmation: true })).toEqual({
      status: "READY_FOR_RISK_REVIEW",
      label: "EVIDENCE COMPLETE",
      missing: [],
    });
  });
});
