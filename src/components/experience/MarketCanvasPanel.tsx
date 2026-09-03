"use client";

/**
 * MarketCanvasPanel — the canon §Phase 3 Market Canvas visible surface.
 *
 * Renders three of the four canvas corners in one panel:
 *   • MISSING?             (canonical UNKNOWN — unresolved dimensions)
 *   • WHY NOT?             (compiled RightOfWay blockers)
 *   • WHAT WOULD INVALIDATE (ACTION-only — what observation would flip it)
 *
 * The fourth corner — WHY? — remains WhyInspector's job, because WHY is
 * per-target (hero / story / DLAR dim / CLC leg) and cannot be composed
 * generically here without losing the evidence detail. This panel focuses
 * on the DECISION-scope canvas questions.
 *
 * Single-writer for the canvas — every deck that surfaces "why not /
 * missing / would invalidate" must route through this component so the
 * shape stays canonical across Phase 3 consumers.
 *
 * Pure render — consumes selectMarketCanvas VM. Silent by design when
 * a corner is empty (canon §Silence Is A Feature — do not render
 * "Nothing missing" placeholders; render nothing).
 */

import * as React from "react";
import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";

export interface MarketCanvasPanelProps {
  readonly vm: MarketCanvasVM;
  readonly className?: string;
}

const HAIR = "rgba(139,106,41,0.22)";
const MUTED = "#8a8271";

const VERDICT_TONE: Record<MarketCanvasVM["verdict"], string> = {
  ACTION: "#d4af37",
  CAUTION: "#c9a55c",
  WAIT: "#c9a55c",
  "NO TRADE": "#e07b5c",
  UNKNOWN: "#8a8271",
};

export function MarketCanvasPanel({ vm, className }: MarketCanvasPanelProps): React.ReactElement {
  const anyBodyPresent =
    vm.missing.length > 0 ||
    vm.resolved.length > 0 ||
    vm.blockers.length > 0 ||
    vm.clearances.length > 0 ||
    vm.invalidators.length > 0;

  return (
    <section
      aria-label="Market canvas — decision"
      className={className}
      data-testid="market-canvas-panel"
      style={{
        border: `1px solid ${HAIR}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: anyBodyPresent ? 10 : 0 }}>
        <span style={{ fontSize: 11, letterSpacing: 0.6, color: "#c9a55c", textTransform: "uppercase" }}>
          Market canvas
        </span>
        <span style={{ fontSize: 10, letterSpacing: 0.5, color: VERDICT_TONE[vm.verdict], marginLeft: "auto", textTransform: "uppercase" }}>
          {vm.verdict}
        </span>
      </header>

      <div style={{ fontSize: 12, color: "#d8cfb8", lineHeight: 1.4, marginBottom: anyBodyPresent ? 10 : 0 }}>
        {vm.headline}
      </div>

      {vm.resolved.length > 0 && (
        <div
          data-testid="market-canvas-resolved"
          style={{ marginBottom: (vm.missing.length || vm.blockers.length || vm.invalidators.length) ? 10 : 0 }}
        >
          {/* canon §Phase 3 Market Canvas — RESOLVED. Symmetric to
              MISSING: names each canonical dimension the snapshot has
              resolved (or resolved-partial). Silent when nothing is
              resolved (canon §Silence). */}
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: "#7ac57a", marginBottom: 4, textTransform: "uppercase" }}>
            Resolved ({vm.resolved.length})
          </div>
          <div style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>
            {vm.resolved.join(", ")}
          </div>
        </div>
      )}

      {vm.missing.length > 0 && (
        <div
          data-testid="market-canvas-missing"
          style={{ marginBottom: (vm.blockers.length || vm.invalidators.length) ? 10 : 0 }}
        >
          {/* These are state.unknowns — canonical DIMENSIONS that have not
              resolved. They do not gate the verdict; blockers do. "Missing"
              implied they were unpaid required evidence, so the panel appeared
              to contradict an ACTION verdict rendered right above it. */}
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>
            Unresolved ({vm.missing.length})
          </div>
          {vm.missing.slice(0, 6).map((m, i) => (
            <div key={i} style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>{m}</div>
          ))}
          {vm.missing.length > 6 && (
            <div style={{ fontSize: 9, color: MUTED, fontStyle: "italic" }}>+{vm.missing.length - 6} more</div>
          )}
        </div>
      )}

      {vm.blockers.length > 0 && (
        <div
          data-testid="market-canvas-blockers"
          style={{ marginBottom: (vm.clearances.length || vm.invalidators.length) ? 10 : 0 }}
        >
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: "#e07b5c", marginBottom: 4, textTransform: "uppercase" }}>
            Why not ({vm.blockers.length})
          </div>
          {/* Every blocker renders. The header already disclosed the count,
              but a blocker the trader cannot READ is one they cannot clear —
              and these are the reasons not to put money at risk. */}
          {vm.blockers.map((b, i) => (
            <div key={i} style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>{b}</div>
          ))}
        </div>
      )}

      {vm.clearances.length > 0 && (
        <div
          data-testid="market-canvas-clearances"
          style={{ marginBottom: vm.invalidators.length ? 10 : 0 }}
        >
          {/* CLEARED — the affirmative ledger from DecisionWhyVM. Names
              each check that IS satisfied. Founder-visible symmetry with
              WHY NOT: the trader can see what already passed alongside
              what is still blocking. */}
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: "#7ac57a", marginBottom: 4, textTransform: "uppercase" }}>
            Cleared ({vm.clearances.length})
          </div>
          {vm.clearances.slice(0, 6).map((c, i) => (
            <div key={i} style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>{c}</div>
          ))}
          {vm.clearances.length > 6 && (
            <div style={{ fontSize: 10, color: "#8a8578", lineHeight: 1.4, fontStyle: "italic" }}>
              +{vm.clearances.length - 6} more cleared, not shown
            </div>
          )}
        </div>
      )}

      {vm.invalidators.length > 0 && (
        <div
          data-testid="market-canvas-invalidators"
          style={{ paddingTop: (vm.missing.length || vm.blockers.length || vm.clearances.length) ? 6 : 0, borderTop: (vm.missing.length || vm.blockers.length || vm.clearances.length) ? `1px solid ${HAIR}` : "none" }}
        >
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: "#c9a55c", marginBottom: 4, textTransform: "uppercase" }}>
            Would invalidate
          </div>
          {vm.invalidators.map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>{s}</div>
          ))}
        </div>
      )}
    </section>
  );
}

export default MarketCanvasPanel;
