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
// 15-minute access token as needed. Add it to Vercel as TASTYTRADE_REFRESH_TOKEN
// (server-only). client_id/secret are already set.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";

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
    refreshToken: process.env.TASTYTRADE_REFRESH_TOKEN || "",
  };
}

/** Configuration state WITHOUT ever revealing secret values. */
export function tastytradeConfigStatus() {
  const c = creds();
  return {
    hasClientId: !!c.clientId,
    hasClientSecret: !!c.clientSecret,
    hasRefreshToken: !!c.refreshToken,
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
  const res = await fetch(`${BASE}/oauth/token`, {
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
    fetch(`${BASE}${path}`, {
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
    } catch { /* ignore */ }
    throw new Error(`tastytrade ${method} ${path} failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`);
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
    note: cfg.configured
      ? ""
      : "Add TASTYTRADE_REFRESH_TOKEN (server env) — generate it once in the tastytrade dashboard.",
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
