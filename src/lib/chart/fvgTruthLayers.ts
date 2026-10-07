/**
 * FVG TRUTH LAYERS — Garden 19 §42. Inspect and Review keep four kinds of
 * truth visibly apart for an FVG, so a definition never reads as a market
 * fact and a relationship never reads as the gap's own evidence:
 *
 *   MARKET     what the bars showed about THIS gap (observed + its arithmetic)
 *   CONTEXT    other owners' readings, by reference, never upgraded
 *   TRADER     what the trader recorded (decision, plan, reference) — never inferred
 *   EDUCATION  the definition and what WM refuses to claim
 *
 * PURE.
 */

export type FvgTruthLayer = "MARKET" | "CONTEXT" | "TRADER" | "EDUCATION";

export const FVG_TRUTH_LAYERS: readonly { readonly id: FvgTruthLayer; readonly title: string; readonly means: string }[] = [
  { id: "MARKET", title: "Market truth", means: "What the bars showed about this gap." },
  { id: "CONTEXT", title: "Context truth", means: "Other owners' readings, by reference — never upgraded here." },
  { id: "TRADER", title: "Trader truth", means: "What you recorded — never inferred." },
  { id: "EDUCATION", title: "Education", means: "The definition and what WM does not claim." },
];

const LAYER_OF: Readonly<Record<string, FvgTruthLayer>> = {
  definition: "EDUCATION",
  honesty: "EDUCATION",
  "sense-flow": "CONTEXT",
  "sense-derivatives": "CONTEXT",
};

/** The layer of an Inspect row id (fvgGlass.fvgInspectRows). Every other row is the gap's own MARKET truth. */
export function fvgInspectLayerOf(rowId: string): FvgTruthLayer {
  return LAYER_OF[rowId] ?? "MARKET";
}
