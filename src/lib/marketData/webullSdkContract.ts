/**
 * THE ONE PLACE A WEBULL REQUEST PATH MAY BE DECIDED.
 *
 * ── The measured failure this exists to prevent ─────────────────────────────
 *
 * For roughly three months WM Pro sent its Webull tick read to
 * `/openapi/market-data/stock/tick` at version v2. Webull answered 403
 * MARKET_DATA_NOT_SUBSCRIBED. That code reads like a bill: it names a
 * subscription, so every reader concluded the Founder's account lacked a data
 * package, and the Founder was repeatedly sent back to Webull to buy one. He
 * had already bought it. His key carried Market Data and Trading both.
 *
 * The request was simply wrong. The official Webull Python SDK declares the
 * tick read as `/market-data/stocks/ticks/list` at v3 — different path,
 * different version, no `/openapi` prefix.
 *
 * A PROVIDER ERROR CODE DESCRIBES THE PROVIDER'S VIEW OF *OUR* REQUEST. It is
 * not evidence about the operator's account until our request is known-correct.
 * That sentence is the whole lesson, and it cost months.
 *
 * ── Why the defect survived so long ─────────────────────────────────────────
 *
 * Not because it was hard to find. Because a CODE COMMENT ASSERTED THE WRONG
 * ANSWER AS FACT. The old comment at the declaration site said the prefixed
 * path was "Webull's current official SDK request contract" and that the real
 * path "returns an access-looking failure" — both false, both stated flatly,
 * with no citation. It told every subsequent reader not to look where the
 * answer was. An uncited provider claim in a comment is not documentation; it
 * is a landmine with a friendly label.
 *
 * So every row below carries the SDK FILE IT WAS READ FROM. If a path changes,
 * the citation must change with it, and a reviewer can open the named file
 * instead of trusting the sentence.
 *
 * ── Be precise about the prefix ─────────────────────────────────────────────
 *
 * "Webull has no /openapi prefix" is the WRONG lesson and would cause the next
 * bug. Some SDK endpoints genuinely carry it (`/openapi/instrument/option/
 * contracts`, `/openapi/fundamentals/fund/dividends`). The prefix is
 * PER-ENDPOINT. The stock tick endpoint does not carry one; a different
 * endpoint might. Read the SDK for each.
 *
 * The enforcement lives in `webullSdkContract.sentinel.test.ts`, which fails if
 * any Webull production module hard-codes a request path instead of reading it
 * from here. One owner, cited, or the build goes red.
 */

export interface WebullEndpointContract {
  /** The request path, verbatim, including any `/openapi` prefix the SDK declares. */
  readonly path: string;
  /** The `x-version` header value the SDK pins for this endpoint. Not global. */
  readonly apiVersion: string;
  /** Does reaching this endpoint require a market-data entitlement? */
  readonly needsMarketData: boolean;
  /** The SDK file this row was READ from. A row without one is a guess. */
  readonly sdkSource: string;
}

/**
 * Transcribed from the official Webull Python SDK the Founder supplied
 * (webull-openapi-python-sdk-main). `core/http/response.py` composes the URL as
 * `https://{host}{path}` verbatim and adds no prefix of its own, so what is
 * written here is exactly what goes on the wire.
 */
export const WEBULL_SDK_CONTRACT = {
  /** The broker lane. Independently CONNECTED against these same credentials,
   *  which is what proved the market-data denial was not a credential problem. */
  ACCOUNT_LIST: {
    path: "/trading/accounts/list",
    apiVersion: "v2",
    needsMarketData: false,
    sdkSource: "webull/trade/request/get_account_list_request.py",
  },
  /** Instrument metadata. Needs auth but NOT a data package — it is the control
   *  rung that makes a market-data denial readable. */
  STOCK_PROFILES: {
    path: "/trading/instruments/stocks/profiles/list",
    apiVersion: "v3",
    needsMarketData: false,
    sdkSource: "webull/data/request/get_instruments_request_v2.py",
  },
  STOCK_SNAPSHOTS: {
    path: "/market-data/stocks/snapshots/list",
    apiVersion: "v3",
    needsMarketData: true,
    sdkSource: "webull/data/request/get_snapshot_request.py",
  },
  /**
   * THE SESSION LANE — how an access token is BORN, not where one is pasted.
   *
   * This row exists because WM Pro spent roughly three months treating
   * `WEBULL_ACCESS_TOKEN` as a permanent secret. It is not. The SDK's
   * `access_token.py` gives every token three fields — `token`, `expires`,
   * `status` — and `token_manager.py` re-mints one on EVERY client init. A
   * value with an expiry is a session, and a session hand-pasted into a
   * deployment platform is a session that will be dead by the time it matters.
   *
   * That single category error produced the exact symptom the Founder reported
   * for months: it works right after he adds it, then every rung returns 401
   * INVALID_TOKEN — including rungs that need no market data — and re-pasting
   * appears to "fix" it until the next expiry.
   */
  CREATE_TOKEN: {
    path: "/auth/tokens/create",
    apiVersion: "v3",
    needsMarketData: false,
    sdkSource: "webull/core/http/initializer/token/bean/create_token_request.py",
  },
  /** Extends a living token. Note the `/openapi` prefix HERE and not on create:
   *  the prefix is per-endpoint, and guessing it symmetrical is a way to invent
   *  a 404 and then read it as a permissions problem. */
  REFRESH_TOKEN: {
    path: "/openapi/auth/token/refresh",
    apiVersion: "v3",
    needsMarketData: false,
    sdkSource: "webull/core/http/initializer/token/bean/refresh_token_request.py",
  },
  /** Asks whether a minted token has cleared 2FA yet. `token_manager.py` polls
   *  this until status leaves PENDING — the one step that genuinely needs a
   *  human, and therefore the one step WM Pro must name precisely instead of
   *  reporting as a generic auth failure. */
  CHECK_TOKEN: {
    path: "/auth/tokens/check",
    apiVersion: "v3",
    needsMarketData: false,
    sdkSource: "webull/core/http/initializer/token/bean/check_token_request.py",
  },
  /** THE ONE THAT WAS WRONG. get_tick_request.py:
   *    ApiRequest.__init__(self, "/market-data/stocks/ticks/list", version='v3', method="GET") */
  STOCK_TICKS: {
    path: "/market-data/stocks/ticks/list",
    apiVersion: "v3",
    needsMarketData: true,
    sdkSource: "webull/data/request/get_tick_request.py",
  },
} as const satisfies Readonly<Record<string, WebullEndpointContract>>;

export type WebullEndpointName = keyof typeof WEBULL_SDK_CONTRACT;

export const WEBULL_CONTRACT_ROWS: readonly WebullEndpointContract[] = Object.values(WEBULL_SDK_CONTRACT);
