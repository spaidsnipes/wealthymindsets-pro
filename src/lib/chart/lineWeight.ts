/**
 * PER-TOOL THICKNESS ON THE OVERLAY (Founder 2026-10-16: "make the lines thicker … a setting for each thing").
 *
 * Every painter sets `ctx.lineWidth` itself. Rather than touch hundreds of sites, the overlay's context gets an
 * instance-level `lineWidth` that multiplies by the CURRENT layer's weight (the room sets `scale` as each layer
 * asks the attention governor for its alpha / permission). Reads return the painter's own number, so any logic
 * that reads a width back is unchanged. Scale 1 = exactly the shipped stroke. Never on the prototype.
 */
export interface LineWeight { scale: number }

const INSTALLED = new WeakMap<object, LineWeight>();

export function installLineWeight(ctx: CanvasRenderingContext2D): LineWeight {
  const have = INSTALLED.get(ctx);
  if (have) return have;
  const lw: LineWeight = { scale: 1 };
  const proto = Object.getPrototypeOf(ctx) as object;
  const desc = Object.getOwnPropertyDescriptor(proto, "lineWidth");
  if (desc?.get && desc.set) {
    const get = desc.get, set = desc.set;
    Object.defineProperty(ctx, "lineWidth", {
      configurable: true,
      get(this: CanvasRenderingContext2D) { return (get.call(this) as number) / (lw.scale || 1); },
      set(this: CanvasRenderingContext2D, v: number) { set.call(this, v * (lw.scale || 1)); },
    });
  }
  INSTALLED.set(ctx, lw);
  return lw;
}
