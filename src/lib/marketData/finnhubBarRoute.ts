/**
 * THE FINNHUB BAR ROUTE'S RESOLUTION TABLE — moved out of
 * src/app/api/finnhub/route.ts on 2026-09-27 (Garden 16 §26), unchanged.
 *
 * Why it moved (as ALPACA_TF_MAP did): a Next route file may only export its
 * handlers, so the timeframe ladder could not read this table and instead
 * skipped the Finnhub door on the claim "Finnhub's intervals are a subset of
 * Alpaca's". That holds only when Alpaca ANSWERS. For a USDT pair ("BTCUSDT")
 * Alpaca is asked for "BTCUSDT/USD", which is no pair, Yahoo refuses to answer
 * a USDT request with a USD price, and Finnhub (BINANCE:BTCUSDT) is the door
 * that serves daily / weekly / monthly — which the ladder then called
 * "No bar route serves this instrument". One owner, two readers: the route
 * that serves the bars and the ladder that labels them.
 *
 * FAIL-CLOSED (WM-CHART-P0-03). Only intervals Finnhub serves NATIVELY are
 * mapped. 2m, 3m, 10m, 2h, 4h are absent on purpose: the route answers them
 * UNAVAILABLE rather than substituting a different bar size under the
 * requested label ("1-minute bars labelled 2m" in prod).
 * Finnhub native resolutions (finnhub.io/docs/api/stock-candles and
 * finnhub.io/docs/api/crypto-candles — the same set on both endpoints):
 *   1, 5, 15, 30, 60, D, W, M.
 */
export const FH_NATIVE_RES: Readonly<Record<string, string>> = Object.freeze({
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "D":  "D",
  "1D": "D",
  "W":  "W",
  "1W": "W",
  "M":  "M",
  "1M": "M",
});

/**
 * WHICH FINNHUB CANDLE ENDPOINT A PROVIDER SYMBOL IS ASKED OF (Garden 16 §1,
 * 2026-09-27).
 *
 * THE DEFECT. /api/finnhub built every candle URL as `/stock/candle`, including
 * for the `BINANCE:{BASE}USDT` symbols toFinnhubSym returns for crypto. The
 * stock endpoint does not serve a Binance pair, so the door the timeframe
 * ladder labels NATIVE for USDT pairs (BTCUSDT 30m / 1D / 1W / 1M, every
 * SHIBUSDT rung) asked the wrong endpoint and could not answer.
 *
 * Finnhub publishes crypto candles at `/crypto/candle` with the same
 * parameters (symbol, resolution, from, to) and the same response columns
 * (s, t, o, h, l, c, v), so the route's ingress is unchanged. toFinnhubSym is
 * the only producer of provider symbols and its only exchange-prefixed form is
 * `BINANCE:`, so that prefix is the whole rule; anything else is an equity.
 */
export const FINNHUB_API_BASE = "https://finnhub.io/api/v1";

export function finnhubCandlePath(providerSym: string): "/crypto/candle" | "/stock/candle" {
  return providerSym.startsWith("BINANCE:") ? "/crypto/candle" : "/stock/candle";
}

/** The exact candle request /api/finnhub puts on the wire. */
export function finnhubCandleUrl(args: {
  readonly providerSym: string;
  readonly resolution: string;
  readonly from: number;
  readonly to: number;
  readonly token: string;
}): string {
  const { providerSym, resolution, from, to, token } = args;
  return `${FINNHUB_API_BASE}${finnhubCandlePath(providerSym)}?symbol=${encodeURIComponent(providerSym)}` +
    `&resolution=${resolution}&from=${from}&to=${to}&token=${token}`;
}
