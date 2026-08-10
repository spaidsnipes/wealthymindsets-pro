import {
  COVERAGE_CONTINUITY_MAX_CHANNELS,
  COVERAGE_CONTINUITY_POLICY_ID,
  COVERAGE_CONTINUITY_SCHEMA_VERSION,
  COVERAGE_CONTINUITY_TTL_MS,
  parseCoverageContinuityRecord,
  type CoverageContinuityRecord,
} from "./coverageContinuity";

export interface CoverageCheckpointRpcChannel {
  instrument_id: string;
  normalized_symbol?: string;
  channel: string;
  provider_path: string;
  observed_from: number;
  observed_through: number;
  last_event_at?: number;
  observed_event_count: number;
  gap_count: number;
  last_gap_at?: number;
  fidelity: string;
  collection_scope: string;
  persistence_right: string;
  rights_policy_id: string;
}

export function continuityRecordToRpcChannels(
  record: CoverageContinuityRecord,
): CoverageCheckpointRpcChannel[] {
  return record.channels.slice(0, COVERAGE_CONTINUITY_MAX_CHANNELS).map(channel => ({
    instrument_id: channel.instrumentId,
    ...(channel.normalizedSymbol ? { normalized_symbol: channel.normalizedSymbol } : {}),
    channel: channel.channel,
    provider_path: channel.providerPath,
    observed_from: channel.observedFrom!,
    observed_through: channel.observedThrough!,
    ...(channel.lastEventAt ? { last_event_at: channel.lastEventAt } : {}),
    observed_event_count: channel.observedEventCount,
    gap_count: channel.gapCount,
    ...(channel.lastGapAt ? { last_gap_at: channel.lastGapAt } : {}),
    fidelity: channel.fidelity,
    collection_scope: channel.collectionScope,
    persistence_right: channel.persistenceRight,
    rights_policy_id: channel.rightsPolicyId,
  }));
}

type DatabaseCoverageRow = CoverageCheckpointRpcChannel;

export function databaseRowsToContinuityRecord(
  rows: readonly DatabaseCoverageRow[],
  now = Date.now(),
): CoverageContinuityRecord | null {
  const channels = rows.slice(0, COVERAGE_CONTINUITY_MAX_CHANNELS).map(row => ({
    schemaVersion: "wm.market-coverage.v1",
    instrumentId: row.instrument_id,
    normalizedSymbol: row.normalized_symbol,
    channel: row.channel,
    providerPath: row.provider_path,
    coverageState: "STALE",
    memoryState: "SUMMARY_ONLY",
    persistenceRight: row.persistence_right,
    rightsPolicyId: row.rights_policy_id,
    observedFrom: row.observed_from,
    observedThrough: row.observed_through,
    lastEventAt: row.last_event_at,
    observedEventCount: row.observed_event_count,
    gapCount: row.gap_count,
    lastGapAt: row.last_gap_at,
    fidelity: row.fidelity,
    collectionScope: row.collection_scope,
    detail: "Server-restored operational coverage summary; no raw market payloads retained.",
  }));

  return parseCoverageContinuityRecord(JSON.stringify({
    schemaVersion: COVERAGE_CONTINUITY_SCHEMA_VERSION,
    policyId: COVERAGE_CONTINUITY_POLICY_ID,
    savedAt: now,
    expiresAt: now + COVERAGE_CONTINUITY_TTL_MS,
    channels,
  }), now);
}
