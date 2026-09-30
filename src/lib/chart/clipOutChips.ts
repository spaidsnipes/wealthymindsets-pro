/**
 * A LINE PASSES BEHIND WORDS (serving 2026-09-30: the WAIT leader ran through
 * the "83,350.00" VAL chip; the contradiction arrow's shaft through "NO BAR ·
 * 1 interval"). Clips every chip already on the glass out of what is stroked
 * next — one evenodd clip per chip, so overlapping chips never cancel each
 * other's cut. The caller brackets it with save()/restore(). The rect the
 * line belongs to (its own plate) is passed as `except` and stays drawable.
 */
export type ChipRect = { x: number; y: number; w: number; h: number };

export function clipOutChips(
  ctx: Pick<CanvasRenderingContext2D, "beginPath" | "rect" | "clip">,
  W: number,
  H: number,
  chips: readonly ChipRect[],
  except: ChipRect | null = null,
  pad = 1,
): number {
  let cut = 0;
  for (const r of chips) {
    if (except && r.x === except.x && r.y === except.y && r.w === except.w && r.h === except.h) continue;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.rect(r.x - pad, r.y - pad, r.w + 2 * pad, r.h + 2 * pad);
    ctx.clip("evenodd");
    cut++;
  }
  return cut;
}
