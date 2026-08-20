"use client";

/**
 * OneStoryStrip — compact renderer for selectOneStory (canon §7).
 *
 * Founder 2029 Integration Glue canon §7 ONE STORY COMPILER:
 *   PRIMARY / CONTRADICTION / MISSING / DECISION as at-most-four
 *   live outputs. This strip renders all four honestly in one
 *   compact horizontal band suitable for above-the-fold placement
 *   without competing with the chart or the numbered sections
 *   below.
 *
 * Consumes an OneStoryVM produced by src/lib/marketData/viewModels/
 * selectOneStory. Pure display — no derivation, no fabrication.
 * When contradiction or missing are null, those slots hide instead
 * of showing empty labels (canon §Auto-Quiet).
 */

import * as React from "react";
import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";

export interface OneStoryStripProps {
  readonly vm: OneStoryVM;
}

const DECISION_COLOR: Record<OneStoryVM["decision"]["value"], string> = {
  ACTION:     "#d4af37",   // gold — verified path
  CAUTION:    "#c9a55c",   // dim gold — soft-yellow
  WAIT:       "#e07b5c",   // amber — evidence pending or debt unpaid
  "NO TRADE": "#e07b5c",   // amber — hard block
  UNKNOWN:    "#8a8271",   // muted — nothing to say
};

const DECISION_BG: Record<OneStoryVM["decision"]["value"], string> = {
  ACTION:     "rgba(212,175,55,0.10)",
  CAUTION:    "rgba(201,165,92,0.06)",
  WAIT:       "rgba(224,123,92,0.08)",
  "NO TRADE": "rgba(224,123,92,0.12)",
  UNKNOWN:    "rgba(255,255,255,0.02)",
};

const DECISION_BORDER: Record<OneStoryVM["decision"]["value"], string> = {
  ACTION:     "rgba(212,175,55,0.55)",
  CAUTION:    "rgba(201,165,92,0.32)",
  WAIT:       "rgba(224,123,92,0.45)",
  "NO TRADE": "rgba(224,123,92,0.55)",
  UNKNOWN:    "rgba(139,106,41,0.35)",
};

export function OneStoryStrip({ vm }: OneStoryStripProps): React.ReactElement {
  const decisionColor = DECISION_COLOR[vm.decision.value];
  const decisionBg    = DECISION_BG[vm.decision.value];
  const decisionBorder= DECISION_BORDER[vm.decision.value];

  return (
    <section
      aria-label="Market story"
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 12,
        padding: "10px 14px",
        border: `1px solid ${decisionBorder}`,
        borderRadius: 10,
        background: decisionBg,
        flexWrap: "wrap",
      }}
    >
      {/* Primary sentence — always renders */}
      <div style={{ flex: "1 1 240px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#8a8271",
          }}
        >
          Market
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#ede6d3",
            lineHeight: 1.3,
          }}
        >
          {vm.primary}
        </div>
      </div>

      {/* Contradiction — only when present (canon Auto-Quiet) */}
      {vm.contradiction && (
        <div style={{ flex: "1 1 200px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, borderLeft: "1px solid rgba(139,106,41,0.20)", paddingLeft: 12 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              fontFamily: "Georgia, 'Times New Roman', serif",
              color: "#e07b5c",
            }}
          >
            Contradiction
          </div>
          <div style={{ fontSize: 11, color: "#e07b5c", lineHeight: 1.3 }}>
            {vm.contradiction}
          </div>
        </div>
      )}

      {/* Missing — only when present */}
      {vm.missing && (
        <div style={{ flex: "1 1 180px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, borderLeft: "1px solid rgba(139,106,41,0.20)", paddingLeft: 12 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              fontFamily: "Georgia, 'Times New Roman', serif",
              color: "#8a8271",
            }}
          >
            Missing
          </div>
          <div style={{ fontSize: 11, color: "#c9a55c", lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}>
            {vm.missing}
          </div>
        </div>
      )}

      {/* Decision chip — always renders, borrows Right-of-Way tone */}
      <div
        aria-label={`Decision: ${vm.decision.value}. ${vm.decision.detail}`}
        style={{
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 14px",
          borderRadius: 8,
          border: `1px solid ${decisionBorder}`,
          background: decisionBg,
          minWidth: 96,
        }}
      >
        <div
          style={{
            fontSize: 8,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#8a8271",
          }}
        >
          Decision
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: decisionColor, letterSpacing: 0.4, textAlign: "center" }}>
          {vm.decision.value}
        </div>
      </div>
    </section>
  );
}

export default OneStoryStrip;
