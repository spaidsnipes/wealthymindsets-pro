/**
 * Nectar comparison — REMEMBER → REFLECT loop closure.
 *
 * A journal entry stores a NectarSnapshot of what WM observed about the symbol
 * at journal-creation time. This module compares that frozen snapshot against
 * the CURRENT canonical observations so the trader, reviewing a past entry, can
 * see what actually changed since — "+K trades observed since you journaled."
 *
 * Truth rules (fail-closed, no fabrication):
 *  - If the symbol has no live observations now → nothing to compare.
 *  - The sessionSymbolStore is SESSION-SCOPED: after a reload/new session its
 *    counters restart at 0. If the current count is BELOW the journal-time
 *    count, that is a reset, not negative activity — we say so and refuse to
 *    render a misleading "-N since".
 */

/** The aggregate shape shared by the journal-time snapshot and the live read. */
export interface NectarAggregate {
  readonly tradeCount: number;
  readonly delta: number;
  readonly buyVol: number;
  readonly sellVol: number;
  readonly bigTradeCount: number;
  readonly horizonSec: number | null;
  readonly lastTradeAtMs: number | null;
  readonly channels: number;
}

/** One store row's stats, decoupled from the store's internal shape. */
export interface NectarRowInput {
  readonly tradeCount: number;
  readonly delta: number;
  readonly buyVol: number;
  readonly sellVol: number;
  readonly bigTradeCount: number;
  readonly horizonSec: number | null;
  readonly lastTradeAtMs: number | null;
}

/**
 * Pure aggregation across every tape source for a symbol. Returns null when no
 * row carries any trades (never fabricates an empty aggregate as "observed").
 * This is the single aggregation path — the journal save and the compare view
 * both use it, so they cannot drift.
 */
export function aggregateNectar(rows: readonly NectarRowInput[]): NectarAggregate | null {
  const active = rows.filter((r) => r.tradeCount > 0);
  if (active.length === 0) return null;
  let tradeCount = 0, delta = 0, buyVol = 0, sellVol = 0, bigTradeCount = 0;
  let horizonSec: number | null = null;
  let lastTradeAtMs: number | null = null;
  for (const r of active) {
    tradeCount += r.tradeCount;
    delta += r.delta;
    buyVol += r.buyVol;
    sellVol += r.sellVol;
    bigTradeCount += r.bigTradeCount;
    if (r.horizonSec != null) horizonSec = horizonSec == null ? r.horizonSec : Math.min(horizonSec, r.horizonSec);
    if (r.lastTradeAtMs != null) lastTradeAtMs = lastTradeAtMs == null ? r.lastTradeAtMs : Math.max(lastTradeAtMs, r.lastTradeAtMs);
  }
  return { tradeCount, delta, buyVol, sellVol, bigTradeCount, horizonSec, lastTradeAtMs, channels: active.length };
}

export interface NectarComparison {
  /** Is the symbol still observed now? */
  readonly hasCurrent: boolean;
  /** Session tape reset since journal (now < then) → counts not comparable. */
  readonly reset: boolean;
  readonly thenTradeCount: number;
  readonly nowTradeCount: number | null;
  /** now − then when comparable; null when no current or reset. */
  readonly sinceTrades: number | null;
  readonly thenBigTrades: number;
  readonly nowBigTrades: number | null;
  readonly sinceBigTrades: number | null;
  readonly thenDelta: number;
  readonly nowDelta: number | null;
  readonly deltaShift: number | null;
  /** Honest one-line human summary. */
  readonly detail: string;
}

/** Just the journal-time fields the comparison needs (subset of NectarSnapshot). */
export interface NectarSnapshotLike {
  readonly tradeCount: number;
  readonly bigTradeCount: number;
  readonly delta: number;
}

export function selectNectarComparison(
  then: NectarSnapshotLike,
  now: NectarAggregate | null,
): NectarComparison {
  if (now == null) {
    return {
      hasCurrent: false,
      reset: false,
      thenTradeCount: then.tradeCount,
      nowTradeCount: null,
      sinceTrades: null,
      thenBigTrades: then.bigTradeCount,
      nowBigTrades: null,
      sinceBigTrades: null,
      thenDelta: then.delta,
      nowDelta: null,
      deltaShift: null,
      detail: "No live observations for this symbol now — nothing to compare against journal time.",
    };
  }

  const reset = now.tradeCount < then.tradeCount;
  if (reset) {
    return {
      hasCurrent: true,
      reset: true,
      thenTradeCount: then.tradeCount,
      nowTradeCount: now.tradeCount,
      sinceTrades: null,
      thenBigTrades: then.bigTradeCount,
      nowBigTrades: now.bigTradeCount,
      sinceBigTrades: null,
      thenDelta: then.delta,
      nowDelta: now.delta,
      deltaShift: null,
      detail: "Session tape reset since this entry — live counters restarted, so counts are not comparable.",
    };
  }

  const sinceTrades = now.tradeCount - then.tradeCount;
  const sinceBigTrades = now.bigTradeCount - then.bigTradeCount;
  const deltaShift = now.delta - then.delta;
  const detail =
    sinceTrades === 0
      ? "No new trades observed since you journaled this symbol."
      : `${sinceTrades.toLocaleString("en-US")} new trade${sinceTrades === 1 ? "" : "s"} observed since you journaled${sinceBigTrades > 0 ? ` (${sinceBigTrades} big)` : ""}.`;

  return {
    hasCurrent: true,
    reset: false,
    thenTradeCount: then.tradeCount,
    nowTradeCount: now.tradeCount,
    sinceTrades,
    thenBigTrades: then.bigTradeCount,
    nowBigTrades: now.bigTradeCount,
    sinceBigTrades,
    thenDelta: then.delta,
    nowDelta: now.delta,
    deltaShift,
    detail,
  };
}
