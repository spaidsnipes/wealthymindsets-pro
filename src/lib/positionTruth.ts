/**
 * BUILD ORDER §14.1 + §14.4 — position truth reducer.
 *
 *   §14.1  The UI never says FLAT while broker quantity > 0.
 *   §14.4  A stale client cannot overwrite newer reconciliation.
 *
 * This is a pure SELECTOR over position reports, not a store. Per §15 it does
 * not persist anything and does not become a second position store; the paper
 * ledger and any future broker reconciliation remain the only owners of state.
 *
 * The law it enforces is the one WM keeps getting wrong in the wild. On
 * 2026-09-03 the Alpaca panel rendered "No open positions" whenever its fetch
 * failed, because an empty list is the initial value and nothing distinguished
 * "you hold nothing" from "we could not find out what you hold". A trader
 * holding risk was told, confidently, that they held none.
 *
 * So: FLAT is a FINDING, never a default. It requires that every expected
 * source was actually observed and every one of them reported zero. Anything
 * else is POSITION UNCONFIRMED — which is not a scary state, it is an honest
 * one, and it is the only thing that can be said when the book is unknown.
 */

export type PositionLabel =
  | "FLAT"
  | "LONG"
  | "SHORT"
  | "POSITION UNCONFIRMED";

export type PositionConfidence =
  /** Every expected source was observed and they agree. */
  | "CONFIRMED"
  /** Observed, but the freshest report is older than the tolerance. */
  | "STALE"
  /** An invalid clock, tolerance or future observation prevents age proof. */
  | "TIME UNVERIFIED"
  /** A source was expected and never reported. */
  | "UNOBSERVED"
  /** Sources disagree on quantity at the same or newer recency. */
  | "DISPUTED";

export interface PositionReport {
  /** Name of the reporting source, e.g. "broker-recon" or "paper-ledger". */
  readonly source: string;
  /** Signed net quantity. Positive is long, negative is short, 0 is flat. */
  readonly qty: number;
  /** When this observation was made, epoch ms. */
  readonly observedAt: number;
  /**
   * How much authority this source holds over the broker's book. Higher wins.
   *
   * Recency alone is NOT enough. If a client snapshot says zero one second
   * after a reconciliation said five, recency-wins would print FLAT over a
   * live position — the precise thing §14.1 forbids. So recency decides only
   * WITHIN a rank; a lower rank can never supersede a higher one.
   */
  readonly rank?: number;
}

/** A local/optimistic view. Cannot overrule the broker's own book. */
export const RANK_CLIENT = 0;
/** Reconciliation against the broker. The authority on what is actually held. */
export const RANK_RECONCILIATION = 1;

export interface PositionTruthInput {
  readonly reports: readonly PositionReport[];
  /** Sources expected to report but which produced nothing observable. */
  readonly unobservedSources?: readonly string[];
  readonly now: number;
  /** Age beyond which the freshest report is treated as stale. */
  readonly stalenessMs?: number;
}

export interface PositionTruth {
  readonly label: PositionLabel;
  /** Net quantity, or null when it cannot be asserted. */
  readonly qty: number | null;
  readonly confidence: PositionConfidence;
  /** The source whose report was taken as authoritative. */
  readonly authority: string | null;
  /** Sources whose reports were superseded by a newer one of the same rank. */
  readonly superseded: readonly string[];
  /** Sources ignored because a higher-ranked source reported (§14.1). */
  readonly outranked: readonly string[];
  /** Sources disagreeing with the authority at equal recency. */
  readonly disputedBy: readonly string[];
  /** Plain sentence for the surface. Never a badge, never a score (§15). */
  readonly sentence: string;
}

export const DEFAULT_POSITION_STALENESS_MS = 30_000;

function usable(r: PositionReport): boolean {
  return (
    typeof r.qty === "number" &&
    Number.isFinite(r.qty) &&
    typeof r.observedAt === "number" &&
    Number.isFinite(r.observedAt) &&
    r.observedAt > 0 &&
    (r.rank === undefined || (typeof r.rank === "number" && Number.isFinite(r.rank)))
  );
}

/**
 * Reduce position reports to one truth, refusing to say FLAT unless flatness
 * was actually observed from every expected source.
 */
export function selectPositionTruth(input: PositionTruthInput): PositionTruth {
  const staleness = input.stalenessMs ?? DEFAULT_POSITION_STALENESS_MS;
  // A report carrying NaN quantity is not evidence of anything. Dropping it
  // makes its source unobserved rather than silently counting it as zero.
  const dropped = input.reports.filter((r) => !usable(r)).map((r) => r.source);
  const reports = input.reports.filter(usable);
  const unobserved = [...(input.unobservedSources ?? []), ...dropped];

  if (reports.length === 0) {
    return {
      label: "POSITION UNCONFIRMED",
      qty: null,
      confidence: "UNOBSERVED",
      authority: null,
      superseded: [],
      outranked: [],
      disputedBy: [],
      sentence:
        "POSITION UNCONFIRMED — no source reported. This is not a confirmation that you are flat.",
    };
  }

  // §14.1 — rank decides first. A client snapshot never overrules the broker's
  // own book, however fresh it is, because that is how a real position gets
  // painted FLAT.
  const rankOf = (r: PositionReport) => r.rank ?? RANK_CLIENT;
  const topRank = Math.max(...reports.map(rankOf));
  const ranked = reports.filter((r) => rankOf(r) === topRank);
  const outranked = reports
    .filter((r) => rankOf(r) < topRank)
    .map((r) => r.source);

  // §14.4 — within a rank, recency wins. An older client snapshot can never
  // overwrite a newer reconciliation, no matter which order they arrived in.
  const newestAt = Math.max(...ranked.map((r) => r.observedAt));
  const freshest = ranked.filter((r) => r.observedAt === newestAt);
  const superseded = ranked
    .filter((r) => r.observedAt < newestAt)
    .map((r) => r.source);

  const authority = freshest[0];
  // Disagreement only counts among reports of EQUAL recency; an older report
  // that disagrees is simply stale, not a dispute.
  const disputedBy = freshest
    .filter((r) => r.qty !== authority.qty)
    .map((r) => r.source);

  const timeUnverified = !Number.isFinite(input.now) || input.now <= 0 ||
    !Number.isFinite(staleness) || staleness < 0 || newestAt > input.now;
  const stale = !timeUnverified && input.now - newestAt > staleness;

  const confidence: PositionConfidence =
    disputedBy.length > 0
      ? "DISPUTED"
      : unobserved.length > 0
        ? "UNOBSERVED"
        : timeUnverified
          ? "TIME UNVERIFIED"
        : stale
          ? "STALE"
          : "CONFIRMED";

  const qty = disputedBy.length > 0 ? null : authority.qty;

  // §14.1 — FLAT is only sayable when flatness was observed everywhere.
  const flatObserved =
    qty === 0 && confidence === "CONFIRMED";

  let label: PositionLabel;
  if (flatObserved) label = "FLAT";
  else if (qty !== null && qty > 0) label = "LONG";
  else if (qty !== null && qty < 0) label = "SHORT";
  else label = "POSITION UNCONFIRMED";

  return {
    label,
    qty,
    confidence,
    authority: authority.source,
    superseded,
    outranked,
    disputedBy,
    sentence: describe(label, qty, confidence, unobserved, disputedBy),
  };
}

function describe(
  label: PositionLabel,
  qty: number | null,
  confidence: PositionConfidence,
  unobserved: readonly string[],
  disputedBy: readonly string[],
): string {
  if (label === "FLAT") return "FLAT — every source reported zero.";

  if (label === "POSITION UNCONFIRMED") {
    if (disputedBy.length > 0) {
      return `POSITION UNCONFIRMED — sources disagree (${disputedBy.join(", ")}). This is not a confirmation that you are flat.`;
    }
    if (unobserved.length > 0) {
      return `POSITION UNCONFIRMED — ${unobserved.join(", ")} did not report. This is not a confirmation that you are flat.`;
    }
    if (confidence === "TIME UNVERIFIED") {
      return "POSITION UNCONFIRMED — observation time is unverified. This is not a confirmation that you are flat.";
    }
    return "POSITION UNCONFIRMED — last report is stale. This is not a confirmation that you are flat.";
  }

  const side = label === "LONG" ? "LONG" : "SHORT";
  const size = Math.abs(qty ?? 0);
  const qualifier =
    confidence === "CONFIRMED"
      ? ""
      : confidence === "TIME UNVERIFIED"
        ? " — LAST KNOWN, observation time is unverified"
      : confidence === "STALE"
        ? " — LAST KNOWN, not confirmed"
        : ` — ${unobserved.join(", ")} did not report`;
  return `${side} ${size}${qualifier}`;
}

/** Labels that must never be rendered as a reassuring/settled state (§15). */
export const UNSETTLED_POSITION_LABELS: readonly PositionLabel[] = [
  "POSITION UNCONFIRMED",
];
