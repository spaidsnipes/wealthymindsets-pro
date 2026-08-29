import { describe, it, expect } from "vitest";
import {
  CANONICAL_FAILURE_STATES,
  isCanonicalFailureState,
  assertFailureStateReport,
  normal,
  unknown,
  type FailureStateReport,
} from "./failureStateGrammar";

/**
 * canon §Failure + Recovery Grammar (2026-08-28).
 *
 * The six state strings are locked exactly here — any addition,
 * removal, or renaming forces a conscious update and gives Sentinel
 * a chance to review before the vocabulary drifts.
 */
describe("failureStateGrammar — canon §Failure + Recovery Grammar", () => {
  it("exports exactly the six canon-approved states in canon order", () => {
    expect([...CANONICAL_FAILURE_STATES]).toEqual([
      "NORMAL",
      "DEGRADED",
      "BLOCKED",
      "UNAVAILABLE",
      "RECOVERING",
      "UNKNOWN",
    ]);
  });

  it("isCanonicalFailureState accepts every approved state", () => {
    for (const s of CANONICAL_FAILURE_STATES) {
      expect(isCanonicalFailureState(s)).toBe(true);
    }
  });

  it("isCanonicalFailureState rejects legacy / freeform strings", () => {
    for (const s of ["error", "warning", "ok", "yellow", "red", "NORMAL_OK", "MAYBE"]) {
      expect(isCanonicalFailureState(s)).toBe(false);
    }
  });
});

describe("assertFailureStateReport — canon §Failure Recovery Grammar guard", () => {
  it("accepts a bare NORMAL report (canon: normal inactivity is not failure)", () => {
    expect(() => assertFailureStateReport({ state: "NORMAL" })).not.toThrow();
    expect(() => assertFailureStateReport(normal())).not.toThrow();
  });

  it("accepts a bare UNKNOWN report (canon: unknown ≠ ok, but not diagnostic)", () => {
    expect(() => assertFailureStateReport({ state: "UNKNOWN" })).not.toThrow();
    expect(() => assertFailureStateReport(unknown("no probe yet"))).not.toThrow();
  });

  it("throws when the state is not one of the six canon values", () => {
    expect(() =>
      assertFailureStateReport({ state: "ERROR" as unknown as "NORMAL" }),
    ).toThrowError(/not canonical/);
  });

  it("DEGRADED without `affected` throws (canon: failure must be visible)", () => {
    expect(() =>
      assertFailureStateReport({ state: "DEGRADED", nextSafeAction: "wait" }),
    ).toThrowError(/visible/);
  });

  it("DEGRADED without `nextSafeAction` throws (canon: failure must be recoverable)", () => {
    expect(() =>
      assertFailureStateReport({ state: "DEGRADED", affected: "tape" }),
    ).toThrowError(/recoverable/);
  });

  it("all four degraded states enforce affected + nextSafeAction", () => {
    for (const state of ["DEGRADED", "BLOCKED", "UNAVAILABLE", "RECOVERING"] as const) {
      expect(() => assertFailureStateReport({ state })).toThrow();
    }
  });

  it("a fully-populated DEGRADED report passes the guard", () => {
    const r: FailureStateReport = {
      state: "DEGRADED",
      affected: "options Greeks pipeline",
      stillWorks: "OHLCV bars + underlying tape",
      reason: "upstream Greek recomputation lag > 90s",
      lastKnownGood: { atIso: "2026-08-28T16:52:00Z", detail: "Greeks fresh" },
      userImpact: "delta/gamma columns show STALE for ≤3 min",
      nextSafeAction: "wait for STALE indicator to clear; do not size on stale Greeks",
      recoveredWhen: "delta stream freshness < 30s for 60s continuously",
    };
    expect(() => assertFailureStateReport(r)).not.toThrow();
  });

  it("BLOCKED and UNAVAILABLE require the same narrative fields", () => {
    for (const state of ["BLOCKED", "UNAVAILABLE"] as const) {
      const r: FailureStateReport = {
        state,
        affected: "provider X live stream",
        nextSafeAction: state === "BLOCKED"
          ? "upgrade entitlement or switch to fallback"
          : "wait for provider restore; last known good bars remain rendered",
      };
      expect(() => assertFailureStateReport(r)).not.toThrow();
    }
  });
});

describe("normal() and unknown() convenience constructors", () => {
  it("normal() returns exactly { state: 'NORMAL' }", () => {
    expect(normal()).toEqual({ state: "NORMAL" });
  });

  it("unknown() records the optional reason without narrative fields", () => {
    expect(unknown("boot")).toEqual({ state: "UNKNOWN", reason: "boot" });
    expect(unknown()).toEqual({ state: "UNKNOWN", reason: undefined });
  });
});
