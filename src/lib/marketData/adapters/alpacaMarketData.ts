/** Read-only Alpaca IEX snapshot certification for the canonical capability matrix. */
import {
  certifySource,
  type SourceCapabilityReport,
  type SourceCertification,
} from "../sourceCapabilityCertification";

const DATA_BASE = "https://data.alpaca.markets";

export interface AlpacaMarketDataConfig {
  readonly key?: string;
  readonly secret?: string;
  readonly canarySymbol?: string;
  readonly maxTradeAgeMs?: number;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
}

type AlpacaSnapshot = {
  readonly latestTrade?: { readonly p?: unknown; readonly s?: unknown; readonly t?: unknown };
  readonly dailyBar?: { readonly v?: unknown };
};

function zeroState(note: string, status: "NOT_IMPLEMENTED" | "BLOCKED_AUTH" = "NOT_IMPLEMENTED"): SourceCertification {
  return certifySource("alpaca", [{ capability: "PRICE", status, fidelity: "NONE", note }]);
}

/**
 * Certify only what one authenticated, symbol-scoped IEX snapshot proves.
 * Credentials, HTTP success, or a non-empty object alone never become capability evidence.
 */
export async function probeAlpacaMarketData(
  fetchImpl: typeof fetch,
  config: AlpacaMarketDataConfig = {},
): Promise<SourceCertification> {
  const key = config.key?.trim();
  const secret = config.secret?.trim();
  const symbol = (config.canarySymbol || "TSLA").trim().toUpperCase();
  const now = config.now || (() => new Date());
  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 8_000));

  if (!key || !secret) {
    return zeroState("Alpaca live market-data credentials are not configured together in this runtime.");
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetchImpl(
      `${DATA_BASE}/v2/stocks/${encodeURIComponent(symbol)}/snapshot?feed=iex`,
      {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "APCA-API-KEY-ID": key,
          "APCA-API-SECRET-KEY": secret,
        },
      },
    );
  } catch {
    if (controller.signal.aborted) {
      return zeroState(`Alpaca IEX snapshot did not respond within ${timeoutMs} ms; no market observation was returned.`);
    }
    return zeroState("Alpaca IEX snapshot transport was unreachable; no market observation was returned.");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    return zeroState("Alpaca returned HTTP 401 for the read-only IEX snapshot; no market observation was returned.", "BLOCKED_AUTH");
  }
  if (!response.ok) {
    return zeroState(`Alpaca returned HTTP ${response.status}; the failed edge is not proven and no capability is claimed.`);
  }

  const body = await response.json().catch(() => null) as AlpacaSnapshot | null;
  const price = Number(body?.latestTrade?.p);
  const size = Number(body?.latestTrade?.s);
  const timestamp = typeof body?.latestTrade?.t === "string" ? Date.parse(body.latestTrade.t) : Number.NaN;
  if (!(price > 0) || !(size > 0) || !Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now().getTime() + 5 * 60_000) {
    return zeroState("Alpaca IEX snapshot did not contain a valid provider-timestamped trade for the canary symbol.");
  }

  const stalenessMs = Math.max(0, now().getTime() - timestamp);
  const maxTradeAgeMs = Math.max(1_000, config.maxTradeAgeMs ?? 60_000);
  if (stalenessMs > maxTradeAgeMs) {
    return zeroState(`Alpaca returned a valid ${symbol} IEX trade, but its provider timestamp was ${stalenessMs} ms old; stale evidence was not exposed as current.`);
  }
  const observedAt = new Date(timestamp).toISOString();
  const reports: SourceCapabilityReport[] = [
    {
      capability: "PRICE",
      status: "ACTIVE_DEGRADED",
      fidelity: "SNAPSHOT",
      stalenessMs,
      observedAt,
      note: `Symbol-matched ${symbol} IEX trade price observed in a bounded snapshot; consolidated or continuous realtime is not certified.`,
    },
    {
      capability: "TICKS",
      status: "ACTIVE_DEGRADED",
      fidelity: "SNAPSHOT",
      stalenessMs,
      observedAt,
      note: "One provider-timestamped executed trade was observed; relay continuity and reconnect are not certified by this snapshot.",
    },
    {
      capability: "EXECUTED_VOLUME",
      status: "ACTIVE_DEGRADED",
      fidelity: "SNAPSHOT",
      stalenessMs,
      observedAt,
      note: "Positive executed size was present on the observed IEX trade.",
    },
  ];
  return certifySource("alpaca", reports);
}
