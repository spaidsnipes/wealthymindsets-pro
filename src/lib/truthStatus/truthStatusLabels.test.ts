import { describe, it, expect } from "vitest";
import {
  CANONICAL_TRUTH_STATUS,
  ALL_TRUTH_STATUS_KEYS,
  ALL_TRUTH_STATUS_LABELS,
  TRUTH_STATUS_RANK,
  isCanonicalTruthStatusLabel,
  assertTruthStatusReport,
  verified,
  unknown,
  type TruthStatusReport,
} from "./truthStatusLabels";

/**
 * canon §TRUTH STATUS LABELS (ATHOS Master Manual v2.0, 2026-07-28) —
 * the eleven labels are locked exactly here. Any addition, removal, or
 * spelling change requires a canon amendment.
 */
describe("truthStatusLabels — canon §Truth Status Labels", () => {
  it("exports exactly the eleven canon-approved keys in canonical order", () => {
    expect([...ALL_TRUTH_STATUS_KEYS]).toEqual([
      "VERIFIED",
      "CORROBORATED",
      "PROVISIONAL",
      "ESTIMATED",
      "INFERRED",
      "ASSUMED",
      "DISPUTED",
      "UNVERIFIED",
      "UNKNOWN",
      "FALSE_OR_CONTRADICTED",
      "SUPERSEDED",
    ]);
  });

  it("each key maps to its verbatim canon display label", () => {
    const expected: Record<string, string> = {
      VERIFIED: "VERIFIED",
      CORROBORATED: "CORROBORATED",
      PROVISIONAL: "PROVISIONAL",
      ESTIMATED: "ESTIMATED",
      INFERRED: "INFERRED",
      ASSUMED: "ASSUMED",
      DISPUTED: "DISPUTED",
      UNVERIFIED: "UNVERIFIED",
      UNKNOWN: "UNKNOWN",
      FALSE_OR_CONTRADICTED: "FALSE OR CONTRADICTED",
      SUPERSEDED: "SUPERSEDED",
    };
    for (const k of ALL_TRUTH_STATUS_KEYS) {
      expect(CANONICAL_TRUTH_STATUS[k]).toBe(expected[k]);
    }
  });

  it("ALL_TRUTH_STATUS_LABELS is frozen and exhaustive", () => {
    expect(Object.isFrozen(ALL_TRUTH_STATUS_LABELS)).toBe(true);
    expect(ALL_TRUTH_STATUS_LABELS.length).toBe(11);
  });

  it("TRUTH_STATUS_RANK preserves canon ordering (VERIFIED strongest, SUPERSEDED/FALSE weakest)", () => {
    expect(TRUTH_STATUS_RANK.VERIFIED).toBe(10);
    expect(TRUTH_STATUS_RANK.CORROBORATED).toBeGreaterThan(TRUTH_STATUS_RANK.PROVISIONAL);
    expect(TRUTH_STATUS_RANK.PROVISIONAL).toBeGreaterThan(TRUTH_STATUS_RANK.ASSUMED);
    expect(TRUTH_STATUS_RANK.UNVERIFIED).toBeGreaterThan(TRUTH_STATUS_RANK.UNKNOWN);
    expect(TRUTH_STATUS_RANK.UNKNOWN).toBeGreaterThan(TRUTH_STATUS_RANK.FALSE_OR_CONTRADICTED);
    expect(TRUTH_STATUS_RANK.FALSE_OR_CONTRADICTED).toBe(0);
    expect(TRUTH_STATUS_RANK.SUPERSEDED).toBe(0);
  });

  it("isCanonicalTruthStatusLabel accepts every approved label", () => {
    for (const label of ALL_TRUTH_STATUS_LABELS) {
      expect(isCanonicalTruthStatusLabel(label)).toBe(true);
    }
  });

  it("isCanonicalTruthStatusLabel rejects freeform strings", () => {
    for (const s of ["MAYBE", "PROBABLE", "TRUE", "OK", "yes", "verified"]) {
      expect(isCanonicalTruthStatusLabel(s)).toBe(false);
    }
  });
});

describe("assertTruthStatusReport — canon guard", () => {
  it("accepts a bare VERIFIED report (canon: strong evidence needs no defence)", () => {
    expect(() => assertTruthStatusReport(verified())).not.toThrow();
    expect(() => assertTruthStatusReport({ status: "VERIFIED" })).not.toThrow();
  });

  it("accepts a bare CORROBORATED / PROVISIONAL report (rank ≥ 7)", () => {
    for (const s of ["CORROBORATED", "PROVISIONAL"] as const) {
      expect(() => assertTruthStatusReport({ status: s })).not.toThrow();
    }
  });

  it("throws when status is not canonical", () => {
    expect(() =>
      assertTruthStatusReport({ status: "MAYBE" as unknown as "VERIFIED" }),
    ).toThrowError(/not canonical/);
  });

  it("ESTIMATED / INFERRED / ASSUMED without reason throws", () => {
    for (const s of ["ESTIMATED", "INFERRED", "ASSUMED"] as const) {
      expect(() => assertTruthStatusReport({ status: s })).toThrowError(/reason/);
    }
  });

  it("DISPUTED / UNVERIFIED / UNKNOWN / FALSE / SUPERSEDED require BOTH reason + nextAction", () => {
    for (const s of ["DISPUTED", "UNVERIFIED", "UNKNOWN", "FALSE_OR_CONTRADICTED", "SUPERSEDED"] as const) {
      expect(() => assertTruthStatusReport({ status: s })).toThrowError(/reason/);
      expect(() => assertTruthStatusReport({ status: s, reason: "x" })).toThrowError(/nextAction/);
    }
  });

  it("a full report passes the guard", () => {
    const r: TruthStatusReport = {
      status: "DISPUTED",
      claim: "TSLA is bullish above 348",
      reason: "Two independent scanners disagree: A says continuation, B says exhaustion.",
      matters: "Right-of-way should not clear until the disagreement resolves.",
      nextAction: "Wait for CVD or delta divergence to break the tie.",
      owner: "trader",
      evidence: ["scanner A + 2026-08-28T22:15", "scanner B + 2026-08-28T22:16"],
      asOfIso: "2026-08-28T22:20:00Z",
    };
    expect(() => assertTruthStatusReport(r)).not.toThrow();
  });
});

describe("verified() and unknown() convenience constructors", () => {
  it("verified() returns a bare VERIFIED report", () => {
    expect(verified()).toEqual({ status: "VERIFIED", claim: undefined, evidence: undefined });
  });

  it("verified() with claim + evidence populates them", () => {
    const r = verified("Bars rendered", ["chart canvas != null"]);
    expect(r.status).toBe("VERIFIED");
    expect(r.claim).toBe("Bars rendered");
    expect(r.evidence).toEqual(["chart canvas != null"]);
  });

  it("unknown() records the reason without narrative fields", () => {
    expect(unknown("no probe yet")).toEqual({ status: "UNKNOWN", reason: "no probe yet" });
  });
});
