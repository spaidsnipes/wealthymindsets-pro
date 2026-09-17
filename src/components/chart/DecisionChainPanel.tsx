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
  /**
   * Give the chain its full professional depth.
   *
   * WHAT IT BUYS, AND WHY THAT IS DEPTH AND NOT A RESIZE
   * ----------------------------------------------------
   * A node's `hints` are its EVIDENCE — "account equity not observed this
   * session", "broker link not established", "hard rule engaged". They are the
   * reason the trader does not have to open WhyInspector to learn why a node is
   * UNKNOWN. In the equipment dock this panel sits in a slot beside the chart,
   * and nine nodes' worth of evidence chips there is a wall; at full screen
   * there is no reason to withhold lines the selector already handed over.
   *
   * WHY THE DOCKED CAP IS ACCOUNTED AND NOT SILENT
   * ----------------------------------------------
   * The overflow chip states the count. A chip row that simply stopped would be
   * this panel telling the trader it had shown them the evidence when it had
   * shown them some of it — the same inversion the `reason` row below was
   * written against. Declining to draw a row you hold is a display choice, and
   * a display choice has to say so.
   *
   * DEFAULTS TRUE. This panel's only in-room mount lives in a full-width drawer
   * section and predates the cap; defaulting false would have made adding an
   * equipment door a silent subtraction from a surface nobody asked to change.
   */
  readonly unabridged?: boolean;
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
  unabridged = true,
}: DecisionChainPanelProps) {
  const summary = vm.summary;
  /** Infinity, not a bigger number: "as many as I was handed" is the rule. */
  const hintCap = unabridged ? Number.POSITIVE_INFINITY : 3;

  return (
    <div
      className={["wm-decision-chain", className ?? ""].join(" ")}
      role="region"
      aria-label={`Decision chain — ${vm.phase.toLowerCase()} phase`}
      style={{
        // SCENE_FRAGMENTATION cure: DecisionChain used to render as
        // another opaque brass-bordered card inside the deck. The
        // chain is the SPINE of the decision, not a separate module
        // beside it. Hairline top + transparent lets the sanctuary
        // atmosphere continue through it.
        borderTop: "1px solid rgba(139,106,41,0.22)",
        background: "transparent",
        padding: "12px 0 4px",
      }}
    >
      {/* Headline row — 1s hero truth per Founder §A09 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11,
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
              fontSize: 11,
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
            fontSize: 11,
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
        // NO CARD-MUSEUM REGRESSION (visual canon, 2026-08-27).
        //
        // The container above already carries the SCENE_FRAGMENTATION cure —
        // hairline top, transparent ground — but the cure stopped at the
        // container and the nodes underneath stayed nine separate bordered,
        // filled boxes with an 8px gutter between them. Measured in
        // /tmp/geometry-decision-chain-panel-1440.png: nine floating cards
        // stacked down a near-empty 1440px field.
        //
        // The canon names this exact failure class and its repair: "ONE
        // DECISION. ONE MARKET ROOM. MANY CONTEXTUAL LAYERS." A chain that
        // renders as nine boxes asks the eye to cross nine borders to read one
        // decision, which is the opposite of a chain — it is a museum of nodes.
        //
        // So the gutter closes to zero and the nodes are separated by a single
        // brass hairline, the same value the container's own top edge uses.
        // The chain now reads as ONE continuous spine whose segments happen to
        // be individually inspectable. Nothing is removed; the boxes are.
        style={{ display: "flex", flexDirection: "column", gap: 0 }}
      >
        {vm.nodes.map((node, nodeIndex) => {
          const ind = INDICATOR_STYLES[node.indicator];
          const clickable = !!onNodeClick;
          const hintEvidence = node.hints?.length ? `. Evidence: ${node.hints.join("; ")}` : "";
          /**
           * THE ARIA-LABEL MUST NOT KNOW MORE THAN THE SCREEN.
           *
           * `node.reason` has been composed into this string since the panel
           * shipped, and until 2026-09-17 it was rendered NOWHERE ELSE. The
           * visible column paints `node.label`, `node.verdict`, the indicator
           * glyph, `node.narrative` and `node.hints` — never `reason`.
           *
           * So a screen-reader user heard "Regime dimension has flipped
           * recently — treat as transitional, not stable." and the Founder
           * looking at his own deck did not. That is not an accessibility
           * courtesy running ahead; it is an accessibility INVERSION, and the
           * sighted trader was the one denied the sentence.
           *
           * It is also a distinct field, not a rewording: `selectRegime` sets
           * `narrative` to what the regime IS ("Regime value has changed across
           * the last 3 snapshots (TREND → BALANCE)") and `reason` to what to DO
           * about it ("treat as transitional, not stable"). Same for
           * `selectAuction` and `selectCLC`. Dropping `reason` from the label
           * would have "fixed" the mismatch by deleting the better sentence.
           *
           * The cure is therefore to PAINT it, below — and `decisionChainReasonIsVisible.test.ts`
           * now pins that every field this label reads is also rendered.
           */
          const label = `${node.label}: ${node.verdict}, ${ind.label.toLowerCase()}${node.reason ? `. ${node.reason}` : ""}${hintEvidence}`;
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
                padding: "10px 12px 10px 10px",
                minHeight: 44,
                borderRadius: 0,
                // The segment separator, not a box. First node has none: the
                // container's own hairline top is already the chain's head.
                borderTop: nodeIndex === 0 ? "none" : "1px solid rgba(139,106,41,0.12)",
                borderRight: "none",
                borderBottom: "none",
                // LOCALIZED PRACTICAL STATE LIGHT, not a border around
                // everything. Canon: "Color may support meaning but may never
                // replace it", and "UNKNOWN and degraded fidelity must look
                // visibly degraded." A box drawn around all nine nodes lights
                // the calm ones as loudly as the alarming one and so carries no
                // information. A 2px edge lit ONLY where the chain is warning or
                // watching puts the light where the state is — and OK/UNKNOWN
                // keep a transparent edge of the same width so nothing shifts
                // horizontally as a node changes state.
                borderLeft: `2px solid ${
                  node.indicator === "WARN" || node.indicator === "WATCH"
                    ? `${ind.color}99`
                    : "transparent"
                }`,
                // Transparent ground so the sanctuary atmosphere runs the whole
                // length of the chain instead of being interrupted nine times.
                background: "transparent",
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
                      fontSize: 11,
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
                {/* THE WEAKEST-LINK SENTENCE, now on the screen.
                    Deliberately NOT gated on `showNarratives`: that flag caps
                    how much of the chain's DESCRIPTION is shown, and a reason
                    is not a description — it is the caveat attached to this
                    node's verdict, which is the one thing a terse read most
                    needs. Gating it would re-open the aria-only hole through
                    the other branch.

                    Brighter than the narrative and marked with a leading rule
                    because it is an instruction, not prose. Silent when the
                    selector did not set one — most nodes do not. */}
                {node.reason && (
                  <div
                    data-decision-chain-reason={node.key}
                    style={{
                      fontSize: 11,
                      color: "#c9a55c",
                      lineHeight: 1.45,
                      marginTop: 5,
                      paddingLeft: 8,
                      borderLeft: "1px solid rgba(139,106,41,0.35)",
                    }}
                  >
                    {node.reason}
                  </div>
                )}
                {/* Structured hints — populated by the selector when the
                    node has supporting evidence (missing inputs, engaged
                    rules, warnings). Rendered as chips so the trader
                    inspects WHY a node is UNKNOWN/WATCH/WARN without
                    opening WhyInspector. Silent when hints unset. */}
                {node.hints && node.hints.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {node.hints.slice(0, hintCap).map((h, i) => {
                      const tone = node.hintTones?.[i] ?? "missing";
                      const color =
                        tone === "warn"    ? "#c05a4a" :
                        tone === "watch"   ? "#c9a55c" :
                                             "#8a8271";
                      return (
                        <span
                          key={`${node.key}-hint-${i}`}
                          title={h}
                          style={{
                            fontSize: 11,
                            letterSpacing: 0.24,
                            padding: "2px 6px",
                            borderRadius: 3,
                            border: `1px solid ${color}55`,
                            color,
                            background: "rgba(19,19,23,0.5)",
                            // A HINT IS THE REASON, SO IT MAY NOT BE CUT OFF.
                            //
                            // This chip used to be `nowrap` + `ellipsis` under
                            // a hard 220px cap. Measured 2026-09-16 at a 1440px
                            // viewport — with most of the panel empty — the
                            // AVAILABLE R hint rendered as "account equity not
                            // observed this sess…" while its sibling "broker
                            // link not established" fit. The cap is not width
                            // pressure; it truncated at every viewport.
                            //
                            // These chips exist so the trader can read WHY a
                            // node is UNKNOWN without opening WhyInspector.
                            // An elided reason sends them to the drawer anyway,
                            // which is the exact burden the chips removed. The
                            // `title` attribute is not an answer either: it is
                            // hover-only, so it does not exist on touch and is
                            // invisible to a five-second gaze.
                            //
                            // 220px stays as a WRAP WIDTH, not a clip: the row
                            // is already `flexWrap: "wrap"`, so a long hint now
                            // takes a second line inside its own chip and the
                            // chip rhythm survives. Nothing is hidden.
                            maxWidth: 220,
                            lineHeight: 1.35,
                          }}
                        >
                          {h}
                        </span>
                      );
                    })}
                    {/* THE CAP ACCOUNTS FOR ITSELF.
                        A chip row that simply stopped at three would be this
                        panel showing the trader SOME of the evidence while
                        looking exactly like a panel that had shown them all of
                        it. Declining to draw a row you are holding is a display
                        choice, and a display choice has to say so — ENTER is
                        where the rest lives. */}
                    {node.hints.length > hintCap && (
                      <span
                        data-decision-chain-hints-withheld={node.key}
                        style={{
                          fontSize: 11,
                          letterSpacing: 0.24,
                          padding: "2px 6px",
                          color: "#8a8271",
                          lineHeight: 1.35,
                        }}
                      >
                        +{node.hints.length - hintCap} more evidence
                      </span>
                    )}
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
