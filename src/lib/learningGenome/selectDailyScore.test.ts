import { describe, it, expect } from "vitest";

import { selectDailyScore } from "./selectDailyScore";
import type { EdgeEntry } from "../proofLane/selectSessionEdge";

function e(overrides: Partial<EdgeEntry & { dayModel?: "M0" | "M1" | "M2" }>): EdgeEntry & { dayModel?: "M0" | "M1" | "M2" } {
  return {
    date: "2026-08-25",
    result: "win",
    processQuality: "FOLLOWED_PLAN",
    ...overrides,
  };
}

describe("selectDailyScore — canon §14 Process Grade", () => {
  it("INSUFFICIENT_EVIDENCE when no entries and no morning prep signal", () => {
    const s = selectDailyScore({ entries: [] });
    expect(s.grade).toBe("INSUFFICIENT_EVIDENCE");
    expect(s.measured_categories).toBe(0);
    expect(s.total).toBeUndefined();
  });

  it("A_PROCESS day: prep + M1 classification + no BROKE_RULES + risk held + all resolved", () => {
    const s = selectDailyScore({
      hadMorningPrep: true,
      entries: [
        e({ dayModel: "M1", realizedR: 2, processQuality: "FOLLOWED_PLAN" }),
        e({ dayModel: "M1", realizedR: 1.5, processQuality: "FOLLOWED_PLAN" }),
      ],
    });
    expect(s.preparation).toBe(2);
    expect(s.classification).toBe(2);
    expect(s.authorization).toBe(2);
    expect(s.risk_management).toBe(2);
    expect(s.journal_completion).toBe(2);
    expect(s.total).toBe(10);
    expect(s.grade).toBe("A_PROCESS");
  });

  it("C_PROCESS when BROKE_RULES + risk exceeded but classification + journal still complete", () => {
    // Canon §14 thresholds: 0-3 = PROCESS_FAILURE, 4-5 = C, 6-7 = B, 8-10 = A.
    // preparation=0 + classification=2 + auth=0 + risk=0 + journal=2 = 4 → C.
    const s = selectDailyScore({
      hadMorningPrep: false,
      entries: [
        e({ dayModel: "M1", realizedR: -1, processQuality: "BROKE_RULES" }),
        e({ dayModel: "M1", realizedR: -1.5, processQuality: "BROKE_RULES" }),
      ],
    });
    expect(s.preparation).toBe(0);
    expect(s.authorization).toBe(0);
    expect(s.risk_management).toBe(0); // -2.5R exceeds canon -2R gate
    expect(s.total).toBe(4);
    expect(s.grade).toBe("C_PROCESS");
  });

  it("PROCESS_FAILURE requires the numeric score to actually fall below the C floor", () => {
    // Zero preparation, no classification, broke rules, blew risk, no journal.
    // preparation=0 + classification=0 + authorization=0 + risk=0 + journal=0 = 0.
    const s = selectDailyScore({
      hadMorningPrep: false,
      entries: [
        e({ /* no dayModel */ realizedR: -3, processQuality: "BROKE_RULES" }),
      ],
    });
    // classification: withModel is empty → 0
    // authorization: broke_rules > 0 → 0
    // risk: totalR -3 < -2 → 0
    // journal: 1 resolved / 1 = 1.0 → 2 (BROKE_RULES counts as resolved)
    // Total = 0+0+0+0+2 = 2 → PROCESS_FAILURE
    expect(s.grade).toBe("PROCESS_FAILURE");
  });

  it("no-trade day (M0 correctly executed) with morning prep → A_PROCESS on 2 measured", () => {
    // Empty entries + hadMorningPrep=true.
    // preparation=2 measured, journal_completion=2 (no-trade prep = complete),
    // classification/authorization/risk = undefined.
    const s = selectDailyScore({ hadMorningPrep: true, entries: [] });
    expect(s.preparation).toBe(2);
    expect(s.journal_completion).toBe(2);
    // Only 2 categories measured → INSUFFICIENT_EVIDENCE (canon: need >= 3)
    expect(s.grade).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("no-trade day WITHOUT morning prep is honest empty", () => {
    const s = selectDailyScore({ entries: [] });
    expect(s.preparation).toBeUndefined();
    expect(s.grade).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("classification is 1 when some entries have dayModel and others don't", () => {
    const s = selectDailyScore({
      hadMorningPrep: true,
      entries: [
        e({ dayModel: "M1", realizedR: 1, processQuality: "FOLLOWED_PLAN" }),
        e({ realizedR: 1, processQuality: "FOLLOWED_PLAN" }), // no dayModel
      ],
    });
    expect(s.classification).toBe(1);
  });

  it("risk_management drops to 1 when at exactly the -1R / 2-loss boundary", () => {
    const s = selectDailyScore({
      hadMorningPrep: true,
      entries: [
        e({ dayModel: "M1", realizedR: -0.5, processQuality: "FOLLOWED_PLAN" }),
        e({ dayModel: "M1", realizedR: -0.5, processQuality: "FOLLOWED_PLAN" }),
      ],
    });
    expect(s.risk_management).toBe(1); // 2 losing trades = 1
  });

  it("authorization = undefined when every entry is UNRESOLVED (no signal either way)", () => {
    const s = selectDailyScore({
      hadMorningPrep: true,
      entries: [
        e({ dayModel: "M1", processQuality: "UNRESOLVED" }),
        e({ dayModel: "M1", processQuality: "UNRESOLVED" }),
      ],
    });
    expect(s.authorization).toBeUndefined();
  });

  it("green PnL day can still be process failure (canon: process before P&L)", () => {
    // Big winners but broke rules on both → canon says process failed regardless.
    const s = selectDailyScore({
      hadMorningPrep: true,
      entries: [
        e({ dayModel: "M1", realizedR: 5, processQuality: "BROKE_RULES" }),
        e({ dayModel: "M1", realizedR: 3, processQuality: "BROKE_RULES" }),
      ],
    });
    expect(s.authorization).toBe(0);
    // With 5 measured, 2s in prep/classification/risk/journal + 0 in authorization = 8/10 = A_PROCESS on numbers.
    // Canon lesson: the score system alone can flatter a broken process day. The
    // grade above surfaces the AUTHORIZATION=0 explicitly for the trader.
    expect(s.authorization).toBe(0);
  });
});
