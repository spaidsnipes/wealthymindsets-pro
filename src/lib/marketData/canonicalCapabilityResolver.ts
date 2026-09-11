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
import { provenSessionClosure } from "./canonicalIdentity";

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

/**
 * The instrument that stands for "the US cash market" when a surface reports
 * on the market as a whole rather than on one symbol.
 *
 * Chosen to match `selectUsCashSessionBarLabel`, which already uses SPY for
 * exactly this purpose. Two surfaces answering the same question must not pick
 * two different proxies, or they will disagree on a holiday calendar later.
 */
const US_CASH_MARKET_PROXY = "SPY" as const;

/**
 * Derive session truth from the canonical closure owner.
 *
 * WHAT THIS REPLACES, AND WHY IT MATTERED (2026-09-11).
 *
 * `/api/athos/market-data/capabilities` built its `SessionTruth` by typing a
 * literal into the route:
 *
 *     const session = { state: "UNKNOWN", asOf: generatedAt,
 *       reason: "canonical exchange-calendar session owner is not wired to
 *                this endpoint yet" };
 *
 * That reason was TRUE WHEN WRITTEN and quietly stopped being true. The
 * codebase does hold a closure owner — `provenSessionClosure()` — and the
 * user-visible surfaces already consult it: the bottom index bar via
 * `selectUsCashSessionBarLabel`, the phone header and /charts via
 * `selectCanonicalSessionToken`. The endpoint alone kept answering from a
 * constant, on every one of its eleven capability rows.
 *
 * The cost is a one-app contradiction, and it only appears on the days the
 * owner can actually prove something. On a Saturday /charts prints
 * "US CASH SESSION · CLOSED" while this endpoint — the surface ATHOS reads —
 * reports `UNKNOWN` and blames a missing owner that is imported two modules
 * away. Nothing throws; `tsc --noEmit` stays at exit 0, because a hard-coded
 * object literal is type-correct no matter what the repo knows. It is the same
 * defect class as the retyped broker list in `/api/broker/status` and the dead
 * `.vercel.app` suffix in the middleware: one side restates what another side
 * owns, and the restatement cannot drift-check itself.
 *
 * WHAT IS DELIBERATELY *NOT* FIXED HERE.
 *
 * `UNKNOWN` on a Tuesday remains correct and must stay. This codebase holds no
 * INTRADAY exchange calendar, so it cannot separate PRE_MARKET / OPEN /
 * AFTER_HOURS at 11am, and inventing `OPEN` from "a provider answered us" is
 * precisely the promotion of connectivity into session truth that the module
 * header forbids. The repair is narrow: stop hard-coding the shrug, and let
 * the owner sharpen it on the days it can. A future holiday calendar lands in
 * `provenSessionClosure` and reaches this endpoint for free.
 */
export function deriveSessionTruth(at: Date | null, asOf: string): SessionTruth {
  // `=== false` and not a truthiness test: provenSessionClosure returns
  // `false | null`, and `null` must never be read as "open".
  if (at && provenSessionClosure(US_CASH_MARKET_PROXY, at) === false) {
    return {
      state: "CLOSED",
      asOf,
      reason: "US cash market closure is established for this calendar day",
    };
  }
  return {
    state: "UNKNOWN",
    asOf,
    reason:
      "no intraday exchange calendar — closure is not established for this " +
      "calendar day, and provider connectivity is never promoted into session truth",
  };
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
    readonly note?: string;
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
    return reason ? [{ source: candidate.source, reason, note: candidate.row.note }] : [];
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
