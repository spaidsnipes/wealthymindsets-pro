"use client";

/**
 * CanvasBadgeMini — compact verdict-only badge for tight surfaces.
 *
 * Renders just the RightOfWay verdict as a tone-colored 5-9 char text
 * chip (e.g. "ACTION", "WAIT", "NO TRADE"). Sibling to
 * <CanvasSummaryPill> which is richer but wider.
 *
 * Use cases: watchlist rows, mobile bottom bar, dense analytics grids,
 * anywhere too tight for the full summary pill but where the trader
 * benefits from a one-glance verdict.
 *
 * Silent when the VM has no snapshot AND verdict is UNKNOWN
 * (canon §Silence).
 */

import * as React from "react";
import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";

export interface CanvasBadgeMiniProps {
  readonly vm: MarketCanvasVM;
  readonly className?: string;
  /** Optional aria-label; defaults to "Canvas verdict: {verdict}". */
  readonly ariaLabel?: string;
}

const VERDICT_TONE: Record<
  MarketCanvasVM["verdict"],
  { fg: string; border: string; bg: string }
> = {
  ACTION:      { fg: "#d4af37", border: "rgba(212,175,55,0.55)",  bg: "rgba(212,175,55,0.10)" },
  CAUTION:     { fg: "#c9a55c", border: "rgba(201,165,92,0.45)",  bg: "rgba(201,165,92,0.08)" },
  WAIT:        { fg: "#c9a55c", border: "rgba(201,165,92,0.40)",  bg: "rgba(201,165,92,0.06)" },
  "NO TRADE":  { fg: "#e07b5c", border: "rgba(224,123,92,0.45)",  bg: "rgba(224,123,92,0.10)" },
  UNKNOWN:     { fg: "#8a8271", border: "rgba(138,130,113,0.30)", bg: "rgba(138,130,113,0.04)" },
};

export function CanvasBadgeMini({
  vm,
  className,
  ariaLabel,
}: CanvasBadgeMiniProps): React.ReactElement | null {
  // Canon §Silence: without a snapshot AND without a compiled decision,
  // there is nothing to badge. Skip rendering.
  if (!vm.hasSnapshot && vm.verdict === "UNKNOWN") return null;

  const tone = VERDICT_TONE[vm.verdict];

  return (
    <span
      aria-label={ariaLabel ?? `Canvas verdict: ${vm.verdict}`}
      role="status"
      data-testid="canvas-badge-mini"
      data-verdict={vm.verdict}
      title={vm.headline || vm.verdict}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 6px",
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: tone.fg,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {vm.verdict}
    </span>
  );
}

export default CanvasBadgeMini;
