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
import type { WebullStreamRouteEvent } from "./webullQuotesStream";
import type { WebullSubType } from "./webullQuotesSubscribe";
import { LIVE_STALENESS_BUDGET_MS } from "@/lib/os/osChrome";

export type WebullStreamPhase =
  | "IDLE"
  | "OPENING"
  /** Webull minted a session and is waiting on one tap in the Webull app. Not a fault. */
  | "AWAITING_APPROVAL"
  /** This deployment cannot open the lane at all (no key pair, no raw sockets). Ours. */
  | "NOT_AVAILABLE_HERE"
  | "CONNECTION_REFUSED"
  | "SUBSCRIBE_REFUSED"
  | "SUBSCRIBED"
  | "FLOWING"
  /**
   * Messages WERE flowing and nothing has arrived for longer than the live
   * staleness budget. Never produced by the reducer — which has no clock — only
   * by `readWebullStreamStanding`, which is handed one.
   */
  | "SILENT"
  | "ENDED";

/* ── WHAT ONE MESSAGE IS ─────────────────────────────────────────────────────
   Found 2026-09-26 at 3ff5cd7 (audit): the strip subscribes `subTypes=QUOTE` —
   Level-1 best bid/ask updates — and counted every one of them as a "print".
   A print is a TRADE. A bid/ask update is not a trade, and neither is depth
   (Garden 16 §13, "TICK STREAM ≠ DEPTH"). The count is only allowed the noun
   the SUBSCRIPTION proves; a mixed or unstated subscription gets the neutral
   noun, because the topic string's format is not established here and
   "Unknown beats fabricated certainty". */

export interface WebullMessageNoun {
  /** Which single subType proves this noun, or null when it is not proven. */
  readonly proves: WebullSubType | null;
  readonly one: string;
  readonly many: string;
}

const NEUTRAL_NOUN: WebullMessageNoun = { proves: null, one: "message", many: "messages" };
const NOUN_BY_SUB_TYPE: Readonly<Record<WebullSubType, WebullMessageNoun>> = {
  QUOTE: { proves: "QUOTE", one: "quote", many: "quotes" },
  TICK: { proves: "TICK", one: "print", many: "prints" },
  SNAPSHOT: { proves: "SNAPSHOT", one: "snapshot", many: "snapshots" },
};

/** Only a subscription to exactly one subType names what each message is. */
export function webullMessageNoun(subscribedTo: readonly WebullSubType[]): WebullMessageNoun {
  const distinct = [...new Set(subscribedTo)];
  return distinct.length === 1 ? NOUN_BY_SUB_TYPE[distinct[0]!] : NEUTRAL_NOUN;
}

/** "1 quote", "3 quotes", "0 prints" — the count with the noun it has earned. */
export function describeMessageCount(state: Pick<WebullLiveStreamState, "messageCount" | "subscribedTo">): string {
  const noun = webullMessageNoun(state.subscribedTo);
  return `${state.messageCount} ${state.messageCount === 1 ? noun.one : noun.many}`;
}

function flowingWords(subscribedTo: readonly WebullSubType[], topic: string): { headline: string; detail: string } {
  switch (webullMessageNoun(subscribedTo).proves) {
    case "QUOTE":
      return {
        headline: "Quotes arriving",
        detail: `Level-1 quotes (best bid/ask) are arriving from Webull on ${topic}. These are quote updates — not trade prints, and not depth.`,
      };
    case "TICK":
      return { headline: "Prints arriving", detail: `Trade prints are arriving from Webull on ${topic}.` };
    case "SNAPSHOT":
      return {
        headline: "Snapshots arriving",
        detail: `Snapshots are arriving from Webull on ${topic}. A snapshot is a summary, not a trade print.`,
      };
    default:
      return {
        headline: "Messages arriving",
        detail: `Messages are arriving from Webull on ${topic}. Which kind each one is has not been established.`,
      };
  }
}

/** Phases a later `closed` must not repaint — the reason already on screen is the truer one. */
const STICKY_PHASES: ReadonlySet<WebullStreamPhase> = new Set([
  "CONNECTION_REFUSED",
  "SUBSCRIBE_REFUSED",
  "AWAITING_APPROVAL",
  "NOT_AVAILABLE_HERE",
]);

export interface WebullLiveStreamState {
  readonly phase: WebullStreamPhase;
  /** The short line a trader reads. Never speculative. */
  readonly headline: string;
  /** The provider's own words, or ours, verbatim from the event. */
  readonly detail: string;
  /** What this stream asked Webull for. The ONLY source of the count's noun. */
  readonly subscribedTo: readonly WebullSubType[];
  /**
   * Every PUBLISH received — of whatever class `subscribedTo` proves. Was
   * `quoteCount` and was rendered as "prints" until 2026-09-26.
   */
  readonly messageCount: number;
  /**
   * The ROUTE's receive stamp (`receivedAt`, server clock) for the newest
   * message — not a provider event time. It dates arrival, which is what the
   * silence budget measures; it is never shown as the market's own time.
   */
  readonly lastMessageAt: string | null;
  readonly lastTopic: string | null;
}

export const initialWebullStreamState: WebullLiveStreamState = {
  phase: "IDLE",
  headline: "Not started",
  detail: "Nothing has been asked of Webull yet.",
  subscribedTo: [],
  messageCount: 0,
  lastMessageAt: null,
  lastTopic: null,
};

/** Each open is a NEW stream, judged against what THIS open asked for. */
export function openingWebullStreamState(subscribedTo: readonly WebullSubType[]): WebullLiveStreamState {
  return {
    ...initialWebullStreamState,
    subscribedTo: Object.freeze([...subscribedTo]),
    phase: "OPENING",
    headline: "Opening",
    detail: "Connecting to Webull's real-time host and waiting for its answer.",
  };
}

export function reduceWebullStream(
  state: WebullLiveStreamState,
  event: WebullStreamRouteEvent,
): WebullLiveStreamState {
  switch (event.kind) {
    case "gate":
      return event.gate === "AWAITING_2FA"
        ? {
            ...state,
            phase: "AWAITING_APPROVAL",
            // One human step, named as itself — never folded into an auth
            // fault, which is how a one-tap fix became weeks of re-pasting.
            headline: "Approve in the Webull app",
            detail: event.note,
          }
        : { ...state, phase: "NOT_AVAILABLE_HERE", headline: "Not available on this deployment", detail: event.note };

    case "session":
      return {
        ...state,
        headline: event.verdict === "REAUTHORIZE" ? "Reauthorize needed" : state.headline,
        detail: event.note,
      };

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
      // The wire event is named "quote" for every PUBLISH, whatever it carries.
      // The headline used to read "Live" (painted green) and the detail
      // "Prints are arriving" over a QUOTE-only subscription. Arrival settles
      // the ACCESS question; it does not certify what arrived as trades, and
      // it says nothing about how long it keeps arriving — that is the
      // silence reader's job below.
      return {
        ...state,
        phase: "FLOWING",
        ...flowingWords(state.subscribedTo, event.topic),
        messageCount: state.messageCount + 1,
        lastMessageAt: event.receivedAt,
        lastTopic: event.topic,
      };

    case "closed":
      return {
        ...state,
        // A stream that carried prints and then ended is not a failure, and
        // must not be repainted as one on the way out.
        phase: STICKY_PHASES.has(state.phase) ? state.phase : "ENDED",
        headline:
          STICKY_PHASES.has(state.phase)
            ? state.headline
            : state.messageCount > 0
              ? "Stream ended"
              : `Stream ended with no ${webullMessageNoun(state.subscribedTo).many}`,
        // A gate's own sentence (the 2FA wait, the missing key pair) is the
        // actionable one; the close that follows it adds nothing and must not
        // replace it.
        detail: state.phase === "AWAITING_APPROVAL" || state.phase === "NOT_AVAILABLE_HERE"
          ? state.detail
          : event.reason,
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
  if (state.messageCount > 0) return null;
  if (state.phase !== "SUBSCRIBED" && state.phase !== "ENDED") return null;
  return (
    `Webull accepted the subscription and has sent no ${webullMessageNoun(state.subscribedTo).many} yet. That is a ` +
    "question about the market and the symbols requested — whether anything is " +
    "trading right now — and it resolves nothing about access."
  );
}

/* ── ARRIVAL IS NOT A STANDING CONDITION ─────────────────────────────────────
   Found 2026-09-26 at 3ff5cd7 (audit): the strip went FLOWING on the first
   message and stayed FLOWING — headline "Live", green — for the rest of the
   stream, whether or not anything arrived after it. The reducer cannot fix
   that: it is driven by events and silence is the ABSENCE of one. So the
   standing is read against a clock, here, with the house's one live budget
   (`LIVE_STALENESS_BUDGET_MS`, osChrome) rather than a new number. */

/**
 * The state as the glass may show it at `nowMs`.
 *
 * FLOWING decays to a NAMED silence once the newest message is older than the
 * budget. It does not decay to ENDED or to a refusal: the socket may still be
 * open, and nothing has failed — the house simply has nothing recent to show.
 *
 * `nowMs <= 0` (the shared feed clock before its first sample) and an
 * unparseable stamp are "not established": the state is returned unchanged
 * rather than rounded into either FLOWING-is-fine or SILENT.
 */
export function readWebullStreamStanding(
  state: WebullLiveStreamState,
  nowMs: number,
  budgetMs: number = LIVE_STALENESS_BUDGET_MS,
): WebullLiveStreamState {
  if (state.phase !== "FLOWING" || state.lastMessageAt === null) return state;
  if (!Number.isFinite(nowMs) || nowMs <= 0) return state;
  const lastMs = Date.parse(state.lastMessageAt);
  if (!Number.isFinite(lastMs)) return state;
  const ageMs = nowMs - lastMs;
  if (ageMs <= budgetMs) return state;
  const noun = webullMessageNoun(state.subscribedTo);
  const quietFor = ageMs >= 120_000 ? `${Math.floor(ageMs / 60_000)} min` : `${Math.floor(ageMs / 1000)} s`;
  return {
    ...state,
    phase: "SILENT",
    headline: `Silent · no ${noun.one} for ${quietFor}`,
    detail:
      `Nothing has arrived from Webull for longer than the ${Math.round(budgetMs / 1000)} s live budget. ` +
      "The count is history, not a current feed. The socket may still be open; this says only that nothing recent has arrived.",
  };
}
