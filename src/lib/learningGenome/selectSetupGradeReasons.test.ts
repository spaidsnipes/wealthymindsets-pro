import { describe, it, expect } from "vitest";

import { selectSetupGradeReasons } from "./selectSetupGradeReasons";

describe("selectSetupGradeReasons — canon WHY-layer", () => {
  it("M0 gets the canon-cited NO_TRADE reason and nothing else", () => {
    const r = selectSetupGradeReasons({ dayModel: "M0", plannedR: 5, processQuality: "FOLLOWED_PLAN" });
    expect(r.grade).toBe("NO_TRADE");
    expect(r.reasons).toHaveLength(1);
    expect(r.reasons[0]!.canon).toBe("§Model 0");
    expect(r.reasons[0]!.severity).toBe("FAIL");
  });

  it("BROKE_RULES contributes a FAIL reason", () => {
    const r = selectSetupGradeReasons({ dayModel: "M1", plannedR: 5, processQuality: "BROKE_RULES" });
    const messages = r.reasons.map((x) => x.message).join(" | ");
    expect(messages).toContain("BROKE_RULES");
    expect(r.reasons.some((x) => x.severity === "FAIL")).toBe(true);
  });

  it("M1 4R+ FOLLOWED_PLAN → single PASS reason (A+)", () => {
    const r = selectSetupGradeReasons({ dayModel: "M1", plannedR: 4, processQuality: "FOLLOWED_PLAN" });
    expect(r.grade).toBe("A_PLUS");
    expect(r.reasons.some((x) => x.severity === "PASS" && x.canon.includes("§Model 1"))).toBe(true);
  });

  it("M1 3R FOLLOWED_PLAN → A (message notes below-A+)", () => {
    const r = selectSetupGradeReasons({ dayModel: "M1", plannedR: 3, processQuality: "FOLLOWED_PLAN" });
    expect(r.grade).toBe("A");
    expect(r.reasons.some((x) => x.message.includes("A threshold met"))).toBe(true);
  });

  it("M1 2R FOLLOWED_PLAN → FAIL reason (below 3R minimum)", () => {
    const r = selectSetupGradeReasons({ dayModel: "M1", plannedR: 2, processQuality: "FOLLOWED_PLAN" });
    expect(r.grade).toBe("B");
    expect(r.reasons.some((x) => x.severity === "FAIL" && x.message.includes("< 3R"))).toBe(true);
  });

  it("Missing plannedR gets its own WARN reason", () => {
    const r = selectSetupGradeReasons({ dayModel: "M1", processQuality: "FOLLOWED_PLAN" });
    expect(r.reasons.some((x) => x.message.includes("Planned R multiple missing"))).toBe(true);
  });

  it("Missing dayModel gets its own WARN reason (when not NO_TRADE)", () => {
    const r = selectSetupGradeReasons({ plannedR: 5, processQuality: "FOLLOWED_PLAN" });
    expect(r.reasons.some((x) => x.message.includes("Day model not classified"))).toBe(true);
  });

  it("M2 2R+ FOLLOWED_PLAN → A+ PASS reason", () => {
    const r = selectSetupGradeReasons({ dayModel: "M2", plannedR: 2, processQuality: "FOLLOWED_PLAN" });
    expect(r.grade).toBe("A_PLUS");
    expect(r.reasons.some((x) => x.canon.includes("§Model 2"))).toBe(true);
  });

  it("Every reason has a canon anchor and severity", () => {
    const r = selectSetupGradeReasons({ dayModel: "M1", plannedR: 4, processQuality: "FOLLOWED_PLAN" });
    for (const reason of r.reasons) {
      expect(typeof reason.canon).toBe("string");
      expect(reason.canon.length).toBeGreaterThan(0);
      expect(["PASS", "WARN", "FAIL"]).toContain(reason.severity);
    }
  });
});
