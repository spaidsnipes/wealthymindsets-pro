/**
 * sourceCertificationRegistry — pure aggregation of per-source DATA
 * certifications into ONE honest fleet view.
 *
 * Founder War-Room §6: every source (Webull, moomoo, Alpaca, …) is certified
 * per capability; this module rolls those `SourceCertification`s up WITHOUT
 * rounding anything up. It NEVER invents a certified capability, and it NEVER
 * upgrades CVD — the best fleet-wide CVD is simply the best any single source
 * legitimately earned (DIRECT > PROXY > UNAVAILABLE), never a blend.
 *
 * PURE MODULE — no I/O. The live probes (probeMoomooMarketData, a future
 * Webull probe) do the network work and hand their results here.
 */

import {
  sourceCertificationSummary,
  type SourceCertification,
  type CvdFidelity,
} from "./sourceCapabilityCertification";

/** Ordered best→worst so a numeric max cannot accidentally invent DIRECT. */
const CVD_RANK: Record<CvdFidelity, number> = {
  DIRECT: 2,
  PROXY: 1,
  UNAVAILABLE: 0,
};

export interface FleetSourceCertification {
  readonly generatedAt: string;
  readonly sources: readonly SourceCertification[];
  /** One honest one-liner per source, machine-parseable. */
  readonly summaries: readonly string[];
  /** Total ACTIVE_CERTIFIED capabilities across every source. */
  readonly totalCertified: number;
  /** True only if some source is FULLY certified — never rounded up. */
  readonly anyFullyCertified: boolean;
  /**
   * Best CVD fidelity ANY single source legitimately earned. Not a blend:
   * CVD requires signed executed evidence from one coherent feed, so we take
   * the max — never combine legs across sources into a fake DIRECT.
   */
  readonly bestCvd: CvdFidelity;
}

/**
 * Roll per-source certifications into a single honest fleet view.
 * Empty input → an honest zero state (nothing certified, CVD UNAVAILABLE).
 */
export function aggregateSourceCertifications(
  certs: readonly SourceCertification[],
): FleetSourceCertification {
  const bestCvd = certs.reduce<CvdFidelity>(
    (best, c) => (CVD_RANK[c.cvd] > CVD_RANK[best] ? c.cvd : best),
    "UNAVAILABLE",
  );

  return {
    generatedAt: new Date().toISOString(),
    sources: certs,
    summaries: certs.map(sourceCertificationSummary),
    totalCertified: certs.reduce((sum, c) => sum + c.certifiedCount, 0),
    anyFullyCertified: certs.some((c) => c.fullyCertified),
    bestCvd,
  };
}
