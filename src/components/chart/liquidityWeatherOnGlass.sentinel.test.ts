/**
 * LIQUIDITY WEATHER ON THE GLASS — AND THE HARDER GUARD, WHICH IS AN ABSENCE.
 *
 * The three readings sentinelled before this one were PRICES trapped in a
 * drawer, and the regression to guard was the wire going quiet: the panel keeps
 * naming a level while the chart stops drawing it.
 *
 * This reading is not that. Liquidity weather measures COST — size per unit of
 * the window's own spread — and a cost has no level. So there are two guards
 * here pulling opposite ways:
 *
 *   1. The shelves MUST reach the axis. A stalled segment is the one genuinely
 *      price-anchored fact the reading owns: size traded and price did not move.
 *   2. Nothing ELSE may reach it. `medianCost`, `latestCost`, `trendRatio` and
 *      the segment array would all map onto a price scale without complaint and
 *      every one of those mappings is a number the house invented.
 *
 * PINS MOVED 2026-09-25 — F08B "WEATHER IS A LENS". The Founder, at the glass:
 * "I STILL HAVE A LOT OF JUST CARDS, NOT THE ACTUAL DESIGNS WITHIN THE CANON."
 * The stage, detail and shelf caption used to print as three word lines in the
 * bottom-left corner, and the shelves as an 80px dotted stub at a fixed column
 * (x 158–238). The plate draws a brass-ringed LENS over the region the reading
 * covers, the colour field inside it only, the words ON the ring and the status
 * as a readout attached to the ring. So:
 *   · "paints the stage as WORDS in the chrome" → the stage is a WORD in the
 *     lens's readout, and no word line prints in the corner (asserted absent);
 *   · "stalls dotted and short at 158–238" → stalls dotted, over the bars their
 *     segment traded on, bounded by the lens's chord at their price;
 *   · the two guards above are unchanged, and now also cover the lens geometry:
 *     the lens is placed from `glass.window` (where/when prints landed), never
 *     from a cost figure.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

/** Prose paints nothing and these files explain themselves at length. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const ROOM = strip(read("src/components/chart/ChartsDashboard.tsx"));

const between = (from: string, to: string) => {
  const at = CHART.indexOf(from);
  expect(at, `${from} was renamed or removed`).toBeGreaterThan(-1);
  const end = CHART.indexOf(to, at);
  expect(end, `${to} no longer follows ${from}`).toBeGreaterThan(at);
  return CHART.slice(at, end + to.length);
};

/** Where the glass is compiled and its reason stamped. */
const glassBlock = between("selectLiquidityWeatherGlass(liquidityWeatherRef.current)", 'ds.liquidityWeather = on ? glass.reason : "OFF";');
/** Where the lens is placed. */
const geoBlock = between("let weatherLens: WeatherLens | null = null;", "weatherLensCut = cut;");
/** What the lens paints: tint, shelves, ring, words, readout, receipts. */
const lensBlock = between("const L = weatherLens;", "delete ds.liquidityWeatherReadout;");
const weatherCode = glassBlock + geoBlock + lensBlock;

describe("the reading reaches the chart", () => {
  it("the room hands the SAME reading it gives the drawer to the glass", () => {
    expect(ROOM).toMatch(/liquidityWeather=\{chartOrderFlowReadings\.liquidityWeather\}/);
  });

  it("the chart accepts it as a prop and does NOT recompute the tape", () => {
    expect(CHART).toMatch(/liquidityWeather\?:/);
    expect(CHART).toMatch(/selectLiquidityWeatherGlass/);
    // Canon weakness #1: one reading, two renderings. The engine segments the
    // tape by its own rules; a second caller is a second answer.
    expect(CHART).not.toMatch(/\bselectLiquidityWeather\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    // Naming a tape-rate value in the overlay's deps tears the rAF loop down
    // several times a second — the documented cause of layers flashing off.
    expect(CHART).toMatch(/liquidityWeatherRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/\bliquidityWeather\b/);
  });
});

describe("A STALLED SEGMENT IS A PRICE, and it is the one thing on the axis", () => {
  it("places every shelf on the same scale the candles use", () => {
    expect(lensBlock).toMatch(/for \(const s of glass\.stallSpans\)/);
    expect(lensBlock).toMatch(/srs\.priceToCoordinate\(s\.price\)/);
  });

  it("counts what it actually painted rather than what it was handed", () => {
    // A price outside the visible range yields no coordinate. Reporting the
    // list length would claim shelves that were never drawn.
    expect(lensBlock).toMatch(/shelves\+\+/);
    expect(lensBlock).toMatch(/if \(yr == null\) continue/);
  });
});

describe("A COST HAS NO PRICE, and nothing here invents one for it", () => {
  it("passes no cost figure to a coordinate function", () => {
    expect(weatherCode).not.toMatch(/priceToCoordinate\([^)]*(?:ost|rend|ispersion|pread)/);
  });

  it("never reads the fields that would tempt it — the compiler emits none", () => {
    expect(weatherCode).not.toMatch(
      /glass\.(?:medianCost|latestCost|segments|trendRatio|dispersion|spread)/,
    );
  });

  it("places the lens from WHERE the prints landed — the window — and nothing else", () => {
    expect(geoBlock).toMatch(/const wnd = glass\.window;/);
    expect(geoBlock).toMatch(/srs\.priceToCoordinate\(wnd\.high\)/);
    expect(geoBlock).toMatch(/srs\.priceToCoordinate\(wnd\.low\)/);
    expect(geoBlock).toMatch(/lensBarX\(wnd\.fromTime\), xb = lensBarX\(wnd\.toTime\)/);
    // A window with no time has no place: no lens, and the receipt says why.
    expect(geoBlock).toMatch(/if \(!wnd\) weatherLensWhy = "UNTIMED";/);
  });

  it("paints the stage as a WORD on the lens — never a band at a level, never a corner stack", () => {
    expect(lensBlock).toMatch(/ctx\.fillText\(`● \$\{glass\.stage\}`/);
    // The three corner lines are gone: no label/detail/stall-caption print,
    // and no word-stack chip, anywhere from the weather's compile to its lens.
    // (`glass` is also the local name of the value-candle and divergence
    // readings above this block; their labels are theirs.)
    const weatherRegion = between("selectLiquidityWeatherGlass(liquidityWeatherRef.current)", "delete ds.liquidityWeatherReadout;");
    expect(weatherRegion).not.toMatch(/fillText\(glass\.label/);
    expect(weatherRegion).not.toMatch(/fillText\(glass\.detail/);
    expect(weatherRegion).not.toMatch(/fillText\(glass\.stallLabel/);
    expect(CHART).not.toMatch(/\bwordChip\(/);
  });
});

describe("§9 — seven stages are a gradient, and no gradient gets a hue", () => {
  it("chooses no colour from the stage", () => {
    // AIRLESS is not danger and HEAVY is not safety: a thin tape is where a
    // stop slips and also where a breakout runs. The house grades neither.
    expect(weatherCode).not.toMatch(/glass\.stage\s*===/);
    expect(weatherCode).not.toMatch(/-wm-green|-wm-red/);
  });

  it("spends no green and no red on the weather — tint, ring, words or readout", () => {
    const rgbas = [...weatherCode.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length, "no literal colours found — did the block move?").toBeGreaterThan(5);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the weather: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the weather: ${m[0]}`).toBe(false);
    }
  });

  it("colours the ring's legend with the ONE ramp the field uses", () => {
    expect(lensBlock).toMatch(/ctx\.strokeStyle = heatRampColor\(1 - \(k \+ 0\.5\) \/ legendSteps\)/);
  });
});

describe("a shelf does not pose as a defended level", () => {
  it("draws the stalls dotted, over their own bars, inside the lens — not a support line", () => {
    // "Nothing moved here" is an observation. A solid line spanning the pane
    // reads as a level somebody is holding, which is a claim about intent.
    expect(lensBlock).toMatch(/setLineDash\(\[1, 3\]\)/);
    expect(lensBlock).toMatch(/const chord = L\.rx \* Math\.sqrt\(1 - dy \* dy\);/);
    expect(lensBlock).toMatch(/lensBarX\(s\.fromTime\)/);
    // Not at a fixed column any more.
    expect(CHART).not.toMatch(/moveTo\(158,/);
  });

  it("restores the solid dash before the ring, so the brass is not dotted too", () => {
    expect(lensBlock).toMatch(/setLineDash\(\[\]\)/);
  });
});

describe("the layer publishes a receipt in every state, including the silent ones", () => {
  it("stamps the reason even when nothing is painted", () => {
    expect(glassBlock).toMatch(/ds\.liquidityWeather = on \? glass\.reason : "OFF"/);
    expect(lensBlock).toMatch(/ds\.liquidityWeatherLensState = weatherLensWhy;/);
  });

  it("withdraws the stage receipt rather than letting a stale one describe the tape", () => {
    expect(lensBlock).toMatch(/delete ds\.liquidityWeatherStage/);
    expect(lensBlock).toMatch(/delete ds\.liquidityWeatherShelves/);
    expect(lensBlock).toMatch(/delete ds\.liquidityWeatherLens;/);
  });
});

describe("the heat lens reads as a tide without inventing another market fact", () => {
  it("fades inside the observed price band rather than laying an opaque slab over candles", () => {
    expect(CHART).toMatch(/createLinearGradient\(0, top, 0, top \+ band\)/);
    expect(CHART).toMatch(/wash\.addColorStop\(0, "rgba\(0,0,0,0\)"\)/);
    expect(CHART).toMatch(/wash\.addColorStop\(1, "rgba\(0,0,0,0\)"\)/);
    // Each cell paints at its strength RELATIVE to the regulator into an
    // offscreen layer; the layer meets the glass once at maxOpacity × 0.72, so
    // a lone cell looks exactly as before and overlapping cells cannot stack
    // past the cap (the slab observed on a fixture tape, 2026-09-24).
    expect(CHART).toMatch(/ctxHeat\.globalAlpha = heat\.maxOpacity > 0 \? alpha \/ heat\.maxOpacity : 0/);
    expect(CHART).toMatch(/const glassAlpha = heat\.maxOpacity \* 0\.72/);
    expect(CHART).toMatch(/mainCtx\.globalAlpha = glassAlpha;\s*mainCtx\.drawImage\(hc, 0, 0\)/);
  });

  it("clips every contour to the segment's measured high and low", () => {
    // Price-wise the clip is the segment's measured high..low; time-wise it is
    // the cell's own span (heatLensOnItsBars.sentinel.test.ts), not the camera.
    expect(CHART).toMatch(/ctxHeat\.rect\(cx0, top, cw, band\)/);
    expect(CHART).toMatch(/ctxHeat\.clip\(\)/);
    expect(CHART).toMatch(/const y = top \+ \(band \* ci\) \/ \(contourCount \+ 1\)/);
  });

  it("lets measured intensity control texture while the regulator still caps opacity", () => {
    expect(CHART).toMatch(/1 \+ Math\.round\(cell\.intensity \* 2\)/);
    // Relative to the regulator here; the regulator itself is applied once, at the blit.
    expect(CHART).toMatch(/Math\.min\(1, \(alpha \* 0\.9\) \/ heat\.maxOpacity\)/);
    expect(CHART).toMatch(/heatRampColor\(cell\.intensity\)/);
  });

  it("publishes and withdraws a contour receipt with the cells it describes", () => {
    expect(CHART).toMatch(/ds\.heatLensContours = String\(contours\)/);
    expect(CHART.match(/delete ds\.heatLensContours/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("F08B — the field exists only INSIDE the lens, behind the candles", () => {
  it("the field meets the glass through the lens ellipse, the candle cut-out and the chip cut-out", () => {
    // Pin extended 2026-09-25 (serving 14:48): the lens also passes BEHIND
    // chips already placed (value band, SWING labels).
    expect(CHART).toMatch(
      /mainCtx\.ellipse\(weatherLens\.cx, weatherLens\.cy, weatherLens\.rx, weatherLens\.ry, 0, 0, Math\.PI \* 2\);\s*mainCtx\.clip\(\);\s*if \(weatherLensCut\) mainCtx\.clip\(weatherLensCut, "evenodd"\);\s*if \(weatherLensChipCut\) mainCtx\.clip\(weatherLensChipCut, "evenodd"\);\s*mainCtx\.setTransform\(1, 0, 0, 1, 0, 0\);/,
    );
  });

  it("no lens → no field, and the heat receipt names it", () => {
    expect(CHART).toMatch(/if \(on && heat\.drawable && !weatherLens\) ds\.heatLens = "UNPLACED";/);
    expect(CHART).toMatch(/if \(on && heat\.drawable && weatherLens\) \{/);
  });

  it("the lens is fitted by its one owner and cut round every candle it covers", () => {
    expect(geoBlock).toMatch(/fitWeatherLens\(/);
    expect(geoBlock).toMatch(/candleCutOutRects\(lensBars,/);
  });

  it("the ring is brass, behind the candles, with LIQUIDITY WEATHER set ON its top arc", () => {
    expect(lensBlock).toMatch(/if \(weatherLensCut\) ctx\.clip\(weatherLensCut, "evenodd"\);/);
    expect(lensBlock).toMatch(/const brass = ctx\.createLinearGradient\(/);
    expect(lensBlock).toMatch(/const ringTitle = \[\.\.\."LIQUIDITY WEATHER"\];/);
    expect(lensBlock).toMatch(/wordOnTopArc\(L, /);
    expect(lensBlock).toMatch(/ctx\.rotate\(gph\.rot\)/);
  });

  it("the status readout is attached to the ring and placed clear of the newest candles", () => {
    expect(lensBlock).toMatch(/"LENS STATUS"/);
    expect(lensBlock).toMatch(/k: "PERSISTENCE"/);
    expect(lensBlock).toMatch(/k: "RESPONSE"/);
    expect(lensBlock).toMatch(/k: "VEIL"/);
    expect(lensBlock).toMatch(/placeClearOfKeepOut\(slots\[0\], keepOut\(\)/);
    expect(lensBlock).toMatch(/recordKeepOut\(keepOutLedger, spot\)/);
    expect(lensBlock).toMatch(/keepOutBackingAlpha\(spot, 0\.86\)/);
    // The leader: plate edge → ring.
    expect(lensBlock).toMatch(/const onRing = ringPoint\(L, tl, 5\);/);
  });
});

describe("the lens speaks only where it can be read — serving BTC-USD 1m, 2026-09-25 14:48 CDT", () => {
  // Measured on serving: the tape starts at page load, so the window was a few
  // minutes at the live edge and the lens was a ~150×130 knot over the newest
  // candles — through the NEAR footprint cells, the SWING labels and the
  // value-band chip, with a field too small to read.

  it("H-501: at NEAR the lens and its readout yield, and the receipt says YIELDED_NEAR", () => {
    // The gate is consulted with the frame's depth before any lens is fitted.
    expect(geoBlock).toMatch(/const gate = weatherLensGate\(\{\s*depth: semanticDensity\.depth,/);
    expect(geoBlock).toMatch(/if \(gate\.kind !== "DRAW"\) \{\s*weatherLensWhy = gate\.state;/);
    // Only a DRAW verdict fits a lens.
    expect(geoBlock).toMatch(/\} else if \(region\) \{\s*weatherLens = fitWeatherLens\(/);
    expect(geoBlock.match(/fitWeatherLens\(/g)?.length).toBe(1);
  });

  it("GATHERING draws no mini lens: one line of words, placed through the keep-out, by its region", () => {
    expect(geoBlock).toMatch(/if \(gate\.kind === "GATHERING" && region\) weatherGathering = \{ region, words: gate\.words \};/);
    const gather = between("const gw = on && glass.drawn ? weatherGathering : null;", "delete ds.liquidityWeatherGathering;");
    expect(gather).toMatch(/const gSpot = placeClearOfKeepOut\(aboveG, keepOut\(\), \{/);
    expect(gather).toMatch(/blockers: \[\.\.\.floatingChips,/);
    expect(gather).toMatch(/recordKeepOut\(keepOutLedger, gSpot\);/);
    expect(gather).toMatch(/ctx\.fillText\(gw\.words, gSpot\.rect\.x, gSpot\.rect\.y\);/);
    expect(gather).toMatch(/floatingChips\.push\(\{ \.\.\.gSpot\.rect \}\);/);
    expect(gather).toMatch(/ds\.liquidityWeatherGathering = gSpot\.mode;/);
    // Not in a corner stack: its rows are the region's own.
    expect(gather).not.toMatch(/fillText\(gw\.words, 8,/);
  });

  it("the lens state is published in every state (DRAWN / YIELDED_NEAR / GATHERING:<bars> / OFF_CAMERA / UNTIMED / OFF)", () => {
    expect(lensBlock).toMatch(/ds\.liquidityWeatherLensState = weatherLensWhy;/);
    expect(geoBlock).toMatch(/let weatherLensWhy: string = on \? "UNMEASURED" : "OFF";/);
  });

  it("the lens passes BEHIND the chips already placed — tint, field and ring", () => {
    expect(geoBlock).toMatch(/for \(const c of floatingChips\) \{/);
    expect(geoBlock).toMatch(/chipCut\.rect\(c\.x - 1, c\.y - 1, c\.w \+ 2, c\.h \+ 2\);/);
    expect(geoBlock).toMatch(/ctx\.clip\(chipCut, "evenodd"\);/);
    expect(lensBlock).toMatch(/if \(weatherLensChipCut\) ctx\.clip\(weatherLensChipCut, "evenodd"\);/);
  });

  it("the title yields to a chip it would print through; the readout then names the lens", () => {
    expect(lensBlock).toMatch(/const titleYields = titleBox != null && floatingChips\.some\(/);
    expect(lensBlock).toMatch(/if \(!titleYields\) glyphs\.forEach\(/);
    expect(lensBlock).toMatch(/ctx\.fillText\(titleYields \? "WEATHER LENS" : "LENS STATUS"/);
    expect(lensBlock).toMatch(/ds\.liquidityWeatherRing = titleYields \? "YIELDED" : "LIQUIDITY WEATHER";/);
  });

  it("registers the title arc, the readout and the ring in the chip ledger", () => {
    expect(lensBlock).toMatch(/if \(titleBox && !titleYields\) floatingChips\.push\(titleBox\);/);
    expect(lensBlock).toMatch(/floatingChips\.push\(\{ x: R\.x, y: R\.y, w: R\.w, h: R\.h \}\);/);
    expect(lensBlock).toMatch(/floatingChips\.push\(\{ x: L\.cx - L\.rx - 6, y: L\.cy - L\.ry - 6, w: L\.rx \* 2 \+ 12, h: L\.ry \* 2 \+ 20 \}\);/);
    // The ring is registered AFTER the readout is placed (its own slots would
    // otherwise be refused by the ring's box).
    expect(lensBlock.indexOf("w: L.rx * 2 + 12")).toBeGreaterThan(lensBlock.indexOf("ds.liquidityWeatherReadout = spot.mode;"));
  });

  it("the value-band chip it collided with is on the ledger", () => {
    expect(CHART).toMatch(/ctx\.fillText\(glass\.migrationLabel, chipX \+ lw \+ 6, chipY \+ chipH \+ 8\);[\s\S]{0,120}\}\s*floatingChips\.push\(\{ x: chipX, y: chipY, w: lw \+ 12, h: blockH \}\);/);
  });
});

describe("the trader can quiet this layer, and the chart says WHICH silence it is", () => {
  it("a switched-off layer paints NOTHING, not merely fewer shelves", () => {
    expect(lensBlock).toMatch(/if \(on && glass\.drawn && L\) \{/);
  });

  it("reads the switch from a REF, never from the overlay's dependency array", () => {
    expect(CHART).toMatch(/const on = layerOnRef\.current\.weather/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/liquidityWeatherOnChart/);
  });

  it("the switch travels as its OWN prop, not as a null reading", () => {
    expect(CHART).toMatch(/liquidityWeatherOnChart\?: boolean/);
    expect(ROOM).toMatch(/liquidityWeatherOnChart=\{liquidityWeatherOn\}/);
  });
});
