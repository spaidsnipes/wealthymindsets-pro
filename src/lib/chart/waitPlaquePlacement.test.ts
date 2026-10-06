import { describe, expect, it } from "vitest";
import { placeWaitPlaque } from "./waitPlaquePlacement";

const size = { w: 208, h: 60 };
const box = { w: 1300, h: 600 };

describe("H-101 WAIT plaque placement", () => {
  it("keeps its original place right of the pin when that is clear", () => {
    const p = placeWaitPlaque({ x: 400, y: 300 }, size, box, [{ x: 100, y: 100, w: 6, h: 40 }]);
    expect(p).toEqual({ left: 416, top: 272, mode: "RIGHT" });
  });
  it("near the live edge it leaves the newest candles: the pin's left when that is clear", () => {
    // candles under the clamped right-hand spot (x 1076..1284), none left of the pin
    const candles = Array.from({ length: 10 }, (_, i) => ({ x: 1170 + i * 12, y: 200, w: 6, h: 150 }));
    const p = placeWaitPlaque({ x: 1180, y: 300 }, size, box, candles);
    expect(p.mode).toBe("LEFT");
    expect(p.left + size.w).toBeLessThanOrEqual(1180 - 16);
  });
  it("then below or above the pin, and only onto a spot clear of every candle", () => {
    const candles = [
      ...Array.from({ length: 40 }, (_, i) => ({ x: 700 + i * 12, y: 250, w: 6, h: 100 })),
    ];
    const p = placeWaitPlaque({ x: 1180, y: 300 }, size, box, candles);
    expect(["BELOW", "ABOVE"]).toContain(p.mode);
    const r = { x: p.left, y: p.top, w: size.w, h: size.h };
    expect(candles.some(b => r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h && r.y + r.h > b.y)).toBe(false);
  });
  it("covered everywhere: keeps the original spot and says BLOCKED", () => {
    const wall = [{ x: 0, y: 0, w: 1300, h: 600 }];
    expect(placeWaitPlaque({ x: 400, y: 300 }, size, box, wall)).toEqual({ left: 416, top: 272, mode: "BLOCKED" });
  });
});

describe("MainChart places the H-101 plaque through placeWaitPlaque", () => {
  it("feeds it every visible candle box and paints at the spot it returns", async () => {
    const { readFileSync } = await import("node:fs");
    const mc = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(mc.length).toBeGreaterThan(100000);
    expect(mc).toContain("return placeWaitPlaque(");
    expect(mc).toContain("left: waitPlaqueLiveRef.current?.left ?? waitPlaqueSpot?.left ??");
    expect(mc).toContain("top: waitPlaqueLiveRef.current?.top ?? waitPlaqueSpot?.top ??");
    expect(mc).toContain('data-h101-wait-plaque-spot={waitPlaqueLiveRef.current?.mode ?? waitPlaqueSpot?.mode ?? "RIGHT"}');
    // Every frame, against candles AND the labels/chips this frame put on the glass.
    expect(mc).toContain("const spotP = placeWaitPlaque(pin, { w: 208, h: el.offsetHeight || 60 }, { w: W - axisWP, h: H }, rowBodiesAt(-1e9, 1e9), floatingChips);");
  });
});

describe("the plaque also steps off the labels and chips on the glass", () => {
  it("a caption under the LEFT spot sends it on to a clear spot", () => {
    const candles = Array.from({ length: 10 }, (_, i) => ({ x: 1170 + i * 12, y: 200, w: 6, h: 150 }));
    const caption = { x: 950, y: 260, w: 220, h: 14 }; // "STRUCTURE · HIGHER HIGHS" left of the pin
    const p = placeWaitPlaque({ x: 1180, y: 300 }, size, box, candles, [caption]);
    expect(p.mode).not.toBe("LEFT");
    const r = { x: p.left, y: p.top, w: size.w, h: size.h };
    for (const b of [...candles, caption]) expect(r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h && r.y + r.h > b.y).toBe(false);
  });
});
