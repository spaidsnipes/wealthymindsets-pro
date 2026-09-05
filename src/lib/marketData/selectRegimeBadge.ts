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
 */

import { provenSessionClosure } from "./canonicalIdentity";
import { selectTickerChangeDisplay } from "./selectTickerChangeDisplay";

export type RegimeClass = "BULL" | "BEAR" | "SIDE";

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

  return {
    displayable: true,
    regime,
    changePct: pct,
    periodLabel: selectRegimePeriodLabel(input.symbol, input.at),
  };
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
