import { describe, it, expect } from "vitest";
import {
  CANONICAL_FIDELITY_LABELS,
  ALL_CANONICAL_FIDELITY_LABELS,
  type CanonicalFidelityLabel,
} from "../marketData/canonicalFidelityLabels";
import {
  fidelityLabelToFailureState,
  fidelityLabelToFailureReport,
} from "./fidelityToHealth";
import { assertFailureStateReport } from "./failureStateGrammar";

/**
 * canon §Single-writer / Many-readers law — the mapping between the
 * fidelity vocabulary and the health vocabulary lives in exactly one
 * place. These tests lock the exact pair mappings so a future change
 * to either vocabulary forces a conscious edit here.
 */
describe("fidelityLabelToFailureState — canonical mapping", () => {
  const L = CANONICAL_FIDELITY_LABELS;

  const CASES: readonly (readonly [CanonicalFidelityLabel, ReturnType<typeof fidelityLabelToFailureState>])[] = [
    [L.LIVE_CERTIFIED_QUOTE,          "NORMAL"],
    [L.SESSION_CLOSED_LAST_VERIFIED,  "NORMAL"],
    [L.HISTORICAL_BARS_VERIFIED,      "DEGRADED"],
    [L.DELAYED_BY_ENTITLEMENT,        "DEGRADED"],
    [L.ACTIVE_DEGRADED,               "DEGRADED"],
    [L.STALE_PIPELINE,                "RECOVERING"],
    [L.BLOCKED_BY_ENTITLEMENT,        "BLOCKED"],
  ];

  it.each(CASES)("maps %s → %s", (label, expected) => {
    expect(fidelityLabelToFailureState(label)).toBe(expected);
  });

  it("covers every canonical fidelity label (no gaps)", () => {
    expect(CASES.length).toBe(ALL_CANONICAL_FIDELITY_LABELS.length);
    const covered = new Set(CASES.map(([l]) => l));
    for (const label of ALL_CANONICAL_FIDELITY_LABELS) {
      expect(covered.has(label)).toBe(true);
    }
  });

  it("no fidelity label produces UNAVAILABLE — canon: session-closed is NORMAL, blocked is BLOCKED", () => {
    for (const label of ALL_CANONICAL_FIDELITY_LABELS) {
      expect(fidelityLabelToFailureState(label)).not.toBe("UNAVAILABLE");
    }
  });

  it("no fidelity label produces UNKNOWN — canon: a known label is not an unknown state", () => {
    for (const label of ALL_CANONICAL_FIDELITY_LABELS) {
      expect(fidelityLabelToFailureState(label)).not.toBe("UNKNOWN");
    }
  });
});

describe("fidelityLabelToFailureReport — full canon-compliant reports", () => {
  it("every canon fidelity label produces a report that passes the grammar guard", () => {
    for (const label of ALL_CANONICAL_FIDELITY_LABELS) {
      const r = fidelityLabelToFailureReport(label);
      expect(() => assertFailureStateReport(r)).not.toThrow();
    }
  });

  it("NORMAL reports (LIVE, SESSION CLOSED) leave narrative fields undefined", () => {
    for (const label of [
      CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
      CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED,
    ]) {
      const r = fidelityLabelToFailureReport(label);
      expect(r.state).toBe("NORMAL");
      expect(r.affected).toBeUndefined();
      expect(r.nextSafeAction).toBeUndefined();
    }
  });

  it("DEGRADED / BLOCKED / RECOVERING reports populate the seven canon questions", () => {
    for (const label of [
      CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED,
      CANONICAL_FIDELITY_LABELS.DELAYED_BY_ENTITLEMENT,
      CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED,
      CANONICAL_FIDELITY_LABELS.STALE_PIPELINE,
      CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT,
    ]) {
      const r = fidelityLabelToFailureReport(label);
      expect(r.affected).toBeTruthy();
      expect(r.stillWorks).toBeTruthy();
      expect(r.reason).toBeTruthy();
      expect(r.userImpact).toBeTruthy();
      expect(r.nextSafeAction).toBeTruthy();
      expect(r.recoveredWhen).toBeTruthy();
    }
  });
});
