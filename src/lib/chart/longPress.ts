/**
 * LONG-PRESS — the chart's context menu on a touch screen.
 *
 * Sheriff code read (2026-10-10): iOS Safari never fires `contextmenu` on a
 * long-press, and the chart had no touch long-press path — so "Trade at
 * <price>" (and every other menu item) was unreachable on iPhone and iPad.
 *
 * A touch or pen press that stays within SLOP for DELAY fires once at the
 * press point. It never fights a pan: any movement past the slop, a second
 * pointer, a lift or a cancel disarms it. After it fires, the click the
 * browser synthesises on lift is swallowed (`consumeClick`), so the press does
 * not also select a candle. Mouse presses are ignored — right-click already
 * opens the menu.
 */

export const LONG_PRESS_DELAY_MS = 500;
export const LONG_PRESS_SLOP_PX = 8;

export interface LongPressPoint { readonly pointerId: number; readonly pointerType: string; readonly clientX: number; readonly clientY: number }

export interface LongPress {
  down(p: LongPressPoint): void;
  move(p: LongPressPoint): void;
  up(p: LongPressPoint): void;
  cancel(): void;
  /** True once after a long-press fired: the caller swallows that click. */
  consumeClick(): boolean;
  /** For receipts and tests. */
  readonly armed: boolean;
}

export function createLongPress(opts: {
  onFire: (clientX: number, clientY: number) => void;
  delayMs?: number;
  slopPx?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
}): LongPress {
  const delay = opts.delayMs ?? LONG_PRESS_DELAY_MS;
  const slop = opts.slopPx ?? LONG_PRESS_SLOP_PX;
  const setT = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearT = opts.clearTimer ?? (t => clearTimeout(t as ReturnType<typeof setTimeout>));
  const pointers = new Set<number>();
  let start: LongPressPoint | null = null;
  let timer: unknown = null;
  let swallow = false;
  const disarm = () => { if (timer != null) clearT(timer); timer = null; start = null; };
  return {
    down(p) {
      pointers.add(p.pointerId);
      if (p.pointerType !== "touch" && p.pointerType !== "pen") return;
      if (pointers.size > 1) { disarm(); return; } // a pinch is never a press
      disarm();
      start = p;
      timer = setT(() => {
        const at = start;
        timer = null; start = null;
        if (!at) return;
        swallow = true;
        opts.onFire(at.clientX, at.clientY);
      }, delay);
    },
    move(p) {
      if (!start || p.pointerId !== start.pointerId) return;
      if (Math.hypot(p.clientX - start.clientX, p.clientY - start.clientY) > slop) disarm();
    },
    up(p) { pointers.delete(p.pointerId); disarm(); },
    cancel() { pointers.clear(); disarm(); },
    consumeClick() { const s = swallow; swallow = false; return s; },
    get armed() { return start != null; },
  };
}
