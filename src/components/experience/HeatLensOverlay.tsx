/**
 * HEAT LENS OVERLAY — the drawn half of SHEET P-601.
 *
 * `selectHeatLens` decides WHAT is hot. This file decides only WHERE that heat
 * lands on the glass, and it is deliberately incapable of deciding anything
 * else: it never reads a tape, never computes a cost, and cannot make a cell
 * hotter than the selector said it was.
 *
 * ── WHY THIS TAKES A priceToY FUNCTION INSTEAD OF A SCALE ───────────────────
 *
 * The lens is PIPED ONTO the canvas tank, which means it must agree with the
 * camera about where a price is — exactly, at every zoom, including mid-pan.
 * The only way to guarantee that is to ask the camera itself. A copy of the
 * scale would be a second source of truth about price position, and the first
 * time the two drifted the heat would sit next to the candles it describes
 * rather than on them. So the caller hands in the camera's own projection.
 *
 * ── "CLICK HOT CELL PAN EXISTING CAMERA" / "NO ROUTE /heat" ─────────────────
 *
 * A cell's click handler is `onPanTo`, and the prop is typed to receive a
 * price band, not a URL or an id. There is no navigation vocabulary anywhere
 * in this component, because P-601 marks the heatmaps ROOM for demolition and
 * a lens that could route would be the room growing back in a new shape.
 *
 * ── WHAT IT REFUSES TO DRAW ─────────────────────────────────────────────────
 *
 * When the selector says `drawable: false` this renders the reason in words
 * and NO bands at all. That is the whole point of the refusal travelling on
 * the VM: a lens that quietly renders nothing is indistinguishable from a lens
 * that is broken, and the trader cannot tell which they are looking at.
 */

"use client";

import * as React from "react";

import type { HeatLensVM } from "@/lib/marketData/viewModels/selectHeatLens";

const GOLD = "#c4a574";
const MUTED = "#8a8271";

/**
 * The heat ramp. Cool cells sit toward the frame's own gold; hot cells move to
 * an ember red. Both ends are hues already in the product — heat is a NEW
 * reading, not an excuse for a new palette.
 */
function heatColor(intensity: number): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  const r = Math.round(196 + (214 - 196) * clamped);
  const g = Math.round(165 - (165 - 74) * clamped);
  const b = Math.round(116 - (116 - 52) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

export interface HeatLensOverlayProps {
  readonly vm: HeatLensVM;
  /**
   * The CAMERA's own price→pixel projection. See the header: this is asked
   * for rather than reconstructed so the lens cannot drift off the candles.
   * Returning null means the price is outside the visible window and the cell
   * is simply not drawn.
   */
  readonly priceToY: (price: number) => number | null;
  /** Height of the plotting area, so a band can be clipped to it. */
  readonly height: number;
  /** CLICK HOT CELL → PAN EXISTING CAMERA. Never a route. */
  readonly onPanTo?: (band: { low: number; high: number }) => void;
  /** Draw the quiet cells too. Default false — see HEAT_PAINT_FLOOR. */
  readonly showQuietCells?: boolean;
}

export function HeatLensGauge({ vm }: { vm: HeatLensVM }) {
  const { persistence, response, missing } = vm.gauge;

  return (
    <div
      data-testid="heat-lens-gauge"
      style={{
        display: "flex",
        alignItems: "center",
        /* The missing-needle disclosure is a SENTENCE, and a sentence that
           runs off the right edge of the gauge is a refusal the trader cannot
           finish reading. MEASURED 2026-09-19 in the fixture: the ERRATIC and
           UNMEASURED panels clipped "…not measured" at 330px. Wrapping is the
           honest answer — the words matter more than the row staying one line. */
        flexWrap: "wrap",
        gap: 14,
        rowGap: 4,
        padding: "5px 10px",
        fontSize: 10,
        letterSpacing: 0.7,
        textTransform: "uppercase",
        color: MUTED,
        borderTop: "1px solid rgba(196,165,116,0.16)",
      }}
    >
      <Needle
        testId="heat-gauge-persistence"
        label="Persistence"
        /* A needle with no input shows a dash and no bar. It must not be
           possible to mistake "not measured" for "measured at zero". */
        value={persistence}
        format={(v) => v.toFixed(2)}
        fill={persistence}
      />
      <Needle
        testId="heat-gauge-response"
        label="Response"
        value={response}
        format={(v) => `${v.toFixed(2)}×`}
        /* RESPONSE is a ratio around 1, not a fraction. The bar shows it
           against a 3× ceiling purely so it has somewhere to sit; the NUMBER
           is the reading and the bar is decoration for it. */
        fill={response === null ? null : Math.min(1, response / 3)}
      />
      {missing.length > 0 && (
        <span data-testid="heat-gauge-missing" style={{ color: "#9a8f7a" }}>
          {missing.join(" + ")} not measured
        </span>
      )}
    </div>
  );
}

function Needle({
  testId,
  label,
  value,
  format,
  fill,
}: {
  testId: string;
  label: string;
  value: number | null;
  format: (v: number) => string;
  fill: number | null;
}) {
  return (
    <span
      data-testid={testId}
      data-state={value === null ? "UNMEASURED" : "MEASURED"}
      style={{ display: "flex", alignItems: "center", gap: 6 }}
    >
      <span>{label}</span>
      <span style={{ color: value === null ? MUTED : GOLD, fontVariantNumeric: "tabular-nums" }}>
        {value === null ? "—" : format(value)}
      </span>
      <span
        aria-hidden
        style={{
          width: 42,
          height: 3,
          borderRadius: 2,
          background: "rgba(196,165,116,0.18)",
          overflow: "hidden",
        }}
      >
        {fill !== null && (
          <span
            style={{
              display: "block",
              width: `${Math.max(0, Math.min(1, fill)) * 100}%`,
              height: "100%",
              background: GOLD,
            }}
          />
        )}
      </span>
    </span>
  );
}

export default function HeatLensOverlay({
  vm,
  priceToY,
  height,
  onPanTo,
  showQuietCells = false,
}: HeatLensOverlayProps) {
  if (!vm.drawable) {
    return (
      <div
        data-testid="heat-lens-refusal"
        style={{
          padding: "6px 10px",
          fontSize: 11,
          lineHeight: 1.5,
          color: MUTED,
          background: "rgba(24,20,14,0.55)",
        }}
      >
        <strong style={{ color: GOLD, letterSpacing: 0.6, fontSize: 10 }}>
          HEAT UNAVAILABLE
        </strong>{" "}
        {vm.detail}
      </div>
    );
  }

  const cells = showQuietCells ? vm.cells : vm.cells.filter((c) => c.paintable);

  return (
    <div
      data-testid="heat-lens-overlay"
      data-stage={vm.stage}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        height,
        /* The lens must never eat a drag meant for the camera underneath.
           Individual cells re-enable pointer events only when they can act. */
        pointerEvents: "none",
      }}
    >
      {cells.map((cell) => {
        const yHigh = priceToY(cell.high);
        const yLow = priceToY(cell.low);
        if (yHigh === null || yLow === null) return null;

        const top = Math.min(yHigh, yLow);
        const bandHeight = Math.max(1, Math.abs(yLow - yHigh));

        return (
          <div
            key={cell.index}
            data-testid="heat-lens-cell"
            data-cell-index={cell.index}
            /* Published so a pixel proof can assert the regulator held, rather
               than trusting a computed style that a browser may round. */
            data-opacity={cell.opacity.toFixed(4)}
            data-paintable={cell.paintable ? "true" : "false"}
            onClick={onPanTo ? () => onPanTo({ low: cell.low, high: cell.high }) : undefined}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top,
              height: bandHeight,
              background: heatColor(cell.intensity),
              opacity: cell.opacity,
              pointerEvents: onPanTo ? "auto" : "none",
              cursor: onPanTo ? "pointer" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
