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
import { marketCanvasVerdictTone } from "@/lib/design/marketCanvasVerdictTone";

export interface CanvasBadgeMiniProps {
  readonly vm: MarketCanvasVM;
  readonly className?: string;
  /** Optional aria-label; defaults to "Canvas verdict: {verdict}". */
  readonly ariaLabel?: string;
}

/**
 * The tone table MOVED to `@/lib/design/marketCanvasVerdictTone`.
 *
 * It was born here because this badge is the only one of the three canvas
 * surfaces that needs a frame as well as a foreground — so the richest version
 * of the fact lived in the smallest component, while the panel and the pill
 * each kept their own foreground-only copy. Three tables, one fact. The owner
 * now holds all three fields and the word-only surfaces read `.fg` from it.
 * Every value below is unchanged.
 */

export function CanvasBadgeMini({
  vm,
  className,
  ariaLabel,
}: CanvasBadgeMiniProps): React.ReactElement | null {
  // Canon §Silence: without a snapshot AND without a compiled decision,
  // there is nothing to badge. Skip rendering.
  if (!vm.hasSnapshot && vm.verdict === "UNKNOWN") return null;

  const tone = marketCanvasVerdictTone(vm.verdict);

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
