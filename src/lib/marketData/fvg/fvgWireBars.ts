/**
 * FVG WIRE BARS — the canonical bars an FVG reader feeds the ONE engine.
 *
 * Garden 19 §20–§24 (Backtest, Scanner, Replay). `fvgEngine.ts` reads
 * `CanonicalBar`s and nothing else. The bar routes (/api/yahoo and friends)
 * publish the canonical identity of every candle as a `barIdentities` sidecar
 * beside the six-number `candles` array; this module puts the two halves back
 * together — the SAME pairing rule as `alignCanonicalBarIdentities` (a candle
 * with zero or two identities is refused, never guessed) — so a reader never
 * has to invent a symbolId, a fidelity, a source or a provenance. A candle
 * whose identity did not arrive is COUNTED (`unpaired`), not laundered.
 *
 * It also states which bars are CLOSED. The engine's rule 1: a forming bar is
 * never read. Closed = the engine's own clock (bar open + the timeframe
 * registry's interval) is at or before `nowMs`.
 *
 * PURE. No IO, no clock (the caller passes `nowMs`).
 */

import {
  type CanonicalBar,
  type CanonicalBarIdentity,
  type LegacyOhlcvTuple,
} from "@/lib/marketData/canonicalBar";
import { alignCanonicalBarIdentities } from "@/lib/marketData/alignCanonicalBarIdentities";
import { getTimeframe, normalizeTFId } from "@/lib/timeframes";

export interface FvgWireBars {
  /** Canonical bars, oldest first, ready for `detectFvgs`. */
  readonly bars: readonly CanonicalBar[];
  /** Candles that arrived without exactly one canonical identity — refused, counted. */
  readonly unpaired: number;
}

/**
 * Rejoin the six-number candles (epoch SECONDS) with the canonical identities
 * the same response published. The identity is the producer's statement; the
 * OHLCV is the producer's numbers. Nothing is invented.
 */
export function rejoinCanonicalBars(input: {
  readonly candles: readonly LegacyOhlcvTuple[];
  readonly identities: readonly CanonicalBarIdentity[];
  readonly symbolId: string;
  readonly timeframe: string;
}): FvgWireBars {
  const aligned = alignCanonicalBarIdentities({
    bars: input.candles,
    identities: input.identities,
    acceptedSymbolIds: [input.symbolId],
    timeframe: input.timeframe,
  });
  const bySec = new Map<number, CanonicalBarIdentity>();
  for (const id of aligned) bySec.set(Math.floor(id.asOf / 1000), id);
  const bars: CanonicalBar[] = [];
  let unpaired = 0;
  for (const c of input.candles) {
    const id = bySec.get(Number(c.time));
    if (!id) { unpaired += 1; continue; }
    bars.push({ ...id, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
  }
  bars.sort((a, b) => a.asOf - b.asOf);
  return { bars, unpaired };
}

/** The engine's clock for a bar: open + the registry interval. Null when the timeframe has no clock. */
export function fvgBarCloseMs(bar: Pick<CanonicalBar, "asOf">, timeframe: string): number | null {
  const id = normalizeTFId(timeframe.trim());
  if (!id) return null;
  return bar.asOf + getTimeframe(id).candleIntervalSec * 1000;
}

/**
 * Only the bars that have CLOSED by `nowMs` (rule 1: the forming bar is never
 * read). A timeframe with no registry clock closes nothing — the caller is told
 * (`noClock`) instead of having a creation time guessed for it.
 */
export function closedFvgBars(
  bars: readonly CanonicalBar[],
  timeframe: string,
  nowMs: number,
): { readonly closed: readonly CanonicalBar[]; readonly forming: number; readonly noClock: boolean } {
  const id = normalizeTFId(timeframe.trim());
  if (!id) return { closed: [], forming: 0, noClock: true };
  const ms = getTimeframe(id).candleIntervalSec * 1000;
  const closed = bars.filter(b => b.asOf + ms <= nowMs);
  return { closed, forming: bars.length - closed.length, noClock: false };
}
