/**
 * selectSameDayDualSideGuard — canon §SAME-DAY DUAL-SIDE GUARD
 * (Top-Down Process amendment 2026-08-25).
 *
 * Canon verbatim:
 *   "Holding calls and puts at the same time may be studied in paper
 *    as a data experiment, but each side must have an independent
 *    thesis, invalidation, model label, DTE/strike rationale, and
 *    management rule. Do not let one side exist merely as emotional
 *    insurance against being wrong on the other side. If the
 *    positions are not a predeclared multi-leg strategy, journal
 *    them as separate experimental trades."
 *
 * Deterministic same-day scanner for the DUAL-SIDE signature: any
 * symbol on a single day where the trader took BOTH a long-side AND
 * a short-side position. Canon flags this as a discipline hazard
 * unless the trader explicitly predeclared it as a multi-leg strategy.
 *
 * Input side signals (any of): "long" / "short" (canonical); "call"
 * / "put" (options bias); "buy" / "sell" (raw broker verb — must be
 * pre-normalized upstream because a short-cover BUY should not count).
 *
 * Rejection guarantees:
 *  - Empty input → empty result
 *  - Same-side multiple entries on one symbol (long+long) not flagged
 *  - Cross-day pairs not flagged (canon: same-day gate)
 *  - Multi-leg-strategy tag (predeclared) exempts the pair
 *  - Cross-symbol pairs not flagged (canon: same-underlying only)
 */

export type BiasSide = "long" | "short" | "call" | "put";

/** Normalize call → long-bias, put → short-bias for guard comparison. */
function biasClass(side: BiasSide): "LONG_BIAS" | "SHORT_BIAS" {
  if (side === "long" || side === "call") return "LONG_BIAS";
  return "SHORT_BIAS";
}

export interface DualSideEntry {
  /** ISO date YYYY-MM-DD. */
  date: string;
  /** Underlying symbol (normalized uppercase; e.g. "TSLA"). */
  symbol: string;
  side: BiasSide;
  /**
   * Trader-tagged multi-leg strategy label (predeclared). When any
   * entry on the pair carries a non-empty strategy tag matching
   * MULTI_LEG_TAGS below, the pair is EXEMPTED (canon: predeclared
   * multi-leg strategy is a legitimate expression).
   */
  multiLegTag?: string | null;
}

/** Canon-recognized predeclared multi-leg strategy tags. */
const MULTI_LEG_TAGS: readonly string[] = [
  "straddle",
  "strangle",
  "iron_condor",
  "iron_butterfly",
  "collar",
  "hedge",
];

export interface DualSidePair {
  date: string;
  symbol: string;
  long_side_count: number;
  short_side_count: number;
  exempted: boolean;
  exempt_reason: string | null;
}

export interface DualSideGuardResult {
  pairs: readonly DualSidePair[];
  /** Pairs that are NOT exempted — the actual discipline hazards. */
  hazards: readonly DualSidePair[];
  days_scanned: number;
  symbols_scanned: number;
  sample_size: number;
}

function normalizeSymbol(s: string): string {
  return s.trim().toUpperCase();
}

function normalizeTag(t: string | null | undefined): string {
  return (t ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function selectSameDayDualSideGuard(
  entries: readonly DualSideEntry[],
): DualSideGuardResult {
  if (entries.length === 0) {
    return { pairs: [], hazards: [], days_scanned: 0, symbols_scanned: 0, sample_size: 0 };
  }

  // Group by (date, symbol).
  const byKey = new Map<string, DualSideEntry[]>();
  const daySet = new Set<string>();
  const symbolSet = new Set<string>();
  for (const e of entries) {
    if (!e.date || !e.symbol) continue;
    const sym = normalizeSymbol(e.symbol);
    daySet.add(e.date);
    symbolSet.add(sym);
    const key = `${e.date}|${sym}`;
    const arr = byKey.get(key) ?? [];
    arr.push(e);
    byKey.set(key, arr);
  }

  const pairs: DualSidePair[] = [];
  for (const [key, group] of byKey.entries()) {
    const [date, symbol] = key.split("|");
    const longs = group.filter((e) => biasClass(e.side) === "LONG_BIAS");
    const shorts = group.filter((e) => biasClass(e.side) === "SHORT_BIAS");
    if (longs.length === 0 || shorts.length === 0) continue;
    // Check any entry in the group for a predeclared multi-leg tag.
    const tags = group.map((e) => normalizeTag(e.multiLegTag));
    const exempting = tags.find((t) => MULTI_LEG_TAGS.includes(t));
    pairs.push({
      date: date!,
      symbol: symbol!,
      long_side_count: longs.length,
      short_side_count: shorts.length,
      exempted: Boolean(exempting),
      exempt_reason: exempting ? `Predeclared ${exempting} strategy` : null,
    });
  }

  const hazards = pairs.filter((p) => !p.exempted);
  return {
    pairs,
    hazards,
    days_scanned: daySet.size,
    symbols_scanned: symbolSet.size,
    sample_size: entries.length,
  };
}
