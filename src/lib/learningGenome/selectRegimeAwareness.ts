/**
 * selectRegimeAwareness — canon §Regime (Top-Down Process step 1).
 *
 * Canon:
 *   "Regime — Identify the higher-timeframe state first. If WM flips
 *    BEAR/SIDE or BULL/SIDE, treat the uncertainty as information;
 *    do not force certainty."
 *
 * The trader must classify regime BEFORE picking a day model.
 * This selector counts how often the trader logged a regime with
 * their trade, and — where regime is present — how CONSISTENT the
 * regime tag is across trades on the same day (canon: regime is a
 * daily higher-timeframe input, not a per-trade guess).
 *
 * Signals:
 *   regime_tag_rate   — fraction of entries with a regime string
 *   consistent_days   — days where every entry shares one regime
 *   mixed_regime_days — days with conflicting regime tags
 *
 * Rejection guarantees:
 *  - Empty → all zeros / undefined
 *  - Entries without dates are skipped (can't group)
 *  - Regime strings compared case-insensitive to catch "BULL" vs "bull"
 */

export interface RegimeAwarenessEntry {
  date: string;
  regime?: string; // trader-supplied string; empty/undefined = untagged
}

export interface RegimeAwareness {
  sample_size: number;
  tagged_count: number;
  regime_tag_rate: number | undefined;
  consistent_days: number;
  mixed_regime_days: number;
  days_measured: number;
}

export function selectRegimeAwareness(
  entries: readonly RegimeAwarenessEntry[],
): RegimeAwareness {
  const sample_size = entries.length;
  const tagged = entries.filter(
    (e) => typeof e.regime === "string" && e.regime.trim() !== "",
  );
  const tagged_count = tagged.length;
  const regime_tag_rate =
    sample_size === 0 ? undefined : tagged_count / sample_size;

  // Group tagged entries by date; check consistency per day.
  const byDay = new Map<string, Set<string>>();
  for (const e of tagged) {
    if (!e.date) continue;
    const key = e.date;
    const norm = e.regime!.trim().toUpperCase();
    const set = byDay.get(key) ?? new Set<string>();
    set.add(norm);
    byDay.set(key, set);
  }

  let consistent_days = 0;
  let mixed_regime_days = 0;
  for (const regimes of byDay.values()) {
    if (regimes.size === 1) consistent_days++;
    else mixed_regime_days++;
  }

  return {
    sample_size,
    tagged_count,
    regime_tag_rate,
    consistent_days,
    mixed_regime_days,
    days_measured: byDay.size,
  };
}
