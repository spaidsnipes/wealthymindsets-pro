"use client";

import * as React from "react";
import type { SourceCertification } from "@/lib/marketData/sourceCapabilityCertification";
import type { FleetSourceCertification } from "@/lib/marketData/sourceCertificationRegistry";
import {
  selectReadinessWireboard,
  type ReadinessPayload,
} from "@/lib/broker/selectReadinessWireboard";

type WireTone = "LIVE" | "LIMITED" | "BLOCKED" | "OFFLINE" | "CHECKING";

export interface ProviderWireView {
  readonly source: string;
  readonly tone: WireTone;
  readonly label: string;
  readonly detail: string;
}

type BrokerStatus = {
  configured?: boolean;
  connected?: boolean;
  quotes?: boolean;
  realTime?: boolean | null;
  note?: string;
  sourceName?: string;
};

export type MoomooTickReceipt = {
  readonly label?: string;
  readonly detail?: string;
  readonly receiving?: boolean;
  readonly eventCount?: number;
};

export function moomooTickWireView(receipt: MoomooTickReceipt): ProviderWireView {
  const label = receipt.label?.trim().toUpperCase() || "UNKNOWN";
  const detail = receipt.detail?.trim() || "The tick receipt did not identify a provider state.";
  if (label === "RECEIVING" && receipt.receiving === true && (receipt.eventCount ?? 0) > 0) {
    return {
      source: "moomoo",
      tone: "LIMITED",
      label: "Ticks receiving",
      detail: `${receipt.eventCount} accepted provider ${receipt.eventCount === 1 ? "event" : "events"} · real-time entitlement not certified.`,
    };
  }
  if (label === "NOT CONFIGURED") {
    return { source: "moomoo", tone: "OFFLINE", label: "Not configured", detail };
  }
  if (label === "AUTH BLOCKED" || label === "BRIDGE UNREACHABLE" || label === "SUBSCRIPTION FAILED") {
    return { source: "moomoo", tone: "BLOCKED", label, detail };
  }
  if (label === "NO EVENTS RECEIVED" || label === "STALE" || label === "RECONNECTING") {
    return { source: "moomoo", tone: "LIMITED", label, detail };
  }
  return { source: "moomoo", tone: "OFFLINE", label: "Unknown", detail };
}

export function alpacaReadinessWireView(payload: ReadinessPayload | null | undefined): ProviderWireView {
  const alpacaRows = selectReadinessWireboard(payload).rows.filter((row) => row.provider.startsWith("alpaca-"));
  const ready = alpacaRows.filter((row) => row.status === "READY");
  if (ready.length > 0) {
    return {
      source: "alpaca",
      tone: "LIMITED",
      label: "Configured to attempt",
      detail: `${ready.map((row) => row.provider.replace("alpaca-", "")).join(" + ")} credentials present · no accepted live event receipt yet.`,
    };
  }
  if (alpacaRows.length > 0) {
    const missing = [...new Set(alpacaRows.flatMap((row) => row.missing))];
    return {
      source: "alpaca",
      tone: "OFFLINE",
      label: "Not configured",
      detail: missing.length > 0 ? `Missing required variables: ${missing.join(", ")}.` : "No Alpaca runtime readiness receipt returned.",
    };
  }
  return { source: "alpaca", tone: "OFFLINE", label: "Status unavailable", detail: "The readiness endpoint returned no Alpaca lanes." };
}

export function tastytradeWireView(status: BrokerStatus): ProviderWireView {
  if (status.connected && status.quotes && status.realTime === true) {
    return { source: "tastytrade", tone: "LIVE", label: "Real-time verified", detail: status.note || "Authenticated quote access and real-time entitlement verified." };
  }
  if (status.connected && status.quotes) {
    return { source: "tastytrade", tone: "LIMITED", label: "Quote token ready", detail: status.note || "Quote access is available; real-time entitlement is not yet verified." };
  }
  if (status.connected) {
    return { source: "tastytrade", tone: "LIMITED", label: "Account connected", detail: status.note || "Account access passed; streaming quote access is unavailable." };
  }
  if (status.configured) {
    return { source: "tastytrade", tone: "BLOCKED", label: "Connection failed", detail: status.note || "Credentials are configured, but the authenticated read probe failed." };
  }
  return { source: "tastytrade", tone: "OFFLINE", label: "Not runtime-wired", detail: status.note || "Required server credentials are incomplete." };
}

export function providerWireView(source: SourceCertification): ProviderWireView {
  const active = source.rows.filter((row) => row.status === "ACTIVE_CERTIFIED");
  const degraded = source.rows.filter((row) => row.status === "ACTIVE_DEGRADED");
  const blockedEntitlement = source.rows.find((row) => row.status === "BLOCKED_ENTITLEMENT");
  const blockedAuth = source.rows.find((row) => row.status === "BLOCKED_AUTH");
  if (active.length > 0) {
    return { source: source.source, tone: "LIVE", label: `${active.length} certified`, detail: active.map((row) => row.capability).join(" · ") };
  }
  if (degraded.length > 0) {
    return { source: source.source, tone: "LIMITED", label: `${degraded.length} observed`, detail: degraded.map((row) => `${row.capability} ${row.fidelity.toLowerCase()}`).join(" · ") };
  }
  if (blockedEntitlement) {
    return { source: source.source, tone: "BLOCKED", label: "Entitlement blocked", detail: blockedEntitlement.note || blockedEntitlement.capability };
  }
  if (blockedAuth) {
    return { source: source.source, tone: "BLOCKED", label: "Authentication blocked", detail: blockedAuth.note || blockedAuth.capability };
  }
  return { source: source.source, tone: "OFFLINE", label: "Not runtime-wired", detail: source.rows.find((row) => row.note)?.note || "No capability evidence returned." };
}

const TONE_COLOR: Record<WireTone, string> = {
  LIVE: "#46d39a",
  LIMITED: "#f0b429",
  BLOCKED: "#ff6b6b",
  OFFLINE: "#8b92ac",
  CHECKING: "#8b92ac",
};

export default function ProviderWireStrip({ compact = false }: { readonly compact?: boolean }) {
  const [fleet, setFleet] = React.useState<FleetSourceCertification | null>(null);
  const [tastytrade, setTastytrade] = React.useState<BrokerStatus | null>(null);
  const [moomooTicks, setMoomooTicks] = React.useState<MoomooTickReceipt | null>(null);
  const [readiness, setReadiness] = React.useState<ReadinessPayload | null>(null);
  const [failures, setFailures] = React.useState<ReadonlySet<string>>(() => new Set());

  React.useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const recordFailure = (source: string, error: unknown) => {
      if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
      setFailures((current) => new Set(current).add(source));
    };
    const clearFailure = (source: string) => {
      if (!active) return;
      setFailures((current) => {
        if (!current.has(source)) return current;
        const next = new Set(current);
        next.delete(source);
        return next;
      });
    };
    const readJson = async <T,>(url: string): Promise<T> => {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<T>;
    };
    const readMoomooReceipt = async (): Promise<MoomooTickReceipt> => {
      const response = await fetch("/api/market-data/moomoo/ticks?symbol=TSLA", { cache: "no-store", signal: controller.signal });
      const body = await response.json().catch(() => null) as MoomooTickReceipt | null;
      if (body?.label) return body;
      if (response.status === 401 || response.status === 403) {
        return { label: "AUTH BLOCKED", detail: "Sign in is required for the authenticated Moomoo tick receipt.", receiving: false, eventCount: 0 };
      }
      if (!response.ok) return { label: "UNKNOWN", detail: `The Moomoo tick route returned HTTP ${response.status}.`, receiving: false, eventCount: 0 };
      return { label: "UNKNOWN", detail: "The Moomoo tick route returned no classified receipt.", receiving: false, eventCount: 0 };
    };
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void readJson<FleetSourceCertification>("/api/market-data/certification")
        .then((body) => { if (active) setFleet(body); clearFailure("market"); })
        .catch((error: unknown) => recordFailure("market", error));
      void readJson<BrokerStatus>("/api/broker/tastytrade/status")
        .then((body) => { if (active) setTastytrade(body); clearFailure("tastytrade"); })
        .catch((error: unknown) => recordFailure("tastytrade", error));
      void readMoomooReceipt()
        .then((body) => { if (active) setMoomooTicks(body); clearFailure("moomoo"); })
        .catch((error: unknown) => recordFailure("moomoo", error));
      void readJson<ReadinessPayload>("/api/broker/readiness")
        .then((body) => { if (active) setReadiness(body); clearFailure("readiness"); })
        .catch((error: unknown) => recordFailure("readiness", error));
    };

    refresh();
    const interval = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      controller.abort();
    };
  }, []);

  const marketWires: ProviderWireView[] = failures.has("market") && !fleet
    ? [
        { source: "moomoo", tone: "OFFLINE", label: "Status unavailable", detail: "The read-only certification probe did not return." },
        { source: "webull", tone: "OFFLINE", label: "Status unavailable", detail: "The read-only certification probe did not return." },
      ]
    : fleet?.sources.map(providerWireView) ?? [
        { source: "moomoo", tone: "CHECKING", label: "Checking", detail: "Read-only runtime probe in progress." },
        { source: "webull", tone: "CHECKING", label: "Checking", detail: "Read-only runtime probe in progress." },
      ];
  const moomooWire = failures.has("moomoo") && !moomooTicks
    ? { source: "moomoo", tone: "OFFLINE" as const, label: "Status unavailable", detail: "The authenticated tick receipt did not return." }
    : moomooTicks ? moomooTickWireView(moomooTicks) : null;
  const wires = [
    ...marketWires.map((wire) => wire.source === "moomoo" && moomooWire ? moomooWire : wire),
    failures.has("tastytrade") && !tastytrade
      ? { source: "tastytrade", tone: "OFFLINE" as const, label: "Status unavailable", detail: "The authenticated broker probe did not return." }
      : tastytrade ? tastytradeWireView(tastytrade) : { source: "tastytrade", tone: "CHECKING" as const, label: "Checking", detail: "Read-only connection probe in progress." },
    failures.has("readiness") && !readiness
      ? { source: "alpaca", tone: "OFFLINE" as const, label: "Status unavailable", detail: "The presence-only readiness receipt did not return." }
      : readiness ? alpacaReadinessWireView(readiness) : { source: "alpaca", tone: "CHECKING" as const, label: "Checking", detail: "Presence-only readiness probe in progress." },
  ];

  return (
    <section aria-label="Market data provider wires" style={{ marginTop: compact ? 0 : 8, border: "1px solid rgba(240,180,41,0.18)", borderRadius: compact ? 0 : 10, background: "rgba(5,5,6,0.76)", padding: compact ? "6px 10px" : "9px 10px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
        <span style={{ color: "#f0b429", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Market data wires</span>
        <span style={{ color: "#777f96", fontSize: 9 }}>read-only · capability truth</span>
      </div>
      <div style={compact
        ? { display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "thin" }
        : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 7 }}>
        {wires.map((wire) => (
          <div key={wire.source} title={wire.detail} style={{ minWidth: compact ? 190 : 0, flex: compact ? "1 0 190px" : undefined, border: "1px solid rgba(139,146,172,0.14)", borderRadius: 8, padding: compact ? "5px 7px" : "7px 8px", background: "rgba(255,255,255,0.018)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "#d9dce7", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{wire.source}</span>
              <span style={{ color: TONE_COLOR[wire.tone], fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>{wire.label}</span>
            </div>
            <div style={{ color: "#8b92ac", fontSize: 9, lineHeight: 1.35, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wire.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
