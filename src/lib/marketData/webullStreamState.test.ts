import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  describeMessageCount,
  describeSilence,
  initialWebullStreamState,
  openingWebullStreamState,
  readWebullStreamStanding,
  reduceWebullStream,
  webullMessageNoun,
  type WebullLiveStreamState,
} from "./webullStreamState";
import type { WebullStreamEvent, WebullStreamRouteEvent } from "./webullQuotesStream";
import type { WebullSubType } from "./webullQuotesSubscribe";
import { LIVE_STALENESS_BUDGET_MS } from "@/lib/os/osChrome";

/** What the production strip subscribes: QUOTE only (WebullRealTimeStrip.tsx). */
function play(
  events: readonly WebullStreamRouteEvent[],
  subscribedTo: readonly WebullSubType[] = ["QUOTE"],
): WebullLiveStreamState {
  return events.reduce(reduceWebullStream, openingWebullStreamState(subscribedTo));
}

const ACCEPTED: WebullStreamEvent = {
  kind: "handshake",
  accepted: true,
  credentialRejected: false,
  connAck: { sessionPresent: false, returnCode: 0, meaning: "Connection successful" },
  note: "Webull's real-time broker ACCEPTED this app key.",
};

const SUBSCRIBED: WebullStreamEvent = {
  kind: "subscribe",
  subscribed: true,
  status: 200,
  providerCode: null,
  note: "Webull accepted the subscription for this session id.",
};

const TWO_QUOTES: readonly WebullStreamRouteEvent[] = [
  ACCEPTED,
  SUBSCRIBED,
  { kind: "quote", topic: "quote/AAPL", receivedAt: "2026-09-21T14:00:00.000Z", payload: {} },
  { kind: "quote", topic: "quote/TSLA", receivedAt: "2026-09-21T14:00:01.000Z", payload: {} },
];
const LAST_RECEIVED_MS = Date.parse("2026-09-21T14:00:01.000Z");

describe("reduceWebullStream", () => {
  /*
    REPLACED PIN, 2026-09-26. This test was "counts prints and reports the
    newest one" and asserted `headline: "Live"` over a QUOTE-only stream. The
    strip painted that headline green and suffixed the count with "prints".
    A QUOTE subscription delivers Level-1 bid/ask updates: not trades (a print
    is a trade), not depth (Garden 16 §13, TICK STREAM ≠ DEPTH), and "Live"
    was a standing claim made by one arrival with no clock behind it. The
    count, the newest stamp and the topic are pinned exactly as before.
  */
  it("counts QUOTE messages as quotes, never as prints, and claims no 'Live'", () => {
    const state = play(TWO_QUOTES);
    expect(state).toMatchObject({
      phase: "FLOWING",
      headline: "Quotes arriving",
      messageCount: 2,
      lastTopic: "quote/TSLA",
      lastMessageAt: "2026-09-21T14:00:01.000Z",
    });
    expect(describeMessageCount(state)).toBe("2 quotes");
    expect(state.headline).not.toMatch(/\blive\b/i);
    // The headline and the count never say "print"; the detail says it only to
    // deny it (asserted verbatim on the next line but one).
    expect(`${state.headline} ${describeMessageCount(state)}`).not.toMatch(/print/i);
    expect(state.detail).toMatch(/Level-1 quotes \(best bid\/ask\)/);
    expect(state.detail).toMatch(/not trade prints, and not depth/);
  });

  it("only a TICK-only subscription earns the word 'print'", () => {
    const tick = play(TWO_QUOTES, ["TICK"]);
    expect(describeMessageCount(tick)).toBe("2 prints");
    expect(tick.headline).toBe("Prints arriving");
    for (const sub of [["QUOTE"], ["SNAPSHOT"], ["QUOTE", "TICK"], []] as WebullSubType[][]) {
      expect(describeMessageCount(play(TWO_QUOTES, sub)), sub.join("+") || "none").not.toMatch(/print/);
    }
  });

  it("a mixed or unstated subscription gets the neutral noun — the topic format is not established", () => {
    expect(webullMessageNoun(["QUOTE", "TICK"]).proves).toBeNull();
    expect(webullMessageNoun([]).proves).toBeNull();
    expect(describeMessageCount(play(TWO_QUOTES, ["QUOTE", "TICK"]))).toBe("2 messages");
    // Duplicates are one subType, not a mix.
    expect(webullMessageNoun(["QUOTE", "QUOTE"]).proves).toBe("QUOTE");
    expect(describeMessageCount({ messageCount: 1, subscribedTo: ["QUOTE"] })).toBe("1 quote");
  });

  it("keeps the four refusals distinct instead of collapsing them", () => {
    const refusedConnection = play([
      { kind: "handshake", accepted: false, credentialRejected: true, connAck: null, note: "bad key" },
    ]);
    const refusedSubscribe = play([
      ACCEPTED,
      { kind: "subscribe", subscribed: false, status: 417, providerCode: "INVALID_SESSION", note: "socket" },
    ]);
    const quiet = play([ACCEPTED, SUBSCRIBED]);
    const flowing = play([
      ACCEPTED,
      SUBSCRIBED,
      { kind: "quote", topic: "t", receivedAt: "2026-09-21T14:00:00.000Z", payload: {} },
    ]);

    expect(refusedConnection.phase).toBe("CONNECTION_REFUSED");
    expect(refusedSubscribe.phase).toBe("SUBSCRIBE_REFUSED");
    expect(quiet.phase).toBe("SUBSCRIBED");
    expect(flowing.phase).toBe("FLOWING");
    expect(new Set([refusedConnection, refusedSubscribe, quiet, flowing].map((s) => s.headline)).size).toBe(4);
  });

  it("never turns a refusal into a claim about what anyone owns", () => {
    for (const state of [
      play([{ kind: "handshake", accepted: false, credentialRejected: false, connAck: null, note: "n" }]),
      play([ACCEPTED, { kind: "subscribe", subscribed: false, status: 417, providerCode: null, note: "n" }]),
    ]) {
      expect(state.headline).not.toMatch(/subscri.*(required|missing|needed)/i);
      expect(state.headline).not.toMatch(/\bentitle|\bnot subscribed\b|\bupgrade\b|\bbuy\b/i);
    }
  });

  it("does not repaint a stream that carried prints as a failure when it ends", () => {
    const state = play([
      ACCEPTED,
      SUBSCRIBED,
      { kind: "quote", topic: "t", receivedAt: "2026-09-21T14:00:00.000Z", payload: {} },
      { kind: "closed", reason: "time limit" },
    ]);
    expect(state.phase).toBe("ENDED");
    expect(state.headline).toBe("Stream ended");
    expect(state.messageCount).toBe(1);
  });

  it("an empty end names the class it was waiting for", () => {
    const state = play([ACCEPTED, SUBSCRIBED, { kind: "closed", reason: "time limit" }]);
    expect(state.headline).toBe("Stream ended with no quotes");
  });

  it("keeps a refusal visible through the close that follows it", () => {
    const state = play([
      { kind: "handshake", accepted: false, credentialRejected: true, connAck: null, note: "bad key" },
      { kind: "closed", reason: "nothing was subscribed" },
    ]);
    expect(state.phase).toBe("CONNECTION_REFUSED");
    expect(state.headline).toBe("Connection refused");
    expect(state.detail).toBe("nothing was subscribed");
  });

  it("names a 2FA wait as its own calm phase, and a close does not bury it", () => {
    const state = play([
      { kind: "gate", gate: "AWAITING_2FA", note: "Approve the Webull session in the Webull app." },
      { kind: "closed", reason: "Nothing was asked of Webull's real-time host." },
    ]);
    expect(state.phase).toBe("AWAITING_APPROVAL");
    expect(state.headline).toBe("Approve in the Webull app");
    expect(state.detail).toBe("Approve the Webull session in the Webull app.");
    expect(state.headline).not.toMatch(/refused|fail|error|reauthori/i);
  });

  it("keeps a deployment gate distinct from a broker refusal", () => {
    const gated = play([{ kind: "gate", gate: "NO_SOCKETS", note: "This runtime cannot open raw sockets." }]);
    expect(gated.phase).toBe("NOT_AVAILABLE_HERE");
    expect(gated.headline).not.toMatch(/refused/i);
  });

  it("says REAUTHORIZE only when the route says a freshly minted session was refused too", () => {
    const refused = play([
      ACCEPTED,
      { kind: "subscribe", subscribed: false, status: 401, providerCode: "INVALID_TOKEN", note: "session" },
    ]);
    expect(reduceWebullStream(refused, { kind: "session", verdict: "REMINT", note: "retired" }).headline).not.toMatch(/reauthori/i);
    expect(reduceWebullStream(refused, { kind: "session", verdict: "REAUTHORIZE", note: "again" }).headline).toBe("Reauthorize needed");
  });

  it("starts from a state that claims nothing", () => {
    expect(initialWebullStreamState.messageCount).toBe(0);
    expect(initialWebullStreamState.subscribedTo).toEqual([]);
    expect(initialWebullStreamState.detail).toMatch(/nothing has been asked/i);
  });
});

describe("readWebullStreamStanding — arrival is not a standing condition", () => {
  const flowing = play(TWO_QUOTES);

  it("keeps FLOWING while the newest message is inside the house's live budget", () => {
    // Uses the ONE budget (osChrome LIVE_STALENESS_BUDGET_MS), not a new number.
    for (const age of [0, 1_000, LIVE_STALENESS_BUDGET_MS]) {
      expect(readWebullStreamStanding(flowing, LAST_RECEIVED_MS + age), `age ${age}`).toBe(flowing);
    }
  });

  it("DECAYS to a named silence one millisecond past the budget", () => {
    const shown = readWebullStreamStanding(flowing, LAST_RECEIVED_MS + LIVE_STALENESS_BUDGET_MS + 1);
    expect(shown.phase).toBe("SILENT");
    expect(shown.headline).toBe("Silent · no quote for 90 s");
    expect(shown.detail).toMatch(/longer than the 90 s live budget/);
    expect(shown.detail).toMatch(/The count is history, not a current feed/);
    // History is kept, not erased: the count and the stamp survive the decay.
    expect(shown.messageCount).toBe(2);
    expect(shown.lastMessageAt).toBe(flowing.lastMessageAt);
    // A silence is not a refusal and not a fault.
    expect(shown.headline).not.toMatch(/refused|fail|error|ended/i);
  });

  it("names long silences in minutes", () => {
    const shown = readWebullStreamStanding(flowing, LAST_RECEIVED_MS + 5 * 60_000);
    expect(shown.headline).toBe("Silent · no quote for 5 min");
  });

  it("a new message after a silence restores FLOWING — the reducer owns arrival, the reader owns decay", () => {
    const later = reduceWebullStream(flowing, {
      kind: "quote", topic: "quote/TSLA", receivedAt: "2026-09-21T14:05:00.000Z", payload: {},
    });
    const now = Date.parse("2026-09-21T14:05:01.000Z");
    expect(readWebullStreamStanding(later, now).phase).toBe("FLOWING");
    expect(describeMessageCount(later)).toBe("3 quotes");
  });

  it("an unestablished clock or stamp is NOT rounded into either verdict", () => {
    // 0 is the shared feed clock before its first sample.
    for (const now of [0, -1, Number.NaN]) {
      expect(readWebullStreamStanding(flowing, now), `now ${now}`).toBe(flowing);
    }
    const garbled = { ...flowing, lastMessageAt: "not a time" };
    expect(readWebullStreamStanding(garbled, LAST_RECEIVED_MS + 10 * LIVE_STALENESS_BUDGET_MS)).toBe(garbled);
  });

  it("only FLOWING decays — refusals, waits and endings keep their own truer sentence", () => {
    const far = LAST_RECEIVED_MS + 100 * LIVE_STALENESS_BUDGET_MS;
    const ended = play([...TWO_QUOTES, { kind: "closed", reason: "time limit" }]);
    const refused = play([{ kind: "handshake", accepted: false, credentialRejected: true, connAck: null, note: "bad key" }]);
    for (const state of [ended, refused, play([ACCEPTED, SUBSCRIBED])]) {
      expect(readWebullStreamStanding(state, far)).toBe(state);
    }
  });

  it("the strip reads the standing at the shared feed clock and never paints arrival green", () => {
    const strip = readFileSync(
      resolve(__dirname, "../../components/marketData/WebullRealTimeStrip.tsx"),
      "utf8",
    );
    // Vacuity guard (sentinelsProveTheyScanned): the read found the component.
    expect(strip.length, "the strip source was read").toBeGreaterThan(1_000);
    expect(strip).toContain("readWebullStreamStanding(state, nowMs)");
    expect(strip).toContain("useFeedEvaluationClock()");
    expect(strip).toContain("describeMessageCount(shown)");
    // The URL and the noun read ONE subscription constant.
    expect(strip).toContain("openingWebullStreamState(STRIP_SUB_TYPES)");
    expect(strip).toContain("subTypes=${STRIP_SUB_TYPES.join(\",\")}");
    expect(strip).not.toMatch(/FLOWING:\s*"#00C076"/);
    expect(strip).not.toContain("print{state.quoteCount");
  });
});

describe("describeSilence", () => {
  it("explains silence as a market question, never an access one", () => {
    const quiet = play([ACCEPTED, SUBSCRIBED]);
    const sentence = describeSilence(quiet);
    expect(sentence).toMatch(/question about the market/i);
    expect(sentence).toMatch(/resolves nothing about access/i);
    // The silent class is the one subscribed (QUOTE), not "prints".
    expect(sentence).toMatch(/has sent no quotes yet/);
    expect(sentence).not.toMatch(/\b(go|must|need to|should)\s+(buy|purchase|upgrade|subscribe)\b/i);
  });

  it("says nothing once prints exist, or before a subscription does", () => {
    expect(
      describeSilence(
        play([
          ACCEPTED,
          SUBSCRIBED,
          { kind: "quote", topic: "t", receivedAt: "2026-09-21T14:00:00.000Z", payload: {} },
        ]),
      ),
    ).toBeNull();
    expect(describeSilence(openingWebullStreamState(["QUOTE"]))).toBeNull();
    expect(
      describeSilence(
        play([{ kind: "handshake", accepted: false, credentialRejected: false, connAck: null, note: "n" }]),
      ),
    ).toBeNull();
  });
});
