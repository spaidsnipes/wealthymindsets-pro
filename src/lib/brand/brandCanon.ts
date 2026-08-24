/**
 * brandCanon — THE single source of truth for WealthyMindsets brand identity.
 *
 * Founder brand freeze (2026-08-24): the logo family and voice are locked.
 * Every surface (charts, nav, login, Academy, favicon, marketing) references
 * THESE constants instead of ad-hoc strings, so the old slogan / off-spec mark
 * can never silently linger. This is the brand analogue of canonicalUrl.ts and
 * canonicalIdentity.ts — one truth, referenced everywhere, guarded by a test.
 *
 * PURE MODULE — no React, no "use client", no I/O. Safe to import from server
 * metadata (app/layout.tsx) AND client components (WmWordmark, DoctrineTagline).
 *
 * SCOPE: names, slogans, and the MARK HIERARCHY contract only. Colors live in
 * `src/lib/design/wmTokens.ts` (WM.*) — never duplicated here. The final logo
 * ART (gentleman crest, refined WM+crown, micro glyph, favicon) are asset files
 * the founder supplies; this module names the hierarchy those assets fill.
 */

/** Canonical brand names. Prefer these over inline literals everywhere. */
export const WM_BRAND = {
  /** All-caps master wordmark for hero/lockups. */
  master: "WEALTHY MINDSETS",
  /** Mixed-case set wordmark (metadata, prose). */
  masterMixed: "WealthyMindsets",
  /** The product surface these mindsets power. */
  product: "WealthyMindsets Pro",
  /** Legal entity for authorship / footer. */
  legalEntity: "WealthyMindsets LLC",
} as const;

/**
 * Canonical slogans — frozen VERBATIM by the founder (2026-08-24).
 * A test asserts these exact strings so a future edit that drifts the voice
 * fails CI rather than silently shipping a different promise.
 */
export const WM_SLOGAN = {
  /** Master brand slogan. */
  master: "Stay Sharp. Stay a Student.",
  /** Academy top-grade label. */
  academyGrade: "A+ Student of the Game",
  /** Academy creed — A+ is permanent teachability, never graduation from learning. */
  academyCreed: "Forever a Student of the Game.",
} as const;

/**
 * The FROZEN brand-mark hierarchy. Surfaces choose a mark by ROLE, not by
 * pasting a specific asset — so when the founder ships final art, swapping the
 * file behind a role updates every surface at once.
 */
export const WM_MARKS = [
  "master-crest",     // faceless gentleman + WM + crown — hero/marketing crest
  "compact-monogram", // gold WM monogram + crown — everyday app/product mark
  "micro-glyph",      // simplified angular W/crown — tiny chart buttons, favicon, nav, loaders
  "editorial",        // throne / books / panther / chess / globe — Academy & campaign art only
] as const;

export type WmMark = (typeof WM_MARKS)[number];

export interface WmMarkSpec {
  readonly mark: WmMark;
  readonly title: string;
  readonly description: string;
  /** Where this mark is the CORRECT choice. */
  readonly usage: readonly string[];
  /** Guardrails — where this mark must NOT be used. */
  readonly avoid: readonly string[];
}

export const WM_MARK_HIERARCHY: Readonly<Record<WmMark, WmMarkSpec>> = {
  "master-crest": {
    mark: "master-crest",
    title: "Master crest",
    description: "Faceless gentleman + WM + crown. The brand's face — used sparingly as a mascot/crest.",
    usage: ["login hero", "home hero", "marketing surfaces", "About / brand story"],
    avoid: ["dense chart UI", "tiny buttons", "favicon", "repeated inline in-app chrome"],
  },
  "compact-monogram": {
    mark: "compact-monogram",
    title: "Compact monogram",
    description: "Gold WM monogram + crown. Does the everyday product work.",
    usage: ["top nav", "headers", "product lockups", "PRO badge context"],
    avoid: ["sub-24px targets (use micro-glyph)"],
  },
  "micro-glyph": {
    mark: "micro-glyph",
    title: "Micro glyph",
    description: "Simplified angular W/crown geometry for the smallest surfaces.",
    usage: ["chart tool buttons", "Smart Money Tools", "favicon", "PWA icon", "mobile nav", "loading indicators"],
    avoid: ["hero surfaces (too small to carry the brand)"],
  },
  editorial: {
    mark: "editorial",
    title: "Editorial / Academy art",
    description: "Throne, books, panther, chess, charts, globe — campaign & Academy visuals.",
    usage: ["Academy chapter art", "campaign pages", "marketing hero moments"],
    avoid: ["everyday app chrome — WM Pro must feel professional and calm, never plastered"],
  },
} as const;

/**
 * Delivered brand-mark ASSET files (founder's Drive "Brand Identity & Logos",
 * imported 2026-08-24). Roles without a delivered asset are intentionally
 * ABSENT — surfaces must fall back honestly, never to a fabricated mark.
 *   · master-crest    → faceless gentleman + WM medallion + crown + wordmark
 *   · compact-monogram→ gold WM + crown on black (also the favicon/app-icon source)
 *   · micro-glyph     → NOT yet delivered as a standalone asset; small surfaces
 *                       currently reuse the monogram-derived icon set.
 *   · editorial       → campaign boards live in Drive, not bundled in-app.
 */
export const WM_MARK_ASSETS: Partial<Readonly<Record<WmMark, string>>> = {
  "master-crest": "/brand/wm-master-crest.jpeg",
  "compact-monogram": "/brand/wm-compact-monogram.jpeg",
} as const;

/**
 * Honest phrasing for the moomoo/webull integration state. Founder directive
 * (2026-08-24): do NOT say "connected" until the certification endpoint shows
 * real earned capabilities. Use this until then.
 */
export const WM_INTEGRATION_PHRASING = {
  architecture:
    "integrated into the canonical architecture; runtime capability certification is still underway",
  /** Only correct once /api/market-data/certification shows earned capabilities. */
  connectedRequiresProof:
    "Say 'connected' only when a source's certification shows real ACTIVE_CERTIFIED capabilities.",
} as const;
