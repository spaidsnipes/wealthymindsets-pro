/**
 * WM Design Tokens — one coherent visual language.
 *
 * Founder Aug-14 §"START THE REAL WM DESIGN SYSTEM":
 *   Extract/refine one coherent visual language. Use deep obsidian,
 *   charcoal, smoked surfaces, restrained warm gold, subtle living
 *   light, precise borders, strong typography, highly legible market
 *   numerals, architectural spacing, controlled depth.
 *
 *   Gold must communicate importance, confirmation, state, or hierarchy.
 *   Do not make everything gold. Do not make everything glow.
 *
 * Consumers import these constants instead of hard-coding hex values,
 * so a future design refresh touches ONE file. Every colour has a role
 * documented — never "just because it looks nice."
 */

export const WM = {
  // ── SURFACES — depth hierarchy from deepest (0) to lightest (4) ──
  surface: {
    deepest: "#050506",   // page background lowest layer
    deep:    "#0b0b0d",   // page background upper layer + card outer
    mid:     "#131317",   // card standard
    raised:  "#1c1c22",   // card elevated / focused
    highest: "#26262d",   // hover / active surface
  },

  // ── TEXT — dominant to whisper ──
  text: {
    hero:    "#ede6d3",   // hero numerals + primary labels
    body:    "#c0b8a0",   // regular readable text
    muted:   "#8a8271",   // secondary labels, timestamps
    dim:     "#55503f",   // "unknown" / empty / disabled
  },

  // ── GOLD — importance / hierarchy / confirmation. Sparingly. ──
  gold: {
    hair:  "#6d5220",   // subtle 1px hairline
    line:  "#8b6a29",   // border stroke
    mark:  "#c9a55c",   // secondary gold accents
    hero:  "#d4af37",   // primary gold — hero + active state
    halo:  "#ffd76a",   // brightest, only for focus / active pulse
  },

  // ── STATE — semantic colours; each carries a non-colour cue elsewhere ──
  state: {
    ok:      "#5cb85c",   // resolved, live, aligned
    watch:   "#c9a55c",   // partial, degraded, advisory
    warn:    "#c05a4a",   // stale, failed, restricted, contradiction
    unknown: "#55503f",   // not yet observed, insufficient evidence
    neutral: "#8a8271",   // idle / no verdict
  },

  // ── BORDERS — always low-opacity gold; three intensities ──
  border: {
    hair:   "rgba(139,106,41,0.15)",  // barely-visible separator
    line:   "rgba(139,106,41,0.35)",  // standard card border
    strong: "rgba(212,175,55,0.5)",   // active/focused container
  },

  // ── HALO — subtle glow to reinforce state, not distract ──
  halo: {
    ok:     "rgba(92,184,92,0.15)",
    watch:  "rgba(201,165,92,0.15)",
    warn:   "rgba(192,90,74,0.15)",
    gold:   "rgba(212,175,55,0.10)",
    none:   "transparent",
  },

  // ── SPACING — architectural scale ──
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    hero: 32,
  },

  // ── RADIUS ──
  radius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10,
    hero: 14,
  },

  // ── TYPOGRAPHY ──
  type: {
    // Micro caps for section headings (UPPERCASE, wide tracking)
    label:      { fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" as const, fontWeight: 800 },
    labelSmall: { fontSize: 9,  letterSpacing: 0.4, textTransform: "uppercase" as const, fontWeight: 700 },
    // Body text
    body:       { fontSize: 12, letterSpacing: 0.1, lineHeight: 1.5 },
    bodySm:     { fontSize: 11, letterSpacing: 0.1, lineHeight: 1.5 },
    // Numerals — high legibility
    numeral:    { fontFamily: "system-ui, -apple-system, sans-serif" as const, fontVariantNumeric: "tabular-nums" as const, fontWeight: 700 },
    // Hero — one per surface
    hero:       { fontSize: 52, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.05, fontFamily: "system-ui, -apple-system, sans-serif" as const, fontVariantNumeric: "tabular-nums" as const },
  },
} as const;

/**
 * Compose a standard card/panel style — deep obsidian surface + gold
 * hairline. Toggle `active` for a stronger border + subtle halo.
 */
export function wmPanelStyle(active = false): React.CSSProperties {
  return {
    border: `1px solid ${active ? WM.border.strong : WM.border.line}`,
    borderRadius: WM.radius.xl,
    background: WM.surface.deep,
    padding: WM.space.lg,
    boxShadow: active ? `0 0 60px -30px ${WM.gold.hero}` : "none",
  };
}

/** Standard tone→colour helper (never colour-only — always paired with a glyph). */
export function wmToneColor(tone: "ok" | "watch" | "warn" | "unknown" | "neutral"): string {
  return WM.state[tone];
}

// Re-import shim so consumers who only need the tokens don't pull in React.
import type * as React from "react";
