import { describe, expect, it } from "vitest";
import {
  handshakeWebullQuotes,
  readQuotesHandshake,
  type DuplexSocket,
} from "./webullQuotesHandshake";
import { decodePackets, MQTT_PACKET } from "./webullQuotesSocket";

/**
 * The bytes are pinned next door. These tests pin the SENTENCES, because the
 * sentences are what actually went wrong.
 *
 * For three months a provider refusal was reported to the Founder as a fact
 * about his account, and he bought a data package he already owned. Nothing
 * about that failure was in a packet. It was in the step between reading a code
 * and saying what it meant. That step is a pure function here so it can be held
 * to account.
 */

function scriptedSocket(replies: readonly Uint8Array[]): {
  readonly socket: DuplexSocket;
  readonly written: Uint8Array[];
  closed: () => boolean;
} {
  const written: Uint8Array[] = [];
  let wasClosed = false;
  let index = 0;
  const socket: DuplexSocket = {
    readable: new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index < replies.length) controller.enqueue(replies[index++]!);
        else controller.close();
      },
    }),
    writable: new WritableStream<Uint8Array>({
      write(chunk) {
        written.push(chunk);
      },
    }),
    async close() {
      wasClosed = true;
    },
  };
  return { socket, written, closed: () => wasClosed };
}

const creds = { appKey: "public-test-key", sessionId: "s".repeat(32), password: "nonce" };
const connack = (code: number) => Uint8Array.from([MQTT_PACKET.CONNACK << 4, 2, 0, code]);

describe("reading Webull's real-time CONNACK without over-claiming", () => {
  it("treats a transport failure as evidence about US, not about entitlement", () => {
    const read = readQuotesHandshake({
      transportOpen: false,
      connAck: null,
      transportError: "TLS handshake failed",
    });
    expect(read.accepted).toBe(false);
    expect(read.credentialRejected).toBe(false);
    expect(read.note).toMatch(/OUR side of the wire/);
    expect(read.note).toMatch(/nobody may be told to buy anything/i);
  });

  it("says plainly that an accepted CONNACK retires the three-month reading", () => {
    const read = readQuotesHandshake({
      transportOpen: true,
      connAck: { sessionPresent: false, returnCode: 0, meaning: "Connection successful" },
      transportError: null,
    });
    expect(read.accepted).toBe(true);
    expect(read.credentialRejected).toBe(false);
    expect(read.note).toMatch(/data-api\.webull\.com/);
    expect(read.note).toMatch(/different door/i);
  });

  it("calls 103 and 104 credential evidence — and scopes them to the app key", () => {
    for (const code of [103, 104]) {
      const read = readQuotesHandshake({
        transportOpen: true,
        connAck: { sessionPresent: false, returnCode: code, meaning: "x" },
        transportError: null,
      });
      expect(read.credentialRejected).toBe(true);
      // Even a real credential rejection is not a statement about a purchase.
      expect(read.note).toMatch(/not about a market-data purchase/i);
    }
  });

  it("refuses to read 'connection limit exceeded' as a permissions answer", () => {
    // The most seductive false positive available: it comes from the provider
    // and it refuses us. It is a fact about how many sockets WE are holding.
    const read = readQuotesHandshake({
      transportOpen: true,
      connAck: { sessionPresent: false, returnCode: 105, meaning: "Connection limit exceeded" },
      transportError: null,
    });
    expect(read.accepted).toBe(false);
    expect(read.credentialRejected).toBe(false);
    expect(read.note).toMatch(/CAPACITY fact/);
  });

  it("leaves an undocumented or internal code resolving nothing", () => {
    const read = readQuotesHandshake({
      transportOpen: true,
      connAck: { sessionPresent: false, returnCode: 101, meaning: "Internal error" },
      transportError: null,
    });
    expect(read.credentialRejected).toBe(false);
    expect(read.note).toMatch(/resolves nothing about entitlement/);
  });
});

describe("driving the real-time socket", () => {
  it("sends CONNECT first and reads exactly one CONNACK", async () => {
    const { socket, written } = scriptedSocket([connack(0)]);
    const receipt = await handshakeWebullQuotes(async () => socket, creds);

    const first = decodePackets(written[0]!).packets[0]!;
    expect(first.type).toBe(MQTT_PACKET.CONNECT);
    expect(receipt.accepted).toBe(true);
    expect(receipt.connAck?.returnCode).toBe(0);
    expect(receipt.transportOpen).toBe(true);
  });

  it("reassembles a CONNACK split across two reads", async () => {
    // TCP is a byte stream. Parsing the first chunk on arrival is how a
    // two-byte answer becomes a truncated-packet error that reads like a
    // protocol incompatibility.
    const whole = connack(104);
    const { socket } = scriptedSocket([whole.subarray(0, 2), whole.subarray(2)]);
    const receipt = await handshakeWebullQuotes(async () => socket, creds);
    expect(receipt.connAck?.returnCode).toBe(104);
    expect(receipt.credentialRejected).toBe(true);
  });

  it("hangs up rather than holding the socket open", async () => {
    // A leaked connection is what CONNACK 105 eventually looks like — arriving
    // from the provider, refusing us, reading like a permissions problem.
    const { socket, written, closed } = scriptedSocket([connack(0)]);
    await handshakeWebullQuotes(async () => socket, creds);
    const sent = written.flatMap((chunk) => [...decodePackets(chunk).packets]);
    expect(sent.some((packet) => packet.type === MQTT_PACKET.DISCONNECT)).toBe(true);
    expect(closed()).toBe(true);
  });

  it("reports a refused connection as transport, with no verdict attached", async () => {
    const receipt = await handshakeWebullQuotes(async () => {
      throw new Error("connect(): egress blocked");
    }, creds);
    expect(receipt.transportOpen).toBe(false);
    expect(receipt.accepted).toBe(false);
    expect(receipt.credentialRejected).toBe(false);
    expect(receipt.transportError).toMatch(/egress blocked/);
    expect(receipt.note).toMatch(/OUR side of the wire/);
  });

  it("gives up on a silent broker instead of hanging", async () => {
    const { socket } = scriptedSocket([]);
    const receipt = await handshakeWebullQuotes(async () => socket, creds, { timeoutMs: 50 });
    expect(receipt.connAck).toBeNull();
    expect(receipt.accepted).toBe(false);
    expect(receipt.note).toMatch(/never got an answer/i);
  });

  it("never puts a credential in the receipt", async () => {
    // This receipt is built to be pasted into chat and screenshotted, which has
    // already happened repeatedly while debugging this exact problem.
    const { socket } = scriptedSocket([connack(0)]);
    const receipt = await handshakeWebullQuotes(async () => socket, {
      appKey: "SECRET-APP-KEY",
      sessionId: "SECRET-SESSION",
      password: "SECRET-PASSWORD",
    });
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toContain("SECRET-APP-KEY");
    expect(serialized).not.toContain("SECRET-SESSION");
    expect(serialized).not.toContain("SECRET-PASSWORD");
  });

  it("reaches data-api.webull.com, not the REST host", async () => {
    const seen: Array<{ host: string; port: number }> = [];
    const { socket } = scriptedSocket([connack(0)]);
    const receipt = await handshakeWebullQuotes(async (host, port) => {
      seen.push({ host, port });
      return socket;
    }, creds);
    expect(seen).toEqual([{ host: "data-api.webull.com", port: 1883 }]);
    expect(receipt.host).toBe("data-api.webull.com");
  });
});
