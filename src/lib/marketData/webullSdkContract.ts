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
  /**
   * The HTTP method the SDK declares. Absent means GET, which every row carried
   * implicitly until the streaming lane arrived. It is written down rather than
   * inferred because Webull SIGNS THE BODY: `default_signature_composer.py`
   * appends the SHA-256 hex digest of the compact JSON body to the string being
   * signed. Sending a POST as a GET does not merely miss a body — it produces a
   * signature for a different request, and the 403 that comes back looks exactly
   * like the entitlement 403 this whole file exists to stop misreading.
   */
  readonly method?: "GET" | "POST";
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
  /**
   * The positions read behind the BROKER COST LINE (bolt-on build order #6).
   * Same request family as ACCOUNT_LIST (webull/trade/request/, non-v2 client):
   * get_account_positions_request.py declares
   *   ApiRequest.__init__(self, "/account/positions", version='v3', method="GET")
   * with query params account_id / page_size / last_instrument_id. Note the v2
   * client declares a DIFFERENT path (/trading/assets/positions/list) — the
   * row below is the one whose sibling account-list rung is already proven
   * CONNECTED in production, so it is the one WM Pro knocks on first.
   */
  ACCOUNT_POSITIONS: {
    path: "/account/positions",
    apiVersion: "v3",
    needsMarketData: false,
    sdkSource: "webull/trade/request/get_account_positions_request.py",
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
  /**
   * WHAT THE PROVIDER ITSELF SAYS THIS APP IS SUBSCRIBED TO.
   *
   * Every other row here asks Webull for market data and reads the refusal. This
   * row asks Webull the question directly, and that difference is the point: the
   * entitlement ladder can only ever isolate a gap by elimination, and
   * "everything we control is eliminated, therefore it must be his account" is
   * still an inference. It is the exact inference that cost three months.
   *
   * `/app/subscriptions/list` turns that inference into a reading. If it comes
   * back naming the packages attached to this app key, then any sentence we send
   * the Founder can quote his own subscription list instead of guessing at it —
   * and if the list is complete and market data is still refused, the fault is
   * demonstrably NOT his purchase.
   */
  APP_SUBSCRIPTIONS: {
    path: "/app/subscriptions/list",
    apiVersion: "v3",
    needsMarketData: false,
    sdkSource: "webull/trade/request/get_app_subscriptions.py",
  },
  /** THE ONE THAT WAS WRONG. get_tick_request.py:
   *    ApiRequest.__init__(self, "/market-data/stocks/ticks/list", version='v3', method="GET") */
  STOCK_TICKS: {
    path: "/market-data/stocks/ticks/list",
    apiVersion: "v3",
    needsMarketData: true,
    sdkSource: "webull/data/request/get_tick_request.py",
  },
  /**
   * ── THE DOOR WM PRO HAD NEVER KNOCKED ON ────────────────────────────────────
   *
   * Every market-data row above is REST pull. Webull's real-time product is not
   * REST at all. `webull/data/data_streaming_client.py` builds a paho-MQTT
   * client; `quotes_client.py:_quotes_connect` resolves its host through
   * `api_type.QUOTES`, which `webull/core/data/endpoints.json` maps to
   * `data-api.webull.com` — a different host from the `api.webull.com` every
   * request WM Pro has ever sent. Live QUOTE / SNAPSHOT / TICK arrive as MQTT
   * pushes on that socket.
   *
   * This row is the HTTP half of that lane: you authorise a symbol set by POSTing
   * a signed subscribe, then the MQTT socket delivers. It is therefore the
   * cheapest possible test of a question we have been answering by inference for
   * three months — whether the real-time entitlement exists — because it is one
   * signed HTTP request against the streaming product rather than the pull
   * product, and it can be asked without opening a socket at all.
   *
   * WHY THIS MATTERS TO THE READING. `/market-data/stocks/*` answering
   * MARKET_DATA_NOT_SUBSCRIBED says nothing about the streaming product; they are
   * separate doors and nothing in our evidence ever established they share a
   * lock. The Founder's own research says Webull gives him real-time data, and
   * the ladder has been measuring only the door that does not carry it.
   *
   * ── WHAT THIS DOOR ACTUALLY ANSWERED, AND WHAT THAT MAY NOT MEAN ───────────
   *
   * MEASURED IN PRODUCTION 2026-09-21, after the minted `x-access-token` was
   * threaded through this lane (the fix that turned `401 INVALID_TOKEN` into the
   * answer below). All four (subType × category) cells were tried — QUOTE,
   * SNAPSHOT and TICK on US_STOCK, plus QUOTE on US_ETF. Every one:
   *
   *     CONNACK 0  →  403 MARKET_DATA_NOT_SUBSCRIBED
   *
   * Uniform. Not per-subtype, not per-category. And that string is the exact one
   * this project misread for three months, so it gets NO interpretation on
   * reputation. The counter-evidence, same account, same day, through an
   * authorized Webull client: a real-time AAPL snapshot with live bid/ask
   * (334.76×2 / 334.94×25), and a depth>1 quote request refused with
   * `depth not more than 1` — Webull's signature for an account that holds L1.
   *
   * THE ACCOUNT HOLDS REAL-TIME DATA. So a 403 here is NOT a bill, and must
   * never again be reported to the Founder as one.
   *
   * What remains genuinely unknown is what THIS APP KEY carries, which is a
   * different question from what the ACCOUNT carries. `/app/subscriptions/list`
   * was the obvious place to ask — and it has now been asked twice against
   * production and answers with bare ids and nothing else, a measurement pinned
   * by `webullEntitlementProbe.test.ts`. That door does not name it either.
   * Anyone tempted to re-derive it: it has been tried. Measure something new.
   */
  STREAMING_SUBSCRIBE: {
    path: "/market-data/streaming/subscribe",
    apiVersion: "v3",
    method: "POST",
    needsMarketData: true,
    sdkSource: "webull/data/request/subscribe_request.py",
  },
  /** The release half. Probing subscribe leaves a server-side subscription bound
   *  to a session id no socket will ever attach to; this row exists so the probe
   *  can put back what it took rather than leaking one per run. */
  STREAMING_UNSUBSCRIBE: {
    path: "/market-data/streaming/unsubscribe",
    apiVersion: "v3",
    method: "POST",
    needsMarketData: true,
    sdkSource: "webull/data/request/unsubscribe_request.py",
  },
  /**
   * ── THE ORDER LANE (GP12 Mission B) ────────────────────────────────────────
   *
   * Transcribed 2026-09-25 from webull-openapi-python-sdk 3.0.2 (PyPI sdist),
   * the `order_v3` family (`webull/trade/trade/v3/order_operation_v3.py`) that
   * `samples/trade/trade_client_v3.py` drives. Every order carries a
   * caller-minted `client_order_id`; Webull's own sample reads an order back by
   * that id (`get_order_detail(account_id, client_order_id)`), which is what
   * makes an ambiguous submission reconcilable instead of retryable.
   *
   * The body sent is `{account_id, new_orders:[…]}` (preview/place) and
   * `{account_id, client_order_id}` (cancel), per the `set_*` methods of each
   * request class. Place also sets a `category` header of
   * `<market>_<instrument_type>` (`add_custom_headers_from_order`).
   */
  ORDER_PREVIEW: {
    path: "/trading/orders/preview",
    apiVersion: "v3",
    method: "POST",
    needsMarketData: false,
    sdkSource: "webull/trade/request/v3/preview_order_request.py",
  },
  ORDER_PLACE: {
    path: "/trading/orders/place",
    apiVersion: "v3",
    method: "POST",
    needsMarketData: false,
    sdkSource: "webull/trade/request/v3/place_order_request.py",
  },
  /** Primary reconciliation for an ambiguous submission: exact order by
   *  `client_order_id` (query params account_id, client_order_id). */
  ORDER_DETAIL: {
    path: "/trading/orders/get",
    apiVersion: "v3",
    needsMarketData: false,
    sdkSource: "webull/trade/request/v3/get_order_detail_request.py",
  },
  /** Supporting evidence only — list views can lag the exact read. */
  ORDER_OPEN_LIST: {
    path: "/trading/orders/open-orders/list",
    apiVersion: "v3",
    needsMarketData: false,
    sdkSource: "webull/trade/request/v3/get_order_open_request_v2.py",
  },
  ORDER_CANCEL: {
    path: "/trading/orders/cancel",
    apiVersion: "v3",
    method: "POST",
    needsMarketData: false,
    sdkSource: "webull/trade/request/v3/cancel_order_request.py",
  },
  /** Balance read in the same account_v2 family as the proven account list. */
  ACCOUNT_BALANCE: {
    path: "/trading/assets/balances/get",
    apiVersion: "v3",
    needsMarketData: false,
    sdkSource: "webull/trade/request/v2/get_account_balance_request.py",
  },
} as const satisfies Readonly<Record<string, WebullEndpointContract>>;

export type WebullEndpointName = keyof typeof WEBULL_SDK_CONTRACT;

export const WEBULL_CONTRACT_ROWS: readonly WebullEndpointContract[] = Object.values(WEBULL_SDK_CONTRACT);
