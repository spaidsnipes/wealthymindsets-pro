/**
 * DXLink — the frames WM Pro sends, and the 15-second candles it builds.
 *
 * tastytrade streams real-time market data over DXLink, a JSON protocol on a
 * WebSocket at the `dxlink-url` returned by `GET /api-quote-tokens`
 * (`wss://tasty-openapi-ws.dxfeed.com/realtime`). This module owns the frame
 * shapes and the candle math. It opens no socket, reads no secret, and imports
 * nothing — so every claim below is testable on a laptop with no credentials.
 *
 * ── PROVENANCE, PER FRAME ──────────────────────────────────────────────────
 *
 * Every frame builder here was transcribed from tastytrade's own guide
 * (developer.tastytrade.com/docs/guides/stream-market-data), which publishes
 * each one as a verbatim JSON example. Nothing is inferred.
 *
 * One thing is DELIBERATELY ABSENT: a Candle-event subscription. dxFeed does
 * expose a Candle event, and the obvious guess is a symbol-attribute syntax
 * like `AAPL{=15s}`. That syntax appears NOWHERE in tastytrade's guide, and a
 * guessed subscription that silently returns nothing is indistinguishable from
 * an entitlement denial — the precise confusion that cost this project three
 * months on Webull (docs/operations/EVIDENCE_2026-09-20_WEBULL_ENTITLEMENT_ISOLATED.md).
 *
 * So WM Pro builds its 15-second candles from `Trade` events, whose field list
 * IS published verbatim. Aggregating ticks we can see beats subscribing to a
 * frame shape we invented. If the Candle subscription is later confirmed
 * against a live socket, it can be added here WITH its receipt.
 *
 * ── WHAT A CANDLE FROM THIS MODULE MEANS ───────────────────────────────────
 *
 * It means: these are the trades WM Pro OBSERVED in that 15-second window on
 * this connection. It does NOT mean the window is complete. A bar built from
 * a stream that was connected for 4 of 15 seconds is a different object from
 * one built from all 15, and `coverage` carries that difference rather than
 * letting both render as the same candle.
 *
 * This matters more here than usual. Cloudflare evicts a Durable Object
 * holding an OUTBOUND WebSocket after about 15 minutes, and hibernation does
 * not apply to outbound connections — so reconnect seams are a designed-in
 * certainty on this host, not an anomaly. A seam that prints as an ordinary
 * candle is a lie with a timestamp on it.
 *
 * ── AND WHY IT IS A CanonicalBar AND NOT A `Candle` ────────────────────────
 *
 * The first draft of this module declared its own `Candle` interface with its
 * own open/high/low/close, and `canonicalBarAdoption.sentinel.test.ts` refused
 * it on sight: "two modules that each decide what a bar is can hold a different
 * 09:31 for the same symbol and neither is wrong by its own lights." The M8
 * census holds at four private pasts and may only SHRINK. A fifth would have
 * been free to write and would have quietly extended a migration in flight.
 *
 * So this ingress mints `CanonicalBar` — the third in this repo to do so, after
 * Yahoo and the crypto exchanges. The genuinely NEW information, coverage,
 * lands in two places rather than inside the bar:
 *
 *   1. `fidelity`. A partially-observed window is a bar "admitted with a known
 *      wound", which is `DEGRADED` in the fidelity algebra's own words. The
 *      house already knows how to paint a DEGRADED bar with the wound visible;
 *      a private `coverage` field on the bar would have needed every renderer
 *      taught the same lesson a second time.
 *   2. `ObservedWindow.coverage`, a SIDECAR beside the bar — the same pattern
 *      `CanonicalBarIdentity` uses. It keeps the exact word, plus the trade
 *      count, for a surface that wants to say WHY the bar is dimmed.
 *
 * `canonicalBar.ts`'s "no derived field lives here" rule points the same way:
 * an invention computes from bars, it does not stash its answer inside one.
 */

import {
  BAR_PROVENANCES,
  SESSION_UNKNOWN,
  admitBar,
  mintBarId,
  type CanonicalBar,
} from "./canonicalBar";
import { MARKET_FIDELITIES } from "./marketFidelityAlgebra";

/** The channel DXLink reserves for connection-level frames. */
export const DXLINK_CONTROL_CHANNEL = 0;

/** The virtual sub-connection WM Pro opens for market-data subscriptions. */
export const DXLINK_FEED_CHANNEL = 3;

export interface DxlinkFrame {
  readonly type: string;
  readonly channel: number;
  readonly [key: string]: unknown;
}

/** First frame on the wire. Negotiates protocol version and keepalive. */
export function buildSetupFrame(): DxlinkFrame {
  return {
    type: "SETUP",
    channel: DXLINK_CONTROL_CHANNEL,
    version: "0.1-DXF-JS/0.3.0",
    keepaliveTimeout: 60,
    acceptKeepaliveTimeout: 60,
  };
}

/**
 * Sent only after DXLink answers AUTH_STATE / UNAUTHORIZED.
 *
 * The token is the short-lived API quote token from `GET /api-quote-tokens`
 * (24h expiry), never an OAuth secret. It is passed in and never stored here.
 */
export function buildAuthFrame(apiQuoteToken: string): DxlinkFrame {
  return { type: "AUTH", channel: DXLINK_CONTROL_CHANNEL, token: apiQuoteToken };
}

/** Opens the virtual sub-connection that carries feed traffic. */
export function buildChannelRequestFrame(): DxlinkFrame {
  return {
    type: "CHANNEL_REQUEST",
    channel: DXLINK_FEED_CHANNEL,
    service: "FEED",
    parameters: { contract: "AUTO" },
  };
}

/**
 * Declares which fields we want per event type. COMPACT means events arrive as
 * positional arrays in the order named here — which is why the field order in
 * this frame IS the decoder's contract, and why `TRADE_FIELDS` below is the
 * single owner of it rather than a second list written out by hand.
 */
export const TRADE_FIELDS = ["eventType", "eventSymbol", "price", "dayVolume", "size"] as const;
export const QUOTE_FIELDS = ["eventType", "eventSymbol", "bidPrice", "askPrice", "bidSize", "askSize"] as const;

export function buildFeedSetupFrame(): DxlinkFrame {
  return {
    type: "FEED_SETUP",
    channel: DXLINK_FEED_CHANNEL,
    acceptAggregationPeriod: 0.1,
    acceptDataFormat: "COMPACT",
    acceptEventFields: {
      Trade: [...TRADE_FIELDS],
      Quote: [...QUOTE_FIELDS],
    },
  };
}

/** Subscribe to Trade + Quote for a set of symbols in one frame. */
export function buildSubscriptionFrame(symbols: readonly string[], reset = true): DxlinkFrame {
  const clean = Array.from(new Set(symbols.map((s) => s.trim()).filter(Boolean)));
  return {
    type: "FEED_SUBSCRIPTION",
    channel: DXLINK_FEED_CHANNEL,
    reset,
    add: clean.flatMap((symbol) => [
      { type: "Trade", symbol },
      { type: "Quote", symbol },
    ]),
  };
}

/** Held open by a KEEPALIVE on the control channel roughly every 30 seconds. */
export function buildKeepaliveFrame(): DxlinkFrame {
  return { type: "KEEPALIVE", channel: DXLINK_CONTROL_CHANNEL };
}

// ── Candles ────────────────────────────────────────────────────────────────

/** One print off the wire, as WM Pro saw it. */
export interface ObservedTrade {
  readonly symbol: string;
  /** Milliseconds since epoch, as observed by WM Pro on receipt. */
  readonly atMs: number;
  readonly price: number;
  readonly size: number;
}

/**
 * Did observation cover the whole window?
 *
 *   FULL     the stream was connected for the entire window.
 *   PARTIAL  the stream joined or left mid-window. Real trades, incomplete bar.
 *
 * This is a statement about OUR CONNECTION, not about the market, and that is
 * why it is not a fidelity by itself — it is the REASON for one. See
 * `coverageFidelity` below.
 */
export type CandleCoverage = "FULL" | "PARTIAL";

/**
 * A canonical bar, plus what this module knows about how it was observed.
 *
 * The sidecar shape, not a second bar shape. It deliberately declares no
 * open/high/low/close of its own — those live on `bar`, exactly once, under the
 * artery's names. See the module header for why the first draft's `Candle`
 * interface was withdrawn.
 */
export interface ObservedWindow {
  readonly bar: CanonicalBar;
  readonly coverage: CandleCoverage;
  /** How many prints went into it. One tick and four hundred are not the same
   *  evidence, and `volume` alone cannot tell them apart. */
  readonly trades: number;
}

/** A window that produced prints but could not become a bar, and why. */
export interface ObservedWindowRefusal {
  readonly symbol: string;
  readonly openTimeMs: number;
  readonly reason: string;
}

export interface DxlinkCandleResult {
  readonly windows: readonly ObservedWindow[];
  /** Kept, not swallowed. A dropped bar reads as a quiet market, and a quiet
   *  market is a claim about the venue that a refusal never makes. */
  readonly refusals: readonly ObservedWindowRefusal[];
}

/**
 * The instrument identity, venue-prefixed for the same reason
 * `exchangeCandleIngress.ts` prefixes its coins: `mintBarId` keys on
 * `symbolId|timeframe|asOf|epoch`, and a bare "AAPL" from this stream would
 * mint the SAME id as a bare "AAPL" from any other ingress — so `admitBar`
 * would refuse one real bar as a redelivery of an unrelated one.
 *
 * Returns "" for a blank symbol rather than the truthy "TASTYTRADE:", which
 * would smuggle emptiness past the check written to catch it.
 */
export function dxlinkSymbolId(symbol: string): string {
  const s = symbol.trim();
  return s === "" ? "" : `TASTYTRADE:${s}`;
}

export interface AggregateWindow {
  /** When this connection began observing. Windows straddling it are PARTIAL. */
  readonly observingSinceMs: number;
  /** When observation stopped, if it has. Windows straddling it are PARTIAL. */
  readonly observingUntilMs?: number;
  /** When WE heard, epoch ms. Never an ordering authority. */
  readonly receivedAt?: number;
  readonly truthEpoch?: number;
}

export const DEFAULT_CANDLE_PERIOD_SECONDS = 15;

/** Floor a timestamp to the start of its candle window. */
export function candleOpenTimeMs(atMs: number, periodSeconds: number): number {
  const ms = periodSeconds * 1000;
  return Math.floor(atMs / ms) * ms;
}

/**
 * Coverage, translated into the fidelity algebra the rest of the house speaks.
 *
 * PARTIAL coverage is `DEGRADED` — "admitted with a known wound. Paint with the
 * wound visible" — and NOT `MARKET_FIDELITIES.PARTIAL`, which means something
 * else entirely: "bar exists; some ATTACHMENTS missing." Nothing is missing
 * from a seam bar's attachments; the wound is in the observation itself. The
 * two words being spelled the same is exactly the kind of collision worth
 * stating out loud rather than letting a reader assume.
 *
 * Neither branch is ever EXECUTABLE. `admitBar` would refuse that anyway on a
 * bar with an unknown session, but the refusal is stated here rather than
 * inherited, because inheriting it would mean this module never had to decide.
 */
export function coverageFidelity(coverage: CandleCoverage) {
  return coverage === "FULL" ? MARKET_FIDELITIES.INDICATIVE : MARKET_FIDELITIES.DEGRADED;
}

/**
 * Build canonical bars from observed trades.
 *
 * Deliberately NOT emitting empty bars for windows with no trades. A window
 * with no trades and a window we were disconnected for are different facts, and
 * a zero-volume bar printed for both would erase the difference. Gaps are the
 * caller's to explain with `observingSince/Until`, which it actually knows.
 *
 * `provenance` is DERIVED, not LIVE_STREAM, and the distinction is load-bearing.
 * The TRADES arrived live; the BAR is something WM Pro assembled out of them.
 * No venue ever printed this 15-second candle, and claiming LIVE_STREAM would
 * assert that one did.
 */
export function aggregateCandles(
  trades: readonly ObservedTrade[],
  window: AggregateWindow,
  periodSeconds: number = DEFAULT_CANDLE_PERIOD_SECONDS,
): DxlinkCandleResult {
  if (periodSeconds <= 0) throw new Error("candle period must be a positive number of seconds");

  const byKey = new Map<string, { symbol: string; openTimeMs: number; trades: ObservedTrade[] }>();
  for (const t of trades) {
    if (!Number.isFinite(t.price) || !Number.isFinite(t.atMs)) continue;
    const openTimeMs = candleOpenTimeMs(t.atMs, periodSeconds);
    const key = `${t.symbol} ${openTimeMs}`;
    const bucket = byKey.get(key) ?? { symbol: t.symbol, openTimeMs, trades: [] };
    bucket.trades.push(t);
    byKey.set(key, bucket);
  }

  const periodMs = periodSeconds * 1000;
  const timeframe = `${periodSeconds}s`;
  const truthEpoch = window.truthEpoch ?? 0;
  const receivedAt = window.receivedAt ?? 0;

  const windows: ObservedWindow[] = [];
  const refusals: ObservedWindowRefusal[] = [];

  for (const bucket of byKey.values()) {
    const ordered = [...bucket.trades].sort((a, b) => a.atMs - b.atMs);
    const prices = ordered.map((t) => t.price);
    const closeTimeMs = bucket.openTimeMs + periodMs;
    // A window is only FULL if observation covered it end to end.
    const joinedLate = window.observingSinceMs > bucket.openTimeMs;
    const leftEarly = window.observingUntilMs !== undefined && window.observingUntilMs < closeTimeMs;
    const coverage: CandleCoverage = joinedLate || leftEarly ? "PARTIAL" : "FULL";

    const symbolId = dxlinkSymbolId(bucket.symbol);
    const barId = mintBarId({ symbolId, timeframe, asOf: bucket.openTimeMs, truthEpoch });
    if (barId === null) {
      refusals.push({
        symbol: bucket.symbol,
        openTimeMs: bucket.openTimeMs,
        reason: "A bar with no symbol has no identity to mint, so it is not on the chart.",
      });
      continue;
    }

    const incoming: CanonicalBar = {
      barId,
      symbolId,
      // Ignorance, stated. The Trade event fields WM Pro subscribes to carry no
      // session, so this ingress genuinely does not know whether a print landed
      // inside RTH. Not SESSION_CONTINUOUS — US equities plainly have sessions.
      sessionId: SESSION_UNKNOWN,
      timeframe,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      // Summed size of the prints OBSERVED. On a PARTIAL window this is less
      // than the venue's figure by construction, which is what `coverage` and
      // the DEGRADED fidelity are there to say.
      volume: ordered.reduce((sum, t) => sum + (Number.isFinite(t.size) ? t.size : 0), 0),
      asOf: bucket.openTimeMs,
      receivedAt,
      fidelity: coverageFidelity(coverage),
      source: "tastytrade",
      provenance: BAR_PROVENANCES.DERIVED,
      truthEpoch,
    };

    const verdict = admitBar(null, incoming);
    if (!verdict.admitted) {
      refusals.push({ symbol: bucket.symbol, openTimeMs: bucket.openTimeMs, reason: verdict.reason });
      continue;
    }
    windows.push({ bar: verdict.bar, coverage, trades: ordered.length });
  }

  windows.sort((a, b) => a.bar.asOf - b.bar.asOf || a.bar.symbolId.localeCompare(b.bar.symbolId));
  return { windows, refusals };
}
