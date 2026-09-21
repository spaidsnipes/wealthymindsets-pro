/**
 * WHAT THIS FILE IS DEFENDING.
 *
 * Two different kinds of mistake cost this project three months, and both are
 * reachable from this one small module:
 *
 *  1. A request that does not match the SDK byte-for-byte. Webull signs a
 *     digest of the body, so any drift in key names, key ORDER, or the enum
 *     spelling produces a rejection that reads like a credential failure.
 *  2. A rejection read as a fact about the Founder's account. `417
 *     INVALID_SESSION` is a statement about OUR socket lifecycle. The notes
 *     below are asserted, not just written, so a future rewording cannot
 *     quietly reintroduce the entitlement framing.
 */
import { describe, expect, it } from "vitest";
import { createHash, createHmac } from "node:crypto";
import {
  WEBULL_CATEGORIES,
  WEBULL_SUBSCRIBE_PATH,
  WEBULL_SUBSCRIBE_VERSION,
  WEBULL_SUB_TYPES,
  WEBULL_UNSUBSCRIBE_PATH,
  buildWebullSubscribeRequest,
  readSubscribeOutcome,
  type WebullSubscribeInput,
} from "./webullQuotesSubscribe";

const BASE: WebullSubscribeInput = {
  sessionId: "mqtt-client-id-of-an-open-socket",
  symbols: ["AAPL", "TSLA"],
  category: "US_STOCK",
  subTypes: ["QUOTE", "TICK"],
  appKey: "test-app-key",
  appSecret: "test-app-secret",
  timestamp: "2026-09-21T00:00:00Z",
  nonce: "nonce-0001",
  profile: "sdk-sha256",
};

describe("buildWebullSubscribeRequest", () => {
  it("sends the SDK's exact path, method and version", () => {
    const request = buildWebullSubscribeRequest(BASE);
    expect(WEBULL_SUBSCRIBE_PATH).toBe("/market-data/streaming/subscribe");
    expect(WEBULL_UNSUBSCRIBE_PATH).toBe("/market-data/streaming/unsubscribe");
    expect(request.url).toBe("https://api.webull.com/market-data/streaming/subscribe");
    expect(request.method).toBe("POST");
    expect(request.headers["x-version"]).toBe(WEBULL_SUBSCRIBE_VERSION);
    expect(request.headers["x-version"]).toBe("v3");
    expect(request.headers["x-webull-client-source"]).toBe("sdk");
    expect(request.headers["Content-Type"]).toBe("application/json");
  });

  it("uses the SDK's body keys, in the SDK's order", () => {
    const request = buildWebullSubscribeRequest(BASE);
    // Order is asserted on the STRING, not the parsed object, because the
    // signature is taken over the string.
    expect(request.body).toBe(
      '{"session_id":"mqtt-client-id-of-an-open-socket","symbols":["AAPL","TSLA"],"category":"US_STOCK","sub_types":["QUOTE","TICK"]}',
    );
    expect(Object.keys(JSON.parse(request.body))).toEqual([
      "session_id",
      "symbols",
      "category",
      "sub_types",
    ]);
  });

  it("sends enum values by NAME, which is also the only unambiguous form", () => {
    // `webull/core/data/category.py` gives US_EVENT and HK_FUTURES the SAME
    // numeric code (13). Anyone "optimising" this to codes reintroduces a
    // collision the names do not have.
    expect(WEBULL_CATEGORIES).toContain("US_EVENT");
    expect(WEBULL_CATEGORIES).toContain("HK_FUTURES");
    expect(WEBULL_SUB_TYPES).toEqual(["QUOTE", "SNAPSHOT", "TICK"]);

    for (const category of WEBULL_CATEGORIES) {
      const parsed = JSON.parse(buildWebullSubscribeRequest({ ...BASE, category }).body);
      expect(parsed.category).toBe(category);
      expect(typeof parsed.category).toBe("string");
    }
    for (const subType of WEBULL_SUB_TYPES) {
      const parsed = JSON.parse(buildWebullSubscribeRequest({ ...BASE, subTypes: [subType] }).body);
      expect(parsed.sub_types).toEqual([subType]);
    }
  });

  it("signs the digest of the exact string it sends", () => {
    const request = buildWebullSubscribeRequest(BASE);
    const digest = createHash("sha256").update(request.body).digest("hex").toUpperCase();
    const canonical = [
      `host=api.webull.com`,
      `x-app-key=${BASE.appKey}`,
      `x-signature-algorithm=HMAC-SHA256`,
      `x-signature-nonce=${BASE.nonce}`,
      `x-signature-version=1.0`,
      `x-timestamp=${BASE.timestamp}`,
    ].join("&");
    const signingText = encodeURIComponent(
      `${WEBULL_SUBSCRIBE_PATH}&${canonical}&${digest}`,
    ).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    const expected = createHmac("sha256", `${BASE.appSecret}&`).update(signingText).digest("base64");

    expect(request.headers["x-signature"]).toBe(expected);
    expect(request.headers["x-signature-algorithm"]).toBe("HMAC-SHA256");
  });

  it("changes the signature when the body changes", () => {
    // Proof the body really is inside the signed material — a signer that
    // ignored the body would pass every other test in this file.
    const a = buildWebullSubscribeRequest(BASE);
    const b = buildWebullSubscribeRequest({ ...BASE, symbols: ["AAPL", "MSFT"] });
    expect(b.body).not.toBe(a.body);
    expect(b.headers["x-signature"]).not.toBe(a.headers["x-signature"]);
  });

  it("never puts the app secret in the request it returns", () => {
    const request = buildWebullSubscribeRequest(BASE);
    const serialized = JSON.stringify(request);
    expect(serialized).not.toContain(BASE.appSecret);
  });

  it("honours an explicit host without scheme or trailing slash", () => {
    const request = buildWebullSubscribeRequest({ ...BASE, host: "https://uat-api.webull.com/" });
    expect(request.url).toBe("https://uat-api.webull.com/market-data/streaming/subscribe");
  });

  it("refuses a subscription that could produce nothing", () => {
    expect(() => buildWebullSubscribeRequest({ ...BASE, symbols: [] })).toThrow(/zero symbols/i);
    expect(() => buildWebullSubscribeRequest({ ...BASE, subTypes: [] })).toThrow(/zero sub_types/i);
  });
});

describe("readSubscribeOutcome", () => {
  it("treats 2xx as subscribed, and later silence as a market question", () => {
    const outcome = readSubscribeOutcome(200, { code: "OK" });
    expect(outcome.subscribed).toBe(true);
    expect(outcome.status).toBe(200);
    expect(outcome.providerCode).toBe("OK");
    expect(outcome.note).toMatch(/market-activity or symbol question/i);
  });

  it("reads 417 / INVALID_SESSION as a fact about OUR connection", () => {
    for (const outcome of [
      readSubscribeOutcome(417, { code: "INVALID_SESSION" }),
      readSubscribeOutcome(417, {}),
      readSubscribeOutcome(400, { errorCode: "INVALID_SESSION" }),
    ]) {
      expect(outcome.subscribed).toBe(false);
      expect(outcome.note).toMatch(/our connection lifecycle/i);
      // The three-month defect, pinned. These words must not come back.
      expect(outcome.note).toMatch(/not a\s+statement about credentials or entitlement/i);
      expect(outcome.note).not.toMatch(/\bsubscription (is )?required\b/i);
      expect(outcome.note).not.toMatch(/\bpurchase\b|\bupgrade\b|\bpay\b/i);
    }
  });

  it("records an unrecognised refusal without interpreting it", () => {
    const outcome = readSubscribeOutcome(503, { error_code: "MAINTENANCE" });
    expect(outcome.subscribed).toBe(false);
    expect(outcome.providerCode).toBe("MAINTENANCE");
    expect(outcome.note).toContain("503");
    expect(outcome.note).toContain("MAINTENANCE");
    expect(outcome.note).toMatch(/interpreted no further/i);
  });

  it("survives payloads that are not objects at all", () => {
    for (const payload of [null, undefined, "boom", 42, []]) {
      const outcome = readSubscribeOutcome(500, payload);
      expect(outcome.subscribed).toBe(false);
      expect(outcome.providerCode).toBeNull();
    }
  });
});
