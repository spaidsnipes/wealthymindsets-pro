/** Bounded, read-only proof of the founder's Webull Trading API connection. */
import { randomUUID } from "crypto";
import { buildWebullSignedHeaders } from "@/lib/marketData/adapters/webullMarketData";
import { WEBULL_SDK_CONTRACT } from "@/lib/marketData/webullSdkContract";
import {
  TOKEN_DISPOSITIONS,
  ensureWebullAccessToken,
  inMemoryTokenStore,
  type WebullTokenStore,
} from "@/lib/marketData/webullAccessToken";

const DEFAULT_HOST = "api.webull.com";
/** One owner for Webull paths — see webullSdkContract.ts for why that is a rule. */
const ACCOUNT_LIST_PATH = WEBULL_SDK_CONTRACT.ACCOUNT_LIST.path;

export interface WebullBrokerConfig {
  readonly appKey?: string;
  readonly appSecret?: string;
  /**
   * A hand-supplied session, if one is still configured. Kept only as a
   * fallback for the case where minting is unavailable — it is NOT the
   * intended source. See `webullAccessToken.ts`: this value expires, and
   * treating it as a permanent secret is the defect that cost three months.
   */
  readonly accessToken?: string;
  readonly apiHost?: string;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
  readonly nonce?: () => string;
  /**
   * Where the minted session lives between requests. Defaults to an
   * isolate-local store: correct within one Worker isolate, and the reason a
   * durable store (KV / Durable Object) is the next wiring step rather than a
   * nice-to-have.
   */
  readonly tokenStore?: WebullTokenStore;
  /** Escape hatch for tests that want no minting attempted at all. */
  readonly mintSession?: boolean;
}

/**
 * One store per runtime, so repeated probes inside an isolate reuse a session
 * instead of restarting the 2FA cycle on every request.
 */
const defaultTokenStore = inMemoryTokenStore();

export type WebullBrokerConnectionState =
  | "CONNECTED"
  | "UNCONFIGURED"
  | "BLOCKED_AUTH"
  | "ACCESS_UNPROVEN"
  | "NO_ACCOUNTS"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "TIMEOUT"
  | "UNAVAILABLE";

export interface WebullBrokerConnectionReceipt {
  readonly provider: "webull";
  readonly state: WebullBrokerConnectionState;
  readonly configured: boolean;
  readonly connected: boolean;
  readonly accountCount: number;
  /** Provider-declared account types only. Account IDs never leave the server. */
  readonly accountTypes: readonly string[];
  readonly checkedAt: string;
  readonly note: string;
}

export function webullBrokerConfigFromEnv(env: Readonly<Record<string, string | undefined>>): WebullBrokerConfig {
  return {
    appKey: env.WEBULL_APP_KEY || env.WEBULL_API_KEY || undefined,
    appSecret: env.WEBULL_APP_SECRET || env.WEBULL_API_SECRET || undefined,
    accessToken: env.WEBULL_ACCESS_TOKEN || undefined,
    apiHost: env.WEBULL_API_HOST || undefined,
  };
}

function cleanHost(host: string | undefined): string {
  return (host || DEFAULT_HOST).replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

interface ParsedAccounts {
  readonly accounts: readonly Record<string, unknown>[];
  readonly rawCount: number;
}

function parseAccounts(payload: unknown): ParsedAccounts | null {
  const validate = (rows: readonly unknown[]): ParsedAccounts => ({
    rawCount: rows.length,
    accounts: rows.filter((row): row is Record<string, unknown> => {
      if (!row || typeof row !== "object") return false;
      const account = row as Record<string, unknown>;
      const id = account.account_id ?? account.accountId;
      return typeof id === "string" && id.trim().length > 0;
    }),
  });
  if (Array.isArray(payload)) return validate(payload);
  if (!payload || typeof payload !== "object") return null;
  const envelope = payload as { data?: unknown; result?: unknown };
  const rows = Array.isArray(envelope.data) ? envelope.data : Array.isArray(envelope.result) ? envelope.result : null;
  return rows ? validate(rows) : null;
}

/**
 * Proves only signed read access to Webull accounts. It does not prove order
 * preview, placement, cancellation, fills, or options permissions.
 */
export async function probeWebullBrokerConnection(
  fetchImpl: typeof fetch,
  config: WebullBrokerConfig = {},
): Promise<WebullBrokerConnectionReceipt> {
  const appKey = config.appKey?.trim();
  const appSecret = config.appSecret?.trim();
  const accessToken = config.accessToken?.trim();
  const checkedAt = isoSeconds((config.now || (() => new Date()))());
  const configured = Boolean(appKey && appSecret);
  const receipt = (
    state: WebullBrokerConnectionState,
    note: string,
    accountCount = 0,
    accountTypes: readonly string[] = [],
  ): WebullBrokerConnectionReceipt => ({
    provider: "webull",
    state,
    configured,
    connected: state === "CONNECTED",
    accountCount,
    accountTypes,
    checkedAt,
    note,
  });

  if (!appKey || !appSecret) {
    return receipt("UNCONFIGURED", "The Webull Trading API credential pair is not configured together in this runtime.");
  }

  const host = cleanHost(config.apiHost);

  /**
   * Get a LIVING session before signing anything.
   *
   * The old code read `WEBULL_ACCESS_TOKEN` out of the environment and sent
   * whatever was there. Webull's token carries an expiry and a 2FA status, so
   * that value goes stale on its own, and every rung then answers 401 —
   * including `/trading/accounts/list`, which needs no market data at all.
   * Minting here is what stops the re-paste loop.
   */
  let sessionToken = accessToken;
  let sessionNote = "";
  if (config.mintSession !== false) {
    const session = await ensureWebullAccessToken(
      fetchImpl,
      { appKey, appSecret, apiHost: host, timeoutMs: config.timeoutMs, now: config.now, nonce: config.nonce },
      config.tokenStore ?? defaultTokenStore,
    );
    sessionNote = session.note;
    if (session.disposition === TOKEN_DISPOSITIONS.AWAITING_2FA) {
      // Sending this would earn a 401 and we would report a credential fault
      // for what is actually one tap in the Webull app. Say the true thing.
      return receipt("BLOCKED_AUTH", session.note);
    }
    if (session.token?.token) sessionToken = session.token.token;
  }

  const nonce = (config.nonce || (() => randomUUID().replace(/-/g, "")))();
  const headers = buildWebullSignedHeaders({
    path: ACCOUNT_LIST_PATH,
    query: {},
    appKey,
    appSecret,
    host,
    timestamp: checkedAt,
    nonce,
    apiVersion: "v2",
    profile: "legacy-sha1",
  });
  if (sessionToken) headers["x-access-token"] = sessionToken;

  const controller = new AbortController();
  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 8_000));
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("Webull account deadline exceeded"));
    }, timeoutMs);
  });
  try {
  let response: Response;
  try {
    response = await Promise.race([fetchImpl(`https://${host}${ACCOUNT_LIST_PATH}`, {
      method: "GET",
      // Signed credentials belong to this exact endpoint, never a redirect target.
      redirect: "manual",
      cache: "no-store",
      headers,
      signal: controller.signal,
    }), deadline]);
  } catch {
    return controller.signal.aborted
      ? receipt("TIMEOUT", `Webull Trading API did not respond within ${timeoutMs} ms.`)
      : receipt("UNAVAILABLE", "Webull Trading API could not be reached.");
  }

  if (response.status === 401) {
    // A 401 on the ACCOUNT lane says nothing about a market-data package —
    // this endpoint needs none. Report the session we actually sent, because
    // "verify your key pair" is the sentence that sent the Founder shopping
    // for a subscription he already owned.
    return receipt(
      "BLOCKED_AUTH",
      sessionNote
        ? `Webull rejected the signed account request with HTTP 401. ${sessionNote}`
        : "Webull rejected the signed account request with HTTP 401, and WM Pro minted no session for it to reject.",
    );
  }
  if (response.status === 403 || response.status === 417) {
    return receipt("ACCESS_UNPROVEN", `Webull rejected the signed account request with HTTP ${response.status}; the failed permission or business-rule edge was not proven.`);
  }
  if (response.status === 429) {
    return receipt("RATE_LIMITED", "Webull rate-limited the bounded account check.");
  }
  if (response.status >= 500) {
    return receipt("PROVIDER_ERROR", `Webull Trading API returned HTTP ${response.status} before account access could be proven.`);
  }
  if (!response.ok) {
    return receipt("UNAVAILABLE", `Webull Trading API returned HTTP ${response.status}; account access was not proven.`);
  }

  let payload: unknown;
  try {
    payload = await Promise.race([response.json(), deadline]);
  } catch {
    return controller.signal.aborted
      ? receipt("TIMEOUT", `Webull account response did not complete within ${timeoutMs} ms.`)
      : receipt("PROVIDER_ERROR", "Webull returned an unreadable account-list response.");
  }
  const parsed = parseAccounts(payload);
  if (!parsed) {
    return receipt("PROVIDER_ERROR", "Webull returned an unrecognized account-list envelope.");
  }
  const accounts = parsed.accounts;
  if (accounts.length !== parsed.rawCount) {
    return receipt("PROVIDER_ERROR", "Webull returned an incomplete or malformed account list; account access and count were not accepted.");
  }
  if (accounts.length === 0) {
    return receipt("NO_ACCOUNTS", "Webull accepted the signed request but returned no accounts available to OpenAPI.");
  }
  const accountTypes = [...new Set(accounts.flatMap((account) => {
    const value = account.account_type ?? account.account_class;
    return typeof value === "string" && value.trim() ? [value.trim().toUpperCase()] : [];
  }))];
  return receipt(
    "CONNECTED",
    "Signed read access to the Webull account list is proven. Order preview and execution remain separately gated.",
    accounts.length,
    accountTypes,
  );
  } finally {
    clearTimeout(timeout!);
  }
}
