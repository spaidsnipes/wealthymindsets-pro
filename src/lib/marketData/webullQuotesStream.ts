/**
 * THE ORDER OF OPERATIONS, WHICH IS THE ENTIRE PRODUCT.
 *
 * Three modules already exist below this one and each is correct in isolation:
 * `webullQuotesSocket.ts` is bytes, `webullQuotesHandshake.ts` opens a socket
 * and reads one CONNACK, `webullQuotesSubscribe.ts` builds one signed HTTP
 * request. None of them produces a quote, because a quote requires all three to
 * happen IN A PARTICULAR ORDER ON ONE SOCKET:
 *
 *   1. MQTT CONNECT to data-api.webull.com:1883 (TLS), client_id = S.
 *   2. CONNACK 0 — and ONLY then,
 *   3. POST /market-data/streaming/subscribe with `session_id` = THE SAME S,
 *   4. and the quotes arrive back down the socket opened in step 1, as PUBLISH.
 *
 * `quotes_client.py` encodes that order by calling the subscribe from inside
 * `_quotes_on_connect`, after `rc == 0`. Steps 1 and 3 cross different
 * transports — one MQTT, one HTTPS — so nothing in either module's type
 * signature can enforce the link between them. This file is where that link
 * lives, and the single value carrying it is `sessionId`, minted once at the top
 * and never re-minted.
 *
 * WHY A GENERATOR: the caller is an SSE route. It needs to forward the
 * handshake and the subscribe outcome to the glass AS THEY HAPPEN, because a
 * stream that shows nothing for eight seconds and then fails is indistinguish-
 * able, to the person watching, from a stream that was never wired. Every
 * refusal in this lane has to arrive as a sentence about whose side it happened
 * on — that is the whole lesson of this lane's history — and a generator lets
 * each one be delivered the moment it is known.
 *
 * WHAT NEVER LEAVES THIS FUNCTION: the session id, the app key, the app secret,
 * the MQTT password, and the signature. Every event below is built by hand from
 * provider scalars; none spreads an input object. These receipts get pasted into
 * chat while debugging — that has already happened on this problem repeatedly.
 */
import {
  MQTT_PACKET,
  decodePackets,
  encodeDisconnect,
  encodePingReq,
  encodeWebullConnect,
  readConnAck,
  readPublish,
  WEBULL_QUOTES_HOST,
  WEBULL_QUOTES_PORT,
  type MqttConnAck,
  type MqttPacket,
} from "./webullQuotesSocket";
import { readQuotesHandshake, type DuplexSocket } from "./webullQuotesHandshake";
import {
  buildWebullSubscribeRequest,
  readSubscribeOutcome,
  type WebullCategory,
  type WebullSignedRequest,
  type WebullSubType,
} from "./webullQuotesSubscribe";
import type { WebullSigningProfile } from "./adapters/webullMarketData";

export type WebullStreamEvent =
  | {
      readonly kind: "handshake";
      readonly accepted: boolean;
      readonly credentialRejected: boolean;
      readonly connAck: MqttConnAck | null;
      readonly note: string;
    }
  | {
      readonly kind: "subscribe";
      readonly subscribed: boolean;
      readonly status: number;
      readonly providerCode: string | null;
      readonly note: string;
    }
  | {
      readonly kind: "quote";
      /** The topic selects the decoder in the SDK; kept so it can do so here. */
      readonly topic: string;
      readonly receivedAt: string;
      /** Parsed JSON when the payload is JSON, otherwise the raw UTF-8 text. */
      readonly payload: unknown;
    }
  | {
      readonly kind: "closed";
      /** Whose side the stream ended on, said plainly. */
      readonly reason: string;
    };

/**
 * What the SSE ROUTE may say around the generator — never from the socket.
 *
 *   · `gate`    — the route stopped BEFORE Webull was contacted, and says why.
 *                 These used to be JSON bodies an EventSource cannot read, so
 *                 the one stream owner saw only an error and reconnected into
 *                 the same wall — including while Webull was simply waiting
 *                 on the Founder's 2FA tap.
 *   · `session` — what happened to the session after Webull REFUSED it on the
 *                 subscribe leg (see webullSessionRejection.ts). REMINT means
 *                 the next attempt carries a fresh one; REAUTHORIZE means a
 *                 freshly minted one was refused too.
 *
 * Neither ever carries a token, a key, a secret or a session id.
 */
export type WebullStreamGate = "UNCONFIGURED" | "NO_SOCKETS" | "AWAITING_2FA";

export type WebullStreamRouteEvent =
  | WebullStreamEvent
  | { readonly kind: "gate"; readonly gate: WebullStreamGate; readonly note: string }
  | {
      readonly kind: "session";
      readonly verdict: "REMINT" | "ALREADY_REPLACED" | "REAUTHORIZE";
      readonly note: string;
    };

/** The HTTP leg, injected so the whole flow is provable without a network. */
export type SignedRequestSender = (
  request: WebullSignedRequest,
) => Promise<{ readonly status: number; readonly payload: unknown }>;

export type QuotesSocketOpener = (
  host: string,
  port: number,
) => DuplexSocket | Promise<DuplexSocket>;

export interface WebullStreamDeps {
  readonly openSocket: QuotesSocketOpener;
  readonly send: SignedRequestSender;
  /**
   * Mints the session id and the MQTT password. Injected because the session id
   * is the one value whose IDENTITY across two transports is the thing this
   * module exists to guarantee, and a test must be able to see it.
   */
  readonly mintId: () => string;
  readonly now?: () => number;
}

export interface WebullStreamInput {
  readonly appKey: string;
  readonly appSecret: string;
  /**
   * The minted Webull session, forwarded to the subscribe leg as
   * `x-access-token`. Absent is a legal state: the request still goes, and
   * Webull's own `401 INVALID_TOKEN` names the gap better than a local guard
   * could — see the MEASURED note in `webullQuotesSubscribe.ts`.
   */
  readonly accessToken?: string;
  readonly symbols: readonly string[];
  readonly category: WebullCategory;
  readonly subTypes: readonly WebullSubType[];
  readonly host?: string;
  readonly profile?: WebullSigningProfile;
  /** How long to hold the socket open once subscribed. */
  readonly durationMs?: number;
  /** How long to wait for the CONNACK. */
  readonly handshakeTimeoutMs?: number;
  readonly quotesHost?: string;
  readonly quotesPort?: number;
}

const DEFAULT_DURATION_MS = 55_000;
const DEFAULT_HANDSHAKE_TIMEOUT_MS = 8_000;
/** paho pings at half the 60s keep-alive; so do we, with room to spare. */
const PING_INTERVAL_MS = 25_000;

/**
 * Accumulates bytes until WHOLE packets are present.
 *
 * TCP hands back arbitrary slices. Parsing whatever arrived first is how a
 * two-byte CONNACK gets read as a truncated something-else, and how a PUBLISH
 * payload gets silently shifted. The leftover is carried forward, always.
 */
class PacketStream {
  private buffered: Uint8Array = new Uint8Array(0);

  constructor(private readonly reader: ReadableStreamDefaultReader<Uint8Array>) {}

  /** Resolves with whole packets, an empty array on timeout, or null at EOF. */
  async read(timeoutMs: number): Promise<readonly MqttPacket[] | null> {
    const chunk = await Promise.race([
      this.reader.read(),
      new Promise<{ done: true; value: undefined }>((resolve) =>
        setTimeout(() => resolve({ done: true, value: undefined }), Math.max(0, timeoutMs)),
      ),
    ]);
    if (chunk.done || !chunk.value) return null;
    const merged = new Uint8Array(this.buffered.length + chunk.value.length);
    merged.set(this.buffered);
    merged.set(chunk.value, this.buffered.length);
    const { packets, rest } = decodePackets(merged);
    this.buffered = rest;
    return packets;
  }

  release(): void {
    try {
      this.reader.releaseLock();
    } catch {
      // A reader on a dead stream needs no ceremony.
    }
  }
}

async function write(socket: DuplexSocket, bytes: Uint8Array): Promise<void> {
  const writer = socket.writable.getWriter();
  try {
    await writer.write(bytes);
  } finally {
    writer.releaseLock();
  }
}

/** UTF-8 by default, exactly as `QuotesDecoder` falls through to `Utf8Decoder`. */
function decodePayload(payload: Uint8Array): unknown {
  const text = new TextDecoder().decode(payload);
  try {
    return JSON.parse(text);
  } catch {
    // Not JSON is not an error — it is a payload we report verbatim rather than
    // discard. An unread frame is better than a guessed one.
    return text;
  }
}

export async function* streamWebullQuotes(
  deps: WebullStreamDeps,
  input: WebullStreamInput,
): AsyncGenerator<WebullStreamEvent> {
  const now = deps.now ?? (() => Date.now());
  const host = input.quotesHost ?? WEBULL_QUOTES_HOST;
  const port = input.quotesPort ?? WEBULL_QUOTES_PORT;
  const durationMs = input.durationMs ?? DEFAULT_DURATION_MS;

  // Minted ONCE. This is the link between the MQTT socket and the HTTP
  // subscribe, and re-minting it anywhere below is precisely the 417
  // INVALID_SESSION this module was written to make unreachable.
  const sessionId = deps.mintId();

  let socket: DuplexSocket | null = null;
  try {
    socket = await deps.openSocket(host, port);
  } catch (error) {
    // The message only — a TLS failure can quote handshake detail.
    const transportError = error instanceof Error ? error.message : String(error);
    const read = readQuotesHandshake({ transportOpen: false, connAck: null, transportError });
    yield {
      kind: "handshake",
      accepted: false,
      credentialRejected: false,
      connAck: null,
      note: read.note,
    };
    yield { kind: "closed", reason: "The socket never opened, so nothing was subscribed." };
    return;
  }

  const stream = new PacketStream(socket.readable.getReader());
  try {
    await write(
      socket,
      encodeWebullConnect({ sessionId, appKey: input.appKey, password: deps.mintId() }),
    );

    let connAck: MqttConnAck | null = null;
    /**
     * Packets that arrived in the same read as the CONNACK.
     *
     * A broker is free to coalesce, and dropping whatever shared a TCP segment
     * with the CONNACK would lose real quotes in a way that looks exactly like
     * a quiet market — the single most misreadable failure this lane has.
     */
    const carried: MqttPacket[] = [];
    const handshakeDeadline = now() + (input.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS);
    while (!connAck && now() < handshakeDeadline) {
      const packets = await stream.read(handshakeDeadline - now());
      if (packets === null) break;
      for (const packet of packets) {
        if (!connAck && packet.type === MQTT_PACKET.CONNACK) {
          connAck = readConnAck(packet);
          continue;
        }
        carried.push(packet);
      }
    }

    const handshake = readQuotesHandshake({ transportOpen: true, connAck, transportError: null });
    yield {
      kind: "handshake",
      accepted: handshake.accepted,
      credentialRejected: handshake.credentialRejected,
      connAck,
      note: handshake.note,
    };
    if (!handshake.accepted) {
      yield {
        kind: "closed",
        reason:
          "The broker did not accept the connection, so no subscription was attempted. " +
          "Sending one would have named a socket that is not open.",
      };
      return;
    }

    // Step 3, and only now. The session id below is the SAME string the CONNECT
    // above carried — that identity is the contract.
    const request = buildWebullSubscribeRequest({
      sessionId,
      symbols: input.symbols,
      category: input.category,
      subTypes: input.subTypes,
      appKey: input.appKey,
      appSecret: input.appSecret,
      accessToken: input.accessToken,
      timestamp: new Date(now()).toISOString().replace(/\.\d{3}Z$/, "Z"),
      nonce: deps.mintId(),
      host: input.host,
      profile: input.profile,
    });

    let outcome;
    try {
      const response = await deps.send(request);
      outcome = readSubscribeOutcome(response.status, response.payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      yield {
        kind: "subscribe",
        subscribed: false,
        status: 0,
        providerCode: null,
        note:
          `The subscribe request never completed (${message}). That is OUR side of ` +
          "the wire and it is evidence about nothing else.",
      };
      yield { kind: "closed", reason: "The subscribe request failed before an answer arrived." };
      return;
    }

    yield {
      kind: "subscribe",
      subscribed: outcome.subscribed,
      status: outcome.status,
      providerCode: outcome.providerCode,
      note: outcome.note,
    };
    if (!outcome.subscribed) {
      yield { kind: "closed", reason: "Webull did not accept the subscription, so nothing will be pushed." };
      return;
    }

    // Step 4. Quotes now arrive on the socket opened in step 1.
    const deadline = now() + durationMs;
    let nextPingAt = now() + PING_INTERVAL_MS;
    let batch: readonly MqttPacket[] = carried;
    for (;;) {
      for (const packet of batch) {
        if (packet.type !== MQTT_PACKET.PUBLISH) continue;
        const published = readPublish(packet);
        yield {
          kind: "quote",
          topic: published.topic,
          receivedAt: new Date(now()).toISOString(),
          payload: decodePayload(published.payload),
        };
      }
      if (now() >= deadline) break;
      if (now() >= nextPingAt) {
        await write(socket, encodePingReq());
        nextPingAt = now() + PING_INTERVAL_MS;
      }
      const packets = await stream.read(Math.min(deadline, nextPingAt) - now());
      if (packets === null) {
        // EOF from a broker that accepted us is still OUR lifecycle to manage.
        yield {
          kind: "closed",
          reason:
            "Webull closed the socket after accepting the subscription. That is a " +
            "connection-lifecycle fact and not an access one; reconnect and subscribe again.",
        };
        return;
      }
      batch = packets;
    }

    yield {
      kind: "closed",
      reason:
        "This stream reached its own time limit and hung up. Webull was still " +
        "holding the subscription; nothing was refused.",
    };
  } finally {
    stream.release();
    try {
      await write(socket, encodeDisconnect());
    } catch {
      // A broker that already dropped us needs no goodbye.
    }
    try {
      await socket.close();
    } catch {
      // Closing an already-dead socket is not a finding.
    }
  }
}
