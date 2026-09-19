import type { PriceSourceBadge } from "../priceSource";
import {
  fidelityFromPipelineLabel,
  readMarketFidelity,
  type MarketFidelityReading,
} from "./marketFidelityAlgebra";

/*
  ONE CANVAS, ONE MOMENT.

  ── THE DEFECT THIS EXISTS TO CLOSE ─────────────────────────────────────────

  Measured live on wealthymindsetspro.com/charts, BTC, 2026-09-19, against
  serving worker version 72a69e89-ade5-4bd0-aa6b-c1db362de484. One decision
  rail, two adjacent cells, read:

      MARKET    BTC · 15m · 81040.288 LAST 15m BAR CLOSE
                NO LIVE PRINT · asOf 22:32:10Z
      HONESTY   UNMEASURED
                No fidelity has been established for this canvas.

  Both sentences were produced by honest code and their COMPOSITION was false.
  The MARKET cell names a moment. The plaque, inches away, says no moment has
  been established. The trader is told simultaneously that the house observed
  this canvas at 22:32:10Z and that it never observed it at all.

  ── ROOT CAUSE: THE WRONG CLOCK, NOT A MISSING ONE ──────────────────────────

  The transplanted plaque was fed `lastObservedAtMs` from the transport hook.
  That ref is written at the TICK accept sites and nowhere else, so on a canvas
  carrying verified bars and no live print it is `null` for the whole session.
  `readMarketFidelity` then does exactly what it is built to do — it REFUSES a
  non-finite asOf rather than inventing one — and the plaque correctly renders
  its unmeasured state.

  The refusal was right. The input was wrong. The house had an accept-site
  stamp the entire time: `capturedAt` on the canonical market state, which is
  the very stamp the MARKET cell one cell to the left was already printing.

  ── THE RULE ────────────────────────────────────────────────────────────────

  THE PLAQUE NAMES THE MOMENT THE RAIL NAMES. `capturedAt` is preferred, not
  because it is fresher — it may not be — but because it is the SAME FACT the
  neighbouring cell renders, and two clocks on one rail is how the two come to
  disagree. `lastObservedAtMs` remains a lawful fallback for surfaces whose
  evidence is the tape rather than the canvas.

  Two things this deliberately does NOT do:

  (1) It does not synthesise a moment. If neither stamp is finite the function
      returns null and the plaque says UNMEASURED — which is then the true
      answer, not an artifact of reading the wrong clock. `Date.now()` never
      appears here; stamping now over an unobserved canvas is precisely the
      ff40d5f defect the algebra module was built to make impossible.

  (2) It does not upgrade the WORD. The fidelity still comes from
      `fidelityFromPipelineLabel`, the one sanctioned crossing from the seven
      pipeline labels into the five fidelities. Handing the reading a better
      clock changes WHEN the house claims to have looked, never WHAT it claims
      to have seen. On the measured canvas above the honest result is PARTIAL
      — bars verified, quote absent — and PARTIAL is what this returns.

  And it keeps the first refusal intact: an `awaiting` / `unavailable` badge
  has no observation to grade at all, and folding an unfinished question into a
  fidelity word would manufacture a measurement. That branch yields null before
  any clock is consulted.

  ── WHY IT IS A FUNCTION ────────────────────────────────────────────────────

  It was four lines inside a `React.useMemo` in a 4,000-line dashboard, which
  is the same as saying it was untestable. The falsifier that matters — a
  canvas with a capture stamp and no live print must NOT read UNMEASURED — can
  only be written against something callable.
*/

/** Everything the reading is allowed to be built from. No clock of its own. */
export interface CanvasHonestyInput {
  /**
   * The ONE grading of this canvas. Passed in rather than re-derived: a
   * surface that grades twice is two writers of one claim, and that is the
   * mechanism behind a chip reading ACTIVE DEGRADED beside a plaque reading
   * EXECUTABLE about one instrument at one instant.
   */
  readonly badge: Pick<PriceSourceBadge, "label" | "availability">;
  /**
   * The canonical market state's accept-site stamp — the same value the
   * MARKET cell renders as `asOf`. Preferred, so the rail speaks once.
   */
  readonly capturedAtMs: number | null | undefined;
  /**
   * The transport's per-print accept-site stamp. Fallback only: it is null on
   * every canvas that has bars and no live tape, which is most of them.
   */
  readonly observedAtMs: number | null | undefined;
}

/**
 * The reading, or a refusal. Never a default.
 *
 * Returns null in exactly two cases, and both are honest UNMEASURED states
 * rather than failures: the badge has not finished asking, or the house holds
 * no accept-site stamp for this canvas at all.
 */
export function readCanvasHonesty(input: CanvasHonestyInput): MarketFidelityReading | null {
  // An open question has no answer to grade. This is checked before the
  // clocks because a stamp does not rescue a question nobody has answered.
  if (input.badge.availability !== undefined) return null;

  const asOf = firstFiniteMoment(input.capturedAtMs, input.observedAtMs);
  const folded = fidelityFromPipelineLabel(input.badge.label);
  // readMarketFidelity performs the final refusal itself. Duplicating the
  // finiteness check here would put a second owner on "what counts as a
  // moment", so the null is passed straight through to the one that owns it.
  return readMarketFidelity(folded.fidelity, asOf, folded.reasons);
}

/**
 * Named rather than inlined so the PREFERENCE ORDER is a visible decision.
 * `??` would be wrong: a stamp of `0` or `NaN` is present-but-unusable, and
 * nullish-coalescing would hand it onward as if it were an observation.
 */
function firstFiniteMoment(...candidates: readonly (number | null | undefined)[]): number | null {
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }
  return null;
}
