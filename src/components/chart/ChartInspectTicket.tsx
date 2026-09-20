"use client";

/**
 * THE INSPECT TICKET — FL-06's panel on the candles.
 *
 * `WM_FL_06_ORDERFLOW_ON_CHART.jpg` stamps **"NO ESSAY DRAWER AS PRIMARY
 * TRUTH"** across its corner, and this small panel is the plate's answer to it.
 * The bar under the cursor says what it is made of, on the chart, beside the
 * candle — not in a drawer the trader has to go and open and read.
 *
 * ── WHY IT FOLLOWS THE CURSOR RATHER THAN WAITING FOR A CLICK ──────────────
 *
 * `MainChart` already publishes the bar under the crosshair through
 * `onOHLCAtCursor`, and until now nothing listened — the callback was an orphan.
 * Adding a click handler would have meant a second bar-selection path inside a
 * ten-thousand-line chart, and two selection paths is how one candle ends up
 * with two tickets disagreeing about which bar is selected.
 *
 * THE TOUCH PROBLEM IS HANDLED, NOT IGNORED. A hover-only reading is one a
 * touch user never receives — the drawer-filed-receipt failure this product has
 * repaired twice. So when the cursor is nowhere, the ticket does not blank: it
 * falls back to the LIVE bar, which is stated in the panel rather than implied.
 * That is not a consolation prize. The live bar is the only bar the held tape
 * can fully read, so the fallback shows the trader the ticket's best case.
 *
 * ── WHY IT IS NOT IN THE CORNER ────────────────────────────────────────────
 *
 * It was, and the first screenshot showed why it cannot be. Pinned to the
 * bottom-right it sat on top of the price scale AND the chart's own control
 * cluster, and — because a fully-refused ticket is TALLER than a read one, its
 * four reasons being longer than four numbers — its last two sentences were
 * clipped off the bottom of the pane. A refusal that gets cut in half is worse
 * than no refusal: the trader sees a truncated sentence and cannot tell
 * whether the product ran out of room or ran out of honesty.
 *
 * So it is inset from the price scale, it starts below the chart's top chrome,
 * and it carries a max height with its own scroll. The height cap is the one
 * that matters: the panel's content is variable by design.
 *
 * ── WHY IT HAS A CLOSE BUTTON ──────────────────────────────────────────────
 *
 * It sits over the candles, as the plate draws it. Anything over the market has
 * to be removable, because the market is not the slack in this layout — the
 * same reason `.wm-chart-market-pane` carries a floor. Closed, it leaves a
 * small INSPECT chip rather than vanishing, so the trader can find it again.
 *
 * Nothing here measures anything. `selectInspectTicket` decides what can
 * honestly be said about the bar and the tape; this renders that verdict.
 */

import React from "react";
import { Crosshair, X } from "lucide-react";

import type { InspectTicketVM, TicketRow } from "@/lib/marketData/viewModels/selectInspectTicket";

/** A refused row is the WARM colour, not the alarm colour. It is a fact about
 *  the feed, not a problem the trader caused. */
const UNREAD_COLOR = "#F0B429";
const READ_COLOR = "#E8EAF2";

function Row({ row }: { row: TicketRow }) {
  const read = row.state === "READ";
  return (
    <div className="pt-1" data-inspect-row={row.id} data-inspect-state={row.state}>
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-bold tracking-wide text-wm-muted">{row.label}</span>
        <span
          className="ml-auto text-[11px] font-bold tabular-nums"
          style={{ color: read ? READ_COLOR : UNREAD_COLOR }}
        >
          {read ? row.value : "UNREAD"}
        </span>
      </div>
      {/*
        THE REASON GOES ON THE GLASS.
        `title` is hover-only and a touch user never receives it. An UNREAD row
        whose reason lives in a tooltip tells the trader a number is missing and
        never which fact was missing — which is the whole content of the reading.
      */}
      {!read && row.absence && (
        <div className="pt-0.5 text-[10px] leading-snug" style={{ color: UNREAD_COLOR }}>
          {row.absence}
        </div>
      )}
    </div>
  );
}

export function ChartInspectTicket({
  vm,
  /** True when the bar shown is the live one because the cursor is nowhere. */
  followingLiveBar,
  open,
  onOpenChange,
  onOpenFootprint,
}: {
  vm: InspectTicketVM;
  followingLiveBar: boolean;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Takes the trader to the surface that divides this bar by price level. */
  onOpenFootprint: () => void;
}) {
  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        aria-label="Open the inspect ticket for the bar under the cursor"
        data-testid="chart-inspect-reopen"
        className="absolute top-16 right-[76px] z-20 flex items-center gap-1 rounded border px-2 h-6 text-[10px] font-bold tracking-wide"
        style={{ background: "#131520", borderColor: "#1E2030", color: "#8B8FA8" }}
      >
        <Crosshair size={10} />
        INSPECT
      </button>
    );
  }

  const time =
    vm.barOpenMs !== null
      ? new Date(vm.barOpenMs).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : null;

  return (
    <div
      /* `right-[76px]` clears the price scale; `top-16` clears the chart's own
         top chrome; `max-h` + `overflow-y-auto` is what stops a fully-refused
         ticket from having its last sentences cut off by the pane floor. */
      className="absolute top-16 right-[76px] z-20 w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-border bg-wm-surface/95 p-2 shadow-2xl backdrop-blur-md"
      data-testid="chart-inspect-ticket"
      // Published so an outside probe can compare the ticket's own verdict
      // against the switches and the tape, without parsing a human sentence.
      data-inspect-reach={vm.reach}
      data-inspect-read={vm.readCount}
      aria-label={`Inspect ticket. ${vm.headline}. ${vm.reachNote}`}
    >
      <div className="flex items-center gap-2">
        <Crosshair size={11} className="text-wm-gold" />
        <span className="text-[11px] font-bold text-wm-gold">Inspect Ticket</span>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close the inspect ticket"
          className="ml-auto text-wm-muted hover:text-white"
        >
          <X size={12} />
        </button>
      </div>

      <div className="pt-1.5 text-[10px] font-bold tracking-wide text-wm-muted">
        {followingLiveBar ? "LIVE BAR" : "SELECTED BAR"}
      </div>
      <div className="text-[11px] font-bold tabular-nums text-white">
        {time ? `${time}` : "—"}
        {vm.price !== null && <span className="text-wm-muted"> · {vm.price}</span>}
      </div>
      {/*
        Stated, not implied. A trader who moved the cursor off the chart and got
        a different set of numbers deserves to be told the panel changed subject.
      */}
      {followingLiveBar && (
        <div className="pt-0.5 text-[10px] leading-snug text-wm-muted">
          The cursor is off the chart, so this is the bar still forming. Hover a
          candle to inspect it instead.
        </div>
      )}

      <div className="mt-1.5 border-t border-wm-border pt-1">
        {vm.rows.map(row => (
          <Row key={row.id} row={row} />
        ))}
      </div>

      {/*
        THE TAPE'S REACH, ON THE GLASS AND ALWAYS.
        Each row already carries its own absence, but the reach is one fact
        behind three rows. Printed once here so a trader can learn the shape of
        the limitation instead of re-reading it in every row it caused.
      */}
      <div className="mt-1.5 border-t border-wm-border pt-1 text-[10px] leading-snug text-wm-muted">
        {vm.reachNote}
      </div>

      {/*
        A DOOR THAT LEADS SOMEWHERE EMPTY IS WORSE THAN NO DOOR. The button is
        only offered when the footprint can actually divide this bar; otherwise
        the reason it is not offered is printed in its place, which is the more
        useful of the two things the space can hold.
      */}
      {vm.footprintDoorAvailable ? (
        <button
          onClick={onOpenFootprint}
          data-testid="chart-inspect-footprint-door"
          className="mt-1.5 w-full rounded border border-wm-gold/40 px-2 py-1 text-[10px] font-bold text-wm-gold hover:bg-wm-gold/10"
        >
          View Full Footprint →
        </button>
      ) : (
        <div className="mt-1.5 text-[10px] leading-snug" style={{ color: UNREAD_COLOR }}>
          {vm.footprintDoorNote}
        </div>
      )}
    </div>
  );
}

export default ChartInspectTicket;
