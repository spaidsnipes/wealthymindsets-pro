/**
 * deriveRegimeDimension — compose the sealed DIRECTION and VOLATILITY
 * dimensions into the CanonicalMarketState regime dimension.
 *
 * WHY THIS EXISTS (real from-USE defect, 2026-09-10): /command-deck's hero
 * word — the single largest element on the Founder's lead browser surface —
 * comes from selectMarketStory, and EVERY cheap chapter guard in that engine
 * (BALANCE, TREND_EXPANSION, ROTATION) gates on `state.regime`. Regime was
 * hard-coded unresolved, so the story engine could never support a chapter,
 * so the hero printed "UNKNOWN" for every symbol, in every session, forever.
 * Sealing Direction alone does not move that word. Regime does.
 *
 * THIS PRODUCER INVENTS NO EVIDENCE. It is a pure COMPOSITION of two
 * dimensions that were already sealed from the per-trade tape:
 *
 *   direction RESOLVED (net drift dominates the observed range)  → TREND
 *   direction PARTIAL on sufficient tape (drift retraced)        → BALANCE
 *   anything thinner                                             → PARTIAL/UNKNOWN
 *
 * Its evidence array is the UNION of its inputs' evidence — it never mints a
 * fresh evidence ref, because it made no fresh observation. Its confidence is
 * the MINIMUM of its inputs' confidence: a composition cannot be more certain
 * than the least certain thing it is composed from.
 *
 * Vocabulary is "TREND" / "BALANCE" because selectMarketStory's DEFAULT_MATCHERS
 * accept exactly those tokens (looseMatch on trend|trending|… and
 * balance|balanced|range|ranging). A value outside that vocabulary would seal
 * the dimension while leaving the hero UNKNOWN — silent failure.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A COMPOSITION MUST NOT LAUNDER ITS INPUTS' FINDINGS INTO A DEFAULT.
 *
 * Measured on production /charts?symbol=TSLA, 12:17:39Z. Commit 487a24fd had
 * just taught direction and volatility to stop saying "No verified price
 * evidence supplied at snapshot time" over a fully-drawn chart, and to say the
 * true thing instead: candles ARE loaded, the PER-TRADE TAPE is what is absent,
 * and this reading is measured trade by trade, so the candles cannot answer it.
 *
 * On /charts both of those legs are UNKNOWN — that is the whole point of the
 * finding. And this producer's first branch answered that case with a MODULE
 * CONSTANT: "No verified direction or volatility evidence supplied at snapshot
 * time." The sharpened sentence was computed, carried into this function on
 * both inputs, and then thrown away one line later.
 *
 * The damage is not cosmetic, because regime is the dimension the Founder's
 * chip prints in large type and the dimension the NEXT cell used to point at.
 * The trader was told the regime is unknown "at snapshot time" — a phrase that
 * reads as TRANSIENT, as though a later snapshot would carry it. On this venue
 * no later snapshot ever will. That is not a pending state, it is a standing
 * property of the feed, and it was being reported as the former.
 *
 * So the UNKNOWN branch now carries its inputs' own unknowns, in order,
 * de-duplicated, and falls back to the constant ONLY when neither leg
 * explained itself. A composition may summarise its inputs. It may not
 * overwrite them with something it made up, however true that thing is in
 * general — the specific sentence was RIGHT THERE.
 *
 * NOT DONE HERE, ON PURPOSE: this producer still does not know WHY its inputs
 * are silent, and it must not learn. Only the publisher sees both lanes (see
 * the evidenceGapNote pattern in chartMarketStatePublisher). This branch
 * forwards; it does not author.
 */

import type { MarketStateDimension } from "./canonicalMarketState";
import { DIRECTION_RESOLVE_MIN_TRADES } from "./deriveDirectionDimension";

const UNKNOWN_DIMENSION: MarketStateDimension = {
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: ["No verified direction or volatility evidence supplied at snapshot time."],
};

/** Regime needs at least as much tape as direction does — it is composed of it. */
export const REGIME_RESOLVE_MIN_TRADES = DIRECTION_RESOLVE_MIN_TRADES;

/**
 * THE ENTIRE VOCABULARY THIS PRODUCER CAN EMIT.
 *
 * The doc above already says the vocabulary must be readable by
 * selectMarketStory's DEFAULT_MATCHERS — but a sentence in a comment is not a
 * guard. The volatility dimension carried exactly the same instruction and
 * still shipped "LOW VOLATILITY" against a matcher listening for "low", which
 * made the BALANCE chapter structurally unreachable while tsc stayed at exit 0
 * and every test stayed green (fixed 51d6fa3).
 *
 * Naming the vocabulary as data lets DEFAULT_MATCHERS be built FROM it and lets
 * one Sentinel assert the correspondence in both directions, so the next person
 * to reword "TREND" into "TRENDING UP" gets a red test instead of a silently
 * dead hero word.
 */
export const REGIME_VERDICTS = {
  TREND: "TREND",
  BALANCE: "BALANCE",
} as const;

export type RegimeVerdict = (typeof REGIME_VERDICTS)[keyof typeof REGIME_VERDICTS];

export interface DeriveRegimeInput {
  readonly direction: MarketStateDimension;
  readonly volatility: MarketStateDimension;
  /** Count of classified per-trade ticks behind both inputs. */
  readonly tradeCount: number;
}

function minConfidence(a: MarketStateDimension, b: MarketStateDimension): number | null {
  const xs = [a.confidence, b.confidence].filter(
    (c): c is number => typeof c === "number" && Number.isFinite(c),
  );
  if (xs.length === 0) return null;
  return Math.min(...xs);
}

function unionEvidence(a: MarketStateDimension, b: MarketStateDimension) {
  return [...a.evidence, ...b.evidence];
}

function unionContradictions(a: MarketStateDimension, b: MarketStateDimension) {
  return [...a.contradictions, ...b.contradictions];
}

/**
 * The inputs' own explanations for their silence, direction first, blanks
 * dropped, duplicates collapsed.
 *
 * DE-DUPLICATION IS THE POINT, not tidiness. Both legs are fed the SAME
 * publisher-authored gap note (chartMarketStatePublisher computes it once
 * precisely so the two sentences cannot drift), so the naive union prints the
 * identical paragraph twice and the surface reads like a stutter. Collapsing
 * on exact text keeps two genuinely DIFFERENT explanations — the case where
 * direction and volatility are silent for unrelated reasons — as two lines.
 */
function carryUnknowns(
  direction: MarketStateDimension,
  volatility: MarketStateDimension,
): readonly string[] {
  const out: string[] = [];
  for (const note of [...direction.unknowns, ...volatility.unknowns]) {
    const text = note.trim();
    if (text.length === 0 || out.includes(text)) continue;
    out.push(text);
  }
  return out;
}

export function deriveRegimeDimension(input: DeriveRegimeInput): MarketStateDimension {
  const { direction, volatility, tradeCount } = input;

  // No tape at all behind either input → the honest answer is silence, spoken
  // in the INPUTS' OWN WORDS. See "A COMPOSITION MUST NOT LAUNDER ITS INPUTS'
  // FINDINGS INTO A DEFAULT" in this file's header.
  if (direction.resolution === "UNKNOWN" && volatility.resolution === "UNKNOWN") {
    const carried = carryUnknowns(direction, volatility);
    return carried.length > 0 ? { ...UNKNOWN_DIMENSION, unknowns: carried } : UNKNOWN_DIMENSION;
  }

  // Regime is a claim about HOW the market is behaving. Both legs must be
  // established before that claim is admissible: without a range read a
  // "trend" is just a line, and without a drift read a "balance" is just
  // an absence of information.
  if (volatility.resolution !== "RESOLVED" || tradeCount < REGIME_RESOLVE_MIN_TRADES) {
    return {
      resolution: "PARTIAL",
      value: null,
      confidence: 0,
      evidence: unionEvidence(direction, volatility),
      contradictions: unionContradictions(direction, volatility),
      unknowns: [
        `Regime needs a sealed volatility read and at least ${REGIME_RESOLVE_MIN_TRADES} classified trades — observed ${tradeCount}.`,
      ],
    };
  }

  if (direction.resolution === "RESOLVED") {
    return {
      resolution: "RESOLVED",
      value: REGIME_VERDICTS.TREND,
      confidence: minConfidence(direction, volatility),
      evidence: unionEvidence(direction, volatility),
      contradictions: unionContradictions(direction, volatility),
      unknowns: [],
    };
  }

  if (direction.resolution === "PARTIAL") {
    // Sufficient tape, sealed range, and the drift failed to dominate it —
    // that is the definition of two-sided trade. BALANCE is a positive
    // finding here, not a fallback for "we don't know".
    return {
      resolution: "RESOLVED",
      value: REGIME_VERDICTS.BALANCE,
      confidence: minConfidence(direction, volatility) ?? volatility.confidence,
      evidence: unionEvidence(direction, volatility),
      contradictions: unionContradictions(direction, volatility),
      unknowns: [],
    };
  }

  // direction UNKNOWN while volatility RESOLVED: the tape carried prices but
  // no orderable sequence. Do not guess.
  return {
    resolution: "PARTIAL",
    value: null,
    confidence: 0,
    evidence: unionEvidence(direction, volatility),
    contradictions: unionContradictions(direction, volatility),
    unknowns: ["Direction is unresolved, so the regime cannot be characterised."],
  };
}
