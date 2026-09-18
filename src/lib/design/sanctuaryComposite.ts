/**
 * WHAT THE TRADER ACTUALLY LOOKS AT.
 *
 * `textLegibility.enforcement.test.ts` measures every text token against every
 * surface token and holds the ramp to AA. Every number in it is computed from a
 * pair of clean hex values — and the trader has never seen a clean hex value in
 * their life. Between the token and the eye sit two layers the sanctuary paints
 * on every route: a film-grain tile at 0.06 under `mix-blend-mode: overlay`,
 * and a vignette reaching `rgba(0,0,0,0.42)` in the corners.
 *
 * The Canon is explicit about this and has been since 2026-09-16:
 *
 *     "WCAG: measure ivory-on-field AFTER grain. If body text drops under
 *      4.5:1, drop opacity, do not thicken the type with a glow."
 *                    — SUPPORT ADDENDUM — CSS Sanctuary, Grain, Vignette, §7
 *
 * Nobody had. This module is the arithmetic that makes that sentence checkable:
 * it composites a colour through the real atmosphere stack, at the real
 * opacities, using the real measured excursion of the shipped tile, so the
 * legibility guard can ask its question about the composited pixel instead of
 * the token.
 *
 * ── WHY THIS IS NOT DECORATION ──────────────────────────────────────────────
 *
 * The same Canon, two sections earlier, prints a layer order:
 *
 *     z 39   vignette overlay
 *     z 40   grain overlay
 *     "Vignette and grain are ABOVE the room and BELOW dialogs."
 *
 * The shell does not do that. It pins both atmosphere layers to `z-index: 0`
 * and lifts the content plane to `z-index: 1`, putting the whole room ABOVE the
 * atmosphere. That reads like a lazy deviation from the drawing. It is not.
 * Run the numbers through `compositeVignette` and the reason appears: a
 * vignette above the content plane darkens the TEXT and its BACKGROUND by the
 * same factor, and because the `+0.05` in the WCAG ratio does not scale with
 * it, the ratio collapses. `body` — the token declared readable on every
 * surface in the system — falls from 9.36:1 to 3.68:1 in a corner. `muted`
 * falls to 2.28:1. Only `hero` survives.
 *
 * So the shell's arrangement is not a shortcut around the Canon; it is the only
 * arrangement in which the Canon's own accessibility promise survives its own
 * layer diagram. The Canon anticipates the conflict in §5 and resolves it the
 * same way, just locally:
 *
 *     "If RISK / fidelity plaques sit in a dark corner, lift those plaques
 *      above the vignette (z-index + local fill) so honesty stays readable."
 *
 * Lifting every plaque is lifting the content plane. The shell applies the
 * Canon's own remedy universally instead of per-plaque.
 *
 * This module exists so that reasoning is a computation rather than a memory.
 * The next person to notice the z-order "bug" and align it to the diagram will
 * be met by an enforcement test carrying these figures.
 *
 * ── WHAT THIS MODULE REFUSES ────────────────────────────────────────────────
 *
 *   1. It will not model a layer that is not painted. Every constant here is
 *      either measured off the shipped asset or read from the shell's own CSS.
 *      An atmosphere guard tuned to numbers nobody renders is worse than none,
 *      because it reports safety about a room that does not exist.
 *
 *   2. It will not average the grain. A mean of 128 is why the tile is
 *      luminance-neutral, and it is exactly the wrong statistic for a contrast
 *      question: legibility fails at the EXCURSION, on the one dark grain pixel
 *      that lands on a thin stroke, not at the mean.
 *
 *   3. It will not blend in linear light. CSS compositing operates on the
 *      device colour values, so `overlay` is evaluated on non-linear sRGB and
 *      only the finished pixel is linearised to ask about luminance. Getting
 *      this backwards makes the grain look roughly twice as strong as it is and
 *      would produce a guard that fails honest colours.
 */

/**
 * THE SHIPPED TILE, DECODED — `public/wm/grain-256.webp`.
 *
 * Measured with sharp off the actual file, not read off the generator:
 *
 *     n 65536   min 79   max 176   mean 127.998   stdev 12.983
 *     p1 99     p50 128  p99 157
 *
 * `mean` is pinned to 128 by `grainTile.enforcement.test.ts` because overlay
 * treats mid-grey as identity — the tile must not lift or crush the room. MIN
 * and MAX are what this module cares about: they are the darkest and brightest
 * the atmosphere can make any single pixel, and legibility is decided there.
 */
export const GRAIN_TILE = {
  min: 79,
  max: 176,
  mean: 128,
} as const;

/**
 * Opacity of the grain layer, read from `WMExperienceShell`'s own stylesheet.
 * The Canon's window is 0.04–0.07; above 0.10 is FALSE_RIPENESS and fails the
 * merge. The phone gets less because a phone is held closer and its pixels are
 * smaller, so the same tile reads stronger there.
 */
export const GRAIN_OPACITY = {
  desktop: 0.06,
  phone: 0.04,
} as const;

/** The Canon's ceiling. Past this, grain is rotting the ticks and hairlines. */
export const GRAIN_OPACITY_CEILING = 0.1;

/**
 * Peak alpha of the vignette, in the corners — the `100%` stop of
 * `radial-gradient(ellipse at 50% 42%, transparent 42%, rgba(0,0,0,0.42) 100%)`.
 */
export const VIGNETTE_PEAK_ALPHA = 0.42;

type RGB = readonly [number, number, number];

function parseHex(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as unknown as RGB;
}

function toHex(rgb: RGB): string {
  return (
    "#" +
    rgb
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * The `overlay` blend function, per channel, on non-linear sRGB in 0..1.
 *
 * Defined by Compositing and Blending Level 1 as `hard-light` with the operands
 * swapped: the BACKDROP decides which branch is taken, and the SOURCE decides
 * how far it travels.
 *
 * At `cs === 0.5` both branches collapse to `cb`. That identity is the whole
 * reason the tile's mean is pinned to 128 — half the tile is doing nothing, by
 * construction, and only the excursion moves a pixel at all.
 */
export function overlayChannel(cb: number, cs: number): number {
  return cb <= 0.5 ? 2 * cb * cs : 1 - 2 * (1 - cb) * (1 - cs);
}

/**
 * Composite one grain value over a colour at a given layer opacity.
 *
 * `grainByte` is a single greyscale sample from the tile in 0..255. Pass
 * `GRAIN_TILE.min` / `.max` to ask the question legibility actually turns on:
 * what is the worst this layer can do to this pixel?
 */
export function compositeGrain(hex: string, opacity: number, grainByte: number): string {
  const cs = grainByte / 255;
  return toHex(
    parseHex(hex).map((v) => {
      const cb = v / 255;
      return 255 * ((1 - opacity) * cb + opacity * overlayChannel(cb, cs));
    }) as unknown as RGB,
  );
}

/**
 * Composite black at `alpha` over a colour — the vignette, blending normally.
 *
 * Note what this does NOT take: a position. The only vignette value worth
 * guarding against is the deepest one, and a guard that let a caller nominate a
 * gentler alpha would be a guard the caller can talk out of failing.
 */
export function compositeVignette(hex: string, alpha: number = VIGNETTE_PEAK_ALPHA): string {
  return toHex(parseHex(hex).map((v) => v * (1 - alpha)) as unknown as RGB);
}

/**
 * The WORST the grain layer can do to a text/background pair.
 *
 * Text and background are given opposite excursions — the darkest grain pixel
 * landing on the glyph, the brightest on the field beside it. Adjacent pixels
 * of this tile genuinely are that different (σ ≈ 13 at pixel scale, so the
 * 79/176 pair is roughly ±3.7σ apart and lives in the same neighbourhood), so
 * this is a pessimistic reading of a real arrangement rather than a synthetic
 * worst case that no screen ever shows.
 */
export function grainedPair(
  textHex: string,
  surfaceHex: string,
  opacity: number,
): { text: string; surface: string } {
  return {
    text: compositeGrain(textHex, opacity, GRAIN_TILE.min),
    surface: compositeGrain(surfaceHex, opacity, GRAIN_TILE.max),
  };
}
