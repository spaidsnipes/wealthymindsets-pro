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
}: CanvasSummaryPillProps): React.ReactElement | null {
  // Canon §Silence Is A Feature: without a snapshot AND without a
  // compiled decision, there's nothing to summarise. Render nothing.
  const hasAnything =
    vm.hasSnapshot ||
    vm.verdict !== "UNKNOWN" ||
    vm.missing.length > 0 ||
    vm.blockers.length > 0 ||
    vm.invalidators.length > 0;
  if (!hasAnything) return null;

  const parts: string[] = [];
  if (vm.missing.length > 0) parts.push(`${vm.missing.length} missing`);
  if (vm.blockers.length > 0) parts.push(`${vm.blockers.length} blockers`);
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
  if (vm.blockers.length > 0) tooltipLines.push("", "Why not:", ...vm.blockers.slice(0, 3).map((b) => `  · ${b}`));
  if (vm.invalidators.length > 0) tooltipLines.push("", "Would invalidate:", ...vm.invalidators.slice(0, 3).map((s) => `  · ${s}`));
  if (vm.missing.length > 0) tooltipLines.push("", `Missing: ${vm.missing.slice(0, 4).join(", ")}${vm.missing.length > 4 ? " …" : ""}`);
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
      {parts.length > 0 && (
        <span style={{ color: "#8a8271" }}>·</span>
      )}
      {parts.length > 0 && (
        <span style={{ color: "#d8cfb8" }}>{parts.join(" · ")}</span>
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
