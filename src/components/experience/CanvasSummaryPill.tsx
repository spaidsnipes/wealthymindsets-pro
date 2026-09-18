"use client";

/**
 * CanvasSummaryPill — one-line summary of the Phase 3 Market Canvas.
 *
 * A pill-shaped summary that fits in a header or chip row, showing:
 *
 *   VERDICT · M missing · B blockers · I would-invalidate
 *
 * When every canvas corner is empty (nothing missing / no blockers /
 * no invalidators) the pill renders the verdict alone, quietly. When
 * the whole VM is silent (no snapshot, no decision) the pill renders
 * nothing (canon §Silence Is A Feature — do not fake "canvas empty").
 *
 * Pure props → reusable in any header / chip row / mobile band without
 * pulling in the full MarketCanvasPanel.
 */

import * as React from "react";
import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";
import { DimensionStandingBand, standingInWords } from "./DimensionStandingBand";
import { requestEquipment } from "@/lib/workspace/equipmentChannel";
import { roomEquipment } from "@/lib/workspace/roomEquipment";

export interface CanvasSummaryPillProps {
  readonly vm: MarketCanvasVM;
  readonly className?: string;
  /** Optional aria-label; defaults to "Canvas summary". */
  readonly ariaLabel?: string;
  /**
   * Optional CSS selector to scroll into view on click / Enter / Space.
   * When supplied the pill renders as a <button> and centers the target
   * on activation. When omitted the pill stays a non-interactive <div
   * role="status">.
   */
  readonly scrollToSelector?: string;
  /**
   * A DESTINATION THAT IS NOT ON THE PAGE IS STILL A DESTINATION.
   *
   * FOUND FROM USE, production /charts?symbol=TSLA, 2026-09-18, and left OPEN
   * in the 2026-09-18 baton: `edde7236` made this pill stop TELLING the trader
   * to "open the canvas" on a surface that has no canvas — honest, but it left
   * them with a count of blockers and nowhere to go.
   *
   * `scrollToSelector` can only ever point at something already rendered. It
   * was the wrong shape for the instrument room, where the Market Reality panel
   * is PRESS-GATED equipment: genuinely absent until asked for, and asked for
   * by publishing on the equipment channel — not by scrolling.
   *
   * So the pill takes the door it is actually given. Supplying neither keeps
   * the passive `role="status"` pill, which is still correct for any surface
   * that truly has no destination.
   *
   * THE ROOM IS PART OF THE ADDRESS. The caller hands down BOTH its own route
   * and the equipment id, and the label is looked up in the canonical registry
   * rather than typed here. Two consequences, both deliberate:
   *
   *   - the pill can never name a door THIS room does not have — an id the
   *     registry does not list for this href yields no button at all, which is
   *     the same refusal `edde7236` shipped, now enforced instead of remembered;
   *   - the hint reads the rail's own wording, so the pill and the rail cannot
   *     drift into calling one destination by two names.
   */
  readonly openEquipment?: {
    readonly roomHref: string;
    readonly id: string;
  };
}

const HAIR = "rgba(139,106,41,0.22)";

const VERDICT_TONE: Record<MarketCanvasVM["verdict"], string> = {
  ACTION: "#d4af37",
  CAUTION: "#c9a55c",
  WAIT: "#c9a55c",
  "NO TRADE": "#e07b5c",
  UNKNOWN: "#8a8271",
};

export function CanvasSummaryPill({
  vm,
  className,
  ariaLabel,
  scrollToSelector,
  openEquipment,
}: CanvasSummaryPillProps): React.ReactElement | null {
  /* The door, VERIFIED AGAINST THE ROOM. A caller may ask for anything; only an
     entry the registry actually lists for this href becomes a control. */
  const door = openEquipment
    ? roomEquipment(openEquipment.roomHref).find((e) => e.id === openEquipment.id) ?? null
    : null;
  // Canon §Silence Is A Feature: without a snapshot AND without a
  // compiled decision, there's nothing to summarise. Render nothing.
  const hasAnything =
    vm.hasSnapshot ||
    vm.verdict !== "UNKNOWN" ||
    vm.missing.length > 0 ||
    vm.blockerCount > 0 ||
    vm.invalidators.length > 0;
  if (!hasAnything) return null;

  // `vm.missing` is state.unknowns — canonical DIMENSIONS that have not
  // resolved. They do NOT gate the verdict; `blockers` do. Labelling them
  // "missing" beside an ACTION verdict read as a direct contradiction
  // ("ACTION · 8 missing"), implying the decision was authorized despite
  // unpaid evidence — the exact appearance canon rejection #1 forbids, even
  // though the underlying authorization was correct. Name them for what they
  // are; the authorization logic is untouched.
  // "blockers" is the ONLY counter here whose label is a countable noun;
  // "unresolved", "cleared", and "would-invalidate" are participles and read
  // correctly at any count. A single blocker is the most common real state on
  // a live chart — the pill was shipping "NO TRADE · 8 unresolved · 1 blockers
  // · 1 cleared" on production /charts. Sloppy copy on the surface that
  // explains WHY a trade is refused undercuts the refusal itself.
  /* THE DIMENSION STANDING IS NOW DRAWN, NOT SPELLED.
   *
   * Two of these counters used to be words here: "8 unresolved · 1 measured".
   * They are the same fact `MarketCanvasPanel` draws as a row of marks, and one
   * fact in two registers is how two surfaces start disagreeing — these two
   * already had, this pill reading "7 unresolved" on live TSLA while the panel
   * beside it said "RESOLVED (4)", eleven of eight.
   *
   * As words they were also the wrong half of the truth. The pill printed only
   * the DARK buckets and never the lit one, so a trader could read the counts
   * and learn what the house does not know while never learning what it does.
   * The band carries all three, including the resolved marks nothing here
   * showed, and it does it in less room than the words took.
   *
   * What stays in words is what is NOT the same universe: blockers, clearances
   * and invalidators are evidence entries, not canonical dimensions, and no
   * denominator exists across them. Drawing them in the same row would invent
   * one.
   */
  const parts: string[] = [];
  // COUNT from `blockerCount`, never from `blockers.length` — the list is a
  // sample capped at 3 labels per evidence bucket. See DecisionWhyVM.
  if (vm.blockerCount > 0) {
    parts.push(`${vm.blockerCount} ${vm.blockerCount === 1 ? "blocker" : "blockers"}`);
  }
  if (vm.clearances.length > 0) parts.push(`${vm.clearances.length} cleared`);
  if (vm.invalidators.length > 0) parts.push(`${vm.invalidators.length} would-invalidate`);

  const commonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 10px",
    borderRadius: 999,
    border: `1px solid ${HAIR}`,
    background: "rgba(255,255,255,0.02)",
    fontSize: 10,
    letterSpacing: 0.4,
  };

  // X8 tooltip: compact hover-truth reveal. The pill can only show
  // counts because of space; the tooltip carries the actual headline
  // ("Right-of-way is blocked.") plus the top blocker / top invalidator
  // so a mouse-hover surfaces reasoning without scrolling to the panel.
  const tooltipLines: string[] = [`Canvas · ${vm.verdict}`];
  if (vm.headline) tooltipLines.push("", vm.headline);
  // THE BAND IS HIDDEN FROM ASSISTIVE TECHNOLOGY, SO THE WORDS MUST CARRY IT.
  // Built by the band's own owner from the same arrays in the same order, so
  // the picture and the sentence cannot drift into disagreeing.
  const standingWords = standingInWords(vm);
  if (standingWords) tooltipLines.push("", `Dimension standing: ${standingWords}.`);
  // The tooltip is a summary by design, but it must say how much it is
  // withholding — an unmarked truncation reads as a complete list.
  //
  // `total` defaults to the array length, but MUST be passed explicitly when
  // the array is already a capped sample — otherwise the remainder is computed
  // against the cap and reports "+0 more" while real items are withheld. That
  // is the same lie as an unmarked truncation, arrived at by arithmetic.
  //
  // THE REMAINDER IS A FACT; "OPEN THE CANVAS" IS AN INSTRUCTION, AND ONLY ONE
  // OF THE TWO IS TRUE ON EVERY SURFACE.
  //
  // FOUND FROM USE, production https://wealthymindsetspro.com/charts?symbol=TSLA,
  // 2026-09-18. The pill's tooltip read "+5 more — open the canvas". /charts
  // passes no `scrollToSelector`, so the pill rendered as a static
  // `<div role="status">` — there is no button, and the Market Reality canvas
  // is not on that page at all. The tooltip told the trader to perform an
  // action the surface cannot perform, and named a destination that does not
  // exist there.
  //
  // The truncation marker must survive — an unmarked truncation reads as a
  // complete list, which is the defect this helper was written to prevent. So
  // the COUNT is unconditional and the DIRECTION is earned: it appears only
  // when this pill is actually the control that reaches the canvas.
  //
  // The DIRECTION is still earned, and it now names the door it was handed:
  // "open the canvas" on a page that scrolls to one, the rail's own label on a
  // room that presses one open, and nothing at all where neither exists.
  const openHint = scrollToSelector
    ? " — open the canvas"
    : door
      ? ` — open ${door.label}`
      : "";
  const withRemainder = (
    items: readonly string[],
    shown: number,
    total: number = items.length,
  ): string[] => {
    const lines = items.slice(0, shown).map((x) => `  · ${x}`);
    if (total > shown) lines.push(`  · +${total - shown} more${openHint}`);
    return lines;
  };
  if (vm.blockerCount > 0) {
    tooltipLines.push("", `Why not (${vm.blockerCount}):`, ...withRemainder(vm.blockers, 3, vm.blockerCount));
  }
  if (vm.invalidators.length > 0) tooltipLines.push("", `Would invalidate (${vm.invalidators.length}):`, ...withRemainder(vm.invalidators, 3));
  if (vm.missing.length > 0) {
    tooltipLines.push(
      "",
      `Unresolved dimensions (${vm.missing.length}) — these do not gate the verdict; blockers do:`,
      ...withRemainder(vm.missing, 4),
    );
    if (vm.missing.length > 4) tooltipLines.push("  …");
  }
  const tooltip = tooltipLines.join("\n");

  const scroll = React.useCallback(() => {
    if (!scrollToSelector) return;
    const target = document.querySelector(scrollToSelector);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [scrollToSelector]);

  const body = (
    <>
      <span
        style={{
          textTransform: "uppercase",
          fontWeight: 700,
          color: VERDICT_TONE[vm.verdict],
        }}
      >
        {vm.verdict}
      </span>
      {/* HOW MUCH OF THE BOARD IS LIT, at chip scale. Drawn by the same owner
          as the panel's, so the header and the panel are one instrument at two
          sizes. aria-hidden because the whole reading is in the tooltip — a
          picture is not a caption for a screen reader, it is nothing at all. */}
      <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center" }}>
        <DimensionStandingBand vm={vm} testId="canvas-summary-standing" scale="pill" />
      </span>
      {parts.length > 0 && (
        <span className="wm-canvas-summary-detail" style={{ color: "#8a8271" }}>·</span>
      )}
      {parts.length > 0 && (
        <span className="wm-canvas-summary-detail" style={{ color: "#d8cfb8" }}>{parts.join(" · ")}</span>
      )}
    </>
  );

  if (scrollToSelector) {
    return (
      <button
        type="button"
        onClick={scroll}
        aria-label={ariaLabel ?? "Canvas summary — jump to detail"}
        title={tooltip}
        data-testid="canvas-summary-pill"
        className={className}
        style={{ ...commonStyle, cursor: "pointer", minHeight: 24 }}
      >
        {body}
      </button>
    );
  }

  if (door) {
    return (
      <button
        type="button"
        onClick={() => requestEquipment(door.id)}
        aria-label={ariaLabel ?? `Canvas summary — open ${door.label}`}
        title={tooltip}
        data-testid="canvas-summary-pill"
        data-equipment-open={door.id}
        className={className}
        style={{ ...commonStyle, cursor: "pointer", minHeight: 24 }}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      aria-label={ariaLabel ?? "Canvas summary"}
      role="status"
      title={tooltip}
      data-testid="canvas-summary-pill"
      className={className}
      style={commonStyle}
    >
      {body}
    </div>
  );
}

export default CanvasSummaryPill;
