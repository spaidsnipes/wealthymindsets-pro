/**
 * THE FRESHNESS THAT WAS ONLY EVER SPOKEN IN COLOUR.
 *
 * `/paper` renders 16 UNIVERSE prices in the MARKET PRICES rail. Each row
 * already carries a full `PaperQuoteReadiness` — status, actionability, age.
 * The rail rendered that truth like this:
 *
 *   <div className={readiness.actionable ? "text-wm-gold" : "text-wm-red"}>
 *     {chg == null ? readiness.status : `${pct}%`}
 *   </div>
 *
 * Two failures in three lines.
 *
 * 1. THE STATUS WORD IS DESTROYED BY ITS OWN SUCCESS. `readiness.status`
 *    renders ONLY when the percentage cannot be computed. But `priorAsStale`
 *    deliberately KEEPS the last price, and the previous close never moves, so
 *    a row that goes STALE still computes a percentage — and therefore never
 *    shows the word STALE. The disclosure is present in exactly the case where
 *    it is not needed and absent in exactly the case where it is.
 *
 * 2. WHAT IS LEFT IS A COLOUR, AND THAT CHANNEL IS ALREADY TAKEN. Red on a
 *    percentage in a price rail means DOWN — everywhere, to everyone. Here it
 *    was overloaded to mean NOT ACTIONABLE, so a stale quote printing `+4.39%`
 *    would render RED while its own sign says up. The canon forbids this by
 *    name (`canonicalFidelityLabels`, verbatim):
 *
 *      "Color may support meaning but may never replace it."
 *
 * The rail's only remaining disclosure was a `title=` tooltip on the panel
 * header. Hover does not exist on a touch device, and the phone is the PRIMARY
 * device by binding standard — on the device that matters most the freshness
 * of all 16 prices was unreachable.
 *
 * MEASURED LIVE on production /paper at 2026-09-15T19:05:37Z. The Order Ticket
 * disclosed its quote as `ACTIVE DEGRADED · Observed 1:55:32 PM · 10m old`.
 * Eight inches to the right, the MARKET PRICES rail served sixteen prices from
 * THE SAME provider with no freshness text at all. One page, one provider, two
 * different freshness stories — canon Weakness #1.
 *
 * ── WHY A SELECTOR AND NOT AN INLINE TERNARY ──────────────────────────
 * The rail and the header must never be able to disagree about how degraded
 * the panel is. Deriving both from this one module means a future edit to the
 * row rule moves the header with it. Two copies of the rule would agree on the
 * happy path — which is precisely what would let the drift ship.
 */

import { CANONICAL_FIDELITY_LABELS } from "../canonicalFidelityLabels";
import type {
  PaperQuoteReadiness,
  PaperQuoteReadinessStatus,
} from "./selectPaperQuoteReadiness";

/** What one MARKET PRICES row must render on its status line. */
export interface PaperQuoteRowTruth {
  /** The text. Always non-empty. Carries the status word whenever the row is
   *  not actionable, so colour is never the only carrier. */
  readonly text: string;
  /** Colour MAY support this. It may not replace `text`. */
  readonly degraded: boolean;
}

/**
 * Worst-first. A rail is only as trustworthy as its least trustworthy row, and
 * `LOADING` outranks `DELAYED` because a row still waiting has told us nothing
 * at all, whereas a delayed row has told us something true.
 */
const SEVERITY: Record<PaperQuoteReadinessStatus, number> = {
  STALE: 3,
  UNKNOWN: 2,
  LOADING: 1,
  DELAYED: 0,
};

const PANEL_LABEL: Record<PaperQuoteReadinessStatus, string> = {
  STALE: CANONICAL_FIDELITY_LABELS.STALE_PIPELINE,
  UNKNOWN: "UNKNOWN",
  LOADING: "LOADING",
  DELAYED: CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED,
};

function formatPct(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

/**
 * The row's status line.
 *
 * An actionable row renders the percentage alone — silence is a feature, and
 * stamping ACTIVE DEGRADED on all sixteen rows would be the "symbol-wide
 * insult" the canon rejects. A NON-actionable row renders its status word
 * WITH the percentage, so the reader is never asked to infer degradation from
 * a hue that already means direction.
 */
export function paperQuoteRowTruth(
  readiness: PaperQuoteReadiness | null | undefined,
  changePct: number | null | undefined,
): PaperQuoteRowTruth {
  if (!readiness) {
    return { text: "UNKNOWN", degraded: true };
  }

  const degraded = readiness.actionable !== true;
  const pctUsable =
    typeof changePct === "number" && Number.isFinite(changePct);

  if (!pctUsable) {
    // No percentage to show — the status word is the whole line, as before.
    return { text: readiness.status, degraded };
  }

  const pct = formatPct(changePct as number);
  return {
    text: degraded ? `${readiness.status} · ${pct}` : pct,
    degraded,
  };
}

/** The one freshness sentence the MARKET PRICES header must render. */
export interface PaperQuotePanelTruth {
  /** Canon-vocabulary label for the WORST row in the rail. */
  readonly label: string;
  /** How many rows cannot authorize an action right now. */
  readonly degradedCount: number;
  readonly total: number;
  /** Age of the OLDEST observation in the rail, or null when nothing has been
   *  observed. This is the number the Order Ticket already discloses; the rail
   *  showing the same fact is what closes the disagreement. */
  readonly oldestAgeMs: number | null;
  /** Long-form detail for a tooltip / aria-label. Never the only disclosure. */
  readonly reason: string;
}

export function selectPaperQuotePanelTruth(
  rows: Iterable<PaperQuoteReadiness | null | undefined> | null | undefined,
): PaperQuotePanelTruth {
  let total = 0;
  let degradedCount = 0;
  let worst: PaperQuoteReadinessStatus | null = null;
  let oldestAgeMs: number | null = null;

  for (const row of rows ?? []) {
    total += 1;
    if (!row) {
      // A missing row is not a fresh row. H1 — absence is not zero.
      degradedCount += 1;
      if (worst === null || SEVERITY.UNKNOWN > SEVERITY[worst]) worst = "UNKNOWN";
      continue;
    }
    if (row.actionable !== true) degradedCount += 1;
    if (worst === null || SEVERITY[row.status] > SEVERITY[worst]) worst = row.status;
    if (typeof row.ageMs === "number" && Number.isFinite(row.ageMs) && row.ageMs >= 0) {
      if (oldestAgeMs === null || row.ageMs > oldestAgeMs) oldestAgeMs = row.ageMs;
    }
  }

  if (total === 0 || worst === null) {
    // Nothing to describe. Inventing a fidelity label for an empty rail would
    // be a claim about data that was never observed.
    return {
      label: "UNKNOWN",
      degradedCount: 0,
      total: 0,
      oldestAgeMs: null,
      reason: "No quote rows have been observed.",
    };
  }

  const label = PANEL_LABEL[worst];
  const age = oldestAgeMs === null ? null : Math.floor(oldestAgeMs / 60_000);
  const agePhrase =
    age === null ? "" : ` Oldest observation is ${age}m old.`;

  return {
    label,
    degradedCount,
    total,
    oldestAgeMs,
    reason:
      degradedCount === 0
        ? `All ${total} quotes are accepted for paper simulation only.${agePhrase}`
        : `${degradedCount} of ${total} quotes cannot authorize an action.${agePhrase}`,
  };
}

/** Compact header text: label plus the degraded fraction when there is one. */
export function paperQuotePanelChipText(truth: PaperQuotePanelTruth): string {
  return truth.degradedCount > 0 && truth.total > 0
    ? `${truth.label} ${truth.degradedCount}/${truth.total}`
    : truth.label;
}
