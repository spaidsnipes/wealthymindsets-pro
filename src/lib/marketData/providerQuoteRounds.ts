import { InFlightRounds } from "./inFlightRounds";
import { readClassifiedJsonReceipt } from "./readJsonReceipt";

/**
 * Owner of the remaining two legs of the display-quote provider chain:
 * `/api/alpaca?type=quote` and `/api/finnhub?type=quote`.
 *
 * WHY THIS FILE EXISTS AT ALL
 *
 * Yahoo (yahooQuoteRounds.ts) and the exchanges (exchangeQuoteRounds.ts) were
 * given owners first, because Yahoo is the leg that was MEASURED duplicating on
 * /charts. That left the chain half-owned: a reader seeing two of four legs
 * behind owners would reasonably assume the other two were too. They were not —
 * three raw Alpaca sites and three raw Finnhub sites, on the SAME three
 * surfaces that carried the measured Yahoo defect:
 *
 *   TickerTape            :236 alpaca  :240 finnhub
 *   WatchlistPanel        :177 alpaca  :180 finnhub
 *   useWebSocket          :342 alpaca  :349 finnhub
 *
 * ONE MODULE, NOT TWO. The round machinery is identical; only the URL differs.
 * A second copy of `new InFlightRounds()` per provider would be duplicated
 * infrastructure with no distinct behaviour. The keys are namespaced per
 * provider, so a shared instance cannot let one provider's round answer
 * another's question.
 *
 * HONEST LIMIT ON THE EVIDENCE — these two legs are identified STRUCTURALLY,
 * not measured live, and they are FALLBACKS: they run only when the leg above
 * them declines. Concurrency between surfaces is therefore likely but not
 * observed, and it will be RARER here than for Yahoo. No saving is claimed.
 *
 * Yahoo is deliberately NOT folded in. Its owner ships with Sentinels pinned to
 * its own spelling and a measured provenance comment; rewriting it to save a
 * few lines would trade real evidence for symmetry.
 *
 * THE BODY IS SHARED — TREAT IT AS READ-ONLY, and NO CONSUMER'S ABORT SIGNAL
 * MAY ENTER THE ROUND. Cancellation is a property of a CONSUMER and belongs on
 * the RESULT — the rule set in 2efcb31 and held in 1cc61f9.
 *
 * THE DEADLINE BELONGS TO THE ROUND (abce4a6). A shared round without one holds
 * its key for as long as the provider stalls, so every later ask JOINS a
 * request that will never answer — the coalescer converting one hung response
 * into an indefinitely stuck symbol on all three surfaces at once. Finnhub is
 * the reason this is not hypothetical: it is the leg that 429-storms.
 * `readClassifiedJsonReceipt` bounds headers AND body, and is `classified`
 * rather than plain because these providers put their refusal reasons in the
 * BODY of a non-2xx response, which every consumer here reads.
 */
const providerQuoteRounds = new InFlightRounds();

/** Join the open `/api/alpaca?type=quote` round for this symbol, or start one. */
export function fetchAlpacaQuoteBody(symbol: string): Promise<unknown> {
  const up = symbol.toUpperCase();
  return providerQuoteRounds.run(`alpaca:quote:${up}`, async () => {
    // Bound the complete shared response; no individual joiner owns its abort.
    const response = await readClassifiedJsonReceipt<unknown>(fetch,
      `/api/alpaca?sym=${encodeURIComponent(up)}&type=quote`,
      new AbortController().signal,
    );
    return response.body;
  });
}

/** Join the open `/api/finnhub?type=quote` round for this symbol, or start one. */
export function fetchFinnhubQuoteBody(symbol: string): Promise<unknown> {
  const up = symbol.toUpperCase();
  return providerQuoteRounds.run(`finnhub:quote:${up}`, async () => {
    // Bound the complete shared response; no individual joiner owns its abort.
    const response = await readClassifiedJsonReceipt<unknown>(fetch,
      `/api/finnhub?sym=${encodeURIComponent(up)}&type=quote`,
      new AbortController().signal,
    );
    return response.body;
  });
}

/** Exposed for tests and for honest in-flight reporting. Not for control flow. */
export function providerQuoteRoundInFlight(provider: "alpaca" | "finnhub", symbol: string): boolean {
  return providerQuoteRounds.isInFlight(`${provider}:quote:${symbol.toUpperCase()}`);
}
