import type {
  CanonicalBarIdentity,
  LegacyOhlcvTuple,
} from "./canonicalBar";

/**
 * Keep only identities that still name a candle after the chart's session and
 * geometry filters. Ambiguous identity is refused: two canonical bars for one
 * renderer instant means the selected object cannot know which past it owns.
 */
export function alignCanonicalBarIdentities(input: {
  readonly bars: readonly LegacyOhlcvTuple[];
  readonly identities: readonly CanonicalBarIdentity[];
  readonly acceptedSymbolIds: readonly string[];
  readonly timeframe: string;
}): readonly CanonicalBarIdentity[] {
  const visibleTimes = new Set(input.bars.map(bar => Number(bar.time)));
  const acceptedSymbols = new Set(input.acceptedSymbolIds.map(symbol => symbol.trim().toUpperCase()));
  const byTime = new Map<number, CanonicalBarIdentity[]>();

  for (const identity of input.identities) {
    if (!acceptedSymbols.has(identity.symbolId.trim().toUpperCase()) || identity.timeframe !== input.timeframe) continue;
    const time = Math.floor(identity.asOf / 1000);
    if (!visibleTimes.has(time)) continue;
    const bucket = byTime.get(time) ?? [];
    bucket.push(identity);
    byTime.set(time, bucket);
  }

  return input.bars.flatMap(bar => {
    const matches = byTime.get(Number(bar.time)) ?? [];
    return matches.length === 1 ? matches : [];
  });
}
