/**
 * THE CALL THAT ONLY MAKES SENSE WHILE A SOCKET IS OPEN.
 *
 * MEASURED 2026-09-21, in this order, and the order is the whole point:
 *
 *  1. `POST /market-data/streaming/subscribe` sent on its own answered
 *     `417 INVALID_SESSION`. Read carelessly that looks like a credential
 *     problem. It is not.
 *  2. `webull/data/internal/quotes_client.py` calls this endpoint from exactly
 *     one place — inside `_quotes_on_connect`, and only after `rc == 0`. The
 *     `session_id` in this body is the MQTT `client_id` of the socket that
 *     callback is running on.
 *  3. An MQTT CONNECT to data-api.webull.com:1883 returned CONNACK 0.
 *
 * So `session_id` NAMES AN ALREADY-OPEN SOCKET. Sending this request without
 * one is asking Webull to push quotes to a connection that does not exist, and
 * 417 was a precise, correct answer to a question we should never have asked.
 *
 * This module builds the request and nothing else — no socket, no fetch — so
 * the body shape and the signing can be proven offline. The rule it exists to
 * enforce is stated in `assertSessionIsLive`: the caller must hold a live
 * CONNACK-0 socket, and the type system makes that hard to forget.
 *
 * Every field below is taken from `webull/data/request/subscribe_request.py`
 * (path, `version='v3'`, POST, body keys) and the enum names from
 * `webull/data/common/subscribe_type.py` and `.../common/category.py` — the
 * SDK sends `.name`, so "US_STOCK" and "QUOTE", not the numeric codes.
 */
import { buildWebullSignedHeaders, type WebullSigningProfile } from "./adapters/webullMarketData";
import { WEBULL_SDK_CONTRACT } from "./webullSdkContract";

/** `webull/data/common/subscribe_type.py` — sent by NAME. */
export const WEBULL_SUB_TYPES = ["QUOTE", "SNAPSHOT", "TICK"] as const;
export type WebullSubType = (typeof WEBULL_SUB_TYPES)[number];

/**
 * `webull/core/data/category.py` — sent by NAME.
 *
 * NOTE, because it is a real trap in the source: US_EVENT and HK_FUTURES BOTH
 * carry numeric code 13 in the SDK's enum. Sending names sidesteps the
 * collision entirely, which is the other reason not to "optimize" to codes.
 */
export const WEBULL_CATEGORIES = [
  "US_STOCK",
  "US_OPTION",
  "HK_STOCK",
  "US_ETF",
  "HK_ETF",
  "CN_STOCK",
  "US_CRYPTO",
  "US_FUTURES",
  "US_EVENT",
  "HK_FUTURES",
] as const;
export type WebullCategory = (typeof WEBULL_CATEGORIES)[number];

/**
 * Read from the contract, never written here.
 *
 * `webullSdkContract.ts` is the single owner of every Webull request path, with
 * the SDK file each was read from cited alongside it, and
 * `webullSdkContract.sentinel.test.ts` fails the build if a module writes one
 * as a literal instead. That rule exists because a hard-coded path is how this
 * repo shipped `/openapi/market-data/stock/tick` for three months and then read
 * the resulting 403 as the Founder's missing subscription.
 */
export const WEBULL_SUBSCRIBE_PATH = WEBULL_SDK_CONTRACT.STREAMING_SUBSCRIBE.path;
export const WEBULL_UNSUBSCRIBE_PATH = WEBULL_SDK_CONTRACT.STREAMING_UNSUBSCRIBE.path;
export const WEBULL_SUBSCRIBE_VERSION = WEBULL_SDK_CONTRACT.STREAMING_SUBSCRIBE.apiVersion;

export interface WebullSubscribeInput {
  /**
   * The MQTT client id of a socket that is OPEN RIGHT NOW and whose CONNACK
   * returned 0. Not a value to mint for this call.
   */
  readonly sessionId: string;
  readonly symbols: readonly string[];
  readonly category: WebullCategory;
  readonly subTypes: readonly WebullSubType[];
  readonly appKey: string;
  readonly appSecret: string;
  /**
   * The minted Webull SESSION, sent as `x-access-token`.
   *
   * MEASURED IN PRODUCTION 2026-09-21: with this header absent, the socket
   * handshake returned CONNACK 0 — Webull accepted the connection — and this
   * request then answered `401 INVALID_TOKEN`. Two different answers to two
   * different questions, and the second one was ours to fix.
   *
   * `webull/core/client.py:259` attaches it to EVERY request, and attaches it
   * AFTER `signer.sign(request)`. So it is deliberately not part of the signed
   * canonical string, and adding it cannot invalidate the signature — a fact
   * `webullQuotesSubscribe.test.ts` asserts rather than assumes.
   *
   * Optional because a caller with no session should still be able to build the
   * request and watch Webull name the gap, rather than get a local error that
   * hides which side the refusal came from.
   */
  readonly accessToken?: string;
  readonly timestamp: string;
  readonly nonce: string;
  readonly host?: string;
  readonly profile?: WebullSigningProfile;
}

export interface WebullSignedRequest {
  readonly url: string;
  readonly method: "POST";
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

const DEFAULT_API_HOST = "api.webull.com";

/**
 * The body is serialized ONCE and that exact string is both signed and sent.
 *
 * Webull signs a digest of the body (`default_signature_composer.py`), so
 * re-serializing between signing and sending — even with identical data — can
 * change key order and invalidate the signature. Returning the string, rather
 * than an object for the caller to stringify, makes that class of bug
 * unavailable rather than merely discouraged.
 */
export function buildWebullSubscribeRequest(
  input: WebullSubscribeInput,
): WebullSignedRequest {
  if (input.symbols.length === 0) {
    throw new Error("Refusing to subscribe to zero symbols: Webull would have nothing to push.");
  }
  if (input.subTypes.length === 0) {
    throw new Error("Refusing to subscribe with zero sub_types: the socket would stay silent.");
  }

  const host = (input.host ?? DEFAULT_API_HOST).replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const body = JSON.stringify({
    session_id: input.sessionId,
    symbols: [...input.symbols],
    category: input.category,
    sub_types: [...input.subTypes],
  });

  const headers = buildWebullSignedHeaders({
    path: WEBULL_SUBSCRIBE_PATH,
    query: {},
    appKey: input.appKey,
    appSecret: input.appSecret,
    host,
    timestamp: input.timestamp,
    nonce: input.nonce,
    body,
    profile: input.profile,
    apiVersion: WEBULL_SUBSCRIBE_VERSION,
  });

  // Added AFTER signing, exactly as `client.py` does it. The session is a
  // credential the transport carries, not a term the signature covers.
  const token = input.accessToken?.trim();

  return {
    url: `https://${host}${WEBULL_SUBSCRIBE_PATH}`,
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      ...(token ? { "x-access-token": token } : {}),
    },
    body,
  };
}

export interface WebullSubscribeOutcome {
  readonly subscribed: boolean;
  readonly status: number;
  readonly providerCode: string | null;
  readonly note: string;
}

/**
 * WHAT A SUBSCRIBE ANSWER IS ALLOWED TO MEAN.
 *
 * Kept separate from the transport for the same reason as
 * `readQuotesHandshake`: this project's costliest defect was never a failed
 * request, it was a correct request read as the wrong kind of fact. 417 in
 * particular must never again be reported as an entitlement or credential
 * problem — it is a statement about the socket.
 */
export function readSubscribeOutcome(
  status: number,
  payload: unknown,
): WebullSubscribeOutcome {
  const record = typeof payload === "object" && payload !== null
    ? (payload as Record<string, unknown>)
    : {};
  const rawCode = record.code ?? record.errorCode ?? record.error_code;
  const providerCode = typeof rawCode === "string" ? rawCode : null;

  if (status >= 200 && status < 300) {
    return {
      subscribed: true,
      status,
      providerCode,
      note:
        "Webull accepted the subscription for this session id. Quotes will now " +
        "arrive as MQTT PUBLISH frames on the socket that session id names; if " +
        "none arrive, that is a market-activity or symbol question, not an access one.",
    };
  }

  if (providerCode === "INVALID_SESSION" || status === 417) {
    return {
      subscribed: false,
      status,
      providerCode,
      note:
        "Webull does not recognise this session id as an open socket. That is a " +
        "statement about OUR connection lifecycle — the socket closed, or the id " +
        "sent here is not the one the broker connected with — and it is not a " +
        "statement about credentials or entitlement. Do not report it as one.",
    };
  }

  if (providerCode === "INVALID_TOKEN" || status === 401) {
    return {
      subscribed: false,
      status,
      providerCode,
      note:
        "Webull did not accept the session this request carried. MEASURED " +
        "2026-09-21: this is what a MISSING or EXPIRED `x-access-token` looks " +
        "like, and it arrived on a connection Webull had already accepted with " +
        "CONNACK 0 — so the account and the app key are not in question here. " +
        "Mint a fresh session and send it again. It is not an entitlement fact.",
    };
  }

  return {
    subscribed: false,
    status,
    providerCode,
    note:
      `Webull refused the subscription with status ${status}` +
      (providerCode ? ` and code ${providerCode}` : "") +
      ". That is recorded as-is and interpreted no further; an unread code is " +
      "better than a guessed meaning.",
  };
}
