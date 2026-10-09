/**
 * TYPE FLOOR — on narrow glass no NAME is painted under 11px.
 *
 * Founder, on the phone (2026-10-09, evening): the opacity "still sucks".
 * Measured at 390 on serving c9303a7 the ink was right (every LIVE layer ≥ 0.6,
 * no word under 0.6) — what read as mush was TYPE: "EFFORT · VOLUME",
 * "ABSORBING · POWER RETAINED", "STRUCTURE · FROM SWING HIGH …", "LEG POC …" at
 * 9px, the silence line at 10px. A 9px word on a phone is a smudge whatever its
 * alpha.
 *
 * The canvas sets its font at ~160 call sites. So, like the word registry and
 * the fog budget, the rule lives where no painter can miss it: the context's
 * own `font` property. While a floor is set, a SANS font smaller than the floor
 * is raised to it AS IT IS SET — before the painter measures — so every chip,
 * backing and placement is sized for the type that will actually paint.
 *
 * NUMBERS KEEP THEIR OWN FLOOR. Mono type (footprint cells, profile values,
 * micro numbers) is governed by MARKET_NUMBER_MIN_PX and by its cell: a number
 * that does not fit is dropped, never shrunk — and never inflated out of its
 * cell here. A disc inscription asks at its fitted size, is raised, no longer
 * fits its disc, and is dropped by its own fit test (the print's Inspect keeps
 * the number).
 */

export const NARROW_NAME_MIN_PX = 11;

const PX = /(\d+(?:\.\d+)?)px/;

/** The font string with its size raised to `minPx` — sans only; mono and unsized strings pass unchanged. */
export function floorFont(font: string, minPx: number): string {
  if (!(minPx > 0) || /mono/i.test(font)) return font;
  const m = PX.exec(font);
  if (!m) return font;
  return Number(m[1]) >= minPx ? font : font.replace(PX, `${minPx}px`);
}

export interface TypeFloor {
  /** 0 = off (the desk). Set once the frame knows the glass is narrow; reset every frame. */
  setFloor(px: number): void;
  /** How many font assignments were raised since the floor was last set. */
  raised(): number;
}

const FLOORS = new WeakMap<object, TypeFloor>();

function accessorOf(obj: object, key: string): PropertyDescriptor | null {
  for (let p: object | null = Object.getPrototypeOf(obj); p; p = Object.getPrototypeOf(p)) {
    const d = Object.getOwnPropertyDescriptor(p, key);
    if (d) return d.get && d.set ? d : null;
  }
  return null;
}

/** Wrap the context's `font` property once (idempotent). Inert until `setFloor(px > 0)`. */
export function installTypeFloor(ctx: { font: string }): TypeFloor {
  const have = FLOORS.get(ctx);
  if (have) return have;
  const native = accessorOf(ctx, "font");
  let held = ctx.font;
  let floor = 0;
  let raised = 0;
  Object.defineProperty(ctx, "font", {
    configurable: true,
    enumerable: true,
    get() { return native ? (native.get!.call(ctx) as string) : held; },
    set(v: string) {
      const f = floor > 0 ? floorFont(String(v), floor) : v;
      if (f !== v) raised++;
      if (native) native.set!.call(ctx, f); else held = f;
    },
  });
  const api: TypeFloor = {
    setFloor(px) { floor = px > 0 ? px : 0; raised = 0; },
    raised: () => raised,
  };
  FLOORS.set(ctx, api);
  return api;
}
