export const MARKET_EVENT_SCHEMA_VERSION = "wm.market-event.v1" as const;

export type MarketEventType = "TRADE" | "QUOTE" | "BAR" | "DEPTH" | "NEWS" | "ORDER" | "ACCOUNT";
export type MarketProviderClass = "EXCHANGE" | "BROKER" | "AGGREGATOR" | "WM_INTERNAL" | "REPLAY";
export type MarketSourceClass = "PRIMARY" | "FALLBACK" | "PROXY" | "SIMULATION";
export type MarketDataMode = "LIVE" | "DELAYED" | "REPLAY" | "SIMULATED";
export type MarketFidelityClass = "OBSERVED" | "DERIVED" | "INFERRED" | "SIMULATED" | "UNAVAILABLE";
export type AggressorSide = "BUY" | "SELL" | "UNKNOWN";
export type AggressorMethod = "PROVIDER" | "MAKER_SIDE_INVERTED" | "TICK_RULE" | "QUOTE_TEST" | "NONE";
export type SequenceState = "CONTIGUOUS" | "GAP" | "OUT_OF_ORDER" | "UNAVAILABLE";

/** All timestamps are Unix epoch milliseconds. Missing source fields stay missing. */
export interface CanonicalMarketEvent {
  schemaVersion: typeof MARKET_EVENT_SCHEMA_VERSION;
  normalizationVersion: string;
  eventId: string;
  sourceEventId?: string;
  symbol: string;
  normalizedSymbol: string;
  executableIdentity?: string;
  assetClass: string;
  contractId?: string;
  exchange?: string;
  providerClass: MarketProviderClass;
  providerPath: string;
  eventType: MarketEventType;
  timestampExchange?: number;
  timestampProvider?: number;
  timestampReceived: number;
  timestampProcessed: number;
  sequenceId?: number | string;
  sequenceState: SequenceState;
  price?: number;
  size?: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  tradeConditions?: readonly string[];
  sessionId?: string;
  aggressorSide?: AggressorSide;
  aggressorMethod: AggressorMethod;
  aggressorConfidence?: number;
  depthLevel?: number;
  sourceClass: MarketSourceClass;
  dataMode: MarketDataMode;
  fidelityClass: MarketFidelityClass;
  rawLineageRef?: string;
}

export type MarketEventQuarantineReason =
  | "INVALID_SCHEMA_VERSION"
  | "MISSING_IDENTITY"
  | "INVALID_TIMESTAMP"
  | "PROCESSING_BEFORE_RECEIPT"
  | "SOURCE_CLOCK_IN_FUTURE"
  | "INVALID_PRICE"
  | "INVALID_SIZE"
  | "INVALID_QUOTE"
  | "INVALID_BAR"
  | "INVALID_CONFIDENCE"
  | "DUPLICATE_EVENT"
  | "OUT_OF_ORDER_SEQUENCE";

export type MarketEventWarning = "SEQUENCE_GAP" | "SEQUENCE_UNAVAILABLE";

export type MarketEventGuardResult =
  | { status: "ACCEPTED"; event: CanonicalMarketEvent; warnings: readonly MarketEventWarning[] }
  | { status: "QUARANTINED"; event: CanonicalMarketEvent; reasons: readonly MarketEventQuarantineReason[] };

const finitePositive = (value: number | undefined) =>
  value == null || (Number.isFinite(value) && value > 0);

export function validateMarketEvent(
  event: CanonicalMarketEvent,
  maxFutureClockSkewMs = 5 * 60_000,
): MarketEventQuarantineReason[] {
  const reasons: MarketEventQuarantineReason[] = [];

  if (event.schemaVersion !== MARKET_EVENT_SCHEMA_VERSION) reasons.push("INVALID_SCHEMA_VERSION");
  if (!event.eventId.trim() || !event.symbol.trim() || !event.normalizedSymbol.trim() || !event.providerPath.trim()) {
    reasons.push("MISSING_IDENTITY");
  }
  if (!Number.isFinite(event.timestampReceived) || !Number.isFinite(event.timestampProcessed) ||
      event.timestampReceived <= 0 || event.timestampProcessed <= 0) {
    reasons.push("INVALID_TIMESTAMP");
  } else if (event.timestampProcessed < event.timestampReceived) {
    reasons.push("PROCESSING_BEFORE_RECEIPT");
  }

  for (const sourceTimestamp of [event.timestampExchange, event.timestampProvider]) {
    if (sourceTimestamp != null && (!Number.isFinite(sourceTimestamp) || sourceTimestamp <= 0)) {
      reasons.push("INVALID_TIMESTAMP");
    } else if (sourceTimestamp != null && sourceTimestamp > event.timestampReceived + maxFutureClockSkewMs) {
      reasons.push("SOURCE_CLOCK_IN_FUTURE");
    }
  }

  if (!finitePositive(event.price) || !finitePositive(event.bid) || !finitePositive(event.ask)) reasons.push("INVALID_PRICE");
  if (!finitePositive(event.size) || !finitePositive(event.bidSize) || !finitePositive(event.askSize) ||
      (event.volume != null && (!Number.isFinite(event.volume) || event.volume < 0))) reasons.push("INVALID_SIZE");
  if (event.eventType === "TRADE" && (event.price == null || event.size == null)) reasons.push("INVALID_SIZE");
  if (event.eventType === "QUOTE" && event.bid == null && event.ask == null && event.price == null) reasons.push("INVALID_QUOTE");
  if (event.bid != null && event.ask != null && event.bid > event.ask) reasons.push("INVALID_QUOTE");
  if (event.eventType === "BAR") {
    const values = [event.open, event.high, event.low, event.close];
    if (values.some(value => value == null || !Number.isFinite(value) || value <= 0) ||
        (event.high != null && event.low != null && event.high < event.low)) reasons.push("INVALID_BAR");
  }
  if (event.aggressorConfidence != null &&
      (!Number.isFinite(event.aggressorConfidence) || event.aggressorConfidence < 0 || event.aggressorConfidence > 1)) {
    reasons.push("INVALID_CONFIDENCE");
  }

  return [...new Set(reasons)];
}

/** Stateful ingress guard. It quarantines; it never silently rewrites evidence. */
export class MarketEventGuard {
  private seenEventIds = new Set<string>();
  private lastSequenceByStream = new Map<string, number>();

  inspect(event: CanonicalMarketEvent): MarketEventGuardResult {
    const reasons = validateMarketEvent(event);
    if (this.seenEventIds.has(event.eventId)) reasons.push("DUPLICATE_EVENT");

    const streamKey = `${event.providerPath}|${event.normalizedSymbol}|${event.eventType}`;
    const numericSequence = typeof event.sequenceId === "number" && Number.isFinite(event.sequenceId)
      ? event.sequenceId
      : null;
    const priorSequence = this.lastSequenceByStream.get(streamKey);
    if (numericSequence != null && priorSequence != null && numericSequence <= priorSequence) {
      reasons.push("OUT_OF_ORDER_SEQUENCE");
    }

    if (reasons.length) {
      return { status: "QUARANTINED", event, reasons: [...new Set(reasons)] };
    }

    const warnings: MarketEventWarning[] = [];
    if (numericSequence == null) warnings.push("SEQUENCE_UNAVAILABLE");
    else if (priorSequence != null && numericSequence > priorSequence + 1) warnings.push("SEQUENCE_GAP");

    this.seenEventIds.add(event.eventId);
    if (numericSequence != null) this.lastSequenceByStream.set(streamKey, numericSequence);
    return { status: "ACCEPTED", event, warnings };
  }
}
