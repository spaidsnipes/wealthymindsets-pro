"use client";

/**
 * WHAT IS ON THE GLASS RIGHT NOW — the ledger, rendered.
 *
 * The compiler (`selectOverlayDrawingLedger`) decides what can honestly be
 * said about each order-flow layer. This renders that and never re-derives it.
 *
 * ── WHY IT LIVES BEHIND THE SMART MONEY DOOR ───────────────────────────────
 *
 * Two standing rules point at the same place, from opposite directions:
 *
 *   · `chartsMarketFirst.test.ts` — "keeps order-flow evidence behind the
 *     Smart Money doorway." Order-flow evidence does not get to stand on the
 *     chart chrome unasked.
 *
 *   · S-501, the FOUR CHUNK ATTENTION BUDGET — "fifth chunk must collapse or
 *     the frame fails." A new always-visible strip on /charts would be the
 *     fifth chunk, and the frame would fail for a reason nobody would connect
 *     back to this block.
 *
 * So this is disclosure the trader OPENS, not decoration they must step over.
 * It is still disclosure: it reaches the glass, in words, without hover and
 * without a screen reader — which is the whole complaint it answers.
 *
 * NO COLOUR RAMP KEYED TO DRAWN-NESS. Build Order §9: a verdict may never be
 * graded in hue. A layer drawing nothing is not worse than one drawing — it is
 * a different fact, and the WARM colour marks absence, never alarm.
 */

import React from "react";
import { Layers } from "lucide-react";

import type {
  LedgerRow,
  OverlayDrawingLedgerVM,
} from "@/lib/marketData/viewModels/selectOverlayDrawingLedger";

/** Absence is WARM. It is a fact about the tape, not a problem to fix. */
const QUIET_COLOR = "#F0B429";
const DRAWN_COLOR = "#E8EAF2";
/** OFF is the trader's own choice, so it is the dimmest thing here. */
const OFF_COLOR = "#8B8FA8";

const STATE_WORD: Record<LedgerRow["state"], string> = {
  DRAWN: "DRAWING",
  NOTHING_TO_DRAW: "NOTHING YET",
  OFF: "OFF",
};

function stateColor(state: LedgerRow["state"]): string {
  if (state === "DRAWN") return DRAWN_COLOR;
  if (state === "OFF") return OFF_COLOR;
  return QUIET_COLOR;
}

function Row({ row }: { row: LedgerRow }) {
  return (
    <div className="pt-1.5" data-ofl-row={row.id} data-ofl-state={row.state}>
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold tracking-wide text-wm-muted">{row.label}</span>
        <span
          className="ml-auto text-[10px] font-bold tracking-wide"
          style={{ color: stateColor(row.state) }}
        >
          {STATE_WORD[row.state]}
        </span>
      </div>
      {/*
        ON THE GLASS, NOT IN A `title`. The state of these layers already
        existed — in `data-` attributes on the canvas, where an outside probe
        could read it and the trader could not. A tooltip would have repeated
        that mistake for touch users.
      */}
      <div
        className="pt-0.5 text-[10px] leading-snug"
        style={{ color: row.state === "DRAWN" ? "#8B8FA8" : stateColor(row.state) }}
      >
        {row.detail}
      </div>
    </div>
  );
}

export function OverlayDrawingLedgerBlock({ vm }: { vm: OverlayDrawingLedgerVM }) {
  return (
    <div
      className="mx-2 my-2 p-2 rounded-lg bg-wm-surface border border-wm-border"
      data-testid="overlay-drawing-ledger"
      data-ofl-drawn={vm.drawnCount}
      data-ofl-on={vm.onCount}
      aria-label={`Order flow layers. ${vm.headline}`}
    >
      <div className="flex items-center gap-1.5">
        <Layers size={11} className="text-wm-gold" />
        <span className="text-[10px] font-bold text-wm-gold">On the chart right now</span>
      </div>
      <div className="pt-1 text-[10px] leading-snug text-wm-text">{vm.headline}</div>

      <div className="mt-1 border-t border-wm-border pt-0.5">
        {vm.rows.map(row => (
          <Row key={row.id} row={row} />
        ))}
      </div>

      {/*
        WHAT THIS LIST DOES NOT COVER. A list that looks complete and is not is
        worse than a shorter list that says where it stops.
      */}
      <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug text-wm-text-dim">
        {vm.note}
      </div>
    </div>
  );
}

export default OverlayDrawingLedgerBlock;
