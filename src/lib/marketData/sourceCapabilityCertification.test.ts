import { describe, it, expect } from "vitest";
import {
  DATA_CAPABILITIES,
  certifySource,
  deriveCvdFidelity,
  sourceCertificationSummary,
  type SourceCapabilityReport,
  type CertifiedCapabilityRow,
  type DataCapability,
} from "./sourceCapabilityCertification";

/** Helper to build a row set at a single status for CVD tests. */
function rows(overrides: Partial<Record<DataCapability, CertifiedCapabilityRow["status"]>>): CertifiedCapabilityRow[] {
  return DATA_CAPABILITIES.map((capability) => ({
    capability,
    status: overrides[capability] ?? "NOT_IMPLEMENTED",
    fidelity: "NONE",
  }));
}

describe("sourceCapabilityCertification", () => {
  it("un-probed source is HONEST: every capability NOT_IMPLEMENTED, nothing certified", () => {
    const cert = certifySource("moomoo", []);
    expect(cert.rows).toHaveLength(DATA_CAPABILITIES.length);
    expect(cert.rows.every((r) => r.status === "NOT_IMPLEMENTED")).toBe(true);
    expect(cert.rows.every((r) => r.fidelity === "NONE")).toBe(true);
    expect(cert.certifiedCount).toBe(0);
    expect(cert.fullyCertified).toBe(false);
    // Never fabricate CVD from nothing.
    expect(cert.cvd).toBe("UNAVAILABLE");
  });

  it("overlays observed reports; last report for a capability wins", () => {
    const reports: SourceCapabilityReport[] = [
      { capability: "PRICE", status: "ACTIVE_DEGRADED", fidelity: "DELAYED" },
      { capability: "PRICE", status: "ACTIVE_CERTIFIED", fidelity: "REALTIME", evidencePath: "fixtures/moomoo/price.json" },
    ];
    const cert = certifySource("moomoo", reports);
    const price = cert.rows.find((r) => r.capability === "PRICE")!;
    expect(price.status).toBe("ACTIVE_CERTIFIED");
    expect(price.fidelity).toBe("REALTIME");
    expect(price.evidencePath).toBe("fixtures/moomoo/price.json");
    expect(cert.certifiedCount).toBe(1);
  });

  it("ACTIVE_CERTIFIED without explicit fidelity defaults to REALTIME; others to NONE", () => {
    const cert = certifySource("webull", [
      { capability: "BARS", status: "ACTIVE_CERTIFIED" },
      { capability: "DEPTH", status: "BLOCKED_ENTITLEMENT" },
    ]);
    expect(cert.rows.find((r) => r.capability === "BARS")!.fidelity).toBe("REALTIME");
    expect(cert.rows.find((r) => r.capability === "DEPTH")!.fidelity).toBe("NONE");
  });

  describe("CVD LAW — depth can never upgrade CVD fidelity", () => {
    it("DIRECT only when EXECUTED_VOLUME and AGGRESSOR_SIDE are both ACTIVE_CERTIFIED", () => {
      expect(deriveCvdFidelity(rows({ EXECUTED_VOLUME: "ACTIVE_CERTIFIED", AGGRESSOR_SIDE: "ACTIVE_CERTIFIED" }))).toBe("DIRECT");
    });

    it("PROXY when executed evidence exists but a leg is degraded", () => {
      expect(deriveCvdFidelity(rows({ EXECUTED_VOLUME: "ACTIVE_CERTIFIED", AGGRESSOR_SIDE: "ACTIVE_DEGRADED" }))).toBe("PROXY");
      expect(deriveCvdFidelity(rows({ EXECUTED_VOLUME: "ACTIVE_DEGRADED", AGGRESSOR_SIDE: "ACTIVE_DEGRADED" }))).toBe("PROXY");
    });

    it("UNAVAILABLE when only DEPTH is certified — order book is NOT CVD", () => {
      expect(deriveCvdFidelity(rows({ DEPTH: "ACTIVE_CERTIFIED" }))).toBe("UNAVAILABLE");
    });

    it("UNAVAILABLE when only executed volume but no aggressor sign at all", () => {
      expect(deriveCvdFidelity(rows({ EXECUTED_VOLUME: "ACTIVE_CERTIFIED" }))).toBe("UNAVAILABLE");
    });

    it("full DEPTH + PRICE + BARS still yields UNAVAILABLE CVD (no executed sign)", () => {
      expect(
        deriveCvdFidelity(rows({ PRICE: "ACTIVE_CERTIFIED", BARS: "ACTIVE_CERTIFIED", DEPTH: "ACTIVE_CERTIFIED" })),
      ).toBe("UNAVAILABLE");
    });
  });

  it("fullyCertified is true only when EVERY capability is ACTIVE_CERTIFIED (never rounded up)", () => {
    const allButOne = DATA_CAPABILITIES.reduce<Partial<Record<DataCapability, CertifiedCapabilityRow["status"]>>>(
      (acc, c) => ({ ...acc, [c]: "ACTIVE_CERTIFIED" }),
      {},
    );
    allButOne.ORDERS = "BLOCKED_AUTH";
    const reports = Object.entries(allButOne).map(([capability, status]) => ({
      capability: capability as DataCapability,
      status: status!,
    }));
    const cert = certifySource("alpaca", reports);
    expect(cert.certifiedCount).toBe(DATA_CAPABILITIES.length - 1);
    expect(cert.fullyCertified).toBe(false);
  });

  it("summary is honest and machine-parseable", () => {
    const cert = certifySource("moomoo", [{ capability: "PRICE", status: "ACTIVE_CERTIFIED" }]);
    expect(sourceCertificationSummary(cert)).toBe(`moomoo: 1/${DATA_CAPABILITIES.length} certified · CVD UNAVAILABLE`);
  });
});
