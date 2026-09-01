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
  | "moomoo-opend-bridge"
  | "yahoo-rest"
  | "finnhub-rest"
  | "kraken-dom-client-ws"
  | "wm-exchange-rest";

export type MarketAssetClass = "crypto" | "equity" | "etf" | "futures" | "forex" | "options";
export type MarketEventCapability = "quote" | "trade" | "bar" | "depth" | "news" | "order" | "account";
export type CapabilityAvailability = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
export type CollectionScope = "FOREGROUND_TAB" | "REQUEST_SCOPED" | "EXTERNAL_RELAY" | "BROKER_SESSION" | "NONE";
export type PersistenceRight = "UNKNOWN" | "PROHIBITED" | "ALLOWED";

/**
 * Rights registry v2 (2026-08-10 afternoon session).
 *
 * The v1 registry expressed a single boolean-ish `rawPersistenceRight`. The
 * founder directive requires an explicit, per-action decision — otherwise a
 * data-usage choice we never actually made can leak through as an implied
 * "sure, why not". Every action defaults to `UNKNOWN` and every gate that
 * reads this MUST treat UNKNOWN as fail-closed (i.e. not allowed).
 *
 * Actions:
 *   collect      — may we receive events from this provider at all?
 *   display      — may we render values from this provider to the user?
 *   raw          — may we durably store the raw event payload?
 *   derived      — may we durably store derived aggregates (bars, VP, delta)?
 *   redistribute — may we serve this data to third parties (feeds, exports)?
 *   train        — may this data enter a model training set (WM or external)?
 *
 * A capability MAY be `collect: ALLOWED, display: ALLOWED` while every other
 * action stays `UNKNOWN`. That is the correct posture for most public feeds
 * today: we can watch and render, but retention/redistribute/train remain
 * unreviewed and therefore forbidden.
 */
export type RightsDecision = "UNKNOWN" | "PROHIBITED" | "ALLOWED";

export interface MarketDataRights {
  collect:      RightsDecision;
  display:      RightsDecision;
  raw:          RightsDecision;
  derived:      RightsDecision;
  redistribute: RightsDecision;
  train:        RightsDecision;
  commercial:   RightsDecision;
}

export const UNKNOWN_RIGHTS: MarketDataRights = {
  collect:      "UNKNOWN",
  display:      "UNKNOWN",
  raw:          "UNKNOWN",
  derived:      "UNKNOWN",
  redistribute: "UNKNOWN",
  train:        "UNKNOWN",
  commercial:   "UNKNOWN",
} as const;

export type TimestampField = "EXCHANGE" | "PROVIDER" | "RECEIVED" | "PROCESSED";
export type FidelityClass = "OBSERVED" | "DERIVED" | "PROXY" | "UNAVAILABLE";
export type RuntimeTapeSource = "polygon" | "finnhub" | "alpaca" | "coinbase" | "binance" | "moomoo" | null;
export const UNKNOWN_RIGHTS_POLICY_ID = "wm.rights.unknown.v1" as const;

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
  /** @deprecated Use `rights.raw` via `canDoAction(cap, "raw")`. Kept for v1 consumers. */
  rawPersistenceRight: PersistenceRight;
  rightsPolicyId: string;
  retentionLimitSeconds: number | null;
  attributionRequired: boolean | null;
  rightsEvidenceUrl: string | null;
  rightsAgreementVersion: string | null;
  rightsReviewedBy: string | null;
  rightsReviewedAt: string | null;
  evidence: string;
  /**
   * Granular per-action rights (v2). Every field defaults to `UNKNOWN` when
   * an entry doesn't specify one. `UNKNOWN` fails closed at the gate — do
   * NOT treat missing knowledge as consent.
   */
  rights: MarketDataRights;
}

/**
 * Compatibility preset for operational public-feed entries. Availability
 * records what the app can technically receive; it is not a legal grant.
 * The 2026-08-10 provider review found no blanket multi-user commercial
 * authorization, so every legal action remains UNKNOWN and fails closed.
 */
export const PUBLIC_DISPLAY_ONLY_RIGHTS: MarketDataRights = {
  ...UNKNOWN_RIGHTS,
} as const;

const capability = (
  value: Omit<MarketDataCapability,
    | "rawPersistenceRight" | "rightsPolicyId" | "retentionLimitSeconds" | "rights"
    | "attributionRequired" | "rightsEvidenceUrl" | "rightsAgreementVersion"
    | "rightsReviewedBy" | "rightsReviewedAt"
  > & Partial<Pick<MarketDataCapability,
    | "rawPersistenceRight" | "rightsPolicyId" | "retentionLimitSeconds" | "rights"
    | "attributionRequired" | "rightsEvidenceUrl" | "rightsAgreementVersion"
    | "rightsReviewedBy" | "rightsReviewedAt"
  >>,
): MarketDataCapability => {
  const rights: MarketDataRights = { ...UNKNOWN_RIGHTS, ...(value.rights ?? {}) };
  // Keep rawPersistenceRight (v1) in sync with rights.raw (v2) so old gates
  // still see the same answer. New code should read `rights.raw`.
  const rawPersistenceRight: PersistenceRight = value.rawPersistenceRight ?? rights.raw;
  return {
    rightsPolicyId: UNKNOWN_RIGHTS_POLICY_ID,
    retentionLimitSeconds: null,
    attributionRequired: null,
    rightsEvidenceUrl: null,
    rightsAgreementVersion: null,
    rightsReviewedBy: null,
    rightsReviewedAt: null,
    ...value,
    rights,
    rawPersistenceRight,
  };
};

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
    rights: PUBLIC_DISPLAY_ONLY_RIGHTS,
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
    aggressorMethod: "MAKER_SIDE_INVERTED",
    sessionCoverage: "24/7 fallback while the elected browser tab is connected",
    fallbackSemantics: "EXPLICIT",
    rights: PUBLIC_DISPLAY_ONLY_RIGHTS,
    evidence: "src/hooks/useWebSocket.ts tryBinance fallback + adapters/binanceUs.ts",
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
    rights: PUBLIC_DISPLAY_ONLY_RIGHTS,
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
    rights: PUBLIC_DISPLAY_ONLY_RIGHTS,
    evidence: "src/app/api/alpaca/route.ts",
  }),
  capability({
    providerPath: "moomoo-opend-bridge",
    assetClass: "equity",
    eventType: "trade",
    availability: "PARTIAL",
    collectionScope: "REQUEST_SCOPED",
    fidelityClass: "OBSERVED",
    timestampFields: ["PROVIDER", "RECEIVED", "PROCESSED"],
    sequenceSupported: false,
    aggressorMethod: "PROVIDER",
    sessionCoverage: "OpenD ticker subscription through the authenticated bridge; runtime continuity remains request-scoped",
    fallbackSemantics: "EXPLICIT",
    rights: PUBLIC_DISPLAY_ONLY_RIGHTS,
    evidence: "services/moomoo-bridge/bridge.py /ticks + adapters/moomooTicks.ts; persistent streaming/reconnect is not yet certified",
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
    rights: PUBLIC_DISPLAY_ONLY_RIGHTS,
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
    rights: PUBLIC_DISPLAY_ONLY_RIGHTS,
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
    rights: PUBLIC_DISPLAY_ONLY_RIGHTS,
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
    rights: PUBLIC_DISPLAY_ONLY_RIGHTS,
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
    rights: PUBLIC_DISPLAY_ONLY_RIGHTS,
    evidence: "No matching registry entry",
  });
}

export function canPersistRaw(capabilityEntry: MarketDataCapability): boolean {
  return capabilityEntry.availability !== "UNAVAILABLE" &&
    capabilityEntry.rights.collect === "ALLOWED" &&
    capabilityEntry.rights.raw === "ALLOWED" &&
    capabilityEntry.rawPersistenceRight === "ALLOWED";
}

export function canPersistDerived(capabilityEntry: MarketDataCapability): boolean {
  return capabilityEntry.availability !== "UNAVAILABLE" &&
    capabilityEntry.rights.collect === "ALLOWED" &&
    capabilityEntry.rights.derived === "ALLOWED";
}

/**
 * v2 gate — read a per-action right. Every UNKNOWN answer becomes `false`
 * (fail closed). Consumers MUST NOT invert this check ("if not prohibited
 * then allowed") — that would silently grant UNKNOWN.
 */
export function canDoAction(
  capabilityEntry: MarketDataCapability,
  action: keyof MarketDataRights,
): boolean {
  if (capabilityEntry.availability === "UNAVAILABLE") return false;
  return capabilityEntry.rights[action] === "ALLOWED";
}

// PUBLIC_DISPLAY_ONLY_RIGHTS moved above MARKET_DATA_CAPABILITIES so the
// entries can reference it. See the exported constant below the interface.

const TAPE_SOURCE_PATHS: Partial<Record<Exclude<RuntimeTapeSource, null>, {
  providerPath: MarketProviderPath;
  assetClass: MarketAssetClass;
}>> = {
  coinbase: { providerPath: "coinbase-client-ws", assetClass: "crypto" },
  binance: { providerPath: "binance-us-client-ws", assetClass: "crypto" },
  alpaca: { providerPath: "alpaca-external-relay", assetClass: "equity" },
  moomoo: { providerPath: "moomoo-opend-bridge", assetClass: "equity" },
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
