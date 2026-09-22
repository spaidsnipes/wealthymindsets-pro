"use client";

/**
 * THE EFFORT vs RESULT CALLOUT — FL-06, plate object ④, on the candles.
 *
 * The plate draws two lines against a bar:
 *
 *   Effort: High
 *   Result: Weak
 *
 * and nothing else. Four words. This component renders those four words and
 * then renders the three things the plate leaves out, because without them the
 * four words are an assertion rather than a reading:
 *
 *   1. WHAT IT WAS COMPARED AGAINST (`lookbackNote`). "High" is not a property
 *      of a bar — it is a comparison — so a panel that prints "High" without
 *      naming the cohort has printed a verdict about something it never showed
 *      the trader. The note is on the glass, always, READ or not.
 *
 *   2. WHAT THIS READING CANNOT KNOW (`limitNote`). High effort with a weak
 *      result is the pattern traders call absorption, and this reading cannot
 *      separate absorption from an empty auction, a halted bar, or two large
 *      participants crossing. The compiler refuses the word; the glass carries
 *      the refusal, and carries it MOST VISIBLY when the reading succeeded,
 *      because a successful reading is when a trader is likeliest to over-read.
 *
 *   3. WHY A ROW COULD NOT BE READ (`row.absence`). On the glass, not in a
 *      `title`. A tooltip is hover-only, and a touch user never receives it —
 *      the drawer-filed-receipt failure this product has already repaired.
 *
 * ── WHY IT IS ON THE LEFT ──────────────────────────────────────────────────
 *
 * The Inspect Ticket holds `right-[76px]`, inset from the price scale. Two
 * panels on the same edge is how a chart ends up with one of them permanently
 * behind the other on a short pane. This one takes the opposite edge, starts
 * below the top chrome, and carries the same max-height + scroll as the ticket
 * — for the same reason: a fully-refused reading is TALLER than a read one,
 * and a refusal clipped mid-sentence is worse than no refusal, because the
 * trader cannot tell whether the product ran out of room or ran out of honesty.
 *
 * NOTHING HERE MEASURES ANYTHING. `selectEffortVsResult` decides what can
 * honestly be said; this renders that verdict and never re-derives it. In
 * particular there is no colour ramp keyed to the ratio: Build Order §9 — a
 * verdict may never be graded in hue.
 */

import React from "react";
import { Scale, X } from "lucide-react";

import type {
  EffortResultRow,
  EffortVsResultVM,
} from "@/lib/marketData/viewModels/selectEffortVsResult";

/** A refused row is the WARM colour, not the alarm colour. It is a fact about
 *  the chart's history, not a problem the trader caused. */
const UNREAD_COLOR = "#F0B429";
const READ_COLOR = "#E8EAF2";

/**
 * DO THE REFUSED ROWS REFUSE FOR THE SAME REASON?
 *
 * Found on the serving chart. Effort and Result both refuse a bar that has not
 * finished counting, and both carry the same six-line sentence, so the panel
 * printed that paragraph twice in a row, verbatim, inside a 236px column. A
 * reader scanning it has to compare two blocks of small text to discover they
 * are identical — which is work, and which quietly suggests the two readings
 * failed for two reasons.
 *
 * The compiler is right to hand each row its own sentence; a row must be able
 * to explain itself alone. Saying it once when it is one reason is the GLASS's
 * job, and it stays a presentation decision: nothing is dropped, the sentence
 * simply moves to where it visibly governs both rows instead of being stamped
 * on each.
 */
export function sharedAbsence(rows: readonly EffortResultRow[]): string | null {
  const absences = rows
    .filter(r => r.state !== "READ")
    .map(r => r.absence)
    .filter((a): a is string => typeof a === "string" && a.length > 0);

  // One refusal is not a repetition — leave it on its own row.
  if (absences.length < 2) return null;
  return absences.every(a => a === absences[0]) ? absences[0] : null;
}

function Row({ row, suppressAbsence }: { row: EffortResultRow; suppressAbsence?: boolean }) {
  const read = row.state === "READ";
  return (
    <div className="pt-1" data-evr-row={row.id} data-evr-state={row.state}>
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold tracking-wide text-wm-muted">{row.label}</span>
        <span
          className="ml-auto text-[11px] font-bold tracking-wide"
          style={{ color: read ? READ_COLOR : UNREAD_COLOR }}
        >
          {read ? row.value : "UNREAD"}
        </span>
      </div>
      {/*
        THE BASIS, ON THE GLASS. A verdict word with its own arithmetic beside
        it is auditable by the trader reading it; a verdict word alone asks to
        be trusted. The compiler already wrote the sentence.
      */}
      {read && row.basis && (
        <div className="pt-0.5 text-[10px] leading-snug text-wm-muted">{row.basis}</div>
      )}
      {!read && !suppressAbsence && row.absence && (
        <div className="pt-0.5 text-[10px] leading-snug" style={{ color: UNREAD_COLOR }}>
          {row.absence}
        </div>
      )}
    </div>
  );
}

export function ChartEffortVsResult({
  vm,
  /** True when the bar read is the live one because the cursor is nowhere. */
  followingLiveBar,
  open,
  onOpenChange,
}: {
  vm: EffortVsResultVM;
  followingLiveBar: boolean;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const shared = sharedAbsence(vm.rows);

  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        aria-label="Open the effort versus result reading for the bar under the cursor"
        data-testid="chart-effort-result-reopen"
        className="wm-chart-reading-anchor absolute top-16 left-3 z-20 flex items-center gap-1 rounded border px-2 h-6 text-[10px] font-bold tracking-wide"
        style={{ background: "#131520", borderColor: "#1E2030", color: "#8B8FA8" }}
      >
        <Scale size={10} />
        EFFORT
      </button>
    );
  }

  return (
    <div
      /* Opposite edge from the Inspect Ticket; `top-16` clears the top chrome;
         `max-h` + `overflow-y-auto` is what stops a fully-refused reading from
         having its last sentences cut off by the pane floor. */
      className="absolute top-16 left-3 z-20 w-[236px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-border bg-wm-surface/95 p-2 shadow-2xl backdrop-blur-md"
      data-testid="chart-effort-result"
      // Published so an outside probe can compare this panel's verdict against
      // the bars, without parsing a human sentence.
      data-evr-shape={vm.shape}
      data-evr-state={vm.state}
      data-evr-cohort={vm.cohortSize}
      aria-label={`Effort versus result. ${vm.headline} ${vm.lookbackNote}`}
    >
      <div className="flex items-center gap-2">
        <Scale size={11} className="text-wm-gold" />
        <span className="text-[11px] font-bold text-wm-gold">Effort vs Result</span>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close the effort versus result reading"
          className="ml-auto text-wm-muted hover:text-white"
        >
          <X size={12} />
        </button>
      </div>

      <div className="pt-1.5 text-[10px] font-bold tracking-wide text-wm-muted">
        {followingLiveBar ? "LIVE BAR" : "SELECTED BAR"}
      </div>
      {/*
        Stated, not implied — the same rule the ticket follows. A trader whose
        cursor left the chart is reading a different bar and deserves to be
        told the panel changed subject rather than discovering it.
      */}
      {followingLiveBar && (
        <div className="pt-0.5 text-[10px] leading-snug text-wm-muted">
          The cursor is off the chart, so this weighs the bar still forming.
          Hover a candle to weigh that one instead.
        </div>
      )}

      <div className="mt-1.5 border-t border-wm-border pt-1">
        {vm.rows.map(row => (
          <Row key={row.id} row={row} suppressAbsence={shared !== null} />
        ))}
        {/*
          ONE REASON, SAID ONCE, UNDER BOTH WORDS IT EXPLAINS. Placed inside
          the rows block rather than after it so it reads as belonging to the
          pair — the same reason both said UNREAD, not a third remark.
        */}
        {shared && (
          <div
            className="pt-1 text-[10px] leading-snug"
            style={{ color: UNREAD_COLOR }}
            data-evr-shared-absence="1"
          >
            {shared}
          </div>
        )}
      </div>

      {/*
        THE HEADLINE IS THE READING, so it sits under the two words rather than
        above them — the words are what the plate promised; the sentence is what
        they mean together, and it is the sentence that refuses the diagnosis.
      */}
      <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug text-white">
        {vm.headline}
      </div>

      {/*
        WHAT IT WAS COMPARED AGAINST. Always. A comparison that will not name
        its cohort is a verdict wearing a measurement's clothes.
      */}
      <div className="pt-1 text-[10px] leading-snug text-wm-muted">{vm.lookbackNote}</div>

      {/*
        WHAT IT CANNOT TELL YOU. Printed in the warm colour even when the
        reading succeeded, because a confident reading is exactly when this
        sentence is most needed and least wanted.
      */}
      <div className="pt-1 text-[10px] leading-snug" style={{ color: UNREAD_COLOR }}>
        {vm.limitNote}
      </div>
    </div>
  );
}

export default ChartEffortVsResult;
