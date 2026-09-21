/**
 * WHAT THE GLASS IS ALLOWED TO SAY ABOUT THE REAL-TIME LANE.
 *
 * The browser receives the event union from `webullQuotesStream.ts` over SSE.
 * Turning that into a phase and a headline is a decision about MEANING, and
 * this project's entire expensive history is meaning decided in a component
 * where nobody could test it. So it is a pure reducer, here, with a test file
 * next to it.
 *
 * The distinction the phases exist to preserve — the one that cost three months
 * when it was collapsed — is between:
 *
 *   • the socket never opening (ours),
 *   • the broker refusing the connection (a fact about the APP KEY),
 *   • the subscribe being refused (ours again, almost always a dead session id),
 *   • and quotes flowing but the market being quiet (nobody's fault at all).
 *
 * A single "not working" state would flatten all four into the one sentence
 * that is easiest to write and was wrong every time it was written.
 */
import type { WebullStreamEvent } from "./webullQuotesStream";

export type WebullStreamPhase =
  | "IDLE"
  | "OPENING"
  | "CONNECTION_REFUSED"
  | "SUBSCRIBE_REFUSED"
  | "SUBSCRIBED"
  | "FLOWING"
  | "ENDED";

export interface WebullLiveStreamState {
  readonly phase: WebullStreamPhase;
  /** The short line a trader reads. Never speculative. */
  readonly headline: string;
  /** The provider's own words, or ours, verbatim from the event. */
  readonly detail: string;
  readonly quoteCount: number;
  readonly lastQuoteAt: string | null;
  readonly lastTopic: string | null;
}

export const initialWebullStreamState: WebullLiveStreamState = {
  phase: "IDLE",
  headline: "Not started",
  detail: "Nothing has been asked of Webull yet.",
  quoteCount: 0,
  lastQuoteAt: null,
  lastTopic: null,
};

export const openingWebullStreamState: WebullLiveStreamState = {
  ...initialWebullStreamState,
  phase: "OPENING",
  headline: "Opening",
  detail: "Connecting to Webull's real-time host and waiting for its answer.",
};

export function reduceWebullStream(
  state: WebullLiveStreamState,
  event: WebullStreamEvent,
): WebullLiveStreamState {
  switch (event.kind) {
    case "handshake":
      return event.accepted
        ? { ...state, phase: "OPENING", headline: "Connected", detail: event.note }
        : {
            ...state,
            phase: "CONNECTION_REFUSED",
            // Deliberately NOT "no market data". The broker refusing a
            // connection and an account lacking a data package are different
            // facts that arrive looking alike.
            headline: "Connection refused",
            detail: event.note,
          };

    case "subscribe":
      return event.subscribed
        ? { ...state, phase: "SUBSCRIBED", headline: "Subscribed", detail: event.note }
        : {
            ...state,
            phase: "SUBSCRIBE_REFUSED",
            headline: "Subscription refused",
            detail: event.note,
          };

    case "quote":
      return {
        ...state,
        phase: "FLOWING",
        headline: "Live",
        // Once prints are arriving the interesting fact is the print, not a
        // sentence about access — that question is settled by the data itself.
        detail: `Prints are arriving from Webull on ${event.topic}.`,
        quoteCount: state.quoteCount + 1,
        lastQuoteAt: event.receivedAt,
        lastTopic: event.topic,
      };

    case "closed":
      return {
        ...state,
        // A stream that carried prints and then ended is not a failure, and
        // must not be repainted as one on the way out.
        phase: state.phase === "CONNECTION_REFUSED" || state.phase === "SUBSCRIBE_REFUSED"
          ? state.phase
          : "ENDED",
        headline:
          state.phase === "CONNECTION_REFUSED" || state.phase === "SUBSCRIBE_REFUSED"
            ? state.headline
            : state.quoteCount > 0
              ? "Stream ended"
              : "Stream ended with no prints",
        detail: event.reason,
      };
  }
}

/**
 * The one sentence for a stream that connected, subscribed, and stayed silent.
 *
 * Kept here rather than in a component because it is the single most likely
 * place for the old reflex to return. Silence after an accepted subscription is
 * a question about the market and the symbol. It is not an access answer, and
 * nobody may be sent to buy anything on the strength of it.
 */
export function describeSilence(state: WebullLiveStreamState): string | null {
  if (state.quoteCount > 0) return null;
  if (state.phase !== "SUBSCRIBED" && state.phase !== "ENDED") return null;
  return (
    "Webull accepted the subscription and has sent no prints yet. That is a " +
    "question about the market and the symbols requested — whether anything is " +
    "trading right now — and it resolves nothing about access."
  );
}
