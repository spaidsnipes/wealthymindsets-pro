import { describe, expect, it } from "vitest";
import {
  describeSilence,
  initialWebullStreamState,
  openingWebullStreamState,
  reduceWebullStream,
  type WebullLiveStreamState,
} from "./webullStreamState";
import type { WebullStreamEvent } from "./webullQuotesStream";

function play(events: readonly WebullStreamEvent[]): WebullLiveStreamState {
  return events.reduce(reduceWebullStream, openingWebullStreamState);
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

describe("reduceWebullStream", () => {
  it("counts prints and reports the newest one", () => {
    const state = play([
      ACCEPTED,
      SUBSCRIBED,
      { kind: "quote", topic: "quote/AAPL", receivedAt: "2026-09-21T14:00:00.000Z", payload: {} },
      { kind: "quote", topic: "quote/TSLA", receivedAt: "2026-09-21T14:00:01.000Z", payload: {} },
    ]);
    expect(state).toMatchObject({
      phase: "FLOWING",
      headline: "Live",
      quoteCount: 2,
      lastTopic: "quote/TSLA",
      lastQuoteAt: "2026-09-21T14:00:01.000Z",
    });
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
    expect(state.quoteCount).toBe(1);
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

  it("starts from a state that claims nothing", () => {
    expect(initialWebullStreamState.quoteCount).toBe(0);
    expect(initialWebullStreamState.detail).toMatch(/nothing has been asked/i);
  });
});

describe("describeSilence", () => {
  it("explains silence as a market question, never an access one", () => {
    const quiet = play([ACCEPTED, SUBSCRIBED]);
    const sentence = describeSilence(quiet);
    expect(sentence).toMatch(/question about the market/i);
    expect(sentence).toMatch(/resolves nothing about access/i);
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
    expect(describeSilence(openingWebullStreamState)).toBeNull();
    expect(
      describeSilence(
        play([{ kind: "handshake", accepted: false, credentialRejected: false, connAck: null, note: "n" }]),
      ),
    ).toBeNull();
  });
});
