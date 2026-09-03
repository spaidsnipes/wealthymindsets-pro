import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { certifySource } from "@/lib/marketData/sourceCapabilityCertification";
import {
  alpacaReadinessWireView,
  moomooTickWireView,
  matrixProviderWireView,
  providerWireView,
  providerConfigReadinessWireView,
  tastytradeWireView,
  longbridgeTickWireView,
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

  it("keeps Longbridge receiving below live until entitlement is certified", () => {
    expect(longbridgeTickWireView({ label: "RECEIVING", receiving: true, eventCount: 20 })).toMatchObject({ source: "longbridge", tone: "LIMITED", label: "Ticks receiving" });
    expect(longbridgeTickWireView({ label: "NOT CONFIGURED", detail: "LONGBRIDGE_BRIDGE_URL missing", eventCount: 0 })).toMatchObject({ source: "longbridge", tone: "OFFLINE", label: "Not configured" });
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

  it("turns missing Tastytrade configuration into the exact visible blocker", () => {
    const view = providerConfigReadinessWireView({
      providers: [{
        provider: "tastytrade", label: "Tastytrade", lane: "broker", status: "BLOCKED",
        missing: ["TASTYTRADE_REFRESH_TOKEN"], missingRecommended: [], note: "OAuth token required.",
      }],
    }, "tastytrade", ["tastytrade"]);
    expect(view).toMatchObject({ source: "tastytrade", tone: "OFFLINE", label: "Not configured" });
    expect(view?.detail).toContain("TASTYTRADE_REFRESH_TOKEN");
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

  it("names an observed but unclassified HTTP 403 as access unproven", () => {
    const detail = "Webull Data API returned HTTP 403. Access was denied, but the failed edge was not proven.";
    const matrix = buildAthosCapabilityMatrix([
      { certification: certifySource("webull", [{ capability: "TICKS", status: "NOT_IMPLEMENTED", note: detail }]), providerTier: "CERTIFIED_NEW" },
    ], session);
    expect(matrixProviderWireView(matrix, "webull")).toEqual({
      source: "webull",
      tone: "BLOCKED",
      label: "Access unproven",
      detail,
    });
  });
});

describe("ProviderWireStrip touch truth surface", () => {
  it("keeps exact provider state accessible while compact surfaces stay calm", () => {
    const source = readFileSync(new URL("./ProviderWireStrip.tsx", import.meta.url), "utf8");
    expect(source).toContain('aria-label={`${wire.source}: ${wire.label}. ${wire.detail} Open provider readiness wireboard.`}');
    expect(source).toContain('data-provider-tone={wire.tone}');
    expect(source).toContain('href="/readiness"');
    expect(source).toContain('readJson<ReadinessPayload>("/api/broker/readiness")');
    expect(source).toContain("Inspect wire →");
    expect(source).toContain('{compact ? "Connections" : "Market data wires"}');
    expect(source).toContain('compact ? "View details →"');
    expect(source).toContain("{!compact && (");
    expect(source).toContain("WebkitLineClamp: 3");
    expect(source).not.toContain('whiteSpace: "nowrap" }}>{wire.detail}');
  });

  it("uses compact connection summaries on the chart and command deck surfaces", () => {
    const brokers = readFileSync(new URL("../broker/BrokerConnectPanel.tsx", import.meta.url), "utf8");
    const deck = readFileSync(new URL("../../app/command-deck/page.tsx", import.meta.url), "utf8");
    expect(brokers).toContain("<ProviderWireStrip compact />");
    expect(deck).toContain("<ProviderWireStrip compact />");
    expect(deck).toContain('className="wm-cd-connection-diagnostics"');
    expect(deck).toContain("Connections · provider readiness");
  });
});
