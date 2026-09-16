"use client";

import * as React from "react";

import type { CapitalPostureVM } from "@/lib/experience/selectCapitalPosture";

/**
 * CapitalPostureLine — the protection/humility half of the RISK attachment.
 *
 * Renders directly beneath `AvailableRChip` inside the deck's `scene-risk`
 * region. The two lines answer the two halves of the only risk question that
 * matters before a decision: "how much can I lose on the next one" (R) and
 * "what am I already holding" (posture). Until this shipped the deck answered
 * only the first, and answered the second with blank space.
 *
 * ── Material rules (SCENE_FRAGMENTATION repair, same as AvailableRChip) ───────
 *
 * No box, no card outline, no full-width border. RISK is an aspect of the room,
 * not a resident of it. A 2px brass left-edge hairline is the only structure,
 * and its opacity is the ONLY thing the tone changes — an absence reads as calm
 * negative space, a live exposure reads as a lit edge. Nothing here animates:
 * PRICE MAY ONLY MOVE WHEN TRUTH MOVES, and this line carries no price.
 */
export interface CapitalPostureLineProps {
  readonly vm: CapitalPostureVM;
}

/** Brass-family edge accents. Exported so the guard can assert no new palette. */
export const CAPITAL_POSTURE_EDGE: Readonly<Record<CapitalPostureVM["tone"], string>> = {
  EXPOSED: "rgba(201,165,92,0.55)",
  UNSETTLED: "rgba(201,165,92,0.35)",
  SETTLED: "rgba(139,106,41,0.28)",
  // Quietest of the four on purpose — see the UNREAD reasoning in the selector.
  UNREAD: "rgba(139,106,41,0.10)",
};

export function CapitalPostureLine({ vm }: CapitalPostureLineProps): React.ReactElement {
  return (
    <section
      data-testid="capital-posture-line"
      data-tone={vm.tone}
      // The whole line is one label, because a screen reader that reads the
      // headline without the qualifier hears "POSITION UNCONFIRMED" as a
      // finding. The disclosure must not be optional to hear.
      aria-label={`Capital posture: ${vm.label}. ${vm.detail}`}
      style={{
        borderLeft: `2px solid ${CAPITAL_POSTURE_EDGE[vm.tone]}`,
        padding: "8px 14px",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: 9,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: "#c9a55c",
          fontWeight: 800,
        }}
      >
        Capital
      </span>
      <span
        data-testid="capital-posture-label"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 16,
          // An absence is never rendered in the ivory reserved for findings.
          color: vm.isAbsence ? "#8a8271" : vm.tone === "EXPOSED" ? "#ede6d3" : "#c9a55c",
          letterSpacing: 0.2,
        }}
      >
        {vm.label}
      </span>
      <span
        data-testid="capital-posture-detail"
        style={{
          fontSize: 10,
          letterSpacing: 0.2,
          color: "#8a8271",
          flex: "1 1 220px",
          minWidth: 0,
        }}
      >
        {vm.detail}
      </span>
    </section>
  );
}

export default CapitalPostureLine;
