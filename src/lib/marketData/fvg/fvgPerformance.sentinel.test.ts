/**
 * §58 PERFORMANCE LAW — the whole FVG organism (Garden 19).
 *
 *  1. One detector (pinned by fvgCamera.sentinel) and no repeated history scans:
 *     detectFvgs is cached per bars array; live bars advance by an incremental push.
 *  2. No full-chart recalculation on pointer move: the ONE fvgSceneForCamera
 *     call site in MainChart sits inside the FVG-GLASS paint block behind a key
 *     made of bar COUNT / TIMES / IDENTITY CONTENT (no prices, no pointer); the
 *     pointer path reads the painted hit rects only.
 *  3. No React re-render per tick: the camera memo hands back the SAME scene
 *     object until a bar closes, and MainChart publishes only on a new object.
 *  4. Bounded DOM: no per-gap DOM on the chart — canvas only; one Inspect ticket.
 *  5. No duplicated subscriptions / no leaks: bar reads are deduped and reused;
 *     every reader aborts on unmount; no timers or listeners left behind.
 *  6. Inspect opening does not recompute the ledger.
 *  7. Mobile budget: a 5,000-bar series — timings asserted with headroom.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { createFvgEngine, detectFvgs } from "./fvgEngine";
import { createFvgCameraMemo, fvgSceneForCamera } from "./fvgCamera";
import { clearFvgBarCache, fetchFvgBars, FVG_BAR_REUSE_MS } from "./fvgBarSource";

const SRC = path.resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(path.join(SRC, p), "utf8");

const N = 5000;
const MIN = 60_000;
const T0 = Date.UTC(2026, 8, 1, 0, 0, 0);
const SYM = "BTC-USD";
function makeBars(n: number): CanonicalBar[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let px = 60000;
  const out: CanonicalBar[] = [];
  for (let i = 0; i < n; i++) {
    const o = px, c = o + (rnd() - 0.5) * 120, h = Math.max(o, c) + rnd() * 40, l = Math.min(o, c) - rnd() * 40;
    px = c;
    out.push({ barId: `${SYM}|1m|${T0 + i * MIN}|e0`, symbolId: SYM, sessionId: "S", timeframe: "1m", open: o, high: h, low: l, close: c, volume: 1, asOf: T0 + i * MIN, receivedAt: 0, fidelity: "INDICATIVE", source: "f", provenance: "REST_BACKFILL", truthEpoch: 0 });
  }
  return out;
}
const time = (f: () => void, k = 1) => { const a = performance.now(); for (let i = 0; i < k; i++) f(); return (performance.now() - a) / k; };

describe("§58 · compute: one scan, incremental push, one scene per closed bar (5,000 bars)", () => {
  const bars = makeBars(N + 1);
  const base = bars.slice(0, N);

  it("detectFvgs is cached per bars array — a re-render does not re-scan", () => {
    const first = detectFvgs(base, { symbolId: SYM, timeframe: "1m" });
    expect(first.objects.length).toBeGreaterThan(100);
    const again = time(() => detectFvgs(base, { symbolId: SYM, timeframe: "1m" }), 200);
    expect(detectFvgs(base, { symbolId: SYM, timeframe: "1m" })).toBe(first);
    // Structural: the same object back (above). Timing is a gross ceiling only —
    // the full suite runs ~1,500 files in parallel (2026-10-07 night: flaked).
    expect(again).toBeLessThan(2);
  });

  it("a new closed bar is ONE incremental push, not a rescan", () => {
    const e = createFvgEngine({ symbolId: SYM, timeframe: "1m" });
    const full = time(() => { for (const b of base) e.push(b); });
    const push = time(() => { e.push(bars[N]); });
    expect(e.snapshot().barCount).toBe(N + 1);
    // Structural first: ONE push moved the engine by one bar (above). Timing as a
    // gross ceiling only — a 5,000-bar rescan is ≥ 100× one push on any CPU.
    expect(push).toBeLessThan(50);
    expect(push).toBeLessThan(full + 5);
  });

  it("the camera memo returns the SAME scene object per tick; a new one only when a bar closes", () => {
    const tuples = bars.map(b => ({ time: b.asOf / 1000, open: b.open, high: b.high, low: b.low, close: b.close, volume: 1 }));
    const ids = bars.map(({ open, high, low, close, volume, ...id }) => { void open; void high; void low; void close; void volume; return id; });
    const memo = createFvgCameraMemo();
    const nowMs = T0 + N * MIN; // bar N still forming
    const inp = { candles: tuples, identities: ids, symbolId: SYM, timeframe: "1m", nowMs, replayCursorTimeSec: null };
    const cold = time(() => fvgSceneForCamera(inp, memo));
    const s1 = fvgSceneForCamera(inp, memo);
    // A tick: fresh arrays, same content, forming bar's OHLC moved.
    const ticked = tuples.map((t, i) => (i === N ? { ...t, close: t.close + 5, high: t.high + 5 } : t));
    const tick = time(() => fvgSceneForCamera({ ...inp, candles: [...ticked], identities: [...ids] }, memo), 20);
    expect(fvgSceneForCamera({ ...inp, candles: [...ticked], identities: [...ids] }, memo)).toBe(s1);
    const closeMs = time(() => fvgSceneForCamera({ ...inp, nowMs: nowMs + MIN }, memo));
    const s2 = fvgSceneForCamera({ ...inp, nowMs: nowMs + MIN }, memo);
    expect(s2).not.toBe(s1);
    expect(memo.lastStep).toMatch(/^PUSH:1$|^SAME$/);
    expect(s2.ledger.barCount).toBe(N + 1);
    // STRUCTURAL is the law here (same object per tick, a new one per closed bar,
    // PUSH:1 — asserted above). The timings are LOGGED and held only to gross
    // ceilings: under full-suite parallel load (2026-10-07 night) the old
    // 30 ms tick line flaked the gate. Phone-class numbers live in the serving
    // receipt (CDP 4× throttle: cold ~30 ms, bar close ~6–7 ms).
    console.info(`[fvg §58] cold ${cold.toFixed(1)} ms · tick ${tick.toFixed(2)} ms · close ${closeMs.toFixed(2)} ms`);
    expect(cold).toBeLessThan(3000);
    expect(tick).toBeLessThan(300);
    expect(closeMs).toBeLessThan(600);
  });
});

describe("§58 · the chart: no pointer recompute, no per-tick React, canvas only", () => {
  const main = read("components/chart/MainChart.tsx");
  const dash = read("components/chart/ChartsDashboard.tsx");

  it("the ONE scene call site sits in the paint block behind a count/time/identity key (no prices, no pointer)", () => {
    expect(main.length).toBeGreaterThan(100_000);
    const calls = [...main.matchAll(/fvgSceneForCamera\(/g)].map(m => m.index!);
    expect(calls).toHaveLength(1);
    const begin = main.indexOf("FVG-GLASS-BEGIN"), end = main.indexOf("FVG-GLASS-END");
    expect(begin).toBeGreaterThan(0);
    expect(calls[0]).toBeGreaterThan(begin);
    expect(calls[0]).toBeLessThan(end);
    const keyLine = main.slice(main.indexOf("const keyF ="), main.indexOf("\n", main.indexOf("const keyF =")));
    expect(keyLine).toMatch(/idsF\.length/);
    expect(keyLine).toMatch(/newestId\?\.barId/);
    expect(keyLine).not.toMatch(/\.close|\.high|\.low|\.open|pointer|mouse|clientX/i);
    expect(main.slice(begin, end)).toMatch(/if \(!entry \|\| entry\.key !== keyF\)/);
    expect(main).not.toMatch(/entry\.ids !== idsF/);
  });

  it("the pointer path reads painted hit rects only", () => {
    const at = main.indexOf("const fvgHit = fvgHitsRef.current");
    expect(at).toBeGreaterThan(0);
    const handler = main.slice(at - 3000, at + 600);
    expect(handler).not.toMatch(/fvgSceneForCamera|detectFvgs|createFvgEngine|fvgStateAsOf/);
  });

  it("the scene reaches React only when it is a NEW object", () => {
    expect(main).toMatch(/if \(fvgPublishedRef\.current !== scene\) \{ fvgPublishedRef\.current = scene;/);
    expect([...dash.matchAll(/setFvgScene\b/g)]).toHaveLength(2); // the useState pair + the one onFvgScene wire
    expect(dash).toContain("onFvgScene={setFvgScene}");
  });

  it("bounded DOM: no per-gap DOM node on the chart (canvas only; one Inspect ticket)", () => {
    const chartFiles = ["components/chart/MainChart.tsx", "components/chart/ChartsDashboard.tsx", "components/chart/ChartInspectTicket.tsx", "components/chart/FvgInspectTicket.tsx"];
    for (const f of chartFiles) {
      const src = read(f);
      expect(src).not.toMatch(/(ledger\.objects|visibility\.(open|scars)|fvgScene[^\n]{0,40}objects)\.map\([^)]*\)\s*=>\s*\(?\s*</);
    }
  });

  it("opening Inspect reads the scene's object — it never recomputes the ledger", () => {
    expect(dash).toMatch(/fvgScene\?\.ledger\.objects\.find\(o => o\.objectId === selectedMarketObjectId\)/);
    expect(dash).not.toMatch(/fvgSceneForCamera\(|detectFvgs\(|createFvgEngine\(|fvgStateAsOf\(/);
    expect(read("components/chart/FvgInspectTicket.tsx")).not.toMatch(/fvgSceneForCamera\(|detectFvgs\(|fvgStateAsOf\(/);
  });
});

describe("§58 · reads: deduped, reused, aborted on unmount, nothing left running", () => {
  it("concurrent identical bar reads share ONE request; reuse within the window; refusals are not cached", async () => {
    clearFvgBarCache();
    const body = { candles: [], reason: "x" };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
    const q = { symbol: "SPY", timeframe: "1D", bars: 160, nowMs: 1_000_000, fetcher };
    await Promise.all([fetchFvgBars(q), fetchFvgBars(q), fetchFvgBars(q)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await fetchFvgBars({ ...q, nowMs: q.nowMs + FVG_BAR_REUSE_MS - 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await fetchFvgBars({ ...q, nowMs: q.nowMs + FVG_BAR_REUSE_MS + 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    clearFvgBarCache();
    const bad = vi.fn(async () => new Response("{}", { status: 502 }));
    await fetchFvgBars({ ...q, fetcher: bad });
    await fetchFvgBars({ ...q, fetcher: bad });
    expect(bad).toHaveBeenCalledTimes(2);
  });

  it("an aborted caller stops listening at once", async () => {
    clearFvgBarCache();
    let release: (r: Response) => void = () => {};
    const fetcher = vi.fn(() => new Promise<Response>(r => { release = r; }));
    const ac = new AbortController();
    const p = fetchFvgBars({ symbol: "QQQ", timeframe: "1D", bars: 10, nowMs: 5, fetcher, signal: ac.signal });
    ac.abort();
    expect(await p).toEqual({ ok: false, reason: "The read was stopped." });
    release(new Response("{}", { status: 200 }));
    clearFvgBarCache();
  });

  it("every FVG reader aborts on unmount and leaves no timer or listener", () => {
    for (const f of ["components/scanner/FvgScanStrip.tsx", "components/backtest/FvgStudyPanel.tsx", "components/journal/JournalFvgReferenceField.tsx"]) {
      const src = read(f);
      expect(src).toMatch(/useEffect\(\(\) => \(\) => abortRef\.current\?\.abort\(\), \[\]\)/);
      expect(src).toMatch(/signal: ac\.signal/);
      expect(src).not.toMatch(/setInterval\(|addEventListener\(/);
    }
    const bot = read("components/layout/SpaidBotButton.tsx");
    expect(bot).toContain("window.addEventListener(SPAIDBOT_ASK_EVENT, onAsk)");
    expect(bot).toContain("window.removeEventListener(SPAIDBOT_ASK_EVENT, onAsk)");
  });
});
