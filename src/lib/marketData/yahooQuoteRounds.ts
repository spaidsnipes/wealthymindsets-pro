import { InFlightRounds } from "./inFlightRounds";
import { readClassifiedJsonReceipt } from "./readJsonReceipt";

/**
 * MEASURED /charts 2026-09-08, client-side route re-mount, stack-attributed
 * fetch wrapper. Same symbol, same endpoint, three owners:
 *
 *   NQ1!   TickerTape.fetchQuote          t = 918 ms
 *          useWebSocket.fetchRealQuote... t = 954 ms   <- 36 ms apart
 *   YM1!   918 / 952 ms                                <- 35 ms apart
 *   ES1!  1011 / 1047 ms                               <- 36 ms apart
 *   AMZN   MainChart.useEffect            t =  52, 284 ms
 *
 *   RTY1!  TickerTape.fetchQuote ONLY — never useWebSocket.
 *
 * RTY1! is the control that explains the defect. It is clean not because
 * anything guards it but because it happens to live on ONE surface. Every
 * symbol that appears on two surfaces is asked twice, milliseconds apart.
 *
 * WHY THIS LAYER AND NOT THE DOMAIN LAYER
 *
 * The obvious fix — route all three through `coalesceQuoteRequest` — is wrong,
 * and dangerously so. The three consumers want three different things from one
 * body: the tape wants a `QuoteAnswer` discriminated into quote/refused,
 * useWebSocket wants its own answer shape off a multi-provider chain, and
 * MainChart wants a bare number it uses as a VETO over candle data. Coalescing
 * at the answer layer would hand one consumer another's verdict — the same
 * silent, awful failure the `ticks:` namespace exists to prevent.
 *
 * What the three genuinely share is the HTTP round: identical URL, identical
 * JSON. So the round is what is shared, and interpretation stays with each
 * consumer, where it is true.
 *
 * THE BODY IS SHARED — TREAT IT AS READ-ONLY
 *
 * Joiners receive the same parsed object, not a copy. Every current consumer
 * only reads (`j?.price`, `j?.prevClose`, and the two shared predicates, all of
 * which take `unknown` and read). A consumer that mutates the body would be
 * mutating it for the others.
 *
 * NO CONSUMER'S ABORT SIGNAL MAY ENTER THE ROUND
 *
 * MainChart passes its own `AbortSignal` to its current call. That signal must
 * NOT be handed to a shared round: MainChart unmounting mid-flight would cancel
 * a request the tape and useWebSocket are waiting on, and they would read the
 * abort as the provider's answer. Cancellation is a property of a CONSUMER and
 * belongs on the RESULT — the same rule established for the provider-tick
 * rounds in 2efcb31.
 */
const yahooQuoteRounds = new InFlightRounds();

/**
 * Join the open `/api/yahoo?type=quote` round for this symbol, or start one.
 *
 * Returns the raw parsed body as `unknown`, deliberately: the shared thing is
 * the request, and every consumer already owns its own reading of the response.
 */
export function fetchYahooQuoteBody(symbol: string): Promise<unknown> {
  const up = symbol.toUpperCase();
  return yahooQuoteRounds.run(`yahoo:quote:${up}`, async () => {
    // The deadline belongs to the shared round, not a consumer. It covers
    // headers AND body so a stalled response cannot retain this key forever.
    const response = await readClassifiedJsonReceipt<unknown>(fetch,
      `/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`,
      new AbortController().signal,
    );
    return response.body;
  });
}

/** Exposed for tests and for honest in-flight reporting. Not for control flow. */
export function yahooQuoteRoundInFlight(symbol: string): boolean {
  return yahooQuoteRounds.isInFlight(`yahoo:quote:${symbol.toUpperCase()}`);
}
