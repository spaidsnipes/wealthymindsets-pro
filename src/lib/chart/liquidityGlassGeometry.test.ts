import { describe, expect, it } from "vitest";
import {
  fitWeatherLens, ladderRungYs, lensDistance, LENS_MIN_RX, LENS_MIN_RY, poolSpan,
  scaleAngle, SCALE_HEAVY_T, SCALE_THIN_T, wordOnTopArc, PHASE_WORD,
  weatherLensGate, LENS_MIN_BARS, LENS_MIN_REGION_W,
} from "./liquidityGlassGeometry";
import { candleCutOutRects } from "@/lib/chartKeepOut";

describe("F08A — a pool is BOUNDED IN TIME by its lifecycle", () => {
  it("starts at APPEARED and ends at CONSUMED", () => {
    const s = poolSpan([
      { stage: "APPEARED", time: 100 }, { stage: "GREW", time: 200 },
      { stage: "TOUCHED", time: 300 }, { stage: "CONSUMED", time: 400 },
    ])!;
    expect(s.startTime).toBe(100);
    expect(s.endTime).toBe(400);
    expect(s.consumed).toBe(true);
    expect(s.phases).toEqual([
      { rungs: 2, fromTime: 100, toTime: 200 },
      { rungs: 3, fromTime: 200, toTime: 400 },
    ]);
    expect(s.ticks.map(t => t.stage)).toEqual(["APPEARED", "GREW", "TOUCHED", "CONSUMED"]);
  });

  it("a standing pool has no end — it runs to the live edge", () => {
    const s = poolSpan([{ stage: "APPEARED", time: 100 }, { stage: "PERSISTED", time: 500 }])!;
    expect(s.endTime).toBeNull();
    expect(s.phases[s.phases.length - 1]).toEqual({ rungs: 4, fromTime: 500, toTime: null });
  });

  it("maturity never loses a rung; a touch keeps the form it had", () => {
    const s = poolSpan([
      { stage: "APPEARED", time: 1 }, { stage: "PERSISTED", time: 2 }, { stage: "GREW", time: 3 },
      { stage: "TOUCHED", time: 4 }, { stage: "REFILLED", time: 5 },
    ])!;
    expect(s.phases.map(p => p.rungs)).toEqual([2, 4, 5]);
  });

  it("events out of order are read in time order; no events is no ladder", () => {
    expect(poolSpan([{ stage: "GREW", time: 9 }, { stage: "APPEARED", time: 3 }])!.startTime).toBe(3);
    expect(poolSpan([])).toBeNull();
  });

  it("never names PULLED — this feed has no book", () => {
    expect(Object.keys(PHASE_WORD)).not.toContain("PULLED");
  });

  it("rungs spread over the pool's band, or keep a 3px pitch centred on a thin one", () => {
    expect(ladderRungYs(100, 30, 2)).toEqual([110, 120]);
    const thin = ladderRungYs(100, 3, 4);
    expect(thin[1] - thin[0]).toBeCloseTo(3);
    expect((thin[0] + thin[3]) / 2).toBeCloseTo(101.5);
  });
});

describe("F08B — the weather is a lens over the region it measured", () => {
  const plot = { x0: 0, y0: 90, x1: 1400, y1: 800 };
  const corners = (b: { x0: number; y0: number; x1: number; y1: number }) =>
    [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]] as const;

  it("encloses the measured region, never smaller than the minimum lens", () => {
    const region = { x0: 600, y0: 400, x1: 620, y1: 410 };
    const L = fitWeatherLens(region, plot)!;
    expect(L.rx).toBeGreaterThanOrEqual(LENS_MIN_RX);
    expect(L.ry).toBeGreaterThanOrEqual(LENS_MIN_RY);
    for (const [x, y] of corners(region)) expect(lensDistance(L, x, y)).toBeLessThanOrEqual(1);
  });

  it("encloses a wide region too, centred on it", () => {
    const region = { x0: 300, y0: 200, x1: 700, y1: 500 };
    const L = fitWeatherLens(region, plot)!;
    expect(L.cx).toBeCloseTo(500);
    for (const [x, y] of corners(region)) expect(lensDistance(L, x, y)).toBeLessThanOrEqual(1);
  });

  it("at the live edge it slides onto the plot and still encloses the region", () => {
    const region = { x0: 1380, y0: 300, x1: 1396, y1: 320 };
    const L = fitWeatherLens(region, plot)!;
    expect(L.cx).toBeLessThan(1388);
    for (const [x, y] of corners(region)) expect(lensDistance(L, x, y)).toBeLessThanOrEqual(1);
  });

  it("a tall region at the edge GROWS the lens rather than dropping a corner outside it", () => {
    // Capped to the plot, then slid left of the axis: two corners would sit
    // outside the ring unless it grows (mutation M11).
    const region = { x0: 1390, y0: 200, x1: 1398, y1: 700 };
    const L = fitWeatherLens(region, plot)!;
    for (const [x, y] of corners(region)) expect(lensDistance(L, x, y)).toBeLessThanOrEqual(1);
  });

  it("a region scrolled off the camera draws no lens", () => {
    expect(fitWeatherLens({ x0: 1500, y0: 300, x1: 1600, y1: 320 }, plot)).toBeNull();
    expect(fitWeatherLens({ x0: NaN, y0: 300, x1: 1600, y1: 320 }, plot)).toBeNull();
  });

  it("sets the ring word on the TOP arc, centred, left to right", () => {
    const L = { cx: 500, cy: 400, rx: 100, ry: 70 };
    const g = wordOnTopArc(L, [6, 6, 6, 6, 6], 8);
    expect(g).toHaveLength(5);
    expect(g[2].x).toBeCloseTo(500, 0);
    for (const p of g) expect(p.y).toBeLessThan(400 - 60);
    for (let i = 1; i < g.length; i++) expect(g[i].x).toBeGreaterThan(g[i - 1].x);
  });

  it("the lower-arc scale runs from the dearest cell (lower-left) to the cheapest (lower-right)", () => {
    expect(scaleAngle(1)).toBeCloseTo(SCALE_HEAVY_T);
    expect(scaleAngle(0)).toBeCloseTo(SCALE_THIN_T);
    expect(Math.cos(SCALE_HEAVY_T)).toBeLessThan(0);
    expect(Math.sin(SCALE_HEAVY_T)).toBeGreaterThan(0);
    expect(Math.cos(SCALE_THIN_T)).toBeGreaterThan(0);
  });
});

describe("the lens speaks only where it can be read (serving BTC-USD 1m, 14:48 CDT)", () => {
  const broad = { depth: "MID", spanBars: 20, regionWidth: 200, spanMs: 20 * 60_000 };

  it("H-501: at NEAR only tape and candle anatomy speak — the lens yields, whatever the window", () => {
    expect(weatherLensGate({ ...broad, depth: "NEAR" })).toEqual({ kind: "YIELDED_NEAR", state: "YIELDED_NEAR" });
    expect(weatherLensGate({ ...broad, depth: "NEAR", regionWidth: null }).kind).toBe("YIELDED_NEAR");
  });

  it("a broad measured window at MID or FAR draws", () => {
    expect(weatherLensGate(broad).kind).toBe("DRAW");
    expect(weatherLensGate({ ...broad, depth: "FAR" }).kind).toBe("DRAW");
  });

  it("fewer than LENS_MIN_BARS bars is GATHERING, named once with the minutes of tape held", () => {
    const g = weatherLensGate({ ...broad, spanBars: 3, spanMs: 3.4 * 60_000 });
    expect(g).toEqual({ kind: "GATHERING", state: "GATHERING:3", bars: 3, words: "WEATHER · gathering — 3 min of tape" });
    expect(weatherLensGate({ ...broad, spanBars: LENS_MIN_BARS - 1 }).kind).toBe("GATHERING");
    expect(weatherLensGate({ ...broad, spanBars: LENS_MIN_BARS }).kind).toBe("DRAW");
  });

  it("a region too narrow for the field to read is GATHERING even with enough bars", () => {
    expect(weatherLensGate({ ...broad, regionWidth: LENS_MIN_REGION_W - 1 }).kind).toBe("GATHERING");
  });

  it("under a minute of tape says so; off camera is its own silence", () => {
    const g = weatherLensGate({ ...broad, spanBars: 1, spanMs: 20_000 });
    expect(g.kind === "GATHERING" && g.words).toBe("WEATHER · gathering — <1 min of tape");
    expect(weatherLensGate({ ...broad, regionWidth: null })).toEqual({ kind: "OFF_CAMERA", state: "OFF_CAMERA" });
  });
});

describe("the candle cut-out keeps candles IN FRONT of liquidity paint", () => {
  const bars = [
    { time: 1, open: 10, close: 12, high: 13, low: 9 },
    { time: 2, open: 12, close: 11, high: 12.5, low: 10 },
  ];
  const cam = { visible: null, barSpacing: 10, timeToX: (t: number) => t * 10, priceToY: (p: number) => 200 - p * 10 };
  type R = { x: number; y: number; w: number; h: number };
  const overlaps = (a: R, b: R) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  it("cuts each body and the wick stubs outside it, all disjoint (even-odd safe)", () => {
    const r = candleCutOutRects(bars, cam, 0, 100);
    // Two bodies, and each bar has a wick above and below its body.
    expect(r).toHaveLength(6);
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) expect(overlaps(r[i], r[j])).toBe(false);
  });

  it("stays disjoint at a squeezed bar spacing", () => {
    const tight = { ...cam, barSpacing: 2, timeToX: (t: number) => t * 2 };
    const r = candleCutOutRects(bars, tight, 0, 100);
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) expect(overlaps(r[i], r[j])).toBe(false);
  });

  it("skips candles outside the span", () => {
    const r = candleCutOutRects(bars, cam, 16, 100);
    expect(r.every(b => b.x >= 15)).toBe(true);
    expect(r.length).toBe(3);
  });
});
