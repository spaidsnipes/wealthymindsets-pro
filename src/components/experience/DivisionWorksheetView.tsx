"use client";

/**
 * DivisionWorksheetView — the Founder's Asset 01, as a full symbol VIEW.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE MOCKUP DREW
 *
 * Seven labelled rungs, each with an arrow pointing at a value. The values are
 * `421 × 532` six times and `421 × 423` once — the generator's own canvas
 * dimensions, not readings. There is no data in the picture to build.
 *
 * What IS in the picture, and what this view exists for, is the idea: LONG
 * DIVISION SHOWS ITS WORKING. Every other surface in the chart room prints a
 * conclusion. This one prints the steps in order, and each step states WHAT IT
 * DIVIDED — so a trader can read down the page and watch the reading get
 * assembled instead of being handed the last line of it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTHING ON THIS SURFACE IS GRADED IN HUE
 *
 * Build Order §9. A worked step and a blank step are drawn in the SAME ink and
 * the same weight; the only difference is that a blank one dims, and it dims
 * because nothing was read, which is a statement about evidence rather than
 * about the market. There is no bar, no fill, no score, and no green.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BLANK RUNGS ARE THE LOAD-BEARING PART
 *
 * A worksheet that drew only the steps it could work would teach the reader the
 * others were never asked for. So every unread rung still prints its label, its
 * question, the dividend that WOULD have gone into it, the sentence saying why
 * this room could not work it, and the owner a reviewer can grep.
 *
 * MISSING EVIDENCE is unread on every input, because `decisionPermissionCompiler`
 * is not in this room and its debt is compiled from decision nodes the chart has
 * never had. The `CAUTION + RIGHT OF WAY: WAIT` footer the mockup ends on is
 * refused for the same reason and says so where the mockup put it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ASSET 12 RIDES ON TOP OF IT — THE SCAFFOLDING REMOVAL PATH
 *
 * `WM_Transformation_UI_12_Progressive_Scaffolding_Foundation_Intermediate_Pro`
 * draws this same reading three times at three densities, under the banner
 * `FROM DEPENDENCE TO DISCRETION`. A trader who has internalised the worksheet
 * should not have to keep re-reading the beginner's version of it forever.
 *
 * The level control below is the only new state on this surface. Everything
 * else is the SAME compiled worksheet passed through `scaffoldWorksheet`, which
 * can only remove voices — it never receives a market input, so the reading at
 * ADVANCED is structurally incapable of differing from the reading at
 * FOUNDATION.
 *
 * The counts and the disclosure sit OUTSIDE the level control, above the rungs,
 * and are drawn identically at all three levels. That placement is the honesty:
 * a reader at the most compressed level can still see how much of the division
 * was actually worked, without stepping back down.
 *
 * Pure display. Consumes an already-compiled worksheet. Derives no market fact.
 */

import React from "react";

import {
  DEFAULT_SCAFFOLD_LEVEL,
  SCAFFOLD_LEVELS,
  scaffoldWorksheet,
  type RungVoices,
  type ScaffoldLevel,
} from "@/lib/marketData/viewModels/scaffoldWorksheet";
import type {
  DivisionWorksheetVM,
  WorksheetRung,
} from "@/lib/marketData/viewModels/selectDivisionWorksheet";
import { selectTeachingEmphasis } from "@/lib/marketData/viewModels/selectTeachingEmphasis";

const GOLD = "#d4af37";
const GOLD_DIM = "#c9a55c";
const MUTED = "#8a8271";
const TEXT = "#d8cfb8";
const HAIR = "rgba(139,106,41,0.22)";
const PANEL = "rgba(18,16,12,0.72)";

export interface DivisionWorksheetViewProps {
  readonly vm: DivisionWorksheetVM;
  readonly symbol: string;
  readonly timeframe?: string;
  /**
   * ONE RENDERER, TWO DIVISIONS — and the reader must never have to guess which
   * one is on screen.
   *
   * Asset 01 divides the whole loaded window; Asset 18 divides ONE PRICE LEVEL.
   * Same seven steps, same arithmetic, different dividend. That is exactly why
   * they share this component — and exactly why they must not share a heading.
   * Two panels both titled "Long-Division Worksheet", both reading step 1 with
   * different numbers, is a surface that looks like a contradiction and is
   * actually two honest answers to two different questions.
   */
  readonly title?: string;
  /** One line naming WHAT was divided. Sits under the title. */
  readonly dividendNote?: string;
  /** Distinguishes the instances in the DOM when both are mounted. */
  readonly instanceId?: string;
}

/** The levels, in the words a trader reads on the control itself. */
const LEVEL_LABELS: Record<ScaffoldLevel, string> = {
  FOUNDATION: "Foundation",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

function Rung({
  rung,
  voices,
}: {
  readonly rung: WorksheetRung;
  readonly voices: RungVoices;
}): React.ReactElement {
  const isRead = rung.state === "READ";
  return (
    <li
      data-testid="worksheet-rung"
      data-step={rung.step}
      data-state={rung.state}
      style={{
        listStyle: "none",
        background: PANEL,
        border: `1px solid ${HAIR}`,
        borderRadius: 6,
        padding: "10px 12px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        // The ONLY visual difference between worked and blank. No hue.
        opacity: isRead ? 1 : 0.68,
      }}
    >
      <span
        aria-hidden
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 11,
          color: MUTED,
          minWidth: 16,
          paddingTop: 2,
        }}
      >
        {rung.step}
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", color: MUTED }}>
          {rung.label}
        </span>

        {/* The question the step answers. Kept above the answer so a blank rung
            still reads as a question that went unanswered. A teaching scaffold,
            so it is the first voice Asset 12 takes away. */}
        {voices.question ? (
          <span style={{ fontSize: 12, lineHeight: 1.5, color: TEXT }}>{rung.question}</span>
        ) : null}

        {isRead ? (
          <>
            {/* THE ANSWER IS NEVER COMPRESSED AWAY, at any level. A rung with no
                value is a rung the reader cannot check. */}
            <span
              data-testid="worksheet-value"
              style={{ fontSize: 15, letterSpacing: 0.6, color: GOLD_DIM }}
            >
              {rung.value}
            </span>
            {/* The owner's OWN sentence, verbatim — never a rephrasing. */}
            {voices.basis ? (
              <span style={{ fontSize: 12, lineHeight: 1.5, color: TEXT }}>{rung.basis}</span>
            ) : null}
          </>
        ) : (
          <>
            <span
              data-testid="worksheet-blank"
              style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: MUTED }}
            >
              Not read here
            </span>
            {/* WHY it is blank. Not a teaching scaffold — a blank rung with no
                reason is indistinguishable from a zero, so this voice survives
                compression wherever the rung itself does. */}
            {voices.absence ? (
              <span style={{ fontSize: 12, lineHeight: 1.5, color: TEXT }}>{rung.absence}</span>
            ) : null}
          </>
        )}

        {/* THE DIVIDEND — what this step consumed. This is the line that makes
            the page long division rather than a list of conclusions, so it is
            printed on blank rungs too: "what would have gone in here". */}
        {voices.dividend ? (
          <span style={{ fontSize: 11, lineHeight: 1.5, color: MUTED }}>
            {rung.carriedFrom != null ? `carried from step ${rung.carriedFrom} · ` : ""}
            divided: {rung.dividend}
          </span>
        ) : null}

        {voices.owner ? (
          <span style={{ fontSize: 10, color: MUTED, fontFamily: "ui-monospace, monospace" }}>
            {rung.owner}
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function DivisionWorksheetView({
  vm,
  symbol,
  timeframe,
  title = "Long-Division Worksheet",
  dividendNote,
  instanceId = "window",
}: DivisionWorksheetViewProps): React.ReactElement {
  const [level, setLevel] = React.useState<ScaffoldLevel>(DEFAULT_SCAFFOLD_LEVEL);
  const scaffolded = React.useMemo(() => scaffoldWorksheet(vm, level), [vm, level]);
  /* Composed from the SOURCE worksheet, never from the scaffolded view. The
     scaffold level changes how much explanation is shown; it must not change
     what the market was observed to do, and a summary computed off the trimmed
     view would quietly say something different at FOUNDATION than at ADVANCED. */
  const emphasis = React.useMemo(() => selectTeachingEmphasis(vm), [vm]);

  return (
    <div
      data-testid="division-worksheet-view"
      data-worksheet={instanceId}
      data-scaffold={scaffolded.level}
      // Read straight off the SOURCE worksheet, not off the scaffolded view.
      // These two attributes are what an auditor reads to prove the level
      // control changed the prose and nothing else.
      data-read={vm.readCount}
      data-unread={vm.unreadCount}
      data-shown={scaffolded.shown.length}
      data-withheld={scaffolded.withheldSteps.length}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "14px 16px 22px",
        color: TEXT,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, letterSpacing: 1.4, color: GOLD, textTransform: "uppercase" }}>
            {title}
          </span>
          <span style={{ fontSize: 11, color: MUTED }}>
            {symbol}
            {timeframe ? ` · ${timeframe}` : ""}
          </span>
        </div>
        {dividendNote ? (
          <span data-testid="worksheet-dividend-note" style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
            {dividendNote}
          </span>
        ) : null}
      </header>

      {/* ASSET 12 — THE SCAFFOLDING REMOVAL PATH, drawn as a path rather than a
          dropdown so the direction of travel is visible: left is the most help,
          right is the least. */}
      <section
        aria-label="Scaffolding level"
        data-testid="worksheet-scaffold-path"
        style={{ display: "flex", flexDirection: "column", gap: 7 }}
      >
        <span style={{ fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", color: MUTED }}>
          Scaffolding removal path · from dependence to discretion
        </span>

        <div role="group" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SCAFFOLD_LEVELS.map((lv) => {
            const active = lv === level;
            return (
              <button
                key={lv}
                type="button"
                data-testid="scaffold-level-button"
                data-level={lv}
                aria-pressed={active}
                onClick={() => setLevel(lv)}
                style={{
                  // 44px stays the house floor for a tap target.
                  minHeight: 44,
                  padding: "0 14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  letterSpacing: 1.3,
                  textTransform: "uppercase",
                  borderRadius: 6,
                  background: active ? "rgba(139,106,41,0.18)" : "transparent",
                  border: `1px solid ${active ? GOLD : HAIR}`,
                  color: active ? GOLD : MUTED,
                }}
              >
                {LEVEL_LABELS[lv]}
              </button>
            );
          })}
        </div>

        <span style={{ fontSize: 12, lineHeight: 1.5, color: TEXT }}>
          {scaffolded.title} — {scaffolded.promise}
        </span>
      </section>

      {/* `reason` is the sole owner of the how-much-was-worked claim. The rungs
          below never restate it. It is drawn OUTSIDE the level control and is
          identical at all three levels, so a reader at ADVANCED can still see
          how much of the division was actually worked. */}
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: TEXT }}>{vm.reason}</p>

      {/* WHAT THIS LEVEL STOPPED PRINTING. The sentence that makes this
          compression rather than concealment — never empty, including at
          FOUNDATION, where it says every step is drawn in full. */}
      <p
        data-testid="worksheet-scaffold-disclosure"
        style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: MUTED }}
      >
        {scaffolded.disclosure}
      </p>

      <ol
        aria-label="Division steps"
        style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}
      >
        {scaffolded.shown.map(({ rung, voices }) => (
          <Rung key={rung.step} rung={rung} voices={voices} />
        ))}
      </ol>

      {/* ASSET 11 — TEACHING EMPHASIS. The worksheet said out loud.
          It sits ABOVE right-of-way deliberately: the mockup's version of this
          block ends by telling the reader what to do with their capital, and
          placing the refusal of that instruction directly beneath it is the
          only arrangement where a reader meets the summary and its limit in the
          same glance. */}
      <section
        aria-label="Teaching emphasis"
        data-testid="worksheet-teaching-emphasis"
        data-has-paragraph={emphasis.paragraph ? "true" : "false"}
        data-spoke-for={emphasis.spokeFor.length}
        data-silent-on={emphasis.silentOn.length}
        style={{
          borderTop: `1px solid ${HAIR}`,
          paddingTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        <span style={{ fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", color: MUTED }}>
          Teaching emphasis
        </span>
        <span
          data-testid={emphasis.paragraph ? "emphasis-paragraph" : "emphasis-absent"}
          style={{ fontSize: 12, lineHeight: 1.6, color: emphasis.paragraph ? TEXT : MUTED }}
        >
          {emphasis.paragraph ?? emphasis.absence}
        </span>
        <span
          data-testid="emphasis-withheld"
          style={{ fontSize: 10.5, lineHeight: 1.55, color: MUTED }}
        >
          {emphasis.withheldInstruction}
        </span>
      </section>

      {/* THE FOOTER, WHERE THE MOCKUP PUT IT — refused in the same place it was
          asked for, rather than quietly omitted. */}
      <section
        aria-label="Right of way"
        data-testid="worksheet-right-of-way"
        style={{
          borderTop: `1px solid ${HAIR}`,
          paddingTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        <span style={{ fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", color: MUTED }}>
          Right of way
        </span>
        <span style={{ fontSize: 12, lineHeight: 1.55, color: TEXT }}>{vm.rightOfWayNote}</span>
      </section>
    </div>
  );
}

export default DivisionWorksheetView;
