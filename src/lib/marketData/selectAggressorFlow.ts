/**
 * selectAggressorFlow — pure aggressor-flow computation over a tick
 * stream. Extracts SmartMoneyPanel's inline math into a canonical,
 * testable, reusable selector.
 *
 * Given the recent per-trade ticks (with `side` = buy/sell and `size`),
 * returns:
 *
 *   askVol   — total aggressor-buy volume (buyer lifted the ask)
 *   bidVol   — total aggressor-sell volume (seller hit the bid)
 *   cvd      — cumulative volume delta = askVol - bidVol (signed)
 *   vwap     — volume-weighted average price (falls back to livePrice)
 *   hasFlow  — real aggressor volume was observed (askVol+bidVol > 0)
 *   haveData — at least one valid tick was seen
 *   imbRatio — ratio of dominant side to weaker side, ×100
 *   askDom   — askVol ≥ bidVol
 *
 * PURE — no I/O, no clock. Ticks with size ≤ 0 / price ≤ 0 /
 * missing / non-trade are filtered out (canon §Silence: never
 * fabricate volume).
 */

export interface AggressorTick {
  readonly side?: "buy" | "sell" | null | undefined;
  readonly size?: number | null | undefined;
  readonly price?: number | null | undefined;
  readonly trade?: boolean;
}

export interface AggressorFlowSnapshot {
  readonly haveData: boolean;
  readonly hasFlow: boolean;
  readonly askVol: number;
  readonly bidVol: number;
  readonly cvd: number;
  readonly vwap: number;
  readonly imbRatio: number;
  readonly askDom: boolean;
}

/**
 * Compute the snapshot. Empty / all-invalid ticks return a zeroed
 * snapshot with vwap set to `livePrice` fallback.
 */
export function selectAggressorFlow(
  ticks: readonly AggressorTick[] | null | undefined,
  livePrice: number = 0,
): AggressorFlowSnapshot {
  const empty: AggressorFlowSnapshot = {
    haveData: false,
    hasFlow: false,
    askVol: 0,
    bidVol: 0,
    cvd: 0,
    vwap: livePrice > 0 ? livePrice : 0,
    imbRatio: 100,
    askDom: true,
  };
  if (!ticks || !Array.isArray(ticks) || ticks.length === 0) return empty;

  let askVol = 0;
  let bidVol = 0;
  let pv = 0;
  let vol = 0;
  let sawTick = false;

  for (const t of ticks) {
    if (!t || t.trade !== true) continue;
    const size = Number(t.size) || 0;
    const price = Number(t.price) || 0;
    if (size <= 0 || price <= 0) continue;
    sawTick = true;
    if (t.side === "buy") askVol += size;
    else bidVol += size;
    pv += price * size;
    vol += size;
  }

  const cvd = askVol - bidVol;
  const vwap = vol > 0 ? pv / vol : livePrice > 0 ? livePrice : 0;
  const hi = Math.max(askVol, bidVol);
  const lo = Math.min(askVol, bidVol);
  const imbRatio = lo > 0 ? (hi / lo) * 100 : hi > 0 ? 300 : 100;

  return {
    haveData: sawTick,
    hasFlow: askVol + bidVol > 0,
    askVol,
    bidVol,
    cvd,
    vwap,
    imbRatio,
    askDom: askVol >= bidVol,
  };
}
