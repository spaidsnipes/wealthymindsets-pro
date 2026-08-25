import { describe, it, expect } from "vitest";

import {
  selectSetupGrade,
  isLiveCapitalGrade,
  summarizeSetupGrades,
  type SetupGrade,
} from "./selectSetupGrade";

describe("selectSetupGrade — canon §A-Setup-Only Doctrine", () => {
  describe("NO_TRADE grade (highest priority)", () => {
    it("M0 day is always NO_TRADE (canon: no-trade day)", () => {
      // Even a plan-followed trade on M0 is a misread — M0 = no trade.
      expect(
        selectSetupGrade({ dayModel: "M0", plannedR: 5, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("NO_TRADE");
    });

    it("BROKE_RULES is NO_TRADE (canon: authorization failed)", () => {
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: 5, processQuality: "BROKE_RULES" }),
      ).toBe("NO_TRADE");
    });

    it("M0 + BROKE_RULES: M0 wins priority", () => {
      expect(
        selectSetupGrade({ dayModel: "M0", processQuality: "BROKE_RULES" }),
      ).toBe("NO_TRADE");
    });
  });

  describe("B_PLUS grade (missing evidence)", () => {
    it("no plannedR → B_PLUS", () => {
      expect(selectSetupGrade({ dayModel: "M1", processQuality: "FOLLOWED_PLAN" })).toBe(
        "B_PLUS",
      );
    });

    it("UNRESOLVED process → B_PLUS", () => {
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: 4, processQuality: "UNRESOLVED" }),
      ).toBe("B_PLUS");
    });

    it("no dayModel → B_PLUS (no model context)", () => {
      expect(
        selectSetupGrade({ plannedR: 4, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("B_PLUS");
    });

    it("NaN / Infinity plannedR is treated as missing", () => {
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: Number.NaN, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("B_PLUS");
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: Infinity, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("B_PLUS");
    });
  });

  describe("Model 1 (TREND/EXPANSION) grades", () => {
    it("M1 + plannedR >= 4 + FOLLOWED_PLAN → A_PLUS (canon: 4R+ preferred)", () => {
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: 4, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("A_PLUS");
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: 6.5, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("A_PLUS");
    });

    it("M1 + plannedR 3-3.99 → A (canon: 3R minimum for M1)", () => {
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: 3, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("A");
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: 3.9, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("A");
    });

    it("M1 + plannedR < 3 → B (below M1 minimum runway)", () => {
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: 2, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("B");
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: 0, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("B");
    });
  });

  describe("Model 2 (CHOP/ROTATION) grades", () => {
    it("M2 + plannedR >= 2 + FOLLOWED_PLAN → A_PLUS", () => {
      expect(
        selectSetupGrade({ dayModel: "M2", plannedR: 2, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("A_PLUS");
    });

    it("M2 + plannedR 1-1.99 → A (canon: 1R baseline for M2)", () => {
      expect(
        selectSetupGrade({ dayModel: "M2", plannedR: 1, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("A");
      expect(
        selectSetupGrade({ dayModel: "M2", plannedR: 1.5, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("A");
    });

    it("M2 + plannedR < 1 → B", () => {
      expect(
        selectSetupGrade({ dayModel: "M2", plannedR: 0.5, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("B");
    });
  });

  describe("threshold boundaries (exact-value semantics)", () => {
    it("M1 exactly 4R → A_PLUS (inclusive)", () => {
      expect(
        selectSetupGrade({ dayModel: "M1", plannedR: 4, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("A_PLUS");
    });

    it("M2 exactly 2R → A_PLUS (inclusive)", () => {
      expect(
        selectSetupGrade({ dayModel: "M2", plannedR: 2, processQuality: "FOLLOWED_PLAN" }),
      ).toBe("A_PLUS");
    });
  });
});

describe("isLiveCapitalGrade — canon §A-Setup Only", () => {
  it("A_PLUS and A qualify for live capital", () => {
    expect(isLiveCapitalGrade("A_PLUS")).toBe(true);
    expect(isLiveCapitalGrade("A")).toBe(true);
  });

  it("B_PLUS, B, NO_TRADE do NOT qualify for live capital", () => {
    expect(isLiveCapitalGrade("B_PLUS")).toBe(false);
    expect(isLiveCapitalGrade("B")).toBe(false);
    expect(isLiveCapitalGrade("NO_TRADE")).toBe(false);
  });
});

describe("summarizeSetupGrades — aggregate", () => {
  it("empty input → zeros + undefined rate", () => {
    const s = summarizeSetupGrades([]);
    expect(s.sample_size).toBe(0);
    expect(s.live_capital_qualified).toBe(0);
    expect(s.live_capital_rate).toBeUndefined();
  });

  it("counts and ratios match", () => {
    const grades: SetupGrade[] = ["A_PLUS", "A", "A", "B_PLUS", "B", "NO_TRADE", "NO_TRADE"];
    const s = summarizeSetupGrades(grades);
    expect(s.a_plus).toBe(1);
    expect(s.a).toBe(2);
    expect(s.b_plus).toBe(1);
    expect(s.b).toBe(1);
    expect(s.no_trade).toBe(2);
    expect(s.live_capital_qualified).toBe(3); // A_PLUS + A
    expect(s.sample_size).toBe(7);
    // rate = 3 / (7 - 2 NO_TRADE) = 3/5 = 0.6
    expect(s.live_capital_rate).toBeCloseTo(0.6);
  });

  it("all NO_TRADE → live_capital_rate is undefined (no denominator)", () => {
    const s = summarizeSetupGrades(["NO_TRADE", "NO_TRADE"]);
    expect(s.live_capital_rate).toBeUndefined();
  });
});
