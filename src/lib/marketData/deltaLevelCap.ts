/**
 * WHO OWNS "HOW MANY DELTA LEVELS" — AND WHAT THE CONTROL IS PROMISING.
 *
 * TWO DEFECTS, ONE MISSING OWNER.
 *
 * (1) THE CONTROL DID NOT MOVE THE PIXELS IT SITS ON. The "Levels shown"
 *     segmented control lives inside the WM DELTA BUBBLES card, under the
 *     sub-label "max ranked price levels per bar". Directly beneath it the card
 *     renders `selectDeltaLevels(recentTicks).levels` — a grid-anchored
 *     partition aiming at TARGET_LEVELS = 6, which has never taken a cap. So
 *     choosing 15 changed nothing on that card; choosing 5 changed nothing on
 *     that card. The setting reached the chart canvas through a localStorage
 *     broadcast and stopped there. A control that does not affect the surface
 *     hosting it is not a preference, it is a decoration — and the "N LEVELS"
 *     chip beside it was counting the UNCAPPED list while the chart drew the
 *     capped one. One screen, one question, two answers.
 *
 * (2) THE ALLOW-LIST WAS SPELLED FOUR TIMES IN TWO FILES. `[5, 7, 10, 15]`
 *     appeared twice in SmartMoneyPanel (initial read + cross-tab sync), once
 *     in MainChart, and once more as the button row. Four copies that agree
 *     until someone edits one — at which point a value the panel accepts is a
 *     value the chart silently rewrites to 7, with nothing on screen saying so.
 *
 * WHAT THIS MODULE REFUSES TO DO. It does not re-rank, re-bin, or re-price
 * anything. `computeDeltaBubbleLevels` (chart) and `selectDeltaLevels` (panel)
 * remain the owners of WHERE a level is and WHAT its delta is — both are
 * separately truth-locked, and a second opinion on either would be the exact
 * duplication this file exists to end. All that lives here is the cap: its
 * legal values, how a stored string becomes one, and what "top N ranked" means.
 *
 * PURE. No clock, no I/O, no React, no localStorage access — callers own the
 * storage; this owns the meaning.
 */

/** The four legal choices. Frozen so a caller cannot quietly extend the domain. */
export const DELTA_LEVEL_CAP_CHOICES = Object.freeze([5, 7, 10, 15] as const);

export type DeltaLevelCap = (typeof DELTA_LEVEL_CAP_CHOICES)[number];

/** Marked ★ in the UI. The value every unreadable input falls back to. */
export const DELTA_LEVEL_CAP_DEFAULT: DeltaLevelCap = 7;

/** The one storage key. Named here so no consumer has to retype the string. */
export const DELTA_LEVEL_CAP_STORAGE_KEY = "wm_delta_levels";

/** The one broadcast event, for cross-surface and cross-tab sync. */
export const DELTA_LEVEL_CAP_EVENT = "wm-delta-levels";

/**
 * Turn whatever is in storage into a legal cap.
 *
 * FAIL-CLOSED TO THE DEFAULT, NEVER TO A CLAMP. A stored `12` does not become
 * `10` — silent coercion to a neighbouring value is how a surface ends up
 * showing a number nobody chose. It becomes the default, which is at least a
 * value the UI marks and the trader can see selected.
 */
export function normalizeDeltaLevelCap(raw: string | number | null | undefined): DeltaLevelCap {
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  return (DELTA_LEVEL_CAP_CHOICES as readonly number[]).includes(n)
    ? (n as DeltaLevelCap)
    : DELTA_LEVEL_CAP_DEFAULT;
}

/** The shape any level must have to be ranked and capped. */
export interface RankableDeltaLevel {
  readonly price: number;
  readonly delta: number;
}

export interface CappedDeltaLevels<T extends RankableDeltaLevel> {
  /** At most `cap` levels, still ordered high price first — a ladder is read that way. */
  readonly levels: readonly T[];
  /** How many are rendered. */
  readonly shown: number;
  /** How many the tape actually produced, before the cap. */
  readonly total: number;
  /** True when the trader's own setting is hiding observed levels from them. */
  readonly truncated: boolean;
}

/**
 * Apply the trader's cap: keep the `cap` levels with the largest |delta|, then
 * put them back in price order.
 *
 * TWO DELIBERATE CHOICES.
 *
 * · RANK BY |DELTA|, RENDER BY PRICE. Ranking is what "max RANKED price levels"
 *   means and it matches `computeDeltaBubbleLevels` on the chart, so the two
 *   surfaces keep the same levels. But a strip sorted by magnitude is no longer
 *   a ladder — the prices would jump around — so the survivors are re-sorted by
 *   price before they are handed back.
 *
 * · TIES BREAK BY PRICE, ASCENDING. Identical to the chart's comparator
 *   (`Math.abs(z.delta) - Math.abs(a.delta) || a.priceLevel - z.priceLevel`).
 *   Without a deterministic second key, two equal deltas could resolve
 *   differently on the panel than on the canvas and the same bar would show
 *   different levels in two places — the defect, reintroduced by a sort.
 *
 * `total` and `truncated` travel with the result because a cap that hides
 * observed levels is a fact the trader is owed. Reporting only `shown` is how
 * "5 LEVELS" came to mean two different things.
 */
export function capDeltaLevels<T extends RankableDeltaLevel>(
  levels: readonly T[] | null | undefined,
  cap: number,
): CappedDeltaLevels<T> {
  const all = Array.isArray(levels) ? levels : [];
  const limit = Math.max(1, Math.floor(cap) || DELTA_LEVEL_CAP_DEFAULT);

  if (all.length <= limit) {
    return { levels: all, shown: all.length, total: all.length, truncated: false };
  }

  const kept = [...all]
    .sort((a, z) => Math.abs(z.delta) - Math.abs(a.delta) || a.price - z.price)
    .slice(0, limit)
    .sort((a, z) => z.price - a.price);

  return { levels: kept, shown: kept.length, total: all.length, truncated: true };
}
