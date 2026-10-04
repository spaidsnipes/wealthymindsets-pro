/**
 * F08B · THE STORM INSIDE THE LENS — Founder plate WM_NewMockup_79
 * "WEATHER IS A LENS" (read beside the serving glass, 2026-09-27).
 *
 * The plate's lens is not a tinted circle with a few puffs. It holds a
 * turbulent medium — smoke folding on itself, wisps and filaments, dense where
 * the tape persisted (gold) and thin where price responded (steel blue) —
 * with the candles still readable through it.
 *
 * THIS MODULE OWNS ONLY THE TEXTURE. `stormDensity` is a deterministic field
 * in [0, 1] (domain-warped fractal noise folded into filaments). It carries
 * NO market fact: no price, no direction, no depth. Every market fact the
 * storm shows — which colour at which time, how dense — is read at the paint
 * site from the measured weather cells (`selectHeatLens`), and the field only
 * modulates that measured colour. Same seed + same phase → same pixels (STILL
 * holds it exactly); LIVE advances `phase` slowly.
 *
 * PURE. DETERMINISTIC. NO RANDOMNESS AT RUNTIME.
 */

/**
 * The storm body's ceiling inside the lens (F08B; candles are cut out of it,
 * so it cannot bury them). 0.86 → 0.5 on 2026-10-04: candles are cut out, the
 * Smart Money marks are not — measured on serving NQ 5m, the absorption shelf
 * and the exhaustion mark on the newest bars read as smoke under the lens.
 */
export const STORM_BODY_MAX_ALPHA = 0.5;
/** How far the measured hue is pushed from grey inside the storm (F08B plate depth). */
export const STORM_SATURATION = 1.45;
/** Light in the smoke's lanes (d = 0) as a share of the measured colour; cores reach 1.5×. */
export const STORM_LIGHT_FLOOR = 0.5;
/** The brass bezel's band width (px) around the lens (F08B plate). */
export const LENS_BEZEL_W = 16;
/** Texture resolution (square). Upscaled with smoothing into the lens — the softness is part of the smoke. */
export const STORM_TEXTURE_SIZE = 128;
/** LIVE drift: phase units per second. Slow — weather drifts, it does not boil. */
export const STORM_DRIFT_PER_SEC = 0.035;

function hash2(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/**
 * Density at (u, v) ∈ [0,1]² for a seed and a drift phase. Domain-warped fbm
 * (the folding) blended with ridged noise (the filaments), contrast-shaped so
 * the smoke has body and clear lanes rather than an even fog.
 */
export function stormDensity(u: number, v: number, seed: number, phase: number): number {
  const x = u * 2.4, y = v * 2.4;
  const wx = fbm(x + phase * 0.7, y - phase * 0.3, seed + 101);
  const wy = fbm(x - phase * 0.4 + 5.2, y + phase * 0.5 + 1.3, seed + 211);
  const qx = x + 1.8 * wx, qy = y + 1.8 * wy;
  const body = fbm(qx + phase, qy, seed + 307, 5);
  const ridge = 1 - Math.abs(2 * fbm(qx * 1.7 - phase * 0.6, qy * 1.7, seed + 401, 4) - 1);
  const d = 0.78 * body + 0.22 * ridge * ridge;
  // Contrast: lanes clear, cores gather.
  const t = Math.max(0, Math.min(1, (d - 0.34) / 0.5));
  return t * t * (3 - 2 * t);
}

/** A stable seed from a string (symbol|timeframe) — the same market wears the same storm. */
export function stormSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 100000;
}

export interface StormTone {
  /** Measured colour at this column (rgb 0..255). */
  readonly rgb: readonly [number, number, number];
  /** Measured weight 0..1 (the cell's opacity against the regulator). 0 = no measured cell here. */
  readonly weight: number;
}

/**
 * Paint the storm into RGBA pixels. `toneAt(u)` is the MEASURED colour and
 * weight for the column at u (time runs left → right); rows outside the disc
 * stay transparent. Cores brighten toward the measured colour's own light,
 * never toward a new hue.
 */
export function renderStormPixels(
  out: Uint8ClampedArray,
  size: number,
  seed: number,
  phase: number,
  toneAt: (u: number) => StormTone,
  /** Rows [rowFrom, rowTo) only — a rebuild may be split across frames (performance pass 2026-09-29). */
  rowFrom = 0,
  rowTo = size,
): number {
  let painted = 0;
  const tones: StormTone[] = [];
  for (let px = 0; px < size; px++) tones.push(toneAt((px + 0.5) / size));
  // Column seams dissolved (F08B beside serving 2026-09-29: the measured
  // cells painted as hard vertical stripes; the plate's smoke flows across
  // time). Each pixel's colour is the weight-averaged MEASURED colour of its
  // neighbouring columns, sampled where the smoke's own density bends it —
  // measured colours only, blended where they meet; clear air stays clear.
  const blend = Math.max(1, Math.round(size / 24));
  // One weighted average per column, computed ONCE per render (was per pixel:
  // an 11-column window × 16k pixels — the lens alone cost ~14 ms/frame on
  // serving, 2026-09-29 performance pass).
  const tints: ([number, number, number] | null)[] = [];
  for (let center = 0; center < size; center++) {
    let r = 0, g = 0, b = 0, w = 0;
    for (let k = center - blend; k <= center + blend; k++) {
      const t = tones[Math.max(0, Math.min(size - 1, k))];
      if (t.weight <= 0) continue;
      const f = t.weight * (1 - Math.abs(k - center) / (blend + 1));
      r += t.rgb[0] * f; g += t.rgb[1] * f; b += t.rgb[2] * f; w += f;
    }
    tints.push(w > 0 ? [r / w, g / w, b / w] : null);
  }
  for (let py = Math.max(0, rowFrom); py < Math.min(size, rowTo); py++) {
    const v = (py + 0.5) / size;
    for (let px = 0; px < size; px++) {
      const u = (px + 0.5) / size;
      const du = u - 0.5, dv = v - 0.5;
      const r2 = (du * du + dv * dv) * 4;
      const i = (py * size + px) * 4;
      const tone = tones[px];
      if (r2 > 1 || tone.weight <= 0) { out[i + 3] = 0; continue; }
      const d = stormDensity(u, v, seed, phase);
      // Rim darkening — the lens's depth, not data.
      const rim = 1 - Math.pow(r2, 3) * 0.55;
      const glow = d * d * d;
      // Saturation pushed away from grey (F08B, beside the serving glass
      // 2026-09-29: the plate's smoke is deep yellow-green and teal; serving
      // read washed grey) — the SAME measured hue, deeper, never a new one.
      // Bent by the smoke's own density (the one sample this pixel already has).
      const bent = Math.max(0, Math.min(size - 1, Math.round(px + (d - 0.5) * blend * 3)));
      const [r0, g0, b0] = tints[bent] ?? tone.rgb;
      const grey = (r0 + g0 + b0) / 3;
      const r = grey + (r0 - grey) * STORM_SATURATION, g = grey + (g0 - grey) * STORM_SATURATION, b = grey + (b0 - grey) * STORM_SATURATION;
      // Luminous cores (plate): the measured colour lit from within, never a new hue.
      // BILLOWS (G03 beside serving 2026-09-29): the plate's smoke has dark
      // lanes between bright curling cores; serving read as an even fog. The
      // same hue, a wider light range: lanes drop to half, cores lift ~1.5×.
      const lit = STORM_LIGHT_FLOOR + (1 - STORM_LIGHT_FLOOR + 0.5) * d;
      out[i] = Math.max(0, Math.min(255, r * lit + 80 * glow));
      out[i + 1] = Math.max(0, Math.min(255, g * lit + 72 * glow));
      out[i + 2] = Math.max(0, Math.min(255, b * lit + 56 * glow));
      // The body is SMOKE, not a haze: a floor so the medium fills the lens.
      out[i + 3] = Math.round(255 * Math.min(1, tone.weight * (0.34 + 0.66 * d) * rim));
      painted++;
    }
  }
  return painted;
}
