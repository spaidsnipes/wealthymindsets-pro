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

  // ── TEXT — dominant to whisper. READ `TEXT_ON_SURFACE` BEFORE USING. ──
  text: {
    hero:    "#ede6d3",   // hero numerals + primary labels. AA on every surface.
    body:    "#c0b8a0",   // regular readable text. AA on every surface.
    muted:   "#8a8271",   // secondary labels, timestamps. AA on the 3 DARKEST only.
    dim:     "#55503f",   // NON-TEXT ONLY — dividers, inactive rules. See below.
  },

  // ── GOLD — importance / hierarchy / confirmation. Sparingly. ──
  gold: {
    hair:  "#6d5220",   // subtle 1px hairline
    line:  "#8b6a29",   // border stroke
    mark:  "#c9a55c",   // secondary gold accents
    hero:  "#d4af37",   // primary gold — hero + active state
    halo:  "#ffd76a",   // brightest, only for focus / active pulse
  },

  /**
   * ── STATE — semantic colours; each carries a non-colour cue elsewhere ──
   *
   * `warn` AND `objection` ARE TWO TOKENS ON PURPOSE. READ THIS BEFORE MERGING.
   *
   * On 2026-09-21, consolidating the Market Canvas verdict palette turned up a
   * warm terracotta `#e07b5c` hard-coded across fourteen surfaces with no token
   * at all, while `warn` (#c05a4a) named a red the product also renders widely.
   * The obvious reading — "the token is stale, retarget it to the colour that
   * actually ships" — was TESTED BY GREP AND IS FALSE. Both colours are live:
   *
   *   #c05a4a  DataHealth DEGRADED/STALE/DISCONNECTED, DecisionChainPanel WARN,
   *            OpeningBellPanel NOT_READY, Pill danger, HeroTruth STALE,
   *            nectarFormat INFERRED/STALE/UNAVAILABLE, ShellAccessChrome …
   *
   *   #e07b5c  FailureStateChip BLOCKED, DecisionWhyPanel HARD_RULE and
   *            CONTRADICTION, OneStoryStrip OBJECTION and DEBT, the canvas
   *            NO TRADE verdict, MarketObjectPassportPanel contradictions …
   *
   * Read the two lists and the split is not an accident of drift — it is a
   * distinction the product has been making consistently without a name for it:
   *
   *   `warn`      THE SYSTEM FAILED. Data went stale, a feed dropped, a save
   *               did not land. Something is wrong and the trader is worse off.
   *   `objection` THE SYSTEM WORKED. A hard rule engaged, evidence contradicts
   *               the setup, the verdict is NO TRADE. Nothing is broken; the
   *               product is doing its job and the answer is no.
   *
   * That is why `objection` is the warmer, lighter hue: a refusal must read as
   * a BOUNDARY, not as an ERROR. Collapsing them into one token would paint
   * every correct refusal in the failure red and quietly teach the trader that
   * the product is malfunctioning every time it protects him. One hex saved is
   * not worth telling that lie.
   *
   * So: the fix for the fourteen literals was a SECOND token, not a retarget.
   * Retargeting `warn` to #e07b5c would have repainted ~20 unrelated failure
   * surfaces under cover of a refactor — the exact move DESIGN FIDELITY LAW
   * forbids. Zero pixels moved. `objectionTint()` below owns the alpha forms.
   */
  state: {
    ok:        "#5cb85c",   // resolved, live, aligned
    watch:     "#c9a55c",   // partial, degraded, advisory
    warn:      "#c05a4a",   // stale, failed, disconnected — SOMETHING BROKE
    objection: "#e07b5c",   // blocked, hard rule, contradiction — THE SYSTEM REFUSED
    unknown:   "#55503f",   // not yet observed, insufficient evidence
    neutral:   "#8a8271",   // idle / no verdict
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
export function wmToneColor(
  tone: "ok" | "watch" | "warn" | "objection" | "unknown" | "neutral",
): string {
  return WM.state[tone];
}

/**
 * A translucent wash of `WM.state.objection`, for the chip fills and left-rules
 * that accompany a refusal.
 *
 * WHY A FUNCTION AND NOT MORE TOKENS. The objection surfaces do not share one
 * alpha — a filled chip sits near 0.10, a border near 0.45, a 3px left-rule at
 * 0.6, and `TruthStatusChip` deliberately whispers at 0.07. Minting a named
 * token per alpha would be eight tokens for one colour, and the eighth surface
 * would still invent a ninth literal. Deriving them from the hex means a future
 * palette refresh moves the fills WITH the foreground instead of leaving a
 * terracotta frame around a repainted word.
 *
 * The rgba channels are parsed from the token rather than retyped, so the two
 * can never disagree — retyping them is precisely how #e07b5c ended up owned by
 * nobody in the first place.
 */
export function objectionTint(alpha: number): string {
  const [r, g, b] = WM.state.objection.replace("#", "").match(/../g)!.map(h => parseInt(h, 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * TEXT_ON_SURFACE — which text token may carry SMALL TEXT on which surface.
 *
 * ── The measurement ──────────────────────────────────────────────────────────
 *
 * WCAG AA is 4.5:1 for normal text. Measured across the real ramp:
 *
 *            deepest    deep     mid  raised highest
 *   hero       16.36   15.79   14.88   13.61   12.06
 *   body       10.29    9.93    9.36    8.56    7.59
 *   muted       5.35    5.16    4.86    4.45    3.94
 *   dim         2.53    2.44    2.30    2.10    1.86
 *
 * Two rungs are legal everywhere. `muted` is legal on the three darkest
 * surfaces and fails on `raised` (4.45) and `highest` (3.94). `dim` is legal
 * NOWHERE — it fails AA on every surface, and on `highest` it fails even the
 * 3:1 floor that applies to non-text UI components.
 *
 * ── Why `dim` is not simply brightened ───────────────────────────────────────
 *
 * It cannot be. To clear 4.5:1 on `highest`, `dim` would need a relative
 * luminance of 0.2644. `muted` sits at 0.2256. A compliant `dim` would have to
 * be BRIGHTER THAN `muted` — it would stop being a bottom rung. Four text
 * weights on near-black cannot all be AA-legal; that is arithmetic, not taste.
 * So the bottom rung is declared NON-TEXT instead of being quietly nudged until
 * a checker goes quiet.
 *
 * ── The defect this closes ───────────────────────────────────────────────────
 *
 * `dim` was previously documented as `"unknown" / empty / disabled`. That is
 * the worst possible assignment: it renders "WE DO NOT KNOW" in the least
 * readable colour the system owns. Missing evidence is load-bearing truth — a
 * trader who cannot read "unavailable" reads the space as calm instead. An
 * absence must be SAID, in a colour that can be read, for the same reason §14.1
 * says FLAT is a finding and never a default.
 *
 * Unknown / empty / unavailable prose therefore takes `muted` at minimum.
 * `dim` is for dividers, inactive rules and decorative hairlines only.
 */
export const TEXT_ON_SURFACE = {
  hero: ["deepest", "deep", "mid", "raised", "highest"],
  body: ["deepest", "deep", "mid", "raised", "highest"],
  muted: ["deepest", "deep", "mid"],
  /** Intentionally empty. `dim` may not carry text on any surface. */
  dim: [],
} as const satisfies Record<keyof typeof WM.text, readonly (keyof typeof WM.surface)[]>;

/** WCAG relative luminance. Exported so the guard measures rather than trusts. */
export function wmLuminance(hex: string): number {
  const channels = hex.replace("#", "").match(/../g);
  if (!channels) throw new Error(`not a hex colour: ${hex}`);
  const [r, g, b] = channels.map(h => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque hex colours. */
export function wmContrast(a: string, b: string): number {
  const x = wmLuminance(a);
  const y = wmLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// Re-import shim so consumers who only need the tokens don't pull in React.
import type * as React from "react";
