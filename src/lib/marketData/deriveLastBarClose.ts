import type { OHLCVBar } from "../pine/types";
import { parseTimeframeMs } from "../experience/marketFieldFreshness";

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
 * ── THE SECOND DEFECT: A BAR THAT HAS NOT CLOSED HAS NO CLOSE ─────────
 * Observed live on /charts 2026-09-15, NQ1! 1h, 10:34:19Z:
 *
 *   chart header  :  O 29355.75  H 29355.75  L 29355.75  C 29355.75  V 0
 *                    (countdown 0:24:43 to bar close)
 *   MARKET tile   :  NQ1! · 1h · 29355.75 LAST 1h BAR CLOSE
 *
 * Zero range and zero volume with a running countdown is the signature of a
 * bar that OPENED at 10:00Z and has not yet taken a single trade. Its "close"
 * is just the seed it was born with. Naming that a BAR CLOSE is a fabricated
 * provenance claim of exactly the kind this file exists to refuse — and the
 * number can be arbitrarily stale, because nothing has traded into it.
 *
 * So the newest bar is no longer automatically the answer. We name the newest
 * bar that has PROVABLY CLOSED, by two independent proofs:
 *
 *   1. A strictly NEWER bar exists. Then this one ended — no clock required.
 *      This proof is total: it needs no timeframe parsing and cannot be fooled
 *      by a wrong clock or a mislabelled interval.
 *   2. Otherwise, for the newest bar only: barOpen + one interval <= now.
 *      This needs both a parseable timeframe and a caller-supplied clock. When
 *      either is missing we do NOT guess — we fall back to proof 1 and name
 *      the bar before it.
 *
 * The degradation is deliberately conservative: naming an older, genuinely
 * closed bar understates freshness by at most one bar, while naming a forming
 * bar publishes a close that never happened. Given a choice between those two,
 * §35 PROTECTED TRUTH picks the first every time.
 */

/**
 * Pure. Returns null — never a guess — whenever the evidence is not good
 * enough to name a bar close.
 *
 * `OHLCVBar.time` is in SECONDS (the lightweight-charts convention that
 * `liveBarPolicy.applyTickToLiveBar` also emits), so it is converted here
 * exactly once. Every other field in canonical market state is milliseconds;
 * leaking a seconds value into it would read as 1970.
 *
 * `nowMs` is the caller's captured clock. It is OPTIONAL because a pure
 * selector must never reach for `Date.now()` itself — a hidden clock is how a
 * function stops being testable. Omitting it costs at most one bar of
 * freshness; it can never cause an overclaim.
 */
export function deriveLastBarClose(
  bars: readonly OHLCVBar[] | null | undefined,
  timeframe: string | null | undefined,
  nowMs?: number | null,
): LastBarCloseEvidence | null {
  if (!bars || bars.length === 0) return null;
  const tf = typeof timeframe === "string" ? timeframe.trim() : "";
  if (!tf) return null;

  // Do NOT assume the array is sorted. A close attributed to the wrong bar is
  // a fabricated timestamp even when the number happens to be right.
  let newest: OHLCVBar | null = null;
  let runnerUp: OHLCVBar | null = null;
  for (const bar of bars) {
    if (!bar) continue;
    if (!Number.isFinite(bar.close) || bar.close <= 0) continue;
    if (!Number.isFinite(bar.time) || bar.time <= 0) continue;
    if (newest === null || bar.time > newest.time) {
      runnerUp = newest;
      newest = bar;
    } else if (bar.time < newest.time && (runnerUp === null || bar.time > runnerUp.time)) {
      runnerUp = bar;
    }
  }
  if (newest === null) return null;

  // PROOF 2 — can we show the newest bar's interval has fully elapsed?
  const intervalMs = parseTimeframeMs(tf);
  const clockOk = typeof nowMs === "number" && Number.isFinite(nowMs) && nowMs > 0;
  const newestClosed =
    intervalMs !== null && clockOk
      ? Math.round(newest.time * 1000) + intervalMs <= (nowMs as number)
      : false;

  // PROOF 1 — the bar before the newest is closed by the mere existence of a
  // newer one. Used whenever proof 2 could not be established.
  const chosen = newestClosed ? newest : runnerUp;
  if (chosen === null) return null;

  return {
    close: chosen.close,
    barOpenedAtMs: Math.round(chosen.time * 1000),
    timeframe: tf,
  };
}
