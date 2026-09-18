/**
 * WHAT A HEADLINE ACTUALLY SAID — a tally, and never a score.
 *
 * /news read each headline for sentiment words and then printed the result as
 * a 0–100 number with a coloured meter under it. Three things were wrong with
 * that, and they compound.
 *
 * ── 1. THE EVIDENCE WAS COUNTED TWICE ────────────────────────────────────────
 *
 * `detectBullish` counted BULLISH_WORDS and BEARISH_WORDS and returned a
 * verdict. `scoreSentiment` then counted THE SAME TWO LISTS again at ±6 a word,
 * and added a further ±12 for `item.bullish` — which was `detectBullish`'s
 * answer, derived from the very same words. A headline with three bullish words
 * collected +18 for them and then +12 more BECAUSE of them.
 *
 * This is the same failure that once put eleven marks on a board of eight: one
 * observation, admitted through two doors, arriving as if it were two.
 *
 * Here the vocabulary is counted ONCE, and a caller cannot count it a second
 * time because a caller is never handed the words.
 *
 * ── 2. NO EVIDENCE WAS DRAWN AS A MEASUREMENT ────────────────────────────────
 *
 * `let score = 50; // neutral baseline`. A headline containing no sentiment
 * vocabulary at all scored 50 and rendered as a HALF-FULL bar labelled
 * "Neutral". That is H1, exactly: absence rendered as a value, and a fairly
 * confident-looking one.
 *
 * Worse, it collided with a real finding. A headline saying BOTH "record
 * inflows" AND "crash warning" also scored ~50 and also read "Neutral". Two
 * opposite states — nothing found, and conflicting evidence found — printed
 * the same number. A reader could not tell them apart, and the one that
 * matters to a trader is the second.
 *
 * This compiler keeps them apart by NAME: NO_VOCABULARY and CONFLICTED.
 *
 * ── 3. IT WAS A SCORE ────────────────────────────────────────────────────────
 *
 * §15. Nothing here adds up and nothing is out of 100. A count of matched words
 * is a fact that can be checked against the headline; "71" is not. The reading
 * is two integers and a direction, and the direction is decided by comparing
 * them — not by a threshold on a fabricated scale.
 *
 * ── WHAT THIS IS NOT ─────────────────────────────────────────────────────────
 *
 * A keyword tally is not a prediction, and the room that draws it must say so.
 * The word lists are crude on purpose — "lead", "clear", "top", "signal" and
 * "narrow" all appear in them, and all have innocent meanings in a headline.
 * That is an argument for showing the reader HOW LITTLE the house looked at,
 * not for hiding the tally behind a number that implies it looked at more.
 */

/**
 * The two lists, owned here.
 *
 * They lived in the route beside two separate functions that both walked them.
 * Vocabulary with two readers is vocabulary that will eventually be counted
 * twice, which is precisely what happened.
 */
const BULLISH_WORDS = [
  "surge", "beat", "upgrade", "raised", "rally", "accelerating", "record",
  "inflow", "positive", "lead", "clear", "strong", "gains", "jumps", "rises",
  "top", "growth", "bullish",
] as const;

const BEARISH_WORDS = [
  "drop", "fall", "concern", "underperform", "correction", "distribution",
  "weaken", "negative", "narrow", "signal", "declines", "falls", "losses",
  "crash", "warning", "bearish",
] as const;

/**
 * WHICH WAY THE WORDS LEAN — or that they did not, or that they disagreed.
 *
 * CONFLICTED and NO_VOCABULARY are separate members because the old surface
 * collapsed them into one word ("Neutral") and one number (50), and a trader
 * reading that could not tell "the house found nothing" from "the house found
 * both". They are not the same state and they never render the same.
 */
export type HeadlineLeanDirection = "BULLISH" | "BEARISH" | "CONFLICTED" | "NO_VOCABULARY";

export interface HeadlineLean {
  /** How many DISTINCT bullish terms matched. Never weighted, never scaled. */
  readonly bullish: number;
  /** How many DISTINCT bearish terms matched. */
  readonly bearish: number;
  readonly direction: HeadlineLeanDirection;
  /**
   * The total the two sides came from, so a surface can say how little the
   * house looked at without re-deriving it — and so nothing has to add the
   * two numbers itself and risk adding them differently.
   */
  readonly matched: number;
}

/** How many marks a band may draw per side. The reading may exceed it; see below. */
export const LEAN_SLOTS = 6;

/**
 * Read a headline.
 *
 * Returns `null` ONLY when there is no text to read — the house could not
 * look. A headline that WAS read and contained no sentiment vocabulary is a
 * FINDING and comes back as NO_VOCABULARY with two zeroes, because "we read it
 * and found nothing" and "there was nothing to read" are different facts and
 * the room draws them differently.
 */
export function selectHeadlineLean(text: string): HeadlineLean | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const lower = trimmed.toLowerCase();
  // `filter(...).length` counts each TERM at most once. A headline that repeats
  // "record" four times matched one bullish term, not four — repetition is a
  // property of the writing, not of the market.
  const bullish = BULLISH_WORDS.filter((w) => lower.includes(w)).length;
  const bearish = BEARISH_WORDS.filter((w) => lower.includes(w)).length;

  return {
    bullish,
    bearish,
    matched: bullish + bearish,
    direction: leanOf(bullish, bearish),
  };
}

/**
 * The direction, decided by COMPARING THE TWO COUNTS and nothing else.
 *
 * There is deliberately no margin here — no "bullish only if it leads by two",
 * which is what `detectBullish` used to require. A margin is a threshold, a
 * threshold is a hidden opinion, and the one in the old code was invisible to
 * the reader: a headline with 2 bullish and 1 bearish term reported NEUTRAL,
 * which is not what it said. If the reader wants to know how thin the lead is,
 * the band shows both sides and they can see it.
 */
function leanOf(bullish: number, bearish: number): HeadlineLeanDirection {
  if (bullish === 0 && bearish === 0) return "NO_VOCABULARY";
  if (bullish > bearish) return "BULLISH";
  if (bearish > bullish) return "BEARISH";
  return "CONFLICTED";
}
