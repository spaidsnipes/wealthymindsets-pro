/**
 * PROFILE DISPLAY BANDS — a profile's rows, merged on the glass until each row
 * is tall enough to read as a row.
 *
 * G19 (Founder 2026-10-10: "white-line profiles without adequate visual
 * embodiment"). A profile with ~70 rows over a short price span gives each row
 * 2 px; drawn at `rowH − 1` that is a 1-px hairline per row — the Fixed Range
 * read on serving (BTC-USD 15m, 41 bars) as a comb of white lines, not a
 * histogram. The canon asks for crisp, pixel-snapped rows (G19A-08).
 *
 * This merges ADJACENT rows (by price) into bands of whole rows until a band
 * spans at least `minPx` on screen. It is a coarser display grid of the SAME
 * distribution, never a new measurement:
 *   · a band's volume is the SUM of its rows' volume (shares are re-normalised
 *     against the heaviest band — what a bar's width means on every profile);
 *   · a band holds the POC when any of its rows is the POC — the exact POC
 *     price is still drawn by the profile's own level rule, not by the band;
 *   · a band is inside value only when ALL its rows are — an edge band that
 *     straddles VAH / VAL reads as tail, never claims more value than measured;
 *   · nothing is invented: no row appears that the profile did not have, and a
 *     profile already readable at `minPx` comes back row for row.
 *
 * PURE. DETERMINISTIC. No canvas, no React, no IO.
 */

export interface DisplayRowIn {
  readonly price: number;
  /** Width share against the heaviest row, 0..1 (the profile's own). */
  readonly share: number;
  readonly isPoc: boolean;
  readonly insideValueArea: boolean;
}

export interface DisplayBand {
  /** Lowest and highest row price in the band. */
  readonly lo: number;
  readonly hi: number;
  /** Width share against the heaviest BAND, 0..1. */
  readonly share: number;
  readonly isPoc: boolean;
  readonly insideValueArea: boolean;
  /** How many profile rows the band carries. */
  readonly rows: number;
}

/** Rows per band so that a band spans at least `minPx` given the row pitch. */
export function rowsPerBand(pitchPx: number, minPx: number): number {
  if (!(pitchPx > 0) || !(minPx > 0)) return 1;
  return Math.max(1, Math.ceil(minPx / pitchPx));
}

/**
 * Merge `rows` (any order) into bands of `k` adjacent rows, from the lowest
 * price up. `k <= 1` returns one band per row.
 */
export function mergeIntoBands(rows: readonly DisplayRowIn[], k: number): DisplayBand[] {
  const sorted = [...rows].filter(r => Number.isFinite(r.price) && Number.isFinite(r.share)).sort((a, b) => a.price - b.price);
  const n = Math.max(1, Math.floor(k));
  const raw: { lo: number; hi: number; sum: number; isPoc: boolean; inside: boolean; rows: number }[] = [];
  for (let i = 0; i < sorted.length; i += n) {
    const g = sorted.slice(i, i + n);
    raw.push({
      lo: g[0].price,
      hi: g[g.length - 1].price,
      sum: g.reduce((s, r) => s + Math.max(0, r.share), 0),
      isPoc: g.some(r => r.isPoc),
      inside: g.every(r => r.insideValueArea),
      rows: g.length,
    });
  }
  const heaviest = raw.reduce((m, b) => Math.max(m, b.sum), 0);
  return raw.map(b => ({
    lo: b.lo,
    hi: b.hi,
    share: heaviest > 0 ? b.sum / heaviest : 0,
    isPoc: b.isPoc,
    insideValueArea: b.inside,
    rows: b.rows,
  }));
}

/** The glass floor for a readable profile row, in CSS px. */
export const PROFILE_ROW_MIN_PX = 4;
