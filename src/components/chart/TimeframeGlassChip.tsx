"use client";

/**
 * THE TIMEFRAME LIVES ON THE GLASS, NOT IN A BAND ABOVE IT.
 *
 * CANON. Two frames of the Visual Systems Execution Canon were opened and
 * LOOKED AT (not read about) on 2026-09-21 before this file existed:
 *
 *   F24 "workspace equipment over live chart" — the only timeframe furniture
 *   in the whole frame is ONE bordered chip reading `1D`, at BOTTOM CENTER of
 *   the candle pane, sharing that edge with `Vol 68.92M` at bottom left. There
 *   is no row of nine.
 *
 *   C-101 "SITE PLAN — HOME AUTHORITY" (IFC, rev 19 Sep 2026) — the market
 *   canvas is drawn with exactly two pieces of axis furniture, a price axis on
 *   the right and a time axis along the bottom, and the sheet budgets
 *   "charts 70% FLOOR AREA". Nothing is drawn above the candles at all.
 *
 * THE DEFECT THIS ALSO CURES, found by LOOKING at the rendered build at 1440
 * rather than by measuring it. The nine chips lived in `.wm-chart-toolbar`,
 * a `overflow-x: auto` strip with `scrollbarWidth: "none"`, and the pinned
 * workspace strip overlaps that same band from the right. At 1440 the band
 * rendered `1m 2m` and then stopped: SEVEN OF THE NINE TIMEFRAMES WERE OFF
 * THE END OF A SCROLLER WITH NO VISIBLE SCROLLBAR. A DOM query would have
 * reported nine buttons present and nine buttons reachable by code. They were
 * not reachable by a hand. Capability is not restored here so much as it is
 * returned — this chip can never be clipped, because it is centred on the
 * glass and owns its own layer.
 *
 * CAPABILITY IS UNTOUCHED. Same nine `CHART_TF_SHIPPED` ids, same
 * `setTimeframe` handler, same `timeframeSpokenName` announcement, same
 * `aria-current` state semantics that the 2026-09-19 repair established (and
 * for the same reason that repair declined `aria-pressed`: there is no such
 * thing as a chart with no timeframe, so un-pressing is not a state this
 * application has). What changed is where the hand reaches.
 */

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { CHART_TF_SHIPPED, getTimeframe, timeframeSpokenName } from "@/lib/timeframes";

/**
 * THE FOOTER BAND THE CHIP LIVES IN — and the defect that proved it necessary.
 *
 * FIRST ATTEMPT, and why it was wrong. The chip was placed at `bottom: 6` on
 * the pane, which reads as "bottom centre of the candle pane" and satisfies
 * every DOM assertion: one chip, centred to the half-pixel, all nine options
 * on screen, none covered. It was still wrong, and only LOOKING showed it.
 *
 * MEASURED at 1440 on 2026-09-21 (scratchpad/probe-timeaxis.mjs): the candle
 * canvas runs y=129→823 and the time axis is its own 28px canvas from y=823 to
 * y=851. A 28px chip sitting 6px off the pane bottom occupies y=817→845 — it
 * straddles the boundary and COVERS 22 OF THE 28 PIXELS OF THE TIME AXIS. In
 * the render a date label was simply gone behind it. C-101 draws the market
 * canvas with exactly two pieces of axis furniture, a price axis right and a
 * time axis bottom; putting the timeframe on top of one of the two is not
 * placing furniture, it is blocking a door.
 *
 * WHAT F24 ACTUALLY DRAWS, looked at again rather than remembered: the axis
 * labels (`Dec 2025 Feb Mar Apr May Jun`) are fully legible and the bordered
 * `1D` chip sits BELOW them, in a clear footer band it shares with
 * `Vol 68.92M` at the left. The chip is not over the market and not over the
 * axis — it is in a strip of its own beneath both.
 *
 * So the pane RESERVES this many pixels at its bottom edge and the chart
 * shrinks to fit above them. Reserving is what makes the guarantee absolute:
 * an overlay merely told to sit lower is one font change away from covering
 * the axis again, whereas a band the canvas was never given cannot be drawn
 * into. This is the same single-owner rule the price legend's corner needed
 * when the data-window toggle and the canvas BASIS caption collided — except
 * here the second owner is a canvas that cannot see DOM at all, so the only
 * negotiation available is floor space.
 *
 * Costed, not waved through: 34px off a 723px pane at 1440. C-101 budgets
 * "charts 70% FLOOR AREA"; the pane is 723 of 900 (80.3%) and 689 of 900
 * (76.6%) after. Still above floor, and it buys back a legible time axis.
 */
export const TIMEFRAME_FOOTER_H = 34;

/**
 * Where the chip sits inside that band — centred in the 34px, so the 28px chip
 * gets 3px of air above and below.
 */
export const TIMEFRAME_CHIP_BOTTOM_PX = 3;

interface Props {
  timeframe: string;
  setTimeframe: (t: string) => void;
}

export function TimeframeGlassChip({ timeframe, setTimeframe }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // A menu on the trading glass that cannot be dismissed without choosing is a
  // trap over the market. Escape and outside-press both close it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  const current = CHART_TF_SHIPPED.includes(timeframe as never)
    ? getTimeframe(timeframe as never).label
    : timeframe;

  return (
    <div
      ref={rootRef}
      className="wm-chart-timeframe-chip"
      style={{
        position: "absolute",
        bottom: TIMEFRAME_CHIP_BOTTOM_PX,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        // The pane above owns the crosshair, drawing and context menu. This
        // wrapper must not swallow those anywhere except under its own ink.
        pointerEvents: "none",
      }}
    >
      {open && (
        <div
          // `wm-chart-timeframes` stays FIRST and `role`/`aria-label` follow it:
          // timeframeSpokenName.test.ts anchors on that class name and reads
          // FORWARD to the next `</div>`, so anything declared above it is
          // outside the slice and invisible to the guard. Attribute order is
          // load-bearing here. Same constraint the pinned-cluster class carries
          // in ChartToolbar.tsx for chartPhoneControlReachability.
          className="wm-chart-timeframes flex items-center gap-0.5 mb-1.5 px-1.5 py-1 rounded-lg wm-room-chrome border border-wm-border"
          role="group"
          aria-label="Chart timeframe"
          style={{ pointerEvents: "auto" }}
        >
          {CHART_TF_SHIPPED.map(id => {
            const active = id === timeframe;
            const spoken = timeframeSpokenName(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setTimeframe(id); setOpen(false); }}
                // CARRIED FORWARD, not re-derived. This attribute is the
                // residue of two live measurements and one reversal, and the
                // reasoning moves with the control or it gets re-litigated by
                // whoever touches this next:
                //
                // MEASURED LIVE 2026-09-17: all nine buttons returned
                // aria-pressed/aria-current/aria-selected/role/aria-label =
                // null. Which timeframe the chart was on was expressed by
                // exactly one thing, a background colour — and the timeframe is
                // the provenance word on every number in the header.
                //
                // MEASURED 2026-09-19 on live /charts at 1920: the first repair
                // reached for `aria-pressed`, and 5m reported `"true"`; pressing
                // it again left it `"true"` with the chart unchanged.
                // `aria-pressed` is a contract, not a lamp — the whole meaning
                // of the role is that pressing again reverses it — and there is
                // no such thing as a chart with no timeframe. Nine exist,
                // exactly one is current, and un-pressing 5m is not a state this
                // application has, so no handler could have rescued it. The
                // claim was REPLACED, not dropped; dropping it would have handed
                // the state back to `bg-wm-blue/20`, colour carrying provenance.
                //
                // Not promoted to role="radiogroup"/"radio"/aria-checked, the
                // textbook widget for a nine-item single select. Declined for a
                // behavioural reason, not a cosmetic one: a radio group's arrow
                // keys move the SELECTION, not merely the focus, so arrowing
                // across these would fire a bar refetch per keypress on the
                // primary trading surface. Claiming the role without the arrows
                // trades a control that lies about reversal for one that lies
                // about navigation — the quieter, costlier kind.
                //
                // What the MOVE TO THE GLASS changed about that cost, recorded
                // rather than left implied: the nine were nine permanent tab
                // stops in the toolbar. Behind this chip they are nine tab stops
                // only while the menu is open, so the resting keyboard path
                // across the chrome is eight stops shorter than it was.
                aria-current={active ? "true" : undefined}
                aria-label={spoken}
                title={spoken}
                className={clsx(
                  "wm-chart-timeframe px-2 h-7 rounded text-[11px] font-mono transition-colors",
                  active
                    ? "bg-wm-blue/20 text-wm-blue border border-wm-blue/40"
                    : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface",
                )}
              >
                {getTimeframe(id).label}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Timeframe: ${timeframeSpokenName(timeframe as never)}. Change timeframe.`}
        title={`Timeframe: ${timeframeSpokenName(timeframe as never)}`}
        style={{ pointerEvents: "auto" }}
        className={clsx(
          "wm-chart-timeframe-chip-trigger block mx-auto px-3 h-7 min-w-11 rounded",
          "text-[11px] font-mono font-bold tracking-wide",
          "wm-room-chrome border border-wm-border",
          "text-wm-text-dim hover:text-wm-text hover:border-wm-blue/40 transition-colors",
        )}
      >
        {current}
      </button>
    </div>
  );
}
