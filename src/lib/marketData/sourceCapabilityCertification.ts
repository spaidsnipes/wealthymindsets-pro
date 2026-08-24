/**
 * Source Capability Certification — the per-provider DATA certification matrix.
 *
 * Founder War-Room directive (2026-08-24) §6 "DATA CAPABILITY CERTIFICATION":
 *   "Certify actual entitlement, not documented possibility." Every source
 *   (Webull, Moomoo, Alpaca, …) must be certified per capability with an
 *   HONEST status — never inferred from documentation.
 *
 * RELATIONSHIP TO EXISTING MODULES (no duplication):
 *   · `capabilityRegistry.ts` is the RIGHTS-first *availability inventory*
 *     (may we collect/display/retain a coarse quote|trade|bar|depth). It
 *     answers "are we *allowed* to touch this feed."
 *   · `broker/certification.ts` certifies the *trade loop* (auth → submit →
 *     fill → reconcile) and yields NONE/READ_ONLY/WRITE_PAPER/WRITE_LIVE.
 *   · THIS module certifies *data fidelity per capability* — the finer rows
 *     the founder mandates (PRICE, BARS, TICKS, EXECUTED VOLUME, AGGRESSOR,
 *     DEPTH, …). It exists because the coarse `trade` availability bit cannot
 *     distinguish EXECUTED VOLUME from AGGRESSOR/SIDE — and the CVD law
 *     REQUIRES that distinction (depth ≠ executed volume ≠ signed volume).
 *
 * PURE MODULE — no I/O, no provider calls. A future cert runner probes a live
 * (paper) session and records `SourceCapabilityReport`s; this module only maps
 * those reports onto an honest matrix + derived CVD fidelity.
 */

/**
 * The canonical data-capability rows every source is certified against.
 * Ordered coarse→fine→broker so the matrix reads top-to-bottom like the
 * founder's list. Kept as a const tuple so the type is exhaustive.
 */
export const DATA_CAPABILITIES = [
  "PRICE",            // last / quote price
  "BARS",             // historical OHLCV candles
  "TICKS",            // individual trade prints (tape)
  "EXECUTED_VOLUME",  // real executed size per print (NOT depth, NOT quote size)
  "AGGRESSOR_SIDE",   // defensible buyer/seller-initiated classification per print
  "DEPTH",            // L2 order-book / bid-ask ladder (≠ executed volume)
  "OPTIONS",          // options chains / greeks
  "FUTURES",          // futures instruments
  "ACCOUNT",          // account balances / buying power
  "POSITIONS",        // open positions
  "ORDERS",           // working / historical orders
] as const;

export type DataCapability = typeof DATA_CAPABILITIES[number];

/**
 * Certification status per (source, capability). Founder-mandated set.
 * NEVER default to a positive status — an un-probed capability is
 * NOT_IMPLEMENTED, never "assumed working".
 */
export type CapabilityCertStatus =
  | "ACTIVE_CERTIFIED"     // real evidence observed AND fidelity sufficient for its use
  | "ACTIVE_DEGRADED"      // works but delayed / partial / low-fidelity (label honestly)
  | "BLOCKED_ENTITLEMENT"  // provider offers it but this account is not entitled
  | "BLOCKED_AUTH"         // auth/token missing, invalid, or expired
  | "UNSUPPORTED"          // provider genuinely cannot offer this capability
  | "NOT_IMPLEMENTED";     // we have not wired/probed it yet (honest default)

/** Fidelity qualifier — mirrors CVD law's resolution ladder. */
export type CapabilityFidelity =
  | "REALTIME"    // live executed evidence
  | "DELAYED"     // e.g. 15-min delayed feed
  | "SNAPSHOT"    // point-in-time snapshot, not a continuous stream
  | "PROXY"       // inferred/approximated from a lower-resolution input
  | "NONE";       // no fidelity claim

/** A single observed certification data point recorded by the cert runner. */
export interface SourceCapabilityReport {
  readonly capability: DataCapability;
  readonly status: CapabilityCertStatus;
  readonly fidelity?: CapabilityFidelity;
  /** Path/pointer to the evidence that justifies this status (fixture, log). */
  readonly evidencePath?: string;
  /** Measured staleness in ms at observation time, when relevant. */
  readonly stalenessMs?: number;
  readonly observedAt?: string; // ISO 8601
  readonly note?: string;
}

/** One fully-certified capability row (status resolved, defaults applied). */
export interface CertifiedCapabilityRow {
  readonly capability: DataCapability;
  readonly status: CapabilityCertStatus;
  readonly fidelity: CapabilityFidelity;
  readonly evidencePath?: string;
  readonly stalenessMs?: number;
  readonly observedAt?: string;
  readonly note?: string;
}

/**
 * CVD fidelity derived from a source's certification.
 *   DIRECT       — EXECUTED_VOLUME *and* AGGRESSOR_SIDE both ACTIVE_CERTIFIED.
 *   PROXY        — some executed evidence but the aggressor sign is degraded/
 *                  inferred, OR only one of the two required rows is certified.
 *   UNAVAILABLE  — neither certified (e.g. only DEPTH/quotes) → CVD must be
 *                  marked unavailable, NEVER fabricated from depth or OHLC.
 */
export type CvdFidelity = "DIRECT" | "PROXY" | "UNAVAILABLE";

export interface SourceCertification {
  readonly source: string;
  readonly rows: readonly CertifiedCapabilityRow[];
  readonly cvd: CvdFidelity;
  /** Count of capabilities at ACTIVE_CERTIFIED. */
  readonly certifiedCount: number;
  /** True only when EVERY capability is ACTIVE_CERTIFIED. Never rounded up. */
  readonly fullyCertified: boolean;
}

/**
 * Build the honest certification matrix for a source from its observed reports.
 * Any capability WITHOUT a report defaults to NOT_IMPLEMENTED / NONE fidelity —
 * the truthful "we have not proven this" state. Duplicate reports for the same
 * capability: the LAST one wins (cert runner appends over time).
 */
export function certifySource(
  source: string,
  reports: readonly SourceCapabilityReport[],
): SourceCertification {
  const byCapability = new Map<DataCapability, SourceCapabilityReport>();
  for (const r of reports) byCapability.set(r.capability, r);

  const rows: CertifiedCapabilityRow[] = DATA_CAPABILITIES.map((capability) => {
    const r = byCapability.get(capability);
    if (!r) {
      return { capability, status: "NOT_IMPLEMENTED", fidelity: "NONE" };
    }
    return {
      capability,
      status: r.status,
      fidelity: r.fidelity ?? (r.status === "ACTIVE_CERTIFIED" ? "REALTIME" : "NONE"),
      evidencePath: r.evidencePath,
      stalenessMs: r.stalenessMs,
      observedAt: r.observedAt,
      note: r.note,
    };
  });

  const certifiedCount = rows.filter((r) => r.status === "ACTIVE_CERTIFIED").length;

  return {
    source,
    rows,
    cvd: deriveCvdFidelity(rows),
    certifiedCount,
    fullyCertified: rows.every((r) => r.status === "ACTIVE_CERTIFIED"),
  };
}

/**
 * Encode the CVD LAW as a pure derivation. Depth is deliberately IGNORED here —
 * an order book can never upgrade CVD fidelity. Only executed-trade evidence
 * (EXECUTED_VOLUME) with a defensible AGGRESSOR_SIDE classification yields DIRECT.
 */
export function deriveCvdFidelity(rows: readonly CertifiedCapabilityRow[]): CvdFidelity {
  const status = (c: DataCapability) => rows.find((r) => r.capability === c)?.status;
  const vol = status("EXECUTED_VOLUME");
  const side = status("AGGRESSOR_SIDE");

  const volReal = vol === "ACTIVE_CERTIFIED";
  const sideReal = side === "ACTIVE_CERTIFIED";
  const volAny = vol === "ACTIVE_CERTIFIED" || vol === "ACTIVE_DEGRADED";
  const sideAny = side === "ACTIVE_CERTIFIED" || side === "ACTIVE_DEGRADED";

  if (volReal && sideReal) return "DIRECT";
  // Some executed evidence exists but is degraded, or only one leg is present.
  if (volAny && sideAny) return "PROXY";
  return "UNAVAILABLE";
}

/** One-line human summary for the /api/broker status aggregate + receipts. */
export function sourceCertificationSummary(cert: SourceCertification): string {
  return `${cert.source}: ${cert.certifiedCount}/${DATA_CAPABILITIES.length} certified · CVD ${cert.cvd}`;
}
