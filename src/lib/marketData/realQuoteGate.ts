/**
 * SF-D01 recurrence gate for live REST quotes.
 *
 * A Yahoo REST quote may only be honored as a live number when its observation
 * is RESOLVED — otherwise `/api/yahoo` has silently fallen back to previousClose
 * and reading it as "fresh" is the exact fake-fresh bug SF-D01 exists to prevent.
 * TickerTape / WatchlistPanel (via consolidatedQuote) / paper / scanner already
 * apply this predicate; the chart's live-quote hook (useWebSocket) was the one
 * consumer that skipped it, so a fake-fresh price could still surface on the
 * chart and disagree with the (now-gated) watchlist for the same symbol on the
 * same screen. Non-Yahoo sources carry their own liveness and are not gated.
 *
 * Pure, deterministic. Lives in lib (not the hook) so it is one shared truth
 * and unit-testable without the hook's client dependency graph.
 */
import { yahooQuoteObserved } from "./yahooQuoteObserved";

export function realQuoteSourceAccepted(source: string, raw: unknown): boolean {
  return source === "yahoo" ? yahooQuoteObserved(raw) : true;
}
