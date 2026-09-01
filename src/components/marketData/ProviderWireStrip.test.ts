import { describe, expect, it } from "vitest";
import { certifySource } from "@/lib/marketData/sourceCapabilityCertification";
import {
  alpacaReadinessWireView,
  moomooTickWireView,
  providerWireView,
  tastytradeWireView,
} from "./ProviderWireStrip";

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
