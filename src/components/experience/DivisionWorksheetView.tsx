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
 * Pure display. Consumes an already-compiled worksheet. Derives no market fact.
 */

import React from "react";

import type {
  DivisionWorksheetVM,
  WorksheetRung,
} from "@/lib/marketData/viewModels/selectDivisionWorksheet";

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
}

function Rung({ rung }: { readonly rung: WorksheetRung }): React.ReactElement {
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
            still reads as a question that went unanswered. */}
        <span style={{ fontSize: 12, lineHeight: 1.5, color: TEXT }}>{rung.question}</span>

        {isRead ? (
          <>
            <span
              data-testid="worksheet-value"
              style={{ fontSize: 15, letterSpacing: 0.6, color: GOLD_DIM }}
            >
              {rung.value}
            </span>
            {/* The owner's OWN sentence, verbatim — never a rephrasing. */}
            <span style={{ fontSize: 12, lineHeight: 1.5, color: TEXT }}>{rung.basis}</span>
          </>
        ) : (
          <>
            <span
              data-testid="worksheet-blank"
              style={{ fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: MUTED }}
            >
              Not read here
            </span>
            <span style={{ fontSize: 12, lineHeight: 1.5, color: TEXT }}>{rung.absence}</span>
          </>
        )}

        {/* THE DIVIDEND — what this step consumed. This is the line that makes
            the page long division rather than a list of conclusions, so it is
            printed on blank rungs too: "what would have gone in here". */}
        <span style={{ fontSize: 11, lineHeight: 1.5, color: MUTED }}>
          {rung.carriedFrom != null ? `carried from step ${rung.carriedFrom} · ` : ""}
          divided: {rung.dividend}
        </span>

        <span style={{ fontSize: 10, color: MUTED, fontFamily: "ui-monospace, monospace" }}>
          {rung.owner}
        </span>
      </div>
    </li>
  );
}

export function DivisionWorksheetView({
  vm,
  symbol,
  timeframe,
}: DivisionWorksheetViewProps): React.ReactElement {
  return (
    <div
      data-testid="division-worksheet-view"
      data-read={vm.readCount}
      data-unread={vm.unreadCount}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "14px 16px 22px",
        color: TEXT,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, letterSpacing: 1.4, color: GOLD, textTransform: "uppercase" }}>
          Long-Division Worksheet
        </span>
        <span style={{ fontSize: 11, color: MUTED }}>
          {symbol}
          {timeframe ? ` · ${timeframe}` : ""}
        </span>
      </header>

      {/* `reason` is the sole owner of the how-much-was-worked claim. The rungs
          below never restate it. */}
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: TEXT }}>{vm.reason}</p>

      <ol
        aria-label="Division steps"
        style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}
      >
        {vm.rungs.map((r) => (
          <Rung key={r.step} rung={r} />
        ))}
      </ol>

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
