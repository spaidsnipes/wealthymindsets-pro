"use client";

/**
 * ActiveQuestionBar — the ACTIVE QUESTION banner from the Visual Systems Canon.
 *
 * WHY THIS EXISTS (Founder verdict, 2026-09-15):
 *
 *   "we need to see the browser transformation 1st this is getting repetitive
 *    build whats in the visuals cannon"
 *
 * Every concept still in the canon — Question-Driven Mode, the Market Reality
 * Canvas, the Continuation Health room — opens with the SAME dominant element:
 * a full-width banner carrying the one question the surface is answering, with
 * its subject named beneath it. It is the first thing the eye lands on.
 *
 * /command-deck already COMPILED that question (`routeQuestion`) and then
 * rendered it as a 13px italic subtitle wedged between a mode bar and a chart.
 * The truth was right; the gaze hierarchy was inverted. Per the canon's
 * SAME-APP REJECTION TEST, a correct fact rendered at the wrong size is not a
 * visual cutover — it is why the deck still reads as "a chart app, but newer".
 *
 * WHAT THIS DELIBERATELY DOES NOT RENDER
 *
 * No DECISION chip, no Right-of-Way verdict, no Evidence Debt count. The
 * `OneStoryStrip` directly below owns all four of those outputs. Repeating one
 * here would put TWO OWNERS OF ONE FACT ON ONE SCREEN — the exact defect class
 * that pinned the chapter clock at zero. The banner owns QUESTION + FOCUS. That
 * is its whole job.
 *
 * TOKENS — Visual Implementation Pack §1:
 *   field  #07080a          canvas is the room, chrome almost absent
 *   type   pearl / ivory    #ede6d3, never pure white; editorial serif
 *   metal  antique gold     BRAND AND RULES ONLY — never permission, never
 *                           bullishness. Hence the hairline and the eyebrow
 *                           are gold; nothing state-bearing is.
 *
 * Pure display. Consumes an already-compiled question and focus. No derivation.
 */

import * as React from "react";
import type { QuestionFocusVM } from "@/lib/experience/selectQuestionFocus";
import type { SecondaryNoiseVM } from "@/lib/experience/selectSecondaryNoise";

export interface ActiveQuestionBarProps {
  /** The compiled dominant question, from `routeQuestion`. */
  readonly question: string;
  /** The compiled subject of that question, from `selectQuestionFocus`. */
  readonly focus: QuestionFocusVM;
  /** The human's current job — rendered as the mode eyebrow. */
  readonly mode?: string;
  /**
   * The compiled Auto-Quiet readout, from `selectSecondaryNoise`. Optional
   * because a surface with no prior snapshot in hand must be able to omit the
   * slot entirely rather than print an unearned "Quieted".
   */
  readonly noise?: SecondaryNoiseVM;
  /** Optional slot for the mode/job affordance the deck already owns. */
  readonly children?: React.ReactNode;
}

const EYEBROW: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 1.6,
  textTransform: "uppercase",
  fontFamily: "Georgia, 'Times New Roman', serif",
  color: "#8a8271",
  whiteSpace: "nowrap",
};

export function ActiveQuestionBar({
  question,
  focus,
  mode,
  noise,
  children,
}: ActiveQuestionBarProps): React.ReactElement {
  return (
    <section
      aria-label="Active question"
      data-testid="active-question-bar"
      data-focus-basis={focus.basis}
      style={{
        position: "relative",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 18px 14px 20px",
        marginBottom: 12,
        borderTop: "1px solid rgba(196,165,116,0.30)",
        borderBottom: "1px solid rgba(196,165,116,0.30)",
        background:
          "linear-gradient(180deg, rgba(196,165,116,0.05) 0%, rgba(7,8,10,0) 100%)",
      }}
    >
      {/* Gold hairline — brand rule, not a state. */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: "linear-gradient(180deg, #c4a574 0%, rgba(196,165,116,0.10) 100%)",
        }}
      />

      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={EYEBROW}>Active Question</span>
          {mode && (
            <span style={{ ...EYEBROW, color: "#c4a574", letterSpacing: 1.2 }}>
              {mode}
            </span>
          )}
        </div>

        <h2
          style={{
            margin: "6px 0 0",
            fontFamily: "Georgia, 'Times New Roman', serif",
            // Canvas owns the room; the question is the loudest type on it,
            // but it must still yield to the chart on a phone.
            fontSize: "clamp(17px, 2.4vw, 27px)",
            lineHeight: 1.22,
            fontWeight: 500,
            color: "#ede6d3",
            letterSpacing: 0.2,
            textWrap: "balance",
          }}
        >
          {question}
        </h2>

        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={EYEBROW}>Question Focus</span>
          <span
            style={{
              fontSize: 12,
              lineHeight: 1.35,
              // UNRESOLVED has its own look (canon: "UNKNOWN has a look").
              // It must never borrow the confident ivory of a resolved subject.
              color: focus.unresolved ? "#8a8271" : "#c9a55c",
              fontStyle: focus.unresolved ? "italic" : "normal",
              minWidth: 0,
            }}
          >
            {focus.focus}
          </span>
        </div>

        {/* SECONDARY NOISE — the mockup's third header line. It is the
            Auto-Quiet gate reporting on ITSELF: not a market fact, but the
            screen stating whether it compared this reading to the last one.
            It therefore never wears gold (gold is brand and rules only) and
            never wears amber (this is not risk). */}
        {noise && (
          <div
            data-testid="secondary-noise"
            data-noise-state={noise.state}
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={EYEBROW}>Secondary Noise</span>
            <span
              style={{
                fontSize: 12,
                lineHeight: 1.35,
                letterSpacing: 0.3,
                color: noise.unresolved ? "#8a8271" : "#ede6d3",
                fontStyle: noise.unresolved ? "italic" : "normal",
              }}
            >
              {noise.value}
            </span>
            <span style={{ fontSize: 10, color: "#6f6a5e", minWidth: 0 }}>
              {noise.detail}
            </span>
          </div>
        )}
      </div>

      {children && (
        <div style={{ flex: "0 1 auto", display: "flex", alignItems: "center", gap: 8 }}>
          {children}
        </div>
      )}
    </section>
  );
}

export default ActiveQuestionBar;
