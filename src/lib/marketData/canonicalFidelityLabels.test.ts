import { describe, it, expect } from "vitest";
import {
  CANONICAL_FIDELITY_LABELS,
  ALL_CANONICAL_FIDELITY_LABELS,
  QUARANTINED_FIDELITY_PHRASES,
  isCanonicalFidelityLabel,
  resolveCanonicalFidelityLabel,
} from "./canonicalFidelityLabels";

/**
 * canon §Living Market Visual Systems (2026-08-27) — the seven
 * label strings are UI copy; the set is locked exactly here. Any
 * addition, removal, or wording change requires a canon amendment
 * and forces this test to be updated consciously.
 */
describe("canonicalFidelityLabels — canon §Living Market Visual Systems", () => {
  const EXPECTED_LABEL_KEYS = [
    "SESSION_CLOSED_LAST_VERIFIED",
    "LIVE_CERTIFIED_QUOTE",
    "HISTORICAL_BARS_VERIFIED",
    "DELAYED_BY_ENTITLEMENT",
    "STALE_PIPELINE",
    "ACTIVE_DEGRADED",
    "BLOCKED_BY_ENTITLEMENT",
  ] as const;

  const EXPECTED_LABEL_STRINGS = [
    "SESSION CLOSED — LAST VERIFIED",
    "LIVE — CERTIFIED QUOTE",
    "HISTORICAL BARS VERIFIED",
    "DELAYED BY ENTITLEMENT",
    "STALE PIPELINE",
    "ACTIVE DEGRADED",
    "BLOCKED BY ENTITLEMENT",
  ] as const;

  it("exports exactly the seven canon-approved keys", () => {
    expect(Object.keys(CANONICAL_FIDELITY_LABELS).sort()).toEqual(
      [...EXPECTED_LABEL_KEYS].sort(),
    );
  });

  it("each label string is the verbatim canon copy", () => {
    for (const [i, key] of EXPECTED_LABEL_KEYS.entries()) {
      expect(CANONICAL_FIDELITY_LABELS[key]).toBe(EXPECTED_LABEL_STRINGS[i]);
    }
  });

  it("ALL_CANONICAL_FIDELITY_LABELS is exhaustive and frozen", () => {
    expect(ALL_CANONICAL_FIDELITY_LABELS.length).toBe(EXPECTED_LABEL_KEYS.length);
    expect(Object.isFrozen(ALL_CANONICAL_FIDELITY_LABELS)).toBe(true);
  });

  it("isCanonicalFidelityLabel accepts every approved label", () => {
    for (const label of ALL_CANONICAL_FIDELITY_LABELS) {
      expect(isCanonicalFidelityLabel(label)).toBe(true);
    }
  });

  it("isCanonicalFidelityLabel rejects quarantined legacy phrases", () => {
    for (const legacy of QUARANTINED_FIDELITY_PHRASES) {
      expect(isCanonicalFidelityLabel(legacy)).toBe(false);
    }
  });

  it("QUARANTINED_FIDELITY_PHRASES is frozen (Sentinel-locked)", () => {
    expect(Object.isFrozen(QUARANTINED_FIDELITY_PHRASES)).toBe(true);
    // These four phrases MUST stay listed — they're the specific
    // legacy strings the new canon prohibits from ever recurring.
    expect(QUARANTINED_FIDELITY_PHRASES).toContain("NO FEED");
    expect(QUARANTINED_FIDELITY_PHRASES).toContain("OHLCV ONLY");
    expect(QUARANTINED_FIDELITY_PHRASES).toContain("DELAYED 15 MIN");
  });
});

describe("resolveCanonicalFidelityLabel — priority ordering", () => {
  it("closed session → SESSION_CLOSED_LAST_VERIFIED (canon: closed is not delayed)", () => {
    expect(
      resolveCanonicalFidelityLabel({ sessionOpen: false, historicalBarsVerified: true }),
    ).toBe(CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED);
    // Even without historical bars, closed dominates — never STALE.
    expect(resolveCanonicalFidelityLabel({ sessionOpen: false })).toBe(
      CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED,
    );
  });

  it("entitlement wall beats pipeline health (canon: policy verdict distinct)", () => {
    expect(
      resolveCanonicalFidelityLabel({
        sessionOpen: true,
        entitlementBlocked: true,
        liveQuoteFresh: true, // never seen — the wall short-circuits
      }),
    ).toBe(CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT);
  });

  it("open + fresh + not degraded → LIVE_CERTIFIED_QUOTE", () => {
    expect(
      resolveCanonicalFidelityLabel({
        sessionOpen: true,
        liveQuoteFresh: true,
      }),
    ).toBe(CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE);
  });

  it("open + fresh + degraded → ACTIVE_DEGRADED", () => {
    expect(
      resolveCanonicalFidelityLabel({
        sessionOpen: true,
        liveQuoteFresh: true,
        activeButDegraded: true,
      }),
    ).toBe(CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED);
  });

  it("open + not fresh + no entitlement info → STALE_PIPELINE", () => {
    expect(
      resolveCanonicalFidelityLabel({
        sessionOpen: true,
        pipelineStale: true,
      }),
    ).toBe(CANONICAL_FIDELITY_LABELS.STALE_PIPELINE);
  });

  it("requires explicit provider delay proof before DELAYED_BY_ENTITLEMENT", () => {
    expect(
      resolveCanonicalFidelityLabel({
        sessionOpen: true,
        liveQuoteFresh: false,
        entitlementBlocked: false,
      }),
    ).toBeUndefined();
    expect(
      resolveCanonicalFidelityLabel({
        sessionOpen: true,
        liveQuoteFresh: false,
        entitlementDelayed: true,
      }),
    ).toBe(CANONICAL_FIDELITY_LABELS.DELAYED_BY_ENTITLEMENT);
  });

  it("no session signal + historical bars → HISTORICAL_BARS_VERIFIED", () => {
    expect(
      resolveCanonicalFidelityLabel({ historicalBarsVerified: true }),
    ).toBe(CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED);
  });

  it("all-unknown input → undefined (canon: silence-is-a-feature)", () => {
    expect(resolveCanonicalFidelityLabel({})).toBeUndefined();
  });
});
