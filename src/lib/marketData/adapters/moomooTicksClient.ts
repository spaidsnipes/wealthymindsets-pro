/**
 * moomooTicksClient — the app-side runtime transport that calls the moomoo-bridge
 * `/ticks` route, then hands the outcome to the honest classifier + canonical
 * normalizer. This is the "Worker/runtime adapter" edge of the Monday Test 2
 * Moomoo chain:
 *
 *   bridge /ticks ──▶ probeMoomooTicks (fetch) ──▶ classify + normalize ──▶ route
 *
 * SECRET DISCIPLINE: this module reads the bearer token to authenticate the
 * request but NEVER logs, returns, or embeds its value. Config is passed in by
 * NAME-resolved value from the caller (the route reads process.env); nothing here
 * prints a secret.
 *
 * TRUTHFUL MODE: the moomoo bridge does not certify realtime-vs-delayed
 * entitlement, so this client refuses to assert LIVE. It defaults dataMode to
 * "DELAYED" — the least-overclaiming member of the canonical enum (it does not
 * promise a realtime feed). A future certification path may pass an explicit mode.
 *
 * Deterministic given the injected fetch. No module-level I/O.
 */

import {
  classifyMoomooTicksOutcome,
  type MoomooTicksProbeInput,
  type MoomooTicksWireStatus,
} from "./moomooTicksWireStatus";
import {
  normalizeMoomooTicksEnvelope,
  type MoomooTicksEnvelope,
} from "./moomooTicks";
import type { CanonicalMarketEvent, MarketDataMode } from "../marketEvent";

export type FetchLike = typeof fetch;

export interface MoomooTicksClientConfig {
  /** Bridge base URL, e.g. https://moomoo-bridge.internal (MOOMOO_BRIDGE_URL). */
  readonly bridgeUrl?: string;
  /** Shared bearer secret (MOOMOO_BRIDGE_TOKEN) — used, never returned/logged. */
  readonly bridgeToken?: string;
  /** Bound bridge latency so a dead OpenD host cannot stall the app route. */
  readonly timeoutMs?: number;
}

export interface ReadMoomooTicksParams {
  /** Exact moomoo market code sent to the bridge, e.g. "US.TSLA" / "HK.00700". */
  readonly providerCode: string;
  /** The app-facing symbol used for the canonical event, e.g. "TSLA". */
  readonly appSymbol: string;
  /** Requested print count (bridge clamps 1..1000). */
  readonly num?: number;
  /** Canonical mode; defaults to DELAYED because realtime is not certified here. */
  readonly dataMode?: MarketDataMode;
}

export interface ReadMoomooTicksResult {
  readonly status: MoomooTicksWireStatus;
  readonly events: readonly CanonicalMarketEvent[];
}

const cleanBase = (url: string | undefined): string => (url ?? "").replace(/\/+$/, "");

/**
 * Perform the authenticated bridge /ticks request and describe how it resolved,
 * WITHOUT interpreting it (interpretation is the classifier's job). Never throws
 * — a transport failure becomes a truthful `transportReached: false` outcome.
 */
export async function probeMoomooTicks(
  fetchImpl: FetchLike,
  config: MoomooTicksClientConfig,
  providerCode: string,
  num = 100,
): Promise<MoomooTicksProbeInput> {
  const base = cleanBase(config.bridgeUrl);
  // Both the host AND the shared secret are required to even attempt an
  // authenticated /ticks call. A missing var is NOT CONFIGURED, never entitlement.
  if (!base || !config.bridgeToken) {
    return { configured: false, transportReached: false };
  }

  const clampedNum = Math.max(1, Math.min(1000, Math.trunc(num) || 100));
  const url = `${base}/ticks?symbols=${encodeURIComponent(providerCode)}&num=${clampedNum}`;
  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 5_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.bridgeToken}` },
      cache: "no-store",
      signal: controller.signal,
    });
    let body: MoomooTicksEnvelope | undefined;
    try {
      body = (await res.json()) as MoomooTicksEnvelope;
    } catch {
      body = undefined; // non-JSON body → classifier will name it truthfully
    }
    return { configured: true, transportReached: true, httpStatus: res.status, body };
  } catch (err) {
    return {
      configured: true,
      transportReached: false,
      transportError: controller.signal.aborted
        ? `Bridge read timed out after ${timeoutMs} ms.`
        : err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Full read: transport → honest wire label → canonical events. `events` is
 * non-empty only when real executed prints normalized (label RECEIVING).
 */
export async function readMoomooTicks(
  fetchImpl: FetchLike,
  config: MoomooTicksClientConfig,
  params: ReadMoomooTicksParams,
  receivedAtMs = Date.now(),
  processedAtMs = Date.now(),
): Promise<ReadMoomooTicksResult> {
  const dataMode: MarketDataMode = params.dataMode ?? "DELAYED";
  const input = await probeMoomooTicks(fetchImpl, config, params.providerCode, params.num);
  const status = classifyMoomooTicksOutcome(
    input,
    params.appSymbol,
    dataMode,
    receivedAtMs,
    processedAtMs,
  );
  const events =
    status.receiving && input.body
      ? normalizeMoomooTicksEnvelope(input.body, params.appSymbol, dataMode, receivedAtMs, processedAtMs)
      : [];
  return { status, events };
}
