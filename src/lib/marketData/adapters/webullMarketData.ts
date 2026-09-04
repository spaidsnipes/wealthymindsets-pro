/** Webull read-only market-data certification via its signed Data API. */
import { createHash, createHmac, randomUUID } from "crypto";
import { certifySource, type SourceCapabilityReport, type SourceCertification } from "../sourceCapabilityCertification";

const DEFAULT_HOST = "api.webull.com";
// Webull's current official SDK request contract. The older
// `/market-data/stocks/ticks/list` path returns an access-looking failure even
// when the same provider account can read stock ticks through the SDK.
const STOCK_TICKS_PATH = "/openapi/market-data/stock/tick";

export interface WebullDataConfig {
  readonly dataUrl?: string;
  readonly appKey?: string;
  readonly appSecret?: string;
  /** Optional account token. Its necessity cannot be inferred from a Data API 401. */
  readonly accessToken?: string;
  readonly apiHost?: string;
  readonly canarySymbol?: string;
  readonly maxTickAgeMs?: number;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
  readonly nonce?: () => string;
}

/** Resolve canonical Webull OpenAPI names while preserving WM's older aliases. */
export function webullDataConfigFromEnv(env: Readonly<Record<string, string | undefined>>): WebullDataConfig {
  return {
    appKey: env.WEBULL_APP_KEY || env.WEBULL_API_KEY || undefined,
    appSecret: env.WEBULL_APP_SECRET || env.WEBULL_API_SECRET || undefined,
    accessToken: env.WEBULL_ACCESS_TOKEN || undefined,
    apiHost: env.WEBULL_API_HOST || undefined,
    canarySymbol: env.WEBULL_CANARY_SYMBOL || undefined,
    dataUrl: env.WEBULL_DATA_URL || undefined,
  };
}

export interface WebullTickObservation {
  readonly symbol: string;
  readonly price: number;
  readonly volume: number;
  readonly observedAtMs: number;
  readonly side: "BUY" | "SELL" | "UNKNOWN";
  readonly tradingSession?: string;
}

export interface WebullTickSnapshotResult {
  readonly source: "webull";
  readonly state:
    | "OBSERVED"
    | "UNCONFIGURED"
    | "BLOCKED_AUTH"
    | "BLOCKED_ENTITLEMENT"
    | "ACCESS_UNPROVEN"
    | "RATE_LIMITED"
    | "PROVIDER_ERROR"
    | "NO_EVENTS"
    | "STALE"
    | "CLOCK_INVALID"
    | "TIMEOUT"
    | "UNAVAILABLE";
  readonly fidelity: "SNAPSHOT" | "NONE";
  readonly symbol: string;
  readonly requestedAt: string;
  readonly ticks: readonly WebullTickObservation[];
  readonly note: string;
}

function cleanHost(host: string | undefined): string {
  return (host || DEFAULT_HOST).replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Webull signature algorithm 1.0, exported for deterministic vector tests. */
export function signWebullRequest(input: {
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly appKey: string;
  readonly appSecret: string;
  readonly host: string;
  readonly timestamp: string;
  readonly nonce: string;
  readonly body?: string;
}): string {
  const fields: Record<string, string> = {
    ...input.query,
    host: input.host,
    "x-app-key": input.appKey,
    "x-signature-algorithm": "HMAC-SHA1",
    "x-signature-nonce": input.nonce,
    "x-signature-version": "1.0",
    "x-timestamp": input.timestamp,
  };
  const canonical = Object.keys(fields).sort().map((key) => `${key}=${fields[key]}`).join("&");
  const bodyDigest = input.body
    ? `&${createHash("md5").update(input.body).digest("hex").toUpperCase()}`
    : "";
  const encoded = encodeURIComponent(`${input.path}&${canonical}${bodyDigest}`);
  return createHmac("sha1", `${input.appSecret}&`).update(encoded).digest("base64");
}

function parseSide(value: unknown): WebullTickObservation["side"] {
  const side = typeof value === "string" ? value.toUpperCase() : "";
  if (side === "B" || side === "BUY") return "BUY";
  if (side === "S" || side === "SELL") return "SELL";
  return "UNKNOWN";
}

function providerNumber(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") return NaN;
  const text = String(value).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return NaN;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function parseWebullTickEnvelope(payload: unknown, expectedSymbol: string): readonly WebullTickObservation[] {
  if (!payload || typeof payload !== "object") return [];
  const envelope = payload as { symbol?: unknown; result?: unknown };
  const symbol = typeof envelope.symbol === "string" ? envelope.symbol.toUpperCase() : "";
  if (symbol !== expectedSymbol.toUpperCase() || !Array.isArray(envelope.result)) return [];

  return envelope.result.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    const price = providerNumber(row.price);
    const volume = providerNumber(row.volume);
    const observedAtMs = providerNumber(row.time);
    const plausibleMilliseconds = observedAtMs >= Date.UTC(2000, 0, 1) && observedAtMs <= 8_640_000_000_000_000;
    if (!(price > 0) || !(volume > 0) || !Number.isFinite(observedAtMs) || !plausibleMilliseconds) return [];
    return [{
      symbol,
      price,
      volume,
      observedAtMs,
      side: parseSide(row.side),
      tradingSession: typeof row.trading_session === "string" ? row.trading_session : undefined,
    } satisfies WebullTickObservation];
  });
}

function zeroState(note: string): SourceCertification {
  return certifySource("webull", [{
    capability: "PRICE",
    status: "NOT_IMPLEMENTED",
    fidelity: "NONE",
    note,
    observedAt: new Date().toISOString(),
  }]);
}

async function readWebullErrorCode(response: Response): Promise<string | null> {
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") return null;
  const providerError = payload as { code?: unknown; errorCode?: unknown; error_code?: unknown };
  const code = providerError.code ?? providerError.errorCode ?? providerError.error_code;
  return typeof code === "string" ? code.trim().toUpperCase() : null;
}

/** Execute one bounded, signed, read-only stock-tick request. */
export async function fetchWebullTickSnapshot(
  fetchImpl: typeof fetch,
  config: WebullDataConfig = {},
): Promise<WebullTickSnapshotResult> {
  const appKey = config.appKey?.trim();
  const appSecret = config.appSecret?.trim();
  const accessToken = config.accessToken?.trim();
  const symbol = (config.canarySymbol || "TSLA").trim().toUpperCase();
  const now = config.now || (() => new Date());
  const timestamp = isoSeconds(now());
  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 8_000));
  const unavailable = (
    state: WebullTickSnapshotResult["state"],
    note: string,
  ): WebullTickSnapshotResult => ({ source: "webull", state, fidelity: "NONE", symbol, requestedAt: timestamp, ticks: [], note });

  if (!appKey || !appSecret) {
    return unavailable("UNCONFIGURED", "Webull Data API credentials are not configured together in this runtime.");
  }

  const host = cleanHost(config.apiHost);
  const nonce = (config.nonce || (() => randomUUID().replace(/-/g, "")))();
  const query = { category: "US_STOCK", count: "5", symbol, trading_sessions: "PRE,RTH,ATH,OVN" };
  const signature = signWebullRequest({ path: STOCK_TICKS_PATH, query, appKey, appSecret, host, timestamp, nonce });
  const url = new URL(`https://${host}${STOCK_TICKS_PATH}`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("Webull tick deadline exceeded"));
    }, timeoutMs);
  });
  // One deadline covers headers and either the success or error body.
  try {
  let response: Response;
  try {
    const headers: Record<string, string> = {
      "x-app-key": appKey,
      "x-timestamp": timestamp,
      "x-signature": signature,
      "x-signature-algorithm": "HMAC-SHA1",
      "x-signature-version": "1.0",
      "x-signature-nonce": nonce,
      "x-version": "v2",
    };
    // Preserve an explicitly configured token without making it part of the
    // HMAC. A Data API 401 alone does not prove that this token was required.
    if (accessToken) headers["x-access-token"] = accessToken;

    response = await Promise.race([fetchImpl(url, {
      method: "GET",
      // Do not forward signed credentials or an optional token to redirects.
      redirect: "manual",
      cache: "no-store",
      headers,
      signal: controller.signal,
    }), deadline]);
  } catch {
    if (controller.signal.aborted) {
      return unavailable("TIMEOUT", `Webull Data API did not respond within ${timeoutMs} ms; no tick observation was returned.`);
    }
    return unavailable("UNAVAILABLE", "Webull Data API could not be reached; no tick observation was returned.");
  }
  if (!response.ok) {
    if (response.status === 401) {
      return unavailable(
        "BLOCKED_AUTH",
        accessToken
          ? "Webull Data API returned HTTP 401 with an optional account token configured. The rejected edge may be the App Key/Secret, request signature, token, API host, or environment; the provider did not identify which one. No tick observation was returned."
          : "Webull Data API returned HTTP 401 for the signed market-data request. Verify the App Key/Secret, request signature, API host, and environment. A trading/account token requirement was not proven by this response. No tick observation was returned.",
      );
    }
    if (response.status === 403) {
      const providerCode = await Promise.race([readWebullErrorCode(response), deadline]);
      if (providerCode === "MARKET_DATA_NOT_SUBSCRIBED") {
        return unavailable(
          "BLOCKED_ENTITLEMENT",
          "Webull proved MARKET_DATA_NOT_SUBSCRIBED for this account. Real tick data is unavailable until the required Webull market-data subscription is active; no tick observation was returned.",
        );
      }
      return unavailable(
        "ACCESS_UNPROVEN",
        "Webull Data API returned HTTP 403. Access was denied, but the failed edge (authorization, subscription, entitlement, or policy) was not proven; no tick observation was returned.",
      );
    }
    if (response.status === 429) {
      return unavailable("RATE_LIMITED", "Webull Data API returned HTTP 429. The bounded read was rate limited; no tick observation was returned.");
    }
    if (response.status >= 500) {
      return unavailable("PROVIDER_ERROR", `Webull Data API returned HTTP ${response.status}. The provider failed before a tick observation was returned.`);
    }
    return unavailable("UNAVAILABLE", `Webull Data API returned HTTP ${response.status}; no tick observation was returned.`);
  }

  const payload = await Promise.race([response.json().catch(() => null), deadline]);
  const envelope = payload && typeof payload === "object"
    ? payload as { symbol?: unknown; result?: unknown }
    : null;
  if (!envelope || typeof envelope.symbol !== "string" || envelope.symbol.toUpperCase() !== symbol || !Array.isArray(envelope.result)) {
    return unavailable("PROVIDER_ERROR", "Webull Data API returned an unrecognized or symbol-mismatched tick envelope; no tick observation was accepted.");
  }
  const ticks = parseWebullTickEnvelope(payload, symbol);
  if (ticks.length === 0) {
    return unavailable("NO_EVENTS", "Webull Data API returned no valid, symbol-matched tick observations.");
  }
  const newest = Math.max(...ticks.map((tick) => tick.observedAtMs));
  const maxTickAgeMs = Math.max(1_000, config.maxTickAgeMs ?? 60_000);
  const tickAgeMs = now().getTime() - newest;
  if (tickAgeMs < -5_000) {
    return unavailable("CLOCK_INVALID", `Webull Data API returned a provider timestamp ${Math.abs(tickAgeMs)} ms in the future; the print was not exposed as current.`);
  }
  if (tickAgeMs > maxTickAgeMs) {
    return unavailable("STALE", `Webull Data API returned symbol-matched prints, but the newest provider timestamp was ${tickAgeMs} ms old; stale prints were not exposed as current.`);
  }
  return {
    source: "webull",
    state: "OBSERVED",
    fidelity: "SNAPSHOT",
    symbol,
    requestedAt: timestamp,
    ticks,
    note: "Bounded on-demand stock prints; this is not a streaming, futures, or broker-execution connection.",
  };
  } catch {
    return controller.signal.aborted
      ? unavailable("TIMEOUT", `Webull tick response did not complete within ${timeoutMs} ms; no tick observation was accepted.`)
      : unavailable("PROVIDER_ERROR", "Webull tick response could not be read; no tick observation was accepted.");
  } finally {
    clearTimeout(timeout!);
  }
}

/**
 * Probe one stock symbol. On-demand ticks prove SNAPSHOT fidelity only: they do
 * not certify MQTT streaming, futures, brokerage execution, or side when the
 * provider reports N/unknown.
 */
export async function probeWebullMarketData(fetchImpl: typeof fetch, config: WebullDataConfig = {}): Promise<SourceCertification> {
  const appKey = config.appKey?.trim();
  const appSecret = config.appSecret?.trim();
  const dataUrl = (config.dataUrl ?? "").replace(/\/+$/, "");
  if (!appKey || !appSecret) {
    if (dataUrl) return zeroState(`Webull data bridge configured (${dataUrl}) but its response envelope is not yet verified in this adapter — refusing to claim capabilities from an unproven transport.`);
    return zeroState("Webull provider reads are available out-of-band, but runtime Data API credentials are not configured together. No runtime capability is claimed.");
  }

  const now = config.now || (() => new Date());
  const snapshot = await fetchWebullTickSnapshot(fetchImpl, config);
  if (snapshot.state !== "OBSERVED") {
    return certifySource("webull", [{
      capability: "TICKS",
      status: snapshot.state === "BLOCKED_AUTH"
        ? "BLOCKED_AUTH"
        : snapshot.state === "BLOCKED_ENTITLEMENT"
          ? "BLOCKED_ENTITLEMENT"
          : "NOT_IMPLEMENTED",
      fidelity: "NONE",
      note: snapshot.note,
      observedAt: snapshot.requestedAt,
    }]);
  }

  const ticks = snapshot.ticks;
  const symbol = snapshot.symbol;
  const newest = Math.max(...ticks.map((tick) => tick.observedAtMs));
  const stalenessMs = Math.max(0, now().getTime() - newest);
  const observedAt = new Date(newest).toISOString();
  const reports: SourceCapabilityReport[] = [
    { capability: "PRICE", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT", stalenessMs, observedAt, note: `Latest price observed in a bounded ${symbol} stock-tick canary; not a streaming connection.` },
    { capability: "TICKS", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT", stalenessMs, observedAt, note: `${ticks.length} symbol-matched recent trade prints observed on demand; MQTT streaming is not certified.` },
    { capability: "EXECUTED_VOLUME", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT", stalenessMs, observedAt, note: "Positive per-print executed sizes were present in the bounded tick response." },
  ];
  if (ticks.every((tick) => tick.side !== "UNKNOWN")) {
    reports.push({ capability: "AGGRESSOR_SIDE", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT", stalenessMs, observedAt, note: "Every accepted print carried an explicit provider buy/sell side; streaming continuity remains unproven." });
  }
  return certifySource("webull", reports);
}
