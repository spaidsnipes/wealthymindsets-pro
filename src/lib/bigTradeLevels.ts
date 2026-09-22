/**
 * Big-trade bubble level ownership — the Big Trade half of the Founding
 * Contract §13 "bubble level ownership" gate.
 *
 * The delta-bubble half was closed in src/lib/deltaBubbleLevels.ts. Its header
 * names two defects: a bubble printing a computed bucket CENTRE as the price
 * flow happened at, and a ROUNDED price used as a bucket identity, which
 * silently merged levels and dropped their aggressor volume.
 *
 * The second defect survived one function further down, in the Big Trade lane,
 * where it is worse — because a big-trade bubble's whole claim is that it marks
 * an EXACT tick print off the tape.
 *
 * WHAT WAS WRONG
 *
 *   Each real print was rounded for display before anything else happened:
 *
 *       priceLevel: +Number(px).toFixed(base > 100 ? 2 : 4)
 *
 *   and that rounded value then served as the level's identity — the `pickMap`
 *   key here, and the `bt:<time>:<price>` spawn key in the renderer.
 *
 *   On equities that is occasionally lossy (sub-penny and odd-lot prints are
 *   real). On crypto it is lossy constantly: BTC has `base > 100`, so every
 *   print collapses to two decimals, and 60123.4512 / 60123.4587 — two separate
 *   large prints, possibly opposite sides — become one key. The second
 *   overwrote the first in the map. It was not merged; its size was not added
 *   to anything. The bubble simply never spawned and that block trade vanished
 *   from the chart with no indication. §5 SYSTEM TRUTH LAW.
 *
 * WHAT THIS MODULE OWNS
 *
 *   `priceLevel` is the price AS PRINTED. No rounding, ever, at this layer.
 *   Rounding is a rendering concern and belongs in the label, not in the datum
 *   or in the identity. That makes the price the bubble claims literally the
 *   price that traded, and makes the identity exact by construction: two
 *   distinct prints cannot collide, and the same print cannot spawn twice.
 *
 *   Ranking is unchanged in intent — the heaviest prints, plus a guaranteed
 *   buy leader and sell leader so an active bar always shows both sides.
 *
 * Pure: no DOM, no refs, no globals, so the shipped code is the tested code.
 *
 * Aggressor convention is codebase-wide:  ask = buyer-initiated ("buy"),
 * bid = seller-initiated ("sell").
 */

import type { AggressorMethod } from "@/lib/marketData/marketEvent";

export interface BigTradeTick {
  price: number;
  bid: number; // seller-initiated volume printed at this price
  ask: number; // buyer-initiated volume printed at this price
  /** Canonical event identity when the provider published one. */
  printKey?: string;
  /** The execution timestamp, never the containing bar's timestamp. */
  timeMs?: number;
  /** How this individual print's aggressor side was established. */
  aggressorMethod?: AggressorMethod;
}

export interface BigTradeLevel {
  /**
   * The price AS PRINTED — the level's identity and its claim, in one number.
   * Deliberately NOT rounded. See the header.
   */
  priceLevel: number;
  bid: number;
  ask: number;
  total: number;
  /** One execution, one identity. Never a price-level key. */
  printKey?: string;
  /** Exact execution time when the tape supplied it. */
  timeMs?: number | null;
  readonly aggressorMethod?: AggressorMethod;
}

/**
 * Minimum single-print size to count as a "big trade", by price magnitude.
 *
 * Exported so the tuning is testable rather than buried in a component. Tuned
 * down over several rounds: 2 BTC (~$126k) → 0.5 → 0.15, because even 0.5 was
 * rare enough that only ~2 bubbles showed per session. 0.15 BTC (~$10k) is
 * still a genuine large single print while being frequent enough to render.
 */
export function minBigTradeLot(base: number): number {
  return base > 10_000 ? 0.15 : base > 100 ? 2 : base > 1 ? 0.03 : 0.001;
}

/** Stable spawn/dedupe identity for one big-trade level. */
export function bigTradeLevelKey(barTime: number, level: BigTradeLevel): string {
  return level.printKey || `bt:${barTime}:${level.priceLevel}`;
}

/**
 * Rank one bar's real prints down to the big-trade bubbles actually drawn.
 *
 * Selection, in order:
 *   1. Prints at or above `max(minLot, barMean * 1.35)`, heaviest first, top 5.
 *   2. The bar's strongest buy-side print and strongest sell-side print, each
 *      reserved a slot, so an active bar never renders one-sided by accident.
 *   3. Capped at 8, heaviest first.
 *
 * That 8 is slack, not the real ceiling. The threshold pass is already capped
 * at 5, and the buy leader is by definition the heaviest buy, so it is always
 * inside that 5 and never claims an extra slot. Only the sell leader can fall
 * outside it. A bar therefore yields at most SIX bubbles — measured, and
 * locked in bigTradeLevels.test.ts so a change to either number is visible.
 *
 * Ties break on price ascending so identical input always yields identical
 * bubbles — the renderer spawns from this list and a reordering would look
 * like new prints arriving.
 */
export function computeBigTradeLevels(
  ticks: readonly BigTradeTick[],
  base: number,
): BigTradeLevel[] {
  if (!Array.isArray(ticks) || ticks.length === 0) return [];

  const minLot = minBigTradeLot(base);

  const levels: BigTradeLevel[] = [];
  for (let sourceIndex = 0; sourceIndex < ticks.length; sourceIndex++) {
    const t = ticks[sourceIndex];
    const price = Number(t?.price);
    if (!Number.isFinite(price)) continue;
    const bid = Math.max(0, Number(t.bid) || 0);
    const ask = Math.max(0, Number(t.ask) || 0);
    const total = bid + ask;
    if (total < minLot) continue;
    const timeMs = Number(t.timeMs);
    const exactTime = Number.isFinite(timeMs) && timeMs > 0 ? timeMs : null;
    // An event id is the preferred identity. The fallback includes the source
    // position so two otherwise identical legacy executions remain two facts;
    // migrated adapters never need it because marketTickDedupeKey publishes an
    // event: key.
    const printKey = t.printKey?.trim() ||
      `legacy-print:${exactTime ?? "undated"}:${price}:${bid}:${ask}:${sourceIndex}`;
    levels.push({
      priceLevel: price,
      bid,
      ask,
      total,
      printKey,
      timeMs: exactTime,
      aggressorMethod: t.aggressorMethod,
    });
  }
  if (levels.length === 0) return [];

  const barMean = levels.reduce((s, l) => s + l.total, 0) / levels.length;
  const threshold = Math.max(minLot, barMean * 1.35);

  const heaviest = (a: BigTradeLevel, z: BigTradeLevel) =>
    z.total - a.total || a.priceLevel - z.priceLevel;

  // Keyed by the EXECUTION, not by price. Two real prints may share a price,
  // time bucket and side and still be two separate market events.
  const picked = new Map<string, BigTradeLevel>();
  for (const l of levels.filter((x) => x.total >= threshold).sort(heaviest).slice(0, 5)) {
    picked.set(l.printKey!, l);
  }

  // The leader must clear minLot ON ITS OWN SIDE, not merely in total. A level
  // that is 1.9 sell + 0.1 buy is not this bar's buy leader just because the
  // two together pass the lot floor.
  const topBuy = levels.filter((l) => l.ask >= l.bid && l.ask >= minLot)
    .sort((a, z) => z.ask - a.ask || a.priceLevel - z.priceLevel)[0];
  const topSell = levels.filter((l) => l.bid > l.ask && l.bid >= minLot)
    .sort((a, z) => z.bid - a.bid || a.priceLevel - z.priceLevel)[0];
  if (topBuy) picked.set(topBuy.printKey!, topBuy);
  if (topSell) picked.set(topSell.printKey!, topSell);

  return [...picked.values()].sort(heaviest).slice(0, 8);
}
