import { describe, expect, it } from "vitest";
import { floorFont, installTypeFloor, NARROW_NAME_MIN_PX } from "./typeFloor";
import { MARKET_MONO, MARKET_SANS, marketFont } from "./marketType";

describe("type floor — on narrow glass no name is painted under 11px", () => {
  it("raises a small sans font, leaves a large one, and never touches mono", () => {
    expect(floorFont(`700 9px ${MARKET_SANS}`, 11)).toBe(`700 11px ${MARKET_SANS}`);
    expect(floorFont(`600 8px ${MARKET_SANS}`, 11)).toBe(`600 11px ${MARKET_SANS}`);
    expect(floorFont(`700 12px ${MARKET_SANS}`, 11)).toBe(`700 12px ${MARKET_SANS}`);
    expect(floorFont(`italic 400 10px ${MARKET_SANS}`, 11)).toBe(`italic 400 11px ${MARKET_SANS}`);
    expect(floorFont(`700 9px ${MARKET_MONO}`, 11)).toBe(`700 9px ${MARKET_MONO}`);
    expect(floorFont("600 9px 'JetBrains Mono', monospace", 11)).toBe("600 9px 'JetBrains Mono', monospace");
    expect(floorFont(`700 9px ${MARKET_SANS}`, 0)).toBe(`700 9px ${MARKET_SANS}`);
  });
  it("every sans role of the font owner clears the phone floor once raised; mono roles keep their own", () => {
    for (const role of ["OBJECT_NAME", "WHY_LABEL", "WARNING", "FIDELITY"] as const) {
      expect(floorFont(marketFont(role), NARROW_NAME_MIN_PX)).toMatch(/ 11px /);
    }
    for (const role of ["FOOTPRINT_NUMBER", "MICRO_NUMBER", "PROFILE_VALUE", "RISK_VALUE"] as const) {
      expect(floorFont(marketFont(role), NARROW_NAME_MIN_PX)).toBe(marketFont(role));
    }
  });
  it("on a context: off by default; raised as the font is SET (so the painter measures the real size); counted; off again at 0", () => {
    // A context whose font is an accessor on its prototype, like a real canvas.
    class Fake { private f = "10px sans-serif"; get font() { return this.f; } set font(v: string) { this.f = v; } }
    const ctx = new Fake();
    const tf = installTypeFloor(ctx);
    expect(installTypeFloor(ctx)).toBe(tf);
    ctx.font = `700 9px ${MARKET_SANS}`;
    expect(ctx.font).toBe(`700 9px ${MARKET_SANS}`);
    tf.setFloor(11);
    ctx.font = `700 9px ${MARKET_SANS}`;
    expect(ctx.font).toBe(`700 11px ${MARKET_SANS}`);
    ctx.font = `600 10px ${MARKET_MONO}`;
    expect(ctx.font).toBe(`600 10px ${MARKET_MONO}`);
    ctx.font = `700 14px ${MARKET_SANS}`;
    expect(tf.raised()).toBe(1);
    tf.setFloor(0);
    ctx.font = `700 9px ${MARKET_SANS}`;
    expect(ctx.font).toBe(`700 9px ${MARKET_SANS}`);
    expect(tf.raised()).toBe(0);
  });
  it("works on a plain object too (a data property)", () => {
    const ctx = { font: "10px sans-serif" };
    const tf = installTypeFloor(ctx);
    tf.setFloor(11);
    ctx.font = "600 9px Inter, sans-serif";
    expect(ctx.font).toBe("600 11px Inter, sans-serif");
  });
});
