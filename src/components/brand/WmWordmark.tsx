"use client";
import * as React from "react";

/**
 * WmWordmark — the WealthyMindsets Pro header lockup.
 *
 * Renders the REAL delivered compact monogram (gold WM + fleur-de-lis crown,
 * founder Drive "Brand Identity & Logos", 2026-08-24) beside the serif
 * "WEALTHYMINDSETS" wordmark + "PRO" micro-cap. Configurable size + optional
 * subtitle for hero surfaces (Command Deck), and compact variant for headers.
 *
 * The mark image is `/brand/wm-monogram-mark.png` — the square, inline-framed
 * crop DERIVED from the canonical `compact-monogram` role in brandCanon
 * (WM_MARK_ASSETS["compact-monogram"] is the full-bleed source of record).
 * Swapping that role's art re-crops one file; every header updates at once.
 * This replaces the earlier code-drawn SVG *approximation* of the W-crown.
 */

/** The everyday product mark, framed for inline header use. */
const WM_MONOGRAM_MARK = "/brand/wm-monogram-mark.png";

export type WmWordmarkSize = "compact" | "regular" | "hero";

export interface WmWordmarkProps {
  size?: WmWordmarkSize;
  subtitle?: string;   // e.g. "COMMAND CENTER" · "PRO LOUNGE" · "PRO LEGACY JOURNAL"
  className?: string;
}

const SIZE = {
  compact: { mark: 14, word: 12, sub: 8, spacing: 6, tracking: 0.32 },
  regular: { mark: 22, word: 20, sub: 10, spacing: 10, tracking: 0.38 },
  hero:    { mark: 34, word: 32, sub: 11, spacing: 12, tracking: 0.42 },
} as const;

export function WmWordmark({ size = "regular", subtitle, className }: WmWordmarkProps) {
  const s = SIZE[size];
  return (
    <div
      className={["wm-wordmark", className ?? ""].join(" ")}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
      }}
      aria-label={`WealthyMindsets Pro${subtitle ? ` — ${subtitle}` : ""}`}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: s.spacing }}>
        {/* REAL delivered compact monogram (gold WM + crown), inline-framed. */}
        <img
          src={WM_MONOGRAM_MARK}
          width={s.mark}
          height={s.mark}
          alt=""
          aria-hidden="true"
          style={{ flexShrink: 0, display: "block", alignSelf: "center" }}
        />
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: s.word,
            fontWeight: 400,
            letterSpacing: s.tracking / 32,
            color: "#d4af37",
            lineHeight: 1,
          }}
        >
          WEALTHYMINDSETS
        </span>
        <span
          style={{
            fontSize: s.sub,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 400,
            color: "#c9a55c",
            letterSpacing: s.tracking / 20,
            marginLeft: 2,
            lineHeight: 1,
          }}
        >
          PRO
        </span>
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: s.sub,
            fontFamily: "Georgia, 'Times New Roman', serif",
            letterSpacing: s.tracking / 20,
            color: "#8a8271",
            marginTop: 2,
            paddingLeft: s.mark + s.spacing,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

export default WmWordmark;
