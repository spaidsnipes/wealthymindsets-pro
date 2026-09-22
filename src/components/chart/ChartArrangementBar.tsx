"use client";

/**
 * THE ARRANGEMENT CHIP — the chart says which desk it is currently at.
 *
 * Canon FL-08 (WORKSPACE_IS_SURFACE) puts three named arrangements in the chart
 * header — ORDER FLOW, REGIME, REVIEW — and declares the live one beneath the
 * chart as "WORKSPACE: ORDER FLOW ● LIVE". Canon FL-02 states the law the
 * header is an expression of: "WORKSPACE IS A CHART STATE NOT AN APP."
 *
 * ── WHY ONE CHIP AND NOT THREE BUTTONS ─────────────────────────────────────
 *
 * Three always-visible buttons is the literal reading of the plate, and it is
 * the wrong build here. This toolbar already carries a timeframe row, a session
 * row, Indicators, Profiles, Appearance, Smart Money and Chart tools. The
 * Founder's instruction about this exact surface was "SO THE APP DOESNT GET
 * CLUTTERED WITH BROKEN BUILDS AND NEW BUILDS" — and three more naked buttons
 * would push the row into the horizontal scroll that already cost this product
 * the Smart Money button once.
 *
 * More importantly, three bare buttons have nowhere to put the truth. Each desk
 * needs a sentence saying what it can actually draw on the tape in front of the
 * trader, and a chip-with-popover is the only shape that fits a sentence. The
 * plate's declaration line survives intact — it is the chip's own label, which
 * is a better home than a strip under the chart because it sits beside the
 * switches it describes.
 *
 * ── THE DESKS ARE NOT `disabled` WHEN THEY CANNOT FULLY DRAW ───────────────
 *
 * Same rule `ProfilesMenu` and `FootprintControls` already follow. A desk that
 * is only partly deliverable stays pressable and carries its reason, because:
 * the tape can start stating a side mid-session, and `disabled` removes the
 * control from a screen reader's button list. ORDER FLOW on a mute tape still
 * arms absorption, which is a real reading and often the only one — refusing
 * the press would withhold the one layer that works.
 *
 * Nothing here decides anything. `selectChartArrangement` compiles the desks,
 * their readiness and their sentences; this renders them and reports presses.
 *
 * ── THE CHIP IS GONE; THE DECLARATION IS NOT (2026-09-21) ──────────────────
 *
 * The chip lived in `.wm-chart-toolbar-pinned`, the sticky strip above the
 * candles that D-701 demolishes. MEASURED at 1440 on 2026-09-21 before the
 * cut: that strip laid out 823px wide over an `overflow-x: auto` row and
 * covered TWO of the row's own controls — the trading-hours select and
 * Indicators both failed `elementFromPoint` at their own centres.
 *
 * So the organ moves into the Tools drawer, and it moves as a PANEL rather
 * than a chip-with-popover: `ShellModalDrawer` traps Tab inside its own panel
 * and `PortalPopover` renders into `document.body`, so a chip in there would
 * have opened a surface a mouse could reach and a keyboard could not. The
 * declaration — the compiler's `WORKSPACE: ORDER FLOW · 1 OF 5` sentence,
 * shortfall count and all — is now the panel's own heading, still printed
 * verbatim and still carried into the accessible name.
 */

import React from "react";
import { LayoutGrid, Check } from "lucide-react";
import { selectProfileMenu, type ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import {
  selectChartArrangement,
  arrangementSwitches,
  type ArrangementId,
  type ArrangementEntry,
} from "@/lib/marketData/viewModels/selectChartArrangement";

/** Readiness is a colour AND a sentence, never only a colour. */
const READINESS_DOT: Record<ArrangementEntry["readiness"], string> = {
  FULL: "#4ADE80",
  PARTIAL: "#F0B429",
  NONE: "#8B8FA8",
};

export function ChartArrangementBar({
  barsPresent,
  printsPresent,
  observedAggressorFlow,
  active,
  onApply,
}: {
  /** Bars RECEIVED, not bars requested. */
  barsPresent: boolean;
  /** At least one real per-trade print received by this chart room. */
  printsPresent: boolean;
  /** A sided print OBSERVED, not promised. */
  observedAggressorFlow: boolean;
  /** The chart's current switch positions. */
  active: Readonly<Partial<Record<ProfileId, boolean>>>;
  /** Apply a whole desk at once. Receives every TOGGLE profile's new position. */
  onApply: (switches: Readonly<Partial<Record<ProfileId, boolean>>>) => void;
}) {
  const menu = selectProfileMenu({ barsPresent, printsPresent, observedAggressorFlow, active });
  const vm = selectChartArrangement({ menu });

  const press = (id: ArrangementId) => {
    onApply(arrangementSwitches(id, menu));
  };

  const atADesk = vm.activeId !== null;

  return (
    <section
        /*
          The declaration is printed VERBATIM into the accessible name rather
          than re-worded, for the same reason the profiles chip prints
          `silentNote` verbatim: the module that measured what the desk can
          deliver is the module entitled to describe it. Re-wording here is how
          the glass and the chrome drift apart.
        */
        aria-label={
          atADesk
            ? `Chart arrangement. ${vm.declaration}. ${
                vm.entries.find(e => e.active)?.note ?? ""
              }`
            : "Chart arrangement. The switches match none of the named desks. Choose one to arrange the chart."
        }
        title={
          vm.entries.find(e => e.active)?.note ??
          "How the chart is arranged — which readings are switched on together. Currently a custom set."
        }
        // Published so an outside probe can compare the declared desk against
        // the switches actually set, without parsing a human sentence.
        data-arrangement-active={vm.activeId ?? "CUSTOM"}
        data-testid="chart-arrangement-panel"
        className="min-w-0"
      >
        <div
          role="menu"
          aria-label="Chart arrangement"
          className="rounded-lg border border-wm-border bg-wm-surface/95 p-2"
        >
          <div className="px-2 pt-1 pb-2 text-[10px] font-bold tracking-widest text-wm-muted">
            WORKSPACE — HOW THE BOOK IS ARRANGED
          </div>

          {/* THE DECLARATION, WHERE THE CHIP USED TO PUT IT. This is the only
              place the shortfall count appears at a glance — "1 OF 5" is the
              whole reason the compiler exists — so it leads the panel rather
              than being something a second press reveals. */}
          <div
            className="flex items-center gap-1 px-2 pb-2 text-[12px] font-bold"
            style={{ color: atADesk ? "#d4af37" : "#8B8FA8" }}
            data-testid="chart-arrangement-declaration"
          >
            <LayoutGrid size={11} aria-hidden />
            {vm.declaration}
          </div>

          {vm.entries.map(entry => (
            <button
              key={entry.id}
              role="menuitemradio"
              aria-checked={entry.active}
              onClick={() => press(entry.id)}
              title={entry.note}
              aria-label={entry.note}
              data-testid={`arrangement-${entry.id}`}
              data-arrangement-readiness={entry.readiness}
              className="w-full text-left rounded px-2 py-2 transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-wm-gold"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block rounded-full shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    background: READINESS_DOT[entry.readiness],
                  }}
                />
                <span
                  className="text-[12px] font-bold"
                  style={{ color: entry.active ? "#d4af37" : "#E8EAF2" }}
                >
                  {entry.label}
                </span>
                {entry.active && <Check size={11} className="text-wm-gold" />}
                <span className="ml-auto text-[10px] font-bold tabular-nums text-wm-muted">
                  {entry.deliverableCount}/{entry.armedCount} DRAWING
                </span>
              </div>
              {/*
                The purpose, not the mechanism. A desk named "Order Flow" that
                explains itself as "arms five toggles" has told the trader what
                the code does instead of what the chart will say.
              */}
              <div className="pl-4 pt-0.5 text-[11px] leading-snug text-wm-muted">
                {entry.purpose}
              </div>
              {/*
                The refusal goes on the GLASS, not only into `title`. A reason
                legible only on hover is a reason a touch user never receives —
                the same drawer-filed-receipt failure the profiles chip was
                repaired for.
              */}
              {entry.readiness !== "FULL" && (
                <div
                  className="pl-4 pt-1 text-[10px] leading-snug"
                  style={{ color: READINESS_DOT[entry.readiness] }}
                >
                  {entry.note}
                </div>
              )}
            </button>
          ))}

          {!atADesk && (
            <div className="mt-1 border-t border-wm-border px-2 pt-2 text-[10px] leading-snug text-wm-muted">
              Your switches match none of these. That is a normal place to be —
              nothing here will change until you choose a desk.
            </div>
          )}
        </div>
    </section>
  );
}
