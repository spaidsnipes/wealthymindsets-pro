import {
  MARKET_EVENT_SCHEMA_VERSION,
  type CanonicalMarketEvent,
} from "../marketEvent";
import { UNKNOWN_RIGHTS_POLICY_ID } from "../capabilityRegistry";

interface BinanceTradeMessage {
  e?: unknown;
  E?: unknown;
  s?: unknown;
  t?: unknown;
  p?: unknown;
  q?: unknown;
  T?: unknown;
  m?: unknown;
}

const positiveNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/** Converts Binance.US @trade frames only. Book/ticker frames are quotes, not executions. */
export function normalizeBinanceUsTrade(
  raw: unknown,
  appSymbol: string,
  receivedAtMs: number,
  processedAtMs = Date.now(),
): CanonicalMarketEvent | null {
  const message = raw as BinanceTradeMessage;
  if (!message || message.e !== "trade") return null;

  const price = positiveNumber(message.p);
  const size = positiveNumber(message.q);
  const tradeTime = positiveNumber(message.T);
  const providerTime = positiveNumber(message.E);
  const tradeId = message.t == null ? "" : String(message.t);
  const contractId = typeof message.s === "string" ? message.s.trim().toUpperCase() : "";
  if (price == null || size == null || tradeTime == null || providerTime == null ||
      !tradeId || !contractId || typeof message.m !== "boolean") return null;

  // `m` means the buyer was the maker. The aggressor is therefore the
  // opposite side; label that inversion rather than claiming a direct side.
  const aggressorSide = message.m ? "SELL" : "BUY";
  const normalizedSymbol = appSymbol.toUpperCase().replace(/USD$/, "");

  return {
    schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
    normalizationVersion: "binance-us-trade.v1",
    eventId: `binance-us:${contractId}:${tradeId}`,
    sourceEventId: tradeId,
    symbol: appSymbol,
    normalizedSymbol,
    executableIdentity: contractId,
    assetClass: "crypto",
    contractId,
    exchange: "BINANCE_US",
    providerClass: "EXCHANGE",
    providerPath: "binance-us-client-ws",
    eventType: "TRADE",
    timestampExchange: tradeTime,
    timestampProvider: providerTime,
    timestampReceived: receivedAtMs,
    timestampProcessed: processedAtMs,
    availableAt: processedAtMs,
    sequenceId: tradeId,
    // Trade IDs are retained as lineage, but continuity is not certified in
    // the capability registry, so gaps must not be inferred from ID jumps.
    sequenceState: "UNAVAILABLE",
    price,
    size,
    aggressorSide,
    aggressorMethod: "MAKER_SIDE_INVERTED",
    aggressorConfidence: 1,
    sourceClass: "FALLBACK",
    dataMode: "LIVE",
    fidelityClass: "OBSERVED",
    rightsPolicyId: UNKNOWN_RIGHTS_POLICY_ID,
    rawLineageRef: `binance-us:trade:${tradeId}`,
  };
}
