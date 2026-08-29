"use client";

/**
 * TruthStatusChip — canon §TRUTH STATUS LABELS single-writer chip
 * (ATHOS Master Manual v2.0 — 2026-07-28).
 *
 * Every WM Pro surface that shows an evidence-strength label MUST
 * render it through this chip so:
 *
 *   1. The 11 canon labels are the ONLY strings shown for evidence
 *      strength (never invents "MAYBE", "GOOD", etc.).
 *   2. The visual weighting follows canon §"The screen gets quieter
 *      when confidence is lower" — strong statuses read bold and gold,
 *      weak statuses read muted grey.
 *   3. Failure to supply a canonical status key is a compile error
 *      (TruthStatusKey enum-narrow).
 *
 * Silent when passed no status (canon §Silence Is A Feature — a
 * report with nothing to report should render nothing, not a
 * placeholder).
 */

import * as React from "react";
import {
  CANONICAL_TRUTH_STATUS,
  TRUTH_STATUS_RANK,
  type TruthStatusKey,
  type TruthStatusReport,
} from "@/lib/truthStatus/truthStatusLabels";

export interface TruthStatusChipProps {
  /** Status key OR full report; report populates tooltip narrative. */
  readonly status?: TruthStatusKey;
  readonly report?: TruthStatusReport;
  readonly className?: string;
}

// Canon §"The screen gets quieter when confidence is lower" — tone by rank.
function toneForRank(rank: number): { fg: string; bg: string; border: string } {
  if (rank >= 9) {
    // VERIFIED / CORROBORATED — full gold
    return { fg: "#d4af37", bg: "rgba(212,175,55,0.10)", border: "rgba(212,175,55,0.55)" };
  }
  if (rank >= 6) {
    // PROVISIONAL / ESTIMATED / INFERRED — warm gold
    return { fg: "#c9a55c", bg: "rgba(201,165,92,0.08)", border: "rgba(201,165,92,0.40)" };
  }
  if (rank >= 3) {
    // ASSUMED / DISPUTED — dim gold, caution
    return { fg: "#b8925a", bg: "rgba(184,146,90,0.05)", border: "rgba(184,146,90,0.30)" };
  }
  if (rank >= 1) {
    // UNVERIFIED / UNKNOWN — muted grey
    return { fg: "#8a8271", bg: "rgba(138,130,113,0.04)", border: "rgba(138,130,113,0.25)" };
  }
  // FALSE_OR_CONTRADICTED / SUPERSEDED — dim orange
  return { fg: "#e07b5c", bg: "rgba(224,123,92,0.07)", border: "rgba(224,123,92,0.35)" };
}

export function TruthStatusChip({
  status,
  report,
  className,
}: TruthStatusChipProps): React.ReactElement | null {
  const key = status ?? report?.status;
  if (!key) return null;

  const label = CANONICAL_TRUTH_STATUS[key];
  const rank = TRUTH_STATUS_RANK[key];
  const tone = toneForRank(rank);

  // Compose an optional tooltip from the report narrative.
  let title = `Truth status: ${label}`;
  if (report) {
    const parts: string[] = [];
    if (report.claim) parts.push(report.claim);
    if (report.reason) parts.push(`Reason: ${report.reason}`);
    if (report.nextAction) parts.push(`Next: ${report.nextAction}`);
    if (report.asOfIso) parts.push(`As of: ${report.asOfIso}`);
    if (parts.length > 0) title = `${title}\n\n${parts.join("\n")}`;
  }

  return (
    <span
      className={className}
      data-testid="truth-status-chip"
      data-truth-status={key}
      role="status"
      aria-label={`Truth status: ${label}`}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: tone.fg,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default TruthStatusChip;
