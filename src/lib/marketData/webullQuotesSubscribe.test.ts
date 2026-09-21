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

  /**
   * THE HEADER THAT WAS MISSING IN PRODUCTION.
   *
   * MEASURED 2026-09-21, first live run of `/api/market-data/webull/stream`:
   * CONNACK 0 on the socket, then `401 INVALID_TOKEN` on this request. The
   * builder sent no `x-access-token`. `webull/core/client.py:259` sends it on
   * every request — and sends it AFTER `signer.sign(request)`.
   */
  it("carries the session as x-access-token when one is supplied", () => {
    const request = buildWebullSubscribeRequest({ ...BASE, accessToken: "  minted-session  " });
    expect(request.headers["x-access-token"]).toBe("minted-session");
  });

  it("omits x-access-token entirely rather than sending an empty one", () => {
    // An empty header is a claim to hold a session we do not hold. Letting
    // Webull answer the real question — "who is this?" — keeps the refusal
    // legible instead of turning it into a malformed-request puzzle.
    expect(buildWebullSubscribeRequest(BASE).headers).not.toHaveProperty("x-access-token");
    expect(
      buildWebullSubscribeRequest({ ...BASE, accessToken: "   " }).headers,
    ).not.toHaveProperty("x-access-token");
  });

  it("does NOT let the session change the signature", () => {
    // The whole reason this header is safe to add late. If signing ever starts
    // covering it, a session refresh would silently invalidate every request
    // and the failure would look like a signing bug rather than a token one.
    const without = buildWebullSubscribeRequest(BASE);
    const with1 = buildWebullSubscribeRequest({ ...BASE, accessToken: "session-alpha" });
    const with2 = buildWebullSubscribeRequest({ ...BASE, accessToken: "session-beta" });
    expect(with1.headers["x-signature"]).toBe(without.headers["x-signature"]);
    expect(with2.headers["x-signature"]).toBe(without.headers["x-signature"]);
    expect(with1.body).toBe(without.body);
  });

  it("keeps the session out of the body and the URL", () => {
    // Never in a query string, never in a signed payload — the same rule the
    // rest of this repo obeys for credential material.
    const request = buildWebullSubscribeRequest({ ...BASE, accessToken: "SECRET-SESSION" });
    expect(request.body).not.toContain("SECRET-SESSION");
    expect(request.url).not.toContain("SECRET-SESSION");
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

  it("reads 401 / INVALID_TOKEN as a SESSION fact, never an entitlement one", () => {
    // MEASURED 2026-09-21 in production. This is the answer Webull actually
    // gave, on a connection it had already accepted with CONNACK 0. A 401 on a
    // market-data path reads to every human as "market data is not
    // subscribed" — which is precisely the misreading that sent this project
    // to the Founder's wallet for three months. It is pinned here.
    for (const outcome of [
      readSubscribeOutcome(401, { code: "INVALID_TOKEN" }),
      readSubscribeOutcome(401, {}),
      readSubscribeOutcome(403, { errorCode: "INVALID_TOKEN" }),
    ]) {
      expect(outcome.subscribed).toBe(false);
      expect(outcome.note).toMatch(/did not accept the session/i);
      expect(outcome.note).toMatch(/not an entitlement fact/i);
      expect(outcome.note).not.toMatch(/\bsubscription (is )?required\b/i);
      expect(outcome.note).not.toMatch(/\b(go|must|need to|should)\s+(buy|purchase|upgrade|subscribe)\b/i);
      // It must also name the one action that resolves it, or it is just a
      // better-worded dead end.
      expect(outcome.note).toMatch(/mint a fresh session/i);
    }
  });

  it("keeps 401 and 417 as DIFFERENT answers", () => {
    // They are two distinct questions — "who is this?" and "which socket?" —
    // and collapsing them would lose the one distinction that made the live
    // measurement legible at all.
    const token = readSubscribeOutcome(401, { code: "INVALID_TOKEN" });
    const socket = readSubscribeOutcome(417, { code: "INVALID_SESSION" });
    expect(token.note).not.toBe(socket.note);
    expect(socket.note).not.toMatch(/mint a fresh session/i);
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
