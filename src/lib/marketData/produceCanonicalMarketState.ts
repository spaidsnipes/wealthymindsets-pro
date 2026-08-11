import type {
  CanonicalMarketStateInput,
  MarketQualityState,
  MarketStateDimension,
} from "./canonicalMarketState";
import { sealCanonicalMarketState, type CanonicalMarketState } from "./canonicalMarketState";
import type { MarketChannelCoverage } from "./coverageMap";

/**
 * Inputs a producer needs to compose a truthful Market State snapshot.
 *
 * The producer intentionally leaves every analytical dimension (direction,
 * location, aggression, regime, structure, volatility, profile, orderFlow)
 * as UNKNOWN unless the caller supplies verified evidence. UNKNOWN is a
 * valid answer — fabricating a resolution just so a card can render violates
 * the founder's truth standard.
 */
export interface ProduceMarketStateInput {
  snapshotId: string;
  capturedAt: number;
  instrumentId: string;
  normalizedSymbol: string;
  executableIdentity: string | null;
  assetClass: string;
  exchange: string | null;
  session: string;
  timeframeContext: readonly string[];
  price: {
    last: number | null;
    bid: number | null;
    ask: number | null;
    eventAt: number | null;
  };
  coverage: readonly MarketChannelCoverage[];
  /** Optional resolved dimensions — omit when we do not have evidence. */
  dimensions?: Partial<{
    direction:  MarketStateDimension;
    location:   MarketStateDimension;
    aggression: MarketStateDimension;
    regime:     MarketStateDimension;
    structure:  MarketStateDimension;
    volatility: MarketStateDimension;
    profile:    MarketStateDimension;
    orderFlow:  MarketStateDimension;
  }>;
  /** Free-form contradictions/unknowns the caller has already surfaced. */
  contradictions?: readonly string[];
  unknowns?: readonly string[];
}

const UNKNOWN_DIMENSION: MarketStateDimension = {
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: ["No verified evidence supplied at snapshot time."],
};

/**
 * Derive an honest qualityState from what the coverage actually says. The
 * caller doesn't get to just claim LIVE — this reads the underlying evidence:
 * if any relevant channel is COLLECTING with a fresh event, we can say LIVE;
 * if the newest evidence is STALE we can only say STALE; if there's no
 * coverage at all we say UNAVAILABLE. PROXY / DELAYED must be set by the
 * caller because those depend on provider-level facts the coverage row alone
 * does not know.
 */
function deriveQualityState(
  coverage: readonly MarketChannelCoverage[],
  hasPrice: boolean,
  capturedAt: number,
  staleAfterMs: number,
): MarketQualityState {
  if (!coverage.length && !hasPrice) return "UNAVAILABLE";
  if (coverage.some(c => c.coverageState === "REPLAY")) return "REPLAY";

  const relevant = coverage.filter(c => c.coverageState !== "UNAVAILABLE");
  if (!relevant.length) return hasPrice ? "PARTIAL" : "UNAVAILABLE";

  const freshest = relevant
    .map(c => c.lastEventAt ?? c.observedThrough ?? 0)
    .reduce((max, v) => Math.max(max, v), 0);
  const age = capturedAt - freshest;

  if (freshest === 0) return hasPrice ? "PARTIAL" : "STALE";
  if (age > staleAfterMs) return "STALE";
  if (relevant.some(c => c.coverageState === "GAPPED")) return "PARTIAL";
  return "LIVE";
}

const STALE_AFTER_MS_DEFAULT = 60_000;

/**
 * Pure producer — call it with everything you know at time T and it returns
 * a validated `CanonicalMarketStateInput`. Pass the result to
 * `sealCanonicalMarketState` to get an immutable, schema-tagged snapshot.
 *
 * Split into two steps on purpose: unit tests can assert what the producer
 * chose without paying the deep-freeze cost, and callers who need to inspect
 * validation errors before sealing can call `validateCanonicalMarketState`
 * on the intermediate.
 */
export function produceCanonicalMarketStateInput(
  input: ProduceMarketStateInput,
  options: { qualityState?: MarketQualityState; staleAfterMs?: number } = {},
): CanonicalMarketStateInput {
  const hasPrice =
    input.price.last != null || input.price.bid != null || input.price.ask != null;

  const qualityState = options.qualityState
    ?? deriveQualityState(
      input.coverage,
      hasPrice,
      input.capturedAt,
      options.staleAfterMs ?? STALE_AFTER_MS_DEFAULT,
    );

  const availableAt = Math.max(
    input.capturedAt,
    ...input.coverage.map(c => c.lastEventAt ?? c.observedThrough ?? 0),
    input.price.eventAt ?? 0,
  );

  return {
    snapshotId: input.snapshotId,
    capturedAt: input.capturedAt,
    availableAt,
    instrumentId: input.instrumentId,
    normalizedSymbol: input.normalizedSymbol,
    executableIdentity: input.executableIdentity,
    assetClass: input.assetClass,
    exchange: input.exchange,
    session: input.session,
    timeframeContext: input.timeframeContext,
    qualityState,
    price: {
      last: input.price.last,
      bid: input.price.bid,
      ask: input.price.ask,
      eventAt: hasPrice ? input.price.eventAt : null,
      availableAt: hasPrice ? availableAt : null,
    },
    coverage: input.coverage,
    direction:  input.dimensions?.direction  ?? UNKNOWN_DIMENSION,
    location:   input.dimensions?.location   ?? UNKNOWN_DIMENSION,
    aggression: input.dimensions?.aggression ?? UNKNOWN_DIMENSION,
    regime:     input.dimensions?.regime     ?? UNKNOWN_DIMENSION,
    structure:  input.dimensions?.structure  ?? UNKNOWN_DIMENSION,
    volatility: input.dimensions?.volatility ?? UNKNOWN_DIMENSION,
    profile:    input.dimensions?.profile    ?? UNKNOWN_DIMENSION,
    orderFlow:  input.dimensions?.orderFlow  ?? UNKNOWN_DIMENSION,
    contradictions: input.contradictions ?? [],
    unknowns: input.unknowns ?? [],
  };
}

/** One-shot producer → sealer. Throws if validation fails. */
export function produceCanonicalMarketState(
  input: ProduceMarketStateInput,
  options: { qualityState?: MarketQualityState; staleAfterMs?: number } = {},
): CanonicalMarketState {
  return sealCanonicalMarketState(produceCanonicalMarketStateInput(input, options));
}

