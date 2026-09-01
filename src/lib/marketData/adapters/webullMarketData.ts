/** Webull read-only market-data certification via its signed Data API. */
import { createHash, createHmac, randomUUID } from "crypto";
import { certifySource, type SourceCapabilityReport, type SourceCertification } from "../sourceCapabilityCertification";

const DEFAULT_HOST = "api.webull.com";
const STOCK_TICKS_PATH = "/market-data/stocks/ticks/list";

export interface WebullDataConfig {
  readonly dataUrl?: string;
  readonly appKey?: string;
  readonly appSecret?: string;
  /** Active Webull OpenAPI token required only when the account has 2FA enabled. */
  readonly accessToken?: string;
  readonly apiHost?: string;
  readonly canarySymbol?: string;
  readonly now?: () => Date;
  readonly nonce?: () => string;
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
  readonly state: "OBSERVED" | "UNCONFIGURED" | "BLOCKED_AUTH" | "UNAVAILABLE";
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

export function parseWebullTickEnvelope(payload: unknown, expectedSymbol: string): readonly WebullTickObservation[] {
  if (!payload || typeof payload !== "object") return [];
  const envelope = payload as { symbol?: unknown; result?: unknown };
  const symbol = typeof envelope.symbol === "string" ? envelope.symbol.toUpperCase() : "";
  if (symbol !== expectedSymbol.toUpperCase() || !Array.isArray(envelope.result)) return [];

  return envelope.result.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    const price = Number(row.price);
    const volume = Number(row.volume);
    const observedAtMs = Number(row.time);
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
    // Webull requires this header only when OpenAPI 2FA is enabled. It is not
    // one of the signing headers, so it must not alter the HMAC input.
    if (accessToken) headers["x-access-token"] = accessToken;

    response = await fetchImpl(url, {
      method: "GET",
      cache: "no-store",
      headers,
    });
  } catch {
    return unavailable("UNAVAILABLE", "Webull Data API could not be reached; no tick observation was returned.");
  }
  if (!response.ok) {
    if (response.status === 401) {
      return unavailable(
        "BLOCKED_AUTH",
        "Webull Data API returned HTTP 401. Credentials, signature, timestamp, or the optional 2FA access token may be invalid or missing; no tick observation was returned.",
      );
    }
    if (response.status === 403) {
      return unavailable(
        "UNAVAILABLE",
        "Webull Data API returned HTTP 403. Access was denied, but the failed edge (authorization, subscription, entitlement, or policy) was not proven; no tick observation was returned.",
      );
    }
    return unavailable("UNAVAILABLE", `Webull Data API returned HTTP ${response.status}; no tick observation was returned.`);
  }

  const ticks = parseWebullTickEnvelope(await response.json().catch(() => null), symbol);
  if (ticks.length === 0) {
    return unavailable("UNAVAILABLE", "Webull Data API returned no valid, symbol-matched tick observations.");
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
      status: snapshot.state === "BLOCKED_AUTH" ? "BLOCKED_AUTH" : "NOT_IMPLEMENTED",
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
