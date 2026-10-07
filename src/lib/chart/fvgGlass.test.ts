import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { selectFvgVisibility, type FvgObject } from "@/lib/marketData/fvg/fvgEngine";
import { createFvgCameraMemo, fvgSceneForCamera } from "@/lib/marketData/fvg/fvgCamera";
import {
  fvgAgeFactor,
  fvgAlpha,
  fvgBandGeometry,
  fvgClearZoneX,
  fvgInspectRows,
  fvgKeepOutStrips,
  fvgReceipt,
  isFvgObjectId,
  FVG_OPACITY,
} from "./fvgGlass";

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const SYM = "BTC-USD";
type Row = readonly [number, number, number, number];
const FLAT: Row[] = Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row);
const BULL: Row[] = [[100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]];
const AWAY: Row = [104.5, 105, 103.5, 104.5];
/** Every bar of an n-bar series has closed. */
const NOW = (n: number) => T0 + n * MIN;

function tuples(rows: readonly Row[]): LegacyOhlcvTuple[] {
  return rows.map(([o, h, l, c], i) => ({ time: (T0 + i * MIN) / 1000, open: o, high: h, low: l, close: c, volume: 1 }));
}
function ids(rows: readonly Row[], tf = "1m"): CanonicalBarIdentity[] {
  return rows.map((_, i) => ({
    barId: `${SYM}|${tf}|${T0 + i * MIN}|e0`, symbolId: SYM, sessionId: "SESSION_CONTINUOUS", timeframe: tf,
    asOf: T0 + i * MIN, receivedAt: T0 + (i + 1) * MIN, fidelity: "INDICATIVE", source: "fixture", provenance: "REST_BACKFILL", truthEpoch: 0,
  }));
}

describe("the camera door feeds the glass — incremental live memo ≡ full scan", () => {
  it("pushes appended closed bars into the same engine; same ledger as the memo-less scan", () => {
    const rows = [...FLAT, ...BULL, AWAY, AWAY, AWAY];
    const t = tuples(rows), id = ids(rows);
    const memo = createFvgCameraMemo();
    const base = { identities: id, symbolId: SYM, timeframe: "1m", nowMs: NOW(rows.length), replayCursorTimeSec: null };
    fvgSceneForCamera({ ...base, candles: t.slice(0, 16) }, memo);
    expect(memo.lastStep).toBe("REBUILD:16");
    const live = fvgSceneForCamera({ ...base, candles: t }, memo);
    expect(memo.lastStep).toBe(`PUSH:${rows.length - 16}`);
    expect(live.ledger).toEqual(fvgSceneForCamera({ ...base, candles: t }).ledger);
    fvgSceneForCamera({ ...base, candles: t }, memo);
    expect(memo.lastStep).toBe("SAME");
    expect(live.barTimesSec[0]).toBe(t[0].time);
  });

  it("tick bars: the newest bar is forming, each other closed when the next opened", () => {
    const rows = [...FLAT, ...BULL, AWAY];
    const s = fvgSceneForCamera({ candles: tuples(rows), identities: ids(rows, "100T"), symbolId: SYM, timeframe: "100T", nowMs: 0, replayCursorTimeSec: null, tickBars: true }, createFvgCameraMemo());
    expect(s.forming).toBe(1);
    expect(s.ledger.objects.length).toBe(1);
    expect(s.ledger.refusals).toEqual([]);
    expect(s.ledger.closeTimes[0]).toBe(T0 + MIN);
  });

  it("tick bars on a millisecond axis (tickBars.ts time = firstPrintMs / 1000) still pair and place", () => {
    const rows = [...FLAT, ...BULL, AWAY];
    const t = tuples(rows).map((b, i) => ({ ...b, time: (T0 + i * MIN + 437) / 1000 }));
    const id = ids(rows, "100T").map((x, i) => ({ ...x, asOf: T0 + i * MIN + 437 }));
    const s = fvgSceneForCamera({ candles: t, identities: id, symbolId: SYM, timeframe: "100T", nowMs: 0, replayCursorTimeSec: null, tickBars: true });
    expect(s.unpaired).toBe(0);
    expect(s.ledger.objects.length).toBe(1);
    expect(s.barTimesSec[0]).toBe(t[0].time);
  });

  it("FUTURE LEAK: replay on b2 → the gap does not exist; on b3 → born, untouched", () => {
    const rows = [...FLAT, ...BULL, AWAY, [104.5, 105, 101.6, 104.4]] as Row[];
    const t = tuples(rows);
    const base = { candles: t, identities: ids(rows), symbolId: SYM, timeframe: "1m", nowMs: NOW(rows.length) };
    const b2 = FLAT.length + 1;
    expect(fvgSceneForCamera({ ...base, replayCursorTimeSec: t[b2].time }).ledger.objects).toEqual([]);
    const at3 = fvgSceneForCamera({ ...base, replayCursorTimeSec: t[b2 + 1].time }).ledger.objects[0];
    expect(at3.interactions).toEqual([]);
    expect(at3.maxPenetration).toBe(0);
  });
});

function ledgerWithOne(extra: Row[] = [AWAY]) {
  const rows = [...FLAT, ...BULL, ...extra];
  const s = fvgSceneForCamera({ candles: tuples(rows), identities: ids(rows), symbolId: SYM, timeframe: "1m", nowMs: NOW(rows.length), replayCursorTimeSec: null });
  const o: FvgObject = s.ledger.objects[0];
  const memo = { timeSec: s.barTimesSec, count: s.ledger.barCount, ledger: s.ledger, closeTimes: s.ledger.closeTimes };
  return { o, memo };
}

const cam = (xStop = 900) => ({
  timeToX: (sec: number) => (sec * 1000 - T0) / MIN * 10,
  priceToY: (p: number) => 1000 - p * 5,
  xStop,
});

describe("fvgBandGeometry — territory, not a label", () => {
  it("an untouched bullish gap: from b2 to the clear zone, all remaining, near edge = top", () => {
    const { o, memo } = ledgerWithOne();
    const g = fvgBandGeometry(o, cam(), k => memo.timeSec[k] ?? null, { newestIndex: memo.count - 1 })!;
    expect(g.bullish).toBe(true);
    expect(g.x0).toBe((FLAT.length + 1) * 10);
    expect(g.x1).toBe(900);
    expect(g.nearY).toBe(g.yTop);
    expect(g.visited).toBeNull();
    expect(g.remaining).not.toBeNull();
    expect(g.form).toBe("LIVE");
  });

  it("a partial visit splits the band: visited part (scar) at the near edge, remaining below", () => {
    const { o, memo } = ledgerWithOne([AWAY, [104.5, 105, 101.6, 104.4]]);
    expect(o.maxPenetration).toBeGreaterThan(0);
    const g = fvgBandGeometry(o, cam(), k => memo.timeSec[k] ?? null, { newestIndex: memo.count - 1, closeTimes: memo.closeTimes })!;
    expect(g.visited).not.toBeNull();
    expect(g.remaining).not.toBeNull();
    expect(g.visited!.y0).toBeCloseTo(g.yTop);
    expect(g.remaining!.y0).toBeGreaterThanOrEqual(g.visited!.y1 - 0.01);
    expect(g.rejectTicks.length).toBe(1);
  });

  it("traded through: the band ends at the terminal bar and the far edge is broken", () => {
    const { o, memo } = ledgerWithOne([AWAY, [104.5, 104.6, 99, 99.5]]);
    expect(o.tradedThrough).not.toBeNull();
    const g = fvgBandGeometry(o, cam(), k => memo.timeSec[k] ?? null, { newestIndex: memo.count - 1 })!;
    expect(g.farBroken).toBe(true);
    expect(g.form).toBe("SCAR");
    expect(g.x1).toBe((FLAT.length + 4) * 10);
    expect(g.visited).toEqual({ y0: g.yTop, y1: g.yBottom });
  });

  it("CLEAR ZONE: nothing at or right of xStop; a band born inside it is not drawn", () => {
    const { o, memo } = ledgerWithOne();
    const g = fvgBandGeometry(o, cam(200), k => memo.timeSec[k] ?? null, { newestIndex: memo.count - 1 })!;
    expect(g.x1).toBeLessThanOrEqual(200);
    expect(fvgBandGeometry(o, cam(161), k => memo.timeSec[k] ?? null, { newestIndex: memo.count - 1 })).toBeNull();
  });

  it("the tap target is never thinner than minHit", () => {
    const { o, memo } = ledgerWithOne();
    const g = fvgBandGeometry(o, { ...cam(), priceToY: p => 500 - p * 0.001 }, k => memo.timeSec[k] ?? null, { newestIndex: memo.count - 1, minHit: 24 })!;
    expect(g.hit.h).toBe(24);
  });
});

describe("clear zone + keep-out strips", () => {
  it("stops a slot and a half before the newest candle, never past the plot", () => {
    expect(fvgClearZoneX(800, 10, 900)).toBe(785);
    expect(fvgClearZoneX(null, 10, 900)).toBe(900);
    expect(fvgClearZoneX(2000, 10, 900)).toBe(900);
  });
  it("merges overlapping strips so even-odd never re-opens one", () => {
    expect(fvgKeepOutStrips([100, 104, null, 200])).toEqual([{ y0: 97, y1: 107 }, { y0: 197, y1: 203 }]);
  });
});

describe("opacity ladder — memory quiet, never invisible", () => {
  it("age fades live → scar → memory, floor holds", () => {
    const live = fvgAgeFactor({ state: "OPEN", tradedThrough: null, mitigation: "NONE", barsSinceInteraction: 0, scarBarIndex: null }, 10);
    const old = fvgAgeFactor({ state: "OPEN", tradedThrough: null, mitigation: "NONE", barsSinceInteraction: 1e6, scarBarIndex: null }, 10);
    const mem = fvgAgeFactor({ state: "MEMORY", tradedThrough: null, mitigation: "NONE", barsSinceInteraction: 0, scarBarIndex: null }, 10);
    expect(live).toBe(1);
    expect(old).toBe(0.5);
    expect(mem).toBe(0.3);
    expect(fvgAlpha(FVG_OPACITY.visitedFill, mem)).toBe(FVG_OPACITY.floor);
  });
});

describe("receipts + Inspect", () => {
  it("fvg receipt names the definition and the budget's hidden count", () => {
    const { memo } = ledgerWithOne();
    expect(fvgReceipt(selectFvgVisibility(memo.ledger))).toBe("OPEN:1|SCARS:0|HIDDEN:0|DEF:FVG_3C@1");
  });
  it("Inspect rows carry the numbers (size, penetration, remaining, horizon, senses) and the honesty line", () => {
    const { o } = ledgerWithOne([AWAY, [104.5, 105, 101.6, 104.4]]);
    const rows = fvgInspectRows(o, p => p.toFixed(2), ms => new Date(ms).toISOString());
    const byId = new Map(rows.map(r => [r.id, r.value]));
    expect(byId.get("boundaries")).toBe("101.00 – 102.00 · near edge 102.00 · far edge 101.00");
    expect(byId.get("penetration")).toMatch(/^40% of the territory/);
    expect(byId.get("remaining")).toBe("101.00 – 101.60");
    expect(byId.get("sense-price")).toMatch(/^FULL/);
    expect(byId.get("sense-flow")).toMatch(/^NOT ATTACHED/);
    expect(byId.get("honesty")).toMatch(/No guaranteed return/);
    expect(rows.some(r => /MUST FILL|score \d|strength/i.test(r.value))).toBe(false);
  });
  it("isFvgObjectId reads the minting rule", () => {
    expect(isFvgObjectId("FVG|BTC-USD|1m|1|BULLISH|v1")).toBe(true);
    expect(isFvgObjectId("ZONE:x:SUPPLY")).toBe(false);
    expect(isFvgObjectId(null)).toBe(false);
  });
});
