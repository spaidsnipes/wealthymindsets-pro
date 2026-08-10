import type { MarketChannelCoverage } from "./coverageMap";
import type { MarketFidelityClass } from "./marketEvent";

export const CANONICAL_MARKET_STATE_SCHEMA_VERSION = "wm.market-state.v1" as const;

export type MarketStateResolution = "RESOLVED" | "PARTIAL" | "UNKNOWN";
export type MarketQualityState = "LIVE" | "DELAYED" | "STALE" | "PARTIAL" | "PROXY" | "REPLAY" | "UNAVAILABLE";

export interface MarketStateEvidenceRef {
  eventId: string;
  observedAt: number;
  availableAt: number;
  source: string;
  fidelity: MarketFidelityClass;
  basis: string;
}

export interface MarketStateDimension {
  resolution: MarketStateResolution;
  value: string | null;
  confidence: number | null;
  evidence: readonly MarketStateEvidenceRef[];
  contradictions: readonly string[];
  unknowns: readonly string[];
}

export interface CanonicalMarketStateInput {
  snapshotId: string;
  capturedAt: number;
  availableAt: number;
  instrumentId: string;
  normalizedSymbol: string;
  executableIdentity: string | null;
  assetClass: string;
  exchange: string | null;
  session: string;
  timeframeContext: readonly string[];
  qualityState: MarketQualityState;
  price: {
    last: number | null;
    bid: number | null;
    ask: number | null;
    eventAt: number | null;
    availableAt: number | null;
  };
  coverage: readonly MarketChannelCoverage[];
  direction: MarketStateDimension;
  location: MarketStateDimension;
  aggression: MarketStateDimension;
  regime: MarketStateDimension;
  structure: MarketStateDimension;
  volatility: MarketStateDimension;
  profile: MarketStateDimension;
  orderFlow: MarketStateDimension;
  contradictions: readonly string[];
  unknowns: readonly string[];
}

export interface CanonicalMarketState extends CanonicalMarketStateInput {
  schemaVersion: typeof CANONICAL_MARKET_STATE_SCHEMA_VERSION;
  sealed: true;
}

const validEpoch = (value: number) => Number.isFinite(value) && value > 0;
const positiveOrMissing = (value: number | null) => value == null || (Number.isFinite(value) && value > 0);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function validateDimension(name: string, dimension: MarketStateDimension, cutoff: number): string[] {
  const errors: string[] = [];
  if (dimension.confidence != null &&
      (!Number.isFinite(dimension.confidence) || dimension.confidence < 0 || dimension.confidence > 1)) {
    errors.push(`${name} confidence must be between 0 and 1.`);
  }
  if (dimension.resolution === "RESOLVED" && (!dimension.value?.trim() || dimension.evidence.length === 0)) {
    errors.push(`${name} RESOLVED requires a value and evidence.`);
  }
  if (dimension.resolution === "UNKNOWN" && (dimension.value != null || dimension.unknowns.length === 0)) {
    errors.push(`${name} UNKNOWN requires no value and at least one explicit unknown.`);
  }
  for (const evidence of dimension.evidence) {
    if (!evidence.eventId.trim() || !evidence.source.trim() || !evidence.basis.trim() ||
        !validEpoch(evidence.observedAt) || !validEpoch(evidence.availableAt) ||
        evidence.availableAt < evidence.observedAt || evidence.availableAt > cutoff) {
      errors.push(`${name} contains evidence unavailable at snapshot time.`);
    }
  }
  return errors;
}

export function validateCanonicalMarketState(input: CanonicalMarketStateInput): string[] {
  const errors: string[] = [];
  if (!input.snapshotId.trim() || !input.instrumentId.trim() || !input.normalizedSymbol.trim() ||
      !input.assetClass.trim() || !input.session.trim() || input.timeframeContext.length === 0) {
    errors.push("Market State identity, session, and timeframe context are required.");
  }
  if (!validEpoch(input.capturedAt) || !validEpoch(input.availableAt) || input.availableAt < input.capturedAt) {
    errors.push("Market State chronology is invalid.");
  }
  if (![input.price.last, input.price.bid, input.price.ask].every(positiveOrMissing) ||
      (input.price.bid != null && input.price.ask != null && input.price.bid > input.price.ask)) {
    errors.push("Market State price evidence is invalid.");
  }
  const hasPrice = input.price.last != null || input.price.bid != null || input.price.ask != null;
  if (hasPrice && (!validEpoch(input.price.eventAt ?? 0) || !validEpoch(input.price.availableAt ?? 0) ||
      input.price.availableAt! < input.price.eventAt! || input.price.availableAt! > input.capturedAt)) {
    errors.push("Market State price was unavailable at snapshot time.");
  }
  if (!hasPrice && (input.price.eventAt != null || input.price.availableAt != null)) {
    errors.push("Market State cannot timestamp absent price evidence.");
  }
  if (input.qualityState === "LIVE" && !hasPrice) errors.push("LIVE Market State requires price evidence.");

  for (const [name, dimension] of Object.entries({
    Direction: input.direction,
    Location: input.location,
    Aggression: input.aggression,
    Regime: input.regime,
    Structure: input.structure,
    Volatility: input.volatility,
    Profile: input.profile,
    OrderFlow: input.orderFlow,
  })) errors.push(...validateDimension(name, dimension, input.capturedAt));

  return [...new Set(errors)];
}

/** One sealed, outcome-free packet for all WM market-intelligence consumers. */
export function sealCanonicalMarketState(input: CanonicalMarketStateInput): CanonicalMarketState {
  const errors = validateCanonicalMarketState(input);
  if (errors.length) throw new Error(errors.join(" "));
  return deepFreeze({
    ...structuredClone(input),
    schemaVersion: CANONICAL_MARKET_STATE_SCHEMA_VERSION,
    sealed: true,
  });
}
