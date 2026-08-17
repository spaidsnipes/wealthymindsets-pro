import {
  OPERATIONAL_GAP_SCHEMA_VERSION,
  type OperationalGapAction,
  type OperationalGapReason,
} from "./operationalGapContract";
import type { MarketAssetClass, MarketEventCapability, MarketProviderPath } from "./capabilityRegistry";
import {
  recordSessionNectarOperationalGap,
  recoverSessionNectarOperationalGap,
} from "./sessionNectar";

const OPEN_GAPS = new Set<string>();
const HEALTHY_PROBES = new Set<string>();
const PENDING_OPENS = new Map<string, Promise<boolean>>();
const PENDING_CLOSES = new Map<string, Promise<boolean>>();

function gapKey(instrumentId: string, providerPath: MarketProviderPath, assetClass: MarketAssetClass, channel: MarketEventCapability, reasonCode: OperationalGapReason) {
  return `${instrumentId.toUpperCase()}|${providerPath}|${assetClass}|${channel}|${reasonCode}`;
}

async function persistGap(
  action: OperationalGapAction,
  instrumentId: string,
  providerPath: MarketProviderPath,
  assetClass: MarketAssetClass,
  channel: MarketEventCapability,
  reasonCode: OperationalGapReason,
  occurredAt: number,
  retryAfterMs: number | null,
  detail: string,
) : Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/market-memory/gaps", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        schemaVersion: OPERATIONAL_GAP_SCHEMA_VERSION,
        action,
        instrumentId,
        normalizedSymbol: instrumentId.toUpperCase(),
        providerPath,
        assetClass,
        channel,
        reasonCode,
        occurredAt,
        retryAfterMs,
        detail,
      }),
    });
    return response.ok;
  } catch {
    // Collection keeps running. Failure to persist is never converted into a
    // false claim that the gap was saved.
    return false;
  }
}

export async function openProviderOperationalGap(
  instrumentId: string,
  providerPath: MarketProviderPath,
  assetClass: MarketAssetClass,
  channel: MarketEventCapability,
  reasonCode: OperationalGapReason,
  occurredAt: number,
  retryAfterMs: number | null,
  detail: string,
) : Promise<boolean> {
  recordSessionNectarOperationalGap(
    instrumentId, instrumentId, providerPath, assetClass, channel, occurredAt, detail,
  );
  const key = gapKey(instrumentId, providerPath, assetClass, channel, reasonCode);
  HEALTHY_PROBES.delete(key);
  if (OPEN_GAPS.has(key)) return true;
  const pending = PENDING_OPENS.get(key);
  if (pending) return pending;
  const request = persistGap(
    "OPEN", instrumentId, providerPath, assetClass, channel, reasonCode,
    occurredAt, retryAfterMs, detail,
  ).then(saved => {
    if (saved) OPEN_GAPS.add(key);
    return saved;
  }).finally(() => PENDING_OPENS.delete(key));
  PENDING_OPENS.set(key, request);
  return request;
}

export async function closeProviderOperationalGap(
  instrumentId: string,
  providerPath: MarketProviderPath,
  assetClass: MarketAssetClass,
  channel: MarketEventCapability,
  reasonCode: OperationalGapReason,
  occurredAt: number,
) : Promise<boolean> {
  const key = gapKey(instrumentId, providerPath, assetClass, channel, reasonCode);
  recoverSessionNectarOperationalGap(instrumentId, providerPath, channel, occurredAt);
  // Probe once per page lifecycle even without a local OPEN: this closes an
  // open durable gap after reload/reconnect.
  if (!OPEN_GAPS.has(key) && HEALTHY_PROBES.has(key)) return true;
  const pending = PENDING_CLOSES.get(key);
  if (pending) return pending;
  const request = (PENDING_OPENS.get(key) ?? Promise.resolve(true)).then(() => persistGap(
    "CLOSE", instrumentId, providerPath, assetClass, channel, reasonCode,
    occurredAt, null, "A healthy provider observation arrived after the operational gap.",
  )).then(saved => {
    if (saved) {
      OPEN_GAPS.delete(key);
      HEALTHY_PROBES.add(key);
    }
    return saved;
  }).finally(() => PENDING_CLOSES.delete(key));
  PENDING_CLOSES.set(key, request);
  return request;
}

export function clearOperationalGapReporterForTests() {
  OPEN_GAPS.clear();
  HEALTHY_PROBES.clear();
  PENDING_OPENS.clear();
  PENDING_CLOSES.clear();
}
