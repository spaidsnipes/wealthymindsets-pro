"use client";
import * as React from "react";

/**
 * WmWordmark — the WealthyMindsets Pro wordmark from Founder mockups.
 *
 * Renders a gold W-crown mark + serif "WEALTHYMINDSETS" wordmark + "PRO"
 * micro-cap. Configurable size + optional "COMMAND CENTER" subtitle for
 * hero surfaces (Command Deck), and compact variant for headers.
 */

export type WmWordmarkSize = "compact" | "regular" | "hero";

export interface WmWordmarkProps {
  size?: WmWordmarkSize;
  subtitle?: string;   // e.g. "COMMAND CENTER" · "PRO LOUNGE" · "PRO LEGACY JOURNAL"
  className?: string;
}

const CROWN_GLYPH = "♢"; // ◢ inverted diamond — approximates the pointed W-crown from mockups

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
        {/* SVG W-crown mark — approximates the founder mockup's W-with-crown */}
        <svg
          width={s.mark}
          height={s.mark}
          viewBox="0 0 32 32"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <defs>
            <linearGradient id={`wm-crown-${size}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffd76a" />
              <stop offset="1" stopColor="#8b6a29" />
            </linearGradient>
          </defs>
          <path
            d="M4 6 L8 4 L12 8 L16 3 L20 8 L24 4 L28 6 L26 12 L16 26 L6 12 Z"
            fill="none"
            stroke={`url(#wm-crown-${size})`}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M11 10 L16 20 L21 10"
            fill="none"
            stroke="#d4af37"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
