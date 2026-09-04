/** Bounded, read-only proof of the founder's Webull Trading API connection. */
import { randomUUID } from "crypto";
import { signWebullRequest } from "@/lib/marketData/adapters/webullMarketData";

const DEFAULT_HOST = "api.webull.com";
const ACCOUNT_LIST_PATH = "/trading/accounts/list";

export interface WebullBrokerConfig {
  readonly appKey?: string;
  readonly appSecret?: string;
  readonly accessToken?: string;
  readonly apiHost?: string;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
  readonly nonce?: () => string;
}

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
  const nonce = (config.nonce || (() => randomUUID().replace(/-/g, "")))();
  const signature = signWebullRequest({
    path: ACCOUNT_LIST_PATH,
    query: {},
    appKey,
    appSecret,
    host,
    timestamp: checkedAt,
    nonce,
  });
  const headers: Record<string, string> = {
    "x-app-key": appKey,
    "x-timestamp": checkedAt,
    "x-signature": signature,
    "x-signature-algorithm": "HMAC-SHA1",
    "x-signature-version": "1.0",
    "x-signature-nonce": nonce,
    "x-version": "v2",
  };
  if (accessToken) headers["x-access-token"] = accessToken;

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
    return receipt("BLOCKED_AUTH", "Webull rejected the signed account request with HTTP 401. Verify the OpenAPI key pair, environment, and 2FA token requirement.");
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
  if (accounts.length === 0) {
    if (parsed.rawCount > 0) {
      return receipt("PROVIDER_ERROR", "Webull returned account-list rows without a valid account identifier; connection was not accepted.");
    }
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
