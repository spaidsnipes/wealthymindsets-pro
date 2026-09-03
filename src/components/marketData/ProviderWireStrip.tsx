"use client";

import * as React from "react";
import Link from "next/link";
import type { SourceCertification } from "@/lib/marketData/sourceCapabilityCertification";
import type { AthosCapabilityMatrix } from "@/lib/marketData/canonicalCapabilityResolver";
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

export function longbridgeTickWireView(receipt: MoomooTickReceipt): ProviderWireView {
  const view = moomooTickWireView(receipt);
  return {
    ...view,
    source: "longbridge",
    detail: view.label === "Ticks receiving"
      ? `${receipt.eventCount} accepted Longbridge executed prints · realtime entitlement not certified.`
      : receipt.detail?.trim() || "The Longbridge receipt did not identify a provider state.",
  };
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

export function providerConfigReadinessWireView(
  payload: ReadinessPayload | null | undefined,
  source: string,
  providerIds: readonly string[],
): ProviderWireView | null {
  const rows = selectReadinessWireboard(payload).rows.filter((row) => providerIds.includes(row.provider));
  if (rows.length === 0) return null;
  const ready = rows.filter((row) => row.status === "READY");
  if (ready.length > 0) {
    return {
      source,
      tone: "LIMITED",
      label: "Configured to attempt",
      detail: "Required credential names are present · no accepted provider event receipt yet.",
    };
  }
  const missing = [...new Set(rows.flatMap((row) => row.missing))];
  return {
    source,
    tone: "OFFLINE",
    label: "Not configured",
    detail: missing.length > 0
      ? `Missing required variables: ${missing.join(", ")}.`
      : "The runtime readiness receipt did not prove required configuration.",
  };
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

export function matrixProviderWireView(
  matrix: AthosCapabilityMatrix | null | undefined,
  source: string,
): ProviderWireView {
  if (!matrix) return { source, tone: "CHECKING", label: "Checking", detail: "Canonical capability receipt in progress." };
  const selected = matrix.capabilities.filter((row) => row.provider === source);
  if (selected.length > 0) {
    const certifiedRealtime = selected.some((row) => row.status === "ACTIVE_CERTIFIED" && row.fidelity === "REALTIME");
    return {
      source,
      tone: certifiedRealtime ? "LIVE" : "LIMITED",
      label: certifiedRealtime ? `${selected.length} certified` : `${selected.length} observed`,
      detail: selected.map((row) => `${row.capability} ${row.fidelity.toLowerCase()}`).join(" · "),
    };
  }
  const rejected = matrix.capabilities.flatMap((row) => row.rejectedSources).filter((row) => row.source === source);
  const auth = rejected.find((row) => row.reason.includes("BLOCKED_AUTH"));
  if (auth) return { source, tone: "BLOCKED", label: "Authentication blocked", detail: auth.note || auth.reason };
  const entitlement = rejected.find((row) => row.reason.includes("BLOCKED_ENTITLEMENT"));
  if (entitlement) return { source, tone: "BLOCKED", label: "Entitlement blocked", detail: entitlement.note || entitlement.reason };
  const detail = rejected.find((row) => row.note)?.note || rejected[0]?.reason || "No canonical capability evidence returned.";
  // A provider-denied request is more specific than the generic absence of
  // observations, even when the provider did not identify whether policy,
  // permission, or subscription caused the denial. Keep that uncertainty
  // explicit instead of flattening a witnessed HTTP 403 into "Not receiving".
  if (/HTTP 403/i.test(detail) && /not proven/i.test(detail)) {
    return { source, tone: "BLOCKED", label: "Access unproven", detail };
  }
  return { source, tone: "OFFLINE", label: rejected.length > 0 ? "Not receiving" : "Status unavailable", detail };
}

const TONE_COLOR: Record<WireTone, string> = {
  LIVE: "#46d39a",
  LIMITED: "#f0b429",
  BLOCKED: "#ff6b6b",
  OFFLINE: "#8b92ac",
  CHECKING: "#8b92ac",
};

export default function ProviderWireStrip({ compact = false }: { readonly compact?: boolean }) {
  const [matrix, setMatrix] = React.useState<AthosCapabilityMatrix | null>(null);
  const [readiness, setReadiness] = React.useState<ReadinessPayload | null>(null);
  const [moomooTicks, setMoomooTicks] = React.useState<MoomooTickReceipt | null>(null);
  const [longbridgeTicks, setLongbridgeTicks] = React.useState<MoomooTickReceipt | null>(null);
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
    const readProviderReceipt = async (source: "moomoo" | "longbridge"): Promise<MoomooTickReceipt> => {
      const response = await fetch(`/api/market-data/${source}/ticks?symbol=TSLA`, { cache: "no-store", signal: controller.signal });
      const body = await response.json().catch(() => null) as MoomooTickReceipt | null;
      if (body?.label) return body;
      if (response.status === 401 || response.status === 403) {
        return { label: "AUTH BLOCKED", detail: `Sign in is required for the authenticated ${source === "moomoo" ? "Moomoo" : "Longbridge"} tick receipt.`, receiving: false, eventCount: 0 };
      }
      if (!response.ok) return { label: "UNKNOWN", detail: `The ${source === "moomoo" ? "Moomoo" : "Longbridge"} tick route returned HTTP ${response.status}.`, receiving: false, eventCount: 0 };
      return { label: "UNKNOWN", detail: `The ${source === "moomoo" ? "Moomoo" : "Longbridge"} tick route returned no classified receipt.`, receiving: false, eventCount: 0 };
    };
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void readJson<AthosCapabilityMatrix>("/api/athos/market-data/capabilities")
        .then((body) => { if (active) setMatrix(body); clearFailure("market"); })
        .catch((error: unknown) => recordFailure("market", error));
      void readJson<ReadinessPayload>("/api/broker/readiness")
        .then((body) => { if (active) setReadiness(body); clearFailure("readiness"); })
        .catch((error: unknown) => recordFailure("readiness", error));
      void readProviderReceipt("moomoo")
        .then((body) => { if (active) setMoomooTicks(body); clearFailure("moomoo"); })
        .catch((error: unknown) => recordFailure("moomoo", error));
      void readProviderReceipt("longbridge")
        .then((body) => { if (active) setLongbridgeTicks(body); clearFailure("longbridge"); })
        .catch((error: unknown) => recordFailure("longbridge", error));
    };

    refresh();
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      controller.abort();
    };
  }, []);

  const providerSources = ["moomoo", "longbridge", "webull", "tastytrade", "alpaca"] as const;
  const marketWires: ProviderWireView[] = failures.has("market") && !matrix
    ? providerSources.map((source) => ({ source, tone: "OFFLINE", label: "Status unavailable", detail: "The canonical capability probe did not return." }))
    : providerSources.map((source) => matrixProviderWireView(matrix, source));
  const moomooWire = failures.has("moomoo") && !moomooTicks
    ? { source: "moomoo", tone: "OFFLINE" as const, label: "Status unavailable", detail: "The authenticated tick receipt did not return." }
    : moomooTicks ? moomooTickWireView(moomooTicks) : null;
  const longbridgeWire = failures.has("longbridge") && !longbridgeTicks
    ? { source: "longbridge", tone: "OFFLINE" as const, label: "Status unavailable", detail: "The authenticated Longbridge tick receipt did not return." }
    : longbridgeTicks ? longbridgeTickWireView(longbridgeTicks) : null;
  const readinessOverrides = {
    tastytrade: providerConfigReadinessWireView(readiness, "tastytrade", ["tastytrade"]),
    alpaca: providerConfigReadinessWireView(readiness, "alpaca", ["alpaca-paper", "alpaca-live"]),
  } as const;
  const wires = [
    ...marketWires.map((wire) => {
      if (wire.source === "moomoo" && moomooWire) return moomooWire;
      if (wire.source === "longbridge" && longbridgeWire) return longbridgeWire;
      if (wire.source === "tastytrade" || wire.source === "alpaca") {
        const override = readinessOverrides[wire.source];
        // Missing required configuration is a more exact cause than a generic
        // no-receipt result. Never replace an observed/auth/entitlement probe,
        // and never promote configured-to-attempt over a failed live probe.
        if (override && override.tone === "OFFLINE" && wire.tone === "OFFLINE") return override;
        if (override && (wire.label === "Status unavailable" || wire.label === "Not runtime-wired")) return override;
      }
      return wire;
    }),
  ];

  return (
    <section aria-label="Market data provider wires" style={{ marginTop: compact ? 0 : 8, border: "1px solid rgba(240,180,41,0.18)", borderRadius: compact ? 8 : 10, background: "rgba(5,5,6,0.76)", padding: compact ? "6px 8px" : "9px 10px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: compact ? 5 : 7 }}>
        <span style={{ color: "#f0b429", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>{compact ? "Connections" : "Market data wires"}</span>
        <Link href="/readiness" style={{ color: "#8b92ac", fontSize: 9, textDecoration: "none", whiteSpace: "nowrap" }}>{compact ? "View details →" : "read-only · capability truth"}</Link>
      </div>
      <div style={compact
        ? { display: "flex", gap: 7, overflowX: "auto", scrollbarWidth: "thin" }
        : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 7 }}>
        {wires.map((wire) => (
          <Link
            key={wire.source}
            href="/readiness"
            title={wire.detail}
            aria-label={`${wire.source}: ${wire.label}. ${wire.detail} Open provider readiness wireboard.`}
            data-provider={wire.source}
            data-provider-tone={wire.tone}
            style={{ minWidth: compact ? 126 : 0, flex: compact ? "1 0 126px" : undefined, border: "1px solid rgba(240,180,41,0.18)", borderRadius: 8, padding: compact ? "6px 8px" : "7px 8px", background: "linear-gradient(145deg, rgba(240,180,41,0.045), rgba(255,255,255,0.012))", textDecoration: "none" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "#d9dce7", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{wire.source}</span>
              <span style={{ color: TONE_COLOR[wire.tone], fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>{wire.label}</span>
            </div>
            {!compact && (
              <>
                <div style={{ color: "#8b92ac", fontSize: 9, lineHeight: 1.35, marginTop: 4, overflow: "hidden", overflowWrap: "anywhere", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3 }}>{wire.detail}</div>
                <div style={{ color: "rgba(240,180,41,0.74)", fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", marginTop: 5, textTransform: "uppercase" }}>Inspect wire →</div>
              </>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
