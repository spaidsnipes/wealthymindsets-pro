import { describe, expect, it } from "vitest";
import {
  decodePackets,
  decodeRemainingLength,
  describeConnAck,
  encodeDisconnect,
  encodePingReq,
  encodeRemainingLength,
  encodeWebullConnect,
  MQTT_PACKET,
  readConnAck,
  readPublish,
  WEBULL_CONNACK,
  WEBULL_CONNACK_CREDENTIAL_REJECTED,
  WEBULL_QUOTES_HOST,
  WEBULL_QUOTES_PORT,
} from "./webullQuotesSocket";

/**
 * These tests exist because of a specific, dated misreading.
 *
 * WM Pro spent three months treating `403 MARKET_DATA_NOT_SUBSCRIBED` from
 * `api.webull.com/market-data/stocks/*` as a fact about the Founder's account,
 * and repeatedly sent him to buy data he already owned. On 2026-09-21 the
 * streaming lane was finally asked and answered something else entirely —
 * `417 INVALID_SESSION` — because we named a socket that was never opened.
 *
 * Every assertion below pins one thing that, if it drifted, would produce
 * another failure that LOOKS like a permissions answer and is not.
 */
describe("Webull real-time lane: the MQTT half, pinned offline", () => {
  const connect = () =>
    encodeWebullConnect({
      sessionId: "s".repeat(32),
      appKey: "public-test-key",
      password: "p".repeat(32),
    });

  it("names the streaming host and port the SDK resolves, not the REST ones", () => {
    // The whole three-month error was measuring one host and concluding things
    // about the product served from another.
    expect(WEBULL_QUOTES_HOST).toBe("data-api.webull.com");
    expect(WEBULL_QUOTES_HOST).not.toBe("api.webull.com");
    // 1883 with TLS is deliberate; `data_streaming_client.py` defaults to both.
    expect(WEBULL_QUOTES_PORT).toBe(1883);
  });

  it("round-trips remaining-length varints across the byte-count boundaries", () => {
    for (const length of [0, 1, 127, 128, 16_383, 16_384, 2_097_151, 2_097_152]) {
      const encoded = encodeRemainingLength(length);
      const decoded = decodeRemainingLength(encoded, 0);
      expect(decoded).not.toBeNull();
      expect(decoded!.value).toBe(length);
      expect(decoded!.bytesRead).toBe(encoded.length);
    }
    expect(encodeRemainingLength(127)).toHaveLength(1);
    expect(encodeRemainingLength(128)).toHaveLength(2);
  });

  it("reports a half-arrived varint as incomplete rather than as a protocol error", () => {
    // On a stream socket this is the ordinary case. Throwing here would turn
    // "one more chunk is coming" into a reported failure we do not have.
    expect(decodeRemainingLength(Uint8Array.from([0x80]), 0)).toBeNull();
  });

  it("builds a CONNECT that negotiates MQTT 3.1.1 with username and password", () => {
    const packet = connect();
    expect(packet[0]).toBe(MQTT_PACKET.CONNECT << 4);

    const length = decodeRemainingLength(packet, 1)!;
    const body = packet.subarray(1 + length.bytesRead);
    expect(body.length).toBe(length.value);

    // Protocol name "MQTT", length-prefixed.
    expect(Array.from(body.subarray(0, 6))).toEqual([0, 4, 0x4d, 0x51, 0x54, 0x54]);
    // Level 4 = 3.1.1, which is paho's MQTTv311 default. Level 5 would add a
    // properties block and change the packet shape entirely.
    expect(body[6]).toBe(4);
    // username | password | clean session
    expect(body[7]).toBe(0x80 | 0x40 | 0x02);
    // keep-alive 60, paho's default, which the SDK does not override.
    expect((body[8]! << 8) | body[9]!).toBe(60);
  });

  it("puts the session id in the client-id field, because they are the same string", () => {
    // `quotes_client.py` assigns `self._client_id` and `self._quotes_session_id`
    // from ONE argument. If these ever diverge, the later HTTP subscribe names
    // a socket the broker cannot find — which is exactly the 417
    // INVALID_SESSION that produced this module.
    const sessionId = "abc123def456";
    const packet = encodeWebullConnect({
      sessionId,
      appKey: "public-test-key",
      password: "nonce",
    });
    const text = new TextDecoder().decode(packet);
    const clientIdAt = text.indexOf(sessionId);
    const appKeyAt = text.indexOf("public-test-key");
    expect(clientIdAt).toBeGreaterThan(-1);
    // Spec payload order: client id, then username, then password.
    expect(clientIdAt).toBeLessThan(appKeyAt);
    expect(appKeyAt).toBeLessThan(text.indexOf("nonce"));
  });

  it("sends the app key as the username — never the access token", () => {
    // `username_pw_set(self._app_key, uuid.uuid4().hex)`. Putting the session
    // token here would leak a real credential into a field the SDK fills with
    // a throwaway, and would fail in a way that reads like a permissions error.
    const packet = encodeWebullConnect({
      sessionId: "sess",
      appKey: "the-app-key",
      password: "throwaway-nonce",
    });
    const text = new TextDecoder().decode(packet);
    expect(text).toContain("the-app-key");
    expect(text).toContain("throwaway-nonce");
  });

  it("frames PINGREQ and DISCONNECT as the two-byte packets they are", () => {
    expect(Array.from(encodePingReq())).toEqual([MQTT_PACKET.PINGREQ << 4, 0]);
    expect(Array.from(encodeDisconnect())).toEqual([MQTT_PACKET.DISCONNECT << 4, 0]);
  });

  it("splits a stream into whole packets and hands back the partial tail", () => {
    const connack = Uint8Array.from([MQTT_PACKET.CONNACK << 4, 2, 0, 0]);
    const pingresp = Uint8Array.from([MQTT_PACKET.PINGRESP << 4, 0]);
    const truncated = Uint8Array.from([MQTT_PACKET.PUBLISH << 4, 10, 0, 3]);
    const stream = Uint8Array.from([...connack, ...pingresp, ...truncated]);

    const { packets, rest } = decodePackets(stream);
    expect(packets.map((p) => p.type)).toEqual([MQTT_PACKET.CONNACK, MQTT_PACKET.PINGRESP]);
    // The half-arrived PUBLISH must survive intact for the next read, not be
    // consumed, guessed at, or dropped.
    expect(Array.from(rest)).toEqual(Array.from(truncated));
  });

  it("decodes CONNACK using Webull's table, which is NOT the MQTT spec's", () => {
    // Code 2 is "identifier rejected" in the MQTT specification and
    // "session_id is blank" to Webull (`connect_ack.py`). A generic decoder
    // here would emit a confident, wrong sentence about the Founder's setup.
    const ack = readConnAck({
      type: MQTT_PACKET.CONNACK,
      flags: 0,
      body: Uint8Array.from([0, 2]),
    });
    expect(ack.returnCode).toBe(2);
    expect(ack.meaning).toBe("session_id is blank");
    expect(ack.sessionPresent).toBe(false);
    expect(WEBULL_CONNACK[104]).toBe("Invalid AppKey");
  });

  it("refuses to invent a meaning for a code Webull never documented", () => {
    expect(describeConnAck(77)).toMatch(/Undocumented CONNACK code 77/);
  });

  it("calls only 103 and 104 evidence about the credential", () => {
    // 105 is "connection limit exceeded" — a capacity fact about US. Reading
    // that as a permissions fact is precisely the mistake that cost three
    // months, rehearsed in a new protocol.
    expect(WEBULL_CONNACK_CREDENTIAL_REJECTED.has(103)).toBe(true);
    expect(WEBULL_CONNACK_CREDENTIAL_REJECTED.has(104)).toBe(true);
    expect(WEBULL_CONNACK_CREDENTIAL_REJECTED.has(105)).toBe(false);
    expect(WEBULL_CONNACK_CREDENTIAL_REJECTED.has(101)).toBe(false);
    expect(WEBULL_CONNACK_CREDENTIAL_REJECTED.has(0)).toBe(false);
  });

  it("reads a QoS-0 PUBLISH payload with no packet identifier in the way", () => {
    const topic = new TextEncoder().encode("quote");
    const payload = new TextEncoder().encode('{"symbol":"TSLA"}');
    const body = Uint8Array.from([0, topic.length, ...topic, ...payload]);
    const publish = readPublish({ type: MQTT_PACKET.PUBLISH, flags: 0, body });
    expect(publish.topic).toBe("quote");
    expect(publish.qos).toBe(0);
    expect(new TextDecoder().decode(publish.payload)).toBe('{"symbol":"TSLA"}');
  });

  it("skips the packet identifier at QoS 1, where one is actually present", () => {
    // Getting this wrong does not throw — it shifts every payload by two bytes
    // and produces garbage that looks like a decoding bug somewhere else.
    const topic = new TextEncoder().encode("tick");
    const payload = new TextEncoder().encode("PAYLOAD");
    const body = Uint8Array.from([0, topic.length, ...topic, 0x00, 0x07, ...payload]);
    const publish = readPublish({ type: MQTT_PACKET.PUBLISH, flags: 0x02, body });
    expect(publish.qos).toBe(1);
    expect(new TextDecoder().decode(publish.payload)).toBe("PAYLOAD");
  });

  it("refuses to read a packet as the wrong type", () => {
    expect(() =>
      readConnAck({ type: MQTT_PACKET.PUBLISH, flags: 0, body: Uint8Array.from([0, 0]) }),
    ).toThrow(/Expected CONNACK/);
    expect(() =>
      readPublish({ type: MQTT_PACKET.CONNACK, flags: 0, body: Uint8Array.from([0, 0]) }),
    ).toThrow(/Expected PUBLISH/);
  });

  it("refuses a PUBLISH whose topic length runs past the packet", () => {
    expect(() =>
      readPublish({ type: MQTT_PACKET.PUBLISH, flags: 0, body: Uint8Array.from([0, 99, 1, 2]) }),
    ).toThrow(/runs past/);
  });
});
