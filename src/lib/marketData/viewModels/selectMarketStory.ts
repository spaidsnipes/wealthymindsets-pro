/**
 * selectMarketStory — first real UI consumer of CanonicalMarketState.
 *
 * Closes the P00290 "publisher without consumer" adoption gap identified in
 * the Nectar authority doc (Drive 16D4tHgprUu…) and referenced by
 * docs/operations/UI_CONTRACTS_AND_CONTRADICTIONS_2026-08-12.md §3.
 *
 * Pure function — no I/O, no subscription, no side effects. Consumers pass
 * the current snapshot + rolling window + a matcher config. UNKNOWN inputs
 * propagate to UNKNOWN outputs; fabrication is forbidden.
 *
 * The matcher config is REQUIRED because CanonicalMarketState dimension
 * values are declared as `string | null` free-form (verified in
 * src/lib/marketData/canonicalMarketState.ts). Hardcoding token comparisons
 * inside the engine would invent producer vocabulary the schema does not
 * enforce.
 */
import type {
  CanonicalMarketState,
  MarketStateDimension,
  MarketStateEvidenceRef,
  MarketStateResolution,
} from "../canonicalMarketState";

/**
 * Suggested chapter vocabulary. Callers may extend or replace.
 * Kept as string union rather than enum so consumers can add new chapters
 * without touching this engine.
 */
export type StoryChapter =
  | "OPENING_AUCTION"
  | "BALANCE"
  | "COMPRESSION"
  | "LIQUIDITY_PROBE"
  | "SWEEP"
  | "ABSORPTION"
  | "RECLAIM"
  | "BREAKOUT"
  | "ACCEPTANCE"
  | "TREND_EXPANSION"
  | "ROTATION"
  | "VALUE_MIGRATION"
  | "EXHAUSTION"
  | "CLOSING_AUCTION";

export interface ChapterEntry {
  chapter: StoryChapter;
  enteredAt: number;
  exitedAt?: number;
  resolution: MarketStateResolution;
  evidence: readonly MarketStateEvidenceRef[];
  contradictions: readonly string[];
  reason?: string;
}

export interface StoryVM {
  current: ChapterEntry | null;
  recent: readonly ChapterEntry[]; // last N (bounded to 6)
  resolution: MarketStateResolution;
  reason?: string;
}

/**
 * A guard result: does the state support this chapter, and with what
 * evidence/contradictions attributed to the transition?
 */
export interface GuardResult {
  supports: boolean;
  evidence: readonly MarketStateEvidenceRef[];
  contradictions: readonly string[];
  reason?: string;
}

/**
 * Guard fn: given the current state + rolling history + config, decide
 * whether the chapter applies. Pure function.
 */
export type Guard = (
  state: CanonicalMarketState,
  history: readonly CanonicalMarketState[],
  config: StoryConfig,
) => GuardResult;

/**
 * Matcher — knows what strings the CURRENT producer emits for a dimension.
 * Callers wire this to their producer contract. Producer changes → update
 * matchers, not engine.
 */
export interface DimensionMatcher {
  /** Match a dimension value against this matcher's accepted vocabulary. */
  matches(dim: MarketStateDimension): boolean;
}

export interface StoryConfig {
  /** Ordered chapter guards. First-match wins on tie for now; future work
   *  can rank by confidence. */
  chapters: readonly { chapter: StoryChapter; guard: Guard }[];
  /** Optional per-dimension matchers used by the guards below. */
  matchers?: {
    regime?: { balance?: DimensionMatcher; trend?: DimensionMatcher; rotation?: DimensionMatcher };
    volatility?: { low?: DimensionMatcher; high?: DimensionMatcher; shock?: DimensionMatcher };
    aggression?: { high?: DimensionMatcher; low?: DimensionMatcher };
    structure?: { bos?: DimensionMatcher; sweep?: DimensionMatcher };
    location?: { atHigh?: DimensionMatcher; atLow?: DimensionMatcher };
    profile?: { migrating?: DimensionMatcher };
  };
  /** Extract an ATR-like scalar from the state's volatility evidence. Return
   *  null if not derivable — absorption/etc guards will then return UNKNOWN
   *  rather than compare against an arbitrary constant. */
  atrExtractor?: (state: CanonicalMarketState) => number | null;
  /** How long to preserve prior chapter when no chapter matches. */
  freshnessMaxMs: number;
  /** Max recent chapters retained in the VM. */
  historyCap: number;
}

/**
 * Reasonable default matchers — accept common vocabulary variants without
 * enforcing a specific enum. Callers should override with producer-specific
 * matchers when the producer's vocabulary is known.
 */
const looseMatch = (accepted: readonly string[]): DimensionMatcher => ({
  matches: (dim) => {
    if (dim.resolution !== "RESOLVED" || dim.value == null) return false;
    const v = String(dim.value).toLowerCase().replace(/[_\s-]+/g, "");
    return accepted.some((a) => a.toLowerCase().replace(/[_\s-]+/g, "") === v);
  },
});

export const DEFAULT_MATCHERS: Required<NonNullable<StoryConfig["matchers"]>> = {
  regime: {
    balance: looseMatch(["balance", "balanced", "range", "ranging"]),
    trend: looseMatch(["trend", "trending", "trendup", "trenddown"]),
    rotation: looseMatch(["rotation", "rotating", "meanreversion"]),
  },
  volatility: {
    low: looseMatch(["low", "compressed", "quiet"]),
    high: looseMatch(["high", "elevated", "expansion"]),
    shock: looseMatch(["shock", "extreme"]),
  },
  aggression: {
    high: looseMatch(["high", "elevated", "strong"]),
    low: looseMatch(["low", "weak", "muted"]),
  },
  structure: {
    bos: looseMatch(["bos", "breakofstructure", "break"]),
    sweep: looseMatch(["sweep", "liquiditysweep"]),
  },
  location: {
    atHigh: looseMatch(["athigh", "vah", "resistance"]),
    atLow: looseMatch(["atlow", "val", "support"]),
  },
  profile: {
    migrating: looseMatch(["migrating", "shifting", "valuemigration"]),
  },
};

// ── Guards ──────────────────────────────────────────────────────────────

const g = (config: StoryConfig) => ({
  ...DEFAULT_MATCHERS,
  ...(config.matchers ?? {}),
  regime: { ...DEFAULT_MATCHERS.regime, ...(config.matchers?.regime ?? {}) },
  volatility: { ...DEFAULT_MATCHERS.volatility, ...(config.matchers?.volatility ?? {}) },
  aggression: { ...DEFAULT_MATCHERS.aggression, ...(config.matchers?.aggression ?? {}) },
  structure: { ...DEFAULT_MATCHERS.structure, ...(config.matchers?.structure ?? {}) },
  location: { ...DEFAULT_MATCHERS.location, ...(config.matchers?.location ?? {}) },
  profile: { ...DEFAULT_MATCHERS.profile, ...(config.matchers?.profile ?? {}) },
});

export const DEFAULT_GUARDS: readonly { chapter: StoryChapter; guard: Guard }[] = [
  {
    chapter: "BALANCE",
    guard: (state, _hist, config) => {
      const m = g(config);
      const balanceMatch = m.regime?.balance?.matches(state.regime);
      const lowVol = m.volatility?.low?.matches(state.volatility);
      return {
        supports: !!balanceMatch && !!lowVol,
        evidence: [...state.regime.evidence, ...state.volatility.evidence],
        contradictions: [...state.regime.contradictions, ...state.volatility.contradictions],
      };
    },
  },
  {
    chapter: "TREND_EXPANSION",
    guard: (state, _hist, config) => {
      const m = g(config);
      const trend = m.regime?.trend?.matches(state.regime);
      const notLow = !m.volatility?.low?.matches(state.volatility);
      return {
        supports: !!trend && notLow,
        evidence: state.regime.evidence,
        contradictions: state.regime.contradictions,
      };
    },
  },
  {
    chapter: "SWEEP",
    guard: (state, _hist, config) => {
      const m = g(config);
      const sweep = m.structure?.sweep?.matches(state.structure);
      return {
        supports: !!sweep,
        evidence: state.structure.evidence,
        contradictions: state.structure.contradictions,
      };
    },
  },
  {
    chapter: "BREAKOUT",
    guard: (state, _hist, config) => {
      const m = g(config);
      const bos = m.structure?.bos?.matches(state.structure);
      const directionResolved = state.direction.resolution === "RESOLVED";
      return {
        supports: !!bos && directionResolved,
        evidence: [...state.structure.evidence, ...state.direction.evidence],
        contradictions: [...state.structure.contradictions, ...state.direction.contradictions],
      };
    },
  },
  {
    chapter: "LIQUIDITY_PROBE",
    guard: (state, _hist, config) => {
      const m = g(config);
      const atLevel =
        m.location?.atHigh?.matches(state.location) ||
        m.location?.atLow?.matches(state.location);
      const highAgg = m.aggression?.high?.matches(state.aggression);
      const noBreak = !m.structure?.bos?.matches(state.structure);
      return {
        supports: !!atLevel && !!highAgg && noBreak,
        evidence: [...state.location.evidence, ...state.aggression.evidence],
        contradictions: [...state.location.contradictions, ...state.aggression.contradictions],
      };
    },
  },
  {
    chapter: "ABSORPTION",
    guard: (state, hist, config) => {
      if (hist.length < 3) {
        return { supports: false, evidence: [], contradictions: [], reason: "Insufficient history (<3 snapshots)" };
      }
      const m = g(config);
      const atr = config.atrExtractor?.(state) ?? null;
      if (atr == null || atr <= 0) {
        return {
          supports: false,
          evidence: [],
          contradictions: ["ATR unresolved — cannot normalize displacement"],
          reason: "ATR unresolved",
        };
      }
      const window = hist.slice(-3);
      const highAggThroughout = window.every((s) => !!m.aggression?.high?.matches(s.aggression));
      // Dimensionless displacement ratio vs ATR — scales across TSLA/SPY/BTC/etc
      const prices = window.map((s) => s.price.last).filter((p): p is number => p != null);
      if (prices.length < 2) {
        return { supports: false, evidence: [], contradictions: [], reason: "Insufficient price history" };
      }
      const displacement = Math.abs(prices[prices.length - 1] - prices[0]);
      const ratio = displacement / atr;
      return {
        supports: highAggThroughout && ratio < 0.2,
        evidence: [
          ...state.aggression.evidence,
          ...state.orderFlow.evidence,
          ...state.volatility.evidence,
        ],
        contradictions: state.aggression.contradictions,
      };
    },
  },
  {
    chapter: "VALUE_MIGRATION",
    guard: (state, _hist, config) => {
      const m = g(config);
      const migrating = m.profile?.migrating?.matches(state.profile);
      return {
        supports: !!migrating,
        evidence: state.profile.evidence,
        contradictions: state.profile.contradictions,
      };
    },
  },
  {
    chapter: "ROTATION",
    guard: (state, _hist, config) => {
      const m = g(config);
      const rot = m.regime?.rotation?.matches(state.regime);
      return {
        supports: !!rot,
        evidence: state.regime.evidence,
        contradictions: [],
      };
    },
  },
];

/**
 * Pure selector. UNKNOWN inputs propagate to UNKNOWN outputs with an
 * explanatory `reason`. Prior chapter is preserved for a bounded freshness
 * window when the current snapshot cannot resolve any chapter.
 */
export function selectMarketStory(
  state: CanonicalMarketState,
  history: readonly CanonicalMarketState[] = [],
  priorChapters: readonly ChapterEntry[] = [],
  configOverride?: Partial<StoryConfig>,
): StoryVM {
  const config: StoryConfig = {
    chapters: configOverride?.chapters ?? DEFAULT_GUARDS,
    matchers: configOverride?.matchers,
    atrExtractor: configOverride?.atrExtractor,
    freshnessMaxMs: configOverride?.freshnessMaxMs ?? 5 * 60_000,
    historyCap: configOverride?.historyCap ?? 6,
  };

  const scored = config.chapters.map((cm) => ({
    chapter: cm.chapter,
    ...cm.guard(state, history, config),
  }));
  const supported = scored.filter((s) => s.supports);

  const lastCurrent = priorChapters[priorChapters.length - 1];

  if (supported.length === 0) {
    // Preserve prior current chapter within freshness window
    if (lastCurrent && state.capturedAt - lastCurrent.enteredAt < config.freshnessMaxMs) {
      return {
        current: lastCurrent,
        recent: priorChapters.slice(-config.historyCap),
        resolution: "PARTIAL",
        reason: "No chapter transition supported; preserving prior chapter within freshness window",
      };
    }
    return {
      current: null,
      recent: priorChapters.slice(-config.historyCap),
      resolution: "UNKNOWN",
      reason:
        "Insufficient dimensions resolved to identify a chapter. Review evidence/contradictions on state.direction/regime/structure/etc.",
    };
  }

  // First-supported winner. Future work can add confidence scoring.
  const winner = supported[0];

  if (lastCurrent && lastCurrent.chapter === winner.chapter) {
    // Still in the same chapter — no transition, existing entry retained
    return {
      current: lastCurrent,
      recent: priorChapters.slice(-config.historyCap),
      resolution: "RESOLVED",
    };
  }

  // Transition to a new chapter
  const closed = lastCurrent
    ? [...priorChapters.slice(0, -1), { ...lastCurrent, exitedAt: state.capturedAt }]
    : priorChapters;
  const newEntry: ChapterEntry = {
    chapter: winner.chapter,
    enteredAt: state.capturedAt,
    resolution: "RESOLVED",
    evidence: winner.evidence,
    contradictions: winner.contradictions,
    reason: winner.reason,
  };
  return {
    current: newEntry,
    recent: [...closed, newEntry].slice(-config.historyCap),
    resolution: "RESOLVED",
  };
}
