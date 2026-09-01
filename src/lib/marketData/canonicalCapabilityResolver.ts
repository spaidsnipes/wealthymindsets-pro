/**
 * Canonical per-capability provider/session/fidelity resolver.
 *
 * Provider probes report evidence. This module is the single writer that turns
 * those reports into the capability matrix ATHOS may consume. It deliberately
 * keeps session state separate from data quality and excludes mock/legacy
 * bypasses from production selection.
 */

import {
  DATA_CAPABILITIES,
  type CapabilityCertStatus,
  type CapabilityFidelity,
  type CertifiedCapabilityRow,
  type DataCapability,
  type SourceCertification,
} from "./sourceCapabilityCertification";

export const CAPABILITY_MATRIX_SCHEMA_VERSION = "wm.capability-matrix.v1" as const;

export type MarketSessionState =
  | "PRE_MARKET"
  | "OPEN"
  | "AFTER_HOURS"
  | "CLOSED"
  | "HALTED"
  | "UNKNOWN";

export interface SessionTruth {
  readonly state: MarketSessionState;
  readonly asOf: string;
  readonly reason: string;
}

export type ProviderTier = "CERTIFIED_NEW" | "CANONICAL" | "LEGACY" | "MOCK";

export interface CapabilityCandidate {
  readonly source: string;
  readonly providerTier: ProviderTier;
  readonly row: CertifiedCapabilityRow;
}

export interface CapabilitySource {
  readonly certification: SourceCertification;
  readonly providerTier: ProviderTier;
}

export interface CapabilityEvidenceReceipt {
  readonly source: string;
  readonly timestamp: string | null;
  readonly fidelity: CapabilityFidelity;
  readonly reason: string;
  readonly evidencePath: string | null;
  readonly fallback: {
    readonly used: boolean;
    readonly reason: string | null;
    readonly recoveryPath: string | null;
  };
}

export interface CapabilityResolution {
  readonly capability: DataCapability;
  readonly provider: string | null;
  readonly session: SessionTruth;
  readonly status: CapabilityCertStatus | "UNAVAILABLE";
  readonly fidelity: CapabilityFidelity;
  readonly entitlement: "AVAILABLE" | "BLOCKED" | "UNKNOWN";
  readonly freshness: {
    readonly stalenessMs: number | null;
    readonly state: "OBSERVED" | "UNKNOWN";
  };
  readonly receipt: CapabilityEvidenceReceipt;
  readonly rejectedSources: readonly {
    readonly source: string;
    readonly reason: string;
  }[];
}

export interface AthosCapabilityMatrix {
  readonly schemaVersion: typeof CAPABILITY_MATRIX_SCHEMA_VERSION;
  readonly generatedAt: string;
  readonly session: SessionTruth;
  readonly capabilities: readonly CapabilityResolution[];
}

const STATUS_RANK: Record<CapabilityCertStatus, number> = {
  ACTIVE_CERTIFIED: 6,
  ACTIVE_DEGRADED: 5,
  BLOCKED_ENTITLEMENT: 4,
  BLOCKED_AUTH: 3,
  UNSUPPORTED: 2,
  NOT_IMPLEMENTED: 1,
};

const FIDELITY_RANK: Record<CapabilityFidelity, number> = {
  REALTIME: 5,
  SNAPSHOT: 4,
  DELAYED: 3,
  PROXY: 2,
  NONE: 1,
};

const PROVIDER_RANK: Record<ProviderTier, number> = {
  CERTIFIED_NEW: 4,
  CANONICAL: 3,
  LEGACY: 2,
  MOCK: 1,
};

function isUsable(row: CertifiedCapabilityRow): boolean {
  return row.status === "ACTIVE_CERTIFIED" || row.status === "ACTIVE_DEGRADED";
}

function rejectionReason(candidate: CapabilityCandidate): string | null {
  if (candidate.providerTier === "MOCK") return "mock providers are never production-eligible";
  if (candidate.providerTier === "LEGACY") return "legacy providers cannot bypass the canonical production resolver";
  if (!isUsable(candidate.row)) return `capability status is ${candidate.row.status}`;
  return null;
}

function compareCandidates(a: CapabilityCandidate, b: CapabilityCandidate): number {
  const status = STATUS_RANK[b.row.status] - STATUS_RANK[a.row.status];
  if (status !== 0) return status;
  const fidelity = FIDELITY_RANK[b.row.fidelity] - FIDELITY_RANK[a.row.fidelity];
  if (fidelity !== 0) return fidelity;
  const provider = PROVIDER_RANK[b.providerTier] - PROVIDER_RANK[a.providerTier];
  if (provider !== 0) return provider;
  const freshness = (a.row.stalenessMs ?? Number.POSITIVE_INFINITY) -
    (b.row.stalenessMs ?? Number.POSITIVE_INFINITY);
  if (freshness !== 0) return freshness;
  return a.source.localeCompare(b.source);
}

function unavailableReason(
  capability: DataCapability,
  candidates: readonly CapabilityCandidate[],
): string {
  if (candidates.length === 0) return `no provider reported ${capability}`;
  return candidates
    .slice()
    .sort(compareCandidates)
    .map((candidate) => `${candidate.source}: ${rejectionReason(candidate) ?? "not selected"}`)
    .join("; ");
}

function receiptReason(candidate: CapabilityCandidate): string {
  const note = candidate.row.note?.trim();
  if (note) return note;
  return `${candidate.source} reported ${candidate.row.status} at ${candidate.row.fidelity} fidelity`;
}

export function resolveCapability(
  capability: DataCapability,
  session: SessionTruth,
  candidates: readonly CapabilityCandidate[],
): CapabilityResolution {
  const relevant = candidates.filter((candidate) => candidate.row.capability === capability);
  const rejectedSources = relevant.flatMap((candidate) => {
    const reason = rejectionReason(candidate);
    return reason ? [{ source: candidate.source, reason }] : [];
  });
  const selected = relevant.filter((candidate) => rejectionReason(candidate) === null).sort(compareCandidates)[0];

  if (!selected) {
    const reason = unavailableReason(capability, relevant);
    return {
      capability,
      provider: null,
      session,
      status: "UNAVAILABLE",
      fidelity: "NONE",
      entitlement: relevant.some((candidate) => candidate.row.status === "BLOCKED_ENTITLEMENT")
        ? "BLOCKED"
        : "UNKNOWN",
      freshness: { stalenessMs: null, state: "UNKNOWN" },
      receipt: {
        source: "none",
        timestamp: null,
        fidelity: "NONE",
        reason,
        evidencePath: null,
        fallback: {
          used: false,
          reason: null,
          recoveryPath: "certify a production-eligible provider capability through its canonical adapter",
        },
      },
      rejectedSources,
    };
  }

  return {
    capability,
    provider: selected.source,
    session,
    status: selected.row.status,
    fidelity: selected.row.fidelity,
    entitlement: "AVAILABLE",
    freshness: selected.row.stalenessMs === undefined
      ? { stalenessMs: null, state: "UNKNOWN" }
      : { stalenessMs: selected.row.stalenessMs, state: "OBSERVED" },
    receipt: {
      source: selected.source,
      timestamp: selected.row.observedAt ?? null,
      fidelity: selected.row.fidelity,
      reason: receiptReason(selected),
      evidencePath: selected.row.evidencePath ?? null,
      fallback: { used: false, reason: null, recoveryPath: null },
    },
    rejectedSources,
  };
}

export function certificationCandidates(
  sources: readonly CapabilitySource[],
): readonly CapabilityCandidate[] {
  return sources.flatMap(({ certification, providerTier }) =>
    certification.rows.map((row) => ({ source: certification.source, providerTier, row })),
  );
}

export function buildAthosCapabilityMatrix(
  sources: readonly CapabilitySource[],
  session: SessionTruth,
  generatedAt = new Date().toISOString(),
): AthosCapabilityMatrix {
  const candidates = certificationCandidates(sources);
  return {
    schemaVersion: CAPABILITY_MATRIX_SCHEMA_VERSION,
    generatedAt,
    session,
    capabilities: DATA_CAPABILITIES.map((capability) =>
      resolveCapability(capability, session, candidates),
    ),
  };
}
