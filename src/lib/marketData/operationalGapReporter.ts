import {
  OPERATIONAL_GAP_SCHEMA_VERSION,
  type OperationalGapAction,
  type OperationalGapReason,
} from "./operationalGapContract";
import type { MarketAssetClass, MarketEventCapability, MarketProviderPath } from "./capabilityRegistry";
import { recordSessionNectarOperationalGap } from "./sessionNectar";

const OPEN_GAPS = new Set<string>();
const HEALTHY_PROBES = new Set<string>();

function gapKey(instrumentId: string, providerPath: MarketProviderPath, assetClass: MarketAssetClass, channel: MarketEventCapability, reasonCode: OperationalGapReason) {
  return `${instrumentId.toUpperCase()}|${providerPath}|${assetClass}|${channel}|${reasonCode}`;
}

function persistGap(
  action: OperationalGapAction,
  instrumentId: string,
  providerPath: MarketProviderPath,
  assetClass: MarketAssetClass,
  channel: MarketEventCapability,
  reasonCode: OperationalGapReason,
  occurredAt: number,
  retryAfterMs: number | null,
  detail: string,
) {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/market-memory/gaps", {
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
  } catch {
    // Collection keeps running. Failure to persist is never converted into a
    // false claim that the gap was saved.
  }
}

export function openProviderOperationalGap(
  instrumentId: string,
  providerPath: MarketProviderPath,
  assetClass: MarketAssetClass,
  channel: MarketEventCapability,
  reasonCode: OperationalGapReason,
  occurredAt: number,
  retryAfterMs: number | null,
  detail: string,
) {
  recordSessionNectarOperationalGap(
    instrumentId, instrumentId, providerPath, assetClass, channel, occurredAt, detail,
  );
  const key = gapKey(instrumentId, providerPath, assetClass, channel, reasonCode);
  HEALTHY_PROBES.delete(key);
  if (OPEN_GAPS.has(key)) return;
  OPEN_GAPS.add(key);
  persistGap("OPEN", instrumentId, providerPath, assetClass, channel, reasonCode, occurredAt, retryAfterMs, detail);
}

export function closeProviderOperationalGap(
  instrumentId: string,
  providerPath: MarketProviderPath,
  assetClass: MarketAssetClass,
  channel: MarketEventCapability,
  reasonCode: OperationalGapReason,
  occurredAt: number,
) {
  const key = gapKey(instrumentId, providerPath, assetClass, channel, reasonCode);
  // Probe once per page lifecycle even without a local OPEN: this closes an
  // open durable gap after reload/reconnect.
  if (!OPEN_GAPS.has(key) && HEALTHY_PROBES.has(key)) return;
  OPEN_GAPS.delete(key);
  HEALTHY_PROBES.add(key);
  persistGap(
    "CLOSE", instrumentId, providerPath, assetClass, channel, reasonCode, occurredAt, null,
    "A healthy provider observation arrived after the operational gap.",
  );
}

export function clearOperationalGapReporterForTests() {
  OPEN_GAPS.clear();
  HEALTHY_PROBES.clear();
}
