export type PublicCryptoExchange = "coinbase" | "kraken" | "bitstamp" | "binanceus" | "gemini";

export const EXCHANGE_TIMEFRAME_SECONDS = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1_800,
  "1h": 3_600,
  "2h": 7_200,
  "4h": 14_400,
  D: 86_400,
  W: 604_800,
} as const;

export type ExchangeTimeframe = keyof typeof EXCHANGE_TIMEFRAME_SECONDS;

const SUPPORTED: Record<PublicCryptoExchange, readonly ExchangeTimeframe[]> = {
  coinbase: ["1m", "5m", "15m", "1h", "D"],
  kraken: ["1m", "5m", "15m", "30m", "1h", "4h", "D", "W"],
  bitstamp: ["1m", "5m", "15m", "30m", "1h", "2h", "4h", "D"],
  binanceus: ["1m", "5m", "15m", "30m", "1h", "2h", "4h", "D", "W"],
  gemini: ["1m", "5m", "15m", "30m", "1h", "D"],
};

export type ExchangeTimeframeResolution =
  | { status: "SUPPORTED"; timeframe: ExchangeTimeframe; seconds: number }
  | { status: "UNAVAILABLE"; requested: string; supported: readonly ExchangeTimeframe[]; reason: string };

export function resolveExchangeTimeframe(
  exchange: PublicCryptoExchange,
  requested: string,
): ExchangeTimeframeResolution {
  const timeframe = requested as ExchangeTimeframe;
  if (!(timeframe in EXCHANGE_TIMEFRAME_SECONDS) || !SUPPORTED[exchange].includes(timeframe)) {
    return {
      status: "UNAVAILABLE",
      requested,
      supported: SUPPORTED[exchange],
      reason: `${exchange} does not provide ${requested} candles through this adapter; no substitute was used.`,
    };
  }
  return { status: "SUPPORTED", timeframe, seconds: EXCHANGE_TIMEFRAME_SECONDS[timeframe] };
}
