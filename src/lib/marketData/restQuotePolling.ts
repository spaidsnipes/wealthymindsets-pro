export type ProviderTapeSource =
  | "polygon"
  | "finnhub"
  | "alpaca"
  | "coinbase"
  | "binance"
  | "moomoo"
  | "webull"
  | "tastytrade"
  | "tastytrade-equity";

export const REST_QUOTE_NO_TAPE_POLL_MS = 5_000;
export const REST_QUOTE_WITH_TAPE_POLL_MS = 15_000;

/** After a refused or absent answer (e.g. Alpaca's IEX quote outside regular hours): ask again in a minute. */
export const REST_QUOTE_REFUSED_POLL_MS = 60_000;

/**
 * Snapshots support display context; they must not shadow or duplicate a tape. A poll that was REFUSED
 * (or got no answer) backs off to a minute — since 2026-10-12 there is no delayed fallback behind it, so
 * re-asking every 5–15 s only repeats the same refusal (measured on /desk after hours: a 404 per symbol per poll).
 */
export function restQuoteNextPollDelayMs(tapeSource: ProviderTapeSource | null, lastAnswered = true): number {
  if (!lastAnswered) return REST_QUOTE_REFUSED_POLL_MS;
  return tapeSource ? REST_QUOTE_WITH_TAPE_POLL_MS : REST_QUOTE_NO_TAPE_POLL_MS;
}
