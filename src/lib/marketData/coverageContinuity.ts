import {
  MARKET_COVERAGE_SCHEMA_VERSION,
  type MarketChannelCoverage,
} from "./coverageMap";
import { MARKET_DATA_CAPABILITIES } from "./capabilityRegistry";

export const COVERAGE_CONTINUITY_SCHEMA_VERSION = "wm.coverage-continuity.v1" as const;
export const COVERAGE_CONTINUITY_POLICY_ID = "wm.operational-coverage-summary.v1" as const;
export const COVERAGE_CONTINUITY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const COVERAGE_CONTINUITY_MAX_CHANNELS = 100;
/**
 * Founder/canon-approved operational telemetry policy. This authorizes only
 * the bounded fields constructed below. It does not authorize raw/derived
 * market payload retention under any provider's still-UNKNOWN rights policy.
 */
export const COVERAGE_SUMMARY_PERSISTENCE_RIGHT = "ALLOWED" as const;

export interface CoverageContinuityRecord {
  schemaVersion: typeof COVERAGE_CONTINUITY_SCHEMA_VERSION;
  policyId: typeof COVERAGE_CONTINUITY_POLICY_ID;
  savedAt: number;
  expiresAt: number;
  channels: MarketChannelCoverage[];
}

const finitePositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

function safeChannel(value: unknown): MarketChannelCoverage | null {
  if (!value || typeof value !== "object") return null;
  const c = value as Partial<MarketChannelCoverage>;
  if (c.schemaVersion !== MARKET_COVERAGE_SCHEMA_VERSION ||
      typeof c.instrumentId !== "string" || !c.instrumentId.trim() ||
      typeof c.providerPath !== "string" || !c.providerPath.trim() ||
      typeof c.channel !== "string" ||
      !finitePositive(c.observedFrom) || !finitePositive(c.observedThrough) ||
      c.observedThrough < c.observedFrom ||
      !Number.isSafeInteger(c.observedEventCount) || (c.observedEventCount ?? -1) < 0 ||
      !Number.isSafeInteger(c.gapCount) || (c.gapCount ?? -1) < 0) return null;

  const capability = MARKET_DATA_CAPABILITIES.find(entry =>
    entry.providerPath === c.providerPath && entry.eventType === c.channel
  );
  if (!capability || capability.availability === "UNAVAILABLE") return null;
  const observedFrom = c.observedFrom;
  const observedThrough = c.observedThrough;
  const observedEventCount = c.observedEventCount;
  const gapCount = c.gapCount;
  if (!finitePositive(observedFrom) || !finitePositive(observedThrough)) return null;
  if (!Number.isSafeInteger(observedEventCount) || observedEventCount == null || observedEventCount < 0 ||
      !Number.isSafeInteger(gapCount) || gapCount == null || gapCount < 0) return null;

  // Construct an allow-listed object. Never spread untrusted storage back
  // into runtime state: extra payload-like keys must be discarded.
  return {
    schemaVersion: MARKET_COVERAGE_SCHEMA_VERSION,
    instrumentId: c.instrumentId.trim().slice(0, 96),
    normalizedSymbol: typeof c.normalizedSymbol === "string"
      ? c.normalizedSymbol.trim().toUpperCase().slice(0, 32)
      : undefined,
    channel: capability.eventType,
    providerPath: capability.providerPath,
    coverageState: "STALE",
    memoryState: "SUMMARY_ONLY",
    persistenceRight: capability.rawPersistenceRight,
    rightsPolicyId: capability.rightsPolicyId,
    observedFrom,
    observedThrough,
    lastEventAt: finitePositive(c.lastEventAt) ? c.lastEventAt : undefined,
    observedEventCount,
    gapCount,
    lastGapAt: finitePositive(c.lastGapAt) ? c.lastGapAt : undefined,
    fidelity: capability.fidelityClass,
    collectionScope: capability.collectionScope,
    detail: "Browser-local coverage summary restored; no raw market payloads are retained.",
  };
}

function channelKey(channel: MarketChannelCoverage): string {
  return `${channel.instrumentId}|${channel.channel}|${channel.providerPath}`;
}

export function createCoverageContinuityRecord(
  channels: readonly MarketChannelCoverage[],
  now = Date.now(),
): CoverageContinuityRecord {
  if (!finitePositive(now)) throw new Error("Coverage continuity requires a valid timestamp.");
  const eligible = channels
    .filter(channel => channel.observedFrom != null && channel.observedThrough != null)
    .slice(-COVERAGE_CONTINUITY_MAX_CHANNELS)
    .map(channel => safeChannel({ ...channel, memoryState: "SUMMARY_ONLY" }))
    .filter((channel): channel is MarketChannelCoverage => channel != null);
  return {
    schemaVersion: COVERAGE_CONTINUITY_SCHEMA_VERSION,
    policyId: COVERAGE_CONTINUITY_POLICY_ID,
    savedAt: now,
    expiresAt: now + COVERAGE_CONTINUITY_TTL_MS,
    channels: eligible,
  };
}

export function parseCoverageContinuityRecord(raw: string | null, now = Date.now()): CoverageContinuityRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CoverageContinuityRecord>;
    if (value.schemaVersion !== COVERAGE_CONTINUITY_SCHEMA_VERSION ||
        value.policyId !== COVERAGE_CONTINUITY_POLICY_ID ||
        !finitePositive(value.savedAt) || !finitePositive(value.expiresAt) ||
        value.expiresAt <= now || value.savedAt > now + 60_000 ||
        !Array.isArray(value.channels)) return null;
    const channels = value.channels
      .slice(0, COVERAGE_CONTINUITY_MAX_CHANNELS)
      .map(safeChannel)
      .filter((channel): channel is MarketChannelCoverage => channel != null);
    return {
      schemaVersion: COVERAGE_CONTINUITY_SCHEMA_VERSION,
      policyId: COVERAGE_CONTINUITY_POLICY_ID,
      savedAt: value.savedAt,
      expiresAt: value.expiresAt,
      channels,
    };
  } catch {
    return null;
  }
}

/** Merge by maxima because multiple tabs observe the same broadcast tape. Summing would double-count. */
export function mergeCoverageChannels(
  previous: readonly MarketChannelCoverage[],
  current: readonly MarketChannelCoverage[],
): MarketChannelCoverage[] {
  const merged = new Map<string, MarketChannelCoverage>();
  for (const channel of [...previous, ...current]) {
    const key = channelKey(channel);
    const prior = merged.get(key);
    if (!prior) {
      merged.set(key, { ...channel });
      continue;
    }
    merged.set(key, {
      ...channel,
      observedFrom: prior.observedFrom == null ? channel.observedFrom
        : channel.observedFrom == null ? prior.observedFrom
        : Math.min(prior.observedFrom, channel.observedFrom),
      observedThrough: prior.observedThrough == null ? channel.observedThrough
        : channel.observedThrough == null ? prior.observedThrough
        : Math.max(prior.observedThrough, channel.observedThrough),
      lastEventAt: Math.max(prior.lastEventAt ?? 0, channel.lastEventAt ?? 0),
      lastGapAt: Math.max(prior.lastGapAt ?? 0, channel.lastGapAt ?? 0) || undefined,
      observedEventCount: Math.max(prior.observedEventCount, channel.observedEventCount),
      gapCount: Math.max(prior.gapCount, channel.gapCount),
      memoryState: "SUMMARY_ONLY",
      detail: "Browser-local coverage summary only; no raw market payloads retained.",
    });
  }
  return [...merged.values()].slice(-COVERAGE_CONTINUITY_MAX_CHANNELS);
}
