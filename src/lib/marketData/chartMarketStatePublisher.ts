import { useEffect } from "react";
import type { MarketState, Tick } from "../../hooks/useWebSocket";
import { priceSourceBadge, REST_QUOTE_SOURCES } from "../priceSource";
import { publishCanonicalMarketState } from "./publishCanonicalMarketState";
import {
  getSessionNectarSnapshot,
  type SessionNectarSnapshot,
} from "./sessionNectar";
import type { ProduceMarketStateInput } from "./produceCanonicalMarketState";
import type { MarketQualityState } from "./canonicalMarketState";
import {
  canonicalAssetClass,
  canonicalInstrumentId,
  canonicalSession,
  type CanonicalAssetClass,
} from "./canonicalIdentity";
import { deriveOrderFlowDimension } from "./deriveOrderFlowDimension";
import { deriveVolatilityDimension } from "./deriveVolatilityDimension";
import { deriveDirectionDimension, countTradeTicks } from "./deriveDirectionDimension";
import { deriveRegimeDimension } from "./deriveRegimeDimension";
import { deriveLastBarClose } from "./deriveLastBarClose";
import type { OHLCVBar } from "../pine/types";

export interface ChartMarketStatePublicationInput {
  readonly symbol: string;
  readonly timeframe: string;
  readonly session: string;
  readonly ticker: MarketState["ticker"];
  readonly recentTicks: readonly Tick[];
  readonly source: MarketState["source"];
  readonly connected: boolean;
  readonly capturedAt: number;
  readonly nectar: SessionNectarSnapshot;
  /**
   * The candle array the chart actually loaded, straight from MainChart's
   * `onBarsReady`. Optional so /command-deck (which owns no bars) is
   * untouched. This is the ONLY admissible source for a bar close —
   * `ticker.price` can be a REST quote or a SYMBOL_SEEDS fallback.
   */
  readonly bars?: readonly OHLCVBar[] | null;
}

// Asset class + instrument id + session all delegate to the single canonical
// helper module so producer/consumer identities cannot drift (b46fa64 class of
// P0). If you find yourself reaching for a local inference here, extend
// canonicalIdentity.ts and add a contract test instead.
function assetClassFor(symbol: string): CanonicalAssetClass {
  return canonicalAssetClass(symbol);
}

function executableIdentityFor(symbol: string, assetClass: CanonicalAssetClass): string | null {
  // Futures have no executable identity in the current WM contract (kept to
  // preserve historical null-check callers). Everything else routes through
  // the canonical helper so 'BTC' → 'BTC-USD' and equities uppercase.
  if (assetClass === "futures") return null;
  return canonicalInstrumentId(symbol, assetClass);
}

function qualityFor(
  source: MarketState["source"],
  connected: boolean,
  hasCanonicalPrice: boolean,
  tapeFresh: boolean,
): MarketQualityState {
  // A per-trade-tape recency window is only a freshness receipt for sources
  // that actually carry a per-trade tape. Handing `fresh: false` to a
  // REST-quote provider (yahoo / finnhub) short-circuits priceSourceBadge to
  // STALE PIPELINE, which is how /command-deck came to render "! STALE" for
  // NQ1! at the same instant the ticker tape 300px above it — grading the
  // SAME quote through the SAME function, but supplying no freshness field —
  // rendered ACTIVE DEGRADED. Canon Weakness #1 (multi-fidelity disagreement
  // on one page), sourced not to the evidence but to WHO ASKED.
  //
  // `undefined` is the documented "not established" value for
  // PriceObservationEvidence.fresh, and it lets the provider arm return the
  // honest ACTIVE DEGRADED -> PARTIAL verdict below.
  const fresh = REST_QUOTE_SOURCES.has(source) ? undefined : tapeFresh;
  const badge = priceSourceBadge(source, connected, undefined, {present: hasCanonicalPrice, fresh});
  if (badge.availability === "unavailable") return "UNAVAILABLE";
  if (badge.live) return hasCanonicalPrice ? "LIVE" : "PARTIAL";
  if (badge.label === "STALE PIPELINE") return "STALE";
  if (badge.label.startsWith("DELAYED")) return "DELAYED";
  // ACTIVE DEGRADED means a usable observation exists but its realtime
  // fidelity is not certified. The canonical state vocabulary represents
  // that as PARTIAL, never UNAVAILABLE and never entitlement-delayed.
  if (badge.label === "ACTIVE DEGRADED") return hasCanonicalPrice ? "PARTIAL" : "UNAVAILABLE";
  return "UNAVAILABLE";
}

function matchingPriceTick(tickerPrice: number, ticks: readonly Tick[], capturedAt: number): Tick | null {
  if (!Number.isFinite(tickerPrice) || tickerPrice <= 0) return null;
  const tolerance = Math.max(Math.abs(tickerPrice) * 1e-8, 1e-8);
  return ticks
    .filter(tick => Number.isFinite(tick.time) && tick.time > 0 && tick.time <= capturedAt && Math.abs(tick.price - tickerPrice) <= tolerance)
    .sort((a, b) => b.time - a.time)[0] ?? null;
}

/** Pure chart-runtime adapter. It never invents analytical dimensions. */
export function createChartMarketStatePublication(
  input: ChartMarketStatePublicationInput,
): { state: ProduceMarketStateInput; qualityState: MarketQualityState } {
  const normalizedSymbol = input.symbol.trim().toUpperCase();
  const assetClass = assetClassFor(normalizedSymbol);
  const priceTick = matchingPriceTick(input.ticker.price, input.recentTicks, input.capturedAt);
  const hasCanonicalPrice = priceTick != null;
  const coverage = input.nectar.channels.filter(channel =>
    channel.normalizedSymbol?.toUpperCase() === normalizedSymbol ||
    channel.instrumentId.toUpperCase() === normalizedSymbol ||
    channel.instrumentId.toUpperCase() === executableIdentityFor(normalizedSymbol, assetClass)
  );
  const qualityState = qualityFor(input.source, input.connected, hasCanonicalPrice,
    priceTick != null && input.capturedAt - priceTick.time < 20_000);

  const eventAt = priceTick?.time ?? null;
  const coverageVersion = input.nectar.updatedAt ?? input.nectar.startedAt;
  const snapshotId = [
    "chart",
    normalizedSymbol,
    input.session,
    input.timeframe,
    eventAt ?? "no-price",
    coverageVersion,
    input.capturedAt,
  ].join(":");

  // Real from-USE fix: seal an orderFlow dimension from the very same
  // per-trade ticks that the OrderFlowCockpitStrip renders. Without this
  // the Passport ORDER FLOW node always read "UNRESOLVED — No verified
  // evidence supplied at snapshot time." while the strip one row above
  // showed live aggressor volumes. The pure derivation self-degrades to
  // UNKNOWN on thin tape so nothing gets fabricated.
  const latestTickAtMs = input.recentTicks.reduce(
    (mx, t) => (Number.isFinite(t.time) && t.time > 0 ? Math.max(mx, t.time) : mx),
    0,
  );
  const orderFlow = deriveOrderFlowDimension({
    ticks: input.recentTicks,
    livePrice: input.ticker.price,
    source: typeof input.source === "string" ? input.source : null,
    latestTickAtMs: latestTickAtMs > 0 ? latestTickAtMs : null,
    capturedAt: input.capturedAt,
    snapshotIdSeed: snapshotId,
  });
  const volatility = deriveVolatilityDimension({
    ticks: input.recentTicks,
    source: typeof input.source === "string" ? input.source : null,
    latestTickAtMs: latestTickAtMs > 0 ? latestTickAtMs : null,
    capturedAt: input.capturedAt,
    snapshotIdSeed: snapshotId,
  });
  // DIRECTION — the dimension the Founder actually reads first, because it is
  // the word rendered in the largest type on /command-deck. It was hard-coded
  // unresolved below for as long as this file has existed, so the deck hero
  // said "UNKNOWN" even while the same tape it was already rendering carried
  // a net-drift read. The derivation self-degrades to PARTIAL on thin or
  // two-sided tape — chop is not a direction — so nothing is fabricated.
  const direction = deriveDirectionDimension({
    ticks: input.recentTicks,
    source: typeof input.source === "string" ? input.source : null,
    latestTickAtMs: latestTickAtMs > 0 ? latestTickAtMs : null,
    capturedAt: input.capturedAt,
    snapshotIdSeed: snapshotId,
  });

  // REGIME — pure composition of the two dimensions sealed above. It mints no
  // new evidence because it made no new observation. This is the dimension the
  // whole hero hangs on: every cheap selectMarketStory chapter guard (BALANCE,
  // TREND_EXPANSION, ROTATION) reads state.regime, so while regime was
  // hard-coded unresolved the story engine could never support a chapter and
  // /command-deck printed "UNKNOWN" in its largest type for every symbol.
  const regime = deriveRegimeDimension({
    direction,
    volatility,
    tradeCount: countTradeTicks(input.recentTicks),
  });

  // ONE UNKNOWN PER UNRESOLVED DIMENSION.
  //
  // Real from-USE defect (2026-09-03): this previously emitted a single
  // COMPOUND sentence naming all eight dimensions. Every consumer that counts
  // `state.unknowns.length` therefore read 1, while the Passport counted 8
  // dimensions and the decision chain counted 9 nodes — /command-deck showed
  // "1 missing", "MISSING (1)", "0/8 resolved" and "9 unknown" for the SAME
  // snapshot. Four numbers, one truth (LIVING-PIXEL LAW + single-writer canon).
  //
  // Canon grammar: Visual Systems Execution Canon Asset 07 — evidence debt is
  // a LEDGER of individually payable questions, not one lump narrative.
  const unresolvedDimensions: readonly string[] = [
    ...(direction.resolution === "RESOLVED" ? [] : ["Direction"]),
    "Location",
    "Aggression",
    ...(regime.resolution === "RESOLVED" ? [] : ["Regime"]),
    "Structure",
    ...(volatility.resolution === "RESOLVED" ? [] : ["Volatility"]),
    "Profile",
    ...(orderFlow.resolution === "RESOLVED" ? [] : ["Order flow"]),
  ];
  const unknowns = unresolvedDimensions.map(
    name => `${name} is unresolved until a verified engine publishes evidence.`,
  );
  // Bars, not `ticker.price`. `ticker.price` can come from a REST quote or
  // from the SYMBOL_SEEDS fallback table, so it cannot carry the provenance
  // word "bar close" (§35 PROTECTED TRUTH). The selector refuses everything
  // it cannot attribute to a loaded, timestamped bar.
  // `capturedAt` is passed so the selector can prove whether the NEWEST bar has
  // finished forming. Without it the selector still refuses to overclaim — it
  // just falls back to the bar before, costing one bar of freshness.
  const lastBar = deriveLastBarClose(input.bars ?? null, input.timeframe, input.capturedAt);

  const contradictions: string[] = [];
  if (input.ticker.price > 0 && !priceTick) {
    contradictions.push("Displayed ticker price has no matching timestamped runtime tick; canonical price evidence omitted.");
  }

  return {
    qualityState,
    state: {
      snapshotId,
      capturedAt: input.capturedAt,
      instrumentId: executableIdentityFor(normalizedSymbol, assetClass) ?? normalizedSymbol,
      normalizedSymbol,
      executableIdentity: executableIdentityFor(normalizedSymbol, assetClass),
      assetClass,
      exchange: input.source === "coinbase" || input.source === "binance"
        ? input.source.toUpperCase()
        : null,
      session: input.session,
      timeframeContext: [input.timeframe],
      price: {
        last: priceTick?.price ?? null,
        bid: null,
        ask: null,
        eventAt,
      },
      // SECOND PRICE OWNER. `price.last` above stays strict — it needs a
      // matching timestamped print — which is exactly why /charts showed
      // PRICE UNKNOWN in the MARKET tile beside a chart header rendering the
      // last candle's close. This publishes that close under its own name so
      // the trader is not asked to reconcile two owners in their head.
      // A bar close never promotes qualityState; see produceCanonicalMarketState.
      lastBar,
      coverage,
      contradictions,
      unknowns,
      dimensions: { orderFlow, volatility, direction, regime },
    },
  };
}

/** Publish the chart command surface into the one canonical runtime owner. */
/**
 * THE SILENT DROP THIS SIGNATURE ONCE HID.
 *
 * `bars` is optional on `ChartMarketStatePublicationInput`, and destructuring
 * fewer keys than a type declares is perfectly legal TypeScript. So when this
 * hook forgot to name `bars`, ChartsDashboard passed `bars: chartBars`, the
 * compiler stayed silent, every unit test stayed green — and the hook threw
 * the candles away before `createChartMarketStatePublication` ever saw them.
 *
 * Measured live on /charts 2026-09-15, TSLA 1h: the dashboard held 178 loaded
 * bars closing at 359.02, the chart header rendered that close beside
 * HISTORICAL BARS VERIFIED, and the MARKET tile two inches away read
 * `TSLA · 1h · PRICE UNKNOWN` because canonical `lastBar` was null. The whole
 * bar-close feature was built, shipped, deployed and unreachable.
 *
 * A dropped input is indistinguishable from absent evidence at the far end of
 * the wire, which is why the screen could lie without anything failing. Name
 * every field explicitly; never let a forwarder decide by omission.
 */
export function usePublishChartMarketState(
  {
    symbol,
    timeframe,
    session,
    ticker,
    recentTicks,
    source,
    connected,
    bars,
  }: Omit<ChartMarketStatePublicationInput, "capturedAt" | "nectar">,
): void {
  useEffect(() => {
    const publication = createChartMarketStatePublication({
      symbol,
      timeframe,
      session,
      ticker,
      recentTicks,
      source,
      connected,
      bars,
      capturedAt: Date.now(),
      nectar: getSessionNectarSnapshot(),
    });
    try {
      publishCanonicalMarketState(publication.state, { qualityState: publication.qualityState });
    } catch (error) {
      // Canonical state is an analytical enhancement, never a reason to take
      // down the chart. Validation remains fail-closed; the invalid packet is
      // simply not published.
      console.warn("[WM Market State] publication rejected", error);
    }
    // `bars` belongs here too. Forwarding it without depending on it would
    // leave the close frozen at whatever the first publish happened to see,
    // which is its own quiet untruth.
  }, [symbol, timeframe, session, ticker, recentTicks, source, connected, bars]);
}
