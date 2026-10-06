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
import {
  CANON_LADDER, CANON_LADDER_GROUPS, CHART_TF_SHIPPED, canonRungSpokenName, getTimeframe,
  timeframeSpokenName, type CanonRung, type TFId,
} from "@/lib/timeframes";
import { canonAvailabilityFor, ladderOnNowSentence } from "@/lib/marketData/chartBarRoute";

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
  /** The chart's symbol. Whether a rung's bars are the provider's own or
   *  rebuilt by WM depends on which route serves THIS instrument (§26). */
  symbol: string;
}

export function TimeframeGlassChip({ timeframe, setTimeframe, symbol }: Props) {
  const [open, setOpen] = useState(false);
  const [ladderOpen, setLadderOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // ONE door for every timeframe choice on the glass (2026-09-26). The nine on
  // the strip and every servable rung of the full ladder switch the chart
  // through this and nothing else, so the ladder cannot grow a second path to
  // `setTimeframe` that skips closing the menu, or that a future guard added
  // here would miss.
  const choose = (id: TFId) => { setTimeframe(id); setOpen(false); };

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
          className="wm-chart-timeframes flex items-center justify-center gap-0.5 mb-1.5 px-1.5 py-1 rounded-lg wm-room-chrome border border-wm-border"
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
                onClick={() => choose(id)}
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
          {/* THE ONE EXPANDABLE CONTROL (Garden 16 §24, "UX COMPRESSION ≠
              FEATURE DELETION", 2026-09-26). The nine above stay the calm
              primary set; this reveals the whole canonical ladder beneath
              the strip. A disclosure, so it says expanded or collapsed and
              nothing else — it is never "current", because it is not a
              timeframe. */}
          <button
            type="button"
            onClick={() => setLadderOpen(v => !v)}
            aria-expanded={ladderOpen}
            aria-controls={TIMEFRAME_LADDER_ID}
            aria-label="More timeframes"
            title="All timeframes"
            className={clsx(
              "wm-chart-timeframe wm-chart-timeframe-more px-2 h-7 rounded text-[11px] font-mono transition-colors",
              ladderOpen
                ? "text-wm-text bg-wm-surface"
                : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface",
            )}
          >
            More <span aria-hidden="true">{ladderOpen ? "\u25B4" : "\u25BE"}</span>
          </button>
        </div>
      )}
      {open && ladderOpen && <TimeframeLadder timeframe={timeframe} symbol={symbol} onChoose={choose} />}

      <button
        type="button"
        // Opening on a timeframe the strip does not carry (3m, 2h … picked from
        // the ladder, or a deep link) opens the ladder with it, so the current
        // timeframe is on screen and marked the moment the menu appears.
        onClick={() => {
          if (!open) setLadderOpen(!CHART_TF_SHIPPED.includes(timeframe as TFId));
          setOpen(o => !o);
        }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Timeframe: ${timeframeSpokenName(timeframe as never)}. Change timeframe.`}
        title={`Timeframe: ${timeframeSpokenName(timeframe as never)}`}
        style={{ pointerEvents: "auto" }}
        className={clsx(
          "wm-chart-timeframe-chip-trigger wm-tap-slop block mx-auto px-3 h-7 min-w-11 rounded",
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

/** The ladder panel's id — the More control's `aria-controls` names it. */
export const TIMEFRAME_LADDER_ID = "wm-chart-timeframe-ladder";

interface LadderProps {
  timeframe: string;
  /** The chart's symbol: each rung is re-measured against the route that
   *  serves THIS instrument (canonAvailabilityFor). */
  symbol: string;
  /** The chip's own `choose` — the same door the strip's nine use. */
  onChoose: (id: TFId) => void;
  /** Overrides the per-symbol ladder. A prop only so a test can hand it a rung
   *  of a shape no live symbol produces and watch it be drawn. */
  rungs?: readonly CanonRung[];
}

/**
 * THE WHOLE CANONICAL LADDER, GROUPED, ON THE GLASS (2026-09-26).
 *
 * Every rung the Founder's timeframe family names is drawn, TICK and seconds
 * included, because canon asks for "a calm primary set plus one fast
 * expandable interval picker that exposes the full family", and a rung that is
 * missing from the picker reads as a rung that does not exist. What the chart
 * can do with each rung is not decided here: CANON_LADDER in the registry owns
 * that, measured against the bar routes.
 *
 *   NATIVE / DERIVED   a real button in the strip's own look, wired to the
 *                      chip's `choose`. A derived rung also says "derived",
 *                      aloud and on the glass: canon forbids passing one off
 *                      as provider-native.
 *   UNAVAILABLE        visible and NOT a button. Dashed, dim, no hover, no
 *                      focus stop (a thing that cannot be pressed must not
 *                      look pressable), and its reason printed in words under
 *                      its group, not in a tooltip a touch screen never shows.
 *
 * No hooks, on purpose: the panel is a pure function of the ladder and the
 * current timeframe, which is what lets a test call it and press its buttons
 * without a DOM.
 */
export function TimeframeLadder({ timeframe, symbol, onChoose, rungs: given }: LadderProps) {
  const rungs = given ?? CANON_LADDER.map(r => canonAvailabilityFor(r, symbol));
  // When no rung is the chart's timeframe (6M / 1Y drawn unavailable, or
  // 45m / 3M / 2Y / 5Y which are not rungs), say what the chart is on in
  // words. No rung is marked current for it: an unavailable rung is never
  // dressed as a healthy one.
  const onNow = ladderOnNowSentence(timeframe, symbol, rungs);
  return (
    <section
      id={TIMEFRAME_LADDER_ID}
      aria-label="All timeframes"
      className="wm-chart-timeframe-ladder w-full min-w-[min(92vw,360px)] mb-1.5 px-2 py-1.5 rounded-lg wm-room-chrome border border-wm-border"
      // WIDTH, MEASURED in a component harness on 2026-09-26 (real chip, real
      // globals.css). A fixed 360px panel under the 366px desktop strip left
      // the two left edges 3px apart at 1600x900. Plain `w-full` fixed that
      // and broke the phone: the chip's wrapper sits at `left: 50%`, so at
      // 390px it had 195px to shrink into and the strip was pushed off the top
      // of the screen. So: `inline-size` containment stops the reason
      // sentences from widening the popover, `w-full` takes the strip's width
      // on desktop, and the min-width floor keeps it a readable 358px on a
      // phone — where the strip, a block-level flex row, stretches to match.
      style={{ pointerEvents: "auto", contain: "inline-size" }}
    >
      {onNow && (
        <p className="wm-chart-timeframe-on-now pb-1 mb-0.5 border-b border-wm-border text-[10px] leading-snug font-mono text-wm-text">
          {onNow}
        </p>
      )}
      {CANON_LADDER_GROUPS.map(group => {
        const inGroup = rungs.filter(r => r.group === group.id);
        if (inGroup.length === 0) return null;
        // One line per distinct reason, naming the rungs it covers: six rungs
        // that share a reason read it once, not six times.
        const reasons = new Map<string, string[]>();
        for (const r of inGroup) {
          if (r.availability !== "UNAVAILABLE") continue;
          reasons.set(r.reason, [...(reasons.get(r.reason) ?? []), r.id]);
        }
        const headingId = `${TIMEFRAME_LADDER_ID}-${group.id}`;
        return (
          <section key={group.id} aria-labelledby={headingId} className="wm-chart-timeframe-ladder-group py-1">
            <h3 id={headingId} className="mb-1 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-wm-text-dim">
              {group.label}
            </h3>
            <ul className="flex flex-wrap items-center gap-0.5">
              {inGroup.map(r => <li key={r.id}>{ladderRung(r, timeframe, onChoose)}</li>)}
            </ul>
            {[...reasons].map(([reason, ids]) => (
              <p key={reason} className="wm-chart-timeframe-reason mt-1 text-[10px] leading-snug text-wm-text-dim">
                <span className="font-mono text-wm-text-muted">{ids.join(" \u00B7 ")}</span>: {reason}
              </p>
            ))}
          </section>
        );
      })}
    </section>
  );
}

function ladderRung(r: CanonRung, timeframe: string, onChoose: (id: TFId) => void) {
  const spoken = canonRungSpokenName(r);
  if (r.availability === "UNAVAILABLE") {
    return (
      <span
        data-availability={r.availability}
        title={`${spoken}: ${r.reason}`}
        className="wm-chart-timeframe-off inline-flex items-center justify-center px-2 h-7 rounded text-[11px] font-mono text-wm-text-dim border border-dashed border-wm-border cursor-not-allowed select-none"
      >
        {r.id}<span className="sr-only">, {spoken}, unavailable</span>
      </span>
    );
  }
  const active = r.chartTf === timeframe;
  const derived = r.availability === "DERIVED_CANONICAL";
  const name = derived ? `${spoken}, derived from finer bars` : spoken;
  return (
    <button
      type="button"
      data-availability={r.availability}
      onClick={() => onChoose(r.chartTf)}
      aria-current={active ? "true" : undefined}
      aria-label={name}
      title={name}
      className={clsx(
        "wm-chart-timeframe px-2 h-7 rounded text-[11px] font-mono transition-colors",
        active
          ? "bg-wm-blue/20 text-wm-blue border border-wm-blue/40"
          : "text-wm-text-muted hover:text-wm-text hover:bg-wm-surface",
      )}
    >
      {r.id}
      {derived && <span aria-hidden="true" className="ml-0.5 text-[9px] text-wm-text-dim">derived</span>}
    </button>
  );
}
