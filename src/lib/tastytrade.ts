// ─────────────────────────────────────────────────────────────────────────────
// tastytrade — SERVER-ONLY secure provider (OAuth2 refresh-token grant)
//
// SECURITY (Company Bible §30, founder directive):
//   • This module must NEVER be imported by a client component. Secrets are read
//     from server-only env (no NEXT_PUBLIC_). Tokens never leave the server —
//     no localStorage, no client props, no API responses, no logs.
//   • Endpoints/params verified against tastytrade's own SDK
//     (tastytrade/tastytrade-api-js): POST {base}/oauth/token, grant_type
//     refresh_token, scopes ['read','trade']; base api.tastyworks.com (prod) /
//     api.cert.tastyworks.com (cert). Nothing invented.
//
// AUTH MODEL (tastytrade-recommended for server apps): a long-lived refresh
// token (generated once in the tastytrade dashboard → OAuth Applications →
// Manage → Create Grant; refresh tokens never expire) is exchanged for a
// 15-minute access token as needed. Provision it in the deployment environment as TASTYTRADE_REFRESH_TOKEN
// (server-only). client_id/secret are already set.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { fetchProviderWithTimeout } from "./providerFetch";

const IS_CERT = process.env.TASTYTRADE_ENV === "cert";
const BASE = IS_CERT ? "https://api.cert.tastyworks.com" : "https://api.tastyworks.com";
const SCOPES = "read trade";
// tastytrade REJECTS requests without a User-Agent (known gotcha; the official
// SDK always sends one). Applied to every request below.
const UA = "wealthymindsets-pro/1.0";

function creds() {
  return {
    clientId: process.env.TASTYTRADE_CLIENT_ID || "",
    clientSecret: process.env.TASTYTRADE_CLIENT_SECRET || "",
    // The Founder stored it in Cloudflare as TASTY_TRADE_REFRESH_TOKEN; both names are read.
    refreshToken: process.env.TASTYTRADE_REFRESH_TOKEN || process.env.TASTY_TRADE_REFRESH_TOKEN || "",
  };
}

/** Configuration state WITHOUT ever revealing secret values. */
export function tastytradeConfigStatus() {
  const c = creds();
  // The NAMES (never values) of the vars this lane actually needs and does not
  // have. Deliberately scoped to the two the token-mint body sends: the refresh
  // grant above carries client_secret + refresh_token and NO client_id, so
  // naming CLIENT_ID here would send the operator to fix something this lane
  // never reads. Presence-only; safe to render and serialize.
  const missing: string[] = [];
  if (!c.clientSecret) missing.push("TASTYTRADE_CLIENT_SECRET");
  if (!c.refreshToken) missing.push("TASTYTRADE_REFRESH_TOKEN");
  return {
    hasClientId: !!c.clientId,
    hasClientSecret: !!c.clientSecret,
    hasRefreshToken: !!c.refreshToken,
    missing: missing as readonly string[],
    env: IS_CERT ? "cert" : "production",
    base: BASE,
    // "configured" = we can actually mint an access token.
    configured: !!(c.clientSecret && c.refreshToken),
  };
}

// In-memory access-token cache (server process lifetime). Short-lived; never
// persisted to disk or sent to the client.
let _access: { token: string; expiresAt: number } | null = null;

/**
 * Mint (or reuse) a 15-minute access token via the refresh-token grant.
 * Returns null when not configured — callers must handle "not connected".
 */
async function getAccessToken(): Promise<string | null> {
  const c = creds();
  if (!c.clientSecret || !c.refreshToken) return null;
  if (_access && Date.now() < _access.expiresAt - 30_000) return _access.token;

  // Exact format from tastytrade's own SDK (tastytrade-http-client.ts): JSON body
  // with grant_type/refresh_token/client_secret/scope and NO client_id.
  const res = await fetchProviderWithTimeout(fetch, `${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: c.refreshToken,
      client_secret: c.clientSecret,
      scope: SCOPES,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    // Do NOT surface the raw body (may echo request params). Status only.
    throw new Error(`tastytrade token refresh failed (HTTP ${res.status})`);
  }
  const json = await res.json().catch(() => ({}));
  const token = json?.access_token as string | undefined;
  const expiresIn = Number(json?.expires_in) || 900; // ~15 min default
  if (!token) throw new Error("tastytrade token refresh returned no access_token");
  _access = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

/**
 * Authenticated request against the tastytrade API. Server-side only.
 * Retries once on 401 (access token may have expired between checks).
 * Throws with STATUS-ONLY messages — never echoes response bodies (which can
 * contain request params) or tokens.
 */
async function ttRequest<T = unknown>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("tastytrade not configured");
  const doFetch = (tok: string) =>
    fetchProviderWithTimeout(fetch, `${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${tok}`,
        Accept: "application/json",
        "User-Agent": UA,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

  let res = await doFetch(token);
  if (res.status === 401) {
    _access = null;
    const t2 = await getAccessToken();
    if (!t2) throw new Error("tastytrade not configured");
    res = await doFetch(t2);
  }
  if (!res.ok) {
    // For order endpoints tastytrade returns a validation body we WANT to relay
    // (buying-power effect, rejection reason) — but it can echo the symbol/qty we
    // sent, never a secret. Safe to surface for 4xx order responses.
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message || j?.["error"]?.message || "";
      // A preflight failure names its actual checks under `error.errors` —
      // the trader needs THOSE ("insufficient buying power", "market closed"),
      // not the headline.
      const subs = Array.isArray(j?.error?.errors) ? (j.error.errors as { message?: unknown; code?: unknown }[]) : [];
      const why = subs.map(e => (typeof e?.message === "string" ? e.message : typeof e?.code === "string" ? e.code : "")).filter(Boolean);
      if (why.length) detail = `${detail ? `${detail} — ` : ""}${why.join("; ")}`;
    } catch { /* ignore */ }
    // The account number rides in the path; only its last four ever reach a screen.
    const shownPath = path.replace(/\/accounts\/([A-Za-z0-9]+)/, (_m, acct: string) => `/accounts/…${acct.slice(-4)}`);
    throw new Error(`tastytrade ${method} ${shownPath} failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

/** Authenticated GET against the tastytrade API. Server-side only. */
export async function ttGet<T = unknown>(path: string): Promise<T> {
  return ttRequest<T>("GET", path);
}

export interface TastytradeAccountLite {
  accountNumber: string;
  nickname?: string;
  accountType?: string;
  isFuturesApproved?: boolean;
  marginOrCash?: string;
}

/** List the authenticated customer's accounts (no secrets returned). */
export async function getTastytradeAccounts(): Promise<TastytradeAccountLite[]> {
  const data = await ttGet<any>("/customers/me/accounts");
  const items = data?.data?.items ?? [];
  return items.map((it: any) => {
    const a = it.account ?? it;
    return {
      accountNumber: a["account-number"] ?? a.accountNumber ?? "",
      nickname: a.nickname,
      accountType: a["account-type-name"] ?? a.accountType,
      isFuturesApproved: !!(a["futures-account-purpose"] || a.isFuturesApproved),
      marginOrCash: a["margin-or-cash"] ?? a.marginOrCash,
    };
  });
}

export interface TastytradeCapabilities {
  configured: boolean;
  connected: boolean; // token mint + accounts fetch actually succeeded
  env: string;
  accounts: number;
  quotes: boolean; // dxFeed streaming token obtainable
  realTime: boolean | null; // entitlement — verified, not assumed
  supportedAssetClasses: string[];
  sourceName: string;
  note: string;
}

/**
 * Verify real capability rather than assume it (Company Bible: data truth).
 * Probes accounts + the api-quote-token (dxFeed) endpoint. Never fabricates.
 */
export async function getTastytradeCapabilities(): Promise<TastytradeCapabilities> {
  const cfg = tastytradeConfigStatus();
  const base: TastytradeCapabilities = {
    configured: cfg.configured,
    connected: false,
    env: cfg.env,
    accounts: 0,
    quotes: false,
    realTime: null,
    supportedAssetClasses: [],
    sourceName: "tastytrade / dxFeed",
    // Name the vars MEASURED absent, never a guessed one. `configured` is false
    // when EITHER the client secret or the refresh token is missing, so the old
    // fixed "Add TASTYTRADE_REFRESH_TOKEN" text asserted a cause this function
    // had not checked — the same shape of error that cost three months on
    // Webull (see docs/operations/EVIDENCE_2026-09-20_WEBULL_ENTITLEMENT_ISOLATED.md):
    // a status line describing our view of the operator instead of our own
    // measurement. Sending him to mint a refresh token he already supplied,
    // when the secret was the gap, would waste his time and blame his setup.
    note: cfg.configured
      ? ""
      : `Not configured on this host: ${cfg.missing.join(" + ")} ${
          cfg.missing.length === 1 ? "is" : "are"
        } absent. A refresh token is generated once in the tastytrade dashboard (OAuth Applications → Manage → Create Grant) and set in the host runtime secrets.`,
  };
  if (!cfg.configured) return base;
  try {
    const accts = await getTastytradeAccounts();
    base.connected = true;
    base.accounts = accts.length;
    base.supportedAssetClasses = ["equity", "option", "future"];
    // dxFeed streaming token = proof quotes are available for this account.
    try {
      await ttGet<any>("/api-quote-tokens");
      base.quotes = true;
    } catch {
      base.quotes = false;
      base.note = "Connected, but streaming quote token unavailable — data may be limited.";
    }
    // Real-time vs delayed is an account entitlement; we do not claim real-time
    // without proof. Left null until a verified quote timestamp confirms it.
  } catch (e) {
    // Surface the STATUS-ONLY error (our error messages never contain secrets or
    // response bodies) so the failing step is diagnosable without leaking creds.
    const msg = e instanceof Error ? e.message : "unknown";
    base.note = `Configured but connection failed: ${msg}`;
  }
  return base;
}

/* ── Garden 18 §LXIX–§XCV: the calls a trading OS needs, from tastytrade's
   documented endpoints. Server-side only; owner-gated at every route. ───── */

/** Authenticated POST. Server-side only. */
export async function ttPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return ttRequest<T>("POST", path, body);
}

/** One account's positions (tastytrade /accounts/{n}/positions). */
export async function getTastytradePositions(accountNumber: string): Promise<unknown[]> {
  const j = await ttGet<{ data?: { items?: unknown[] } }>(`/accounts/${encodeURIComponent(accountNumber)}/positions`);
  return j?.data?.items ?? [];
}

/** A dry run: tastytrade validates the order against the real account and places NOTHING. */
export async function dryRunTastytradeOrder(accountNumber: string, order: unknown): Promise<unknown> {
  const j = await ttPost<{ data?: unknown }>(`/accounts/${encodeURIComponent(accountNumber)}/orders/dry-run`, order);
  return j?.data ?? j;
}

/** Equity option chain, nested by expiration (tastytrade /option-chains/{symbol}/nested). */
export async function getTastytradeOptionChain(symbol: string): Promise<unknown> {
  const j = await ttGet<{ data?: unknown }>(`/option-chains/${encodeURIComponent(symbol)}/nested`);
  return j?.data ?? j;
}

/** The specific futures contracts of a product (e.g. MNQ → /MNQZ6, /MNQH7 …). */
export async function getTastytradeFutures(productCode: string): Promise<unknown[]> {
  const j = await ttGet<{ data?: { items?: unknown[] } }>(`/instruments/futures?product-code[]=${encodeURIComponent(productCode)}`);
  return j?.data?.items ?? [];
}

/** tastytrade symbol search (`GET /symbols/search/{q}`): equities, ETFs, indices. */
export async function searchTastytradeSymbols(q: string): Promise<unknown[]> {
  const j = await ttGet<{ data?: { items?: unknown[] } }>(`/symbols/search/${encodeURIComponent(q)}`);
  return j?.data?.items ?? [];
}

/** Every futures product tastytrade lists (code + description). */
export async function getTastytradeFutureProducts(): Promise<unknown[]> {
  const j = await ttGet<{ data?: { items?: unknown[] } }>(`/instruments/future-products`);
  return j?.data?.items ?? [];
}

/** Every cryptocurrency pair tastytrade lists. */
export async function getTastytradeCryptocurrencies(): Promise<unknown[]> {
  const j = await ttGet<{ data?: { items?: unknown[] } }>(`/instruments/cryptocurrencies`);
  return j?.data?.items ?? [];
}

/** Futures-option chain, nested (tastytrade /futures-option-chains/{product}/nested). */
export async function getTastytradeFuturesOptionChain(productCode: string): Promise<unknown> {
  const j = await ttGet<{ data?: unknown }>(`/futures-option-chains/${encodeURIComponent(productCode)}/nested`);
  return j?.data ?? j;
}

/**
 * The DXLink quote token (`GET /api-quote-tokens`): a 24h market-data token,
 * NOT an OAuth secret — tastytrade issues it for the client to open the stream
 * itself. Returned only through an owner-gated route.
 */
// tastytrade's quote token lives 24 h; one chart load asked for it 4 times
// (2026-10-03), each a round trip to tastytrade. Held 20 min per isolate.
const QUOTE_TOKEN_TTL_MS = 20 * 60_000;
let quoteTokenMemo: { at: number; value: { token: string; dxlinkUrl: string; level: string | null } } | null = null;
let quoteTokenInFlight: Promise<{ token: string; dxlinkUrl: string; level: string | null }> | null = null;

export async function getTastytradeQuoteToken(): Promise<{ token: string; dxlinkUrl: string; level: string | null }> {
  if (quoteTokenMemo && Date.now() - quoteTokenMemo.at < QUOTE_TOKEN_TTL_MS) return quoteTokenMemo.value;
  if (quoteTokenInFlight) return quoteTokenInFlight;
  quoteTokenInFlight = fetchTastytradeQuoteToken()
    .then(value => { quoteTokenMemo = { at: Date.now(), value }; return value; })
    .finally(() => { quoteTokenInFlight = null; });
  return quoteTokenInFlight;
}

async function fetchTastytradeQuoteToken(): Promise<{ token: string; dxlinkUrl: string; level: string | null }> {
  const r = await ttGet<any>("/api-quote-tokens");
  const d = r?.data ?? r;
  const token = typeof d?.token === "string" ? d.token : "";
  const dxlinkUrl = typeof d?.["dxlink-url"] === "string" ? d["dxlink-url"] : "";
  if (!token || !dxlinkUrl) throw new Error("quote token response had no token/dxlink-url");
  return { token, dxlinkUrl, level: typeof d?.level === "string" ? d.level : null };
}

/** The account's working and recently-closed orders (tastytrade: today's orders). */
export async function getTastytradeLiveOrders(accountNumber: string): Promise<unknown[]> {
  const r = await ttGet<any>(`/accounts/${encodeURIComponent(accountNumber)}/orders/live`);
  return (r?.data?.items ?? []) as unknown[];
}

/**
 * LIVE ORDER — real money. Called ONLY by the owner- and authority-gated
 * /api/broker/tastytrade/order-submit route, after the human pressed the armed
 * button and tastytrade's own dry run passed in the same request.
 */
export async function submitTastytradeOrder(accountNumber: string, order: unknown): Promise<unknown> {
  const r = await ttPost<any>(`/accounts/${encodeURIComponent(accountNumber)}/orders`, order);
  return r?.data ?? r;
}

/** Request cancellation of one working order; tastytrade answers with the order in its new state. */
export async function cancelTastytradeOrder(accountNumber: string, orderId: string): Promise<unknown> {
  const r = await ttRequest<any>("DELETE", `/accounts/${encodeURIComponent(accountNumber)}/orders/${encodeURIComponent(orderId)}`);
  return r?.data ?? r;
}


/**
 * The account's TRADE transactions since a date (YYYY-MM-DD) — the broker's own
 * record of fills: symbol, action, quantity, price, fees, executed-at, order-id.
 * Read only; the Journal's machine facts come from here, never browser memory.
 */
/**
 * EVERY trade transaction since `startDate`, page by page (250 a page). The
 * one-page read below silently stopped at 250 rows — the truncation trap that
 * once made the Webull ledger wrong. Stops at the last page, an empty page, or
 * `maxPages` (reported, never hidden).
 */
export async function getTastytradeTradeHistory(accountNumber: string, startDate: string, maxPages = 40): Promise<{ items: unknown[]; pages: number; truncated: boolean }> {
  const items: unknown[] = [];
  let page = 0, totalPages = 1;
  while (page < totalPages && page < maxPages) {
    const q = `type=Trade&start-date=${encodeURIComponent(startDate)}&per-page=250&page-offset=${page}`;
    const r = await ttGet<any>(`/accounts/${encodeURIComponent(accountNumber)}/transactions?${q}`);
    const got = (r?.data?.items ?? []) as unknown[];
    items.push(...got);
    const tp = Number(r?.pagination?.["total-pages"]);
    totalPages = Number.isFinite(tp) && tp > 0 ? tp : got.length === 250 ? page + 2 : page + 1;
    page++;
    if (got.length === 0) break;
  }
  return { items, pages: page, truncated: page < totalPages };
}

export async function getTastytradeTradeTransactions(accountNumber: string, startDate: string): Promise<unknown[]> {
  const q = `type=Trade&start-date=${encodeURIComponent(startDate)}&per-page=250`;
  const r = await ttGet<any>(`/accounts/${encodeURIComponent(accountNumber)}/transactions?${q}`);
  return (r?.data?.items ?? []) as unknown[];
}
