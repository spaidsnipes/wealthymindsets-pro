import * as React from "react";

import {
  CANVAS_FIDELITY_MEANING,
  CANVAS_UNGRADED_UNKNOWN,
  CANVAS_UNGRADED_WORDS,
} from "@/lib/marketData/canvasFidelityWords";
import type { MarketFidelityReading } from "@/lib/marketData/marketFidelityAlgebra";
import type { CanvasUngraded } from "@/lib/marketData/readCanvasHonesty";

/**
 * CanvasFidelityChip — the Honesty Plaque's one word, where a phone can see it.
 *
 * Read on serving b94f28c at 390x844 (2026-10-09): the plaque is the fourth
 * 180px cell of the decision band, and the band starts at y 744 — under the
 * fixed WAIT / WHY row (743–792) and the thumb bar (792–844). Reaching the
 * plaque took a vertical scroll and two sideways swipes. This chip stands on
 * the WAIT / WHY row, which is always in the first screenful.
 *
 * It names its subject ("CHART"), so "CHART · INDICATIVE" beside a feed reading
 * LIVE is two facts. It is words only: no link, no control, nothing to press —
 * the full plaque (meaning, time, reasons) is in the band below. An ungraded
 * chart says NOT GRADED, never a blank.
 */
export function CanvasFidelityChip({
  reading,
  ungraded,
}: {
  readonly reading: MarketFidelityReading | null;
  readonly ungraded: CanvasUngraded | null;
}): React.ReactElement {
  const word = reading ? reading.fidelity : "NOT GRADED";
  const meaning = reading
    ? CANVAS_FIDELITY_MEANING[reading.fidelity]
    : ungraded
      ? CANVAS_UNGRADED_WORDS[ungraded]
      : CANVAS_UNGRADED_UNKNOWN;
  return (
    <span
      data-testid="canvas-fidelity-chip"
      data-fidelity={reading ? reading.fidelity : "UNMEASURED"}
      role="status"
      aria-label={`Chart fidelity: ${word}. ${meaning}`}
      title={meaning}
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "baseline",
        gap: 4,
        fontSize: 11,
        letterSpacing: 0.4,
        whiteSpace: "nowrap",
        color: reading ? "#c2b892" : "#8a8271",
        fontStyle: reading ? "normal" : "italic",
      }}
    >
      <span aria-hidden="true" style={{ color: "#8a8271" }}>CHART ·</span>
      <span aria-hidden="true">{word}</span>
    </span>
  );
}

export default CanvasFidelityChip;
