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
  position: "UNOBSERVED",
  hasUnreviewedClose: false,
  decision: null,
  hasResolvedMarketState: false,
};

describe("inferJobMode", () => {
  it("exposes a stable version", () => {
    expect(INFER_JOB_MODE_VERSION).toBe("wm.infer-job-mode.v1");
  });

  it("suggests MANAGE with HIGH confidence when a position is open", () => {
    const r = inferJobMode({ ...NONE, position: "AT_RISK", decision: "ACTION" });
    expect(r.suggested).toBe("MANAGE");
    expect(r.confidence).toBe("HIGH");
    expect(r.reason).toMatch(/open position/i);
  });

  it("prioritises an open position over an unreviewed close", () => {
    const r = inferJobMode({ ...NONE, position: "AT_RISK", hasUnreviewedClose: true });
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

  it("suggests OBSERVE with MEDIUM confidence on a NO TRADE verdict (decisive, not thin)", () => {
    // NO TRADE is a compiled engine verdict — the setup was hard-rejected. It must
    // NOT fall through to the LOW/PREP default, and it must NOT be treated as WAIT
    // (nothing is pending; the thesis was rejected). The honest job is OBSERVE at
    // the same MEDIUM tier as the other concrete right-of-way verdicts.
    const r = inferJobMode({ ...NONE, decision: "NO TRADE", hasResolvedMarketState: true });
    expect(r.suggested).toBe("OBSERVE");
    expect(r.confidence).toBe("MEDIUM");
    expect(r.reason).toMatch(/no valid trade/i);
  });

  it("treats NO TRADE as decisive even with no resolved market-state flag", () => {
    // Even absent the hasResolvedMarketState hint, a NO TRADE verdict is concrete
    // enough to answer the job — it must not decay to PREP.
    const r = inferJobMode({ ...NONE, decision: "NO TRADE" });
    expect(r.suggested).toBe("OBSERVE");
    expect(r.confidence).toBe("MEDIUM");
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
      { ...NONE, position: "AT_RISK" },
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

/**
 * §14.1 — FLAT IS A FINDING, NEVER A DEFAULT.
 *
 * `hasOpenPosition` was a boolean, and /command-deck fed it `false` from a store
 * whose only ingress has zero production callers. So the deck rendered "Market
 * state is resolving WITH NO POSITION — watch." to a trader who could well have
 * been holding one. The engine did not lie; it was handed a collapsed signal and
 * spoke it faithfully. These rules keep the third state alive.
 */
describe("inferJobMode — an unobservable position is not a flat one", () => {
  it("UNOBSERVED never earns MANAGE — silence is not a position", () => {
    const r = inferJobMode({ ...NONE, position: "UNOBSERVED", hasResolvedMarketState: true });
    expect(r.suggested).not.toBe("MANAGE");
  });

  it("UNOBSERVED never CLAIMS the trader is flat", () => {
    // THE RULE THIS BLOCK EXISTS FOR. The suggestion may stay OBSERVE; what is
    // forbidden is the positive assertion of flatness.
    const r = inferJobMode({ ...NONE, position: "UNOBSERVED", hasResolvedMarketState: true });
    expect(r.suggested).toBe("OBSERVE");
    expect(r.reason, "asserts a flatness no surface observed").not.toMatch(/with no position/i);
    expect(r.reason).toMatch(/not visible|no position is visible/i);
  });

  it("NO_EXPOSURE_OBSERVED still says it plainly — the distinction is real, not a deleted phrase", () => {
    // ANTI-VACUITY for the rule above. If the fix were "remove the sentence",
    // the previous test would pass while the product lost a true statement. An
    // observed flat IS a finding and must still be spoken.
    const r = inferJobMode({
      ...NONE,
      position: "NO_EXPOSURE_OBSERVED",
      hasResolvedMarketState: true,
    });
    expect(r.suggested).toBe("OBSERVE");
    expect(r.reason).toMatch(/with no position/i);
  });

  it("the two observations produce DIFFERENT sentences", () => {
    const unobserved = inferJobMode({ ...NONE, position: "UNOBSERVED", hasResolvedMarketState: true });
    const flat = inferJobMode({ ...NONE, position: "NO_EXPOSURE_OBSERVED", hasResolvedMarketState: true });
    expect(unobserved.reason).not.toBe(flat.reason);
  });

  it("AT_RISK still outranks everything — the loud case did not regress", () => {
    const r = inferJobMode({ ...NONE, position: "AT_RISK", hasUnreviewedClose: true, decision: "ACTION" });
    expect(r.suggested).toBe("MANAGE");
    expect(r.confidence).toBe("HIGH");
  });
});
