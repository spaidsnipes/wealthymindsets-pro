import { PARTIAL_TAPE_PROVENANCES, type PriceSourceBadge } from "../priceSource";
import {
  FIDELITY_REASONS,
  MARKET_FIDELITIES,
  fidelityFromPipelineLabel,
  readMarketFidelity,
  type ExecutionOwnership,
  type FidelityReason,
  type MarketFidelity,
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
  readonly badge: Pick<PriceSourceBadge, "label" | "availability"> &
    Partial<Pick<PriceSourceBadge, "provenance">>;
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
  /**
   * What this surface KNOWS about execution for the price on its canvas —
   * required, so a caller cannot reach EXECUTABLE by omission. Found on
   * /charts 2026-09-26: without this input a fresh crypto tape printed
   * EXECUTABLE on the plaque while no execution adapter owned the canvas.
   * `null` means not established and folds exactly like `false`.
   */
  readonly execution: ExecutionOwnership | null;
  /**
   * The canonical market state's quality word — the SAME value the MARKET cell
   * prints beside the plaque. Optional: a surface with no canonical state
   * leaves it out and nothing changes. When present it CAPS the reading (see
   * `capByCanonicalQuality`): freshness is part of fidelity.
   */
  readonly canonicalQuality?: string | null;
}

/*
  ONE OWNER FOR "HOW GOOD IS THIS PRICE" (ruling 2026-10-09).

  Read on serving c9303a7 at 18:28 CDT, NQ1! 15m, one band:
      MARKET   STALE · asOf 6:28:16 PM CDT
      PLAQUE   INDICATIVE — a real observed price to read
  The MARKET cell reads the canonical market state; the plaque graded the chart
  surface badge. Two graders, one price, two answers. The canonical state is the
  owner: a price it calls STALE cannot be called a real observed price now.

  So the canonical word caps the fold. It only ever LOWERS a reading — a
  canonical LIVE never lifts a badge that graded lower — and it adds no
  fidelity of its own: STALE is STALE, a delayed feed is DEGRADED with the
  DELAYED reason, a partial or proxy feed is PARTIAL, replay carries its reason.
  UNAVAILABLE is deliberately not a cap: it grades the PRINT channel, and a
  chart carrying verified bars under it is already PARTIAL by the badge.
  CLOSED is not a cap either: a proven-closed session is graded by the badge
  itself (SESSION CLOSED — LAST VERIFIED folds to INDICATIVE), and the canonical
  word now says CLOSED from that same closure instead of STALE.
*/
export function capByCanonicalQuality(
  folded: { readonly fidelity: MarketFidelity; readonly reasons: readonly FidelityReason[] },
  canonicalQuality: string | null | undefined,
): { readonly fidelity: MarketFidelity; readonly reasons: readonly FidelityReason[] } {
  const q = typeof canonicalQuality === "string" ? canonicalQuality.trim().toUpperCase() : "";
  const strong = folded.fidelity === MARKET_FIDELITIES.INDICATIVE || folded.fidelity === MARKET_FIDELITIES.EXECUTABLE;
  const withReason = (reason: FidelityReason) =>
    folded.reasons.includes(reason) ? folded.reasons : [...folded.reasons, reason];
  switch (q) {
    case "STALE":
      return { fidelity: MARKET_FIDELITIES.STALE, reasons: folded.reasons };
    case "DELAYED":
      return strong ? { fidelity: MARKET_FIDELITIES.DEGRADED, reasons: withReason(FIDELITY_REASONS.DELAYED) } : folded;
    case "PARTIAL":
    case "PROXY":
      return strong ? { fidelity: MARKET_FIDELITIES.PARTIAL, reasons: folded.reasons } : folded;
    case "REPLAY":
      return { fidelity: folded.fidelity, reasons: withReason(FIDELITY_REASONS.REPLAY_FROZEN) };
    default:
      return folded;
  }
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
  // The badge's provenance is the only witness to the TAPE's scope: IEX is one
  // venue, and the plaque must say so rather than "No reason recorded".
  const partial = PARTIAL_TAPE_PROVENANCES.has(input.badge.provenance ?? "");
  const folded = capByCanonicalQuality(
    fidelityFromPipelineLabel(input.badge.label, input.execution, { partial }),
    input.canonicalQuality,
  );
  // readMarketFidelity performs the final refusal itself. Duplicating the
  // finiteness check here would put a second owner on "what counts as a
  // moment", so the null is passed straight through to the one that owns it.
  return readMarketFidelity(folded.fidelity, asOf, folded.reasons);
}

/**
 * WHY THERE IS NO READING — the same two refusals `readCanvasHonesty` makes,
 * named, so the plaque can say which question is open instead of a bare
 * "UNMEASURED" beside a feed that reads LIVE (serving b94f28c, 2026-10-09).
 *
 *   ASKING     the badge is still awaiting — bars have not settled
 *   NO_ANSWER  the badge is unavailable — nothing answered
 *   NO_MOMENT  graded, but the house holds no accept-site stamp to date it
 *
 * Returns null exactly when `readCanvasHonesty` returns a reading: the two are
 * one decision read twice, and the test holds them together.
 */
export type CanvasUngraded = "ASKING" | "NO_ANSWER" | "NO_MOMENT";

export function readCanvasUngraded(input: CanvasHonestyInput): CanvasUngraded | null {
  if (input.badge.availability === "awaiting") return "ASKING";
  if (input.badge.availability !== undefined) return "NO_ANSWER";
  return readCanvasHonesty(input) === null ? "NO_MOMENT" : null;
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
