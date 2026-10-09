import { describe, expect, it } from "vitest";
import { createFogLedger, fogScaleFor, FOG_CAP, inkAlpha, installFogGate } from "./fieldFogBudget";

const plot = { w: 320, h: 400 };

describe("field fog budget — stacked translucent fields never multiply over the candles", () => {
  it("sums effective alpha where fields overlap, not across the whole glass", () => {
    const l = createFogLedger(plot);
    l.add({ x: 0, y: 0, w: 320, h: 200 }, 0.1);     // top half
    l.add({ x: 0, y: 200, w: 320, h: 200 }, 0.12);  // bottom half — no overlap
    expect(l.frame().worstRaw).toBeCloseTo(0.12, 10);
    l.add({ x: 0, y: 100, w: 320, h: 200 }, 0.1);   // across the middle — stacks on both
    expect(l.frame().worstRaw).toBeCloseTo(0.22, 10);
    expect(l.frame().fills).toBe(3);
  });
  it("the next frame's scale brings the worst place to the cap, proportionally; under the cap nothing changes", () => {
    expect(fogScaleFor(0.1)).toBe(1);
    expect(fogScaleFor(FOG_CAP)).toBe(1);
    const k = fogScaleFor(0.36);
    expect(k).toBeCloseTo(0.5, 10);
    const l = createFogLedger(plot, k);
    expect(l.add({ x: 0, y: 0, w: 320, h: 400 }, 0.2)).toBeCloseTo(0.5, 10);
    l.add({ x: 0, y: 0, w: 320, h: 400 }, 0.16);
    expect(l.frame().worst).toBeCloseTo(FOG_CAP, 10);
    expect(l.frame().worstRaw).toBeCloseTo(0.36, 10);
  });
  it("reads a canvas colour's alpha", () => {
    expect(inkAlpha("rgba(76, 175, 96, 0.16)")).toBeCloseTo(0.16, 10);
    expect(inkAlpha("#0b0a08")).toBe(1);
    expect(inkAlpha({})).toBeNull();
  });
});

describe("fog gate — on the context's own fillRect", () => {
  const fake = () => {
    const calls: { w: number; h: number; ga: number }[] = [];
    const ctx = {
      fillStyle: "rgba(76, 175, 96, 0.2)" as string | CanvasGradient,
      globalAlpha: 1,
      getTransform: () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }) as DOMMatrix,
      fillRect(_x: number, _y: number, w: number, h: number) { calls.push({ w, h, ga: this.globalAlpha }); },
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
  };
  it("off (the desk): nothing counted, nothing scaled", () => {
    const { ctx, calls } = fake();
    const gate = installFogGate(ctx);
    expect(installFogGate(ctx)).toBe(gate);
    gate.beginFrame({ on: false, plot, dpr: 2 });
    ctx.fillRect(0, 0, 320, 400); ctx.fillRect(0, 0, 320, 400);
    expect(calls.map(c => c.ga)).toEqual([1, 1]);
    expect(gate.receipt()).toBe("OFF");
  });
  it("on: frame 1 measures the stack, frame 2 paints it at the cap, small fills and opaque backings pass, and it releases when the stack thins", () => {
    const { ctx, calls } = fake();
    const gate = installFogGate(ctx);
    gate.beginFrame({ on: true, plot, dpr: 2 });
    ctx.fillRect(0, 0, 320, 400); ctx.fillRect(0, 0, 320, 400);   // 0.2 + 0.2 over every place
    ctx.fillRect(10, 10, 6, 40);                                    // a candle
    expect(gate.receipt()).toBe("WORST:0.400|RAW:0.400|K:1.00|FILLS:2");
    calls.length = 0;
    gate.beginFrame({ on: true, plot, dpr: 2 });
    ctx.fillRect(0, 0, 320, 400); ctx.fillRect(0, 0, 320, 400);
    ctx.fillRect(10, 10, 6, 40);
    (ctx as unknown as { fillStyle: string }).fillStyle = "rgba(11, 10, 8, 0.9)";
    ctx.fillRect(0, 0, 320, 400);                                   // an opaque card backing
    expect(calls.map(c => +c.ga.toFixed(2))).toEqual([0.45, 0.45, 1, 1]);
    expect(ctx.globalAlpha).toBe(1);                                // restored
    expect(gate.receipt()).toBe("WORST:0.180|RAW:0.400|K:0.45|FILLS:2");
    // One field left: under the cap → the frame after, full strength again.
    (ctx as unknown as { fillStyle: string }).fillStyle = "rgba(76, 175, 96, 0.1)";
    gate.beginFrame({ on: true, plot, dpr: 2 });
    ctx.fillRect(0, 0, 320, 400);
    calls.length = 0;
    gate.beginFrame({ on: true, plot, dpr: 2 });
    ctx.fillRect(0, 0, 320, 400);
    expect(calls[0].ga).toBe(1);
  });
});
