import { describe, expect, it } from "vitest";
import { certifySource, type SourceCapabilityReport } from "./sourceCapabilityCertification";
import {
  buildAthosCapabilityMatrix,
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
      { source: "legacy-yahoo", reason: "legacy providers cannot bypass the canonical production resolver" },
      { source: "fixture", reason: "mock providers are never production-eligible" },
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
