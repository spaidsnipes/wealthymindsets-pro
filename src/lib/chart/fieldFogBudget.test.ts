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
    const ops: string[] = [];
    const ctx = {
      fillStyle: "rgba(76, 175, 96, 0.2)" as string | CanvasGradient,
      globalAlpha: 1,
      getTransform: () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }) as DOMMatrix,
      fillRect(_x: number, _y: number, w: number, h: number) { calls.push({ w, h, ga: this.globalAlpha }); },
      save() { ops.push("save"); }, restore() { ops.push("restore"); }, beginPath() { ops.push("begin"); },
      rect(x: number, y: number, w: number, h: number) { ops.push(`rect:${x},${y},${w},${h}`); },
      clip(rule?: string) { ops.push(`clip:${rule}`); },
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, ops };
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

describe("price sovereignty — nothing translucent is painted across the newest candles on narrow glass", () => {
  const fake2 = () => {
    const ops: string[] = [];
    const ctx = {
      fillStyle: "rgba(201, 165, 92, 0.04)" as string,
      globalAlpha: 1,
      getTransform: () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }) as DOMMatrix,
      fillRect(x: number, y: number, w: number, h: number) { ops.push(`fill:${x},${y},${w},${h}`); },
      save() { ops.push("save"); }, restore() { ops.push("restore"); }, beginPath() { ops.push("begin"); },
      rect(x: number, y: number, w: number, h: number) { ops.push(`rect:${x},${y},${w},${h}`); },
      clip(rule?: string) { ops.push(`clip:${rule}`); },
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, ops };
  };
  const col = { x: 245, y: 150, w: 28, h: 80 };
  it("a band wider than the column that crosses it is filled with the column cut out; a hairline, a narrow bar and an opaque backing pass whole", () => {
    const { ctx, ops } = fake2();
    const gate = installFogGate(ctx);
    gate.beginFrame({ on: true, plot, dpr: 2 });
    gate.setKeepOut(col);
    ctx.fillRect(40, 180, 260, 30);            // a zone band across the newest candles
    expect(ops).toEqual([
      // full strength outside the column widened by the 8px feather…
      "save", "begin", "rect:40,180,260,30", "rect:237,150,44,80", "clip:evenodd", "fill:40,180,260,30", "restore",
      // …half strength in the two feather strips — no hard edge behind the last candles.
      "save", "begin", "rect:237,150,8,80", "rect:273,150,8,80", "clip:undefined", "fill:40,180,260,30", "restore",
    ]);
    expect(gate.columnCuts()).toBe(1);
    ops.length = 0;
    ctx.fillRect(40, 200, 260, 1);             // a hairline at a price
    ctx.fillRect(250, 160, 8, 60);             // a volume bar inside the column
    ctx.fillRect(40, 20, 150, 30);             // a band that never reaches the column
    (ctx as unknown as { fillStyle: string }).fillStyle = "rgba(11, 10, 8, 0.9)";
    ctx.fillRect(40, 180, 260, 30);            // an opaque card backing
    expect(ops.filter(o => o.startsWith("clip"))).toEqual([]);
    expect(gate.columnCuts()).toBe(1);
  });
  it("no keep-out (the desk, or no column yet): nothing is cut; a new frame forgets the last one's", () => {
    const { ctx, ops } = fake2();
    const gate = installFogGate(ctx);
    gate.beginFrame({ on: false, plot, dpr: 2 });
    gate.setKeepOut(col);
    ctx.fillRect(40, 180, 260, 30);
    gate.beginFrame({ on: true, plot, dpr: 2 });
    ctx.fillRect(40, 180, 260, 30);
    expect(ops.filter(o => o.startsWith("clip"))).toEqual([]);
    expect(gate.columnCuts()).toBe(0);
  });
});
