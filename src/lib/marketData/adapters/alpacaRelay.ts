import {
  MARKET_EVENT_SCHEMA_VERSION,
  type CanonicalMarketEvent,
} from "../marketEvent";

interface AlpacaRelayTrade {
  T?: unknown;
  S?: unknown;
  i?: unknown;
  x?: unknown;
  p?: unknown;
  s?: unknown;
  t?: unknown;
  c?: unknown;
}

const positiveNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const relayTimestamp = (value: unknown): number | null => {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  return null;
};

export function normalizeAlpacaRelayTrade(
  raw: unknown,
  expectedSymbol: string,
  priorPrice: number,
  receivedAtMs: number,
  processedAtMs = Date.now(),
): CanonicalMarketEvent | null {
  const message = raw as AlpacaRelayTrade;
  if (!message || (message.T != null && message.T !== "t")) return null;
  const symbol = typeof message.S === "string" ? message.S.toUpperCase() : expectedSymbol.toUpperCase();
  if (symbol !== expectedSymbol.toUpperCase()) return null;

  const price = positiveNumber(message.p);
  const size = positiveNumber(message.s);
  const providerTime = relayTimestamp(message.t);
  if (price == null || size == null || providerTime == null) return null;

  const aggressorSide = priorPrice > 0
    ? price > priorPrice ? "BUY" : price < priorPrice ? "SELL" : "UNKNOWN"
    : "UNKNOWN";
  const sourceEventId = message.i != null ? String(message.i) : undefined;
  const fingerprint = `${providerTime}:${price}:${size}:${aggressorSide}`;

  return {
    schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
    normalizationVersion: "alpaca-relay-trade.v1",
    eventId: `alpaca-relay:${symbol}:${sourceEventId ?? fingerprint}`,
    sourceEventId,
    symbol: expectedSymbol,
    normalizedSymbol: symbol,
    assetClass: "equity",
    exchange: message.x != null ? String(message.x) : undefined,
    providerClass: "BROKER",
    providerPath: "alpaca-external-relay",
    eventType: "TRADE",
    timestampProvider: providerTime,
    timestampReceived: receivedAtMs,
    timestampProcessed: processedAtMs,
    sequenceState: "UNAVAILABLE",
    price,
    size,
    tradeConditions: Array.isArray(message.c) ? message.c.map(String) : undefined,
    aggressorSide,
    aggressorMethod: "TICK_RULE",
    aggressorConfidence: aggressorSide === "UNKNOWN" ? 0 : 0.5,
    sourceClass: "PROXY",
    dataMode: "LIVE",
    fidelityClass: "PROXY",
    rawLineageRef: `alpaca-relay:${sourceEventId ?? fingerprint}`,
  };
}
