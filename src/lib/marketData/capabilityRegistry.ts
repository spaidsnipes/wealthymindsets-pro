/**
 * Rights-first market-data capability registry.
 *
 * This is an implementation inventory, not a provider contract opinion. Legal
 * persistence remains UNKNOWN until an authorized review records explicit
 * evidence. UNKNOWN always fails closed for raw retention.
 */
export type MarketProviderPath =
  | "coinbase-client-ws"
  | "binance-us-client-ws"
  | "alpaca-external-relay"
  | "alpaca-rest"
  | "yahoo-rest"
  | "finnhub-rest"
  | "kraken-dom-client-ws"
  | "wm-exchange-rest";

export type MarketAssetClass = "crypto" | "equity" | "etf" | "futures" | "forex" | "options";
export type MarketEventCapability = "quote" | "trade" | "bar" | "depth" | "news" | "order" | "account";
export type CapabilityAvailability = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
export type CollectionScope = "FOREGROUND_TAB" | "REQUEST_SCOPED" | "EXTERNAL_RELAY" | "BROKER_SESSION" | "NONE";
export type PersistenceRight = "UNKNOWN" | "PROHIBITED" | "ALLOWED";
export type TimestampField = "EXCHANGE" | "PROVIDER" | "RECEIVED" | "PROCESSED";
export type FidelityClass = "OBSERVED" | "DERIVED" | "PROXY" | "UNAVAILABLE";
export type RuntimeTapeSource = "polygon" | "finnhub" | "alpaca" | "coinbase" | "binance" | null;

export interface MarketDataCapability {
  providerPath: MarketProviderPath;
  assetClass: MarketAssetClass;
  eventType: MarketEventCapability;
  availability: CapabilityAvailability;
  collectionScope: CollectionScope;
  fidelityClass: FidelityClass;
  timestampFields: readonly TimestampField[];
  sequenceSupported: boolean;
  aggressorMethod: "PROVIDER" | "MAKER_SIDE_INVERTED" | "TICK_RULE" | "NONE";
  sessionCoverage: string;
  fallbackSemantics: "NONE" | "EXPLICIT" | "SILENT_LEGACY";
  rawPersistenceRight: PersistenceRight;
  retentionLimitSeconds: number | null;
  evidence: string;
}

const capability = (
  value: Omit<MarketDataCapability, "rawPersistenceRight" | "retentionLimitSeconds"> &
    Partial<Pick<MarketDataCapability, "rawPersistenceRight" | "retentionLimitSeconds">>,
): MarketDataCapability => ({
  rawPersistenceRight: "UNKNOWN",
  retentionLimitSeconds: null,
  ...value,
});

export const MARKET_DATA_CAPABILITIES: readonly MarketDataCapability[] = [
  capability({
    providerPath: "coinbase-client-ws",
    assetClass: "crypto",
    eventType: "trade",
    availability: "AVAILABLE",
    collectionScope: "FOREGROUND_TAB",
    fidelityClass: "OBSERVED",
    timestampFields: ["EXCHANGE", "PROVIDER", "RECEIVED", "PROCESSED"],
    sequenceSupported: false,
    aggressorMethod: "MAKER_SIDE_INVERTED",
    sessionCoverage: "24/7 while the elected browser tab is connected",
    fallbackSemantics: "EXPLICIT",
    evidence: "src/hooks/useWebSocket.ts tryCoinbase + joinTape; ticker sequence continuity is not certified",
  }),
  capability({
    providerPath: "binance-us-client-ws",
    assetClass: "crypto",
    eventType: "trade",
    availability: "AVAILABLE",
    collectionScope: "FOREGROUND_TAB",
    fidelityClass: "OBSERVED",
    timestampFields: ["PROVIDER", "RECEIVED", "PROCESSED"],
    sequenceSupported: false,
    aggressorMethod: "PROVIDER",
    sessionCoverage: "24/7 fallback while the elected browser tab is connected",
    fallbackSemantics: "EXPLICIT",
    evidence: "src/hooks/useWebSocket.ts tryBinance fallback",
  }),
  capability({
    providerPath: "alpaca-external-relay",
    assetClass: "equity",
    eventType: "trade",
    availability: "PARTIAL",
    collectionScope: "EXTERNAL_RELAY",
    fidelityClass: "PROXY",
    timestampFields: ["PROVIDER", "RECEIVED", "PROCESSED"],
    sequenceSupported: false,
    aggressorMethod: "TICK_RULE",
    sessionCoverage: "Relay-defined US equity session; IEX scope must be verified",
    fallbackSemantics: "NONE",
    evidence: "src/hooks/useWebSocket.ts DEFAULT_PROXY relay consumer",
  }),
  capability({
    providerPath: "alpaca-rest",
    assetClass: "equity",
    eventType: "quote",
    availability: "PARTIAL",
    collectionScope: "REQUEST_SCOPED",
    fidelityClass: "OBSERVED",
    timestampFields: ["PROVIDER", "RECEIVED", "PROCESSED"],
    sequenceSupported: false,
    aggressorMethod: "NONE",
    sessionCoverage: "IEX quote scope",
    fallbackSemantics: "EXPLICIT",
    evidence: "src/app/api/alpaca/route.ts",
  }),
  capability({
    providerPath: "yahoo-rest",
    assetClass: "futures",
    eventType: "bar",
    availability: "PARTIAL",
    collectionScope: "REQUEST_SCOPED",
    fidelityClass: "OBSERVED",
    timestampFields: ["PROVIDER", "RECEIVED", "PROCESSED"],
    sequenceSupported: false,
    aggressorMethod: "NONE",
    sessionCoverage: "Provider chart-session coverage; execution contract identity unavailable",
    fallbackSemantics: "EXPLICIT",
    evidence: "src/app/api/yahoo/route.ts + src/lib/yahooTimeframes.ts",
  }),
  capability({
    providerPath: "finnhub-rest",
    assetClass: "equity",
    eventType: "bar",
    availability: "PARTIAL",
    collectionScope: "REQUEST_SCOPED",
    fidelityClass: "OBSERVED",
    timestampFields: ["PROVIDER", "RECEIVED", "PROCESSED"],
    sequenceSupported: false,
    aggressorMethod: "NONE",
    sessionCoverage: "Plan-dependent historical candle coverage",
    fallbackSemantics: "EXPLICIT",
    evidence: "src/app/api/finnhub/route.ts fail-closed timeframe contract",
  }),
  capability({
    providerPath: "kraken-dom-client-ws",
    assetClass: "crypto",
    eventType: "depth",
    availability: "AVAILABLE",
    collectionScope: "FOREGROUND_TAB",
    fidelityClass: "OBSERVED",
    timestampFields: ["PROVIDER", "RECEIVED", "PROCESSED"],
    sequenceSupported: false,
    aggressorMethod: "NONE",
    sessionCoverage: "24/7 while the DOM component is connected",
    fallbackSemantics: "NONE",
    evidence: "src/components/chart/DOMPanel.tsx Kraken book consumer",
  }),
  capability({
    providerPath: "wm-exchange-rest",
    assetClass: "crypto",
    eventType: "bar",
    availability: "PARTIAL",
    collectionScope: "REQUEST_SCOPED",
    fidelityClass: "PROXY",
    timestampFields: ["PROVIDER", "RECEIVED", "PROCESSED"],
    sequenceSupported: false,
    aggressorMethod: "NONE",
    sessionCoverage: "Exchange-dependent 24/7 bars",
    fallbackSemantics: "SILENT_LEGACY",
    evidence: "src/app/api/exchange/route.ts nearest-granularity and Gemini fallback paths",
  }),
] as const;

export function getMarketDataCapability(
  providerPath: MarketProviderPath,
  assetClass: MarketAssetClass,
  eventType: MarketEventCapability,
): MarketDataCapability {
  return MARKET_DATA_CAPABILITIES.find(
    entry => entry.providerPath === providerPath && entry.assetClass === assetClass && entry.eventType === eventType,
  ) ?? capability({
    providerPath,
    assetClass,
    eventType,
    availability: "UNAVAILABLE",
    collectionScope: "NONE",
    fidelityClass: "UNAVAILABLE",
    timestampFields: [],
    sequenceSupported: false,
    aggressorMethod: "NONE",
    sessionCoverage: "No verified implementation evidence",
    fallbackSemantics: "NONE",
    evidence: "No matching registry entry",
  });
}

export function canPersistRaw(capabilityEntry: MarketDataCapability): boolean {
  return capabilityEntry.availability !== "UNAVAILABLE" &&
    capabilityEntry.rawPersistenceRight === "ALLOWED";
}

const TAPE_SOURCE_PATHS: Partial<Record<Exclude<RuntimeTapeSource, null>, {
  providerPath: MarketProviderPath;
  assetClass: MarketAssetClass;
}>> = {
  coinbase: { providerPath: "coinbase-client-ws", assetClass: "crypto" },
  binance: { providerPath: "binance-us-client-ws", assetClass: "crypto" },
  alpaca: { providerPath: "alpaca-external-relay", assetClass: "equity" },
};

/** Runtime tape truth must come from the reviewed capability registry. */
export function getRuntimeTapeCapability(source: string | null): MarketDataCapability | null {
  if (!source) return null;
  const identity = TAPE_SOURCE_PATHS[source as Exclude<RuntimeTapeSource, null>];
  if (!identity) return null;
  return getMarketDataCapability(identity.providerPath, identity.assetClass, "trade");
}

export function hasVerifiedAggressorTape(source: string | null): boolean {
  const capabilityEntry = getRuntimeTapeCapability(source);
  return capabilityEntry != null &&
    capabilityEntry.availability !== "UNAVAILABLE" &&
    capabilityEntry.aggressorMethod !== "NONE";
}
