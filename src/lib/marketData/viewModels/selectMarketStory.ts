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
// Value imports, deliberately. `dimensionName` owns WHAT a dimension is called;
// `inSentence` owns how a name reads mid-sentence. The prose below COMPOSES the
// two rather than keeping a private third rule — having no rule at all is how
// the raw key `orderFlow` reached a live trader in that sentence.
import { dimensionName } from "../canonicalMarketState";
import { inSentence } from "./decisionPermissionCompiler";
// Value import, deliberately: DEFAULT_MATCHERS must be built FROM the shipping
// producer's vocabulary, not from a retyped copy of it that can drift.
import { VOLATILITY_VERDICTS } from "../deriveVolatilityDimension";
import { REGIME_VERDICTS } from "../deriveRegimeDimension";

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

/**
 * THREE NAMES FOR ONE CHAPTER, ON SURFACES THE TRADER READS TOGETHER.
 *
 * ── The measured defect ───────────────────────────────────────────────────
 *
 * `StoryChapter` is a machine identifier. Four surfaces rendered it four
 * different ways, and at least three of them are visible at once on /charts:
 *
 *   StoryRibbon      "Open"              (a local Record, Title Case, ABBREVIATED)
 *   WhyInspector     "OPENING_AUCTION"   (raw enum, underscore and all)
 *   selectOneStory   "opening auction"   (raw enum .replace().toLowerCase())
 *   explainNoChapter "OPENING_AUCTION"   (raw enum, joined into prose)
 *
 * A trader who clicks the ribbon chip labelled **Open** to ask WHY is shown a
 * panel naming **OPENING_AUCTION**, while the story sentence beneath it says
 * **opening auction**. Nothing here is factually wrong and nothing disagrees
 * about the market — which is exactly why it survived this long. It is Canon
 * Weakness #1 in its quietest form: two owners, one instrument, one moment,
 * disagreeing about what the thing is CALLED. The trader cannot tell whether
 * they are looking at one chapter or three.
 *
 * ── Why the name lives HERE ───────────────────────────────────────────────
 *
 * In the module that owns the `StoryChapter` type, for the same reason
 * `inSentence` was moved down into `decisionPermissionCompiler`: a display
 * rule with two copies is a disagreement waiting for its first edit. Adding a
 * chapter to the union above now fails the build here until it is named,
 * rather than silently leaking `LIQUIDITY_VACUUM` onto a surface.
 *
 * ── What this function does NOT do ────────────────────────────────────────
 *
 * It has no opinion about casing. It returns the chapter's NAME in its
 * canonical Title Case form and stops. A surface that needs it mid-sentence
 * composes it with `inSentence` — the ONE casing rule, which lowers
 * `Trend Expansion` to `trend expansion` but leaves a future `VWAP Reclaim`
 * intact. Two rules, each owning one thing, composed at the call site. That
 * is deliberately NOT the same as a second copy of either rule.
 *
 * `Open` / `Close` are preserved from the ribbon's own map. They are the
 * Founder-facing short forms for a chip with ~10 characters of room, and they
 * are a NAMING decision, not a truncation this module is free to undo.
 */
export const CHAPTER_NAMES: Record<StoryChapter, string> = {
  OPENING_AUCTION: "Open",
  BALANCE: "Balance",
  COMPRESSION: "Compression",
  LIQUIDITY_PROBE: "Liquidity Probe",
  SWEEP: "Sweep",
  ABSORPTION: "Absorption",
  RECLAIM: "Reclaim",
  BREAKOUT: "Breakout",
  ACCEPTANCE: "Acceptance",
  TREND_EXPANSION: "Trend Expansion",
  ROTATION: "Rotation",
  VALUE_MIGRATION: "Value Migration",
  EXHAUSTION: "Exhaustion",
  CLOSING_AUCTION: "Close",
};

/**
 * The one name a chapter has on every surface.
 *
 * Falls back to de-underscoring an unrecognised chapter rather than throwing:
 * the config's `chapters` array is caller-extensible by design (see the
 * `StoryChapter` doc above), so an unnamed chapter is a legitimate state, and
 * a selector explaining a silence must not become a new source of noise.
 * Machine underscores never reach the trader either way.
 */
export function chapterName(chapter: string): string {
  return CHAPTER_NAMES[chapter as StoryChapter] ?? chapter.replace(/_/g, " ");
}

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
  // The regime producer's tokens happen to coincide with the bare adjectives
  // today, which is exactly what made the volatility break so easy to miss:
  // coincidence reads identically to contract until someone edits one side.
  // Referencing the producer's constants makes the dependency real.
  regime: {
    balance: looseMatch(["balance", "balanced", "range", "ranging", REGIME_VERDICTS.BALANCE]),
    trend: looseMatch(["trend", "trending", "trendup", "trenddown", REGIME_VERDICTS.TREND]),
    rotation: looseMatch(["rotation", "rotating", "meanreversion"]),
  },
  // VOCABULARY THE VOLATILITY PRODUCER ACTUALLY SPEAKS.
  //
  // `VOLATILITY_VERDICTS.LOW` is the string "LOW VOLATILITY", and looseMatch
  // compares whole normalized words — "lowvolatility" is not "low". So for as
  // long as this list held only the bare adjectives, `m.volatility.low` could
  // not match anything the shipping producer emits, the BALANCE guard's
  // `supports` was structurally false, and /command-deck printed UNKNOWN in its
  // largest type on every symbol in every session. Nothing threw and tsc stayed
  // green, because a matcher that matches nothing is indistinguishable from a
  // market that is not in that state.
  //
  // The producer's tokens are referenced by IMPORT rather than retyped, so the
  // two halves cannot silently drift again; volatilityVocabulary.test.ts locks
  // the correspondence in both directions. The bare adjectives stay because
  // DEFAULT_MATCHERS is documented as accepting common variants from producers
  // whose vocabulary is not known here.
  volatility: {
    low: looseMatch(["low", "compressed", "quiet", VOLATILITY_VERDICTS.LOW]),
    high: looseMatch(["high", "elevated", "expansion", VOLATILITY_VERDICTS.HIGH]),
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

/** The dimensions the shipping guards above actually read, in reading order. */
const GUARDED_DIMENSIONS = [
  "direction",
  "location",
  "aggression",
  "regime",
  "structure",
  "volatility",
  "profile",
  "orderFlow",
] as const;

/**
 * Say WHY no chapter resolved — measured from the snapshot, never asserted.
 *
 * The previous single hardcoded sentence claimed "Insufficient dimensions
 * resolved" for EVERY no-chapter outcome, including the case where every
 * dimension was RESOLVED and the guard table simply has no chapter for that
 * combination. It then sent the trader to "review evidence/contradictions on
 * state.direction/regime/structure" — evidence that may be perfectly
 * complete. A diagnosis that sounds specific and is not checked is a
 * fabricated diagnosis; §35 forbids it in the same breath as a fabricated
 * price. Observed live on /charts beside a chart badge reading a resolved
 * regime — two owners, one instrument, one moment.
 *
 * These are two genuinely different situations for a trader:
 *   - evidence is missing        → name exactly which dimensions, and wait;
 *   - evidence is complete       → the market is in a state this product has
 *                                  no chapter for, which is a MODEL gap, not
 *                                  a DATA gap, and no amount of waiting fixes
 *                                  it. Saying so is the honest answer.
 */
function explainNoChapter(
  state: CanonicalMarketState,
  history: readonly CanonicalMarketState[],
  config: StoryConfig,
): string {
  const unresolved = GUARDED_DIMENSIONS.filter(
    (name) => (state[name] as MarketStateDimension).resolution !== "RESOLVED",
  );

  if (unresolved.length === 0) {
    return (
      "All dimensions resolved, but no chapter guard matches this combination. " +
      "This is a model gap, not missing evidence — waiting will not resolve it."
    );
  }

  const resolvedCount = GUARDED_DIMENSIONS.length - unresolved.length;
  const { blocked, rejected } = partitionChaptersByEvidence(state, history, config, unresolved);

  // THE SENTENCE THIS FUNCTION USED TO PRINT, and why it was wrong.
  //
  // It named the unresolved dimensions and stopped, which reads as a CAUSE:
  // "no chapter resolved BECAUSE these are missing". That is an assertion, not
  // a measurement, and on production /command-deck BTC it was false. Five of
  // eight dimensions resolved there; the three that did not are location,
  // aggression and profile, and that venue publishes no per-bar volume, so
  // they never will. Meanwhile BALANCE, TREND_EXPANSION, SWEEP, BREAKOUT and
  // ROTATION had every input they need and simply did not match.
  //
  // Told "unresolved: location, aggression, profile", the trader waits for
  // evidence that is never coming, for chapters that were already decided.
  //
  // So the partition below is MEASURED, not declared: each guard is re-run
  // against a recording proxy and we observe which dimensions it actually
  // touched. A declared per-chapter dependency list would be a second place to
  // state one fact, and would drift silently the first time a guard body grew
  // a condition — the exact failure mode this codebase keeps finding.
  const parts = [
    `No chapter resolved (${resolvedCount}/${GUARDED_DIMENSIONS.length} dimensions resolved).`,
  ];
  if (rejected.length > 0) {
    parts.push(
      `${rejected.map(chapterName).join(", ")} had every input ${rejected.length === 1 ? "it needs" : "they need"} ` +
      `and did not match — more evidence will not change ${rejected.length === 1 ? "it" : "them"}.`,
    );
  }
  // WHICH ABSENCE, NOT JUST THAT ONE EXISTS.
  //
  // `unresolved` above is everything that is not RESOLVED, which collapses two
  // materially different states into the single word "unresolved":
  //
  //   UNKNOWN — nothing was measured. `value` is null by contract.
  //   PARTIAL — something WAS measured and published a value; it simply is not
  //             decision-grade, so no chapter guard will accept it.
  //
  // MEASURED LIVE on /charts TSLA 15m: the story printed "profile ...
  // unresolved" while 120 candles carrying real per-bar volume were drawn on
  // the same screen. Fed those exact production bars, the profile chain returns
  // PARTIAL / "DEFINED VALUE" with POC 360.40, VAH 364.05, VAL 355.00 off 401
  // populated buckets. The reading EXISTS. Calling it unresolved is Canon
  // Weakness #1 — two owners, one instrument, one instant, disagreeing about
  // whether evidence exists at all — and it sends the trader to wait for a
  // measurement that has already been taken.
  //
  // PER THE LEDGER: a sharper sentence must not become a stronger claim.
  // `unresolved` still drives `partitionChaptersByEvidence` unchanged, PARTIAL
  // still blocks every chapter it touches, and `resolvedCount` is untouched.
  // The only thing that changes is which word names which absence.
  const partial = unresolved.filter(
    (name) => (state[name] as MarketStateDimension).resolution === "PARTIAL",
  );
  const missing = unresolved.filter((name) => !partial.includes(name));

  // THE KEY IS NOT THE NAME. Observed live on production /charts TSLA:
  //
  //   "…direction, regime, volatility, orderFlow unresolved; location,
  //    aggression, profile measured but not decision-grade."
  //
  // Seven of the eight dimension keys are single lowercase words, which is
  // exactly why this survived: `direction` reads as English by accident. Only
  // the two-word one exposed that this sentence was printing FIELD IDENTIFIERS
  // and had simply been lucky seven times out of eight.
  const named = (keys: readonly string[]) =>
    keys.map((k) => inSentence(dimensionName(k))).join(", ");

  if (blocked.length > 0) {
    const causes: string[] = [];
    if (missing.length > 0) causes.push(`${named(missing)} unresolved`);
    if (partial.length > 0) {
      causes.push(
        `${named(partial)} measured but not decision-grade`,
      );
    }
    parts.push(
      `${blocked.map(chapterName).join(", ")} could not be evaluated: ${causes.join("; ")}.`,
    );
  }
  return parts.join(" ");
}

/**
 * WHICH CHAPTERS WERE DECIDED, AND WHICH WERE NEVER REACHED.
 *
 * Re-runs every guard against a proxy that records which dimensions it reads,
 * then splits the non-matching chapters in two:
 *
 *   blocked  — touched at least one unresolved dimension. Its verdict is not
 *              in yet, and more evidence could still change it.
 *   rejected — touched only resolved dimensions. Its verdict IS in. Waiting
 *              cannot change it, and implying otherwise is the fabricated
 *              diagnosis this whole function exists to refuse.
 *
 * Short-circuiting means a guard that failed on its first condition records
 * only that one. That is the right answer, not a limitation: it genuinely did
 * not need the rest to decide.
 *
 * A guard that throws is reported as blocked. A selector explaining a silence
 * must not become a second source of noise.
 */
function partitionChaptersByEvidence(
  state: CanonicalMarketState,
  history: readonly CanonicalMarketState[],
  config: StoryConfig,
  unresolved: readonly string[],
): { blocked: string[]; rejected: string[] } {
  const unresolvedSet = new Set<string>(unresolved);
  const blocked: string[] = [];
  const rejected: string[] = [];

  for (const cm of config.chapters) {
    const touched = new Set<string>();
    const recorder = new Proxy(state, {
      get(target, prop, receiver) {
        if (typeof prop === "string") touched.add(prop);
        return Reflect.get(target, prop, receiver);
      },
    });
    let supports = false;
    let threw = false;
    try {
      supports = cm.guard(recorder, history, config).supports;
    } catch {
      threw = true;
    }
    if (supports) continue;
    const hitUnresolved = [...touched].some((name) => unresolvedSet.has(name));
    (threw || hitUnresolved ? blocked : rejected).push(cm.chapter);
  }

  return { blocked, rejected };
}

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
      reason: explainNoChapter(state, history, config),
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
