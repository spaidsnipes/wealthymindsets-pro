import { describe, expect, it } from "vitest";

import {
  ZONE_ARROW_MIN_H,
  ZONE_BOX_MAX_W,
  ZONE_BOX_MIN_W,
  arrowOutline,
  contradictionGlyph,
  contradictionLabelRow,
  contradictionZoneBox,
  crackStrokes,
  fanBandPolygon,
  rewardRTicks,
  smoothSegments,
} from "./lensGlassGeometry";

describe("H-401 · one price zone — the box is the zone's real prices, from where it began to NOW", () => {
  it("depth is the zone; width runs from its birth to NOW", () => {
    const b = contradictionZoneBox({ xNow: 900, xFrom: 650, yA: 300, yB: 360, minX: 4 });
    expect(b).toEqual({ x0: 650, x1: 900, yTop: 300, yBot: 360 });
  });

  it("a zone born long ago is still one box at NOW; a fresh one still holds the glyph", () => {
    expect(contradictionZoneBox({ xNow: 900, xFrom: 10, yA: 1, yB: 2, minX: 4 }).x0).toBe(900 - ZONE_BOX_MAX_W);
    expect(contradictionZoneBox({ xNow: 900, xFrom: 880, yA: 1, yB: 2, minX: 4 }).x0).toBe(900 - ZONE_BOX_MIN_W);
    expect(contradictionZoneBox({ xNow: 900, xFrom: null, yA: 1, yB: 2, minX: 4 }).x0).toBe(900 - ZONE_BOX_MIN_W);
  });

  it("never left of the column another owner holds", () => {
    expect(contradictionZoneBox({ xNow: 400, xFrom: 0, yA: 1, yB: 2, minX: 324 }).x0).toBe(324);
  });
});

describe("H-401 · the sheet's order inside the zone — UP arrow · crack · DOWN arrow", () => {
  const box = { x0: 600, x1: 860, yTop: 200, yBot: 300 };
  const g = contradictionGlyph(box);

  it("UP at the left, the crack between, DOWN at the right — all inside the box", () => {
    expect(g.up.x).toBeLessThan(g.crack.cx);
    expect(g.crack.cx).toBeLessThan(g.down.x);
    expect(g.up.x - g.up.headW / 2).toBeGreaterThan(box.x0);
    expect(g.down.x + g.down.headW / 2).toBeLessThan(box.x1);
    expect(g.crack.cx - g.crack.hw).toBeGreaterThan(g.up.x + g.up.headW / 2);
    expect(g.crack.cx + g.crack.hw).toBeLessThan(g.down.x - g.down.headW / 2);
  });

  it("a deep zone: the arrows fill its depth and stay inside it", () => {
    expect(g.yTop).toBeGreaterThanOrEqual(box.yTop);
    expect(g.yBot).toBeLessThanOrEqual(box.yBot);
    expect(g.yBot - g.yTop).toBeGreaterThan(80);
  });

  it("a thin zone: the arrows keep a readable height and straddle its middle", () => {
    const thin = contradictionGlyph({ x0: 600, x1: 800, yTop: 250, yBot: 256 });
    expect(thin.yBot - thin.yTop).toBe(ZONE_ARROW_MIN_H);
    expect((thin.yTop + thin.yBot) / 2).toBe(253);
  });

  it("the UP arrow's tip is at the top, the DOWN arrow's at the bottom", () => {
    const upTip = arrowOutline(g.up).reduce((a, p) => (p.y < a.y ? p : a));
    const downTip = arrowOutline(g.down).reduce((a, p) => (p.y > a.y ? p : a));
    expect(upTip).toEqual({ x: g.up.x, y: g.up.yTop });
    expect(downTip).toEqual({ x: g.down.x, y: g.down.yBot });
  });

  it("the crack is two crossing fractures, deterministic, inside its own extents", () => {
    const s = crackStrokes(g.crack);
    expect(s).toEqual(crackStrokes(g.crack));
    const [a, b] = s;
    // One runs top-left → bottom-right, the other top-right → bottom-left.
    expect(a[0].x).toBeLessThan(a[a.length - 1].x);
    expect(b[0].x).toBeGreaterThan(b[b.length - 1].x);
    for (const p of s.flat()) {
      expect(Math.abs(p.x - g.crack.cx)).toBeLessThanOrEqual(g.crack.hw * 1.18 + 3);
      expect(Math.abs(p.y - g.crack.cy)).toBeLessThanOrEqual(g.crack.hh + 1e-9);
    }
  });
});

describe("H-401 · the word row — family names under each arrow, UNRESOLVED under the crack", () => {
  const g = contradictionGlyph(contradictionZoneBox({ xNow: 900, xFrom: null, yA: 300, yB: 320, minX: 4 }));
  const overlaps = (a: { x: number; w: number }, b: { x: number; w: number }) => a.x < b.x + b.w && b.x < a.x + a.w;

  it("each group is centred on its own mark when there is room", () => {
    const r = contradictionLabelRow(g, { up: { w: 70, h: 26 }, crack: { w: 72, h: 16 }, down: { w: 70, h: 26 } }, 330);
    expect(r.up.x + r.up.w / 2).toBeCloseTo(g.up.x);
    expect(r.crack.x + r.crack.w / 2).toBeCloseTo(g.crack.cx);
    expect(r.down.x + r.down.w / 2).toBeCloseTo(g.down.x);
    expect([r.up.y, r.crack.y, r.down.y]).toEqual([330, 330, 330]);
  });

  it("long family names step outward; the crack's word never moves and nothing touches", () => {
    const r = contradictionLabelRow(g, { up: { w: 190, h: 26 }, crack: { w: 80, h: 16 }, down: { w: 190, h: 26 } }, 330);
    expect(r.crack.x + r.crack.w / 2).toBeCloseTo(g.crack.cx);
    expect(overlaps(r.up, r.crack)).toBe(false);
    expect(overlaps(r.crack, r.down)).toBe(false);
    expect(r.up.x).toBeLessThan(r.crack.x);
    expect(r.down.x).toBeGreaterThan(r.crack.x);
  });
});

describe("H-801 · a fan band is one polygon — upper edge forward, lower edge back", () => {
  it("walks hi left→right then lo right→left", () => {
    const cols = [{ x: 0, lo: 10, hi: 5 }, { x: 10, lo: 12, hi: 3 }, { x: 20, lo: 14, hi: 1 }];
    expect(fanBandPolygon(cols)).toEqual([
      { x: 0, y: 5 }, { x: 10, y: 3 }, { x: 20, y: 1 },
      { x: 20, y: 14 }, { x: 10, y: 12 }, { x: 0, y: 10 },
    ]);
  });
});

describe("H-801 · the fan's edges are curves through the measured points, not a sawtooth", () => {
  const pts = [{ x: 0, y: 10 }, { x: 10, y: 0 }, { x: 20, y: 10 }, { x: 30, y: 0 }];
  const segs = smoothSegments(pts);

  it("ends on the last point and bends at every interior point (each is a control point)", () => {
    expect(segs.at(-1)).toMatchObject({ x: 30, y: 0 });
    expect(segs.slice(1).map(s => [s.cx, s.cy])).toEqual([[10, 0], [20, 10]]);
  });

  it("the curve's ends between control points are midpoints of real points — nothing invented", () => {
    expect(segs[0]).toEqual({ cx: 5, cy: 5, x: 5, y: 5 });
    expect(segs[1]).toMatchObject({ x: 15, y: 5 });
  });

  it("two points are a straight line; one is nothing", () => {
    expect(smoothSegments(pts.slice(0, 2))).toEqual([{ cx: 0, cy: 10, x: 10, y: 0 }]);
    expect(smoothSegments(pts.slice(0, 1))).toEqual([]);
  });
});

describe("F17A · R ticks sit on the reward side, only where the plan's target reaches", () => {
  it("a 2.4R long gets 1R and 2R above entry", () => {
    expect(rewardRTicks("LONG", 100, 2, 2.4)).toEqual([{ r: 1, price: 102 }, { r: 2, price: 104 }]);
  });
  it("a short counts down, capped at 3R", () => {
    expect(rewardRTicks("SHORT", 5242.5, 44.25, 5.1).map(t => t.price)).toEqual([5198.25, 5154, 5109.75]);
  });
  it("no target, or less than 1R of reward → no tick is drawn", () => {
    expect(rewardRTicks("LONG", 100, 2, null)).toEqual([]);
    expect(rewardRTicks("LONG", 100, 2, 0.8)).toEqual([]);
    expect(rewardRTicks("LONG", 100, 0, 3)).toEqual([]);
  });
});
