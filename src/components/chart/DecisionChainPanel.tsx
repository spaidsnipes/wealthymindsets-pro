"use client";
import * as React from "react";
import type {
  DecisionChainVM,
  DecisionChainNode,
} from "@/lib/marketData/viewModels/selectDecisionChain";

/**
 * DecisionChainPanel — pure display of the Founder Decision Chain.
 *
 * Closes Founder Aug-13 §9 as a Command Deck consumer surface. Renders
 * the 9-node chain vertically with:
 *   - phase-aware headline dominating (1/3/1 rule §A09)
 *   - node column with label / verdict / indicator glyph
 *   - narrative row (dim) for progressive-disclosure (§A10)
 *   - non-color indicator dot in addition to color (§D — a11y)
 *   - onNodeClick handler for drill-through to the underlying VM
 *
 * Zero fabrication — UNKNOWN nodes render "?" not "0". No animation
 * unless explicitly requested.
 */

export interface DecisionChainPanelProps {
  vm: DecisionChainVM;
  /** Called when a node is clicked — enables Command Deck drill-through. */
  onNodeClick?: (node: DecisionChainNode) => void;
  /** Show detailed narratives beneath each node. Default true. */
  showNarratives?: boolean;
  className?: string;
}

const INDICATOR_STYLES: Record<DecisionChainNode["indicator"], { color: string; glyph: string; label: string }> = {
  OK:      { color: "#5cb85c", glyph: "●", label: "OK" },
  WATCH:   { color: "#c9a55c", glyph: "◐", label: "Watch" },
  WARN:    { color: "#c05a4a", glyph: "!", label: "Warn" },
  UNKNOWN: { color: "#55503f", glyph: "?", label: "Unknown" },
};

export function DecisionChainPanel({
  vm,
  onNodeClick,
  showNarratives = true,
  className,
}: DecisionChainPanelProps) {
  const summary = vm.summary;

  return (
    <div
      className={["wm-decision-chain", className ?? ""].join(" ")}
      role="region"
      aria-label={`Decision chain — ${vm.phase.toLowerCase()} phase`}
      style={{
        border: "1px solid rgba(139,106,41,0.35)",
        borderRadius: 10,
        background: "rgba(11,11,13,0.9)",
        padding: 16,
      }}
    >
      {/* Headline row — 1s hero truth per Founder §A09 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 9,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "#c9a55c",
              fontWeight: 800,
            }}
          >
            Decision chain
          </span>
          <span style={{ fontSize: 9, color: "#55503f" }}>·</span>
          <span
            style={{
              fontSize: 9,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "#8a8271",
            }}
          >
            {vm.phase.toLowerCase().replace(/_/g, " ")} phase
          </span>
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#ede6d3",
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          {vm.headline}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#55503f",
            marginTop: 6,
            letterSpacing: 0.2,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>
            <span style={{ color: "#5cb85c" }}>●</span> {summary.ok} OK
          </span>
          <span>
            <span style={{ color: "#c9a55c" }}>◐</span> {summary.watch} watch
          </span>
          <span>
            <span style={{ color: "#c05a4a" }}>!</span> {summary.warn} warn
          </span>
          <span>
            <span style={{ color: "#55503f" }}>?</span> {summary.unknown} unknown
          </span>
        </div>
      </div>

      {/* Node column */}
      <div
        role="list"
        aria-label="Decision chain nodes"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        {vm.nodes.map((node) => {
          const ind = INDICATOR_STYLES[node.indicator];
          const clickable = !!onNodeClick;
          const label = `${node.label}: ${node.verdict}, ${ind.label.toLowerCase()}${node.reason ? `. ${node.reason}` : ""}`;
          return (
            <button
              key={node.key}
              type="button"
              role="listitem"
              aria-label={label}
              disabled={!clickable}
              onClick={clickable ? () => onNodeClick!(node) : undefined}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                textAlign: "left",
                padding: "10px 12px",
                minHeight: 44,
                borderRadius: 6,
                border: `1px solid ${ind.color}30`,
                background: "rgba(19,19,23,0.5)",
                cursor: clickable ? "pointer" : "default",
                color: "#ede6d3",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  color: ind.color,
                  fontSize: 12,
                  fontWeight: 700,
                  minWidth: 16,
                  textAlign: "center",
                  marginTop: 2,
                }}
              >
                {ind.glyph}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: 0.32,
                      textTransform: "uppercase",
                      color: "#8a8271",
                      fontWeight: 700,
                      minWidth: 96,
                    }}
                  >
                    {node.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: ind.color,
                      fontWeight: 600,
                      letterSpacing: 0.2,
                    }}
                  >
                    {node.verdict}
                  </span>
                </div>
                {showNarratives && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8a8271",
                      lineHeight: 1.5,
                      marginTop: 4,
                    }}
                  >
                    {node.narrative}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DecisionChainPanel;
