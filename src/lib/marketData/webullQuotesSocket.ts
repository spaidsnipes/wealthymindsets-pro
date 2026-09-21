/**
 * MQTT 3.1.1, ONLY AS MUCH OF IT AS WEBULL'S REAL-TIME LANE USES.
 *
 * ── Why this file exists, measured ──────────────────────────────────────────
 *
 * On 2026-09-21 WM Pro asked Webull's streaming lane for the first time in its
 * history — a signed `POST /market-data/streaming/subscribe` carrying a freshly
 * minted `session_id`. Both signing profiles came back:
 *
 *     HTTP 417   INVALID_SESSION
 *
 * Read that against the three months behind it. Every market-data measurement
 * this project ever took said `403 MARKET_DATA_NOT_SUBSCRIBED`, and that
 * sentence — which names a subscription — is what sent the Founder back to
 * Webull to buy data he already owned. The streaming lane did NOT say that. It
 * did not mention entitlement at all. It said our SESSION was invalid.
 *
 * That is a defect in OUR REQUEST, which is the exact category this codebase
 * has misread twice already. So it gets fixed, not interpreted.
 *
 * ── What the session id actually is ─────────────────────────────────────────
 *
 * We had assumed `session_id` was a correlation id we were free to invent,
 * because `samples/data/data_streaming_client.py:36` literally does
 * `session_id = uuid.uuid4().hex`. Inventing it is correct. Inventing it and
 * stopping there is not, because of the ORDER the SDK does things in:
 *
 *   1. `quotes_client.py` constructs `mqttc.Client(client_id=session_id)`,
 *      `username_pw_set(app_key, uuid4().hex)`, `tls_set()`, and connects to
 *      the host that `api_type.QUOTES` resolves to — `data-api.webull.com`
 *      (`webull/core/data/endpoints.json`), NOT the `api.webull.com` every
 *      request WM Pro has ever sent.
 *   2. ONLY from inside `_quotes_on_connect`, after the broker returns rc == 0,
 *      does it call `_quotes_subscribe(...)` — which is the HTTP subscribe.
 *
 * The session id is therefore not a token we mint; it is a NAME FOR A SOCKET
 * THAT IS ALREADY OPEN. `POST /streaming/subscribe` is the server being told
 * which already-connected client to push to. We sent it the name of a socket
 * that never existed, and it correctly answered INVALID_SESSION.
 *
 * ── Why hand-roll the protocol ──────────────────────────────────────────────
 *
 * The SDK uses paho-mqtt, a Python library that assumes real sockets and
 * threads. This runs in a Cloudflare Worker. Workers can open raw TCP via
 * `connect()` from `cloudflare:sockets` with `secureTransport: "on"`, which is
 * what `tls_enable=True` on port 1883 means here, but no paho exists for it.
 *
 * The surface Webull actually uses is small enough to write down exactly:
 * CONNECT out, CONNACK back, then PUBLISH pushes inbound, with PINGREQ keeping
 * it alive. Notably there is NO MQTT SUBSCRIBE packet anywhere in the SDK —
 * `_quotes_on_connect` calls the HTTP subscribe instead, so the broker decides
 * what to push from server-side state rather than from a topic filter. Writing
 * five packet types is smaller and far more honest than vendoring a library
 * whose remaining 95% would be untested here.
 *
 * ── This file is PURE on purpose ────────────────────────────────────────────
 *
 * Bytes in, bytes out, no socket. Every claim below is therefore testable
 * without a network, which matters more than usual: the last three months were
 * spent unable to tell "the provider refused us" from "we asked wrong", and
 * that distinction is only cheap when the asking half can be pinned offline.
 */

/** MQTT control packet types, as the 4 high bits of byte 1. */
export const MQTT_PACKET = {
  CONNECT: 1,
  CONNACK: 2,
  PUBLISH: 3,
  PUBACK: 4,
  SUBSCRIBE: 8,
  SUBACK: 9,
  PINGREQ: 12,
  PINGRESP: 13,
  DISCONNECT: 14,
} as const;

/**
 * What the broker's CONNACK return byte means.
 *
 * Transcribed from `webull/data/common/connect_ack.py`, NOT from the MQTT
 * specification — and the difference is the whole reason this table is written
 * out. Codes 0–3 happen to overlap the spec's range while meaning something
 * else (spec 2 is "identifier rejected"; Webull's 2 is "session_id is blank"),
 * and 100–105 are Webull's alone. A reader who decoded this with a generic MQTT
 * table would produce a confident, wrong sentence about the Founder's account.
 * That is the failure mode this entire module exists to end.
 */
export const WEBULL_CONNACK: Readonly<Record<number, string>> = {
  0: "Connection successful",
  1: "Protocol not supported",
  2: "session_id is blank",
  3: "AppKey is blank",
  100: "Unknown error",
  101: "Internal error",
  102: "Connection already authenticated",
  103: "Connection authentication failed",
  104: "Invalid AppKey",
  105: "Connection limit exceeded",
};

/**
 * Codes that mean the CREDENTIAL was rejected, as opposed to the request being
 * malformed or the server being busy.
 *
 * Kept as an explicit set rather than a range check because the reading matters
 * so much: `103`/`104` are the only answers here that would be evidence about
 * the Founder's app key, and nothing else may ever be reported as such. `105`
 * in particular — connection limit exceeded — is a capacity fact about us, and
 * is precisely the shape of thing this project has historically mistaken for a
 * permissions fact.
 */
export const WEBULL_CONNACK_CREDENTIAL_REJECTED: ReadonlySet<number> = new Set([103, 104]);

export function describeConnAck(code: number): string {
  return WEBULL_CONNACK[code] ?? `Undocumented CONNACK code ${code}`;
}

/**
 * MQTT's "remaining length" is a base-128 varint of at most four bytes, each
 * byte carrying seven bits of payload plus a continuation bit.
 */
export function encodeRemainingLength(length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 0 || length > 268_435_455) {
    throw new RangeError(`MQTT remaining length out of range: ${length}`);
  }
  const bytes: number[] = [];
  let value = length;
  do {
    let byte = value % 128;
    value = Math.floor(value / 128);
    if (value > 0) byte |= 0x80;
    bytes.push(byte);
  } while (value > 0);
  return Uint8Array.from(bytes);
}

/**
 * Reads a remaining-length varint starting at `offset`.
 *
 * Returns `null` — rather than throwing — when the buffer simply does not hold
 * enough bytes yet, because that is the ordinary case on a stream socket and
 * not an error. Distinguishing "incomplete" from "malformed" is the difference
 * between waiting one more chunk and reporting a protocol failure we do not
 * have.
 */
export function decodeRemainingLength(
  bytes: Uint8Array,
  offset: number,
): { readonly value: number; readonly bytesRead: number } | null {
  let multiplier = 1;
  let value = 0;
  let index = offset;
  for (let i = 0; i < 4; i += 1) {
    if (index >= bytes.length) return null; // incomplete, not invalid
    const byte = bytes[index]!;
    index += 1;
    value += (byte & 0x7f) * multiplier;
    if ((byte & 0x80) === 0) return { value, bytesRead: index - offset };
    multiplier *= 128;
  }
  throw new Error("MQTT remaining length exceeded four bytes");
}

function encodeString(text: string): Uint8Array {
  const utf8 = new TextEncoder().encode(text);
  if (utf8.length > 0xffff) throw new RangeError("MQTT string exceeds 65535 bytes");
  const out = new Uint8Array(2 + utf8.length);
  out[0] = (utf8.length >> 8) & 0xff;
  out[1] = utf8.length & 0xff;
  out.set(utf8, 2);
  return out;
}

function concat(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

export interface WebullConnectOptions {
  /**
   * The MQTT client id. For Webull this IS the `session_id` later sent to
   * `/market-data/streaming/subscribe` — `quotes_client.py` sets
   * `self._client_id = session_id` and `self._quotes_session_id = session_id`
   * from the same argument. They must be the same string or the subscribe
   * names a socket the broker cannot find, which is the exact 417
   * INVALID_SESSION that prompted this file.
   */
  readonly sessionId: string;
  /** MQTT username. The SDK passes the APP KEY here, not the access token. */
  readonly appKey: string;
  /**
   * MQTT password. `username_pw_set(self._app_key, uuid.uuid4().hex)` — the
   * password is a random uuid, carrying no secret at all. That looks wrong
   * until you notice the transport is TLS and the real authorization happened
   * over HTTPS when the session was minted; the broker authenticates the app
   * key and treats this field as a nonce. It is passed in rather than generated
   * here so tests can pin the exact bytes.
   */
  readonly password: string;
  /** Seconds. paho's default is 60 and the SDK does not override it. */
  readonly keepAliveSeconds?: number;
}

/**
 * Builds the CONNECT packet.
 *
 * Protocol level 4 = MQTT 3.1.1, which is paho's default (`MQTTv311`) and so
 * what the SDK negotiates. Level 5 would change the packet shape entirely by
 * adding a properties block, and a broker that answered "protocol not
 * supported" (Webull CONNACK 1) would produce yet another failure that reads
 * like a permissions problem.
 */
export function encodeWebullConnect(options: WebullConnectOptions): Uint8Array {
  const keepAlive = options.keepAliveSeconds ?? 60;
  const CLEAN_SESSION = 0x02;
  const HAS_PASSWORD = 0x40;
  const HAS_USERNAME = 0x80;
  const variableHeader = concat([
    encodeString("MQTT"),
    Uint8Array.from([
      4, // protocol level: MQTT 3.1.1
      HAS_USERNAME | HAS_PASSWORD | CLEAN_SESSION,
      (keepAlive >> 8) & 0xff,
      keepAlive & 0xff,
    ]),
  ]);
  // Payload order is fixed by the spec: client id, will, username, password.
  const payload = concat([
    encodeString(options.sessionId),
    encodeString(options.appKey),
    encodeString(options.password),
  ]);
  const body = concat([variableHeader, payload]);
  return concat([
    Uint8Array.from([MQTT_PACKET.CONNECT << 4]),
    encodeRemainingLength(body.length),
    body,
  ]);
}

export function encodePingReq(): Uint8Array {
  return Uint8Array.from([MQTT_PACKET.PINGREQ << 4, 0]);
}

export function encodeDisconnect(): Uint8Array {
  return Uint8Array.from([MQTT_PACKET.DISCONNECT << 4, 0]);
}

export interface MqttPacket {
  readonly type: number;
  /** The low 4 bits of byte 1 — QoS and flags for PUBLISH, zero elsewhere. */
  readonly flags: number;
  readonly body: Uint8Array;
}

/**
 * Splits whatever has arrived so far into whole packets.
 *
 * TCP is a byte stream, so a read can hand back half a packet, three packets,
 * or two and a half. The leftover is returned rather than buffered internally
 * because a module that keeps stream state is a module that cannot be tested by
 * calling it twice with the same input.
 */
export function decodePackets(bytes: Uint8Array): {
  readonly packets: readonly MqttPacket[];
  readonly rest: Uint8Array;
} {
  const packets: MqttPacket[] = [];
  let at = 0;
  for (;;) {
    if (at + 1 >= bytes.length) break;
    const header = bytes[at]!;
    const length = decodeRemainingLength(bytes, at + 1);
    if (!length) break; // varint itself is still arriving
    const bodyStart = at + 1 + length.bytesRead;
    const bodyEnd = bodyStart + length.value;
    if (bodyEnd > bytes.length) break; // body still arriving
    packets.push({
      type: header >> 4,
      flags: header & 0x0f,
      body: bytes.subarray(bodyStart, bodyEnd),
    });
    at = bodyEnd;
  }
  return { packets, rest: bytes.subarray(at) };
}

export interface MqttConnAck {
  readonly sessionPresent: boolean;
  readonly returnCode: number;
  /** Webull's own words for `returnCode`, never the generic MQTT spec's. */
  readonly meaning: string;
}

export function readConnAck(packet: MqttPacket): MqttConnAck {
  if (packet.type !== MQTT_PACKET.CONNACK) {
    throw new Error(`Expected CONNACK, got packet type ${packet.type}`);
  }
  if (packet.body.length < 2) throw new Error("CONNACK shorter than two bytes");
  const returnCode = packet.body[1]!;
  return {
    sessionPresent: (packet.body[0]! & 0x01) === 1,
    returnCode,
    meaning: describeConnAck(returnCode),
  };
}

export interface MqttPublish {
  readonly topic: string;
  readonly qos: number;
  readonly payload: Uint8Array;
}

/**
 * Reads an inbound PUBLISH — the packet that actually carries a quote.
 *
 * The packet-id field exists only at QoS 1 and 2, so its two bytes must be
 * skipped conditionally. Getting that wrong does not throw; it silently shifts
 * every payload by two bytes and yields garbage that looks like a decoding
 * problem somewhere far away.
 */
export function readPublish(packet: MqttPacket): MqttPublish {
  if (packet.type !== MQTT_PACKET.PUBLISH) {
    throw new Error(`Expected PUBLISH, got packet type ${packet.type}`);
  }
  if (packet.body.length < 2) throw new Error("PUBLISH shorter than its topic length");
  const topicLength = (packet.body[0]! << 8) | packet.body[1]!;
  const topicEnd = 2 + topicLength;
  if (topicEnd > packet.body.length) throw new Error("PUBLISH topic runs past the packet");
  const qos = (packet.flags >> 1) & 0x03;
  const payloadStart = topicEnd + (qos > 0 ? 2 : 0);
  if (payloadStart > packet.body.length) {
    throw new Error("PUBLISH ends before its packet identifier");
  }
  return {
    topic: new TextDecoder().decode(packet.body.subarray(2, topicEnd)),
    qos,
    payload: packet.body.subarray(payloadStart),
  };
}

/**
 * The host Webull pushes real time from.
 *
 * `webull/core/data/endpoints.json` maps region `us` to `"quotes-api":
 * "data-api.webull.com"`, and `quotes_client.py:_quotes_connect` resolves
 * through `api_type.QUOTES` to reach it. This is a DIFFERENT HOST from the
 * `api.webull.com` that answered 403 for three months. Writing it here, once,
 * with the citation, is the same discipline `webullSdkContract.ts` enforces for
 * paths — for the same reason.
 */
export const WEBULL_QUOTES_HOST = "data-api.webull.com";

/**
 * Port 1883 WITH TLS, which looks like a typo and is not.
 *
 * 1883 is conventionally plaintext MQTT and 8883 the TLS port, but
 * `data_streaming_client.py` defaults `mqtt_port=1883` while also defaulting
 * `tls_enable=True`, and `quotes_client.__init__` calls `self.tls_set()` on
 * that basis. Webull terminates TLS on the conventional plaintext port. A
 * reader who "corrects" this to 8883, or who drops TLS to match the port, gets
 * a connection failure that says nothing about entitlement and will be read as
 * though it did.
 */
export const WEBULL_QUOTES_PORT = 1883;
