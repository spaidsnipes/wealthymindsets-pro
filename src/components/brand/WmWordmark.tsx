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

/**
 * ── THE TRACKING WAS DEAD ────────────────────────────────────────────────────
 * `tracking` used to be a bare number divided at the call site — `0.32 / 32`
 * for the wordmark, `0.32 / 20` for PRO. React serialises a bare number on
 * `letterSpacing` as PIXELS, so the delivered lockup shipped at 0.01px and
 * 0.016px of tracking: arithmetically present, optically nothing. The serif
 * wordmark rendered as tight body text, which is why the masthead never read
 * as the Visual Canon's engraved plate no matter how gold it was.
 *
 * The Canon lockup (WM_NewMockup_64_F24_Surface_One_Canvas) is WIDE — the
 * wordmark is spaced open enough that the eye reads it as a mark rather than
 * as a word. Tracking is now stated in `em` so it scales with the size it
 * belongs to instead of being re-derived by a divisor at each use.
 */
const SIZE = {
  compact: { mark: 14, word: 13, sub: 8,  spacing: 8,  wordTrack: "0.19em", subTrack: "0.34em" },
  regular: { mark: 22, word: 20, sub: 10, spacing: 10, wordTrack: "0.21em", subTrack: "0.36em" },
  hero:    { mark: 34, word: 32, sub: 11, spacing: 12, wordTrack: "0.23em", subTrack: "0.38em" },
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
            letterSpacing: s.wordTrack,
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
            letterSpacing: s.wordTrack,
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
            // The sub-line is the engraved plate under the mark. It carries the
            // WIDEST tracking in the lockup because it is read as a legend, not
            // as a sentence — the Canon frame sets it noticeably looser than
            // the wordmark above it.
            letterSpacing: s.subTrack,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            color: "#9c8558",
            marginTop: 3,
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
