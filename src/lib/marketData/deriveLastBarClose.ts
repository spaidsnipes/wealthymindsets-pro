import type { OHLCVBar } from "../pine/types";

/**
 * LAST VERIFIED BAR CLOSE — a second, explicitly-labelled price owner.
 *
 * ── THE DEFECT THIS EXISTS TO CLOSE ───────────────────────────────────
 * Observed live on /charts in ONE viewport at ONE moment:
 *
 *   chart header  :  7,622.25  —  (change unavailable)  HISTORICAL BARS VERIFIED
 *   MARKET tile   :  ES1! · 1h · PRICE UNKNOWN · UNAVAILABLE · asOf 04:38:36Z
 *
 * Both statements are individually defensible. The tile is truthful that no
 * LIVE trade print exists with the cash session closed. The header is truthful
 * that the last loaded candle closed at 7,622.25. But side by side they force
 * the trader to reconcile two owners in their head — SCENE_FRAGMENTATION in
 * the TRUTH dimension. Understating knowledge is a truth defect in the same
 * family as overclaiming it.
 *
 * ── WHY A SEPARATE FIELD AND NOT `price.last` ─────────────────────────
 * `price.last` means "a live trade printed at this price, and we hold the
 * timestamped tick that proves it." `chartMarketStatePublisher` only fills it
 * when a per-trade tick MATCHES the displayed ticker price, and that
 * strictness is correct — it is what keeps a seeded or quote-derived number
 * from being sold as a print. Widening it would silently demote the guarantee
 * every existing consumer already relies on.
 *
 * So a bar close gets its OWN field with its OWN provenance word. A consumer
 * that wants a print still gets null; a consumer that can honestly render
 * "last bar close" now has something to render instead of PRICE UNKNOWN.
 *
 * ── WHY THE INPUT IS BARS AND NOT `ticker.price` ──────────────────────
 * `MarketState.ticker.price` is NOT provably bar-derived. It can come from a
 * REST quote, from a tick, or — before any provider resolves — from the
 * `SYMBOL_SEEDS` table in useWebSocket.ts. Publishing that as a "verified bar
 * close" would fabricate provenance, which §35 PROTECTED TRUTH forbids
 * outright. The candle array that MainChart hands up through `onBarsReady` is
 * the only input here that actually came from loaded bars.
 */
export interface LastBarCloseEvidence {
  /** Close of the newest loaded bar. Always finite and > 0. */
  readonly close: number;
  /** Bar-open epoch in MILLISECONDS. */
  readonly barOpenedAtMs: number;
  /** The timeframe the bar belongs to. A close is meaningless without it. */
  readonly timeframe: string;
}

/**
 * Pure. Returns null — never a guess — whenever the evidence is not good
 * enough to name a bar close.
 *
 * `OHLCVBar.time` is in SECONDS (the lightweight-charts convention that
 * `liveBarPolicy.applyTickToLiveBar` also emits), so it is converted here
 * exactly once. Every other field in canonical market state is milliseconds;
 * leaking a seconds value into it would read as 1970.
 */
export function deriveLastBarClose(
  bars: readonly OHLCVBar[] | null | undefined,
  timeframe: string | null | undefined,
): LastBarCloseEvidence | null {
  if (!bars || bars.length === 0) return null;
  const tf = typeof timeframe === "string" ? timeframe.trim() : "";
  if (!tf) return null;

  // Do NOT assume the array is sorted. A close attributed to the wrong bar is
  // a fabricated timestamp even when the number happens to be right.
  let newest: OHLCVBar | null = null;
  for (const bar of bars) {
    if (!bar) continue;
    if (!Number.isFinite(bar.close) || bar.close <= 0) continue;
    if (!Number.isFinite(bar.time) || bar.time <= 0) continue;
    if (newest === null || bar.time > newest.time) newest = bar;
  }
  if (newest === null) return null;

  return {
    close: newest.close,
    barOpenedAtMs: Math.round(newest.time * 1000),
    timeframe: tf,
  };
}
