import { InFlightRounds } from "./inFlightRounds";

/**
 * Owner of the `/api/exchange?type=quote` round.
 *
 * STRUCTURALLY IDENTICAL to the Yahoo quote defect measured on /charts
 * 2026-09-08 (see yahooQuoteRounds.ts), on the SAME three surfaces:
 *
 *   TickerTape.fetchQuote          crypto leg
 *   WatchlistPanel poll            crypto leg
 *   useWebSocket                   crypto leg, twice — the `SYM.EXCHANGE`
 *                                  form and the bare-crypto form
 *
 * Four raw call sites, no owner, so concurrency between surfaces was invisible
 * to all of them. Any crypto symbol appearing on two surfaces was asked twice.
 *
 * HONEST LIMIT ON THE EVIDENCE: unlike the Yahoo case this one is identified
 * STRUCTURALLY, not measured live. The crypto rows render only behind the
 * client-side auth gate, and no seeded test session exists yet, so the
 * millisecond-level duplicate pairs were not observed for this endpoint.
 * What is verified is the shape: same surfaces, same endpoint, no owner.
 *
 * WHY THE TRANSPORT LAYER — the same reason as Yahoo. The three consumers want
 * three different things out of one body: the tape wants `selectQuoteChange`,
 * the watchlist wants `changeFields(..., "ROLLING_24H")` because the exchange
 * prices against 24h ago, and useWebSocket wants `resolveQuoteDayChange`.
 * Sharing an ANSWER would hand one consumer another's verdict. Sharing the
 * ROUND shares only what is genuinely identical: the URL and the JSON.
 *
 * THE EXCHANGE IS PART OF THE IDENTITY
 *
 * `useWebSocket` resolves the exchange from the symbol (`BTC.KRAKEN`), so the
 * key carries it. Keying on the coin alone would let a Kraken round answer a
 * Coinbase question for the same coin — a different venue's price presented as
 * this venue's, which is exactly the silent, awful failure the `ticks:`
 * namespace exists to prevent.
 *
 * THE BODY IS SHARED — TREAT IT AS READ-ONLY. Joiners receive the same parsed
 * object, not a copy. Every current consumer only reads.
 *
 * NO CONSUMER'S ABORT SIGNAL MAY ENTER THE ROUND. Cancellation is a property
 * of a CONSUMER and belongs on the RESULT — the rule established for the
 * provider-tick rounds in 2efcb31 and for the Yahoo rounds in 1cc61f9.
 */
const exchangeQuoteRounds = new InFlightRounds();

/**
 * Join the open `/api/exchange?type=quote` round for this venue+coin, or start
 * one.
 *
 * Returns the raw parsed body as `unknown`, deliberately: the shared thing is
 * the request, and every consumer already owns its own reading of the response
 * — including which prior price the change is measured against.
 */
export function fetchExchangeQuoteBody(exchange: string, coin: string): Promise<unknown> {
  const ex = exchange.toLowerCase();
  const up = coin.toUpperCase();
  return exchangeQuoteRounds.run(`exchange:quote:${ex}:${up}`, async () => {
    const response = await fetch(
      `/api/exchange?ex=${encodeURIComponent(ex)}&coin=${encodeURIComponent(up)}&type=quote`,
      { cache: "no-store" },
    );
    return await response.json();
  });
}

/** Exposed for tests and for honest in-flight reporting. Not for control flow. */
export function exchangeQuoteRoundInFlight(exchange: string, coin: string): boolean {
  return exchangeQuoteRounds.isInFlight(
    `exchange:quote:${exchange.toLowerCase()}:${coin.toUpperCase()}`,
  );
}
