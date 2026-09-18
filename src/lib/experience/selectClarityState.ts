/**
 * selectClarityState — the trader's INTERNAL OPERATING STATE, compiled from
 * owners that already exist, and honest about the part of it nobody owns.
 *
 * ── Where this comes from ────────────────────────────────────────────────────
 *
 * CLARITY STATE appears in five of the Founder's canvas mockups, and in the
 * full OS Overview it is a first-class organ sitting beside the Market Object
 * Passport and Evidence Debt. The Overview draws it as four bars:
 *
 *     MENTAL CLARITY           82%  FOCUSED
 *     EMOTIONAL NOISE          18%  LOW
 *     DECISION ALIGNMENT       91%  HIGH
 *     PHYSIOLOGICAL COHERENCE  76%  STABLE
 *     ────────────────────────────────────────
 *     OVERALL CLARITY          79%  OPTIMAL
 *     STATE: IN FLOW · DISTRACTIONS LOCKED OUT
 *
 * ── The reason this file is not that ─────────────────────────────────────────
 *
 * LIVING-PIXEL LAW: every pixel has a real owner. Take the four bars one at a
 * time and ask who in this codebase could possibly know the number.
 *
 *   MENTAL CLARITY — owned. "How much of the read is settled" is exactly the
 *     evidence ledger, and `computeEvidenceDebt` already reduces it. Kept, and
 *     renamed to EVIDENCE CLARITY, because the thing being measured is the
 *     state of the EVIDENCE, not the state of a mind. The mockup's name claims
 *     a subject the measurement does not have.
 *
 *   EMOTIONAL NOISE — NOT owned as stated, but there is a real neighbour. The
 *     OS knows how loud the SCREEN is (`selectSecondaryNoise` — whether the
 *     non-decision surfaces are quieted). Screen noise is a real, measured,
 *     WM-owned quantity. Emotional noise is a claim about a human being that no
 *     part of this product can observe. So this compiles SCREEN NOISE and says
 *     so in its own label. A renamed measurement is not a smaller product; an
 *     unrenamed one is a lie with a progress bar.
 *
 *   DECISION ALIGNMENT — owned, but NOT as a percentage. Right of Way is already
 *     guaranteed by construction (decisionPermissionCompiler rule 1) never to
 *     say ACTION while evidence is missing. A percentage of a guarantee is
 *     decoration: it can only ever read 100% or be measuring something else. So
 *     alignment is carried as a NAMED verdict, which is what it actually is.
 *
 *   PHYSIOLOGICAL COHERENCE — NOT OWNED. There is no heart-rate input, no HRV,
 *     no wearable, no sensor of any kind anywhere in this product. 76% is a
 *     number with no source. It is not rendered, it is not estimated from a
 *     proxy, and it is not quietly dropped either — it is carried in
 *     `unownedComponents` so the surface can DISCLOSE the gap instead of the
 *     screen silently implying the OS is measuring the trader's body.
 *
 * ── The law this file exists to hold ─────────────────────────────────────────
 *
 * AN INPUT NOBODY OWNS MAY NEVER RAISE CLARITY.
 *
 * That is the single invariant worth having here, and it is asserted directly.
 * The failure mode it forbids is specific and it is the one every dashboard
 * commits: unavailable data is skipped, the average is taken over what remains,
 * and the missing input silently makes the score BETTER than the evidence
 * supports. Here, missing inputs cannot touch the state at all — they can only
 * lower `confidence` and add a disclosure.
 *
 * ── Not a new owner (§24) ────────────────────────────────────────────────────
 *
 * This module stores nothing, fetches nothing, and decides no facts. It is a
 * PROJECTION of `computeEvidenceDebt`, `computeRightOfWay` and
 * `selectSecondaryNoise`. If it ever disagrees with one of them, the owner is
 * right and this file has a bug.
 *
 * PURE — no React, no I/O, no clock, no store.
 */

import type { EvidenceDebt, RightOfWayReading } from "../marketData/viewModels/decisionPermissionCompiler";
import type { SecondaryNoiseVM } from "./selectSecondaryNoise";

export const CLARITY_STATE_VERSION = "wm.clarity-state.v1" as const;

/**
 * The vocabulary. Four states, and the fourth is the one that makes the other
 * three trustworthy.
 *
 * Deliberately NOT the mockup's "IN FLOW" / "OPTIMAL". Those describe a person.
 * These describe a READ, which is the thing the inputs are actually about.
 */
export type ClarityLevel =
  /** No ledger has been evaluated. The OS cannot say, and says that. */
  | "UNMEASURED"
  /** Evidence is missing. Whatever else is true, the read is not clear. */
  | "CLOUDED"
  /** Evidence is paid but something is flagged. Clear enough to see, not to act. */
  | "CONTESTED"
  /** Evidence paid, nothing flagged, right of way resolved. */
  | "CLEAR";

export const CLARITY_LEVELS: readonly ClarityLevel[] = [
  "UNMEASURED",
  "CLOUDED",
  "CONTESTED",
  "CLEAR",
] as const;

/**
 * Ranked worst-to-best, and used by `atMost` so that DEGRADING is a single
 * comparison rather than a cascade of ifs that a future edit can reorder.
 */
const RANK: Readonly<Record<ClarityLevel, number>> = {
  UNMEASURED: 0,
  CLOUDED: 1,
  CONTESTED: 2,
  CLEAR: 3,
};

/** A measured component with a named owner. */
export interface ClarityComponent {
  /** Label as it should appear on a surface. Names the MEASUREMENT, not a mood. */
  readonly label: string;
  /** 0–100, rounded. Present only when a real owner produced it. */
  readonly percent: number;
  /** Short human reading — what the percent means. */
  readonly reading: string;
  /** The module that owns this number. Printed so a reader can go check. */
  readonly source: string;
}

/** A component the mockup asks for that this product cannot measure. */
export interface UnownedComponent {
  readonly label: string;
  /** Why there is no number. Stated plainly enough to render verbatim. */
  readonly reason: string;
}

export interface ClarityStateVM {
  readonly version: typeof CLARITY_STATE_VERSION;
  readonly level: ClarityLevel;
  /** Short verdict line for a tile header. */
  readonly value: string;
  /** One sentence naming WHY the level is what it is. */
  readonly detail: string;
  /** Components with real owners, in render order. */
  readonly components: readonly ClarityComponent[];
  /**
   * Components the canon names that nothing here can measure.
   *
   * NEVER empty-by-accident: if a surface renders Clarity State at all it is
   * expected to render these too. An OS that quietly omits what it cannot see
   * is indistinguishable from one that thinks it sees everything.
   */
  readonly unownedComponents: readonly UnownedComponent[];
  /**
   * Components this product DOES own, whose input this call site did not supply.
   *
   * Distinct from `unownedComponents` and the distinction matters to a reader:
   * "no biometric sensor exists" is a permanent property of WM Pro, while
   * "screen noise was not supplied here" is a property of THIS SCREEN and could
   * be fixed by wiring it. Collapsing the two would tell a trader a fixable gap
   * is permanent.
   */
  readonly unsuppliedComponents: readonly UnownedComponent[];
  /**
   * The size of the asked-for picture — the confidence DENOMINATOR.
   *
   * Published so no surface re-derives it. A denominator computed from the
   * components that happened to arrive is the defect this field exists to make
   * unreachable.
   */
  readonly askedFor: number;
  /**
   * How much of the asked-for picture is actually measured, 0–100.
   *
   * This is the ONLY place an unowned input is allowed to have an effect, and
   * the effect is always downward. Distinct from `level`: a read can be
   * perfectly CLEAR on the evidence while confidence is low because two of the
   * four requested components have no source.
   */
  readonly confidence: number;
  /** True when anything requested could not be measured. */
  readonly hasDisclosure: boolean;
}

function pct(numerator: number, denominator: number): number {
  if (!(denominator > 0)) return 0;
  return Math.round((numerator / denominator) * 100);
}

/** Degrade-only combinator. Can never raise a level, by construction. */
function atMost(current: ClarityLevel, ceiling: ClarityLevel): ClarityLevel {
  return RANK[ceiling] < RANK[current] ? ceiling : current;
}

/**
 * The components the Founder's OS Overview asks for which this product has no
 * sensor for. Exported so the enforcement test can assert the list is non-empty
 * — the day someone wires a real biometric input, they must delete the entry
 * here, and the test makes that deletion deliberate.
 */
export const UNOWNED_CLARITY_COMPONENTS: readonly UnownedComponent[] = [
  {
    label: "Physiological Coherence",
    reason: "no biometric input is connected — WM Pro observes markets, not bodies",
  },
  {
    label: "Emotional Noise",
    reason: "not observable; Screen Noise is measured in its place and is not the same thing",
  },
] as const;

/**
 * ── THE THIRD STANDING THIS FILE FORGOT IT HAD ────────────────────────────
 *
 * A clarity component has THREE standings, not two:
 *
 *   MEASURED           an owner ran and produced a number
 *   OWNED, NOT SUPPLIED  an owner EXISTS, but this call site had no input for it
 *   NOT OWNED          nothing in this product can ever measure it
 *
 * The header of this file forbids one specific failure by name: "unavailable
 * data is skipped, the average is taken over what remains, and the missing
 * input silently makes the score BETTER than the evidence supports." It
 * defended the THIRD standing against that — `UNOWNED_CLARITY_COMPONENTS` is a
 * CONSTANT, so it is in the denominator whether or not anything arrived.
 *
 * It did not defend the SECOND. `asked` used to read
 *
 *     components.length + UNOWNED_CLARITY_COMPONENTS.length
 *
 * and `components` is the list of things that ARRIVED. So an owned component
 * whose input was not supplied left the numerator AND the denominator together,
 * and the ratio of what remained was reported as the ratio of the whole.
 *
 * Observed live on /command-deck, 2026-09-18 — the CLARITY tile read
 *
 *     CLOUDED · 33%
 *     1 of 3 measured · 8 evidence nodes unpaid
 *
 * THREE. The Founder's Overview asks for FOUR, this module's own VM doc says
 * "two of the four requested components have no source", and the one call site
 * in the product passes `noise: null` — honestly, deliberately, with a comment
 * explaining why. Its honesty was converted into a better score: 1/4 is 25%,
 * and the screen said 33%.
 *
 * THE ASKED-FOR PICTURE DOES NOT CHANGE SIZE BECAUSE AN INPUT FAILED TO ARRIVE.
 * The denominator is therefore a ROSTER, declared here, and never a count of
 * what showed up.
 *
 * `absentReason` is what makes this a DISCLOSURE rather than just arithmetic —
 * the same standard the unowned list is already held to. A gap that only moves
 * a percentage is a gap the reader cannot name.
 */
export const OWNED_CLARITY_COMPONENTS = [
  {
    label: "Evidence Clarity",
    source: "decisionPermissionCompiler.computeEvidenceDebt",
    absentReason: "no evidence ledger has been evaluated, so the settled share is not known",
  },
  {
    label: "Screen Quiet",
    source: "selectSecondaryNoise",
    absentReason: "this surface holds no materiality reading, so screen noise was not supplied",
  },
] as const;

/**
 * The size of the asked-for picture. CONSTANT by construction — that is the
 * entire point. Exported so a surface can never re-derive it from what it
 * happens to be holding (§24: a second CALLER of one owner is fine, a second
 * ANSWER is not — the ribbon used to compute this denominator itself).
 */
export const CLARITY_ASKED_FOR: number =
  OWNED_CLARITY_COMPONENTS.length + UNOWNED_CLARITY_COMPONENTS.length;

export interface ClarityStateInput {
  readonly debt: EvidenceDebt | null;
  readonly rightOfWay: RightOfWayReading | null;
  readonly noise: SecondaryNoiseVM | null;
}

/**
 * Compile Clarity State.
 *
 * Order matters and is deliberate: the level STARTS at the best a read can be
 * and is only ever pushed DOWN by `atMost`. There is no branch anywhere below
 * that raises it. That shape is why a missing input cannot flatter the screen.
 */
export function selectClarityState(input: ClarityStateInput): ClarityStateVM {
  const { debt, rightOfWay, noise } = input;

  const components: ClarityComponent[] = [];

  // ── Evidence clarity — the settled share of the payable ledger ────────────
  //
  // `payable`, never `nodes.length`. The denominator defect that produced
  // "0 of 9 paid / 8 unpaid" on the live deck is documented at the field
  // itself; reusing the owner's denominator is how this file inherits the fix
  // rather than re-committing the bug in a new place.
  let evidencePercent: number | null = null;
  if (debt && debt.payable > 0) {
    evidencePercent = pct(debt.resolved, debt.payable);
    components.push({
      label: "Evidence Clarity",
      percent: evidencePercent,
      reading: `${debt.resolved} of ${debt.payable} paid`,
      source: "decisionPermissionCompiler.computeEvidenceDebt",
    });
  }

  // ── Screen noise — how loud the non-decision surfaces are ─────────────────
  //
  // Reported as QUIET (the inverse) so every component bar in the tile points
  // the same way: higher is better. A tile with one bar whose polarity is
  // reversed is a misreading waiting to happen.
  if (noise) {
    const quietPercent = noise.state === "QUIETED" ? 100 : noise.state === "ACTIVE" ? 0 : 50;
    components.push({
      label: "Screen Quiet",
      percent: quietPercent,
      reading:
        noise.state === "QUIETED"
          ? "secondary surfaces quieted"
          : noise.state === "ACTIVE"
            ? "secondary surfaces competing for attention"
            : "not being watched",
      source: "selectSecondaryNoise",
    });
  }

  // ── Level: start at the top, and only ever fall ───────────────────────────
  let level: ClarityLevel = "CLEAR";
  let detail = "evidence paid · nothing flagged";

  if (!debt || !(debt.payable > 0)) {
    level = "UNMEASURED";
    detail = "no evidence ledger has been evaluated";
  } else {
    if (debt.missing > 0) {
      level = atMost(level, "CLOUDED");
      detail = `${debt.missing} evidence node${debt.missing === 1 ? "" : "s"} unpaid`;
    } else if (debt.warn > 0) {
      level = atMost(level, "CONTESTED");
      detail = `${debt.warn} node${debt.warn === 1 ? "" : "s"} flagged`;
    }

    // Right of Way can only push further down. It is a second opinion held by
    // the SAME compiler, so it must never be able to rescue a clouded read —
    // if it disagrees with the ledger, the ledger is the owner.
    if (rightOfWay) {
      if (rightOfWay.value === "NO TRADE") {
        level = atMost(level, "CLOUDED");
        detail = rightOfWay.detail || "right of way withheld";
      } else if (rightOfWay.value === "CAUTION" || rightOfWay.value === "WAIT") {
        level = atMost(level, "CONTESTED");
        if (level === "CONTESTED") detail = rightOfWay.detail || detail;
      } else if (rightOfWay.value === "UNKNOWN") {
        level = atMost(level, "CONTESTED");
        detail = rightOfWay.detail || "right of way not evaluated";
      }
    }
  }

  // ── Confidence — the ONLY channel an unowned input may touch ──────────────
  //
  // Denominator is measured + unowned, so adding a disclosure lowers confidence
  // and adding a real sensor raises it. Notice that `level` is already final at
  // this point: nothing below can change the verdict, only describe how much of
  // the asked-for picture stands behind it.
  // THE DENOMINATOR IS A ROSTER, NOT A HEADCOUNT OF WHO TURNED UP.
  //
  // `CLARITY_ASKED_FOR` is constant, so an input that fails to arrive can only
  // ever lower this ratio — which is the law stated at the top of the file,
  // now actually enforced for the owned components too and not just the
  // unowned ones.
  const confidence = pct(components.length, CLARITY_ASKED_FOR);

  // An owned component with no input is DISCLOSED, not dropped. Matching on
  // label couples the roster to the pushes above; an enforcement test asserts
  // that a fully-supplied call measures every roster entry, so renaming one
  // without the other is a red build rather than a silent phantom gap.
  const measuredLabels = new Set(components.map((c) => c.label));
  const unsuppliedComponents: readonly UnownedComponent[] = OWNED_CLARITY_COMPONENTS.filter(
    (c) => !measuredLabels.has(c.label),
  ).map((c) => ({ label: c.label, reason: c.absentReason }));

  const value =
    level === "CLEAR"
      ? "CLEAR"
      : level === "CONTESTED"
        ? "CONTESTED"
        : level === "CLOUDED"
          ? "CLOUDED"
          : "UNMEASURED";

  return {
    version: CLARITY_STATE_VERSION,
    level,
    value,
    detail,
    components,
    unownedComponents: UNOWNED_CLARITY_COMPONENTS,
    unsuppliedComponents,
    askedFor: CLARITY_ASKED_FOR,
    confidence,
    hasDisclosure:
      UNOWNED_CLARITY_COMPONENTS.length > 0 || unsuppliedComponents.length > 0,
  };
}

export default selectClarityState;
