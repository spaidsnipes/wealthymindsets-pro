"use client";

import * as React from "react";
import Link from "next/link";
import type { SourceCertification } from "@/lib/marketData/sourceCapabilityCertification";
import type { AthosCapabilityMatrix } from "@/lib/marketData/canonicalCapabilityResolver";
import { readClassifiedJsonReceipt, readJsonReceipt } from "@/lib/marketData/readJsonReceipt";
import {
  selectReadinessWireboard,
  type ReadinessPayload,
} from "@/lib/broker/selectReadinessWireboard";

type WireTone = "LIVE" | "LIMITED" | "BLOCKED" | "OFFLINE" | "CHECKING" | "SUSPENDED";

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
  if (label === "AUTH BLOCKED" || label === "ACCESS UNPROVEN" || label === "BRIDGE UNREACHABLE" || label === "SUBSCRIPTION FAILED") {
    return { source: "moomoo", tone: "BLOCKED", label, detail };
  }
  if (label === "PROVIDER ERROR") {
    return { source: "moomoo", tone: "OFFLINE", label: "Provider error", detail };
  }
  if (label === "NO EVENTS RECEIVED" || label === "STALE" || label === "RECONNECTING") {
    return { source: "moomoo", tone: "LIMITED", label, detail };
  }
  if (label === "RATE LIMITED") {
    return { source: "moomoo", tone: "LIMITED", label: "Rate limited", detail };
  }
  return { source: "moomoo", tone: "OFFLINE", label: "Unknown", detail };
}

export function classifyProviderReceiptFailure(
  status: number,
  source: "moomoo" | "longbridge",
): MoomooTickReceipt {
  const name = source === "moomoo" ? "Moomoo" : "Longbridge";
  if (status === 401) {
    return {
      label: "AUTH BLOCKED",
      detail: `The authenticated ${name} tick route returned HTTP 401.`,
      receiving: false,
      eventCount: 0,
    };
  }
  if (status === 403) {
    return {
      label: "ACCESS UNPROVEN",
      detail: `${name} denied the tick request with HTTP 403, but the failed edge (authorization, subscription, entitlement, or policy) was not proven.`,
      receiving: false,
      eventCount: 0,
    };
  }
  if (status === 429) {
    return {
      label: "RATE LIMITED",
      detail: `The authenticated ${name} tick route returned HTTP 429. The provider did not return a tick receipt.`,
      receiving: false,
      eventCount: 0,
    };
  }
  if (status >= 500) {
    return {
      label: "PROVIDER ERROR",
      detail: `The authenticated ${name} tick route returned HTTP ${status} before a tick receipt was returned.`,
      receiving: false,
      eventCount: 0,
    };
  }
  return {
    label: "UNKNOWN",
    detail: `The ${name} tick route returned HTTP ${status}.`,
    receiving: false,
    eventCount: 0,
  };
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

/**
 * A withdrawn receipt has TWO causes and they are not the same claim.
 *
 * A probe that is genuinely in flight is CHECKING. A probe this surface
 * deliberately declined to issue — because the document is hidden and polling
 * a backgrounded tab burns a phone's battery and a provider's rate limit — is
 * SUSPENDED. Rendering the second as "Canonical capability receipt in
 * progress." states that work is happening when no request exists.
 *
 * This is not a rare edge on a phone. iOS marks the tab hidden on every app
 * switch, screen lock and notification-shade pull, and `visibilitychange`
 * invalidates the previous receipt on the way out. So the trader who comes
 * back to WM Pro is told his wires are being checked at the exact moment
 * nothing is being checked.
 *
 * SUSPENDED must therefore also carry its own recovery: the reason it stopped
 * and the action that restarts it.
 */
export function suspendedProviderWireView(source: string): ProviderWireView {
  return {
    source,
    tone: "SUSPENDED",
    label: "Paused",
    detail: "Not checked while this surface is in the background. Reopen it to re-probe the wire.",
  };
}

export function matrixProviderWireView(
  matrix: AthosCapabilityMatrix | null | undefined,
  source: string,
): ProviderWireView {
  if (!matrix) return { source, tone: "CHECKING", label: "Checking", detail: "Canonical capability receipt in progress." };
  const selected = matrix.capabilities.filter((row) => row.provider === source);
  if (selected.length > 0) {
    const certifiedCount = selected.filter((row) => row.status === "ACTIVE_CERTIFIED" && row.fidelity === "REALTIME").length;
    const observedCount = selected.length - certifiedCount;
    return {
      source,
      tone: certifiedCount > 0 ? "LIVE" : "LIMITED",
      label: certifiedCount > 0
        ? `${certifiedCount} certified${observedCount > 0 ? ` · ${observedCount} observed` : ""}`
        : `${observedCount} observed`,
      detail: selected.map((row) => `${row.capability} ${row.fidelity.toLowerCase()}`).join(" · "),
    };
  }
  const rejected = matrix.capabilities.flatMap((row) => row.rejectedSources).filter((row) => row.source === source);
  const auth = rejected.find((row) => row.reason.includes("BLOCKED_AUTH"));
  if (auth) return { source, tone: "BLOCKED", label: "Authentication blocked", detail: auth.note || auth.reason };
  const entitlement = rejected.find((row) => row.reason.includes("BLOCKED_ENTITLEMENT"));
  if (entitlement) return { source, tone: "BLOCKED", label: "Entitlement blocked", detail: entitlement.note || entitlement.reason };
  const detail = rejected.find((row) => row.note)?.note || rejected[0]?.reason || "No canonical capability evidence returned.";
  // A negative runtime receipt is more useful than the internal default
  // NOT_IMPLEMENTED classification used for capability rows with no accepted
  // observation. Preserve the witnessed edge on the compact wireboard: a
  // provider failure, deadline, rate limit, stale print, or empty response is
  // not the same claim as an unwired adapter.
  if (/\bHTTP 5\d\d\b|provider (?:failed|error)|unrecognized .*envelope/i.test(detail)) {
    return { source, tone: "OFFLINE", label: "Provider error", detail };
  }
  if (/\b(?:timed? out|deadline exceeded|did not respond within)\b/i.test(detail)) {
    return { source, tone: "OFFLINE", label: "Timed out", detail };
  }
  if (/\b(?:HTTP 429|rate limit)/i.test(detail)) {
    return { source, tone: "LIMITED", label: "Rate limited", detail };
  }
  if (/\bno (?:valid,? )?(?:symbol-matched )?(?:tick )?(?:observations|events|prints)\b/i.test(detail)) {
    return { source, tone: "LIMITED", label: "No events", detail };
  }
  if (/\bstale (?:prints?|data)|prints? .* old\b/i.test(detail)) {
    return { source, tone: "LIMITED", label: "Stale data", detail };
  }
  // A provider-denied request is more specific than the generic absence of
  // observations, even when the provider did not identify whether policy,
  // permission, or subscription caused the denial. Keep that uncertainty
  // explicit instead of flattening a witnessed HTTP 403 into "Not receiving".
  if (/HTTP 403/i.test(detail) && /not proven/i.test(detail)) {
    return { source, tone: "BLOCKED", label: "Access unproven", detail };
  }
  return { source, tone: "OFFLINE", label: rejected.length > 0 ? "Not receiving" : "Status unavailable", detail };
}

export const PROVIDER_SOURCES = ["moomoo", "longbridge", "webull", "tastytrade", "alpaca"] as const;

export interface ProviderWireInputs {
  readonly matrix: AthosCapabilityMatrix | null;
  readonly readiness: ReadinessPayload | null;
  readonly moomooTicks: MoomooTickReceipt | null;
  readonly longbridgeTicks: MoomooTickReceipt | null;
  readonly failures: ReadonlySet<string>;
  readonly suspended: boolean;
}

/**
 * The single owner of which claim a wire is allowed to make.
 *
 * This lived inline in the render body, which meant the precedence between
 * "paused", "failed" and "observed" could only be checked by reading JSX. It
 * is the rule most likely to produce a beautiful lie, so it gets to be a
 * function with a name and a test.
 */
export function selectProviderWires(inputs: ProviderWireInputs): ProviderWireView[] {
  const { matrix, readiness, moomooTicks, longbridgeTicks, failures, suspended } = inputs;

  // A pause may only speak for a strip holding NO verdict at all — no receipt
  // and no observed failure. "We stopped checking" must never erase "we
  // checked, and it was blocked". Those were earned; a pause is the absence
  // of work, and absence of work outranks nothing.
  const holdsNoVerdict = !matrix && !readiness && !moomooTicks && !longbridgeTicks && failures.size === 0;
  if (suspended && holdsNoVerdict) {
    return PROVIDER_SOURCES.map((source) => suspendedProviderWireView(source));
  }

  const marketWires: ProviderWireView[] = failures.has("market") && !matrix
    ? PROVIDER_SOURCES.map((source) => ({ source, tone: "OFFLINE" as const, label: "Status unavailable", detail: "The canonical capability probe did not return." }))
    : PROVIDER_SOURCES.map((source) => matrixProviderWireView(matrix, source));
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

  return marketWires.map((wire) => {
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
  });
}

const TONE_COLOR: Record<WireTone, string> = {
  LIVE: "#46d39a",
  LIMITED: "#f0b429",
  BLOCKED: "#ff6b6b",
  OFFLINE: "#8b92ac",
  CHECKING: "#8b92ac",
  // Deliberately dimmer than CHECKING. A paused wire is not a wire being
  // worked on, and the colour must not imply motion that is not happening.
  SUSPENDED: "#6b7189",
};

export default function ProviderWireStrip({ compact = false }: { readonly compact?: boolean }) {
  const [matrix, setMatrix] = React.useState<AthosCapabilityMatrix | null>(null);
  const [readiness, setReadiness] = React.useState<ReadinessPayload | null>(null);
  const [moomooTicks, setMoomooTicks] = React.useState<MoomooTickReceipt | null>(null);
  const [longbridgeTicks, setLongbridgeTicks] = React.useState<MoomooTickReceipt | null>(null);
  const [failures, setFailures] = React.useState<ReadonlySet<string>>(() => new Set());
  // Declared LAST on purpose: the refresh lifecycle tests address this
  // component's state positionally, so a new hook inserted above would
  // silently renumber the receipts they assert on.
  const [suspended, setSuspended] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let refreshing = false;
    let visibilityRevision = 0;
    const isHidden = () => document.visibilityState === "hidden";
    const invalidateReceipts = () => {
      setMatrix(null);
      setReadiness(null);
      setMoomooTicks(null);
      setLongbridgeTicks(null);
    };

    const recordFailure = (source: string, error: unknown) => {
      if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
      // A failed refresh invalidates the previous receipt. Retaining it here
      // would keep an earlier receiving/certified claim on screen indefinitely.
      if (source === "market") setMatrix(null);
      if (source === "readiness") setReadiness(null);
      if (source === "moomoo") setMoomooTicks(null);
      if (source === "longbridge") setLongbridgeTicks(null);
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
    const readJson = <T,>(url: string): Promise<T> =>
      readJsonReceipt<T>(fetch, url, controller.signal);
    const readProviderReceipt = async (source: "moomoo" | "longbridge"): Promise<MoomooTickReceipt> => {
      const response = await readClassifiedJsonReceipt<MoomooTickReceipt>(
        fetch,
        `/api/market-data/${source}/ticks?symbol=TSLA`,
        controller.signal,
      );
      const body = response.body;
      if (body?.label) return body;
      if (!response.ok) return classifyProviderReceiptFailure(response.status, source);
      return { label: "UNKNOWN", detail: `The ${source === "moomoo" ? "Moomoo" : "Longbridge"} tick route returned no classified receipt.`, receiving: false, eventCount: 0 };
    };
    const refresh = async () => {
      // Report the suspension at the exact point it is decided. Setting this
      // anywhere else lets the flag and the actual probing behaviour drift.
      if (active) setSuspended(isHidden());
      if (!active || refreshing || isHidden()) return;
      refreshing = true;
      const revision = visibilityRevision;
      const acceptsReceipt = () => active && revision === visibilityRevision && !isHidden();
      invalidateReceipts();
      // Interval and foreground events share one bounded request batch so an
      // older response cannot overwrite a newer failure or recovery receipt.
      await Promise.allSettled([
      readJson<AthosCapabilityMatrix>("/api/athos/market-data/capabilities")
        .then((body) => { if (acceptsReceipt()) { setMatrix(body); clearFailure("market"); } })
        .catch((error: unknown) => recordFailure("market", error)),
      readJson<ReadinessPayload>("/api/broker/readiness")
        .then((body) => { if (acceptsReceipt()) { setReadiness(body); clearFailure("readiness"); } })
        .catch((error: unknown) => recordFailure("readiness", error)),
      readProviderReceipt("moomoo")
        .then((body) => { if (acceptsReceipt()) { setMoomooTicks(body); clearFailure("moomoo"); } })
        .catch((error: unknown) => recordFailure("moomoo", error)),
      readProviderReceipt("longbridge")
        .then((body) => { if (acceptsReceipt()) { setLongbridgeTicks(body); clearFailure("longbridge"); } })
        .catch((error: unknown) => recordFailure("longbridge", error)),
      ]);
      // A background response must not leave a current-looking receipt ready
      // for the next foreground render. Recheck on return to the app.
      if (active && isHidden()) { invalidateReceipts(); setSuspended(true); }
      refreshing = false;
      if (active && revision !== visibilityRevision && !isHidden()) void refresh();
    };

    const visibilityChanged = () => {
      visibilityRevision += 1;
      invalidateReceipts();
      void refresh();
    };

    refresh();
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibilityChanged);
      controller.abort();
    };
  }, []);

  const wires = selectProviderWires({ matrix, readiness, moomooTicks, longbridgeTicks, failures, suspended });

  return (
    <section aria-label="Market data provider wires" style={{ marginTop: compact ? 0 : 8, border: "1px solid rgba(240,180,41,0.18)", borderRadius: compact ? 8 : 10, background: "rgba(5,5,6,0.76)", padding: compact ? "6px 8px" : "9px 10px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: compact ? 5 : 7 }}>
        <span style={{ color: "#f0b429", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>{compact ? "Connections" : "Market data wires"}</span>
        <Link href="/readiness" style={{ color: "#8b92ac", fontSize: 9, textDecoration: "none", whiteSpace: "nowrap" }}>{compact ? "View details →" : "read-only · capability truth"}</Link>
      </div>
      <div style={compact
        ? { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 7 }
        : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 7 }}>
        {wires.map((wire) => (
          <Link
            key={wire.source}
            href="/readiness"
            title={wire.detail}
            aria-label={`${wire.source}: ${wire.label}. ${wire.detail} Open provider readiness wireboard.`}
            data-provider={wire.source}
            data-provider-tone={wire.tone}
            style={{ minWidth: 0, border: "1px solid rgba(240,180,41,0.18)", borderRadius: 8, padding: compact ? "6px 8px" : "7px 8px", background: "linear-gradient(145deg, rgba(240,180,41,0.045), rgba(255,255,255,0.012))", textDecoration: "none" }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "#d9dce7", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{wire.source}</span>
              <span style={{ color: TONE_COLOR[wire.tone], fontSize: 9, fontWeight: 800, overflowWrap: "anywhere" }}>{wire.label}</span>
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
