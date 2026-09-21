"use client";

/**
 * OneStoryStrip — the MARKET REALITY CANVAS (canon §7, rendered at canon size).
 *
 * WHY THIS WAS REBUILT (Founder verdict, 2026-09-15):
 *
 *   "we need to see the browser transformation 1st this is getting repetitive
 *    build whats in the visuals cannon"
 *
 * This component's own 2026-08-20 docblock described its job as rendering the
 * four canon outputs "in one compact horizontal band ... without competing
 * with the chart or the numbered sections below." That sentence IS the defect.
 * The canon's four loudest facts were deliberately designed to lose the gaze
 * contest, at 9–13px, to a chart and a museum of numbered drawers. Per the
 * SAME-APP REJECTION TEST that is why the deck still read as "a chart app, but
 * newer".
 *
 *     A CORRECT FACT RENDERED AT THE WRONG SIZE IS STILL A FAILED CUTOVER.
 *
 * Every mockup shows the same frame instead: NUMBERED cells, letter-spaced
 * small-caps eyebrows, a dominant editorial value, a quiet detail beneath.
 * That frame is what this renders now.
 *
 * WHAT IT DOES NOT DO
 *
 * No derivation. The cells arrive pre-compiled from `selectRealityCells`,
 * which reads only fields `selectOneStory` already owns. The component chooses
 * COLOUR from `cell.tone` and nothing else — it may not decide what is
 * resolved, because a renderer that judges is a second owner of the judgment.
 *
 * The name and the `{ vm: OneStoryVM }` prop are deliberately unchanged: three
 * Sentinels and the clutter-conservation test pin this call site, and renaming
 * a component to celebrate a re-skin is how a Sentinel gets quietly unpinned.
 *
 * TOKENS — Visual Implementation Pack §1: field #07080a; pearl/ivory type,
 * never pure white; antique gold #c4a574 for BRAND AND RULES ONLY — never for
 * permission, never for bullishness. Risk wears its own independent amber.
 */

import * as React from "react";
import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";
import { selectRealityCells, type CellTone } from "@/lib/experience/selectRealityCells";
import { WM, objectionTint } from "@/lib/design/wmTokens";

export interface OneStoryStripProps {
  readonly vm: OneStoryVM;
}

/**
 * Tone → ink. The ONLY thing this component decides.
 *
 * UNRESOLVED is muted and italic because the canon requires that UNKNOWN have
 * a look — it must never be able to pass for a settled read at a glance.
 */
const TONE_INK: Record<CellTone, string> = {
  RESOLVED: "#ede6d3", // pearl — a settled answer
  // This strip is where the colour finally got its NAME. `WM.state.objection`
  // is the token; OBJECTION is the cell tone that motivated it. Deliberately
  // NOT `WM.state.warn` (#c05a4a) — a blocked story is the engine answering,
  // not the engine failing. Identical pixels to the literals replaced here.
  OBJECTION: WM.state.objection, // independent amber — risk, never gold
  DEBT: WM.state.objection, // a block and an objection cost the same attention
  UNRESOLVED: "#8a8271", // muted — the engine did not answer
};

const TONE_RULE: Record<CellTone, string> = {
  RESOLVED: "rgba(196,165,116,0.32)",
  OBJECTION: objectionTint(0.45),
  DEBT: objectionTint(0.4),
  UNRESOLVED: "rgba(138,130,113,0.22)",
};

const EYEBROW: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  fontFamily: "Georgia, 'Times New Roman', serif",
  color: "#8a8271",
};

export function OneStoryStrip({ vm }: OneStoryStripProps): React.ReactElement {
  const { cells } = selectRealityCells(vm);

  return (
    <section
      aria-label="Market reality canvas"
      data-testid="market-reality-canvas"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 1,
        // The 1px gap over a gold-tinted ground IS the hairline grid — the
        // canon's rule lines, drawn by the layout rather than by borders.
        background: "rgba(196,165,116,0.18)",
        border: "1px solid rgba(196,165,116,0.28)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {cells.map((cell) => {
        const ink = TONE_INK[cell.tone];
        const unresolved = cell.tone === "UNRESOLVED";
        return (
          <div
            key={cell.n}
            data-cell={cell.n}
            data-tone={cell.tone}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "16px 16px 18px",
              background: "#07080a",
              minWidth: 0,
            }}
          >
            {/* Top rule carries the cell's state, so the grid itself reads
                as a status bar from across the room. */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: TONE_RULE[cell.tone],
              }}
            />

            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                aria-hidden
                style={{
                  ...EYEBROW,
                  fontSize: 10,
                  letterSpacing: 0.5,
                  color: "#c4a574",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(cell.n).padStart(2, "0")}
              </span>
              <span style={EYEBROW}>{cell.label}</span>
            </div>

            <div
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(14px, 1.35vw, 19px)",
                lineHeight: 1.28,
                fontWeight: 500,
                color: ink,
                fontStyle: unresolved ? "italic" : "normal",
                textWrap: "balance",
              }}
            >
              {cell.value}
            </div>

            {cell.detail && (
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: unresolved ? "#6f6a5e" : "#8a8271",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {cell.detail}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

export default OneStoryStrip;
