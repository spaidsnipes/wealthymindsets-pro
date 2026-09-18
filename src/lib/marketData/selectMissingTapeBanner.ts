/**
 * selectMissingTapeBanner — say the missing input ONCE, and name what it costs.
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE MEASURED FAILURE (2026-09-17, observed live on /charts, NQ1!)
 *
 * The Smart Money drawer rendered six tiles. FIVE of them were re-explaining
 * one single fact — that NQ1! carries no aggressor-tagged tape — each in its
 * own paragraph, each in its own voice:
 *
 *   DELTA DOMINATION  "No source WM reads signs a buy/sell side for futures,
 *                      so there is no tug-of-war to measure on NQ1!…"
 *   TAPE PRESSURE     "No aggressor-tagged tape is available, so pressure is
 *                      unavailable."
 *   DELTA BUBBLES     "No per-trade buy/sell tape on this feed — bubbles appear
 *                      the moment real aggressor flow arrives…"
 *   VALUE CANDLE      "no trade volume observed — value cannot be located"
 *   DELTA DIVERGENCE  "not enough aggressive tape to trace a delta path"
 *
 * Every one of those sentences is TRUE, and each is correct in isolation —
 * this module does not fix any of them, because there is nothing wrong with
 * any of them. The defect is EMERGENT: it exists only because they are all
 * rendered at once. A trader scrolling that drawer reads the same bad news
 * five times and has to work out, unaided, that it is one piece of bad news
 * and not five independent failures. Five absences look like a broken
 * product. One named absence with five consequences is a diagnosis.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHAT THIS OWNS
 *
 * The DRAWER-LEVEL fact: one input is missing, and here is everything
 * downstream of it. It owns the aggregation and nothing else.
 *
 * It does NOT own the sentence. `aggressorTapeReason` already derives that
 * from `classifySymbol` + `capabilityRegistry`, and the whole point of this
 * exercise is to stop having second opinions about one fact — so the sentence
 * is passed through verbatim. If this file paraphrased it, the drawer would
 * have gained a sixth voice while removing four.
 */

import { aggressorTapeReason, type AggressorTapeReason } from "./aggressorTapeReason";

export interface MissingTapeBannerVM {
  /** The class this symbol was read as — carried through for attribution. */
  readonly assetClass: AggressorTapeReason["assetClass"];
  /** NOT_CARRIED / NOT_FLOWING / UNRECOGNISED — carried through, never re-derived. */
  readonly kind: AggressorTapeReason["kind"];
  /** The name of the input that is absent. The headline of the banner. */
  readonly missingInput: string;
  /** The reason sentence, VERBATIM from `aggressorTapeReason`. Never rewritten. */
  readonly sentence: string;
  /**
   * The readings in this drawer that cannot be taken because the input above
   * is missing. Order is the caller's — it is the reading order on screen, and
   * a trader scanning the list should find them in the order they will meet
   * them. Duplicates are dropped: the same reading named twice would recreate
   * in miniature the exact repetition this banner exists to remove.
   */
  readonly blockedReadings: readonly string[];
  /** blockedReadings.length, so a caller never counts a list it was handed. */
  readonly blockedCount: number;
}

/**
 * Compose the drawer's one missing-input statement.
 *
 * Returns null when a signed tape IS flowing — in exactly the same condition
 * as `aggressorTapeReason`, because it IS that call. A banner that could
 * outlive the absence it describes would be the worst possible version of
 * this: a permanent warning about a problem that had gone away.
 */
export function selectMissingTapeBanner(args: {
  readonly symbol: string;
  readonly hasSignedTape: boolean;
  /** Names of the readings this drawer cannot take without a signed tape. */
  readonly blockedReadings: readonly string[];
}): MissingTapeBannerVM | null {
  const reason = aggressorTapeReason(args.symbol, args.hasSignedTape);
  if (reason === null) return null;

  // Dedupe while preserving first-seen order. Not a Set spread, because a Set
  // would also silently accept the empty string as a reading name.
  const seen = new Set<string>();
  const blockedReadings: string[] = [];
  for (const raw of args.blockedReadings) {
    const name = raw.trim();
    if (name === "" || seen.has(name)) continue;
    seen.add(name);
    blockedReadings.push(name);
  }

  return {
    assetClass: reason.assetClass,
    kind: reason.kind,
    missingInput: "AGGRESSOR-TAGGED TAPE",
    sentence: reason.sentence,
    blockedReadings,
    blockedCount: blockedReadings.length,
  };
}
