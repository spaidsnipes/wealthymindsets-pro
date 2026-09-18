"use client";

/**
 * ContinuationHealthView — the Founder's Asset 15, as a full symbol VIEW.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE MOCKUP DREW AND WHAT IS ON SCREEN INSTEAD
 *
 * `WM_Transformation_UI_15_Question_Driven_Continuation_Health` stacks five
 * cards down the left rail, four of them a percentage over a filled green bar:
 * STRUCTURE ALIGNMENT 92%, MOMENTUM SUSTAINMENT 78%, VOLUME CONFIRMATION 84%,
 * CONTINUATION HEALTH SCORE 85%.
 *
 * Not one of those four numbers has an owner in this repo, and
 * `selectContinuationHealth` refuses to mint them — so there is nothing here to
 * render. This file could not print them if it wanted to: the VM it consumes
 * carries no numeric field at all. That is the point of doing the refusal in
 * the compiler rather than in the renderer.
 *
 * A filled green bar would also be Build Order §9 twice over — a verdict graded
 * in hue, at the REWARD end of the scale, with a number painted on it.
 *
 * So the reading renders as WORDS plus the owner that said them. Each row names
 * the selector a reviewer can grep, and quotes that owner's OWN sentence rather
 * than a rephrasing, so nothing on this surface is a second telling of a fact
 * another file owns.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ABSENT CARD IS DRAWN AS AN ABSENCE
 *
 * `vm.unread` names the mockup's VOLUME CONFIRMATION card. Rendering four of
 * five cards silently would teach the reviewer that the fifth was never asked
 * for. It was asked for; this composition has no volume owner; the surface says
 * so in the owner's own words.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LAG IS NOT A FOOTNOTE
 *
 * `confirmationLagNote` rides every directional reading, COHERENT included. A
 * fractal pivot needs `lookback` bars on both sides, so the newest bars can
 * never be pivots and the sequence always describes a market that has already
 * moved past it. A continuation surface is the single worst place to omit that:
 * the trader is asking about the NEXT bar while the evidence is structurally
 * about an earlier one.
 *
 * Pure display. Consumes an already-compiled reading. Derives no market fact.
 */

import React from "react";
import type { ContinuationHealthVM } from "@/lib/marketData/viewModels/selectContinuationHealth";
import { selectContinuationQuestion } from "@/lib/experience/selectContinuationQuestion";
import ActiveQuestionBar from "@/components/command/ActiveQuestionBar";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const PANEL = "rgba(18,16,12,0.72)";

/**
 * The verdict word, in ink. Deliberately NOT a colour ramp: §9 bans grading a
 * verdict in hue, and COHERENT is exactly the reward end that ban is aimed at.
 * ROTATING and CONTESTED are findings, not failures, so they get the same ink
 * the sequence rows do. Only UNREADABLE dims — and it dims because nothing was
 * read, which is a statement about evidence, not about the market.
 */
function verdictInk(health: ContinuationHealthVM["health"]): string {
  return health === "UNREADABLE" ? MUTED : GOLD_DIM;
}

export interface ContinuationHealthViewProps {
  readonly vm: ContinuationHealthVM;
  readonly symbol: string;
  readonly timeframe?: string;
}

export function ContinuationHealthView({
  vm,
  symbol,
  timeframe,
}: ContinuationHealthViewProps): React.ReactElement {
  // Compiled ONCE, here, and handed to the bar. Two selector calls on one
  // screen are two owners of one fact.
  const asked = selectContinuationQuestion(vm);

  return (
    <div
      data-testid="continuation-health-view"
      data-health={vm.health}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "14px 16px 22px",
        color: TEXT,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <ActiveQuestionBar question={asked.question} focus={asked.focus} mode="Observe" />

      <header style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, letterSpacing: 1.4, color: GOLD, textTransform: "uppercase" }}>
          Continuation Health
        </span>
        <span style={{ fontSize: 11, color: MUTED }}>
          {symbol}
          {timeframe ? ` · ${timeframe}` : ""}
        </span>
      </header>

      {/* THE VERDICT, IN WORDS. The mockup's 85% lived here. */}
      <section
        aria-label="Continuation reading"
        style={{
          background: PANEL,
          border: `1px solid ${HAIR}`,
          borderRadius: 6,
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", color: MUTED }}>
          Reading
        </span>
        <span
          data-testid="continuation-verdict"
          style={{ fontSize: 22, letterSpacing: 1.2, color: verdictInk(vm.health) }}
        >
          {vm.health}
        </span>
        {/* `reason` is the SOLE owner of the finding on this screen. The banner
            above it names the subject and stops there, on purpose. */}
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: TEXT }}>{vm.reason}</p>
      </section>

      {/* THE ROWS THE MOCKUP GRADED. Each is a word and its owner. */}
      {vm.readings.length > 0 && (
        <section
          aria-label="Compiled readings"
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          {vm.readings.map((r) => (
            <div
              key={r.owner}
              data-testid="continuation-reading"
              data-owner={r.owner}
              style={{
                background: PANEL,
                border: `1px solid ${HAIR}`,
                borderRadius: 6,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <span
                style={{ fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", color: MUTED }}
              >
                {r.label}
              </span>
              <span style={{ fontSize: 15, letterSpacing: 0.8, color: GOLD_DIM }}>{r.value}</span>
              {/* The owner's OWN sentence, verbatim. */}
              <span style={{ fontSize: 12, lineHeight: 1.5, color: TEXT }}>{r.basis}</span>
              <span style={{ fontSize: 10, color: MUTED, fontFamily: "ui-monospace, monospace" }}>
                {r.owner}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* WHERE IT TURNED. Asset 17 draws this as KEY LEVELS · Resistance /
          Support; those two words are refused in the compiler because they are
          forward-looking claims nothing here owns. What is printed is the
          observed pivot and the owner that confirmed it.

          This block survives an UNREADABLE verdict on purpose: when the regime
          is short but the structure is not, the pivots are still known, and the
          "where" is the question every continuation reading ends on. */}
      {vm.levels.length > 0 && (
        <section
          aria-label="Confirmed levels"
          data-testid="continuation-levels"
          style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
        >
          {vm.levels.map((l) => (
            <div
              key={l.label}
              data-testid="continuation-level"
              style={{
                flex: "1 1 160px",
                background: PANEL,
                border: `1px solid ${HAIR}`,
                borderRadius: 6,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                style={{ fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", color: MUTED }}
              >
                {l.label}
              </span>
              {/* A price the market printed — not a grade, so §9 has no quarrel
                  with it. Monospaced so two levels align digit-for-digit. */}
              <span
                style={{ fontSize: 17, color: GOLD_DIM, fontFamily: "ui-monospace, monospace" }}
              >
                {l.price}
              </span>
              <span style={{ fontSize: 10, color: MUTED, fontFamily: "ui-monospace, monospace" }}>
                {l.owner}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* THE PERMANENT LAG — carried, not summarised. */}
      {vm.confirmationLagNote && (
        <p
          data-testid="continuation-lag-note"
          style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: MUTED }}
        >
          {vm.confirmationLagNote}
        </p>
      )}

      {/* THE CARD THAT IS NOT DRAWN, NAMED. */}
      {vm.unread.length > 0 && (
        <section
          aria-label="Dimensions not read"
          data-testid="continuation-unread"
          style={{
            borderTop: `1px solid ${HAIR}`,
            paddingTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", color: MUTED }}>
            Not read here
          </span>
          {vm.unread.map((u) => (
            <span key={u} style={{ fontSize: 12, lineHeight: 1.5, color: MUTED }}>
              {u}
            </span>
          ))}
        </section>
      )}
    </div>
  );
}

export default ContinuationHealthView;
