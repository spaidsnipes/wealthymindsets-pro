"use client";
import * as React from "react";

/**
 * SectionBanner — numbered section title from Founder mockups.
 *
 * Renders a gold "1" cap + serif SECTION LABEL. Used to give /command-deck
 * and other cinematic surfaces the numbered banner cadence seen in the
 * mockup grid ("1 TRADING COMMAND DECK", "2 THE MIRROR + PROCESS SCORE").
 */

export interface SectionBannerProps {
  number: number | string;
  label: string;
  tagline?: string;
  className?: string;
}

export function SectionBanner({ number, label, tagline, className }: SectionBannerProps) {
  return (
    <div
      className={["wm-section-banner", className ?? ""].join(" ")}
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 12,
        paddingBottom: 8,
        borderBottom: "1px solid rgba(139,106,41,0.35)",
      }}
      aria-label={`Section ${number}: ${label}`}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 22,
          fontWeight: 400,
          color: "#d4af37",
          minWidth: 24,
          lineHeight: 1,
        }}
      >
        {number}
      </span>
      <span
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 13,
          letterSpacing: 0.24,
          color: "#c9a55c",
          textTransform: "uppercase",
          fontWeight: 400,
        }}
      >
        {label}
      </span>
      {tagline && (
        <span
          style={{
            fontSize: 10,
            color: "#8a8271",
            letterSpacing: 0.2,
            fontStyle: "italic",
            marginLeft: "auto",
          }}
        >
          {tagline}
        </span>
      )}
    </div>
  );
}

export default SectionBanner;
