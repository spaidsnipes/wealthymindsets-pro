/**
 * DOES THIS WEBULL APP KEY NEED A SESSION TOKEN AT ALL? — ask Webull.
 *
 * ── The question WM Pro never asked ─────────────────────────────────────────
 *
 * The official SDK's first act on every client init is not "create a token".
 * It is `ClientInitializer._check_token_enable`: a signed GET to
 * `/openapi/config`, then `token_config.get("token_check_enabled", False)`.
 * Only when that is true does `TokenManager.init_token` create a token, send
 * the SMS code and wait for it to be typed into the Webull app. When it is
 * false the SDK never creates, checks, stores or sends a token — requests are
 * signed with the App Key and App Secret and nothing else.
 *
 * Webull's documentation says the same thing in plain words:
 *   "Token (Optional) — If Two-Factor Authentication (2FA) is enabled, a
 *    reusable access token verified via the Webull App is also required."
 *   "Clients may optionally enable Two-Factor Authentication (2FA). … If 2FA
 *    is not enabled, you can skip this page."
 * and the switch is the "Enable 2FA Verification" box on the App Key (API Keys
 * Management → Edit).
 *
 * WM Pro assumed the answer was always yes. So every session that died —
 * idle for 15 days, replaced, retired — became a phone prompt for the Founder,
 * and there was no code path by which a key with 2FA switched off could run
 * without one. That is the months-long "keep Webull alive from my phone" loop
 * seen from the other side: the loop was only ever necessary while 2FA is on.
 *
 * ── What this module decides ────────────────────────────────────────────────
 *
 * One reading, three answers, never guessed:
 *   TOKEN_REQUIRED — Webull said `token_check_enabled: true`.
 *   TOKENLESS      — Webull said `token_check_enabled: false`. Sign with the
 *                    key pair only; mint nothing; send no x-access-token.
 *   UNKNOWN        — Webull did not answer, or answered in a shape we cannot
 *                    read. Callers keep today's behaviour (the token path),
 *                    because an unreadable answer is not permission to drop a
 *                    credential Webull may still demand.
 *
 * The SDK treats an ABSENT key as false. This module deliberately does not:
 * a missing field reads UNKNOWN, so a wrapped or renamed response can never
 * silently switch the whole broker lane to unauthenticated requests.
 *
 * Reads no secret itself; the key pair is passed in and only used to sign.
 */

import { WEBULL_SDK_CONTRACT } from "./webullSdkContract";
import { buildWebullSignedHeaders, type WebullSigningProfile } from "./adapters/webullMarketData";

export const WEBULL_AUTH_MODES = {
  TOKEN_REQUIRED: "TOKEN_REQUIRED",
  TOKENLESS: "TOKENLESS",
  UNKNOWN: "UNKNOWN",
} as const;

export type WebullAuthMode = (typeof WEBULL_AUTH_MODES)[keyof typeof WEBULL_AUTH_MODES];

export interface WebullAuthModeReading {
  readonly mode: WebullAuthMode;
  /** Safe to show. Never contains a credential. */
  readonly note: string;
  readonly httpStatus?: number;
  readonly observedAtMs: number;
}

export interface WebullAuthModeConfig {
  readonly appKey: string;
  readonly appSecret: string;
  readonly apiHost?: string;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
  readonly nonce?: () => string;
  readonly signingProfile?: WebullSigningProfile;
}

/**
 * `token_check_enabled`, read strictly. Booleans and 1/0 only — Python's
 * truthiness would read the STRING "false" as true, and guessing either way
 * about a string is how a credential gets dropped or demanded by accident.
 */
export function parseTokenCheckEnabled(payload: unknown): boolean | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>).token_check_enabled;
  if (typeof value === "boolean") return value;
  if (value === 1) return true;
  if (value === 0) return false;
  return null;
}

const DEFAULT_HOST = "api.webull.com";

function cleanHost(host: string | undefined): string {
  return (host || DEFAULT_HOST).replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** One signed GET to `/openapi/config`. Never throws. */
export async function readWebullAuthMode(
  fetchImpl: typeof fetch,
  config: WebullAuthModeConfig,
): Promise<WebullAuthModeReading> {
  const now = config.now || (() => new Date());
  const appKey = config.appKey?.trim();
  const appSecret = config.appSecret?.trim();
  if (!appKey || !appSecret) {
    return {
      mode: WEBULL_AUTH_MODES.UNKNOWN,
      note: "Webull App Key and App Secret are not both configured, so Webull could not be asked whether a session token is required.",
      observedAtMs: now().getTime(),
    };
  }

  const contract = WEBULL_SDK_CONTRACT.APP_CONFIG;
  const host = cleanHost(config.apiHost);
  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 8_000));
  const nonce = (config.nonce || (() => crypto.randomUUID().replace(/-/g, "")))();
  const headers = buildWebullSignedHeaders({
    path: contract.path,
    query: {},
    appKey,
    appSecret,
    host,
    timestamp: isoSeconds(now()),
    nonce,
    apiVersion: contract.apiVersion,
    // The GET profile the account-list rung is proven CONNECTED with.
    profile: config.signingProfile ?? "legacy-sha1",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://${host}${contract.path}`, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers,
      signal: controller.signal,
    });
    const observedAtMs = now().getTime();
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const code = payload && typeof payload === "object"
        ? String((payload as Record<string, unknown>).code ?? "").trim()
        : "";
      return {
        mode: WEBULL_AUTH_MODES.UNKNOWN,
        httpStatus: response.status,
        observedAtMs,
        note: `Webull did not say whether this App Key needs a session token: HTTP ${response.status}${code ? ` (${code})` : ""}. WM Pro keeps using the session token path.`,
      };
    }
    const enabled = parseTokenCheckEnabled(payload);
    if (enabled === null) {
      return {
        mode: WEBULL_AUTH_MODES.UNKNOWN,
        httpStatus: response.status,
        observedAtMs,
        note: "Webull answered /openapi/config without a readable token_check_enabled, so WM Pro keeps using the session token path.",
      };
    }
    return enabled
      ? {
          mode: WEBULL_AUTH_MODES.TOKEN_REQUIRED,
          httpStatus: response.status,
          observedAtMs,
          note: "Webull says 2FA is ON for this App Key: every session needs one SMS code entered in the Webull app, and a session dies after 15 days with no API calls. Unticking \"Enable 2FA Verification\" on the key removes the phone step entirely.",
        }
      : {
          mode: WEBULL_AUTH_MODES.TOKENLESS,
          httpStatus: response.status,
          observedAtMs,
          note: "Webull says 2FA is OFF for this App Key: requests are signed with the App Key and App Secret alone. There is no session to approve, expire or keep alive.",
        };
  } catch {
    return {
      mode: WEBULL_AUTH_MODES.UNKNOWN,
      observedAtMs: now().getTime(),
      note: controller.signal.aborted
        ? `Webull did not answer /openapi/config within ${timeoutMs} ms. WM Pro keeps using the session token path.`
        : "Webull could not be reached to ask whether a session token is required. WM Pro keeps using the session token path.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** How long a definite answer is trusted before Webull is asked again. */
export const AUTH_MODE_TTL_MS = 5 * 60_000;
/** An UNKNOWN answer is retried sooner, but not on every request. */
export const AUTH_MODE_UNKNOWN_TTL_MS = 60_000;

export type WebullAuthModeReader = (
  fetchImpl: typeof fetch,
  config: WebullAuthModeConfig,
) => Promise<WebullAuthModeReading>;

/**
 * A reader that remembers the last answer per App Key for a few minutes.
 *
 * Five minutes is the delay between the Founder unticking the box and WM Pro
 * dropping the token path — short enough to feel immediate, long enough that
 * a busy chart is not one extra signed request per poll.
 */
export function cachedWebullAuthModeReader(
  read: WebullAuthModeReader = readWebullAuthMode,
  ttlMs: number = AUTH_MODE_TTL_MS,
  unknownTtlMs: number = AUTH_MODE_UNKNOWN_TTL_MS,
): WebullAuthModeReader {
  // Keyed by the fetch in use as well as the key pair: production always
  // passes the one global fetch, so the memory is shared there, while each
  // injected fetch (a test, a probe with its own transport) starts clean and
  // cannot inherit an answer another transport received.
  const byFetch = new WeakMap<object, Map<string, { reading: WebullAuthModeReading; untilMs: number }>>();
  return async (fetchImpl, config) => {
    const nowMs = (config.now || (() => new Date()))().getTime();
    const key = `${cleanHost(config.apiHost)}|${config.appKey?.trim() ?? ""}`;
    let held = byFetch.get(fetchImpl);
    if (!held) {
      held = new Map();
      byFetch.set(fetchImpl, held);
    }
    const hit = held.get(key);
    if (hit && nowMs < hit.untilMs) return hit.reading;
    const reading = await read(fetchImpl, config);
    held.set(key, {
      reading,
      untilMs: nowMs + (reading.mode === WEBULL_AUTH_MODES.UNKNOWN ? unknownTtlMs : ttlMs),
    });
    return reading;
  };
}

/** The per-isolate reader every production lane shares. */
export const sharedWebullAuthModeReader: WebullAuthModeReader = cachedWebullAuthModeReader();
