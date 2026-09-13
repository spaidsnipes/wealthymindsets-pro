"use client";

/**
 * DecisionSpineBand — the decision spine, on the scene, without a drawer.
 *
 * ── What was wrong ───────────────────────────────────────────────────────────
 *
 * `/charts` is the normal Founder route (`src/app/page.tsx` redirects to it).
 * Measured on 2026-09-12, the scene it renders carried ZERO references to any
 * decision identity, and of the five things the operating room is supposed to
 * show at all times:
 *
 *   NOW    — absent
 *   MARKET — present (the chart itself)
 *   RISK   — absent
 *   WHY    — behind `ShellModalDrawer` at ChartsDashboard.tsx:1388
 *   NEXT   — behind an `AnimatePresence` options toggle at :2024
 *
 * Three of the five were not on the scene, and two of those three required the
 * trader to already know to open a drawer. A spine you have to go looking for
 * is not a spine.
 *
 * ── What this component is NOT ───────────────────────────────────────────────
 *
 * It is not a second brain, a decision store, a status owner, or a new command
 * center. It computes NOTHING. Every field is handed in already-compiled by
 * `composeMarketCanvasVM` — the same compiler `/command-deck` and the Decision
 * Why drawer read — and this file only decides where the pixels go. If the two
 * surfaces ever disagree it will be because the compiler changed, which is the
 * only place a disagreement is allowed to come from.
 *
 * ── Absence is disclosed, never filled ───────────────────────────────────────
 *
 * Missing data is not 0.00 and UNKNOWN is not flat. Available R arrives from
 * `selectAvailableR` as the literal string "UNKNOWN" for each of its numbers
 * when inputs are missing; that string is rendered as itself. A null decision
 * id renders the REASON it is null, because "no decision has been born yet" and
 * "a decision exists and we lost it" are different facts and the trader is owed
 * the difference.
 */

import * as React from "react";

import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";
import type { DecisionWhyVM } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import type { AvailableRVM } from "@/lib/traderMemory/viewModels/selectAvailableR";

/** The MARKET cell's evidence. ROLE / SOURCE / asOf, or the absence of them. */
export interface SpineMarketEvidence {
  readonly symbol: string;
  readonly timeframe: string;
  /** Quality state straight off the canonical state. Never invented. */
  readonly quality: string | null;
  /** Epoch ms the canonical state was captured, or null when nothing sealed. */
  readonly capturedAt: number | null;
  readonly last: number | null;
}

export interface DecisionSpineBandProps {
  /** The one canonical id, or null when no lawful birth has occurred. */
  readonly decisionId: string | null;
  /** Why there is no id. Rendered verbatim when `decisionId` is null. */
  readonly decisionIdAbsence: string;
  readonly market: SpineMarketEvidence;
  readonly oneStory: OneStoryVM | null;
  readonly availableR: AvailableRVM | null;
  readonly decisionWhy: DecisionWhyVM | null;
  /** Human label for the attached expression, or null when the answer is WAIT. */
  readonly expression: string | null;
  /** Opens the full WHY drawer. The band is the summary, not a replacement. */
  readonly onOpenWhy?: () => void;
}

/**
 * WHY `flex-basis` IS A REAL NUMBER AND `minWidth` IS NOT 0.
 *
 * The band shipped as `flex: "1 1 0"` with `minWidth: 0`. That combination can
 * never wrap: `flex-wrap` only moves an item to the next line when the items
 * exceed their BASE size, and a base of 0 with no minimum simply shrinks
 * forever. Measured in Chrome at 390px — the primary device — the six cells
 * came out 240 / 30 / 30 / 30 / 30 / 30 px wide and 220px tall: five vertical
 * noodles of one character per line. Present in the DOM, addressable by every
 * test, and unreadable by a human.
 *
 * That is the defect class `scripts/audit-phone-parity.mjs` already names in
 * its own header — text crushed to nothing INSIDE the viewport — and the
 * nineteen `renderToStaticMarkup` tests beside this file were all green while
 * it was true, because static markup has no geometry.
 *
 * A real basis plus a real minimum means the row overflows honestly and wraps,
 * which is the whole reason `flexWrap: "wrap"` was on the container.
 */
const CELL_MIN = 148;

const CELL: React.CSSProperties = {
  flex: `1 1 ${CELL_MIN}px`,
  minWidth: CELL_MIN,
  padding: "6px 10px",
  borderLeft: "1px solid rgba(139,106,41,0.22)",
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const LABEL: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  color: "#8b8fa8",
  fontWeight: 700,
};

const VALUE: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.35,
  color: "#E2E8F0",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const MUTED: React.CSSProperties = { ...VALUE, color: "#8b8fa8" };

/**
 * Render an Available-R figure. The selector's UNKNOWN sentinel is a string,
 * so a naive `toFixed` would throw and a naive `?? 0` would fabricate a flat
 * risk-to-reward. Both are refused here.
 */
function rText(v: number | "UNKNOWN" | undefined): string {
  if (v === undefined || v === "UNKNOWN") return "UNKNOWN";
  return `${v.toFixed(2)}R`;
}

function asOfText(capturedAt: number | null): string {
  if (capturedAt === null) return "asOf UNKNOWN";
  return `asOf ${new Date(capturedAt).toISOString().slice(11, 19)}Z`;
}

export function DecisionSpineBand(props: DecisionSpineBandProps) {
  const { decisionId, decisionIdAbsence, market, oneStory, availableR, decisionWhy, expression } = props;

  return (
    <section
      className="wm-decision-spine"
      aria-label="Decision spine"
      style={{
        display: "flex",
        alignItems: "stretch",
        flexWrap: "wrap",
        // SCENE_FRAGMENTATION cure (Founder audit 2026-09-13): a
        // lighter-than-sanctuary background (#0D0E14) made the six-cell
        // spine read as a raised dashboard panel floating over MARKET.
        // The sanctuary field is #050506; the spine now inherits that
        // depth and is delineated only by hairlines top and bottom.
        background: "transparent",
        borderTop: "1px solid rgba(139,106,41,0.20)",
        borderBottom: "1px solid rgba(139,106,41,0.20)",
        flexShrink: 0,
      }}
    >
      <style>{`
        @media (max-width: 767px) {
          .wm-decision-spine {
            flex-wrap: nowrap !important;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
          }
          .wm-decision-spine::-webkit-scrollbar { display: none; }
          .wm-decision-spine > div {
            flex: 0 0 180px !important;
            min-width: 180px !important;
            max-width: 180px !important;
          }
        }
      `}</style>
      {/* DECISION_ID — the thing every other cell is about. */}
      <div style={{ ...CELL, flex: "1 1 220px", minWidth: 200, maxWidth: "100%", borderLeft: "none" }}>
        <span style={LABEL}>Decision</span>
        {decisionId ? (
          <code
            /**
             * THE ID WRAPS AND IS NEVER ELLIPSISED.
             *
             * It shipped as `whiteSpace: "nowrap"` on top of VALUE's
             * `overflow: hidden` + `textOverflow: ellipsis`. Measured at 834px
             * — the iPad — the box was 242px and the id was 264px, so it
             * rendered as `wmd_9f3c1a22-5e77-4a10-b2d4-7c918ee0d3…`.
             *
             * Truncating a price is ugly. Truncating an IDENTITY is a lie:
             * two different decisions sharing a prefix render identically, and
             * the one canonical id the whole band is about becomes unverifiable
             * against the journal. Absence is disclosed here, never filled —
             * a partial id is a filled absence wearing an ellipsis.
             *
             * So it wraps. `anywhere` because a uuid has no break opportunities
             * and `break-word` would leave the line overflowing anyway.
             */
            style={{
              ...VALUE,
              color: "#e8b923",
              fontWeight: 700,
              whiteSpace: "normal",
              overflow: "visible",
              textOverflow: "clip",
              overflowWrap: "anywhere",
            }}
            data-testid="spine-decision-id"
          >
            {decisionId}
          </code>
        ) : (
          <span style={MUTED} data-testid="spine-decision-absent">{decisionIdAbsence}</span>
        )}
      </div>

      <div style={CELL}>
        <span style={LABEL}>Now</span>
        <span style={oneStory ? VALUE : MUTED}>
          {oneStory ? oneStory.primary : "No story compiled — evidence insufficient."}
        </span>
      </div>

      <div style={CELL}>
        <span style={LABEL}>Market</span>
        <span style={VALUE}>
          {market.symbol} · {market.timeframe} ·{" "}
          {market.last === null ? "PRICE UNKNOWN" : market.last}
        </span>
        <span style={MUTED}>
          {market.quality ?? "QUALITY UNKNOWN"} · {asOfText(market.capturedAt)}
        </span>
      </div>

      <div style={CELL}>
        <span style={LABEL}>Risk</span>
        <span style={availableR ? VALUE : MUTED}>
          {availableR
            ? `Available R ${rText(availableR.conservativeR)} · risk/unit ${rText(availableR.riskPerUnit)}`
            : "Available R not computed — no chain."}
        </span>
        <span style={MUTED}>
          {decisionWhy && decisionWhy.invalidators.length > 0
            ? `Invalidated by: ${decisionWhy.invalidators[0]}`
            : "No invalidator published."}
        </span>
      </div>

      <div style={CELL}>
        <span style={LABEL}>Why</span>
        <span style={decisionWhy ? VALUE : MUTED}>
          {decisionWhy ? decisionWhy.headline : "No verdict compiled yet."}
        </span>
        {props.onOpenWhy && (
          <button
            type="button"
            onClick={props.onOpenWhy}
            style={{
              alignSelf: "flex-start",
              minHeight: 44,
              marginTop: -8,
              marginBottom: -8,
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#c9a55c",
              fontSize: 10,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Full evidence
          </button>
        )}
      </div>

      <div style={CELL}>
        <span style={LABEL}>Next</span>
        <span style={VALUE} data-testid="spine-next">
          {expression ?? (oneStory ? oneStory.decision.value : "UNKNOWN")}
        </span>
        <span style={MUTED}>
          {expression
            ? "Attached expression"
            : oneStory
              ? `${oneStory.decision.detail} — a decision needs no order.`
              : "WAIT is a decision — no expression required."}
        </span>
      </div>
    </section>
  );
}

export default DecisionSpineBand;
