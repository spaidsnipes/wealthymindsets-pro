/**
 * NEAR SPEAKS IN GEOMETRY — canon plates H-501 (NEAR: "tape paths, candle
 * components, local anchors"), H-701 ("one candle — one event": big-trade
 * cluster ON THE WICK as dots sized by size, response hatch INSIDE the bar),
 * F06B (raw tape lives in Inspect for the selected object, camera alive) and
 * M46 (footprint numbers in the bars' price rows).
 *
 * Founder, 2026-09-25 13:58 CDT: "STOP BUILDING FROM MEMORY … I STILL HAVE A
 * LOT OF JUST CARDS, NOT THE ACTUAL DESIGNS WITHIN THE CANON." On serving,
 * BTC-USD 1m at NEAR showed a TAPE · LAST 10 PRINTS list box over the
 * candles, HIGH (WICK) / OPEN / CLOSE / LOW (WICK) words on leaders at rest,
 * three boxed print tickets and the footprint's floating badges knotted by the
 * price axis. These sentinels hold the geometry that replaced them.
 *
 * Source breadcrumbs plus two behavioural proofs (the tape owner's geometry,
 * Inspect's raw rows). Every extractor asserts its landmarks.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartInspectTicket from "@/components/chart/ChartInspectTicket";
import type { BigTradeTick } from "@/lib/bigTradeLevels";
import { selectInspectTicket } from "@/lib/marketData/viewModels/selectInspectTicket";
import { selectBarTape, selectPrintRawTape } from "@/lib/marketData/viewModels/selectNearTape";

const RAW = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "").replace(/[ \t]\/\/ .*$/gm, "");
const CHART = strip(RAW);

/** The NEAR block, from its depth read to its OFF branch. */
const near = () => {
  const a = CHART.indexOf("const nearDepth = semanticDensity.depth;");
  expect(a, "NEAR depth read").toBeGreaterThan(-1);
  const b = CHART.indexOf("for (const k of NEAR_GLASS_RECEIPTS) delete canvas.dataset[k];", a);
  expect(b, "NEAR OFF branch").toBeGreaterThan(a);
  return CHART.slice(a, b + 80);
};

/** The cursor-mode click handler. */
const click = () => {
  const a = CHART.indexOf("const handleCursorSelectUp = useCallback(");
  expect(a).toBeGreaterThan(-1);
  const b = CHART.indexOf("}, [drawingTool, hitTestDrawing, onSelectBigTrade", a);
  expect(b).toBeGreaterThan(a);
  return CHART.slice(a, b);
};

describe("NEAR paints no tape list box", () => {
  it("the only words the NEAR block prints are the sides' one legend and the hovered/selected bar's part names", () => {
    const b = near();
    const texts = [...b.matchAll(/ctx\.fillText\(([^,]+),/g)].map(m => m[1]);
    expect(texts).toEqual(["legendN", "p.word"]);
    // Code, not the history comment that names what was removed.
    expect(CHART).not.toContain("TAPE · LAST");
    // No backing card of any kind: the block fills dots and a hatch clip, never a rectangle.
    expect(b).not.toMatch(/fillRect\(/);
    expect(b).not.toMatch(/colX|colW \+|colH/);
  });

  it("the old list owner is not read by the glass", () => {
    expect(CHART).not.toMatch(/selectNearTape\(/);
    expect(CHART).not.toMatch(/nearTapeCache/);
  });
});

describe("NEAR carries no at-rest anatomy word knot", () => {
  it("part names print only for the hovered bar or the selected print's bar", () => {
    const b = near();
    expect(b).toMatch(/const hoverTN = hoverKeyN \? Number\(hoverKeyN\.split\("\|"\)\[0\]\) : NaN;/);
    expect(b).toMatch(/const hoverKeyN = lastCursorKeyRef\.current;/);
    expect(b).toMatch(/const wordsT = Number\.isFinite\(hoverTN\) \? hoverTN : spN \? spN\.barTime : null;/);
    const gate = b.indexOf("if (wb) {");
    const word = b.indexOf("ctx.fillText(p.word,");
    expect(gate).toBeGreaterThan(-1);
    expect(word).toBeGreaterThan(gate);
    // Every part name is placed by the keep-out owner, or not printed.
    expect(b.slice(gate, word)).toMatch(/const at = placeNear\(\[\{ x: bodyEdge - 8 - tw, y: \+yw - 7, w: tw, h: 14 \}\]\);\s*if \(!at\) continue;/);
  });

  it("the components are geometry on every bar: open tick left, close tick right, value hatch inside the body", () => {
    const b = near();
    expect(b).toMatch(/ctx\.moveTo\(cx - halfW - tick, Math\.round\(\+yO\) \+ 0\.5\); ctx\.lineTo\(cx - halfW, Math\.round\(\+yO\) \+ 0\.5\);/);
    expect(b).toMatch(/ctx\.moveTo\(cx \+ halfW, Math\.round\(\+yC\) \+ 0\.5\); ctx\.lineTo\(cx \+ halfW \+ tick, Math\.round\(\+yC\) \+ 0\.5\);/);
    // The hatch is the bar's OWN held-tape value area, clipped inside the body width.
    expect(b).toMatch(/const va = tape\?\.valueArea;/);
    expect(b).toMatch(/const vx = cx - halfW \+ 1, vw = Math\.max\(2, colW - 2\);/);
    expect(b).toMatch(/ctx\.rect\(vx, vTop, vw, vH\); ctx\.clip\(\);/);
    // Where the footprint's rows fill the bar, a bracket on its edges, not a hatch across the numbers.
    expect(b).toMatch(/const fpRowsFill = fpRowModes\.includes\(effectiveFP\) && fpBarsPainted > 0;/);
  });
});

describe("prints and paths land at their real price and time", () => {
  it("a dot's y is its print price and its x is its execution time across its own bar's slot", () => {
    const b = near();
    expect(b).toMatch(/const xr = tsN\.timeToCoordinate\(c\.time as never\);/);
    expect(b).toMatch(/barCx - slotW \/ 2 \+ Math\.max\(0, Math\.min\(1, \(tMs \/ 1000 - barTime\) \/ Math\.max\(1, intervalN\)\)\) \* slotW;/);
    expect(b).toMatch(/const yd = srs\.priceToCoordinate\(d\.price\);/);
    expect(b).toMatch(/const xd = xOfPrint\(cx, Number\(c\.time\), d\.timeMs\);/);
    // Sized by size, against the largest print in view.
    expect(b).toMatch(/const r = 1\.5 \+ \(rMax - 1\.5\) \* Math\.sqrt\(d\.size \/ Math\.max\(maxSize, 1e-12\)\);/);
    // The forming bar's path, point by point, on the same transforms.
    expect(b).toMatch(/const yp = srs\.priceToCoordinate\(p\.price\);/);
    expect(b).toMatch(/const xp = xOfPrint\(liveN\.cx, Number\(liveN\.c\.time\), p\.timeMs\);/);
  });

  it("the tape owner hands back each bar's largest prints at their exact time and price, and the forming path in time order", () => {
    const bar = 1_000;
    const prints: BigTradeTick[] = [
      // pushed newest-first per flush, as the accumulator really fills
      { price: 101.5, bid: 0, ask: 0.2, timeMs: 1_000_050, printKey: "e5", aggressorMethod: "PROVIDER" },
      { price: 99.25, bid: 3, ask: 0, timeMs: 1_000_040, printKey: "e4", aggressorMethod: "TICK_RULE" },
      { price: 100.75, bid: 0, ask: 5, timeMs: 1_000_030, printKey: "e3", aggressorMethod: "PROVIDER" },
      { price: 100, bid: 0, ask: 1, timeMs: 1_000_010, printKey: "e1" },
      { price: 100.5, bid: 0.5, ask: 0, timeMs: 1_000_020, printKey: "e2", aggressorMethod: "PROVIDER" },
    ];
    const vm = selectBarTape(prints, null, { barTime: bar, intervalSec: 60, maxDots: 2, withPath: true }).vm;
    expect(vm.held).toBe(5);
    expect(vm.dots.map(d => [d.printKey, d.price, d.timeMs, d.size, d.fidelity])).toEqual([
      ["e3", 100.75, 1_000_030, 5, "OBSERVED"],
      ["e4", 99.25, 1_000_040, 3, "INFERRED"],
    ]);
    const path = vm.path ?? [];
    expect(path.map(p => p.timeMs)).toEqual([...path.map(p => p.timeMs)].sort((a, z) => a - z));
    // Decimation never loses the bar's extremes.
    expect(Math.max(...path.map(p => p.price))).toBe(101.5);
    expect(Math.min(...path.map(p => p.price))).toBe(99.25);
  });
});

describe("the sides are inked only where lawful", () => {
  it("OBSERVED solid, INFERRED ring, UNKNOWN grey — and with no room for the legend, no dot carries a side", () => {
    const b = near();
    expect(b).toMatch(/const legendN = tapeDotLegend\(sawInferredN, sawUnknownN\);/);
    expect(b).toMatch(/const legendAt = placeNear\(prefs\);/);
    expect(b).toMatch(/sidesN = "SILENCED:NO_LEGEND_ROOM";/);
    expect(b).toMatch(/const sidesLawful = sidesN === "OBSERVED" \|\| sidesN\.startsWith\("LEGEND:"\);/);
    expect(b).toMatch(/const ink = sidesLawful \? dotSideInk\(d\.fidelity\) : "NEUTRAL";/);
  });
});

describe("collision goes through the keep-out owner", () => {
  it("every word and the legend are placed strictly against candle bodies and earlier chips, below the header and the price legend", () => {
    const b = near();
    expect(b).toMatch(/const blockersN = \[\.\.\.forceChips, \.\.\.fpCells\];/);
    expect(b).toMatch(/const spot = placeClearOfKeepOut\(pref, nearBodies, \{ minX: nearMinX, blockers: blockersN, strict: true, alternates \}\);/);
    // Candidates outside pane 0's body band are dropped before placement, so an alternate can still win.
    expect(b).toMatch(/const inBand = candidates\.filter\(r => r\.y >= nearFloorY && r\.y \+ r\.h <= pane0Bottom - 2\);/);
    expect(b).toMatch(/const nearBodies = spanCandleKeepOut\(nearAll, /);
    expect(b).toMatch(/const nearFloorY = Math\.max\(HEADER_FLOOR_Y, BELOW_PRICE_LEGEND\) \+ 4;/);
    expect(b).toMatch(/const onChip = rectHits\(spot\.rect, blockersN\) > 0 \|\| spot\.rect\.y < nearFloorY \|\| spot\.rect\.y \+ spot\.rect\.h > pane0Bottom - 2;/);
    // The spot the OWNER chose is what prints — or nothing does. Returning the
    // caller's preferred rect would overprint the chip it collided with.
    const helper = b.slice(b.indexOf("const placeNear = ("), b.indexOf("ctx.save();", b.indexOf("const placeNear = (")));
    const returns = [...helper.matchAll(/return ([^;]+);/g)].map(m => m[1]);
    expect(returns).toEqual(["null", "onChip ? null : spot.rect"]);
    expect(b).toMatch(/forceChips\.push\(legendAt\);/);
    expect(b).toMatch(/forceChips\.push\(at\);/);
  });
});

describe("NEAR words yield to the footprint's cells (serving, 2026-09-25 14:17 CDT)", () => {
  it("every bar with captured rows contributes its full high→low cell column, at the body's width, as a blocker", () => {
    const b = near();
    const a = b.indexOf("const fpCells: NearRect[] = [];");
    const z = b.indexOf("const placeNear = (");
    expect(a).toBeGreaterThan(-1);
    // Built before the placer that reads it.
    expect(z).toBeGreaterThan(a);
    const cells = b.slice(a, z);
    expect(cells).toMatch(/if \(fpRowsFill\) for \(const b of nearBars\) \{/);
    expect(cells).toMatch(/if \(!getBarSubProfile\(b\.c\)\) continue;/);
    expect(cells).toMatch(/const yHc = srs\.priceToCoordinate\(b\.c\.high\), yLc = srs\.priceToCoordinate\(b\.c\.low\);/);
    expect(cells).toMatch(/fpCells\.push\(\{ x: b\.cx - halfW, y: Math\.min\(\+yHc, \+yLc\), w: colW, h: Math\.max\(2, Math\.abs\(\+yLc - \+yHc\)\) \}\);/);
    // The same geometry every row mode paints its cells on.
    expect(CHART).toMatch(/ctx\.fillRect\(x, yH, colW, fullH\);/);
  });
});

describe("M46 · at NEAR the footprint's numbers stay in the bars' rows", () => {
  it("no badge, winner pill or 2×2 grid floats above the bars at NEAR", () => {
    expect(CHART).toMatch(/const fpRowsOnly = semanticDensity\.depth === "NEAR";/);
    expect(CHART).toMatch(/const showBadges = bsp >= 70 && !fpRowsOnly;/);
    expect(CHART).toMatch(/const showWinner = bsp >= 22 && !fpRowsOnly;/);
    // Every above-the-bar number box is behind one of those two gates.
    expect(CHART.match(/if \(showBadges\) \{/g)?.length).toBe(4);
    expect(CHART.match(/if \(showWinner\) \{/g)?.length).toBe(1);
    expect(CHART).toMatch(/dsFp\.footprintBadges = fpRowsOnly \? "ROWS_ONLY" : "ABOVE_BARS";/);
  });
});

describe("receipts say what reached the glass and are withdrawn off NEAR", () => {
  it("every receipt the NEAR block writes is in NEAR_GLASS_RECEIPTS", () => {
    const b = near();
    const written = new Set([...b.matchAll(/dsN\.([A-Za-z]+) = /g)].map(m => m[1]));
    expect(written.size).toBeGreaterThanOrEqual(8);
    const listM = RAW.match(/const NEAR_GLASS_RECEIPTS = \[([^\]]+)\] as const;/);
    expect(listM).not.toBeNull();
    const listed = new Set([...(listM as RegExpMatchArray)[1].matchAll(/"([A-Za-z]+)"/g)].map(m => m[1]));
    expect([...written].filter(k => !listed.has(k))).toEqual([]);
    expect(b).toContain('dsN.nearTapeForm = "ON_BARS";');
    expect(b).toContain('dsN.nearTape = heldInView === 0 ? "NO_TAPE" : `DOTS:${dotsN}`;');
    // Counts only after the paint that earns them.
    expect(b.indexOf("dsN.nearTape =")).toBeGreaterThan(b.indexOf("dotsN++;"));
  });
});

describe("F06B · raw rows reach Inspect for the selected print", () => {
  it("a click on a NEAR tape dot selects that print with its raw tape; a big-trade bubble carries its raw tape too", () => {
    const c = click();
    expect(c).toMatch(/const tapeHit = nearTapeHitsRef\.current\.slice\(\)\.reverse\(\)\.find\(/);
    expect(c).toMatch(/rawTape: selectPrintRawTape\(bigTradePrintAccRef\.current\.get\(tapeHit\.barTime\), \{/);
    expect(c).toMatch(/rawTape: hit\.kind === "delta" \? null : selectPrintRawTape\(bigTradePrintAccRef\.current\.get\(hit\.anchorBarTime\), \{/);
    // The hit list is what this frame painted, cleared with the glass.
    expect(CHART).toMatch(/nearTapeHitsRef\.current = \[\];/);
    expect(near()).toMatch(/nearTapeHitsRef\.current\.push\(\{ x: xd, y: \+yd, r: Math\.max\(r, 4\), barTime: Number\(c\.time\), dot: d \}\);/);
  });

  it("Inspect lists the selected print and its neighbours, newest first, marking the selected row and each side's fidelity", () => {
    const t0 = 1_750_000_000_000;
    const prints: BigTradeTick[] = Array.from({ length: 14 }, (_, i) => ({
      price: 86250 + i / 4, bid: i % 2 ? 0.1 * (i + 1) : 0, ask: i % 2 ? 0 : 0.1 * (i + 1),
      timeMs: t0 + i * 7, printKey: `event:cb:${i}`, aggressorMethod: i === 3 ? "TICK_RULE" : "PROVIDER",
    }));
    const rawTape = selectPrintRawTape(prints, { barTime: t0 / 1000, printKey: "event:cb:6", timeMs: t0 + 42, price: 86251.5 });
    expect(rawTape.rows).toHaveLength(10);
    expect(rawTape.rows.find(r => r.selected)?.printKey).toBe("event:cb:6");
    expect(rawTape.rows.map(r => r.timeMs)).toEqual([...rawTape.rows.map(r => r.timeMs)].sort((a, z) => z - a));
    expect(rawTape.rows.find(r => r.printKey === "event:cb:3")?.glyph).toBe("~−");
    expect(rawTape.sizeRank).toBe(8);
    const html = renderToStaticMarkup(
      <ChartInspectTicket
        vm={selectInspectTicket({ barOpenMs: t0, barSpanMs: 60_000, price: 86250, barVolume: 1, prints: [] })}
        followingLiveBar={false}
        open
        onOpenChange={() => {}}
        onOpenFootprint={() => {}}
        selectedPrint={{
          symbol: "BTC-USD", timeframe: "1m", barTime: t0 / 1000, printKey: "event:cb:6", timeMs: t0 + 42,
          priceLevel: 86251.5, bid: 0, ask: 0.7, total: 0.7, aggressorMethod: "PROVIDER", kind: "big-trade",
          relation: null, rawTape,
        }}
      />,
    );
    expect(html).toContain('data-testid="inspect-raw-tape"');
    expect(html).toContain("RAW TAPE · THIS PRINT&#x27;S BAR");
    expect(html.match(/data-raw-tape-row=/g)).toHaveLength(10);
    expect(html).toContain('data-raw-tape-row="event:cb:6" data-raw-tape-selected="true"');
    expect(html).toContain("86251.5");
    expect(html).toContain("~−");
    expect(html).toContain("~ = SIDE INFERRED");
    expect(html).toContain("#8 by size of 14 held prints in its bar");
    // Camera alive: the rows are in Inspect, and the ticket stays a ticket.
    expect(html).toContain("SELECTED PRINT");
  });
});
