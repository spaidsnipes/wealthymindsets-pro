export interface DomLevel {
  price: number;
  bidSize: number;
  askSize: number;
  isWall: boolean;
  isBid: boolean;
}

/** Builds a bounded, spread-adjacent ladder from observed book levels. */
export function buildObservedDom(
  bids: { price: number; size: number }[],
  asks: { price: number; size: number }[],
  dp: number,
): DomLevel[] {
  const out: DomLevel[] = [];
  const maxBid = bids.length > 0 ? Math.max(...bids.map(bid => bid.size)) : 1;
  const maxAsk = asks.length > 0 ? Math.max(...asks.map(ask => ask.size)) : 1;
  const wallThreshold = Math.max(maxBid, maxAsk) * 0.6;

  const sortedAsks = [...asks]
    .sort((a, b) => a.price - b.price)
    .slice(0, 12)
    .reverse();
  for (const ask of sortedAsks) {
    out.push({
      price: +ask.price.toFixed(dp),
      bidSize: 0,
      askSize: Math.round(ask.size * 100) / 100,
      isWall: ask.size >= wallThreshold,
      isBid: false,
    });
  }

  const sortedBids = [...bids].sort((a, b) => b.price - a.price).slice(0, 12);
  for (const bid of sortedBids) {
    out.push({
      price: +bid.price.toFixed(dp),
      bidSize: Math.round(bid.size * 100) / 100,
      askSize: 0,
      isWall: bid.size >= wallThreshold,
      isBid: true,
    });
  }
  return out;
}

/** A populated observed ladder owns its headline; stale seeds cannot override it. */
export function deriveDomCenter(levels: readonly DomLevel[], fallback: number): number {
  const bids = levels.filter(level => level.isBid).map(level => level.price);
  const asks = levels.filter(level => !level.isBid).map(level => level.price);
  const bestBid = bids.length ? Math.max(...bids) : null;
  const bestAsk = asks.length ? Math.min(...asks) : null;
  if (bestBid != null && bestAsk != null) return (bestBid + bestAsk) / 2;
  if (bestBid != null) return bestBid;
  if (bestAsk != null) return bestAsk;
  return fallback;
}
