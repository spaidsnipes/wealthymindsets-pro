import {
  MARKET_EVENT_SCHEMA_VERSION,
  type CanonicalMarketEvent,
} from "../marketEvent";
import { UNKNOWN_RIGHTS_POLICY_ID } from "../capabilityRegistry";

interface CoinbaseTickerMessage {
  type?: unknown;
  product_id?: unknown;
  trade_id?: unknown;
  sequence?: unknown;
  time?: unknown;
  price?: unknown;
  last_size?: unknown;
  side?: unknown;
}

const positiveNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export function normalizeCoinbaseTicker(
  raw: unknown,
  appSymbol: string,
  receivedAtMs: number,
  processedAtMs = Date.now(),
): CanonicalMarketEvent | null {
  const message = raw as CoinbaseTickerMessage;
  if (!message || message.type !== "ticker") return null;

  const price = positiveNumber(message.price);
  const size = positiveNumber(message.last_size);
  const providerTime = typeof message.time === "string" ? Date.parse(message.time) : Number.NaN;
  const sequence = positiveNumber(message.sequence);
  const sourceEventId = message.trade_id != null ? String(message.trade_id) : sequence != null ? String(sequence) : "";
  const productId = typeof message.product_id === "string" ? message.product_id : "";
  if (price == null || size == null || !Number.isFinite(providerTime) || !sourceEventId || !productId) return null;
  if (message.side !== "buy" && message.side !== "sell") return null;

  // Coinbase ticker `side` is maker-side; the aggressive execution is the
  // opposite side. Preserve that method explicitly instead of presenting it as
  // exchange-supplied aggressor identity.
  const aggressorSide = message.side === "sell" ? "BUY" : "SELL";
  const normalizedSymbol = appSymbol.toUpperCase().replace(/USD$/, "");

  return {
    schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
    normalizationVersion: "coinbase-ticker.v1",
    eventId: `coinbase:${productId}:${sourceEventId}`,
    sourceEventId,
    symbol: appSymbol,
    normalizedSymbol,
    assetClass: "crypto",
    contractId: productId,
    exchange: "COINBASE",
    providerClass: "EXCHANGE",
    providerPath: "coinbase-client-ws",
    eventType: "TRADE",
    timestampExchange: providerTime,
    timestampProvider: providerTime,
    timestampReceived: receivedAtMs,
    timestampProcessed: processedAtMs,
    availableAt: processedAtMs,
    sequenceId: sequence ?? undefined,
    // Preserve the source sequence as lineage, but do not treat ticker-channel
    // jumps as packet gaps until Coinbase's channel semantics are certified.
    sequenceState: "UNAVAILABLE",
    price,
    size,
    aggressorSide,
    aggressorMethod: "MAKER_SIDE_INVERTED",
    aggressorConfidence: 1,
    sourceClass: "PRIMARY",
    dataMode: "LIVE",
    fidelityClass: "OBSERVED",
    rightsPolicyId: UNKNOWN_RIGHTS_POLICY_ID,
    rawLineageRef: `coinbase:ticker:${sourceEventId}`,
  };
}
