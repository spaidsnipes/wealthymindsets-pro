import { type CertLevel } from "./certification";

/**
 * A GATE THAT CANNOT REPORT ITS OWN STATE IS A SIGN, NOT A GATE.
 *
 * `/copy-trading` names four activation requirements and then renders a
 * hard-coded "Not available" chip. The chip is correct today, but it is
 * correct the way a stopped clock is correct: the page renders the exact
 * same pixels whether three brokers are certified WRITE_LIVE or none are
 * registered at all. Nothing on that surface reads any adapter, any
 * certification stage, or any health() answer. It CANNOT change.
 *
 * That is the inverse of the usual overclaim and it is still a claim.
 * The surface asserts a verdict it never measured. If someone certified a
 * broker tomorrow, the page would keep saying "Not available" — and the
 * one honest thing WM could say (`you are one requirement away`) would be
 * invisible. An unmeasured NO is the same defect class as an unmeasured
 * YES; it merely fails in the direction we happen to like.
 *
 * This selector makes the verdict a MEASUREMENT. It reads the provider
 * reports the `/api/broker/status` aggregate already publishes — which are
 * themselves enumerated from the adapter registry, never retyped — and
 * derives each of the four requirements from the canon §W3 certification
 * ladder that already encodes exactly these milestones:
 *
 *   "Broker-confirmed trade and equity history"      → read_account_state  (READ_ONLY)
 *   "User authorization and risk limits"             → no owner exists yet (UNMEASURED)
 *   "Auditable order acknowledgements and fills"     → acknowledgement + partial_full_fill (WRITE_PAPER)
 *   "Clear slippage, latency, and failure reporting" → reconnect_reconcile + journal_receipt (WRITE_LIVE)
 *
 * UNMEASURED IS NOT MET. The authorization requirement has no server-side
 * owner in this build — there is no risk-limit record and no authorization
 * grant to read — so it reports UNMEASURED forever until one is written.
 * `available` requires every requirement to be MET, so an UNMEASURED
 * requirement keeps the gate shut. This is deliberate: the gate stays
 * closed because something is UNKNOWN, and it says so, rather than being
 * closed because a developer typed a word into JSX.
 *
 * Pure. No fetch, no clock, no React. The caller supplies the reports.
 */

/** The minimum shape this selector needs. Structurally compatible with
 *  `ProviderReport` from /api/broker/status — deliberately NOT imported
 *  from the route, so a lib module never depends on an app route. */
export interface CopyTradingProviderInput {
  readonly provider: string;
  readonly kind: "broker" | "ai";
  readonly certLevel?: CertLevel;
}

export type CopyTradingRequirementId =
  | "brokerHistory"
  | "authorization"
  | "auditableFills"
  | "failureReporting";

/**
 * MET       — measured, and the evidence clears the bar.
 * UNMET     — measured, and the evidence does not clear the bar.
 * UNMEASURED— WM has no owner that can answer. Never counts as MET.
 */
export type CopyTradingRequirementState = "MET" | "UNMET" | "UNMEASURED";

export interface CopyTradingRequirement {
  readonly id: CopyTradingRequirementId;
  /** The requirement exactly as the Founder-facing surface words it. */
  readonly label: string;
  readonly state: CopyTradingRequirementState;
  /** WHY the state is what it is. Rendered, never decorative. */
  readonly evidence: string;
}

export interface CopyTradingGate {
  /** True only when every requirement is MET. UNMEASURED never rounds up. */
  readonly available: boolean;
  readonly requirements: readonly CopyTradingRequirement[];
  readonly metCount: number;
  readonly totalCount: number;
  /** The furthest-certified broker, or null when no broker is registered. */
  readonly bestBroker: string | null;
  readonly bestLevel: CertLevel;
  /** One sentence the surface may render verbatim. */
  readonly headline: string;
}

/**
 * Ordering of the certification ladder. TOTAL on purpose: a fifth
 * CertLevel fails the build here rather than silently ranking 0 and
 * quietly closing a gate that should have opened.
 */
const LEVEL_RANK: Record<CertLevel, number> = {
  NONE: 0,
  READ_ONLY: 1,
  WRITE_PAPER: 2,
  WRITE_LIVE: 3,
};

/** Label for a level, for evidence strings. TOTAL for the same reason. */
const LEVEL_LABEL: Record<CertLevel, string> = {
  NONE: "not certified",
  READ_ONLY: "READ_ONLY",
  WRITE_PAPER: "WRITE_PAPER",
  WRITE_LIVE: "WRITE_LIVE",
};

function rank(level: CertLevel): number {
  return LEVEL_RANK[level];
}

export function selectCopyTradingGate(
  providers: readonly CopyTradingProviderInput[],
): CopyTradingGate {
  // Only brokers can certify. The Gemini AI row is not a broker and must
  // never contribute to a trading-authorization verdict.
  const brokers = providers.filter(p => p.kind === "broker");

  let bestBroker: string | null = null;
  let bestLevel: CertLevel = "NONE";
  for (const b of brokers) {
    const level = b.certLevel ?? "NONE";
    if (bestBroker === null || rank(level) > rank(bestLevel)) {
      bestBroker = b.provider;
      bestLevel = level;
    }
  }

  const noBrokers = brokers.length === 0;
  const best = rank(bestLevel);
  const who = bestBroker === null ? "no registered broker" : bestBroker;

  const requirements: readonly CopyTradingRequirement[] = [
    {
      id: "brokerHistory",
      label: "Broker-confirmed trade and equity history",
      state: noBrokers ? "UNMEASURED" : best >= rank("READ_ONLY") ? "MET" : "UNMET",
      evidence: noBrokers
        ? "No broker adapter is registered, so there is nothing to read a history from."
        : best >= rank("READ_ONLY")
          ? `${who} is certified ${LEVEL_LABEL[bestLevel]} — account state reads have passed.`
          : `${who} has not cleared READ_ONLY certification, so account state has never been read.`,
    },
    {
      id: "authorization",
      label: "User authorization and risk limits",
      // Permanently UNMEASURED until an authorization record exists. Naming
      // this as UNMEASURED rather than UNMET is the honest distinction: WM
      // is not reporting a failed check, it is reporting an absent check.
      state: "UNMEASURED",
      evidence:
        "WM stores no copy-trading authorization grant and no per-follower risk limits, so this cannot be checked. It is unknown, not failed.",
    },
    {
      id: "auditableFills",
      label: "Auditable order acknowledgements and fills",
      state: noBrokers ? "UNMEASURED" : best >= rank("WRITE_PAPER") ? "MET" : "UNMET",
      evidence: noBrokers
        ? "No broker adapter is registered, so no acknowledgement has ever been observed."
        : best >= rank("WRITE_PAPER")
          ? `${who} has cleared submit, acknowledgement, fill and cancel stages.`
          : `${who} has not cleared WRITE_PAPER certification — no acknowledgement or fill lifecycle has been observed.`,
    },
    {
      id: "failureReporting",
      label: "Clear slippage, latency, and failure reporting",
      state: noBrokers ? "UNMEASURED" : best >= rank("WRITE_LIVE") ? "MET" : "UNMET",
      evidence: noBrokers
        ? "No broker adapter is registered, so no reconnect or journal receipt has ever been observed."
        : best >= rank("WRITE_LIVE")
          ? `${who} has cleared reconnect/reconcile, auth refresh and journal receipt.`
          : `${who} has not cleared WRITE_LIVE certification — reconnect, auth refresh and journal receipt are unobserved.`,
    },
  ];

  const metCount = requirements.filter(r => r.state === "MET").length;
  const totalCount = requirements.length;
  const available = requirements.every(r => r.state === "MET");

  const headline = available
    ? `All ${totalCount} activation requirements are met.`
    : `${metCount} of ${totalCount} activation requirements are met — measured, not assumed.`;

  return { available, requirements, metCount, totalCount, bestBroker, bestLevel, headline };
}
