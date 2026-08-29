/**
 * selectMarketCanvas — canon §Phase 3 Market Canvas compositor.
 *
 * The Market Canvas answers four questions in one place:
 *
 *   WHY?                — evidence supporting the primary story.
 *   WHY NOT?            — blockers reversing the RightOfWay verdict.
 *   MISSING?            — unresolved dimensions (canonical UNKNOWN).
 *   WHAT WOULD INVALIDATE? — observations that would flip an ACTION verdict.
 *
 * Individual selectors already own each corner of the canvas:
 *   - The WHY side lives in WhyInspector's evidence panels (per-target).
 *   - selectDecisionWhyNot owns the WHY NOT + WHAT WOULD INVALIDATE sides.
 *   - CanonicalMarketState.unknowns owns the MISSING side.
 *
 * This selector *composes* those sources into one canonical VM so any
 * Phase 3 canvas surface renders the SAME shape without re-deriving.
 * It never invents facts of its own; if an input is silent the
 * corresponding field is empty (canon §Silence Is A Feature).
 *
 * PURE — no React, no I/O, no clock.
 */

import type { CanonicalMarketState } from "../canonicalMarketState";
import type { DecisionWhyVM } from "./selectDecisionWhyNot";

export const MARKET_CANVAS_VERSION = "wm.market-canvas.v1" as const;

export interface MarketCanvasVM {
  readonly version: typeof MARKET_CANVAS_VERSION;
  /**
   * The current RightOfWay verdict as sourced from the WhyNot compiler.
   * "UNKNOWN" when no decision has been compiled yet — canon-honest.
   */
  readonly verdict: DecisionWhyVM["verdict"];
  /**
   * True only when the decision cleared (RightOfWay = ACTION). Keeps
   * downstream renderers from re-deriving the boolean everywhere.
   */
  readonly clear: boolean;
  /**
   * One honest headline for the entire canvas. Sourced from the WhyNot
   * headline when a decision is compiled; otherwise a fallback that
   * names the vacuum ("no snapshot yet").
   */
  readonly headline: string;
  /**
   * The MISSING panel — unresolved dimensions the canonical snapshot
   * publishes. Empty when the snapshot resolved everything OR when
   * there is no snapshot yet (silent — a caller can decide whether
   * silent means "nothing missing" or "no snapshot" by inspecting
   * hasSnapshot).
   */
  readonly missing: readonly string[];
  /**
   * The RESOLVED panel — symmetric with MISSING. Names each
   * canonical dimension the snapshot has RESOLVED (or PARTIAL).
   * A dimension appears here iff its resolution is not UNKNOWN.
   *
   * Founder-visible closure of the four-corner canvas: MISSING says
   * what we don't know; RESOLVED says what we do. Both are honest,
   * both are silent when the input is silent (canon §Silence).
   */
  readonly resolved: readonly string[];
  /**
   * The WHY NOT panel — blocker labels from the compiled DecisionWhy.
   * Ordered by severity (HARD_RULE first). Empty on ACTION.
   */
  readonly blockers: readonly string[];
  /**
   * The WHAT WOULD INVALIDATE panel — populates only for ACTION
   * verdicts. Same content as DecisionWhyVM.invalidators.
   */
  readonly invalidators: readonly string[];
  /**
   * Whether a canonical snapshot was supplied at all. Consumers can
   * render "no snapshot" chrome distinctly from "snapshot with nothing
   * missing" (both leave missing[] empty — canon §Silence Is A Feature
   * requires the caller be able to tell them apart).
   */
  readonly hasSnapshot: boolean;
}

/**
 * Compose the Market Canvas VM from what the deck already knows.
 * Both inputs may be null — the selector returns a valid, silent VM
 * so callers never crash on partial data.
 */
export function selectMarketCanvas(
  state: CanonicalMarketState | null,
  whyNot: DecisionWhyVM | null,
): MarketCanvasVM {
  const hasSnapshot = state != null;
  const missing = state ? [...state.unknowns] : [];

  // Symmetric to `missing`: name each canonical dimension whose
  // resolution is RESOLVED or PARTIAL (i.e., not UNKNOWN). The order
  // matches CanonicalMarketState's canonical dimension ordering.
  const resolved: string[] = [];
  if (state) {
    const dims: readonly (readonly [string, { resolution: string } | undefined])[] = [
      ["direction", state.direction],
      ["location", state.location],
      ["aggression", state.aggression],
      ["regime", state.regime],
      ["structure", state.structure],
      ["volatility", state.volatility],
      ["profile", state.profile],
      ["orderFlow", state.orderFlow],
    ];
    for (const [name, dim] of dims) {
      if (dim && dim.resolution !== "UNKNOWN") resolved.push(name);
    }
  }
  const verdict = whyNot?.verdict ?? "UNKNOWN";
  const clear = whyNot?.clear === true;
  const blockers = whyNot ? whyNot.blockers.map((b) => b.label) : [];
  const invalidators = whyNot ? [...whyNot.invalidators] : [];

  let headline: string;
  if (whyNot) {
    headline = whyNot.headline;
  } else if (!hasSnapshot) {
    headline = "No market snapshot yet — canvas is unresolved.";
  } else {
    headline = "Snapshot present — decision has not compiled yet.";
  }

  return {
    version: MARKET_CANVAS_VERSION,
    verdict,
    clear,
    headline,
    missing,
    resolved,
    blockers,
    invalidators,
    hasSnapshot,
  };
}

export default selectMarketCanvas;
