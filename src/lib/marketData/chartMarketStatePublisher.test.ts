import { describe, expect, it } from "vitest";
import {
  createChartMarketStatePublication,
  type ChartMarketStatePublicationInput,
} from "./chartMarketStatePublisher";
import type { SessionNectarSnapshot } from "./sessionNectar";

const nectar: SessionNectarSnapshot = {
  schemaVersion: "wm.session-nectar.v1",
  startedAt: 1_000,
  updatedAt: 1_900,
  channels: [{
    schemaVersion: "wm.market-coverage.v1",
    instrumentId: "BTC-USD",
    normalizedSymbol: "BTC",
    channel: "trade",
    providerPath: "coinbase-client-ws",
    coverageState: "COLLECTING",
    memoryState: "SESSION_ONLY",
    persistenceRight: "UNKNOWN",
    rightsPolicyId: "wm.rights.unknown.v1",
    observedFrom: 1_000,
    observedThrough: 1_900,
    lastEventAt: 1_900,
    observedEventCount: 10,
    gapCount: 0,
    fidelity: "OBSERVED",
    collectionScope: "FOREGROUND_TAB",
    detail: "test",
  }],
  receipts: { received: 10, accepted: 10, duplicates: 0, quarantined: 0, outOfOrder: 0, sequenceGaps: 0, sequenceUnavailable: 0 },
  unsupportedCapabilities: 0,
  retentionState: "SESSION_ONLY_NO_RAW_PAYLOADS",
};

const base = (): ChartMarketStatePublicationInput => ({
  symbol: "BTC",
  timeframe: "2m",
  session: "24X7",
  ticker: { price: 65_000, change: 10, changePct: 0.02, volume: 100 },
  recentTicks: [{ price: 65_000, size: 0.1, side: "buy" as const, time: 1_950, trade: true }],
  source: "coinbase" as const,
  connected: true,
  capturedAt: 2_000,
  nectar,
});

describe("chart Market State publisher", () => {
  it("maps a matching timestamped live tick and current Nectar coverage", () => {
    const publication = createChartMarketStatePublication(base());

    expect(publication.qualityState).toBe("LIVE");
    expect(publication.state.price).toEqual({ last: 65_000, bid: null, ask: null, eventAt: 1_950 });
    expect(publication.state.coverage).toHaveLength(1);
    expect(publication.state.timeframeContext).toEqual(["2m"]);
    expect(publication.state.executableIdentity).toBe("BTC-USD");
  });

  it("omits an unmatched displayed price instead of inventing its event time", () => {
    const value = base();
    value.ticker.price = 66_000;
    const publication = createChartMarketStatePublication(value);

    expect(publication.qualityState).toBe("PARTIAL");
    expect(publication.state.price.last).toBeNull();
    expect(publication.state.contradictions).toContain(
      "Displayed ticker price has no matching timestamped runtime tick; canonical price evidence omitted.",
    );
  });

  it("omits a future-dated matching tick instead of violating snapshot chronology", () => {
    const value: ChartMarketStatePublicationInput = {
      ...base(),
      recentTicks: [{ price: 65_000, size: 0.1, side: "buy", time: 2_001, trade: true }],
    };
    const publication = createChartMarketStatePublication(value);

    expect(publication.qualityState).toBe("PARTIAL");
    expect(publication.state.price.last).toBeNull();
  });

  it("keeps delayed provider truth even when a price tick is available", () => {
    const value = { ...base(), source: "yahoo" as const };
    const publication = createChartMarketStatePublication(value);
    expect(publication.qualityState).toBe("DELAYED");
  });

  it("does not make continuous futures executable", () => {
    const value: ChartMarketStatePublicationInput = {
      ...base(),
      symbol: "NQ1!",
      source: "yahoo",
      ticker: { ...base().ticker, price: 29_000 },
      recentTicks: [{ price: 29_000, size: 1, side: "buy", time: 1_950 }],
    };
    const publication = createChartMarketStatePublication(value);

    expect(publication.state.assetClass).toBe("futures");
    expect(publication.state.executableIdentity).toBeNull();
    expect(publication.qualityState).toBe("DELAYED");
  });
});
