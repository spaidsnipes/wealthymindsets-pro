/**
 * selectMateriality — Founder 2029 Integration Glue canon §4
 * MATERIALITY ENGINE (2026-08-20).
 *
 * Canon verbatim:
 *   "Not every change deserves attention. The system must distinguish
 *    state change from decision-relevant state change. Materiality
 *    asks whether the new evidence can meaningfully change Direction,
 *    Location, CLC, Available R, invalidation, management, or data
 *    trust. Non-material changes are logged but do not compete for
 *    screen space."
 *
 * Compares two OneStoryVM snapshots and returns a Materiality reading
 * so Auto-Quiet / Cognitive Load Governor consumers can decide whether
 * a UI animation, alert, or attention-cost is warranted.
 *
 * PURE / DETERMINISTIC. No I/O, no clock, no fabrication.
 */

import type { OneStoryVM } from "./selectOneStory";

/**
 * Reasons a change is material. Ordered so the strongest signal
 * appears first in the reasons[] array — consumers may pick just
 * the first element for compact display.
 */
export type MaterialityReason =
  | "DECISION_CHANGED"       // ACTION↔WAIT/NO TRADE/CAUTION — always material
  | "MISSING_APPEARED"       // debt.missing went from 0 → >0 — new blocker
  | "MISSING_RESOLVED"       // debt.missing went from >0 → 0 — clearing gate
  | "MISSING_INCREASED"      // debt.missing rose (more evidence needed)
  | "MISSING_DECREASED"      // debt.missing fell (evidence paid)
  | "CONTRADICTION_APPEARED" // no contradiction → contradiction present
  | "CONTRADICTION_CLEARED"  // contradiction present → cleared
  | "CONTRADICTION_CHANGED"  // different contradiction text than before
  | "PRIMARY_CHANGED";       // chapter/story flipped

export interface MaterialityReading {
  readonly material: boolean;
  readonly reasons: readonly MaterialityReason[];
  /** Short human phrase suitable for aria-live or tooltip. */
  readonly summary: string;
}

const REASON_LABEL: Record<MaterialityReason, string> = {
  DECISION_CHANGED:       "decision changed",
  MISSING_APPEARED:       "new evidence debt",
  MISSING_RESOLVED:       "evidence debt cleared",
  MISSING_INCREASED:      "more evidence unpaid",
  MISSING_DECREASED:      "evidence being paid",
  CONTRADICTION_APPEARED: "contradiction surfaced",
  CONTRADICTION_CLEARED:  "contradiction cleared",
  CONTRADICTION_CHANGED:  "contradiction shifted",
  PRIMARY_CHANGED:        "market story changed",
};

/** First snapshot has no prior — everything past the FIRST render is a delta. */
export function selectMateriality(
  prev: OneStoryVM | null,
  next: OneStoryVM,
): MaterialityReading {
  if (!prev) {
    // Initial render is not "material change" — it's the baseline. Consumers
    // may still want to render it, but Auto-Quiet has no prior to compare.
    return { material: false, reasons: [], summary: "initial render" };
  }

  const reasons: MaterialityReason[] = [];

  // Highest-priority signal — decision authorization flipped.
  if (prev.decision.value !== next.decision.value) {
    reasons.push("DECISION_CHANGED");
  }

  // Missing-evidence transitions.
  const prevMissing = prev.debt?.missing ?? 0;
  const nextMissing = next.debt?.missing ?? 0;
  if (prevMissing === 0 && nextMissing > 0) reasons.push("MISSING_APPEARED");
  else if (prevMissing > 0 && nextMissing === 0) reasons.push("MISSING_RESOLVED");
  else if (nextMissing > prevMissing) reasons.push("MISSING_INCREASED");
  else if (nextMissing < prevMissing && nextMissing > 0) reasons.push("MISSING_DECREASED");

  // Contradiction transitions.
  const prevContradiction = prev.contradiction;
  const nextContradiction = next.contradiction;
  if (!prevContradiction && nextContradiction) reasons.push("CONTRADICTION_APPEARED");
  else if (prevContradiction && !nextContradiction) reasons.push("CONTRADICTION_CLEARED");
  else if (prevContradiction && nextContradiction && prevContradiction !== nextContradiction) {
    reasons.push("CONTRADICTION_CHANGED");
  }

  // Primary story flipped.
  if (prev.primary !== next.primary) reasons.push("PRIMARY_CHANGED");

  const material = reasons.length > 0;
  const summary = material
    ? reasons.slice(0, 2).map(r => REASON_LABEL[r]).join(" · ")
    : "no material change";

  return { material, reasons, summary };
}
