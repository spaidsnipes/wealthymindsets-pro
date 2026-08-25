/**
 * inferJobMode tests — the job inference must run from the most concrete,
 * highest-stakes state down to an honest default, forward a defensible reason,
 * and never invent a job when signals are thin.
 */

import { describe, it, expect } from "vitest";
import {
  inferJobMode,
  INFER_JOB_MODE_VERSION,
  type JobModeSignals,
} from "./inferJobMode";

const NONE: JobModeSignals = {
  hasOpenPosition: false,
  hasUnreviewedClose: false,
  decision: null,
  hasResolvedMarketState: false,
};

describe("inferJobMode", () => {
  it("exposes a stable version", () => {
    expect(INFER_JOB_MODE_VERSION).toBe("wm.infer-job-mode.v1");
  });

  it("suggests MANAGE with HIGH confidence when a position is open", () => {
    const r = inferJobMode({ ...NONE, hasOpenPosition: true, decision: "ACTION" });
    expect(r.suggested).toBe("MANAGE");
    expect(r.confidence).toBe("HIGH");
    expect(r.reason).toMatch(/open position/i);
  });

  it("prioritises an open position over an unreviewed close", () => {
    const r = inferJobMode({ ...NONE, hasOpenPosition: true, hasUnreviewedClose: true });
    expect(r.suggested).toBe("MANAGE");
  });

  it("suggests REVIEW with HIGH confidence for a closed-but-unreviewed decision", () => {
    const r = inferJobMode({ ...NONE, hasUnreviewedClose: true });
    expect(r.suggested).toBe("REVIEW");
    expect(r.confidence).toBe("HIGH");
  });

  it("suggests EXECUTE when right-of-way is granted", () => {
    const r = inferJobMode({ ...NONE, decision: "ACTION", hasResolvedMarketState: true });
    expect(r.suggested).toBe("EXECUTE");
    expect(r.confidence).toBe("MEDIUM");
  });

  it("suggests WAIT when right-of-way is withheld or cautioned", () => {
    for (const decision of ["WAIT", "CAUTION"] as const) {
      const r = inferJobMode({ ...NONE, decision, hasResolvedMarketState: true });
      expect(r.suggested).toBe("WAIT");
    }
  });

  it("suggests OBSERVE with LOW confidence when state resolves but there is no verdict", () => {
    const r = inferJobMode({ ...NONE, hasResolvedMarketState: true, decision: "UNKNOWN" });
    expect(r.suggested).toBe("OBSERVE");
    expect(r.confidence).toBe("LOW");
  });

  it("falls back to PREP with LOW confidence when nothing is resolved", () => {
    const r = inferJobMode(NONE);
    expect(r.suggested).toBe("PREP");
    expect(r.confidence).toBe("LOW");
    expect(r.reason).toMatch(/prepare/i);
  });

  it("never emits an empty reason", () => {
    const cases: JobModeSignals[] = [
      NONE,
      { ...NONE, hasOpenPosition: true },
      { ...NONE, hasUnreviewedClose: true },
      { ...NONE, decision: "ACTION" },
      { ...NONE, decision: "WAIT" },
      { ...NONE, hasResolvedMarketState: true },
    ];
    for (const c of cases) {
      expect(inferJobMode(c).reason.length).toBeGreaterThan(0);
    }
  });
});
