/**
 * selectCLC — M27. CONTEXT + LOCATION + CONFIRMATION.
 *
 * CORRECTED DEFINITION (verified against src/app/education/page.tsx and
 * src/app/backtesting/page.tsx in the repo, 2026-08-12):
 *
 *   CLC = Context + Location + Confirmation
 *     CONTEXT      — broader market / EMA / regime evidence
 *     LOCATION     — ATR / structure / appropriate setup geography
 *     CONFIRMATION — volume + live tape reading
 *
 * CLC is a SETUP / RULE framework. It is NOT a decorative probability
 * badge, and it is NOT "Confluence + Alignment + Catalyst" (an earlier
 * invented definition that has been retracted).
 *
 * Journal semantics preserved: "CLC Long" / "CLC Short" are real setup
 * names in src/app/journal/page.tsx.
 *
 * Verdicts: CLC_LONG | CLC_SHORT | WAIT | INVALID | UNKNOWN.
 */

import type { CanonicalMarketState, MarketStateEvidenceRef, MarketStateResolution } from "../canonicalMarketState";
import { selectDLAR, type DLARVM, type SelectDLARInput } from "./selectDLAR";

export type CLCVerdict = "CLC_LONG" | "CLC_SHORT" | "WAIT" | "INVALID" | "UNKNOWN";
export type LegVerdict = "SATISFIED" | "PARTIAL" | "NOT_SATISFIED" | "UNKNOWN";

export interface CLCLeg {
  readonly leg: "CONTEXT" | "LOCATION" | "CONFIRMATION";
  readonly verdict: LegVerdict;
  readonly summary: string;
  readonly evidence: readonly MarketStateEvidenceRef[];
  readonly contradictions: readonly string[];
  readonly unknowns: readonly string[];
}

export interface CLCVM {
  readonly verdict: CLCVerdict;
  readonly resolution: MarketStateResolution;
  readonly context: CLCLeg;
  readonly location: CLCLeg;
  readonly confirmation: CLCLeg;
  /** All three legs must be SATISFIED for a CLC_LONG / CLC_SHORT. */
  readonly satisfiedLegs: number;
  readonly narrative: string;
  readonly reason?: string;
  readonly capturedAt: number;
}

export interface SelectCLCInput extends SelectDLARInput {
  /** Optional pre-computed DLAR to avoid recomputation. */
  readonly dlar?: DLARVM;
  /** Confirmation requires participation evidence — this gates it. */
  readonly signedOrderFlowCoverage?: number | null; // 0..1, portion of trades with valid aggressor
  /** Minimum signed coverage before CONFIRMATION can be SATISFIED. Default 0.5. */
  readonly minSignedCoverage?: number;
}

export function selectCLC(input: SelectCLCInput): CLCVM {
  const { state } = input;
  const dlar = input.dlar ?? selectDLAR(input);
  const minCoverage = input.minSignedCoverage ?? 0.5;

  // ── CONTEXT — broader market / EMA / regime ───────────────────────────
  const contextResolved = state.regime.resolution === "RESOLVED" && state.direction.resolution === "RESOLVED";
  const contextPartial = state.regime.resolution !== "UNKNOWN" || state.direction.resolution !== "UNKNOWN";
  const context: CLCLeg = {
    leg: "CONTEXT",
    verdict: contextResolved ? "SATISFIED" : contextPartial ? "PARTIAL" : "UNKNOWN",
    summary: contextResolved
      ? `Regime ${state.regime.value}, direction ${state.direction.value}`
      : contextPartial
        ? `Regime ${state.regime.value ?? "unresolved"}, direction ${state.direction.value ?? "unresolved"}`
        : "No regime or direction evidence",
    evidence: [...state.regime.evidence, ...state.direction.evidence],
    contradictions: [...state.regime.contradictions, ...state.direction.contradictions],
    unknowns: [...state.regime.unknowns, ...state.direction.unknowns],
  };

  // ── LOCATION — ATR / structure / setup geography ──────────────────────
  const locationResolved = state.location.resolution === "RESOLVED" && state.structure.resolution === "RESOLVED";
  const locationPartial = state.location.resolution !== "UNKNOWN" || state.structure.resolution !== "UNKNOWN";
  const location: CLCLeg = {
    leg: "LOCATION",
    verdict: locationResolved ? "SATISFIED" : locationPartial ? "PARTIAL" : "UNKNOWN",
    summary: locationResolved
      ? `At ${state.location.value} with structure ${state.structure.value}`
      : locationPartial
        ? `Location ${state.location.value ?? "unresolved"}, structure ${state.structure.value ?? "unresolved"}`
        : "No location or structure evidence",
    evidence: [...state.location.evidence, ...state.structure.evidence],
    contradictions: [...state.location.contradictions, ...state.structure.contradictions],
    unknowns: [...state.location.unknowns, ...state.structure.unknowns],
  };

  // ── CONFIRMATION — volume + live tape ─────────────────────────────────
  // Per Founder: Confirmation = volume + live tape reading. This CANNOT
  // be satisfied by inference — it requires actual observed participation.
  const coverage = input.signedOrderFlowCoverage ?? null;
  const coverageOk = coverage != null && coverage >= minCoverage;
  const orderFlowResolved = state.orderFlow.resolution === "RESOLVED";
  const responseKnown = dlar.response.verdict !== "UNKNOWN";

  let confirmationVerdict: LegVerdict;
  let confirmationSummary: string;
  const confirmationContradictions = [...state.orderFlow.contradictions, ...dlar.response.contradictions];

  if (coverage == null) {
    confirmationVerdict = "UNKNOWN";
    confirmationSummary = "Signed order-flow coverage unknown — cannot confirm participation";
  } else if (!coverageOk) {
    confirmationVerdict = "NOT_SATISFIED";
    confirmationSummary = `Only ${Math.round(coverage * 100)}% of trades carry a valid aggressor side (need ${Math.round(minCoverage * 100)}%). Tape cannot confirm.`;
    confirmationContradictions.push("Insufficient signed classification coverage for confirmation");
  } else if (orderFlowResolved && responseKnown && dlar.response.verdict === "RESPONDING") {
    confirmationVerdict = "SATISFIED";
    confirmationSummary = `Order flow resolved with ${Math.round(coverage * 100)}% signed coverage; price is responding to participation`;
  } else if (dlar.response.verdict === "ABSORBED") {
    confirmationVerdict = "NOT_SATISFIED";
    confirmationSummary = "Aggression is being absorbed — participation is not producing progress";
    confirmationContradictions.push("Absorption contradicts confirmation");
  } else if (dlar.response.verdict === "FADING") {
    confirmationVerdict = "NOT_SATISFIED";
    confirmationSummary = "Price fading against the aggression — confirmation failed";
    confirmationContradictions.push("Fade contradicts confirmation");
  } else {
    confirmationVerdict = "PARTIAL";
    confirmationSummary = `Coverage ${Math.round(coverage * 100)}% is adequate, but order flow ${state.orderFlow.resolution.toLowerCase()} and response ${dlar.response.verdict.toLowerCase()}`;
  }

  const confirmation: CLCLeg = {
    leg: "CONFIRMATION",
    verdict: confirmationVerdict,
    summary: confirmationSummary,
    evidence: [...state.orderFlow.evidence, ...dlar.response.evidence],
    contradictions: confirmationContradictions,
    unknowns: state.orderFlow.unknowns,
  };

  // ── Verdict ───────────────────────────────────────────────────────────
  const legs = [context, location, confirmation];
  const satisfiedLegs = legs.filter((l) => l.verdict === "SATISFIED").length;
  const anyUnknown = legs.some((l) => l.verdict === "UNKNOWN");
  const anyNotSatisfied = legs.some((l) => l.verdict === "NOT_SATISFIED");

  let verdict: CLCVerdict;
  let reason: string | undefined;

  if (satisfiedLegs === 3) {
    // All three legs satisfied — direction decides long vs short
    const dirValue = state.direction.value?.toLowerCase() ?? "";
    const isLong = dirValue.includes("long") || dirValue.includes("up") || dirValue.includes("bull");
    const isShort = dirValue.includes("short") || dirValue.includes("down") || dirValue.includes("bear");
    if (isLong) {
      verdict = "CLC_LONG";
    } else if (isShort) {
      verdict = "CLC_SHORT";
    } else {
      verdict = "WAIT";
      reason = `All three CLC legs satisfied but direction value "${state.direction.value}" is not recognizably long or short`;
    }
  } else if (anyNotSatisfied) {
    verdict = "INVALID";
    const failed = legs.filter((l) => l.verdict === "NOT_SATISFIED").map((l) => l.leg);
    reason = `${failed.join(" and ")} not satisfied — setup is invalid, not merely early`;
  } else if (anyUnknown) {
    verdict = "UNKNOWN";
    const unknown = legs.filter((l) => l.verdict === "UNKNOWN").map((l) => l.leg);
    reason = `${unknown.join(" and ")} unresolved — insufficient evidence to judge the setup`;
  } else {
    verdict = "WAIT";
    reason = `${satisfiedLegs} of 3 legs satisfied — setup forming but not yet complete`;
  }

  const resolution: MarketStateResolution =
    satisfiedLegs === 3 ? "RESOLVED" : anyUnknown && satisfiedLegs === 0 ? "UNKNOWN" : "PARTIAL";

  const narrative = [
    `Context: ${context.summary}`,
    `Location: ${location.summary}`,
    `Confirmation: ${confirmation.summary}`,
  ].join(" · ");

  return {
    verdict,
    resolution,
    context,
    location,
    confirmation,
    satisfiedLegs,
    narrative,
    reason,
    capturedAt: state.capturedAt,
  };
}
