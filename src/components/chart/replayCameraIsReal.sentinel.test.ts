/**
 * M9 · REPAIR 2 — THE REPLAY CAMERA IS REAL, AND THE FLAG MAY NOT OUTLIVE IT.
 *
 * `REPLAY_DRIVES_THE_CAMERA` went `true` on 2026-09-25 because the wire landed:
 *
 *   ROOM   freezes the chart's bars at the press, derives the window 0..cursor,
 *          hands it to MainChart as `replayBars`, keeps the canonical
 *          MarketState publish on the LIVE bars, and points every chart-reading
 *          derivation at the camera's bars.
 *   GLASS  paints the window, makes it `barsRef` (so the draw loop's overlays
 *          describe the replayed past), routes live ticks OFF the camera into
 *          held live bars, re-runs the series built from `barsRef`, and on Stop
 *          repaints the held live bars.
 *
 * Each of those is a line a later edit could delete while the flag stayed
 * `true` — and a `true` flag with any one of them missing is the original M9
 * defect again: a panel narrating a replay the chart is not showing, or worse,
 * live ticks painting over a camera that every chip certifies as HISTORICAL.
 * So each is pinned here, by code (comments stripped — prose cannot satisfy a
 * pin), and only while the owner claims the wire.
 *
 * The pure laws (frozen, no lookahead, tick routing) are tested behaviourally
 * in src/lib/chart/replayWindow.test.ts; this file proves they are WIRED.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { stripComments } from "@/lib/sourceScan";
import { REPLAY_DRIVES_THE_CAMERA, roomEquipment } from "@/lib/workspace/roomEquipment";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const MAIN = stripComments(read("src/components/chart/MainChart.tsx"));
const DASH = stripComments(read("src/components/chart/ChartsDashboard.tsx"));

/** The source between two anchors, both required. */
function between(src: string, from: string, to: string): string {
  const a = src.indexOf(from);
  expect(a, `anchor vanished: ${from}`).toBeGreaterThan(-1);
  const b = src.indexOf(to, a);
  expect(b, `anchor vanished: ${to}`).toBeGreaterThan(a);
  return src.slice(a, b);
}

describe("M9 repair 2 — the flag is bound to the wire", () => {
  it("has real material to reason about (FALSE_RIPENESS guard)", () => {
    expect(MAIN.length).toBeGreaterThan(100_000);
    expect(DASH.length).toBeGreaterThan(50_000);
  });

  it("the menu tells the same truth as the flag — no 'not wired' confession over a wired camera", () => {
    const replay = roomEquipment(INSTRUMENT_VIEW_ROUTE).find(e => e.id === "bar-replay");
    expect(replay, "the Replay door vanished from /charts").toBeDefined();
    if (REPLAY_DRIVES_THE_CAMERA) {
      expect(replay!.unbuilt, "the menu still confesses an unwired camera the flag says is wired").toBeUndefined();
    } else {
      expect(replay!.unbuilt, "the flag says unwired but the menu stopped saying so").toMatch(/Not wired/);
    }
  });
});

describe.runIf(REPLAY_DRIVES_THE_CAMERA)("THE ROOM — frozen ancestry in, live store untouched", () => {
  it("freezes the LIVE bars at the press, not a slice of whatever is live later", () => {
    const start = between(DASH, "const startReplay = useCallback(", "}, []);");
    expect(start).toContain("const source = replaySourceRef.current;");
    expect(start).toMatch(/freezeReplaySnapshot\(\{[\s\S]*bars: source\.bars,[\s\S]*identities: source\.identities,/);
    expect(start, "replay must not open over nothing").toContain("if (!snapshot) return;");
    expect(DASH).toContain("replaySourceRef.current = { bars: liveChartBars, identities: liveChartBarIdentities, scope: replayScopeKey };");
  });

  it("the camera reads the frozen snapshot through the one window selector", () => {
    expect(DASH).toContain("selectReplayWindow(replaySnapshot, replayIdx, replayScopeKey)");
    expect(DASH).toContain("replayBars={replayCamera?.bars}");
    expect(DASH, "the replay walks the frozen snapshot's length, never the live bar count")
      .toContain("stepReplayCursor(i, 1, replayTotal)");
    expect(DASH).not.toMatch(/setReplayIdx\(i => Math\.min\(chartBars\.length/);
  });

  it("chart-reading derivations see the CAMERA's bars; the MarketState publish sees the LIVE bars", () => {
    expect(DASH).toMatch(/const chartBars: LegacyOhlcvTuple\[\] =\s*replayCamera && cameraWalksHistory \? replayCamera\.bars : liveChartBars;/);
    expect(DASH).toMatch(/const chartBarIdentities: readonly CanonicalBarIdentity\[\] =\s*replayCamera && cameraWalksHistory \? replayCamera\.identities : liveChartBarIdentities;/);
    // THE NO-SECOND-MARKETSTATE LAW. Replay must never author canonical state.
    const publish = between(DASH, "usePublishChartMarketState({", "});");
    expect(publish, "the canonical MarketState publish must read the LIVE bars by name").toContain("bars: liveChartBars,");
    expect(publish).not.toMatch(/bars:\s*chartBars\b/);
  });

  it("a different chart puts the replay down before paint", () => {
    expect(DASH).toMatch(/React\.useLayoutEffect\(\(\) => \{\s*if \(replaySnapshot && replaySnapshot\.scope !== replayScopeKey\) stopReplay\(\);/);
    const stop = between(DASH, "const stopReplay = useCallback(", "}, []);");
    expect(stop).toContain("setReplaySnapshot(null);");
  });

  it("the header withholds the live quote while the camera walks history", () => {
    expect(DASH).toContain("cameraWalksHistory ? null : ticker.price,");
    expect(DASH).toContain("hasReal && !cameraWalksHistory ? { chg: ticker.change, pct: ticker.changePct } : null,");
  });
});

describe.runIf(REPLAY_DRIVES_THE_CAMERA)("THE GLASS — the window is painted, live ticks are held off it", () => {
  it("MainChart READS replayBars into the camera", () => {
    expect(MAIN).toContain("const replayWindowBars = replayActive && replayBars && replayBars.length > 0 ? replayBars : null;");
    expect(MAIN).toContain("replayWindowRef.current = replayWindowBars;");
  });

  it("the tick fold asks the gate FIRST and returns before any series is touched", () => {
    const fold = between(MAIN, "const myTickVersion = versionGuardRef.current.currentVersion;", "}, [liveBar, ready]);");
    expect(fold).toContain("const route    = routeLiveTick(replayCameraRef.current);");
    expect(fold).toContain('const prevBars = route === "HOLD_OFF_CAMERA" ? liveHeldBarsRef.current : barsRef.current;');
    const hold = fold.indexOf('if (route === "HOLD_OFF_CAMERA") {');
    const paint = fold.indexOf("candleRef.current.update(bar as any);");
    expect(hold, "the HOLD_OFF_CAMERA branch is gone — live ticks paint the replay camera").toBeGreaterThan(-1);
    expect(paint).toBeGreaterThan(-1);
    expect(hold, "the gate must run BEFORE the first series update").toBeLessThan(paint);
    // The whole branch, exactly: fold into the HELD live bars, hand them to the
    // room's live store, and END the fold. Anything else in here — or a missing
    // `return` — lets the tick fall through onto the replayed series.
    expect(
      fold.slice(hold),
      "the held branch must fold into the live bars, publish them, and return before painting",
    ).toMatch(/^if \(route === "HOLD_OFF_CAMERA"\) \{\s*liveHeldBarsRef\.current = foldLiveBar\(prevBars, bar\);\s*onBarsReady\?\.\(liveHeldBarsRef\.current, barIdentitiesRef\.current\);\s*return;\s*\}/);
    // Nothing that paints may sit between the top of the fold and the gate.
    const beforeGate = fold.slice(0, hold);
    expect(beforeGate).not.toMatch(/\.update\(|setLastPrice\(|setCandles\(/);
    // The LIVE route writes `barsRef` synchronously. A `setCandles(prev => …)`
    // updater that writes `barsRef` runs at the NEXT render — after a replay
    // that engaged in the same flush has painted its window — and would put
    // today's bars back under every overlay on a replayed camera.
    const liveRoute = fold.slice(paint);
    expect(liveRoute).toMatch(/const next = foldLiveBar\(prevBars, bar\);\s*barsRef\.current = next;\s*setCandles\(next\);/);
    expect(fold).not.toMatch(/setCandles\(prev =>/);
  });

  it("the camera paint makes the window `barsRef`, through the one series-data owner", () => {
    const paint = between(MAIN, "paintCameraRef.current = (bars) => {", "setCameraEpoch(e => e + 1);");
    expect(paint).toContain("cs.setData(mainSeriesPoints(candleType, bars, {");
    expect(paint).toContain("vs.setData(volumeSeriesPoints(");
    expect(paint, "overlays in the draw loop read barsRef — it must BE the window").toContain("barsRef.current = bars;");
    expect(paint).toContain("setCandles(bars);");
    // The bootstrap uses the SAME owner, so replayed and live Renko agree on what a brick is.
    expect(MAIN).toContain("const mainPoints = mainSeriesPoints(candleType, data, {");
    expect(MAIN).not.toMatch(/const renkoData|const rbData|const colData|const volData|const vpData/);
  });

  it("enter holds the live bars; Stop repaints them and returns to real time", () => {
    const effect = between(MAIN, "const replayWindow = replayWindowRef.current;\n    if (replayWindow) {", "}, [replayActive, replayBars, ready]);");
    expect(effect).toContain("liveHeldBarsRef.current = barsRef.current;");
    expect(effect).toContain("replayCameraRef.current = true;");
    expect(effect).toContain("paintCameraRef.current(replayWindow);");
    const exit = effect.slice(effect.indexOf("} else if (replayCameraRef.current) {"));
    expect(exit).toContain("replayCameraRef.current = false;");
    expect(exit).toContain("paintCameraRef.current(live);");
    expect(exit).toContain("scrollToRealTime()");
  });

  it("a rebuild during replay (candle type) re-paints the window over the fresh series", () => {
    expect(MAIN).toMatch(/if \(replayCameraRef\.current\) \{\s*liveHeldBarsRef\.current = data;\s*const replayWindow = replayWindowRef\.current;\s*if \(replayWindow\) paintCameraRef\.current\(replayWindow\);/);
  });

  it("series built once from barsRef are rebuilt on every camera change — no future SMA past the cursor", () => {
    expect(MAIN).toContain("}, [pineOutput, pineCode, ready, cameraEpoch]);");
    expect(MAIN).toContain("}, [activeInds, indSettings, ready, cameraEpoch]);");
    expect(MAIN).toContain("}, [alertLevels, ready, cameraEpoch]);");
  });

  it("no live clock, live quote or live P&L is painted on the replayed glass", () => {
    expect(MAIN, "headline price").toContain("replayCameraOn ? null : ticker.price,");
    expect(MAIN, "headline change").toContain("hasProviderChange && !replayCameraOn ? { chg: change, pct: ticker.changePct as number } : null,");
    expect(MAIN, "on-canvas countdown").toContain("candleTimerRef.current = chartSettings?.candleTimer !== false && !replayCameraOn;");
    expect(MAIN, "countdown pill").toContain('chartSettings?.candleTimer === false || replayCameraOn || barCountdown.kind === "MARKET_CLOSED" ? "hidden" : ""');
    expect(MAIN, "paper-trade live P&L lines").toContain("if (!series || !paperTradesVisible || replayCameraOn) return;");
  });
});
