/**
 * MARKET TYPOGRAPHY — Garden 18 v2 §16 ("typography is product
 * infrastructure") and §15 ("zooming into market truth must reward the user
 * with more clarity, not more ugliness").
 *
 * The canvas used to type its own fonts at every call site (~60 × "9px", four
 * families, some naming fonts the page never loads). This owner names the
 * roles the glass paints and the two families the page actually loads
 * (globals.css: Inter, JetBrains Mono). Numbers are mono — every digit the
 * same width, so a column of prints does not jitter as values change.
 *
 * CRISP, NOT HAZY: a number over the market gets a tight dark outline, never a
 * shadowBlur halo (a blurred halo is what made 9px digits read as smudge),
 * and it lands on a whole pixel.
 */

export const MARKET_SANS = "Inter, ui-sans-serif, system-ui, sans-serif";
export const MARKET_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/** The smallest number the glass will print. Below this a value is dropped, never shrunk. */
export const MARKET_NUMBER_MIN_PX = 9;

export type MarketTypeRole =
  | "FOOTPRINT_NUMBER"
  | "MICRO_NUMBER"
  | "PROFILE_VALUE"
  | "RISK_VALUE"
  | "OBJECT_NAME"
  | "WHY_LABEL"
  | "WARNING"
  | "FIDELITY";

interface RoleSpec { readonly weight: number; readonly px: number; readonly family: string; readonly italic?: boolean }

export const MARKET_TYPE: Readonly<Record<MarketTypeRole, RoleSpec>> = {
  FOOTPRINT_NUMBER: { weight: 700, px: 11, family: MARKET_MONO },
  MICRO_NUMBER:     { weight: 600, px: 10, family: MARKET_MONO },
  PROFILE_VALUE:    { weight: 600, px: 10, family: MARKET_MONO },
  RISK_VALUE:       { weight: 700, px: 11, family: MARKET_MONO },
  OBJECT_NAME:      { weight: 700, px: 10, family: MARKET_SANS },
  // Inter ships italic only at 400 (globals.css) — a heavier italic is synthesised.
  WHY_LABEL:        { weight: 400, px: 10, family: MARKET_SANS, italic: true },
  WARNING:          { weight: 800, px: 10, family: MARKET_SANS },
  FIDELITY:         { weight: 600, px: 9,  family: MARKET_SANS },
};

/** The canvas font string for a role, optionally at a fitted size (never below the number floor for mono roles). */
export function marketFont(role: MarketTypeRole, px?: number): string {
  const s = MARKET_TYPE[role];
  const size = Math.max(s.family === MARKET_MONO ? MARKET_NUMBER_MIN_PX : 8, px ?? s.px);
  return `${s.italic ? "italic " : ""}${s.weight} ${size}px ${s.family}`;
}

/** Footprint cell size for a row height: 9…12 px, never below the floor. */
export function footprintCellPx(rowH: number): number {
  return Math.max(MARKET_NUMBER_MIN_PX, Math.min(12, Math.floor(rowH * 0.6)));
}

interface TextCtx {
  font: string; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline;
  fillStyle: string | CanvasGradient | CanvasPattern; strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number; lineJoin: CanvasLineJoin; shadowBlur: number; shadowColor: string;
  fillText(t: string, x: number, y: number): void; strokeText(t: string, x: number, y: number): void;
}

/**
 * A number on the market, crisp: whole-pixel position, optional tight dark
 * outline (for text over price, not over its own dark cell), no blur.
 */
export function crispText(
  ctx: TextCtx, text: string, x: number, y: number,
  opts: { readonly fill: string; readonly outline?: boolean; readonly align?: CanvasTextAlign },
): void {
  const px = Math.round(x), py = Math.round(y);
  ctx.textAlign = opts.align ?? "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
  if (opts.outline) {
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(6,7,10,0.92)";
    ctx.strokeText(text, px, py);
  }
  ctx.fillStyle = opts.fill;
  ctx.fillText(text, px, py);
}
