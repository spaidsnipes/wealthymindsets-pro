import { useEffect } from "react";
import type { MarketState, Tick } from "../../hooks/useWebSocket";
import { priceSourceBadge } from "../priceSource";
import { publishCanonicalMarketState } from "./publishCanonicalMarketState";
import {
  getSessionNectarSnapshot,
  type SessionNectarSnapshot,
} from "./sessionNectar";
import type { ProduceMarketStateInput } from "./produceCanonicalMarketState";
import type { MarketQualityState } from "./canonicalMarketState";

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
}

function assetClassFor(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  if (upper.endsWith("1!") || upper.includes("=F")) return "futures";
  if (["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "LTC", "ATOM", "UNI"].includes(upper)) return "crypto";
  if (upper.includes("/")) return "forex";
  return "equity";
}

function executableIdentityFor(symbol: string, assetClass: string): string | null {
  const upper = symbol.trim().toUpperCase();
  if (assetClass === "futures") return null;
  if (assetClass === "crypto") return `${upper}-USD`;
  return upper;
}

function qualityFor(
  source: MarketState["source"],
  connected: boolean,
  hasCanonicalPrice: boolean,
): MarketQualityState {
  const badge = priceSourceBadge(source, connected);
  if (badge.live) return hasCanonicalPrice ? "LIVE" : "PARTIAL";
  if (badge.label.startsWith("DELAYED")) return "DELAYED";
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
  const qualityState = qualityFor(input.source, input.connected, hasCanonicalPrice);
  const unknowns = [
    "Direction, location, aggression, regime, structure, volatility, profile, and order flow are unresolved until verified engines publish evidence.",
  ];
  const contradictions: string[] = [];
  if (input.ticker.price > 0 && !priceTick) {
    contradictions.push("Displayed ticker price has no matching timestamped runtime tick; canonical price evidence omitted.");
  }

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
      coverage,
      contradictions,
      unknowns,
    },
  };
}

/** Publish the chart command surface into the one canonical runtime owner. */
export function usePublishChartMarketState(
  {
    symbol,
    timeframe,
    session,
    ticker,
    recentTicks,
    source,
    connected,
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
  }, [symbol, timeframe, session, ticker, recentTicks, source, connected]);
}
