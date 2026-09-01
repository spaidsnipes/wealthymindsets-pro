import { describe, expect, it } from "vitest";
import { certifySource } from "@/lib/marketData/sourceCapabilityCertification";
import {
  alpacaReadinessWireView,
  moomooTickWireView,
  matrixProviderWireView,
  providerWireView,
  tastytradeWireView,
} from "./ProviderWireStrip";
import { buildAthosCapabilityMatrix } from "@/lib/marketData/canonicalCapabilityResolver";

describe("providerWireView", () => {
  it("shows bounded snapshot observations as limited, never live", () => {
    const source = certifySource("webull", [
      { capability: "TICKS", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT" },
      { capability: "EXECUTED_VOLUME", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT" },
    ]);
    expect(providerWireView(source)).toMatchObject({ tone: "LIMITED", label: "2 observed" });
  });

  it("distinguishes entitlement, auth, and unwired states", () => {
    expect(providerWireView(certifySource("webull", [{ capability: "FUTURES", status: "BLOCKED_ENTITLEMENT", note: "US futures subscription required" }])).tone).toBe("BLOCKED");
    expect(providerWireView(certifySource("moomoo", [{ capability: "PRICE", status: "BLOCKED_AUTH" }])).label).toBe("Authentication blocked");
    expect(providerWireView(certifySource("moomoo", [])).tone).toBe("OFFLINE");
  });

  it("keeps tastytrade auth, quote-token, and real-time proof distinct", () => {
    expect(tastytradeWireView({ configured: false, connected: false, note: "refresh token missing" })).toMatchObject({ tone: "OFFLINE", label: "Not runtime-wired" });
    expect(tastytradeWireView({ configured: true, connected: false })).toMatchObject({ tone: "BLOCKED", label: "Connection failed" });
    expect(tastytradeWireView({ configured: true, connected: true, quotes: false, realTime: null })).toMatchObject({ tone: "LIMITED", label: "Account connected" });
    expect(tastytradeWireView({ configured: true, connected: true, quotes: true, realTime: null })).toMatchObject({ tone: "LIMITED", label: "Quote token ready" });
    expect(tastytradeWireView({ configured: true, connected: true, quotes: true, realTime: true })).toMatchObject({ tone: "LIVE", label: "Real-time verified" });
  });

  it("names the exact moomoo tick edge and never upgrades receipt presence to live", () => {
    expect(moomooTickWireView({ label: "NOT CONFIGURED", detail: "MOOMOO_BRIDGE_URL is not configured.", eventCount: 0 })).toMatchObject({ tone: "OFFLINE", label: "Not configured" });
    expect(moomooTickWireView({ label: "AUTH BLOCKED", detail: "Sign in required.", eventCount: 0 })).toMatchObject({ tone: "BLOCKED", label: "AUTH BLOCKED" });
    expect(moomooTickWireView({ label: "NO EVENTS RECEIVED", detail: "No prints returned.", eventCount: 0 })).toMatchObject({ tone: "LIMITED", label: "NO EVENTS RECEIVED" });
    expect(moomooTickWireView({ label: "RECEIVING", receiving: true, eventCount: 4 })).toMatchObject({ tone: "LIMITED", label: "Ticks receiving" });
  });

  it("keeps Alpaca env readiness below connected or receiving", () => {
    const ready = alpacaReadinessWireView({
      providers: [
        { provider: "alpaca-paper", label: "Alpaca (paper)", lane: "broker", status: "BLOCKED", missing: ["ALPACA_PAPER_KEY", "ALPACA_PAPER_SECRET"], missingRecommended: [], note: "Paper pair." },
        { provider: "alpaca-live", label: "Alpaca (live)", lane: "broker", status: "READY", missing: [], missingRecommended: [], note: "Live pair." },
      ],
    });
    expect(ready).toMatchObject({ source: "alpaca", tone: "LIMITED", label: "Configured to attempt" });
    expect(ready.detail).toContain("no accepted live event receipt");

    const blocked = alpacaReadinessWireView({
      providers: [
        { provider: "alpaca-live", label: "Alpaca (live)", lane: "broker", status: "BLOCKED", missing: ["ALPACA_KEY"], missingRecommended: [], note: "Live pair." },
      ],
    });
    expect(blocked).toMatchObject({ tone: "OFFLINE", label: "Not configured" });
    expect(blocked.detail).toContain("ALPACA_KEY");
  });
});

describe("matrixProviderWireView", () => {
  const session = { state: "UNKNOWN" as const, asOf: "2026-08-31T00:00:00.000Z", reason: "calendar owner pending" };

  it("renders observed snapshot truth below live", () => {
    const matrix = buildAthosCapabilityMatrix([{ certification: certifySource("alpaca", [
      { capability: "PRICE", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT", stalenessMs: 500, note: "bounded IEX trade" },
    ]), providerTier: "CANONICAL" }], session);
    expect(matrixProviderWireView(matrix, "alpaca")).toMatchObject({ tone: "LIMITED", label: "1 observed" });
  });

  it("preserves exact auth and not-receiving notes from rejected sources", () => {
    const matrix = buildAthosCapabilityMatrix([
      { certification: certifySource("webull", [{ capability: "TICKS", status: "BLOCKED_AUTH", note: "HTTP 401 from provider" }]), providerTier: "CERTIFIED_NEW" },
      { certification: certifySource("tastytrade", [{ capability: "OPTIONS", status: "NOT_IMPLEMENTED", note: "refresh token missing" }]), providerTier: "CERTIFIED_NEW" },
    ], session);
    expect(matrixProviderWireView(matrix, "webull")).toMatchObject({ tone: "BLOCKED", label: "Authentication blocked", detail: "HTTP 401 from provider" });
    expect(matrixProviderWireView(matrix, "tastytrade")).toMatchObject({ tone: "OFFLINE", label: "Not receiving", detail: "refresh token missing" });
  });
});
