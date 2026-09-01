import {
  MARKET_EVENT_SCHEMA_VERSION,
  type CanonicalMarketEvent,
  type MarketDataMode,
} from "../marketEvent";
import { UNKNOWN_RIGHTS_POLICY_ID } from "../capabilityRegistry";
import { certifySource, type SourceCertification } from "../sourceCapabilityCertification";

export type LongbridgeWireLabel =
  | "NOT CONFIGURED"
  | "AUTH BLOCKED"
  | "BRIDGE UNREACHABLE"
  | "NO EVENTS RECEIVED"
  | "STALE"
  | "RECEIVING"
  | "UNKNOWN";

export interface LongbridgeTradeRow {
  readonly price?: unknown;
  readonly volume?: unknown;
  readonly timestamp?: unknown;
  readonly trade_type?: unknown;
  readonly direction?: unknown;
  readonly trade_session?: unknown;
}

export interface LongbridgeTicksEnvelope {
  readonly ok?: unknown;
  readonly trades?: unknown;
  readonly error?: unknown;
}

export interface LongbridgeTicksConfig {
  readonly bridgeUrl?: string;
  readonly bridgeToken?: string;
  readonly timeoutMs?: number;
}

export interface LongbridgeWireStatus {
  readonly label: LongbridgeWireLabel;
  readonly detail: string;
  readonly receiving: boolean;
  readonly eventCount: number;
}

export interface LongbridgeTicksResult {
  readonly status: LongbridgeWireStatus;
  readonly events: readonly CanonicalMarketEvent[];
}

const positive = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

function providerTimestamp(value: unknown): number | null {
  if (typeof value === "number") return value > 10_000_000_000 ? value : value * 1000;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeLongbridgeTrade(
  row: LongbridgeTradeRow,
  providerCode: string,
  appSymbol: string,
  dataMode: MarketDataMode,
  receivedAtMs: number,
  processedAtMs: number,
  index: number,
): CanonicalMarketEvent | null {
  const price = positive(row.price);
  const size = positive(row.volume);
  const timestamp = providerTimestamp(row.timestamp);
  if (price == null || size == null || timestamp == null || timestamp > receivedAtMs + 5 * 60_000) return null;
  const normalizedSymbol = providerCode.replace(/\.[A-Z]{2,3}$/i, "").toUpperCase();
  if (normalizedSymbol !== appSymbol.toUpperCase()) return null;
  const tradeType = typeof row.trade_type === "string" && row.trade_type.trim() ? row.trade_type.trim() : undefined;
  const direction = typeof row.direction === "string" ? row.direction.trim() : "";
  return {
    schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
    normalizationVersion: "longbridge-trades.v1",
    eventId: `longbridge:${providerCode}:${timestamp}:${price}:${size}:${index}`,
    symbol: appSymbol,
    normalizedSymbol,
    assetClass: "equity",
    contractId: providerCode,
    providerClass: "BROKER",
    providerPath: "longbridge-openapi-bridge",
    eventType: "TRADE",
    timestampProvider: timestamp,
    timestampReceived: receivedAtMs,
    timestampProcessed: processedAtMs,
    availableAt: processedAtMs,
    sequenceState: "UNAVAILABLE",
    price,
    size,
    volume: size,
    tradeConditions: tradeType ? [tradeType] : undefined,
    aggressorMethod: "NONE",
    sourceClass: "PRIMARY",
    dataMode,
    fidelityClass: "OBSERVED",
    rightsPolicyId: UNKNOWN_RIGHTS_POLICY_ID,
    rawLineageRef: direction ? `longbridge:tick-direction:${direction}` : "longbridge:trade",
  };
}

export async function readLongbridgeTicks(
  fetchImpl: typeof fetch,
  config: LongbridgeTicksConfig,
  params: { providerCode: string; appSymbol: string; count?: number; dataMode?: MarketDataMode },
  receivedAtMs = Date.now(),
  processedAtMs = Date.now(),
): Promise<LongbridgeTicksResult> {
  const base = (config.bridgeUrl ?? "").replace(/\/+$/, "");
  const none = (label: LongbridgeWireLabel, detail: string): LongbridgeTicksResult => ({
    status: { label, detail, receiving: false, eventCount: 0 },
    events: [],
  });
  if (!base || !config.bridgeToken) {
    return none("NOT CONFIGURED", "Longbridge bridge URL or shared token is not set in this runtime.");
  }
  const count = Math.max(1, Math.min(1000, Math.trunc(params.count ?? 100)));
  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 5_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${base}/ticks?symbol=${encodeURIComponent(params.providerCode)}&count=${count}`, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${config.bridgeToken}` },
      signal: controller.signal,
    });
    let body: LongbridgeTicksEnvelope | null = null;
    try { body = await response.json() as LongbridgeTicksEnvelope; } catch { body = null; }
    const error = typeof body?.error === "string" ? body.error.trim() : "";
    if (response.status === 401 || response.status === 403) return none("AUTH BLOCKED", error || "Longbridge bridge rejected the read credential.");
    if (!response.ok || body?.ok !== true || !Array.isArray(body.trades)) {
      return none("UNKNOWN", error || `Longbridge bridge returned HTTP ${response.status}.`);
    }
    const mode = params.dataMode ?? "DELAYED";
    const events = body.trades.flatMap((raw, index) => {
      const event = normalizeLongbridgeTrade(raw as LongbridgeTradeRow, params.providerCode, params.appSymbol, mode, receivedAtMs, processedAtMs, index);
      return event ? [event] : [];
    });
    if (events.length === 0) return none("NO EVENTS RECEIVED", "Longbridge answered, but no usable executed prints were returned.");
    const newest = Math.max(...events.map((event) => event.timestampProvider ?? 0));
    if (processedAtMs - newest > 30_000) return none("STALE", "Longbridge prints were observed, but the newest provider timestamp is older than 30 seconds.");
    return {
      status: { label: "RECEIVING", detail: `${events.length} Longbridge executed prints normalized; realtime entitlement is not yet certified.`, receiving: true, eventCount: events.length },
      events,
    };
  } catch (error) {
    return none("BRIDGE UNREACHABLE", controller.signal.aborted ? `Longbridge bridge timed out after ${timeoutMs} ms.` : error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

export async function probeLongbridgeMarketData(
  fetchImpl: typeof fetch,
  config: LongbridgeTicksConfig & { canarySymbol?: string },
): Promise<SourceCertification> {
  const canary = (config.canarySymbol || "TSLA").toUpperCase();
  const result = await readLongbridgeTicks(fetchImpl, config, { providerCode: `${canary}.US`, appSymbol: canary, count: 20 });
  const observedAt = new Date().toISOString();
  if (result.status.receiving) {
    return certifySource("longbridge", [
      { capability: "TICKS", status: "ACTIVE_DEGRADED", fidelity: "DELAYED", observedAt, note: result.status.detail },
      { capability: "EXECUTED_VOLUME", status: "ACTIVE_DEGRADED", fidelity: "DELAYED", observedAt, note: result.status.detail },
    ]);
  }
  return certifySource("longbridge", [
    { capability: "TICKS", status: result.status.label === "AUTH BLOCKED" ? "BLOCKED_AUTH" : "NOT_IMPLEMENTED", fidelity: "NONE", observedAt, note: `${result.status.label} — ${result.status.detail}` },
  ]);
}
