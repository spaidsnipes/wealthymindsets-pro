import { describe, expect, it } from "vitest";
import {
  TickBarBuilder, printFromTapeTick, tickBarCoverageLabel, tickBarIdentity, tickBarRefusal,
  type TickPrint,
} from "./tickBars";
import {
  TICK_TF_IDS, TICK_BAR_COUNTS, chartTfSpokenName, isTickTfId, isTFId, liveBarBucketSec,
  normalizeChartTfId, tickCountOf, tickTfSpokenName,
} from "@/lib/timeframes";
import { mintTickBarId } from "@/lib/marketData/canonicalBar";

let seqN = 0;
const pr = (timeMs: number, price: number, size = 1, _side: "buy" | "sell" | null = "buy", extra: Partial<TickPrint> = {}): TickPrint =>
  ({ timeMs, price, size, key: `k${seqN++}`, seq: null, heardLive: true, origin: { price, size, side: "buy", time: timeMs, trade: true }, ...extra });

describe("registry: the tick ids live in the one timeframe registry", () => {
  it("offers 100T / 500T / 1000T / 2000T, derived from the counts", () => {
    expect(TICK_BAR_COUNTS).toEqual([100, 500, 1000, 2000]);
    expect(TICK_TF_IDS).toEqual(["100T", "500T", "1000T", "2000T"]);
  });
  it("parses exact spellings only; clocks are not tick ids and tick ids are not clocks", () => {
    expect(tickCountOf("500T")).toBe(500);
    for (const raw of ["500t", "250T", "T500", "5m", "TICK", "", null, undefined]) expect(tickCountOf(raw as string)).toBeNull();
    for (const id of TICK_TF_IDS) { expect(isTickTfId(id)).toBe(true); expect(isTFId(id)).toBe(false); }
    expect(isTickTfId("5m")).toBe(false);
  });
  it("normalizes the chart vocabulary: tick ids pass, legacy clocks migrate, junk is null", () => {
    expect(normalizeChartTfId("500T")).toBe("500T");
    expect(normalizeChartTfId("D")).toBe("1D");
    expect(normalizeChartTfId("5m")).toBe("5m");
    expect(normalizeChartTfId("777T")).toBeNull();
    expect(normalizeChartTfId("banana")).toBeNull();
  });
  it("has no live clock (the hook builds no forming bar for a trade count)", () => {
    for (const id of TICK_TF_IDS) expect(liveBarBucketSec(id)).toBeNull();
  });
  it("is spoken as trades, never as minutes", () => {
    expect(tickTfSpokenName("500T")).toBe("500 trades bars");
    expect(chartTfSpokenName("1000T")).toBe("1000 trades bars");
    expect(chartTfSpokenName("5m")).toBe("5 minutes bars");
  });
});

describe("identity: source|symbol|T<N>|first-print time|seq", () => {
  it("mints the exact shape and refuses blanks", () => {
    expect(mintTickBarId({ source: "TASTYTRADE", symbolId: "/NQZ26:XCME", ticks: 500, firstPrintMs: 1759835123456, firstSeq: 7 }))
      .toBe("TASTYTRADE|/NQZ26:XCME|T500|1759835123456|7");
    expect(mintTickBarId({ source: "", symbolId: "X", ticks: 500, firstPrintMs: 1, firstSeq: 0 })).toBeNull();
    expect(mintTickBarId({ source: "S", symbolId: "X", ticks: 0, firstPrintMs: 1, firstSeq: 0 })).toBeNull();
    expect(mintTickBarId({ source: "S", symbolId: "X", ticks: 5, firstPrintMs: NaN, firstSeq: 0 })).toBeNull();
  });
  it("a bar's identity carries T<N>, the first print's time, and its provenance", () => {
    const b = new TickBarBuilder(2);
    b.ingest(pr(1000, 10)); b.ingest(pr(1000, 11)); b.ingest(pr(1000, 12, 1, "sell", { heardLive: false }));
    // the third print is older? No — same ms, arrival order: it opens bar 2.
    const [b0, b1] = b.bars();
    const id0 = tickBarIdentity(b0, { source: "COINBASE", symbolId: "BTC-USD", ticks: 2, receivedAt: 5, continuousVenue: true })!;
    expect(id0.barId).toBe("COINBASE|BTC-USD|T2|1000|0");
    expect(id0.timeframe).toBe("2T");
    expect(id0.asOf).toBe(1000);
    expect(id0.provenance).toBe("LIVE_STREAM");
    expect(id0.sessionId).toBe("SESSION_CONTINUOUS");
    const id1 = tickBarIdentity(b1, { source: "COINBASE", symbolId: "BTC-USD", ticks: 2, receivedAt: 5, continuousVenue: true })!;
    // second bar opens in the same ms as the first: seq = its ordinal (2) in that ms
    expect(id1.barId).toBe("COINBASE|BTC-USD|T2|1000|2");
    expect(id1.provenance).toBe("REST_BACKFILL");
    expect(id0.barId).not.toBe(id1.barId);
  });
});

describe("aggregation: N consecutive real prints per bar", () => {
  it("OHLC from print prices, volume = sum of sizes (sides live in THE ladder, not here)", () => {
    const b = new TickBarBuilder(3);
    b.ingest(pr(1000, 100, 2, "buy"));
    b.ingest(pr(1100, 103, 1, "sell"));
    b.ingest(pr(1200, 99, 4, null));
    b.ingest(pr(1300, 101, 5, "buy"));
    const bars = b.bars();
    expect(bars).toHaveLength(2);
    expect(bars[0]).toMatchObject({ open: 100, high: 103, low: 99, close: 99, volume: 7, prints: 3, firstPrintMs: 1000, lastPrintMs: 1200 });
    expect(bars[1]).toMatchObject({ open: 101, close: 101, volume: 5, prints: 1 });
    expect(b.printsToClose()).toBe(2);
  });

  it("dedupes a print heard twice (live + backfill) by its key", () => {
    const b = new TickBarBuilder(2);
    expect(b.ingest(pr(1000, 1, 1, "buy", { key: "event:A" }))).toBe("append");
    expect(b.ingest(pr(1000, 1, 1, "buy", { key: "event:A", heardLive: false }))).toBe("dup");
    expect(b.coverage().prints).toBe(1);
  });

  it("axis time is strictly increasing even when bars open in the same millisecond", () => {
    const b = new TickBarBuilder(1);
    for (let i = 0; i < 5; i++) b.ingest(pr(2000, 10 + i));
    const t = b.bars().map(x => x.time);
    expect(t[0]).toBe(2);
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
    expect(t[4]).toBeCloseTo(2.004, 6);
    expect(b.bars().every(x => x.firstPrintMs === 2000)).toBe(true);
  });

  it("orders same-ms prints by provider sequence where both carry one", () => {
    const b = new TickBarBuilder(2);
    b.ingest(pr(1000, 10, 1, "buy", { seq: 5 }));
    b.ingest(pr(1000, 9, 1, "buy", { seq: 4 })); // older by sequence → inserted before
    expect(b.bars()[0]).toMatchObject({ open: 9, close: 10 });
  });
});

describe("incremental: in-order prints fold O(1), a backfill rebuilds once", () => {
  it("drain reports tail changes for live prints and a reset for older prints", () => {
    const b = new TickBarBuilder(2);
    b.ingest(pr(1000, 1)); b.ingest(pr(1001, 2));
    expect(b.drain()).toEqual({ kind: "tail", fromIndex: 0 });
    expect(b.drain()).toEqual({ kind: "none" });
    b.ingest(pr(1002, 3));
    expect(b.drain()).toEqual({ kind: "tail", fromIndex: 1 });
    b.ingest(pr(500, 0.5, 1, "sell", { heardLive: false }));
    expect(b.drain()).toEqual({ kind: "reset" });
    // anchor moved to the older print: bars re-cut from it
    expect(b.bars().map(x => [x.open, x.close, x.prints])).toEqual([[0.5, 1], [2, 3]].map(([o, c]) => [o, c, 2]));
    expect(b.coverage()).toMatchObject({ fromMs: 500, prints: 4, bars: 2, backfilledPrints: 1 });
  });

  it("a backfill batch then live prints equals building everything in order", () => {
    const all: TickPrint[] = [];
    for (let i = 0; i < 1000; i++) all.push(pr(10_000 + i * 7, 100 + Math.sin(i) * 3, 1 + (i % 4), i % 3 === 0 ? "sell" : "buy", { key: `p${i}` }));
    const ref = new TickBarBuilder(37);
    for (const p of all) ref.ingest(p);
    const b = new TickBarBuilder(37);
    for (const p of all.slice(600)) b.ingest(p);         // live first
    for (const p of all.slice(0, 600).reverse()) b.ingest({ ...p, heardLive: false }); // backfill, newest-first pages
    expect(b.bars().map(x => [x.time, x.open, x.high, x.low, x.close, x.volume, x.prints]))
      .toEqual(ref.bars().map(x => [x.time, x.open, x.high, x.low, x.close, x.volume, x.prints]));
  });

  it("ingestBatch merges newest-first REST pages in one pass and equals the in-order build", () => {
    const all: TickPrint[] = [];
    for (let i = 0; i < 5000; i++) all.push(pr(50_000 + i * 3, 200 + (i % 17), 1, i % 2 ? "buy" : "sell", { key: `b${i}` }));
    const ref = new TickBarBuilder(100);
    for (const p of all) ref.ingest(p);
    const b = new TickBarBuilder(100);
    for (const p of all.slice(4000)) b.ingest(p); // heard live
    const t0 = performance.now();
    for (let page = 3; page >= 0; page--) {      // REST pages, newest page first, each newest-first
      expect(b.ingestBatch(all.slice(page * 1000, page * 1000 + 1000).reverse().map(p => ({ ...p, heardLive: false })))).toBe(1000);
    }
    expect(performance.now() - t0).toBeLessThan(200);
    expect(b.ingestBatch(all.slice(0, 10))).toBe(0); // all dups
    expect(b.drain().kind).toBe("reset");
    expect(b.bars().map(x => [x.time, x.open, x.close, x.volume])).toEqual(ref.bars().map(x => [x.time, x.open, x.close, x.volume]));
    expect(b.coverage()).toMatchObject({ prints: 5000, backfilledPrints: 4000, fromMs: 50_000 });
  });

  it("forEachPrint hands every print its bar's chart time (order-flow bucketing)", () => {
    const b = new TickBarBuilder(2);
    b.ingest(pr(1000, 1)); b.ingest(pr(1500, 2)); b.ingest(pr(3000, 3));
    const seen: [number, number][] = [];
    b.forEachPrint((p, t) => seen.push([p.timeMs, t]));
    expect(seen).toEqual([[1000, 1], [1500, 1], [3000, 3]]);
  });

  it("sheds oldest prints in WHOLE bars so surviving boundaries do not move", () => {
    const b = new TickBarBuilder(10, { maxPrints: 50 });
    for (let i = 0; i < 55; i++) b.ingest(pr(1000 + i, i));
    const bars = b.bars();
    expect(b.coverage().prints).toBe(45);
    expect(bars[0].open).toBe(10);
    expect(bars.every((x, i) => i === bars.length - 1 || x.prints === 10)).toBe(true);
    expect(b.drain().kind).toBe("reset");
  });

  it("PAINT COST: 200k in-order prints fold in well under a frame per print", () => {
    const b = new TickBarBuilder(500);
    const t0 = performance.now();
    const origin = { price: 100, size: 1, side: "buy" as const, time: 1e12, trade: true };
    for (let i = 0; i < 200_000; i++) b.ingest({ timeMs: 1e12 + i, price: 100 + (i % 13), size: 1, key: `x${i}`, seq: null, heardLive: true, origin });
    const ms = performance.now() - t0;
    expect(b.bars()).toHaveLength(400);
    // ~1µs/print on a laptop; the bound is generous so CI noise does not flake.
    expect(ms / 200_000).toBeLessThan(0.05);
  });
});

describe("adapting the shared tape", () => {
  it("only real executed trades become prints", () => {
    expect(printFromTapeTick({ price: 1, size: 1, side: "buy", time: 1, trade: false }, true)).toBeNull();
    expect(printFromTapeTick({ price: NaN, size: 1, side: "buy", time: 1, trade: true }, true)).toBeNull();
    expect(printFromTapeTick({ price: 1, size: 0, side: "buy", time: 1, trade: true }, true)).toBeNull();
  });
  it("keys a print exactly as the chart's one fold dedupes it, and keeps its origin", () => {
    const t = { price: 1, size: 1, side: "sell" as const, time: 1, trade: true, marketEvent: { eventId: "E1", sequenceId: 9 } };
    expect(printFromTapeTick(t, true)).toMatchObject({ key: "event:E1", seq: 9, origin: t });
    expect(printFromTapeTick({ price: 2, size: 3, side: "buy", time: 4, trade: true }, false)).toMatchObject({ key: "legacy:4|2|3|buy", heardLive: false, seq: null });
  });
});

describe("words on the glass", () => {
  it("states the coverage start and print count", () => {
    expect(tickBarCoverageLabel({ fromMs: 5, toMs: 9, prints: 41250, bars: 82, backfilledPrints: 0 }, () => "13:02:11"))
      .toBe("TICK BARS · from 13:02:11 · 41,250 prints");
    expect(tickBarCoverageLabel({ fromMs: null, toMs: null, prints: 0, bars: 0, backfilledPrints: 0 }, () => "x"))
      .toBe("TICK BARS · waiting for the first print");
  });
  it("refuses plainly where there are no prints", () => {
    expect(tickBarRefusal({ assetClass: "forex", tapeSource: "coinbase", perTradeTape: true })).toMatch(/^No trades — tick bars need prints/);
    expect(tickBarRefusal({ assetClass: "equity", tapeSource: null, perTradeTape: false })).toMatch(/No per-trade tape/);
    expect(tickBarRefusal({ assetClass: "equity", tapeSource: "finnhub", perTradeTape: false })).toMatch(/Delayed REST feed/);
    expect(tickBarRefusal({ assetClass: "futures", tapeSource: "tastytrade", perTradeTape: true })).toBeNull();
  });
});
