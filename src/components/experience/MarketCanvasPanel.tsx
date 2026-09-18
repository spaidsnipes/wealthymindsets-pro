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
  /**
   * Give the panel its full professional depth. The six-item caps below exist
   * because this panel normally lives in a tight slot beneath the chart; when
   * it is handed the whole screen there is no reason to withhold lines it was
   * already given.
   *
   * TWO KINDS OF "MORE", AND ONLY ONE OF THEM IS A DISPLAY CHOICE
   * -------------------------------------------------------------
   * `+N more` on unresolved/cleared is this component declining to draw rows
   * it holds. Room cures it.
   *
   * `+N more blocking, not named here` is NOT that. The blockers array arrives
   * from the compiler already capped at 3 labels per evidence bucket, so those
   * labels do not exist at this layer and no amount of screen conjures them.
   * It survives `unabridged` deliberately. Letting a bigger viewport silence it
   * would turn a standing gap in the data into a clean-looking full experience
   * — the trader would read "everything is named" off a surface that simply
   * stopped admitting it wasn't.
   */
  readonly unabridged?: boolean;
}

const HAIR = "rgba(139,106,41,0.22)";
const MUTED = "#8a8271";

/**
 * §9 — "No green shield. No green means safe."
 *
 * The RESOLVED and CLEARED section labels used to render in #7ac57a. Both name
 * things that WENT WELL — dimensions the snapshot resolved, checks that passed
 * — and printing them green beside the MISSING and BLOCKED sections turns the
 * panel into a traffic light. The canon this panel implements is explicit that
 * resolved-partial counts as resolved, so the green also overstated: a
 * dimension the snapshot only partly resolved lit the same colour as one it
 * resolved outright.
 *
 * Ivory is the house colour for a FINDING, and a resolved dimension is a
 * finding. The warm tones stay where they are, on what is still outstanding.
 */
const RESOLVED_LABEL = "#ede6d3";

const VERDICT_TONE: Record<MarketCanvasVM["verdict"], string> = {
  ACTION: "#d4af37",
  CAUTION: "#c9a55c",
  WAIT: "#c9a55c",
  "NO TRADE": "#e07b5c",
  UNKNOWN: "#8a8271",
};

export function MarketCanvasPanel({
  vm,
  className,
  unabridged = false,
}: MarketCanvasPanelProps): React.ReactElement {
  /** Infinity, not a bigger number: "as many as I was handed" is the rule. */
  const cap = unabridged ? Number.POSITIVE_INFINITY : 6;

  /**
   * THE LEDGERS COMPOSE SIDEWAYS WHEN THERE IS SIDEWAYS TO USE.
   *
   * Measured live on /command-deck at FULL: RESOLVED / UNRESOLVED / WHY NOT /
   * CLEARED ran as one 11px column down the left of a 1568px screen with two
   * thirds of it black. That is a drawer that was stretched, not a complete
   * professional visual experience — and the acceptance question for the whole
   * equipment grammar is whether ENTER feels like depth or like a resize.
   *
   * `auto-fit` rather than a fixed column count: the same panel is handed to
   * consumers of every width, and a room with only one non-empty ledger must
   * not render a lone 240px stripe beside two voids. Nothing about WHICH rows
   * render changes here — this is arrangement, not disclosure. The shortfall
   * lines ride inside their own ledger and travel with it.
   */
  const ledgers: React.CSSProperties = unabridged
    ? {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 28,
        alignItems: "start",
      }
    : {};
  const anyBodyPresent =
    vm.missing.length > 0 ||
    vm.resolved.length > 0 ||
    vm.measured.length > 0 ||
    vm.blockerCount > 0 ||
    vm.clearances.length > 0 ||
    vm.invalidators.length > 0;

  return (
    <section
      aria-label="Market canvas — decision"
      className={className}
      data-testid="market-canvas-panel"
      style={{
        // SCENE_FRAGMENTATION cure: the market-canvas panel sits directly
        // beneath the chart; a full-box border made it read as a
        // separate "MissingEvidence / Blockers" mini-app. It is a
        // continuation of MARKET, not another card.
        borderTop: `1px solid ${HAIR}`,
        padding: "12px 0 4px",
        background: "transparent",
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

      <div data-testid="market-canvas-ledgers" style={ledgers}>
      {vm.resolved.length > 0 && (
        <div
          data-testid="market-canvas-resolved"
          style={{ marginBottom: (vm.missing.length || vm.blockerCount || vm.invalidators.length) ? 10 : 0 }}
        >
          {/* canon §Phase 3 Market Canvas — RESOLVED. Names each canonical
              dimension the snapshot has RESOLVED.
              "(or resolved-partial)" is what this comment used to say, and it
              was the defect: PARTIAL was ALSO swept into `missing` by the
              publisher, so three dimensions printed here AND in the column
              directly below, in the same frame — RESOLVED (4) beside
              UNRESOLVED (7), for eight dimensions. The three buckets are now
              disjoint by construction; see `DimensionStanding`. */}
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: RESOLVED_LABEL, marginBottom: 4, textTransform: "uppercase" }}>
            Resolved ({vm.resolved.length})
          </div>
          <div style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>
            {vm.resolved.join(", ")}
          </div>
        </div>
      )}

      {vm.measured.length > 0 && (
        <div
          data-testid="market-canvas-measured"
          style={{ marginBottom: (vm.missing.length || vm.blockerCount || vm.invalidators.length) ? 10 : 0 }}
        >
          {/* THE MIDDLE BUCKET, which had no column and therefore no home.
              A reading EXISTS for these — the profile chain returns POC/VAH/VAL
              off real populated buckets — it is simply not decision-grade. Told
              "unresolved", the trader waits for evidence already gathered. */}
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>
            Measured, not decision-grade ({vm.measured.length})
          </div>
          <div style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>
            {vm.measured.join(", ")}
          </div>
        </div>
      )}

      {vm.missing.length > 0 && (
        <div
          data-testid="market-canvas-missing"
          style={{ marginBottom: (vm.blockerCount || vm.invalidators.length) ? 10 : 0 }}
        >
          {/* These are state.unknowns — canonical DIMENSIONS that have not
              resolved. They do not gate the verdict; blockers do. "Missing"
              implied they were unpaid required evidence, so the panel appeared
              to contradict an ACTION verdict rendered right above it. */}
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 4, textTransform: "uppercase" }}>
            Unresolved ({vm.missing.length})
          </div>
          {vm.missing.slice(0, cap).map((m, i) => (
            <div key={i} style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>{m}</div>
          ))}
          {vm.missing.length > cap && (
            <div
              data-market-canvas-unresolved-withheld={vm.missing.length - cap}
              style={{ fontSize: 9, color: MUTED, fontStyle: "italic" }}
            >
              +{vm.missing.length - cap} more
            </div>
          )}
        </div>
      )}

      {vm.blockerCount > 0 && (
        <div
          data-testid="market-canvas-blockers"
          style={{ marginBottom: (vm.clearances.length || vm.invalidators.length) ? 10 : 0 }}
        >
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: "#e07b5c", marginBottom: 4, textTransform: "uppercase" }}>
            Why not ({vm.blockerCount})
          </div>
          {/* The header counts `blockerCount`, NOT the array. This used to read
              `vm.blockers.length` under a comment claiming "every blocker
              renders" — true of the array, false of the truth, because the
              array arrives already capped at 3 labels per evidence bucket. On a
              deck with 9 unpaid nodes it printed 6 and looked complete.

              A blocker the trader cannot READ is one they cannot clear, so the
              sample still renders in full — but the shortfall is now named
              rather than absorbed. */}
          {vm.blockers.map((b, i) => (
            <div key={i} style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>{b}</div>
          ))}
          {vm.blockerCount > vm.blockers.length && (
            <div
              data-testid="market-canvas-blockers-remainder"
              style={{ fontSize: 10, color: "#8a8578", lineHeight: 1.4, fontStyle: "italic" }}
            >
              +{vm.blockerCount - vm.blockers.length} more blocking, not named here
            </div>
          )}
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
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: RESOLVED_LABEL, marginBottom: 4, textTransform: "uppercase" }}>
            Cleared ({vm.clearances.length})
          </div>
          {vm.clearances.slice(0, cap).map((c, i) => (
            <div key={i} style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>{c}</div>
          ))}
          {vm.clearances.length > cap && (
            <div
              data-market-canvas-cleared-withheld={vm.clearances.length - cap}
              style={{ fontSize: 10, color: "#8a8578", lineHeight: 1.4, fontStyle: "italic" }}
            >
              +{vm.clearances.length - cap} more cleared, not shown
            </div>
          )}
        </div>
      )}
      </div>

      {/* WOULD INVALIDATE is deliberately OUTSIDE the ledger grid. It is not a
          fourth ledger — it is the line under all of them, the one observation
          that would flip the verdict the whole panel just argued for. Its
          borderTop only reads as a rule beneath the canvas if it spans it. */}
      {vm.invalidators.length > 0 && (
        <div
          data-testid="market-canvas-invalidators"
          style={{ paddingTop: (vm.missing.length || vm.blockerCount || vm.clearances.length) ? 6 : 0, borderTop: (vm.missing.length || vm.blockerCount || vm.clearances.length) ? `1px solid ${HAIR}` : "none" }}
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
