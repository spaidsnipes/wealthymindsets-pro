/**
 * PROOF · LABELS HIDDEN — the Garden 11 visual recognition test, on the real glass.
 *
 * GP12 §43 / §81: "HIDE THE TEXT LABEL. Can Founder still tell what invention it
 * is? If no: OPEN." Garden 11 keeps ten inventions OPEN until they pass that
 * test (Living, Fixed Range, Structure, Fusion, Absorption, Exhaustion, Stacked
 * Imbalance, Big Trade, Liquidity lifecycle, Footprint). Nothing on serving
 * could hide the labels, so the test could only be imagined.
 *
 * `/charts?…&proof=nolabels` silences every text call on the chart's overlay
 * canvases while every line, fill, bubble and hatch still paints. It changes
 * no reading, no owner and no stored setting; drop the parameter and reload.
 * The overlay publishes `data-proof="NOLABELS"` so a screenshot taken under it
 * says so.
 */

export const PROOF_PARAM = "proof";
export const PROOF_NO_LABELS = "nolabels";

/** True when the page was opened with `proof=nolabels`. */
export function proofNoLabelsRequested(search: string): boolean {
  try {
    return new URLSearchParams(search).get(PROOF_PARAM) === PROOF_NO_LABELS;
  } catch {
    return false;
  }
}

type TextCtx = Pick<CanvasRenderingContext2D, "fillText" | "strokeText">;
const ORIGINALS = new WeakMap<TextCtx, { fillText: TextCtx["fillText"]; strokeText: TextCtx["strokeText"] }>();

/**
 * Silence (on=true) or restore (on=false) a context's text calls. Idempotent;
 * the originals are kept so turning it off returns the exact functions.
 */
export function setCanvasTextSilenced(ctx: TextCtx, on: boolean): boolean {
  const held = ORIGINALS.get(ctx);
  if (on) {
    if (held) return true;
    ORIGINALS.set(ctx, { fillText: ctx.fillText, strokeText: ctx.strokeText });
    ctx.fillText = () => {};
    ctx.strokeText = () => {};
    return true;
  }
  if (held) {
    ctx.fillText = held.fillText;
    ctx.strokeText = held.strokeText;
    ORIGINALS.delete(ctx);
  }
  return false;
}
