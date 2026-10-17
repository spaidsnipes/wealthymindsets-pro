import { describe, expect, it } from "vitest";
import { installLineWeight } from "./lineWeight";
import { lawfulLineWeight, layerLineWeight } from "./appearanceLaw";

class FakeCtx { private w = 1; get lineWidth() { return this.w; } set lineWidth(v: number) { this.w = v; } raw() { return this.w; } }

describe("per-tool thickness (Founder 2026-10-16)", () => {
  it("the overlay strokes at the painter's width × the current layer's weight; reads give the painter's number back", () => {
    const ctx = new FakeCtx();
    const lw = installLineWeight(ctx as unknown as CanvasRenderingContext2D);
    (ctx as unknown as CanvasRenderingContext2D).lineWidth = 1.5;
    expect(ctx.raw()).toBe(1.5);
    lw.scale = 2;
    (ctx as unknown as CanvasRenderingContext2D).lineWidth = 1.5;
    expect(ctx.raw()).toBe(3);
    expect((ctx as unknown as CanvasRenderingContext2D).lineWidth).toBe(1.5);
    expect(installLineWeight(ctx as unknown as CanvasRenderingContext2D)).toBe(lw); // once per context
    expect(Object.getOwnPropertyDescriptor(FakeCtx.prototype, "lineWidth")?.set).toBeTypeOf("function"); // prototype untouched
  });
  it("weights are lawful steps and map onto the tool's governed layers", () => {
    expect(lawfulLineWeight(2.2)).toBe(2);
    expect(lawfulLineWeight("x")).toBe(1);
    expect(lawfulLineWeight(9)).toBe(3);
    const m = layerLineWeight({ COMPOSITE: 2 }, { REGIME: 3 });
    expect(m.compositeProfile).toBe(2);
    expect(Object.values(m)).toContain(3);
  });
});
