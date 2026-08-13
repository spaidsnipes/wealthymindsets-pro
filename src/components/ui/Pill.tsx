"use client";
import * as React from "react";

/**
 * Pill — status label with semantic state variants.
 *
 * Variants:
 *  - "aligned"    — market-state RESOLVED + aligned
 *  - "confirmed"  — checklist item complete
 *  - "warning"    — degraded, pending, caution
 *  - "danger"     — invalidation, failure, hard rejection
 *  - "unknown"    — no evidence
 *  - "neutral"    — default
 *
 * The pill is a visual affordance for state; callers MUST pass a state that
 * reflects underlying evidence. The pill has no computation of its own.
 */
export type PillState =
  | "aligned"
  | "confirmed"
  | "warning"
  | "danger"
  | "unknown"
  | "neutral";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  state?: PillState;
  /** Optional leading glyph (Unicode char). Default is state-derived. */
  glyph?: string | null;
  /** Aria label override for icon-only rendering. */
  ariaLabel?: string;
  children?: React.ReactNode;
}

const STATE_STYLES: Record<PillState, { border: string; text: string; glyph: string }> = {
  aligned:   { border: "rgba(92,184,92,0.4)",  text: "#5cb85c", glyph: "◇" },
  confirmed: { border: "rgba(92,184,92,0.4)",  text: "#5cb85c", glyph: "◇" },
  warning:   { border: "rgba(201,165,92,0.5)", text: "#c9a55c", glyph: "◐" },
  danger:    { border: "rgba(192,90,74,0.5)",  text: "#c05a4a", glyph: "!" },
  unknown:   { border: "rgba(85,80,63,0.5)",   text: "#55503f", glyph: "?" },
  neutral:   { border: "var(--wm-gold-line, #8b6a29)", text: "var(--wm-gold-mark, #c9a55c)", glyph: "•" },
};

export function Pill({
  state = "neutral",
  glyph,
  ariaLabel,
  className,
  children,
  ...rest
}: PillProps) {
  const s = STATE_STYLES[state];
  const displayGlyph = glyph === null ? "" : glyph ?? s.glyph;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={[
        "wm-pill inline-block px-2.5 py-1 rounded-full",
        "border text-[9px] tracking-[0.28em] uppercase",
        className ?? "",
      ].join(" ")}
      style={{ borderColor: s.border, color: s.text }}
      {...rest}
    >
      {displayGlyph && <span className="mr-1">{displayGlyph}</span>}
      {children}
    </span>
  );
}

export default Pill;
