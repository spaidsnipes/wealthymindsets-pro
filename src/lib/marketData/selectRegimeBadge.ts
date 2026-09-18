/**
 * The REGIME chip on /charts — what it may claim, and when it must stay quiet.
 *
 * OBSERVED LIVE 2026-09-05 on the Founder's screen: "REGIME SIDE -0.34% today"
 * on a Saturday, with the US session closed. Two separate untruths in one
 * 9-point chip, from this call site:
 *
 *   const p = Number.isFinite(ticker.changePct) ? ticker.changePct : 0;
 *   const reg = p > 1.5 ? "BULL" : p < -1.5 ? "BEAR" : "SIDE";
 *
 * 1. THE `: 0` FALLBACK FABRICATES. When no quote has arrived, changePct is
 *    not finite, p becomes 0, and the chip renders "+0.00% today" — a number
 *    the market never produced — and then classifies the regime as "SIDE",
 *    which is a fabricated MARKET STATE derived from the absence of data.
 *    Missing is not flat. The comment above that code asserted "REAL data
 *    only ... nothing fabricated here", which is the property it violated.
 *
 * 2. "today" IS WRONG WHEN THE SESSION IS CLOSED. On a Saturday the change
 *    being shown is the last completed session's, not today's. Canon §8 bans
 *    stale-as-live, and a date word is a liveness claim.
 *
 * The sibling BottomIndexBar already had (1) right — it renders an em-dash
 * without a verified quote. Same screen, same defect class, opposite outcome,
 * because the guard lived in a component instead of in a shared owner. That
 * is the argument for this file existing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SECOND OBSERVATION, 2026-09-05, AFTER THE FIRST FIX SHIPPED. The chip read:
 *
 *   REGIME  SIDE  +0.00% last session      ← this owner
 *   4,476.60  — (change unavailable)       ← the header price line, one row down
 *
 * The date word was repaired. The fabrication was not. Two owners on one screen
 * disagreed about whether a change existed at all.
 *
 * ROOT CAUSE — I wrote the wrong guard, and the right one already existed.
 * `useWebSocket.flush()` only writes change/changePct once prevCloseRef holds a
 * REAL prior close; until then it leaves BOTH at their initial 0. So in this
 * ticker shape the absence sentinel IS the literal zero, not undefined. A
 * finiteness check cannot see that — 0 is perfectly finite — so `SIDE` was
 * still being classified out of silence, just via a different door.
 *
 * selectTickerChangeDisplay is the canonical owner of exactly this question and
 * says so in its header: "ONE guard for every day-change display ... Five sites
 * each re-implemented that check and four got it wrong." Hand-rolling
 * finiteness here made this the sixth site and the fifth mistake. It now
 * delegates, which is also why it must receive `change` — the zero-pair is only
 * visible when you can see both numbers.
 *
 * The consequence is deliberate: an exactly-zero change is withheld even if it
 * is genuinely flat, because the current ticker shape cannot tell the two
 * apart. Omitting a regime until price moves is honest. Naming a market state
 * on unknown data is not.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIRD OBSERVATION, 2026-09-15, photographed on the Founder's /charts screen.
 * Both earlier defects stayed fixed. A third one was sitting above them, and it
 * is not about the number at all — it is about the WORD.
 *
 *   REGIME  BEAR  -2.62% today          ← this owner, top-centre of the chart
 *   ...
 *   NOW · No chapter resolved. Unresolved: direction, location, aggression,
 *         REGIME, structure, volatility, profile, orderFlow
 *         (0/8 dimensions resolved).   ← the evidence rail, same screen
 *   NEXT · Resolve regime — regime is the first of 9 unpaid evidence nodes.
 *
 * One screen. One instant. One symbol. The chip NAMES the regime while the rail
 * says regime is unresolved AND withholds right-of-way because of it. The
 * trader is told to go resolve a thing the same screen has already answered.
 *
 * THESE ARE NOT THE SAME QUESTION, AND THAT IS THE WHOLE BUG.
 *
 *   this chip        BULL / BEAR / SIDE    from the DAY CHANGE PERCENT
 *   canon dimension  TREND / BALANCE       from CLASSIFIED PER-TRADE TAPE
 *                                          (see deriveRegimeDimension.ts)
 *
 * Different inputs, different vocabularies, different evidence standards — and
 * one reserved word stretched across both. This is the ErrorBoundary law again:
 *
 *     TWO OWNERS UNDER ONE NAME IS A COIN FLIP, NOT A DUPLICATE.
 *
 * And its consequence here:
 *
 *     A DAY-CHANGE PERCENT IS NOT A MARKET REGIME. LABEL WHAT YOU MEASURED.
 *
 * So this owner stops impersonating the canonical dimension. Its own verdict is
 * published as DAY BIAS — which is exactly and only what a day-change band is —
 * and the canonical regime dimension is carried THROUGH this selector so the
 * one chip states both, consistently, or states that canon has not resolved.
 *
 * `canonRegime` is REQUIRED, for the same reason `change` is: a caller that can
 * omit it is a caller that can silently reopen the contradiction. The chip may
 * not render at all without being handed the dimension it must not contradict.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FOURTH OBSERVATION, 2026-09-17, read out of the live DOM on /charts, NQ1! 30m.
 * The word fix from the third observation is holding. The chip rendered:
 *
 *   DAY BIAS · BULL · +2.52% today · REGIME · UNRESOLVED
 *
 * and every one of those six spans came back as `[text, "", ""]` — no `title`,
 * no `aria-label`, on the spans and on the wrapper alike.
 *
 * So the distinction this file exists to draw — that BULL is a band over a
 * day-change percent and has never looked at the tape, while REGIME is a
 * different question with a different evidence standard that nobody has
 * answered yet — is stated nowhere the trader can reach it. It lives in these
 * comments. On screen, two verdict words sit side by side, one confident and
 * one refusing, with nothing saying why they are allowed to differ. A trader
 * who reads that as one instrument contradicting itself is reading exactly
 * what is rendered.
 *
 * AND THE USUAL REPAIR IS UNAVAILABLE HERE. The chip is an overlay carrying
 * `pointerEvents: "none"` so the crosshair keeps working underneath it. A
 * `title` on a pointer-events-none element is never reachable by any pointer —
 * adding one would look like a fix in the diff and be unreachable in the
 * product. That is why this owner publishes `spoken` and the chip carries it
 * as an ACCESSIBLE NAME: the one channel that does not depend on hovering
 * something the page has deliberately made unhoverable.
 */

import { provenSessionClosure } from "./canonicalIdentity";
import { selectTickerChangeDisplay } from "./selectTickerChangeDisplay";
import type { MarketStateDimension } from "./canonicalMarketState";

export type RegimeClass = "BULL" | "BEAR" | "SIDE";

/**
 * The word this chip is allowed to put on its own verdict. It is a constant and
 * it is exported so the Sentinel can assert the rendered label comes from here
 * rather than from a string literal typed back into the component.
 *
 * It is NOT "REGIME". That word belongs to the canonical dimension, which is
 * derived from classified per-trade tape and speaks TREND / BALANCE.
 */
export const DAY_BIAS_LABEL = "DAY BIAS";

/** What the canonical regime dimension says, carried through unchanged. */
export type CanonRegimeView =
  | { readonly resolved: true; readonly value: string }
  | { readonly resolved: false };

/**
 * `null` means "no period word". Used before mount, when the clock has not
 * been read and neither "today" nor "last session" is established. Rendering
 * the bare percentage is true in every case, and the label can only sharpen
 * once the client settles — it never has to retract.
 */
export type RegimePeriodLabel = "today" | "last session" | null;

export type RegimeBadgeView =
  | { readonly displayable: false }
  | {
      readonly displayable: true;
      readonly regime: RegimeClass;
      readonly changePct: number;
      readonly periodLabel: RegimePeriodLabel;
      /**
       * The label the chip must print over `regime`. Always DAY_BIAS_LABEL —
       * a field rather than a component-side literal so the Sentinel can pin
       * the rendered word to this owner.
       */
      readonly verdictLabel: typeof DAY_BIAS_LABEL;
      /** The canonical regime dimension, so one chip cannot contradict it. */
      readonly canon: CanonRegimeView;
      /**
       * The chip's ACCESSIBLE NAME — the whole reading in one sentence, plus
       * the reason its two verdict words are allowed to differ.
       *
       * Not a `title`: this chip is a `pointerEvents: "none"` overlay, so a
       * hover tooltip on it can never be reached. See the fourth observation
       * in this file's header.
       */
      readonly spoken: string;
    };

export interface RegimeBadgeInput {
  /** Raw off the ticker — deliberately `unknown`, because the bug was trusting it. */
  readonly changePct: unknown;
  /**
   * The absolute change, also raw. REQUIRED, not optional: the "no reference
   * close yet" signature is `change === 0 && changePct === 0`, and it is
   * invisible to a caller that only forwards the percentage. Making this
   * optional would let a call site silently reopen the bug by omitting it.
   */
  readonly change: unknown;
  readonly symbol: string;
  /** `null` before mount / on the server. Never read the clock during render. */
  readonly at: Date | null;
  /**
   * The canonical regime dimension for this instrument, or `null` when no
   * canonical state exists yet. REQUIRED — see this file's third-observation
   * note. The chip must be handed the authority it is forbidden to contradict;
   * a caller free to omit it is a caller free to reopen the contradiction.
   */
  readonly canonRegime: MarketStateDimension | null;
}

/** Same +/-1.5% thresholds as the Markov state model this chip mirrors. */
const BULL_THRESHOLD = 1.5;
const BEAR_THRESHOLD = -1.5;

export function selectRegimeBadge(input: RegimeBadgeInput): RegimeBadgeView {
  // No `: 0` fallback, and no hand-rolled finiteness check either. Both were
  // wrong here: the first fabricated a percentage, the second let the upstream
  // zero-pair sentinel through and fabricated a market state instead. There is
  // exactly one owner of "is this change backed by a real reference close".
  const change = selectTickerChangeDisplay({
    change: typeof input.change === "number" ? input.change : null,
    changePct: typeof input.changePct === "number" ? input.changePct : null,
  });
  if (!change.displayable) return { displayable: false };

  const pct = change.changePct;
  const regime: RegimeClass =
    pct > BULL_THRESHOLD ? "BULL" : pct < BEAR_THRESHOLD ? "BEAR" : "SIDE";

  const periodLabel = selectRegimePeriodLabel(input.symbol, input.at);
  const canon = selectCanonRegimeView(input.canonRegime);

  return {
    displayable: true,
    regime,
    changePct: pct,
    periodLabel,
    verdictLabel: DAY_BIAS_LABEL,
    canon,
    spoken: speak(input.symbol, regime, pct, periodLabel, canon),
  };
}

/**
 * One sentence per claim, and one sentence explaining why the two verdict
 * words on this chip are allowed to differ.
 *
 * The order matters: the reading first, then what it was measured FROM, then
 * canon's separate answer. A trader who stops after the first sentence has
 * heard something true; a trader who hears all three knows that BULL beside
 * UNRESOLVED is two questions, not a contradiction.
 */
function speak(
  symbol: string,
  regime: RegimeClass,
  pct: number,
  periodLabel: RegimePeriodLabel,
  canon: CanonRegimeView,
): string {
  const move = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%${periodLabel ? ` ${periodLabel}` : ""}`;
  return (
    `${symbol} day bias ${regime}, from a change of ${move}. ` +
    `Day bias is a band over that day-change percent only — it has not read ` +
    `the tape. Market regime is a different question, derived from classified ` +
    `per-trade tape, and ` +
    (canon.resolved
      ? `it says ${canon.value}.`
      : `it is not resolved yet, which is why no regime word is shown beside it.`)
  );
}

/**
 * Canon is quoted, never paraphrased and never softened. A dimension counts as
 * resolved ONLY when it says RESOLVED *and* carries a value — canonicalMarketState
 * already treats a valueless RESOLVED as an invalid state, and this chip is not
 * the place to start tolerating one. PARTIAL is not resolved: the rail renders
 * PARTIAL as an open evidence node, so treating it as an answer here would
 * recreate the exact contradiction this field exists to prevent.
 */
export function selectCanonRegimeView(dimension: MarketStateDimension | null): CanonRegimeView {
  if (!dimension || dimension.resolution !== "RESOLVED") return { resolved: false };
  const value = dimension.value?.trim();
  if (!value) return { resolved: false };
  return { resolved: true, value };
}

/**
 * Exported for the Sentinel and for any surface that needs the period word
 * without the regime. Delegates closure to the one owner of the weekend rules
 * so a future holiday calendar lands here and in the badges simultaneously.
 */
export function selectRegimePeriodLabel(symbol: string, at: Date | null): RegimePeriodLabel {
  if (!at) return null;
  return provenSessionClosure(symbol, at) === false ? "last session" : "today";
}
