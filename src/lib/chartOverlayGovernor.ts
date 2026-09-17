export const STANDARD_OVERLAY_FRAME_MS = 33;
export const PROFILE_OVERLAY_FRAME_MS = 50;

export function overlayFrameBudgetMs(profilesActive: boolean): number {
  return profilesActive ? PROFILE_OVERLAY_FRAME_MS : STANDARD_OVERLAY_FRAME_MS;
}

/**
 * Why a frame was not painted.
 *
 * Kept DISTINCT, because only one of the three is a suspension of the overlay:
 *
 *   · BUDGET     — a normal inter-frame gap. The last paint is still on screen
 *                  and still accurate; nothing is missing.
 *   · HIDDEN     — the tab is backgrounded. Nothing paints, for as long as it
 *                  stays that way. Any evidence the draw loop publishes goes
 *                  stale or, on a fresh load, never gets written at all.
 *   · BAD_CLOCK  — a non-finite timestamp. Refusing to paint is right, but this
 *                  should never happen, and collapsing it into BUDGET would
 *                  disguise a permanently frozen overlay as ordinary pacing.
 */
export type OverlaySkipReason = "BUDGET" | "HIDDEN" | "BAD_CLOCK";

export interface OverlayFrameVerdict {
  readonly draw: boolean;
  /** Null when `draw` is true. A reason otherwise — never both, never neither. */
  readonly skipped: OverlaySkipReason | null;
}

const DRAW: OverlayFrameVerdict = Object.freeze({ draw: true, skipped: null });
const SKIP: Record<OverlaySkipReason, OverlayFrameVerdict> = {
  BUDGET: Object.freeze({ draw: false, skipped: "BUDGET" }),
  HIDDEN: Object.freeze({ draw: false, skipped: "HIDDEN" }),
  BAD_CLOCK: Object.freeze({ draw: false, skipped: "BAD_CLOCK" }),
};

/**
 * Decide whether this frame paints, AND say why when it does not.
 *
 * WHY THE REASON IS PART OF THE ANSWER. The overlay is the only publisher of
 * the Volume Profile render receipt (`data-vp-*` on the overlay canvas), and
 * that channel is written inside the paint. So a `false` here does not merely
 * skip a repaint — it withholds the receipt. On a tab that loads hidden, the
 * attributes are never written at all, and their ABSENCE is defined elsewhere
 * in the renderer as "no profile was requested". Requested-but-suspended and
 * never-requested would then share one encoding, which is exactly the class of
 * silence §5 SYSTEM TRUTH LAW forbids: work was asked for, was not performed,
 * and nothing said so.
 *
 * A bare boolean cannot carry that distinction. This can.
 */
export function overlayFrameVerdict(input: {
  hidden: boolean;
  now: number;
  lastDrawAt: number;
  frameBudgetMs: number;
}): OverlayFrameVerdict {
  // Checked FIRST, and independently of the clock: a hidden tab is suspended
  // whether or not its timestamps make sense, and "hidden" is the reason a
  // caller has to act on.
  if (input.hidden) return SKIP.HIDDEN;
  if (!Number.isFinite(input.now) || !Number.isFinite(input.lastDrawAt)) return SKIP.BAD_CLOCK;
  return input.now - input.lastDrawAt >= input.frameBudgetMs ? DRAW : SKIP.BUDGET;
}

/**
 * The original boolean, now a projection of the verdict above.
 *
 * Retained as the single paint predicate so there is no second copy of the
 * pacing arithmetic to drift out of agreement with this one.
 */
export function shouldDrawOverlay(input: {
  hidden: boolean;
  now: number;
  lastDrawAt: number;
  frameBudgetMs: number;
}): boolean {
  return overlayFrameVerdict(input).draw;
}
