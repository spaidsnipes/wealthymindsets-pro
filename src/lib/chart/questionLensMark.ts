/**
 * QUESTION LENS IDENTITY MARKS (Garden 19 ASK-5, 2026-10-08).
 *
 * Which question the trader asked was carried by words only (the tag on the
 * band, the rail). With every word erased the band still says "a question
 * was asked here" — this set says WHICH, in one ivory ink, from shapes the
 * house already uses for the same idea:
 *
 *   ABSORPTION    ■ filled square   — the absorption shelf's block
 *   EXHAUSTION    ▽ hollow triangle — effort pointing down, spent
 *   CONTINUATION  » double chevron  — the leg carrying on (the FVG origin chevron)
 *   TRAP          ✕ cross           — the broken swing
 *   HOLD          ⊢⊣ capped bar     — a level held (the lifecycle's end caps)
 *   WHAT_CHANGED  ◇ hollow diamond  — the mass-centre diamond: something moved
 *   PERMISSION    ○ hollow ring     — the gate (the selection ring)
 *
 * Shape alone carries the kind (no hue), 8 px, centred on (x, y). Pure paint;
 * returns false for a kind it does not know.
 */

export type QuestionMarkKind = "ABSORPTION" | "EXHAUSTION" | "CONTINUATION" | "TRAP" | "HOLD" | "WHAT_CHANGED" | "PERMISSION";

export const QUESTION_MARK_SHAPE: Readonly<Record<QuestionMarkKind, string>> = {
  ABSORPTION: "SQUARE",
  EXHAUSTION: "TRIANGLE_DOWN",
  CONTINUATION: "CHEVRON",
  TRAP: "CROSS",
  HOLD: "CAPPED_BAR",
  WHAT_CHANGED: "DIAMOND",
  PERMISSION: "RING",
};

export const QUESTION_MARK_SIZE = 8;

type Ctx = Pick<CanvasRenderingContext2D,
  "save" | "restore" | "beginPath" | "moveTo" | "lineTo" | "closePath" | "stroke" | "fill" | "arc" | "fillRect"
> & { strokeStyle: unknown; fillStyle: unknown; lineWidth: number; setLineDash(d: number[]): void };

export function paintQuestionMark(ctx: Ctx, kind: string, x: number, y: number, ink: string): boolean {
  if (!(kind in QUESTION_MARK_SHAPE)) return false;
  const r = QUESTION_MARK_SIZE / 2;
  ctx.save();
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.5; ctx.setLineDash([]);
  ctx.beginPath();
  switch (kind as QuestionMarkKind) {
    case "ABSORPTION": ctx.fillRect(x - r, y - r, 2 * r, 2 * r); break;
    case "EXHAUSTION": ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y - r); ctx.lineTo(x, y + r); ctx.closePath(); ctx.stroke(); break;
    case "CONTINUATION":
      ctx.moveTo(x - r, y - r); ctx.lineTo(x - 1, y); ctx.lineTo(x - r, y + r);
      ctx.moveTo(x + 1, y - r); ctx.lineTo(x + r + 2, y); ctx.lineTo(x + 1, y + r); ctx.stroke(); break;
    case "TRAP": ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); break;
    case "HOLD":
      ctx.moveTo(x - r, y - r); ctx.lineTo(x - r, y + r); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
      ctx.moveTo(x + r, y - r); ctx.lineTo(x + r, y + r); ctx.stroke(); break;
    case "WHAT_CHANGED": ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.stroke(); break;
    case "PERMISSION": ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); break;
  }
  ctx.restore();
  return true;
}
