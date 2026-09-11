import { describe, expect, it } from "vitest";
import { certifySource, type SourceCapabilityReport } from "./sourceCapabilityCertification";
import {
  buildAthosCapabilityMatrix,
  deriveSessionTruth,
  resolveCapability,
  type CapabilityCandidate,
  type SessionTruth,
} from "./canonicalCapabilityResolver";

const OPEN: SessionTruth = {
  state: "OPEN",
  asOf: "2026-08-30T15:00:00.000Z",
  reason: "exchange calendar observed open",
};

const CLOSED: SessionTruth = {
  state: "CLOSED",
  asOf: "2026-08-30T22:00:00.000Z",
  reason: "exchange calendar observed closed",
};

function candidate(
  source: string,
  capability: SourceCapabilityReport["capability"],
  status: SourceCapabilityReport["status"],
  fidelity: SourceCapabilityReport["fidelity"],
  providerTier: CapabilityCandidate["providerTier"] = "CERTIFIED_NEW",
): CapabilityCandidate {
  const certification = certifySource(source, [{
    capability,
    status,
    fidelity,
    observedAt: "2026-08-30T15:00:01.000Z",
    evidencePath: `evidence/${source}/${capability}.json`,
    note: `${source} ${capability} evidence`,
  }]);
  return { source, providerTier, row: certification.rows.find((row) => row.capability === capability)! };
}

describe("canonical per-capability resolver", () => {
  it("selects providers independently for each capability", () => {
    const webull = certifySource("webull", [
      { capability: "BARS", status: "ACTIVE_CERTIFIED", fidelity: "REALTIME" },
    ]);
    const moomoo = certifySource("moomoo", [
      { capability: "TICKS", status: "ACTIVE_CERTIFIED", fidelity: "REALTIME" },
    ]);
    const matrix = buildAthosCapabilityMatrix([
      { certification: webull, providerTier: "CERTIFIED_NEW" },
      { certification: moomoo, providerTier: "CERTIFIED_NEW" },
    ], OPEN, "2026-08-30T15:00:02.000Z");

    expect(matrix.capabilities.find((row) => row.capability === "BARS")?.provider).toBe("webull");
    expect(matrix.capabilities.find((row) => row.capability === "TICKS")?.provider).toBe("moomoo");
    expect(matrix.capabilities.find((row) => row.capability === "DEPTH")?.provider).toBeNull();
  });

  it("keeps closed session truth separate from certified realtime data fidelity", () => {
    const result = resolveCapability("PRICE", CLOSED, [
      candidate("webull", "PRICE", "ACTIVE_CERTIFIED", "REALTIME"),
    ]);

    expect(result.session.state).toBe("CLOSED");
    expect(result.status).toBe("ACTIVE_CERTIFIED");
    expect(result.fidelity).toBe("REALTIME");
    expect(result.fidelity).not.toBe("DELAYED");
  });

  it("uses certification and fidelity before provider generation, without averaging feeds", () => {
    const result = resolveCapability("BARS", OPEN, [
      candidate("canonical-old", "BARS", "ACTIVE_CERTIFIED", "REALTIME", "CANONICAL"),
      candidate("webull", "BARS", "ACTIVE_DEGRADED", "SNAPSHOT", "CERTIFIED_NEW"),
    ]);

    expect(result.provider).toBe("canonical-old");
    expect(result.fidelity).toBe("REALTIME");
  });

  it("excludes legacy and mock providers from production selection", () => {
    const result = resolveCapability("PRICE", OPEN, [
      candidate("legacy-yahoo", "PRICE", "ACTIVE_CERTIFIED", "REALTIME", "LEGACY"),
      candidate("fixture", "PRICE", "ACTIVE_CERTIFIED", "REALTIME", "MOCK"),
    ]);

    expect(result.provider).toBeNull();
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.rejectedSources).toEqual([
      { source: "legacy-yahoo", reason: "legacy providers cannot bypass the canonical production resolver", note: "legacy-yahoo PRICE evidence" },
      { source: "fixture", reason: "mock providers are never production-eligible", note: "fixture PRICE evidence" },
    ]);
  });

  it("preserves source, timestamp, fidelity, reason, and evidence in the receipt", () => {
    const result = resolveCapability("DEPTH", OPEN, [
      candidate("moomoo", "DEPTH", "ACTIVE_DEGRADED", "SNAPSHOT"),
    ]);

    expect(result.receipt).toEqual({
      source: "moomoo",
      timestamp: "2026-08-30T15:00:01.000Z",
      fidelity: "SNAPSHOT",
      reason: "moomoo DEPTH evidence",
      evidencePath: "evidence/moomoo/DEPTH.json",
      fallback: { used: false, reason: null, recoveryPath: null },
    });
  });

  it("fails closed with an explicit recovery path when evidence is blocked", () => {
    const result = resolveCapability("OPTIONS", OPEN, [
      candidate("moomoo", "OPTIONS", "BLOCKED_ENTITLEMENT", "NONE"),
    ]);

    expect(result.provider).toBeNull();
    expect(result.entitlement).toBe("BLOCKED");
    expect(result.receipt.source).toBe("none");
    expect(result.receipt.reason).toContain("BLOCKED_ENTITLEMENT");
    expect(result.receipt.fallback.used).toBe(false);
    expect(result.receipt.fallback.recoveryPath).toContain("certify a production-eligible provider");
  });
});

/**
 * SESSION TRUTH IS DERIVED, NOT TYPED (2026-09-11).
 *
 * `/api/athos/market-data/capabilities` built its SessionTruth from an object
 * literal whose `reason` read "canonical exchange-calendar session owner is
 * not wired to this endpoint yet". The owner had in fact been wired — to the
 * index bar and to every session chip — and this endpoint alone kept
 * answering from the constant. On a Saturday /charts printed
 * "US CASH SESSION · CLOSED" while the surface ATHOS reads reported UNKNOWN
 * and blamed a module it could import in one line.
 *
 * These tests drive the DERIVATION. A test that retyped "CLOSED" for a
 * Saturday would pin the next calendar change green exactly the way the
 * literal did.
 *
 * Dates below are constructed in local time on purpose: `provenSessionClosure`
 * reads `Date.getDay()`, so the weekday under test must be the LOCAL weekday.
 */
describe("deriveSessionTruth — the endpoint stops typing its own session", () => {
  const ASOF = "2026-09-12T15:00:00.000Z";

  it("REGRESSION: a Saturday is CLOSED, not a shrug — the owner can prove this day", () => {
    const saturday = new Date(2026, 8, 12, 11, 0, 0); // 2026-09-12 is a Saturday
    expect(saturday.getDay()).toBe(6);
    const truth = deriveSessionTruth(saturday, ASOF);
    expect(truth.state).toBe("CLOSED");
    expect(truth.reason).toContain("established");
  });

  it("a Sunday is CLOSED too — US cash equities do not trade", () => {
    const sunday = new Date(2026, 8, 13, 11, 0, 0);
    expect(sunday.getDay()).toBe(0);
    expect(deriveSessionTruth(sunday, ASOF).state).toBe("CLOSED");
  });

  it("a weekday stays UNKNOWN — there is no intraday calendar, and false confidence is the other half of the same sin", () => {
    const thursday = new Date(2026, 8, 10, 11, 0, 0);
    expect(thursday.getDay()).toBe(4);
    const truth = deriveSessionTruth(thursday, ASOF);
    expect(truth.state).toBe("UNKNOWN");
    // Never OPEN: the repo cannot separate PRE_MARKET / OPEN / AFTER_HOURS.
    expect(truth.state).not.toBe("OPEN");
  });

  it("a weekday at 11am ET is still UNKNOWN — the clock alone is not an exchange calendar", () => {
    const wednesday = new Date(2026, 8, 9, 11, 0, 0);
    expect(deriveSessionTruth(wednesday, ASOF).state).toBe("UNKNOWN");
  });

  it("a null clock is UNKNOWN — the derivation can only ever sharpen, never guess", () => {
    expect(deriveSessionTruth(null, ASOF).state).toBe("UNKNOWN");
  });

  it("the UNKNOWN reason no longer blames a missing owner — that sentence was true when written and stopped being true", () => {
    const thursday = new Date(2026, 8, 10, 11, 0, 0);
    const reason = deriveSessionTruth(thursday, ASOF).reason;
    expect(reason).not.toContain("not wired");
    expect(reason).toContain("no intraday exchange calendar");
  });

  it("asOf is carried through unchanged on both branches — one generatedAt for the whole matrix", () => {
    const saturday = new Date(2026, 8, 12, 11, 0, 0);
    const thursday = new Date(2026, 8, 10, 11, 0, 0);
    expect(deriveSessionTruth(saturday, ASOF).asOf).toBe(ASOF);
    expect(deriveSessionTruth(thursday, ASOF).asOf).toBe(ASOF);
    expect(deriveSessionTruth(null, ASOF).asOf).toBe(ASOF);
  });

  it("provider connectivity is not an input at all — session truth cannot be bought with a working feed", () => {
    // The signature admits a clock and a timestamp. There is no provider
    // parameter to promote, by construction.
    expect(deriveSessionTruth.length).toBe(2);
  });
});
