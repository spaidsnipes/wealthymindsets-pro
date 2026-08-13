"use client";
import * as React from "react";

/**
 * HeroNumber — large display number for one-second hero truth.
 *
 * Rendering rules driven by data truth, not by convenience:
 *  - When `value === "UNKNOWN"` (or null/undefined with `resolution="UNKNOWN"`),
 *    renders `?` glyph in muted color. Never renders `0` or `—` as a stand-in.
 *  - When `value` is a finite number, renders with gold-hero gradient text.
 *  - Optional `unit` sits inline in wordmark color, smaller.
 *
 * Accessibility:
 *  - Uses `role="meter"` when `max` provided; otherwise plain.
 *  - `aria-valuenow`/`aria-valuemax` populated for meter usage.
 *  - UNKNOWN state announces "value unknown, {reason}" if reason provided.
 */
export type HeroValue = number | "UNKNOWN";

export interface HeroNumberProps {
  value: HeroValue;
  unit?: string;
  /** For meter semantics: the max value the metric can take. */
  max?: number;
  /** For UNKNOWN state: explanation surfaced to screen readers. */
  reason?: string;
  /** Optional grade caption below (e.g. "EXCELLENT"). */
  grade?: string;
  /** Compact mode reduces font size for tight tiles. */
  compact?: boolean;
  className?: string;
}

export function HeroNumber({
  value,
  unit,
  max,
  reason,
  grade,
  compact = false,
  className,
}: HeroNumberProps) {
  const isUnknown = value === "UNKNOWN";
  const numSize = compact ? "text-[32px]" : "text-[56px]";
  const meterProps =
    max != null && !isUnknown
      ? {
          role: "meter" as const,
          "aria-valuenow": value,
          "aria-valuemin": 0,
          "aria-valuemax": max,
        }
      : {};
  const ariaLabel = isUnknown
    ? `Value unknown${reason ? `. ${reason}` : ""}`
    : `${value}${unit ? ` ${unit}` : ""}${grade ? ` — ${grade}` : ""}`;

  return (
    <div
      className={[
        "wm-hero-number inline-flex flex-col items-center",
        className ?? "",
      ].join(" ")}
      aria-label={ariaLabel}
      {...meterProps}
    >
      <div className="flex items-baseline">
        {isUnknown ? (
          <span
            className={[
              numSize,
              "font-serif tabular-nums leading-none text-[color:var(--wm-text-3,#55503f)]",
            ].join(" ")}
            aria-hidden="true"
          >
            ?
          </span>
        ) : (
          <span
            className={[
              numSize,
              "font-serif tabular-nums leading-none text-[color:var(--wm-gold-hero,#d4af37)]",
            ].join(" ")}
          >
            {value}
          </span>
        )}
        {unit && !isUnknown && (
          <span className="text-[color:var(--wm-gold-mark,#c9a55c)] text-[0.4em] ml-1">
            {unit}
          </span>
        )}
      </div>
      {grade && (
        <div className="mt-2 text-[10px] tracking-[0.36em] uppercase text-[color:var(--wm-gold-mark,#c9a55c)]">
          {grade}
        </div>
      )}
    </div>
  );
}

export default HeroNumber;
