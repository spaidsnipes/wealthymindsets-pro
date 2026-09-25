/**
 * The candle keep-out, measured against its claims: the boxes are the newest
 * bodies where the series draws them, and no opaque backing the placer hands
 * back ever sits on one — while the label itself is never lost.
 */
import { describe, expect, it } from "vitest";
import {
  KEEP_OUT_NEWEST,
  KEEP_OUT_RECEIPTS,
  emptyKeepOutLedger,
  isOpaqueBacking,
  keepOutBackingAlpha,
  keepOutReceipt,
  newestCandleKeepOut,
  placeClearOfKeepOut,
  recordKeepOut,
  rectHits,
  type KeepOutBar,
  type KeepOutCamera,
  type ScreenRect,
} from "./chartKeepOut";

// A camera like the chart's: bar i at x = 100 + i*10, price p at y = 1000 - p*10.
const t0 = 1_700_000_000;
const camera = (over: Partial<KeepOutCamera> = {}): KeepOutCamera => ({
  visible: null,
  barSpacing: 10,
  timeToX: t => 100 + ((t - t0) / 60) * 10,
  priceToY: p => 1000 - p * 10,
  ...over,
});
const bar = (i: number, open: number, close: number): KeepOutBar => ({ time: t0 + i * 60, open, close });
const bars = Array.from({ length: 10 }, (_, i) => bar(i, 50 + i, 51 + i));

describe("newestCandleKeepOut — one box per newest body in view", () => {
  it("returns the newest three bodies, newest first, at the series' own coordinates", () => {
    const k = newestCandleKeepOut(bars, camera());
    expect(k).toHaveLength(KEEP_OUT_NEWEST);
    // Bar 9: x = 190, open 59 → y 410, close 60 → y 400; half = barSpacing/2 = 5; pad 2.
    expect(k[0]).toEqual({ x: 185, y: 398, w: 10, h: 14 });
    expect(k[1].x).toBe(175);
    expect(k[2].x).toBe(165);
  });

  it("covers the BODY only: open→close, never the wick range", () => {
    const k = newestCandleKeepOut([{ time: t0, open: 50, close: 48 }], camera());
    // Body 48..50 → y 500..520, padded by 2.
    expect(k[0].y).toBe(498);
    expect(k[0].y + k[0].h).toBe(522);
  });

  it("keeps a minimum half-width when the camera is zoomed far out", () => {
    const k = newestCandleKeepOut(bars, camera({ barSpacing: 1 }));
    expect(k[0].w).toBe(6);
  });

  it("follows the visible range, not the end of the array, when scrolled back", () => {
    const k = newestCandleKeepOut(bars, camera({ visible: { from: 0.2, to: 5.3 } }));
    expect(k.map(b => b.x + b.w / 2)).toEqual([150, 140, 130]);
  });

  it("counts a forming candle half past the right edge as in view", () => {
    const k = newestCandleKeepOut(bars, camera({ visible: { from: 0, to: 8.6 } }));
    expect(k[0].x + k[0].w / 2).toBe(190);
  });

  it("covers what exists with fewer than three bars, and nothing with none", () => {
    expect(newestCandleKeepOut(bars.slice(0, 2), camera())).toHaveLength(2);
    expect(newestCandleKeepOut([], camera())).toEqual([]);
  });

  it("skips a bar the camera cannot place rather than inventing a box", () => {
    const cam = camera({ timeToX: t => (t === t0 + 9 * 60 ? null : 100 + ((t - t0) / 60) * 10) });
    const k = newestCandleKeepOut(bars, cam);
    expect(k.map(b => b.x + b.w / 2)).toEqual([180, 170, 160]);
  });
});

describe("rectHits", () => {
  const box: ScreenRect = { x: 10, y: 10, w: 10, h: 10 };
  it("counts overlaps and ignores touching edges", () => {
    expect(rectHits({ x: 15, y: 15, w: 10, h: 10 }, [box])).toBe(1);
    expect(rectHits({ x: 20, y: 10, w: 10, h: 10 }, [box])).toBe(0);
    expect(rectHits({ x: 0, y: 0, w: 50, h: 50 }, [box, { ...box, x: 30 }])).toBe(2);
  });
});

describe("placeClearOfKeepOut — the label moves, the candle wins, the words stay", () => {
  const keepOut = newestCandleKeepOut(bars, camera());
  // A label printed right on the newest body (x 185..195, y 398..412).
  const onNewest: ScreenRect = { x: 150, y: 400, w: 44, h: 11 };

  it("leaves a clear label exactly where it was", () => {
    const p = placeClearOfKeepOut({ x: 20, y: 400, w: 44, h: 11 }, keepOut, { minX: 4 });
    expect(p.mode).toBe("CLEAR");
    expect(p.rect).toEqual({ x: 20, y: 400, w: 44, h: 11 });
  });

  it("slides LEFT past every protected body and keeps its own price row", () => {
    const p = placeClearOfKeepOut(onNewest, keepOut, { minX: 4 });
    expect(p.mode).toBe("SLID");
    expect(p.rect.y).toBe(onNewest.y);
    expect(p.rect.x).toBeLessThan(onNewest.x);
    expect(rectHits(p.rect, keepOut)).toBe(0);
    expect(p.displaced).toBe(true);
    expect(p.onCandles).toBe(false);
  });

  it("slides past chips it would land on as well", () => {
    // Stairs so each body sits on the label's row.
    const flat = Array.from({ length: 10 }, (_, i) => bar(i, 59, 60));
    const k = newestCandleKeepOut(flat, camera());
    const chip: ScreenRect = { x: 120, y: 395, w: 30, h: 20 };
    const p = placeClearOfKeepOut(onNewest, k, { minX: 4, blockers: [chip] });
    expect(p.mode).toBe("SLID");
    expect(rectHits(p.rect, [...k, chip])).toBe(0);
    expect(p.rect.x + p.rect.w).toBeLessThanOrEqual(chip.x);
  });

  it("tries the placer's own alternate slots before sliding", () => {
    const below: ScreenRect = { ...onNewest, y: 440 };
    const p = placeClearOfKeepOut(onNewest, keepOut, { minX: 4, alternates: [below] });
    expect(p.mode).toBe("MOVED");
    expect(p.rect).toEqual(below);
  });

  it("strict: a slot test against chips too, not only against candles", () => {
    const chip: ScreenRect = { x: 10, y: 395, w: 30, h: 20 };
    const pref: ScreenRect = { x: 20, y: 400, w: 44, h: 11 };
    expect(placeClearOfKeepOut(pref, keepOut, { minX: 4, blockers: [chip] }).mode).toBe("CLEAR");
    const strict = placeClearOfKeepOut(pref, keepOut, { minX: 4, blockers: [chip], strict: true, alternates: [{ ...pref, y: 440 }] });
    expect(strict.mode).toBe("MOVED");
    // Moved for a chip, not for a candle: not a keep-out slide.
    expect(strict.displaced).toBe(false);
  });

  it("never returns a clear/moved/slid rect that covers a protected body — swept", () => {
    for (let x = 60; x <= 200; x += 7) {
      for (let y = 380; y <= 430; y += 5) {
        const p = placeClearOfKeepOut({ x, y, w: 44, h: 11 }, keepOut, { minX: 4, alternates: [{ x, y: y - 30, w: 44, h: 11 }] });
        if (p.mode !== "BLOCKED") expect(rectHits(p.rect, keepOut)).toBe(0);
        else expect(p.onCandles).toBe(true);
      }
    }
  });

  it("with no room to slide, keeps the label and drops its backing below opaque", () => {
    const p = placeClearOfKeepOut(onNewest, keepOut, { minX: 140 });
    expect(p.mode).toBe("BLOCKED");
    expect(p.rect).toEqual(onNewest);
    expect(p.onCandles).toBe(true);
    expect(isOpaqueBacking(0.72)).toBe(true);
    expect(isOpaqueBacking(keepOutBackingAlpha(p, 0.72))).toBe(false);
    expect(keepOutBackingAlpha({ onCandles: false }, 0.72)).toBe(0.72);
  });
});

describe("the frame's receipt", () => {
  it("is withdrawn (null) when no placer consulted the keep-out", () => {
    expect(keepOutReceipt(emptyKeepOutLedger())).toBeNull();
  });

  it("publishes box count, slides and yields when it was consulted", () => {
    const ledger = emptyKeepOutLedger();
    ledger.boxes = newestCandleKeepOut(bars, camera());
    const keepOut = ledger.boxes;
    recordKeepOut(ledger, placeClearOfKeepOut({ x: 20, y: 400, w: 44, h: 11 }, keepOut, { minX: 4 }));
    recordKeepOut(ledger, placeClearOfKeepOut({ x: 150, y: 400, w: 44, h: 11 }, keepOut, { minX: 4 }));
    recordKeepOut(ledger, placeClearOfKeepOut({ x: 150, y: 400, w: 44, h: 11 }, keepOut, { minX: 140 }));
    expect(keepOutReceipt(ledger)).toEqual({ candleKeepOut: "3", keepOutSlides: "1", labelsYieldedToCandles: "1" });
    expect(Object.keys(keepOutReceipt(ledger) ?? {}).sort()).toEqual([...KEEP_OUT_RECEIPTS].sort());
  });

  it("an empty camera still publishes '0' once consulted", () => {
    const ledger = emptyKeepOutLedger();
    ledger.boxes = newestCandleKeepOut([], camera());
    expect(keepOutReceipt(ledger)?.candleKeepOut).toBe("0");
  });
});
