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
 */

import { provenSessionClosure } from "./canonicalIdentity";

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
  readonly symbol: string;
  /** `null` before mount / on the server. Never read the clock during render. */
  readonly at: Date | null;
}

/** Same +/-1.5% thresholds as the Markov state model this chip mirrors. */
const BULL_THRESHOLD = 1.5;
const BEAR_THRESHOLD = -1.5;

export function selectRegimeBadge(input: RegimeBadgeInput): RegimeBadgeView {
  const raw = input.changePct;
  // No `: 0` fallback, on purpose. An unverified change has no regime, and
  // substituting zero is what manufactured "SIDE" out of silence.
  if (typeof raw !== "number" || !Number.isFinite(raw)) return { displayable: false };

  const regime: RegimeClass =
    raw > BULL_THRESHOLD ? "BULL" : raw < BEAR_THRESHOLD ? "BEAR" : "SIDE";

  return {
    displayable: true,
    regime,
    changePct: raw,
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
