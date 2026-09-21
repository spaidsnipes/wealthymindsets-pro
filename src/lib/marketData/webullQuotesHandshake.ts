/**
 * OPEN THE DOOR, THEN ASK WHAT IT SAYS.
 *
 * `webullQuotesSocket.ts` is bytes. This is the twenty lines of choreography
 * that put those bytes on a real socket and read one answer back — and then,
 * with far more care, the rules for what that answer is allowed to MEAN.
 *
 * ── The reading rules, which are the actual product here ────────────────────
 *
 * This project's whole expensive history is a reading failure, not a wiring
 * failure. `403 MARKET_DATA_NOT_SUBSCRIBED` was read as "the Founder has no
 * data package" for three months; he had one. `417 INVALID_SESSION` could just
 * as easily be read as "streaming is not entitled"; it isn't — it means we
 * named a socket that was never opened.
 *
 * So the reader below refuses, structurally, to turn most outcomes into claims:
 *
 *   • A TRANSPORT failure (DNS, TLS, timeout, Worker egress policy) says
 *     nothing whatsoever about entitlement. It is OUR side of the wire.
 *   • CONNACK 105 "connection limit exceeded" is a CAPACITY fact about our own
 *     connections. It is the most seductive false positive available here,
 *     because it arrives from the provider and refuses us.
 *   • CONNACK 101 "internal error" is the provider having a bad day.
 *   • ONLY 103 "authentication failed" and 104 "invalid AppKey" are evidence
 *     about the credential, and even those are evidence about the APP KEY
 *     rather than about any market-data purchase.
 *
 * And the one that matters most: CONNACK 0 means Webull's real-time broker
 * ACCEPTED this app key on the real-time host. That would be the first evidence
 * in this project's history bearing on the real-time product at all, and it
 * would mean every "buy market data" sentence ever sent to the Founder was
 * drawn from a lane that never carried real time.
 *
 * ── Why the opener is injected ──────────────────────────────────────────────
 *
 * `connect()` lives in `cloudflare:sockets`, which does not exist under Node,
 * so importing it here would take the whole test suite down with it. It is a
 * parameter instead. That also means every branch of the reading above is
 * exercised offline against scripted sockets — which is the point, because the
 * expensive mistakes in this codebase were never in the bytes. They were in the
 * sentences written about the bytes.
 */
import {
  decodePackets,
  encodeDisconnect,
  encodeWebullConnect,
  MQTT_PACKET,
  readConnAck,
  WEBULL_CONNACK_CREDENTIAL_REJECTED,
  WEBULL_QUOTES_HOST,
  WEBULL_QUOTES_PORT,
  type MqttConnAck,
} from "./webullQuotesSocket";

/** The shape of both a Cloudflare `Socket` and a scripted test double. */
export interface DuplexSocket {
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
  close(): Promise<void>;
}

export type QuotesSocketOpener = (
  host: string,
  port: number,
) => DuplexSocket | Promise<DuplexSocket>;

/**
 * What the real-time broker said, and what that is permitted to mean.
 *
 * Deliberately carries NO app key, password, session id, or token. A receipt
 * like this gets pasted into chat and screenshotted while debugging — that has
 * already happened repeatedly on this problem — so it may only ever hold the
 * provider's own scalars.
 */
export interface WebullQuotesHandshakeReceipt {
  readonly host: string;
  readonly port: number;
  /** Did TCP + TLS come up at all? False means we never reached Webull. */
  readonly transportOpen: boolean;
  /** Present only when a CONNACK actually came back. */
  readonly connAck: MqttConnAck | null;
  /** True only on CONNACK 0 — the broker accepted this app key. */
  readonly accepted: boolean;
  /**
   * True ONLY for CONNACK 103/104. Everything else — capacity, internal error,
   * transport — is explicitly not credential evidence, and the field exists so
   * that distinction is a value a caller can branch on rather than a nuance a
   * caller has to remember.
   */
  readonly credentialRejected: boolean;
  /** Anything that stopped us before an answer, in our own words, never a secret. */
  readonly transportError: string | null;
  readonly note: string;
}

/**
 * The reading, separated from the socket so every branch can be tested.
 *
 * Pure. Given what happened, produce the sentence a human is allowed to read.
 */
export function readQuotesHandshake(input: {
  readonly transportOpen: boolean;
  readonly connAck: MqttConnAck | null;
  readonly transportError: string | null;
}): { readonly accepted: boolean; readonly credentialRejected: boolean; readonly note: string } {
  if (!input.transportOpen || !input.connAck) {
    const cause = input.transportError ?? "no CONNACK arrived before the deadline";
    return {
      accepted: false,
      credentialRejected: false,
      note: `We never got an answer from Webull's real-time host (${cause}). This is OUR side of the wire — DNS, TLS, egress policy, or a timeout — and it is evidence about nothing else. In particular it says nothing about entitlement, and nobody may be told to buy anything on the strength of it.`,
    };
  }

  const { returnCode, meaning } = input.connAck;

  if (returnCode === 0) {
    return {
      accepted: true,
      credentialRejected: false,
      note: `Webull's real-time broker ACCEPTED this app key on ${WEBULL_QUOTES_HOST}. That is the first measurement this project has ever taken against the real-time product rather than the REST pull product, and it means the MARKET_DATA_NOT_SUBSCRIBED denials we collected for three months were answers from a different door. Do not report them as facts about real-time access.`,
    };
  }

  if (WEBULL_CONNACK_CREDENTIAL_REJECTED.has(returnCode)) {
    return {
      accepted: false,
      credentialRejected: true,
      note: `Webull's real-time broker rejected the credential: ${returnCode} ${meaning}. This is evidence about the APP KEY on the streaming host — not about a market-data purchase, and not about the broker lane, which is independently connected on these same credentials.`,
    };
  }

  if (returnCode === 105) {
    return {
      accepted: false,
      credentialRejected: false,
      note: `Webull refused with ${returnCode} ${meaning}. That is a CAPACITY fact about how many connections we are holding, not a permissions fact. Close the sockets we leaked and ask again — reading this as an entitlement answer is the exact mistake that cost this project three months.`,
    };
  }

  return {
    accepted: false,
    credentialRejected: false,
    note: `Webull answered CONNACK ${returnCode} ${meaning}. This is neither an acceptance nor a credential rejection, so it resolves nothing about entitlement on its own.`,
  };
}

/**
 * Opens the socket, sends CONNECT, waits for exactly one CONNACK, hangs up.
 *
 * It deliberately does NOT stay connected. A held-open socket is a subscription
 * this probe would have to manage, and CONNACK 105 above is what a leaked one
 * eventually looks like — arriving from the provider, refusing us, and reading
 * like a permissions problem.
 */
export async function handshakeWebullQuotes(
  openSocket: QuotesSocketOpener,
  credentials: {
    readonly appKey: string;
    readonly appSecret?: string;
    /** Same string the caller will put in the HTTP subscribe's `session_id`. */
    readonly sessionId: string;
    /** The MQTT password. A throwaway nonce in the SDK; passed in for testability. */
    readonly password: string;
  },
  options: { readonly timeoutMs?: number; readonly host?: string; readonly port?: number } = {},
): Promise<WebullQuotesHandshakeReceipt> {
  const host = options.host ?? WEBULL_QUOTES_HOST;
  const port = options.port ?? WEBULL_QUOTES_PORT;
  const timeoutMs = options.timeoutMs ?? 8_000;

  let socket: DuplexSocket | null = null;
  let transportOpen = false;
  let connAck: MqttConnAck | null = null;
  let transportError: string | null = null;

  try {
    socket = await openSocket(host, port);
    transportOpen = true;

    const writer = socket.writable.getWriter();
    await writer.write(encodeWebullConnect({ sessionId: credentials.sessionId, appKey: credentials.appKey, password: credentials.password }));
    writer.releaseLock();

    const reader = socket.readable.getReader();
    // A stream socket can split one packet across reads, so bytes accumulate
    // until a WHOLE packet is present. Parsing whatever arrived first is how a
    // two-byte CONNACK gets misread as a truncated something-else.
    let buffered: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
    const deadline = Date.now() + timeoutMs;
    try {
      while (Date.now() < deadline) {
        const chunk = await Promise.race([
          reader.read(),
          new Promise<{ done: true; value: undefined }>((resolve) =>
            setTimeout(() => resolve({ done: true, value: undefined }), Math.max(0, deadline - Date.now())),
          ),
        ]);
        if (chunk.done || !chunk.value) break;
        const merged = new Uint8Array(buffered.length + chunk.value.length);
        merged.set(buffered);
        merged.set(chunk.value, buffered.length);
        const { packets, rest } = decodePackets(merged);
        buffered = rest;
        const ack = packets.find((packet) => packet.type === MQTT_PACKET.CONNACK);
        if (ack) {
          connAck = readConnAck(ack);
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Hang up politely whether or not we liked the answer.
    try {
      const closer = socket.writable.getWriter();
      await closer.write(encodeDisconnect());
      closer.releaseLock();
    } catch {
      // A broker that already dropped us needs no goodbye.
    }
  } catch (error) {
    // The message, never the cause chain — a TLS error can quote the host and
    // handshake details, and this receipt is built to be screenshotted.
    transportError = error instanceof Error ? error.message : String(error);
  } finally {
    try {
      await socket?.close();
    } catch {
      // Closing an already-dead socket is not a finding.
    }
  }

  const read = readQuotesHandshake({ transportOpen, connAck, transportError });
  return {
    host,
    port,
    transportOpen,
    connAck,
    accepted: read.accepted,
    credentialRejected: read.credentialRejected,
    transportError,
    note: read.note,
  };
}
