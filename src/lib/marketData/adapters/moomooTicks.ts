/**
 * moomooTicks — normalize the moomoo-bridge /ticks envelope into canonical
 * TRADE events (`CanonicalMarketEvent`, schema wm.market-event.v2).
 *
 *     services/moomoo-bridge (do_GET /ticks) ──▶ THIS normalizer ──▶ MarketEventGuard
 *
 * The bridge's /ticks route runs a real OpenD TICKER subscription + get_rt_ticker
 * and emits EXECUTED PRINTS — not a snapshot, candle, or synthetic interval. This
 * module maps each print onto the canonical trade event WITHOUT inventing any
 * field:
 *   · price / size(volume) / turnover / provider sequence come straight through.
 *   · moomoo's `direction` is the provider's OWN declared ticker_direction, so
 *     aggressorMethod is "PROVIDER" (contrast Coinbase, where we must invert the
 *     maker side). A NEUTRAL / unknown direction becomes UNKNOWN — never a
 *     fabricated BUY/SELL.
 *   · `dataMode` (LIVE vs DELAYED) is NOT guessed here — the caller passes the
 *     certified mode. Entitlement is a separate proof; this normalizer refuses to
 *     assert realtime it has not certified.
 * A row that lacks a usable price or executed size is dropped (truthful-or-nothing);
 * it is never emitted as a zero-value trade.
 *
 * The exact envelope shape matched here is the ACTUAL one emitted by bridge.py:
 *   { ok:true, ticks:[{code,seq,time,price,volume,turnover,direction,type}],
 *     count, source:"moomoo-opend" }
 *
 * PURE / DETERMINISTIC apart from the injected `processedAtMs` clock value.
 */

import {
  MARKET_EVENT_SCHEMA_VERSION,
  type CanonicalMarketEvent,
  type AggressorSide,
  type MarketDataMode,
} from "../marketEvent";
import { UNKNOWN_RIGHTS_POLICY_ID } from "../capabilityRegistry";

export const MOOMOO_TICK_NORMALIZATION_VERSION = "moomoo-ticker.v1" as const;

/** The raw per-print row shape emitted by services/moomoo-bridge /ticks. */
export interface MoomooTickRow {
  code?: unknown;
  seq?: unknown;
  time?: unknown;
  timestamp_ms?: unknown;
  price?: unknown;
  volume?: unknown;
  turnover?: unknown;
  direction?: unknown;
  type?: unknown;
}

export interface MoomooTicksEnvelope {
  ok?: unknown;
  ticks?: unknown;
  count?: unknown;
  source?: unknown;
  error?: unknown;
}

const positiveNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * moomoo ticker_direction → canonical AggressorSide.
 * BUY/SELL are provider-declared; anything else (NEUTRAL, blank, unknown) is
 * UNKNOWN. We never upgrade an ambiguous print into a definite aggressor.
 */
function mapDirection(value: unknown): AggressorSide {
  const s = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (s === "BUY" || s === "BID") return "BUY";
  if (s === "SELL" || s === "ASK") return "SELL";
  return "UNKNOWN";
}

/**
 * moomoo get_rt_ticker `time` is "YYYY-MM-DD HH:mm:ss[.SSS]" with NO timezone.
 * Parsing it would silently apply the runtime's local zone and mis-stamp the
 * print, so we DO NOT synthesize a provider epoch from it. The raw string is
 * preserved verbatim in rawLineageRef; timestampProvider stays missing until the
 * bridge emits an unambiguous epoch. Missing stays missing — never guessed.
 */
function rawTimeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalize a single moomoo /ticks row. Returns null when the row lacks a usable
 * price, executed size, unambiguous provider epoch, or symbol identity.
 */
export function normalizeMoomooTick(
  row: MoomooTickRow,
  appSymbol: string,
  dataMode: MarketDataMode,
  receivedAtMs: number,
  processedAtMs = Date.now(),
): CanonicalMarketEvent | null {
  if (!row || typeof row !== "object") return null;

  const price = positiveNumber(row.price);
  const size = positiveNumber(row.volume);
  const timestampProvider = positiveNumber(row.timestamp_ms);
  if (price == null || size == null || timestampProvider == null) return null;

  const providerSymbol = typeof row.code === "string" && row.code.trim() ? row.code.trim() : appSymbol;
  // moomoo codes are "US.TSLA" / "HK.00700"; strip the market prefix for the app symbol.
  const normalizedSymbol = providerSymbol.replace(/^[A-Z]{2,3}\./, "").toUpperCase();
  if (normalizedSymbol !== appSymbol.trim().toUpperCase()) return null;
  if (timestampProvider > receivedAtMs + 5 * 60_000) return null;

  const sequence = positiveNumber(row.seq);
  const aggressorSide = mapDirection(row.direction);
  const rawTime = rawTimeString(row.time);
  const sourceEventId = sequence != null ? String(sequence) : rawTime || "";

  const event: CanonicalMarketEvent = {
    schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
    normalizationVersion: MOOMOO_TICK_NORMALIZATION_VERSION,
    eventId: `moomoo:${providerSymbol}:${sourceEventId || `${price}@${size}`}`,
    sourceEventId: sourceEventId || undefined,
    symbol: appSymbol,
    normalizedSymbol,
    assetClass: "equity",
    contractId: providerSymbol,
    providerClass: "BROKER",
    providerPath: "moomoo-opend-bridge",
    eventType: "TRADE",
    timestampReceived: receivedAtMs,
    timestampProvider,
    timestampProcessed: processedAtMs,
    availableAt: processedAtMs,
    sequenceId: sequence ?? undefined,
    // moomoo ticker sequence semantics are not yet certified, so we carry the
    // sequence as lineage but do not assert contiguity (no false gap alarms).
    sequenceState: "UNAVAILABLE",
    price,
    size,
    volume: size,
    aggressorSide: aggressorSide === "UNKNOWN" ? undefined : aggressorSide,
    // Provider-declared direction — NOT an aggressor we inferred.
    aggressorMethod: aggressorSide === "UNKNOWN" ? "NONE" : "PROVIDER",
    sourceClass: "PRIMARY",
    dataMode,
    fidelityClass: "OBSERVED",
    rightsPolicyId: UNKNOWN_RIGHTS_POLICY_ID,
    rawLineageRef: `moomoo:ticker:${sourceEventId || "unsequenced"}${rawTime ? `@${rawTime}` : ""}`,
  };

  return event;
}

/**
 * Normalize a full /ticks envelope. Returns [] for any non-ok / malformed body
 * (truthful-or-nothing — an error envelope yields no events, never a fake one).
 */
export function normalizeMoomooTicksEnvelope(
  body: MoomooTicksEnvelope,
  appSymbol: string,
  dataMode: MarketDataMode,
  receivedAtMs: number,
  processedAtMs = Date.now(),
): CanonicalMarketEvent[] {
  if (!body || body.ok !== true || !Array.isArray(body.ticks)) return [];
  const out: CanonicalMarketEvent[] = [];
  for (const raw of body.ticks) {
    const event = normalizeMoomooTick(raw as MoomooTickRow, appSymbol, dataMode, receivedAtMs, processedAtMs);
    if (event) out.push(event);
  }
  return out;
}
