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
import type { SelectedBigTrade } from "@/lib/bigTradeLevels";
import { describeAggressorMethod } from "@/lib/bubbleClaim";
import { Crosshair, X } from "lucide-react";

import type { InspectTicketVM, TicketRow } from "@/lib/marketData/viewModels/selectInspectTicket";
import type { ProfileSliceResult } from "@/lib/marketData/viewModels/selectProfileSlice";

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
  selectedPrint = null,
  selectedProfileSlice = null,
  profileSliceSymbol = "",
  profileSliceAsOf = null,
}: {
  vm: InspectTicketVM;
  followingLiveBar: boolean;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Takes the trader to the surface that divides this bar by price level. */
  onOpenFootprint: () => void;
  selectedPrint?: SelectedBigTrade | null;
  /** H-601 · a clicked Living Profile bucket, resolved by `selectProfileSlice`. */
  selectedProfileSlice?: ProfileSliceResult | null;
  profileSliceSymbol?: string;
  /** Unix seconds of the newest bar the profile was built from. */
  profileSliceAsOf?: number | null;
}) {
  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        aria-label="Open the inspect ticket for the bar under the cursor"
        data-testid="chart-inspect-reopen"
        className="wm-chart-reading-anchor absolute top-16 right-[76px] z-20 flex items-center gap-1 rounded border px-2 h-6 text-[10px] font-bold tracking-wide"
        style={{ background: "#131520", borderColor: "#1E2030", color: "#8B8FA8" }}
      >
        <Crosshair size={10} />
        INSPECT
      </button>
    );
  }

  /*
    H-601 · SELECTED PROFILE SLICE. The same ticket, the same place, one more
    kind of selected object. It says only what the profile compiler measured
    about the bucket, and the profile's fidelity — never an intent, never a
    call. A click that found no traded bucket says so instead of going quiet.
  */
  if (selectedProfileSlice) {
    const sl = selectedProfileSlice;
    const fmt = (n: number) => n.toFixed(2);
    return (
      <section className="absolute top-16 right-[76px] z-20 w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md"
        data-testid="chart-inspect-ticket"
        data-inspect-profile-slice={sl.found ? String(sl.price) : sl.miss}
        aria-label={sl.found ? `Inspect profile slice at ${fmt(sl.price)}` : "Inspect profile slice: no traded bucket at that price"}>
        <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
          <Crosshair size={11} /> PROFILE SLICE · LIVING
          <button className="ml-auto" aria-label="Close the inspect ticket" onClick={() => onOpenChange(false)}><X size={12} /></button>
        </div>
        {sl.found ? (
          <>
            <div className="mt-2 text-[11px] text-white">{profileSliceSymbol} · {fmt(sl.price)} – {fmt(sl.priceHigh)}{sl.isPoc ? " · POC" : ""}</div>
            <dl className="mt-2 text-[11px] break-words space-y-1" style={{ color: "#C8C0AE" }}>
              <dt>Volume vs POC bucket</dt><dd className="text-white">{Math.round(sl.shareOfPoc * 100)}%</dd>
              <dt>Location</dt><dd className="text-white">{sl.location === "IN_VALUE" ? "Inside value" : sl.location === "ABOVE_VALUE" ? "Above value" : "Below value"}</dd>
              <dt>Distance from POC</dt><dd>{sl.distanceFromPoc == null ? "UNKNOWN" : `${sl.distanceFromPoc >= 0 ? "+" : ""}${fmt(sl.distanceFromPoc)}`}</dd>
              <dt>Node</dt><dd>{sl.node ?? (sl.nodesWithheld ? "WITHHELD — candle-estimated profile" : "none")}</dd>
              <dt>Fidelity</dt><dd>{sl.estimated ? "CANDLE-ESTIMATED — bar volume spread over each bar's range" : "TRADE-BASED — prints placed at their price"}</dd>
              <dt>As of · UTC</dt><dd>{profileSliceAsOf != null ? new Date(profileSliceAsOf * 1000).toISOString() : "UNKNOWN"}</dd>
            </dl>
            <p className="mt-2 border-t border-wm-border pt-2 text-[10px]" style={{ color: "#C8C0AE" }}>A bucket is where size traded, not who traded it or why. Intent: UNKNOWN.</p>
          </>
        ) : (
          <p className="mt-2 text-[11px]" style={{ color: UNREAD_COLOR }}>
            {sl.miss === "NO_PROFILE" ? "No Living Profile is drawn, so there is no slice to read." : "No traded bucket at that price. The profile took no volume there."}
          </p>
        )}
      </section>
    );
  }

  if (selectedPrint) {
    const p = selectedPrint;
    const stamped = p.aggressorMethod === "PROVIDER" || p.aggressorMethod === "MAKER_SIDE_INVERTED";
    const inferred = p.aggressorMethod === "TICK_RULE" || p.aggressorMethod === "QUOTE_TEST";
    return (
      <section className="absolute top-16 right-[76px] z-20 w-[228px] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-wm-gold/40 bg-wm-surface/95 p-3 shadow-2xl backdrop-blur-md"
        data-testid="chart-inspect-ticket" data-inspect-print={p.printKey}
        aria-label={`Inspect selected print for ${p.symbol}`}>
        <div className="flex items-center gap-2 text-wm-gold text-[11px] font-bold">
          <Crosshair size={11} /> SELECTED PRINT
          <button className="ml-auto" aria-label="Close the inspect ticket" onClick={() => onOpenChange(false)}><X size={12} /></button>
        </div>
        <div className="mt-2 text-[11px] text-white">{p.symbol} · {p.timeframe}</div>
        <dl className="mt-2 text-[11px] break-words space-y-1" style={{ color: "#C8C0AE" }}>
          <dt>Executed price</dt><dd className="text-white">{String(p.priceLevel)}</dd>
          <dt>Executed size</dt><dd className="text-white">{String(p.total)}</dd>
          <dt>Execution time · UTC</dt><dd>{p.timeMs != null ? new Date(p.timeMs).toISOString() : "UNKNOWN"}</dd>
          <dt>Side fidelity</dt><dd>{stamped ? "OBSERVED" : inferred ? "INFERRED" : "UNKNOWN"}{stamped || inferred ? ` · ${p.ask >= p.bid ? "buy" : "sell"} classification` : " · classification not verified"}</dd>
          <dd>{describeAggressorMethod(p.aggressorMethod)}</dd>
          <dt>Execution identity</dt><dd>{p.printKey ?? "UNKNOWN"}</dd>
        </dl>
        <p className="mt-2 border-t border-wm-border pt-2 text-[10px]" style={{ color: "#C8C0AE" }}>Participant and intent: UNKNOWN. This retained print is not a live quote. Raw tape is session-only; refresh may remove it.</p>
      </section>
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
