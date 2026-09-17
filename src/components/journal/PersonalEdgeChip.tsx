"use client";
import * as React from "react";
import type { PersonalEdgeVM } from "@/lib/traderMemory/viewModels/selectPersonalEdge";

/**
 * PersonalEdgeChip — compact one-line Personal Edge indicator for the
 * Journal header (or any narrow surface). Shows resolution + overall
 * avgR + top strength when RESOLVED. Renders 'building' state when
 * below sample threshold (never fabricates edge).
 */

export interface PersonalEdgeChipProps {
  vm: PersonalEdgeVM;
  /**
   * THE CAP WAS ALREADY HERE, AND IT WAS SILENT — THE THIRD TIME.
   *
   * `selectPersonalEdge` returns `topN` buckets per side (default 3). This
   * chip rendered `topStrengths[0]` and `topWatch[0]` and said NOTHING about
   * the other two. On a panel whose whole job is to tell the trader where
   * they actually perform, "here is your worst context" is a materially
   * different sentence from "here is the worst of three, and there are two
   * more you are not being shown".
   *
   * Docked now ACCOUNTS for the remainder instead of dropping it. ENTER
   * uncaps it. Same shape as `MirrorPanel`'s evidence chips and
   * `DecisionChainPanel`'s hints — one rule, three panels.
   *
   * DEFAULTS FALSE, because a cap of one per side has always shipped and
   * this chip has two existing mounts (`/command-deck`, `/journal`) that
   * nobody asked this atom to redesign. The rule is not the literal value:
   * it is that a new prop leaves every existing mount exactly as the trader
   * last saw it.
   */
  unabridged?: boolean;
}

export function PersonalEdgeChip({ vm, unabridged = false }: PersonalEdgeChipProps) {
  if (vm.resolution === "UNKNOWN" && vm.totalDecisions === 0) {
    return null; // nothing to show
  }

  const color =
    vm.resolution === "RESOLVED" ? "#5cb85c" :
    vm.resolution === "PARTIAL"  ? "#c9a55c" :
                                    "#8a8271";

  /** Infinity, not a bigger number: "as many as I was handed" is the rule. */
  const bucketCap = unabridged ? Number.POSITIVE_INFINITY : 1;
  const strengths = vm.topStrengths.slice(0, bucketCap);
  const watches = vm.topWatch.slice(0, bucketCap);
  const withheld =
    vm.topStrengths.length - strengths.length + (vm.topWatch.length - watches.length);

  return (
    <div
      role="status"
      aria-label={`Personal Edge ${vm.resolution.toLowerCase()}. ${vm.headline}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        border: `1px solid ${color}40`,
        borderRadius: 8,
        background: "rgba(19,19,23,0.5)",
        fontSize: 11,
        color: "#ede6d3",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 9, letterSpacing: 0.3, textTransform: "uppercase", color: "#c9a55c", fontWeight: 700 }}>
        Personal Edge
      </span>
      <span
        style={{
          fontSize: 9,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          color,
          fontWeight: 700,
        }}
      >
        {vm.resolution}
      </span>
      {vm.overallAvgR !== "UNKNOWN" && (
        <span style={{ color: (vm.overallAvgR as number) >= 0 ? "#5cb85c" : "#c05a4a" }}>
          avg {(vm.overallAvgR as number).toFixed(2)}R
        </span>
      )}
      {strengths.map((b) => (
        <span key={`s:${b.label}`} style={{ color: "#5cb85c" }}>
          ↑ {b.label} · {(b.avgRealizedR as number).toFixed(2)}R (n={b.sampleCount})
        </span>
      ))}
      {watches.map((b) => (
        <span key={`w:${b.label}`} style={{ color: "#c05a4a" }}>
          ↓ {b.label} · {(b.avgRealizedR as number).toFixed(2)}R (n={b.sampleCount})
        </span>
      ))}
      {withheld > 0 && (
        <span data-personal-edge-buckets-withheld={withheld} style={{ color: "#8a8271", fontStyle: "italic" }}>
          {withheld} more context{withheld === 1 ? "" : "s"} not shown here
        </span>
      )}
      {vm.resolution === "UNKNOWN" && vm.totalDecisions > 0 && (
        <span style={{ color: "#8a8271", fontStyle: "italic" }}>
          building — {vm.totalDecisions}/{vm.sampleThreshold} decisions per bucket
        </span>
      )}
    </div>
  );
}

export default PersonalEdgeChip;
