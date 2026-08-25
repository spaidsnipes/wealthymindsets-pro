import { describe, it, expect } from "vitest";

import {
  selectMisreadMap,
  classifyMisread,
  MISREAD_CATEGORIES,
  type MisreadEntry,
} from "./selectMisreadMap";

function e(overrides: Partial<MisreadEntry>): MisreadEntry {
  return {
    date: "2026-08-25",
    result: "win",
    processQuality: "FOLLOWED_PLAN",
    ...overrides,
  };
}

describe("classifyMisread — canonical single-bucket assignment", () => {
  it("MISSED_SETUP wins whenever dayModel is M0 (perception failure trumps everything)", () => {
    // Even a plan-followed win on an M0 day is a misread — M0 = no-trade.
    expect(
      classifyMisread(e({ dayModel: "M0", result: "win", processQuality: "FOLLOWED_PLAN" })),
    ).toBe("MISSED_SETUP");
  });

  it("BROKE_PROCESS wins for BROKE_RULES on M1/M2 days", () => {
    expect(
      classifyMisread(e({ dayModel: "M1", processQuality: "BROKE_RULES" })),
    ).toBe("BROKE_PROCESS");
  });

  it("POOR_MANAGEMENT: capture < 50% with MFE ≥ 1.5R (saw the move, gave it back)", () => {
    // realizedR 0.5 / mfeR 2.0 = 25% capture, mfeR ≥ 1.5.
    expect(
      classifyMisread(e({
        dayModel: "M1",
        processQuality: "FOLLOWED_PLAN",
        realizedR: 0.5,
        mfeR: 2.0,
      })),
    ).toBe("POOR_MANAGEMENT");
  });

  it("does NOT flag POOR_MANAGEMENT when MFE < 1.5R (nothing to capture yet)", () => {
    // 0.3 / 1.0 = 30% capture but MFE only 1.0R — not enough runner to blame.
    expect(
      classifyMisread(e({
        dayModel: "M1",
        processQuality: "FOLLOWED_PLAN",
        realizedR: 0.3,
        mfeR: 1.0,
      })),
    ).toBe("CLEAN");
  });

  it("FULL_STOP_LOSS: plan-followed loss with maeR ≤ -0.75R", () => {
    expect(
      classifyMisread(e({
        dayModel: "M1",
        result: "loss",
        processQuality: "FOLLOWED_PLAN",
        realizedR: -1,
        maeR: -1,
      })),
    ).toBe("FULL_STOP_LOSS");
  });

  it("UNRESOLVED_PROCESS: plan neither followed nor broken", () => {
    expect(
      classifyMisread(e({ dayModel: "M1", processQuality: "UNRESOLVED" })),
    ).toBe("UNRESOLVED_PROCESS");
  });

  it("CLEAN: plan-followed win with no other flags", () => {
    expect(
      classifyMisread(e({
        dayModel: "M1",
        result: "win",
        processQuality: "FOLLOWED_PLAN",
        realizedR: 1.5,
        mfeR: 2.0,
      })),
    ).toBe("CLEAN");
  });

  it("category order is stable — MISSED_SETUP trumps BROKE_PROCESS on M0", () => {
    expect(
      classifyMisread(e({ dayModel: "M0", processQuality: "BROKE_RULES" })),
    ).toBe("MISSED_SETUP");
  });
});

describe("selectMisreadMap — aggregate + dominant", () => {
  it("empty entries returns zeros + undefined dominant", () => {
    const m = selectMisreadMap([]);
    expect(m.sample_size).toBe(0);
    expect(m.dominant).toBeUndefined();
    for (const c of MISREAD_CATEGORIES) expect(m.counts[c]).toBe(0);
  });

  it("counts always sum to sample_size", () => {
    const m = selectMisreadMap([
      e({ dayModel: "M0" }), // MISSED_SETUP
      e({ processQuality: "BROKE_RULES" }), // BROKE_PROCESS
      e({ processQuality: "UNRESOLVED" }), // UNRESOLVED_PROCESS
      e({ result: "loss", processQuality: "FOLLOWED_PLAN", maeR: -1 }), // FULL_STOP_LOSS
      e({ realizedR: 1, mfeR: 1, processQuality: "FOLLOWED_PLAN" }), // CLEAN
    ]);
    const sum = MISREAD_CATEGORIES.reduce((a, c) => a + m.counts[c], 0);
    expect(sum).toBe(m.sample_size);
    expect(m.sample_size).toBe(5);
  });

  it("dominant identifies the strictly-highest bucket", () => {
    const m = selectMisreadMap([
      e({ processQuality: "BROKE_RULES" }),
      e({ processQuality: "BROKE_RULES" }),
      e({ processQuality: "BROKE_RULES" }),
      e({ processQuality: "UNRESOLVED" }),
    ]);
    expect(m.dominant).toBe("BROKE_PROCESS");
    expect(m.counts.BROKE_PROCESS).toBe(3);
  });

  it("dominant is undefined on a tie (never invents a headline)", () => {
    const m = selectMisreadMap([
      e({ processQuality: "BROKE_RULES" }),
      e({ processQuality: "UNRESOLVED" }),
    ]);
    // 1 vs 1 — tie.
    expect(m.dominant).toBeUndefined();
  });

  it("dominant is undefined when every bucket ties at 1", () => {
    const m = selectMisreadMap([
      e({ dayModel: "M0" }),
      e({ processQuality: "BROKE_RULES" }),
    ]);
    // Both non-CLEAN buckets have 1; tie.
    expect(m.dominant).toBeUndefined();
  });
});
