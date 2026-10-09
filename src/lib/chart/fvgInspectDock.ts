/**
 * WHERE THE GAP'S INSPECT CARD STANDS (Garden 19 §46).
 *
 * Measured on serving 2026-10-09: on desktop the card is fixed at the left
 * wall (x 8–276 of a 1195-px plot) and never moves, so a selected gap whose
 * frame lies there is under its own explanation. The zone / level Passport
 * already stands on the wall AWAY from its object (`passportDockSide`); the
 * gap's card uses the same owner — no second rule.
 *
 * The chart publishes where it drew the selected gap's gold frame on the
 * canvas: `dataset.fvgSelectedMark = "FRAME:GOLD@<x>,<y>,<w>,<h>"` (canvas CSS
 * px). The bare `FRAME:GOLD` (no geometry) and `NONE` are still valid: with no
 * geometry the card keeps the left wall, exactly as before.
 */
import { passportDockSide, type PassportDock } from "@/lib/marketData/viewModels/selectPassportSlots";

export interface FvgSelectedFrame {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const MARK = /^FRAME:[A-Z]+@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/;

/** Parse the chart's `fvgSelectedMark` receipt; null when it carries no geometry. */
export function parseFvgSelectedMark(mark: string | null | undefined): FvgSelectedFrame | null {
  const m = MARK.exec((mark ?? "").trim());
  if (!m) return null;
  const [x, y, w, h] = [m[1], m[2], m[3], m[4]].map(Number);
  return [x, y, w, h].every(Number.isFinite) ? { x, y, w, h } : null;
}

/**
 * The wall for the gap's card: away from the selected frame's centre, by the
 * Passport's own rule. No frame published → LEFT (the card's long-standing wall).
 */
export function fvgInspectDock(input: {
  readonly mark: string | null | undefined;
  readonly paneWidth: number;
  readonly cardWidth: number;
}): PassportDock {
  const f = parseFvgSelectedMark(input.mark);
  return passportDockSide({
    objectX: f ? f.x + f.w / 2 : null,
    paneWidth: input.paneWidth,
    drawerWidth: input.cardWidth,
  });
}
