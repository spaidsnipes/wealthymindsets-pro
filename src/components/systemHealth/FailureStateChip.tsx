"use client";

/**
 * FailureStateChip — canon §Failure + Recovery Grammar single-writer
 * (WM Constitution 2026-08-28).
 *
 * Renders the 6 canon subsystem-health states — NORMAL / DEGRADED /
 * BLOCKED / UNAVAILABLE / RECOVERING / UNKNOWN — from a
 * FailureStateReport. Every WM Pro surface that shows a subsystem's
 * health MUST route through this chip so:
 *
 *   1. The 6 canon states are the ONLY strings shown for health
 *      (never invents "ERROR", "OFFLINE", "SICK", etc.).
 *   2. NORMAL renders quietly (canon §"Normal inactivity is not
 *      failure") — a small green dot with no big label.
 *   3. Non-NORMAL surfaces the affected + reason + nextSafeAction
 *      fields in the tooltip so the trader never has to diagnose
 *      infrastructure.
 *
 * Companion to <TruthStatusChip> (evidence strength) and
 * <CanonicalFidelityBadge> (market-data fidelity) — three different
 * concerns, same single-writer / many-readers pattern.
 */

import * as React from "react";
import {
  type CanonicalFailureState,
  type FailureStateReport,
} from "@/lib/systemHealth/failureStateGrammar";

export interface FailureStateChipProps {
  /** State-only shorthand OR full report; report populates tooltip. */
  readonly state?: CanonicalFailureState;
  readonly report?: FailureStateReport;
  readonly className?: string;
}

const TONE: Record<CanonicalFailureState, { fg: string; bg: string; border: string }> = {
  NORMAL:      { fg: "#7ac57a", bg: "rgba(122,197,122,0.08)", border: "rgba(122,197,122,0.35)" },
  DEGRADED:    { fg: "#c9a55c", bg: "rgba(201,165,92,0.08)",  border: "rgba(201,165,92,0.40)" },
  BLOCKED:     { fg: "#e07b5c", bg: "rgba(224,123,92,0.10)",  border: "rgba(224,123,92,0.45)" },
  UNAVAILABLE: { fg: "#8a8271", bg: "rgba(138,130,113,0.06)", border: "rgba(138,130,113,0.30)" },
  RECOVERING:  { fg: "#c9a55c", bg: "rgba(201,165,92,0.06)",  border: "rgba(201,165,92,0.35)" },
  UNKNOWN:     { fg: "#8a8271", bg: "rgba(138,130,113,0.04)", border: "rgba(138,130,113,0.25)" },
};

function buildTooltip(state: CanonicalFailureState, report?: FailureStateReport): string {
  let title = `Subsystem health: ${state}`;
  if (!report) return title;
  const lines: string[] = [];
  if (report.affected) lines.push(`Affected: ${report.affected}`);
  if (report.stillWorks) lines.push(`Still works: ${report.stillWorks}`);
  if (report.reason) lines.push(`Reason: ${report.reason}`);
  if (report.userImpact) lines.push(`Impact: ${report.userImpact}`);
  if (report.nextSafeAction) lines.push(`Next: ${report.nextSafeAction}`);
  if (report.recoveredWhen) lines.push(`Recovered when: ${report.recoveredWhen}`);
  if (report.lastKnownGood?.atIso) {
    lines.push(`Last good: ${report.lastKnownGood.atIso}${report.lastKnownGood.detail ? ` — ${report.lastKnownGood.detail}` : ""}`);
  }
  if (lines.length > 0) title = `${title}\n\n${lines.join("\n")}`;
  return title;
}

export function FailureStateChip({
  state,
  report,
  className,
}: FailureStateChipProps): React.ReactElement | null {
  const s = state ?? report?.state;
  if (!s) return null;

  const tone = TONE[s];
  const title = buildTooltip(s, report);

  // canon §"Normal inactivity is not failure" — NORMAL renders as a
  // quiet dot without the loud label. Every other state renders the
  // full pill.
  if (s === "NORMAL") {
    return (
      <span
        className={className}
        data-testid="failure-state-chip"
        data-failure-state="NORMAL"
        role="status"
        aria-label="Subsystem health: NORMAL"
        title={title}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 9,
          color: tone.fg,
          letterSpacing: 0.3,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: tone.fg,
          }}
        />
      </span>
    );
  }

  return (
    <span
      className={className}
      data-testid="failure-state-chip"
      data-failure-state={s}
      role="status"
      aria-label={`Subsystem health: ${s}`}
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
      {s}
    </span>
  );
}

export default FailureStateChip;
