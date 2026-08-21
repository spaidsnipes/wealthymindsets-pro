/**
 * Delta bubble levels — stable level ownership (Founder canon §11 DELTA BUBBLES:
 * "Stable level ownership; default/user-controlled configuration rather than
 * random fluctuating count. Missing observation = show nothing, never invent.")
 *
 * The prior implementation bucketed ticks by dividing the CURRENT window's
 * min..max into N equal slices. As ticks arrived/expired, min/max/width shifted,
 * so every bucket boundary — and every bubble's price — moved each render: the
 * "random fluctuating count" the canon calls out. It also ignored the user's
 * level-count setting.
 *
 * This module quantizes each trade price onto a STABLE price grid (a fixed
 * magnitude-appropriate step). A given price ALWAYS maps to the same grid level
 * regardless of the tick window, so a level "owns" its bubble: new ticks add to
 * the existing level instead of reshuffling all boundaries. The display is then
 * bounded to the user's configured cap by keeping the most-traded levels.
 *
 * PURE — no I/O, no time. Deterministic for a given tick set.
 */

export interface DeltaTick {
  readonly price: number;
  readonly size: number;
  readonly side: "buy" | "sell";
  readonly trade?: boolean;
}

export interface DeltaLevel {
  readonly price: number;
  readonly delta: number; // buy - sell
  readonly vol: number; // buy + sell
}

/**
 * Stable, magnitude-appropriate grid step. Independent of the tick window, so
 * the same price always quantizes to the same level.
 */
export function priceStepFor(price: number): number {
  const p = Math.abs(price);
  if (p >= 10_000) return 5;
  if (p >= 1_000) return 1;
  if (p >= 100) return 0.1;
  if (p >= 10) return 0.05;
  if (p >= 1) return 0.005;
  return 0.0005;
}

/** Round a price onto the grid, returning a clean fixed-decimal number. */
export function quantizePrice(price: number, step: number): number {
  const snapped = Math.round(price / step) * step;
  // Decimals implied by the step (e.g. step 0.005 → 3 dp) — avoids fp dust.
  const dp = step >= 1 ? 0 : Math.min(8, Math.ceil(-Math.log10(step)));
  return Number(snapped.toFixed(dp));
}

export interface DeltaLevelOptions {
  /** Max levels to display (user setting). Default 7. */
  readonly cap?: number;
  /** Override the grid step; default derives from the reference price. */
  readonly step?: number;
  /** Reference price used to derive the grid step when `step` is omitted. */
  readonly referencePrice?: number;
}

/**
 * Compute stable delta levels from aggressor-tagged trades. Only real trades
 * with positive size/price contribute (never invents a level). Returns at most
 * `cap` levels — the most-traded ones — sorted top-of-book first (price desc).
 */
export function computeDeltaLevels(
  ticks: readonly DeltaTick[],
  opts: DeltaLevelOptions = {},
): DeltaLevel[] {
  const cap = opts.cap && opts.cap > 0 ? Math.floor(opts.cap) : 7;
  const clean = ticks.filter(
    (t) => t?.trade === true && Number.isFinite(t.size) && t.size > 0 && Number.isFinite(t.price) && t.price > 0,
  );
  if (clean.length === 0) return [];

  const ref = opts.referencePrice && opts.referencePrice > 0 ? opts.referencePrice : clean[clean.length - 1].price;
  const step = opts.step && opts.step > 0 ? opts.step : priceStepFor(ref);

  const acc = new Map<number, { buy: number; sell: number }>();
  for (const t of clean) {
    const gp = quantizePrice(t.price, step);
    const cur = acc.get(gp) ?? { buy: 0, sell: 0 };
    if (t.side === "buy") cur.buy += t.size;
    else cur.sell += t.size;
    acc.set(gp, cur);
  }

  const all: DeltaLevel[] = [...acc.entries()]
    .map(([price, v]) => ({ price, delta: v.buy - v.sell, vol: v.buy + v.sell }))
    .filter((l) => l.vol > 0);

  // Bound the DISPLAY to the user cap by keeping the most-traded levels
  // (stable: a heavily-traded level persists across renders), then present
  // top-of-book first. Tie-break by price desc for determinism.
  return all
    .sort((a, b) => b.vol - a.vol || b.price - a.price)
    .slice(0, cap)
    .sort((a, b) => b.price - a.price);
}
