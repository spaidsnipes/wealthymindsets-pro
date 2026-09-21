/**
 * THE ORDER, PROVEN OFFLINE.
 *
 * The thing that can go wrong here is not a byte. It is a sequence: subscribing
 * before CONNACK, or subscribing with a session id that is not the socket's
 * client id. Both produce `417 INVALID_SESSION`, which reads like a permissions
 * answer and is not one. So the assertions below are mostly about WHEN things
 * happen and WHICH STRING was reused — not about payload shapes.
 */
import { describe, expect, it } from "vitest";
import { streamWebullQuotes, type WebullStreamEvent } from "./webullQuotesStream";
import type { DuplexSocket } from "./webullQuotesHandshake";
import {
  MQTT_PACKET,
  decodePackets,
  encodeRemainingLength,
  type MqttPacket,
} from "./webullQuotesSocket";
import type { WebullSignedRequest } from "./webullQuotesSubscribe";

function connAckBytes(returnCode: number): Uint8Array {
  return Uint8Array.from([MQTT_PACKET.CONNACK << 4, 2, 0, returnCode]);
}

function publishBytes(topic: string, payload: string): Uint8Array {
  const topicBytes = new TextEncoder().encode(topic);
  const payloadBytes = new TextEncoder().encode(payload);
  const body = new Uint8Array(2 + topicBytes.length + payloadBytes.length);
  body[0] = (topicBytes.length >> 8) & 0xff;
  body[1] = topicBytes.length & 0xff;
  body.set(topicBytes, 2);
  body.set(payloadBytes, 2 + topicBytes.length);
  const length = encodeRemainingLength(body.length);
  const packet = new Uint8Array(1 + length.length + body.length);
  packet[0] = MQTT_PACKET.PUBLISH << 4; // QoS 0, no packet identifier
  packet.set(length, 1);
  packet.set(body, 1 + length.length);
  return packet;
}

interface ScriptedSocket extends DuplexSocket {
  readonly written: Uint8Array[];
  readonly closed: () => boolean;
}

/** Emits the scripted chunks in order, then ends the stream. */
function scriptedSocket(
  chunks: readonly Uint8Array[],
  onDeliver?: (index: number) => void,
): ScriptedSocket {
  const written: Uint8Array[] = [];
  let isClosed = false;
  let at = 0;
  const readable = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (at < chunks.length) {
        controller.enqueue(chunks[at]!);
        onDeliver?.(at);
        at += 1;
        return;
      }
      controller.close();
    },
  });
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      written.push(chunk);
    },
  });
  return {
    readable,
    writable,
    written,
    closed: () => isClosed,
    close: async () => {
      isClosed = true;
    },
  };
}

function writtenPackets(socket: ScriptedSocket): readonly MqttPacket[] {
  const total = socket.written.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let at = 0;
  for (const chunk of socket.written) {
    merged.set(chunk, at);
    at += chunk.length;
  }
  return decodePackets(merged).packets;
}

const INPUT = {
  appKey: "test-app-key",
  appSecret: "test-app-secret",
  symbols: ["AAPL"],
  category: "US_STOCK",
  subTypes: ["QUOTE"],
  profile: "sdk-sha256",
  durationMs: 50,
  handshakeTimeoutMs: 200,
} as const;

function idMinter(): () => string {
  let n = 0;
  return () => `id-${(n += 1)}`;
}

async function collect(
  generator: AsyncGenerator<WebullStreamEvent>,
): Promise<WebullStreamEvent[]> {
  const events: WebullStreamEvent[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

describe("streamWebullQuotes", () => {
  it("subscribes with the SAME id the socket connected with, and only after CONNACK 0", async () => {
    let connAckDelivered = false;
    const socket = scriptedSocket([connAckBytes(0), publishBytes("t", "{}")], (index) => {
      if (index === 0) connAckDelivered = true;
    });
    const sent: WebullSignedRequest[] = [];
    let subscribedBeforeConnAck = false;

    const events = await collect(
      streamWebullQuotes(
        {
          openSocket: () => socket,
          mintId: idMinter(),
          send: async (request) => {
            if (!connAckDelivered) subscribedBeforeConnAck = true;
            sent.push(request);
            return { status: 200, payload: { code: "OK" } };
          },
        },
        { ...INPUT },
      ),
    );

    expect(subscribedBeforeConnAck).toBe(false);
    expect(sent).toHaveLength(1);

    // The MQTT client id. `mintId` hands out id-1 first, so that is the
    // CONNECT's client id — and it MUST be what the subscribe body names.
    const body = JSON.parse(sent[0]!.body);
    expect(body.session_id).toBe("id-1");

    const connect = writtenPackets(socket).find((p) => p.type === MQTT_PACKET.CONNECT);
    expect(connect).toBeDefined();
    expect(new TextDecoder().decode(connect!.body)).toContain("id-1");

    expect(events[0]).toMatchObject({ kind: "handshake", accepted: true });
    expect(events[1]).toMatchObject({ kind: "subscribe", subscribed: true });
  });

  it("delivers quotes that shared a read with the CONNACK", async () => {
    // One TCP segment carrying both. Dropping the PUBLISH here would look
    // exactly like a quiet market.
    const merged = new Uint8Array([...connAckBytes(0), ...publishBytes("quote/AAPL", '{"p":"1.25"}')]);
    const socket = scriptedSocket([merged]);

    const events = await collect(
      streamWebullQuotes(
        {
          openSocket: () => socket,
          mintId: idMinter(),
          send: async () => ({ status: 200, payload: {} }),
        },
        { ...INPUT },
      ),
    );

    const quotes = events.filter((event) => event.kind === "quote");
    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({ topic: "quote/AAPL", payload: { p: "1.25" } });
  });

  it("reports a non-JSON payload verbatim instead of discarding it", async () => {
    const socket = scriptedSocket([connAckBytes(0), publishBytes("raw", "not json")]);
    const events = await collect(
      streamWebullQuotes(
        {
          openSocket: () => socket,
          mintId: idMinter(),
          send: async () => ({ status: 200, payload: {} }),
        },
        { ...INPUT },
      ),
    );
    expect(events.filter((e) => e.kind === "quote")[0]).toMatchObject({ payload: "not json" });
  });

  it("never subscribes when the broker refuses the connection", async () => {
    const socket = scriptedSocket([connAckBytes(104)]);
    let sends = 0;
    const events = await collect(
      streamWebullQuotes(
        {
          openSocket: () => socket,
          mintId: idMinter(),
          send: async () => {
            sends += 1;
            return { status: 200, payload: {} };
          },
        },
        { ...INPUT },
      ),
    );

    expect(sends).toBe(0);
    expect(events[0]).toMatchObject({ kind: "handshake", accepted: false, credentialRejected: true });
    const closed = events.at(-1)!;
    expect(closed.kind).toBe("closed");
    expect(closed.kind === "closed" && closed.reason).toMatch(/not open/i);
  });

  it("says a failed open is OUR side of the wire, and claims nothing else", async () => {
    const events = await collect(
      streamWebullQuotes(
        {
          openSocket: () => {
            throw new Error("connection refused");
          },
          mintId: idMinter(),
          send: async () => ({ status: 200, payload: {} }),
        },
        { ...INPUT },
      ),
    );

    expect(events[0]).toMatchObject({ kind: "handshake", accepted: false, credentialRejected: false });
    const note = events[0]!.kind === "handshake" ? events[0]!.note : "";
    expect(note).toMatch(/our side of the wire/i);
    // The note is allowed to FORBID telling anyone to buy something — it does,
    // in those words. What it may never do is issue the instruction.
    expect(note).not.toMatch(/\b(go|must|need to|should)\s+(buy|purchase|upgrade|subscribe)\b/i);
  });

  it("passes a 417 through as a connection-lifecycle fact and stops", async () => {
    const socket = scriptedSocket([connAckBytes(0), publishBytes("t", "{}")]);
    const events = await collect(
      streamWebullQuotes(
        {
          openSocket: () => socket,
          mintId: idMinter(),
          send: async () => ({ status: 417, payload: { code: "INVALID_SESSION" } }),
        },
        { ...INPUT },
      ),
    );

    const subscribe = events.find((event) => event.kind === "subscribe")!;
    expect(subscribe).toMatchObject({ subscribed: false, status: 417, providerCode: "INVALID_SESSION" });
    expect(subscribe.kind === "subscribe" && subscribe.note).toMatch(/our connection lifecycle/i);
    expect(events.some((event) => event.kind === "quote")).toBe(false);
  });

  it("reports a subscribe that never answered as ours, not the provider's", async () => {
    const socket = scriptedSocket([connAckBytes(0)]);
    const events = await collect(
      streamWebullQuotes(
        {
          openSocket: () => socket,
          mintId: idMinter(),
          send: async () => {
            throw new Error("fetch failed");
          },
        },
        { ...INPUT },
      ),
    );
    const subscribe = events.find((event) => event.kind === "subscribe")!;
    expect(subscribe).toMatchObject({ subscribed: false, status: 0, providerCode: null });
    expect(subscribe.kind === "subscribe" && subscribe.note).toMatch(/our side of\s+the wire/i);
  });

  it("closes the socket on every path, including refusal", async () => {
    for (const code of [0, 103]) {
      const socket = scriptedSocket([connAckBytes(code)]);
      await collect(
        streamWebullQuotes(
          {
            openSocket: () => socket,
            mintId: idMinter(),
            send: async () => ({ status: 200, payload: {} }),
          },
          { ...INPUT },
        ),
      );
      expect(socket.closed()).toBe(true);
      const types = writtenPackets(socket).map((packet) => packet.type);
      expect(types).toContain(MQTT_PACKET.DISCONNECT);
    }
  });

  it("emits no secret material in any event", async () => {
    const socket = scriptedSocket([connAckBytes(0), publishBytes("quote/AAPL", '{"p":"1"}')]);
    const events = await collect(
      streamWebullQuotes(
        {
          openSocket: () => socket,
          mintId: () => "SECRET-SESSION-ID",
          send: async () => ({ status: 200, payload: {} }),
        },
        { ...INPUT },
      ),
    );
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain("SECRET-SESSION-ID");
    expect(serialized).not.toContain(INPUT.appSecret);
    expect(serialized).not.toContain(INPUT.appKey);
  });
});
