/**
 * SCANNER ROWS WEAR THE LIVE LANE WHEN IT IS SPEAKING — Garden 18 §LIV,
 * §LXXXI, §LXXXIX. The scan round reads a consolidated DELAYED quote; the
 * same symbols print live on /charts, the watchlist and the tape through the
 * tastytrade watch lane (light quotes, visible rows only). When that lane has
 * a fresh price for a row, the row shows it — one truth, many surfaces — and
 * its change is re-based on the row's OWN reference close (the delayed price
 * ÷ (1 + its change)). No fresh live price: the row keeps its honest state.
 * PURE.
 */
export interface ScannerLive { readonly price: number; readonly at: number }
export interface ScannerLiveRead {
  readonly price: number;
  readonly priceText: string;
  readonly changePct: number | null;
  readonly changeText: string | null;
  readonly title: string;
}

export function scannerLiveQuote(
  row: { readonly price: number | null | undefined; readonly changePct: number | null | undefined },
  live: ScannerLive | undefined,
  nowMs: number,
  freshMs: number,
): ScannerLiveRead | null {
  if (!live || !(live.price > 0) || nowMs - live.at >= freshMs) return null;
  const ref = row.price != null && row.price > 0 && row.changePct != null && Number.isFinite(row.changePct)
    ? row.price / (1 + row.changePct / 100) : null;
  const changePct = ref != null && ref > 0 ? ((live.price - ref) / ref) * 100 : null;
  return {
    price: live.price,
    priceText: `$${live.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    changePct,
    changeText: changePct == null ? null : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`,
    title: `Live — tastytrade, ${Math.max(0, Math.round((nowMs - live.at) / 1000))}s ago. The same lane the chart, watchlist and tape read.`,
  };
}
