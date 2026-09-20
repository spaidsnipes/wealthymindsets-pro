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
  /**
   * THIS DIMENSION IS UNRESOLVED BECAUSE THE VENUE CANNOT ANSWER IT — NOT
   * BECAUSE NOBODY HAS LOOKED YET.
   *
   * MEASURED LIVE, production /charts?symbol=TSLA. The regime chip said, truly:
   * "no per-trade tape has arrived, and this reading is measured trade by
   * trade. The candles cannot answer it." Three inches away, the ONE NEXT
   * THING cell said: "Resolve direction."
   *
   * Direction is ALSO measured trade by trade. It is exactly as unresolvable on
   * a yahoo candle feed as regime is. Commit 28b6cde8 taught the engine that a
   * COMPOSITION is not a debt the trader can pay; this field exists because
   * that was only half the law. `payableBy: "EVIDENCE"` says the node MINTS ITS
   * OWN EVIDENCE. It says nothing whatsoever about whether THIS FEED can supply
   * that evidence. So the impossible instruction did not go away — it moved one
   * node down the list, from regime to direction, and got harder to spot.
   *
   * WHO MAY SET THIS: only a deriver that was handed a publisher-authored
   * `evidenceGapNote`. That note is computed in chartMarketStatePublisher and
   * emitted ONLY when the publisher has seen BOTH lanes and established that
   * bars ARE loaded while the required lane is structurally absent. A deriver
   * cannot work this out alone — it sees one lane — which is exactly why it
   * must never raise this flag on its own initiative.
   *
   * ABSENT (`undefined`) MEANS "NOT ESTABLISHED", NOT "FALSE". A dimension that
   * is merely thin, early, or still filling must leave this unset. Defaulting
   * the other way would let ordinary transient silence masquerade as a
   * permanent venue limitation — the same false-certainty defect pointing in
   * the opposite direction.
   */
  venueBlocked?: boolean;
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
  /**
   * SECOND PRICE OWNER — the newest loaded BAR CLOSE, never a trade print.
   *
   * `price.last` means "a live trade printed at this price and we hold the
   * timestamped tick that proves it." With a cash session closed that is
   * correctly null — and /charts consequently rendered `PRICE UNKNOWN` in the
   * MARKET tile while the chart header eight pixels away rendered the last
   * candle's close beside HISTORICAL BARS VERIFIED. Two owners, one
   * instrument, one moment. Understating knowledge is a truth defect in the
   * same family as overclaiming it.
   *
   * This is a SEPARATE field, deliberately:
   *   - it is NOT part of `hasPrice`, so it can never promote qualityState
   *     to LIVE or satisfy the "LIVE requires price evidence" rule;
   *   - it carries its own timeframe, because a close without one is not a
   *     fact a trader can use;
   *   - `null` stays the honest answer when no bars are loaded.
   *
   * Produced only by `deriveLastBarClose`, whose input is the loaded candle
   * array. `ticker.price` is NOT an acceptable source: it can originate from
   * a REST quote or from the SYMBOL_SEEDS table, and publishing either as a
   * "verified bar close" would fabricate provenance (§35 PROTECTED TRUTH).
   */
  lastBar?: {
    close: number;
    barOpenedAtMs: number;
    timeframe: string;
  } | null;
  /**
   * THE PRICE BOOK'S EVIDENCE — a tail of PROVABLY CLOSED bar closes.
   *
   * `lastBar` above answers "what is the price". This answers "what has the
   * price been doing", and it exists because a room that must show a chart
   * cannot be handed a single number and told to draw one. The binding FL-04
   * plate puts a real price line with a labelled price axis and a labelled
   * session axis in the News room's companion; before this field, the only
   * shapes a non-chart surface could draw were the ones it already had data
   * for, and the companion shipped a CVD sparkline in the book's slot.
   *
   * Produced ONLY by `derivePriceTail`, whose endpoint delegates to
   * `deriveLastBarClose` — so the newest point in this tail and the value in
   * `lastBar` are the same bar by construction, not by coincidence. Two
   * owners of "which bar closed" is precisely what that delegation avoids.
   *
   * Like `lastBar`, it is deliberately OUTSIDE `hasPrice`: a loaded chart
   * history must never be able to promote a snapshot to LIVE or stand in for
   * a trade print.
   *
   * `null` is the honest answer whenever fewer than two bars have provably
   * closed. A one-point "line" is a claim of stillness the evidence never
   * made, and the renderer is given nothing rather than something to
   * interpolate.
   */
  priceTail?: {
    timeframe: string;
    points: readonly { t: number; c: number }[];
  } | null;
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

  // The bar close is validated on its OWN terms and is deliberately absent
  // from `hasPrice` above — it must never be able to promote a snapshot to
  // LIVE or stand in for a trade print. A close without a usable stamp or
  // timeframe is not a fact; reject rather than publish a half-fact.
  if (input.lastBar != null) {
    if (!positiveOrMissing(input.lastBar.close) || input.lastBar.close == null ||
        !validEpoch(input.lastBar.barOpenedAtMs) ||
        input.lastBar.barOpenedAtMs > input.capturedAt ||
        !input.lastBar.timeframe.trim()) {
      errors.push("Market State last-bar evidence is invalid.");
    }
  }

  // The price tail is validated as a SEQUENCE, not as a bag of numbers. Each
  // rule below is a way a price line can lie while every individual point
  // looks fine: an unordered array draws a scribble, a duplicated stamp draws
  // a vertical wall, a point past the capture instant draws the future, and a
  // lone point draws a flat line across a session that never was still.
  if (input.priceTail != null) {
    const tail = input.priceTail;
    const badPoint = tail.points.some(
      (p) =>
        !p ||
        !Number.isFinite(p.c) || p.c <= 0 ||
        !validEpoch(p.t) || p.t > input.capturedAt,
    );
    const unordered = tail.points.some((p, i) => i > 0 && p.t <= tail.points[i - 1]!.t);
    if (!tail.timeframe.trim() || tail.points.length < 2 || badPoint || unordered) {
      errors.push("Market State price-tail evidence is invalid.");
    }
  }

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

/**
 * THE EIGHT NAMED DIMENSIONS, in one place.
 *
 * `/command-deck` renders `0/8 dimensions resolved` from this count; any
 * claim about "all of WM's determinations" has to agree with it.
 */
export const MARKET_STATE_DIMENSION_KEYS = [
  "direction", "location", "aggression", "regime",
  "structure", "volatility", "profile", "orderFlow",
] as const;

export type MarketStateDimensionKey = (typeof MARKET_STATE_DIMENSION_KEYS)[number];

/**
 * THE ONE NAME A DIMENSION HAS ON EVERY SURFACE.
 *
 * The key list above already had one owner. The NAME did not — and the seven
 * one-word dimensions hid that, because `direction` and `Direction` differ only
 * by a capital nobody reads twice. `orderFlow` is the two-word one, so it is
 * where the disagreement finally became legible. FIVE owners, THREE spellings,
 * for one dimension:
 *
 *   surfaceLink.ts              "Order Flow"   (private DIMENSION_ORDER)
 *   selectMarketObjectPassport  "Order Flow"   (a second private DIMENSION_ORDER
 *                                               whose comment ADMITS it "Mirrors
 *                                               surfaceLink's" — a copy declared
 *                                               as a copy is still a copy)
 *   chartMarketStatePublisher   "Order flow"   (sentence case, into state.unknowns)
 *   selectMarketStory           "orderFlow"    (raw key, into trader prose)
 *   selectMarketCanvas          "orderFlow"    (raw key, into vm.resolved)
 *
 * The last two were OBSERVED LIVE on production /charts, inside one sentence:
 *   "…direction, regime, volatility, orderFlow unresolved; location,
 *    aggression, profile measured but not decision-grade."
 *
 * A camelCase field identifier is a machine's word for the thing. It reached
 * the trader because the surface that prints it never had to ask anyone what
 * the dimension is CALLED — it had the key in hand and the key looked close
 * enough. That is the chapter-name defect on the dimension axis: two owners,
 * one instrument, one moment, disagreeing about what the thing is NAMED.
 *
 * TOTAL over the key union ON PURPOSE. A ninth dimension added to
 * `CanonicalMarketState` fails the build here until somebody names it, rather
 * than silently leaking its identifier onto a surface the way `orderFlow` did.
 *
 * This map owns WHAT a dimension is called. It does not own how that name reads
 * mid-sentence — `inSentence` owns that, and prose call sites COMPOSE the two
 * rather than keeping a lowercase copy of this table.
 */
export const DIMENSION_NAMES: Record<MarketStateDimensionKey, string> = {
  direction: "Direction",
  location: "Location",
  aggression: "Aggression",
  regime: "Regime",
  structure: "Structure",
  volatility: "Volatility",
  profile: "Profile",
  orderFlow: "Order Flow",
};

/**
 * The name of a dimension, for any surface that has a key in hand.
 *
 * Falls back to de-camelCasing an unrecognised key rather than throwing: a
 * selector explaining a silence must not become a new source of noise. The
 * fallback Title-Cases nothing it was not already given — it only inserts the
 * space the identifier omitted — so an unnamed key still LOOKS like the raw
 * key it is, and discloses that nobody named it.
 */
export function dimensionName(key: string): string {
  return (
    DIMENSION_NAMES[key as MarketStateDimensionKey] ??
    key.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  );
}

/**
 * WHICH ABSENCE — the three buckets a dimension can be in, with ONE owner.
 *
 * FOUND FROM USE, production /charts?symbol=TSLA, 2026-09-18. One page, one
 * instant, one instrument, three numbers for "how much does WM know?":
 *
 *   DECISION rail        "No chapter resolved (1/8 dimensions resolved)"
 *   Canvas pill          "WAIT · 7 unresolved · 8 blockers · 1 cleared"
 *   MarketCanvasPanel     RESOLVED (4)  ·  UNRESOLVED (7)
 *
 * 7 + 4 = 11, for eight dimensions. THREE of them — location, aggression and
 * profile — were printed in BOTH adjacent columns of the same panel, in the
 * same frame. The pill's own tooltip said *"Location is unresolved until a
 * verified engine publishes evidence"* while the story sentence four lines
 * below it said *"location, aggression, profile measured but not
 * decision-grade."* Both were rendered from the same snapshot.
 *
 * WHY: `PARTIAL` fell through two different loose predicates and landed in both
 * buckets.
 *
 *   chartMarketStatePublisher   `resolution !== "RESOLVED"` → RESOLVED excluded,
 *                                PARTIAL swept into `state.unknowns`
 *   selectMarketCanvas          `resolution !== "UNKNOWN"`  → UNKNOWN excluded,
 *                                PARTIAL swept into `vm.resolved`
 *
 * Neither predicate is wrong on its own terms. They are complements of
 * DIFFERENT halves of a THREE-valued type, so their union is everything and
 * their intersection is PARTIAL. Two owners, one instrument, one moment,
 * disagreeing about whether a measurement exists at all: canon Weakness #1.
 *
 * `/command-deck` even printed the coincidence that hid this and reasoned it
 * away — "RESOLVED 4 of 8 … unknowns 4" — which is coherent only because that
 * BTC frame happened to carry ZERO partials. 4 + 4 = 8 was luck, not a rule,
 * the same way seven-of-eight one-word dimension keys was luck on the NAME axis.
 *
 * THE RULE ALREADY EXISTED AND HAD NO OWNER. `selectMarketStory.explainNoChapter`
 * shipped this exact distinction under the heading "WHICH ABSENCE, NOT JUST THAT
 * ONE EXISTS" — as a `const partial = unresolved.filter(...)` private to one
 * function. A correct rule that no other surface can ask for is not a rule; it
 * is one surface's good luck. Both call sites now ask HERE.
 *
 *   RESOLVED — WM committed to a value. Decision-grade.
 *   MEASURED — evidence WAS published; it is not decision-grade. Saying
 *              "unresolved" here sends the trader to wait for a measurement
 *              that has already been taken.
 *   MISSING  — nothing was measured. `value` is null by contract.
 */
export type DimensionStanding = "RESOLVED" | "MEASURED" | "MISSING";

/**
 * The standing of one dimension. TOTAL over `MarketStateResolution` by a
 * switch, so a fourth resolution fails the BUILD here rather than silently
 * picking a bucket — which is precisely how PARTIAL ended up in two of them.
 *
 * A missing dimension is MISSING, not a throw: a selector explaining a silence
 * must not become a new source of noise.
 */
export function dimensionStanding(
  dimension: { readonly resolution: MarketStateResolution } | null | undefined,
): DimensionStanding {
  if (!dimension) return "MISSING";
  switch (dimension.resolution) {
    case "RESOLVED":
      return "RESOLVED";
    case "PARTIAL":
      return "MEASURED";
    case "UNKNOWN":
      return "MISSING";
  }
}

/**
 * A VALUE PRINTED WITHOUT ITS STANDING READS AS A RESOLVED VALUE.
 *
 * Narratives across the view models rendered dimension values as
 * `${dim.value ?? "unresolved"}`. That fallback tests NULLISHNESS, and
 * **nullishness is not a standing**: `PARTIAL` is precisely the resolution that
 * CARRIES a value while not being decision-grade, so the `??` never fires for it
 * and the measured sentence comes out byte-for-byte identical to the committed
 * one:
 *
 *     direction RESOLVED "LONG" → "direction LONG"
 *     direction PARTIAL  "LONG" → "direction LONG"
 *
 * Two standings, ONE SENTENCE. The `??` labels the MISSING bucket and dresses the
 * MEASURED bucket in RESOLVED's clothes — the middle bucket again, disguised this
 * time as an identical sentence rather than as a loose predicate or a subtraction.
 *
 * `selectRegime` shipped a sharper form of the same mistake: `${volatility.value
 * ?? "resolved"}` printed the literal word **resolved** for a dimension that had
 * no reading at all. A fallback is not a place to name a standing you did not
 * check.
 *
 * THIS IS THE OWNER, for the same reason `dimensionStanding` is. A phrasing rule
 * that lives inside one selector is that selector's good luck; the next narrative
 * to be written will reach for `??` again. Both call sites now ask HERE, and the
 * switch is TOTAL over `DimensionStanding` so a fourth standing fails the BUILD.
 */
export function describeDimension(
  dimension: { readonly resolution: MarketStateResolution; readonly value: string | null } | null | undefined,
): string {
  switch (dimensionStanding(dimension)) {
    case "RESOLVED":
      return dimension?.value ?? "unresolved";
    case "MEASURED":
      // NAMED, not hedged. "measured" tells the trader the reading EXISTS and
      // that WM will not stake a decision on it — a different instruction from
      // "go wait for a measurement", which is what `?? "unresolved"` gives for a
      // measurement that has already been taken.
      return dimension?.value ? `${dimension.value} (measured, not decision-grade)` : "measured";
    case "MISSING":
      // `value` is null by contract here, so there is nothing to name.
      return "unresolved";
  }
}

/**
 * Partition the eight canonical dimensions into the three standings.
 *
 * DISJOINT AND TOTAL BY CONSTRUCTION — every key is pushed exactly once, in
 * canonical order, so no caller can produce a panel whose columns overlap. The
 * arithmetic a surface prints beside these lists (`4 of 8`, `7 unresolved`) is
 * therefore guaranteed to sum, which is the property that failed live.
 */
export function partitionDimensionStandings(
  state: Partial<Record<MarketStateDimensionKey, { readonly resolution: MarketStateResolution }>>,
): Record<DimensionStanding, readonly MarketStateDimensionKey[]> {
  const out: Record<DimensionStanding, MarketStateDimensionKey[]> = {
    RESOLVED: [],
    MEASURED: [],
    MISSING: [],
  };
  for (const key of MARKET_STATE_DIMENSION_KEYS) {
    out[dimensionStanding(state[key])].push(key);
  }
  return out;
}

export type ContradictionDetectability =
  /** Fewer than two determinations exist. Nothing COULD have disagreed. */
  | "NOTHING_TO_COMPARE"
  /** At least two determinations exist and were compared. */
  | "COMPARABLE";

export interface ContradictionClaim {
  /** Never a bare "0" unless two things existed that could have disagreed. */
  readonly value: string;
  readonly measured: boolean;
  readonly warn: boolean;
  /** Always states the INPUT — how many determinations there were to compare. */
  readonly detail: string;
  readonly detectability: ContradictionDetectability;
  readonly determinationCount: number;
}

/**
 * THE SINGLE WRITER for every contradiction claim WM makes.
 *
 * `/command-deck` Data Fidelity rendered `CONTRADICTIONS 0` as a bare number in
 * the OK tone, four pixels from `UNKNOWNS 8` in the watch tone. Read together
 * those two cells say: *WM determined very little, and found no disagreement in
 * what it determined.* The second half is not a finding.
 *
 * **A contradiction requires two determinations to disagree.** With zero or one
 * determination on the packet, `contradictions.length === 0` is arithmetic about
 * an empty set, not evidence of coherence — exactly the shape cured for GAPS in
 * `coverageMap.describeGapCoverage`. Same law, different cell.
 *
 * This deliberately does NOT invent contradiction detectors. LABEL-NOT-MODEL:
 * the cure for an overclaim is a disclosure sentence, never a fabricated
 * number and never a changed selector. Widening what WM cross-checks is real
 * work with real evidence requirements; it is not this commit.
 */
export function describeContradictionCoverage(state: {
  readonly contradictions: readonly string[];
  readonly price?: { readonly last: number | null } | null;
  readonly lastBar?: { readonly close: number } | null;
} & Partial<Record<(typeof MARKET_STATE_DIMENSION_KEYS)[number], MarketStateDimension>>,
): ContradictionClaim {
  // A "determination" is anything WM has actually committed to a value for.
  // Only those can disagree with one another.
  let determinationCount = 0;
  for (const key of MARKET_STATE_DIMENSION_KEYS) {
    if (state[key]?.resolution === "RESOLVED") determinationCount += 1;
  }
  if (state.price?.last != null) determinationCount += 1;
  if (state.lastBar?.close != null) determinationCount += 1;

  const found = state.contradictions.length;

  // An OBSERVED contradiction is always reportable, whatever the denominator.
  // Finding one proves at least two determinations existed to disagree.
  if (found > 0) {
    return {
      value: String(found),
      measured: true,
      warn: true,
      detail: `${found} contradiction${found === 1 ? "" : "s"} observed between WM's own determinations.`,
      detectability: "COMPARABLE",
      determinationCount,
    };
  }

  if (determinationCount < 2) {
    return {
      value: "n/a",
      measured: false,
      warn: false,
      detail:
        determinationCount === 0
          ? "WM has resolved nothing yet, so there is nothing that could contradict anything. " +
            "Zero contradictions here is not evidence of agreement."
          : "WM has resolved exactly one thing, and one determination cannot contradict itself. " +
            "Zero contradictions here is not evidence of agreement.",
      detectability: "NOTHING_TO_COMPARE",
      determinationCount,
    };
  }

  return {
    value: "0",
    measured: true,
    warn: false,
    detail: `${determinationCount} determinations were compared and none disagreed.`,
    detectability: "COMPARABLE",
    determinationCount,
  };
}

/** One sealed, outcome-free packet for all WM market-intelligence consumers. */
export function sealCanonicalMarketState(input: CanonicalMarketStateInput): CanonicalMarketState {
  const errors = validateCanonicalMarketState(input);
  if (errors.length) throw new Error(errors.join(" "));
  return deepFreeze({
    ...structuredClone(input),
    // Normalize at the seal so every SEALED packet carries the key explicitly.
    // The field is optional on the INPUT type purely so this stayed additive —
    // no existing producer or fixture had to be rewritten to adopt it — but a
    // consumer must never have to distinguish "absent" from "no bar close".
    lastBar: input.lastBar ?? null,
    // Same normalization, same reason: a consumer must never have to tell
    // "this producer has not been taught about price tails" apart from
    // "this instrument has no provably-closed history". Both render the
    // same honest absence; only one of them would tempt a reader to guess.
    priceTail: input.priceTail ?? null,
    schemaVersion: CANONICAL_MARKET_STATE_SCHEMA_VERSION,
    sealed: true,
  });
}
