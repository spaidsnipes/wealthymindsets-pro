"use client";
import * as React from "react";

/**
 * Ring — circular gauge that renders truthfully under UNKNOWN.
 *
 * Truth contract:
 *  - `resolution="RESOLVED"` + finite `value`: renders arc proportional to
 *    (value / max).
 *  - `resolution="PARTIAL"`: renders a dimmed arc plus a "?" glyph overlay to
 *    signal partial confidence.
 *  - `resolution="UNKNOWN"`: renders empty track + "?" glyph. No default 0%.
 *
 * The ring is data-driven; if callers cannot compute a truthful value they
 * MUST pass UNKNOWN — the ring will not fabricate a fill.
 *
 * Accessibility:
 *  - role="meter" with aria-valuenow/min/max when resolution === "RESOLVED".
 *  - UNKNOWN state announces "value unknown, {reason}" if reason provided.
 */
export type MarketStateResolution = "RESOLVED" | "PARTIAL" | "UNKNOWN";

export interface RingProps {
  value: number | null;
  max: number;
  resolution?: MarketStateResolution;
  /** Ring diameter in px. */
  size?: number;
  /** Stroke width in px. */
  stroke?: number;
  /** For UNKNOWN/PARTIAL: explanation surfaced to screen readers. */
  reason?: string;
  /** Aria label; if omitted, a truthful default is generated. */
  ariaLabel?: string;
  /** Optional child (typically HeroNumber) rendered centered inside the ring. */
  children?: React.ReactNode;
}

const GOLD_GRADIENT_ID = "wm-ring-gold-gradient";

export function Ring({
  value,
  max,
  resolution = "RESOLVED",
  size = 190,
  stroke = 4,
  reason,
  ariaLabel,
  children,
}: RingProps) {
  const isFull = resolution === "RESOLVED" && value != null && Number.isFinite(value);
  const clamped = isFull ? Math.max(0, Math.min(value!, max)) : 0;
  const radius = (size - stroke * 2) / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const arcLength = isFull ? (clamped / max) * circumference : 0;
  const dashOffset = circumference - arcLength;
  const cx = size / 2;
  const cy = size / 2;

  const label =
    ariaLabel ??
    (isFull
      ? `${clamped} of ${max}`
      : `Value ${resolution.toLowerCase()}${reason ? `, ${reason}` : ""}`);

  const meterProps =
    isFull
      ? {
          role: "meter" as const,
          "aria-valuenow": clamped,
          "aria-valuemin": 0,
          "aria-valuemax": max,
        }
      : { role: "img" as const };

  return (
    <div
      className="wm-ring relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={label}
      {...meterProps}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={GOLD_GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--wm-gold-line, #8b6a29)" />
            <stop offset="0.5" stopColor="var(--wm-gold-hero, #d4af37)" />
            <stop offset="1" stopColor="var(--wm-gold-halo, #ffd76a)" />
          </linearGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--wm-ob-4, #26262d)"
          strokeWidth={stroke}
        />
        {isFull && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={`url(#${GOLD_GRADIENT_ID})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        )}
        {resolution === "PARTIAL" && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--wm-gold-hair, #6d5220)"
            strokeWidth={stroke}
            strokeDasharray="4 6"
            opacity={0.5}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children ??
          (!isFull ? (
            <span
              className="text-[color:var(--wm-text-3,#55503f)] font-serif text-4xl"
              aria-hidden="true"
            >
              ?
            </span>
          ) : null)}
      </div>
    </div>
  );
}

export default Ring;
