"use client";
import * as React from "react";
import type { PersonalEdgeVM } from "@/lib/traderMemory/viewModels/selectPersonalEdge";

/**
 * PersonalEdgeChip — compact one-line Personal Edge indicator for the
 * Journal header (or any narrow surface). Shows resolution + overall
 * avgR + top strength when RESOLVED. Renders 'building' state when
 * below sample threshold (never fabricates edge).
 */

export function PersonalEdgeChip({ vm }: { vm: PersonalEdgeVM }) {
  if (vm.resolution === "UNKNOWN" && vm.totalDecisions === 0) {
    return null; // nothing to show
  }

  const color =
    vm.resolution === "RESOLVED" ? "#5cb85c" :
    vm.resolution === "PARTIAL"  ? "#c9a55c" :
                                    "#8a8271";

  const topStrength = vm.topStrengths[0];
  const topWatch = vm.topWatch[0];

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
      {topStrength && (
        <span style={{ color: "#5cb85c" }}>
          ↑ {topStrength.label} · {(topStrength.avgRealizedR as number).toFixed(2)}R (n={topStrength.sampleCount})
        </span>
      )}
      {topWatch && (
        <span style={{ color: "#c05a4a" }}>
          ↓ {topWatch.label} · {(topWatch.avgRealizedR as number).toFixed(2)}R (n={topWatch.sampleCount})
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
