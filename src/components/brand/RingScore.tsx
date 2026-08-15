"use client";
import * as React from "react";
import { Ring } from "@/components/ui/Ring";

/**
 * RingScore — the "92 EXCELLENT" cinematic score visual from Founder
 * Aug-14 mockups. Ring gauge with a serif score number inside and a
 * label underneath.
 *
 * Composes the existing Ring primitive (which handles UNKNOWN/PARTIAL
 * truthfully — never fabricates a fill) with the mockup-verified
 * hero-serif treatment.
 */

export type RingScoreResolution = "RESOLVED" | "PARTIAL" | "UNKNOWN";

export interface RingScoreProps {
  value: number | null;
  max: number;
  resolution?: RingScoreResolution;
  size?: number;
  /** e.g. "EXCELLENT" / "OPTIMAL" / "MATURING". */
  label?: string;
  /** UNKNOWN reason for a11y. */
  reason?: string;
  ariaLabel?: string;
  /** Show as unit (e.g. "R", "%") next to the number. */
  unit?: string;
  className?: string;
}

export function RingScore({
  value,
  max,
  resolution = "RESOLVED",
  size = 180,
  label,
  reason,
  ariaLabel,
  unit,
  className,
}: RingScoreProps) {
  const isKnown = resolution === "RESOLVED" && value != null && Number.isFinite(value);
  const shownValue = isKnown
    ? value! >= 100 ? Math.round(value!) : value!
    : "?";
  const format = (v: number) => (v >= 100 ? String(Math.round(v)) : v.toFixed(2));

  return (
    <div
      className={["wm-ring-score", className ?? ""].join(" ")}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}
    >
      <Ring value={value} max={max} resolution={resolution} size={size} stroke={5} reason={reason} ariaLabel={ariaLabel}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          {isKnown ? (
            <span
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: Math.round(size * 0.34),
                fontWeight: 400,
                fontVariantNumeric: "tabular-nums",
                color: "#ede6d3",
                lineHeight: 1,
                letterSpacing: -0.5,
                textShadow: "0 2px 20px rgba(212,175,55,0.3)",
              }}
              aria-hidden="true"
            >
              {format(value as number)}
            </span>
          ) : (
            <span
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: Math.round(size * 0.34),
                fontWeight: 400,
                color: "#55503f",
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              {shownValue}
            </span>
          )}
          {unit && (
            <span
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: Math.round(size * 0.11),
                color: "#c9a55c",
                letterSpacing: 0.4,
              }}
            >
              {unit}
            </span>
          )}
        </div>
      </Ring>
      {label && (
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 11,
            letterSpacing: 0.4,
            color: "#c9a55c",
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export default RingScore;
