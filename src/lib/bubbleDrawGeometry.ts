/**
 * BUBBLE DRAW GEOMETRY — the single owner of "how big is this bubble".
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 *
 * Delta bubble LEVELS have an owner (src/lib/deltaBubbleLevels.ts) and an
 * adoption Sentinel. Big-trade LEVELS have one too. Neither of them owns a
 * single PIXEL. Until this file, the radius — the only thing a human actually
 * reads off a bubble — was computed inline in MainChart.tsx in TWO separate
 * places, with two different shaping functions, and nothing tested either one:
 *
 *   delta bubbles  (≈line 4917)
 *     const norm  = Math.sqrt(absDelta / maxAbsD);
 *     const baseR = Math.round(11 + norm * 14);
 *
 *   big trades     (≈line 5395)
 *     const ratio = lv.total / Math.max(1, barMean);
 *     const baseR = Math.round(Math.max(9, Math.min(28, 9 + Math.sqrt(Math.max(0, ratio - 1)) * 11)));
 *
 * Both were WRONG, in the exact way this repo has already written down once —
 * in the header of src/lib/vpDrawGeometry.ts, about Volume Profile bar width:
 *
 *   "No aesthetic baseline and no power curve — those made low levels
 *    fake-wide and saturated every above-median level into one chunky solid
 *    block, which is a picture of the shaping function rather than of the
 *    volume."
 *
 * That law was learned on one surface and never carried to the other. Two
 * surfaces in the same product held contradictory laws about honest size
 * encoding, and the bubbles held the losing one.
 *
 * ── The three defects, stated as measurements ─────────────────────────────
 *
 * 1. BASELINE BLEND. `11 + norm * 14` adds 11px to EVERY bubble, including the
 *    ones that earned nothing. A zone carrying 0% of the bar's peak delta
 *    rendered at r=11 against a peak of r=25 — 19% of the peak AREA for 0% of
 *    the flow. That is the "fake-wide" failure, on a circle.
 *
 * 2. SATURATION. The big-trade form clamped at 28. Solving it: anything with
 *    ratio ≥ 3.98× the bar mean painted an IDENTICAL bubble. A 4× print and a
 *    40× print were the same picture. Below the mean was worse — `ratio - 1`
 *    floors at zero, so every print at or under the bar's average collapsed to
 *    one indistinguishable r=9 dot.
 *
 * 3. TWO NORMALIZERS. Delta measured each zone against the bar's PEAK; big
 *    trades measured each print against the bar's MEAN. A mean is dragged by
 *    the very outlier the bubble is trying to show, so the same print changed
 *    size depending on what else happened to trade in that bar.
 *
 * ── The law this file holds ───────────────────────────────────────────────
 *
 * A bubble is a DISC. What a human reads off a disc is its AREA, not its
 * radius, so the honest encoding is area ∝ value, which means:
 *
 *     r = maxR * sqrt(value / peak)
 *
 * The square root here is NOT a shaping curve — it is the inverse of the
 * geometry. It is the direct-proportional encoding for a circle in exactly the
 * sense `vpBarWidth`'s bare multiply is the direct-proportional encoding for a
 * rectangle. Squaring it back gives `r² = maxR² * (value / peak)`, i.e. area is
 * linear in value. That is the whole claim, and it is testable.
 *
 * A minimum radius survives, for the same reason `vpBarWidth` keeps its
 * `Math.max(1, …)`: a zero-radius bubble is not an honest small bubble, it is
 * an absent one, and absence reads as "no flow here" — accidentally-correct
 * silence. But the floor is a FLOOR, never a baseline: it is applied only where
 * the honest radius falls beneath it, and it never adds to a bubble that earned
 * its size. `bubbleRadiusIsFloored` exists so a caller can tell the difference
 * rather than guessing.
 *
 * ── What this file does NOT claim ─────────────────────────────────────────
 *
 * It owns SIZE. It does not own colour, placement, the sibling spread, the
 * spawn ease, or anything about the composed scene — MainChart still draws
 * those, and whether the assembled picture reads well remains HUMAN_PROOF.
 */

/** Smallest radius a bubble may paint at. Below this it reads as absent. */
export const BUBBLE_MIN_R = 6;

/** Radius of the bubble carrying the bar's peak value. */
export const DELTA_BUBBLE_MAX_R = 25;

/** Big trades get a slightly larger ceiling — they are the louder event. */
export const BIG_TRADE_MAX_R = 28;

export interface BubbleRadiusOpts {
  /** Radius the PEAK value paints at. */
  readonly maxR: number;
  /** Legibility floor. Applied only where the earned radius falls below it. */
  readonly minR?: number;
}

function fraction(value: number, peak: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(peak) || peak <= 0) return 0;
  const f = Math.abs(value) / peak;
  if (!Number.isFinite(f)) return 0;
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

/**
 * The radius this value EARNED, before any floor — area directly proportional
 * to value. Exported so a test can state the law against the unfloored number
 * instead of against the same quantity the floor perturbs.
 */
export function bubbleEarnedRadius(value: number, peak: number, opts: BubbleRadiusOpts): number {
  return opts.maxR * Math.sqrt(fraction(value, peak));
}

/**
 * The radius to paint: the earned radius, raised to the floor where it would
 * otherwise vanish, rounded to a whole pixel.
 */
export function bubbleRadius(value: number, peak: number, opts: BubbleRadiusOpts): number {
  const minR = opts.minR ?? BUBBLE_MIN_R;
  return Math.round(Math.max(minR, bubbleEarnedRadius(value, peak, opts)));
}

/**
 * TRUE when the painted radius is legibility rather than data — i.e. the floor
 * did the work. A caller that wants to disclose "this dot is at its minimum
 * size, its real share is smaller than it looks" asks this, rather than
 * re-deriving the comparison and forking the law.
 */
export function bubbleRadiusIsFloored(value: number, peak: number, opts: BubbleRadiusOpts): boolean {
  const minR = opts.minR ?? BUBBLE_MIN_R;
  return bubbleEarnedRadius(value, peak, opts) < minR;
}

/** Delta bubble radius — value is the zone's |delta|, peak the bar's strongest zone. */
export function deltaBubbleRadius(absDelta: number, peakAbsDelta: number): number {
  return bubbleRadius(absDelta, peakAbsDelta, { maxR: DELTA_BUBBLE_MAX_R });
}

/** Big-trade radius — value is the print's total, peak the bar's largest print. */
export function bigTradeBubbleRadius(total: number, peakTotal: number): number {
  return bubbleRadius(total, peakTotal, { maxR: BIG_TRADE_MAX_R });
}
