/**
 * THE VALUE CANDLE MUST STAY ON THE GLASS — AND ON THE CANDLE.
 *
 * The invention is called the WM Value CANDLE and for months there was no
 * candle: `selectValueCandle` computed a centre of gravity, a value band and a
 * full bins distribution — every one of them A PRICE — and shipped all of it to
 * a drawer. The first repair was a wire; this file keeps the wire.
 *
 * 2026-09-26 · CANON UI-02 (Gravity / Value Center plate). The first repair
 * drew a rung HISTOGRAM in the next VP column at the right edge. The plate is
 * a candle: glass over the bar's body, the gold value band (CoG ± σ) inside
 * it, the Center of Gravity as a dark line across it — and a histogram in the
 * profile column fails the hidden-label recognition test (GP12 §43) because it
 * reads as a volume profile. So the histogram rules below were REPLACED, not
 * dropped: what was "take the next VP column" is now "no right-edge column
 * paint at all", and "each bin at its own prices" is now "each value candle at
 * its own bar's x and its own prices". Every rule is held by a pure audit and
 * the audit is MUTATION-TESTED at the bottom — a sentinel that cannot fail is
 * decoration.
 *
 * This file is a breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

/** Colours named in a comment paint nothing, and these files explain
 *  themselves at length. Strip prose before asserting on code. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const ROOM = strip(read("src/components/chart/ChartsDashboard.tsx"));

const ANCHOR = "selectValueCandleGlass(valueCandleRef.current)";
const END = "delete ds.valueCandleCog;";

/** The value-candle block: from the glass call to its last receipt write. */
function blockOf(src: string): string {
  const at = src.indexOf(ANCHOR);
  if (at < 0) return "";
  const end = src.indexOf(END, at);
  return end < 0 ? src.slice(at, at + 6000) : src.slice(at, end + END.length);
}

const block = blockOf(CHART);

/**
 * THE AUDIT — pure over the block's source, so the mutations below can prove
 * each rule fires. Returns the broken rules (empty = the block is canon).
 */
function audit(b: string): string[] {
  const out: string[] = [];
  const need = (re: RegExp | string, why: string) => {
    const ok = typeof re === "string" ? b.includes(re) : re.test(b);
    if (!ok) out.push(why);
  };

  // ── (1) NO RIGHT-EDGE COLUMN. The rung histogram is retired.
  if (/vpColumnLayout\(/.test(b)) out.push("(1) the value candle takes a VP column again");
  if (/glass\.rungs|\.widthFrac|col\.right/.test(b)) out.push("(1) the rung histogram is painted again");
  if (/"NO_ROOM"/.test(b)) out.push("(1) a column-room receipt is back — the value candle has no column");

  // ── (2) ON THE BAR IT MEASURED, at that bar's x.
  need("selectValueCandleGlassPlan(valueCandleRef.current, valueCandleBarsRef.current", "(2) the glass plan is not read");
  need("for (const c of vcPlan.candles)", "(2) the plan's candles are not what is drawn");
  need("const bar = barAt.get(c.time);", "(2) the glass is not matched to the bar it measured");
  need(/if \(!bar\) continue;/, "(2) a value candle may be drawn on a bar the chart does not hold");
  need("tsV.timeToCoordinate(c.time as never)", "(2) the glass x is not the measured bar's time coordinate");
  need("Math.max(bar.open, bar.close)", "(2) the per-bar glass does not span the bar's own body");

  // ── (3) EVERY PRICE AT ITS OWN PRICE.
  need("srs.priceToCoordinate(c.cog)", "(3) the CoG line is not placed at the CoG's price");
  need("srs.priceToCoordinate(c.valueHigh)", "(3) the band top is not the measured valueHigh");
  need("srs.priceToCoordinate(c.valueLow)", "(3) the band bottom is not the measured valueLow");

  // ── (4) THE GOVERNOR OWNS THE LOUDNESS.
  need('ctx.globalAlpha = att.alpha("valueCandle")', "(4) the glass does not take its alpha from the governor");

  // ── (5) NO WORDS AT REST. Exactly two text sites: the Inspect caption
  // (crosshair on a value candle AND the depth speaks) and the one-line
  // honest silence (no tape AND the depth speaks). Both through keep-out.
  const texts = (b.match(/\.fillText\(/g) ?? []).length;
  if (texts !== 2) out.push(`(5) ${texts} text sites — the at-rest glass must carry none beyond the two gated ones`);
  const hover = b.indexOf("if (hit && vcSpeaks) {");
  const silence = b.indexOf("} else if (on && !glass.drawn && vcSpeaks) {");
  if (hover < 0) out.push("(5) the caption is not gated on hover AND speaks");
  if (silence < 0) out.push("(5) the tape-required word is not gated on unmeasured AND speaks");
  const firstText = b.indexOf(".fillText(");
  if (firstText >= 0 && hover >= 0 && firstText < hover) out.push("(5) text is painted before the hover gate");
  need('const vcSpeaks = att.speaks("valueCandle");', "(5) words do not ask the permission table");
  if ((b.match(/placeClearOfKeepOut\(/g) ?? []).length < 2) out.push("(5) words are not placed through the keep-out owner");
  need("hit.c.lines", "(5) the caption is not the compiler's words");
  need('"VALUE CANDLE · tape required"', "(5) the honest-silence word is missing");

  // ── (6) RECEIPTS.
  need("ds.valueCandleForm = vcPlan.form === \"GLASS_PER_BAR\" ? `GLASS_PER_BAR:${vcPlaced}` : vcPlan.form;", "(6) valueCandleForm is not published from the plan");
  need('ds.valueCandleForm = "NONE";', "(6) valueCandleForm has no NONE state");
  return out;
}

describe("the reading reaches the chart", () => {
  it("the room hands the SAME reading it gives the drawer to the glass", () => {
    expect(ROOM).toMatch(/valueCandle=\{chartOrderFlowReadings\.valueCandle\}/);
    expect(ROOM).toMatch(/valueCandleBars=\{chartOrderFlowReadings\.valueCandleBars\}/);
  });

  it("the chart accepts it as a prop and does NOT recompute the tape", () => {
    expect(CHART).toMatch(/valueCandle\?:/);
    expect(CHART).toMatch(/valueCandleBars\?:/);
    expect(CHART).toMatch(/selectValueCandleGlass/);
    // The engine itself must never appear here — only the glass compilers,
    // which take already-computed VMs. The per-bar split is the room's too.
    expect(CHART).not.toMatch(/\bselectValueCandle\s*\(/);
    expect(CHART).not.toMatch(/\bselectValueCandleBars\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    // Naming a tape-rate value as a dependency of the overlay effect tears the
    // rAF loop down and rebuilds it several times a second — the documented
    // cause of the VP and footprint flashing off on crypto.
    expect(CHART).toMatch(/valueCandleRef/);
    expect(CHART).toMatch(/valueCandleBarsRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/\bvalueCandle\b/);
    expect(deps.slice(0, 400)).not.toMatch(/\bvalueCandleBars\b/);
  });
});

describe("the value candle is a candle, on the bar it measured (UI-02)", () => {
  it("the block was found and reaches its last receipt", () => {
    expect(block.length, "the glass call was renamed or removed").toBeGreaterThan(1000);
    expect(block.endsWith(END)).toBe(true);
  });

  it("MainChart passes the audit", () => {
    expect(audit(block)).toEqual([]);
  });

  it("the spine's price owner is the candles' own series", () => {
    expect(block).toMatch(/srs\.priceToCoordinate\(c\.cog\)/);
  });
});

describe("§9 — no reading is graded in colour on the glass", () => {
  it("spends no green and no red on the value candle", () => {
    expect(block).not.toMatch(/-wm-green|-wm-red/);
    // Every literal colour in the block, checked for a green- or red-dominant
    // channel rather than merely "contains green" — the house ivory #ede6d3 and
    // the evidence gold #d4af37 both have green channels.
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length, "no literal colours found — did the block move?").toBeGreaterThan(0);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the value candle: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the value candle: ${m[0]}`).toBe(false);
    }
  });
});

describe("the headline number stays the honest one", () => {
  it("prints the compiler's words rather than assembling its own sentence", () => {
    // `concentration` reads 100% for a perfectly HOLLOW two-sided auction. The
    // compiler leads with band coverage for exactly that reason, and it can
    // only keep doing so if the canvas has no second opinion.
    expect(block).toMatch(/hit\.c\.lines/);
    expect(block).not.toMatch(/concentration/i);
    expect(block).not.toMatch(/migrationDetail/);
  });
});

describe("the layer publishes a receipt in every state, including the silent ones", () => {
  it("stamps the reason even when nothing is painted", () => {
    // 2026-09-26 (H-501 permission): OFF stays the trader's word; a layer
    // the depth withheld says SILENT:<depth> through the governor's offWord.
    expect(block).toMatch(/ds\.valueCandle = on \? glass\.reason : att\.offWord\(layerOnRef\.current\.valueCandle\)/);
  });

  it("withdraws the drawing receipts when the drawing goes away", () => {
    // The retired rung receipt is withdrawn every frame; the CoG whenever no
    // value candle is on the glass.
    expect(block).toMatch(/delete ds\.valueCandleRungs/);
    expect(block).toMatch(/delete ds\.valueCandleCog/);
  });
});

describe("the trader can quiet this layer, and the chart says WHICH silence it is", () => {
  it("a switched-off layer paints NOTHING, not merely fewer candles", () => {
    // Named down to this block's OWN condition on purpose — a bare
    // `if (on && glass.drawn` was once satisfied by a NEIGHBOUR while this
    // block's gate was deleted (proven by mutation).
    expect(block).toMatch(/if \(on && glass\.drawn && glass\.cog != null\)/);
  });

  it("reads the switch from a REF, never from the overlay's dependency array", () => {
    expect(block).toMatch(/const on = layerOnRef\.current\.value/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/valueCandleOnChart/);
  });

  it("the switch travels as its OWN prop, not as a null reading", () => {
    expect(CHART).toMatch(/valueCandleOnChart\?: boolean/);
    expect(ROOM).toMatch(/valueCandleOnChart=\{valueCandleOn\}/);
  });
});

describe("MUTATIONS — each rule fires on a deliberately broken copy", () => {
  const mutants: Array<[string, (b: string) => string]> = [
    ["the rung histogram comes back in a VP column",
      b => b.replace("const tsV = chart.timeScale();", "const col = vpColumnLayout(W, axisW, vpCols, vpCols + 1); const tsV = chart.timeScale();")],
    ["the glass is pinned to the newest bar instead of the measured one",
      b => b.replace("tsV.timeToCoordinate(c.time as never)", "tsV.timeToCoordinate(bsV[bsV.length - 1]!.time as never)")],
    ["a value candle may land on a bar the chart does not hold",
      b => b.replace(/if \(!bar\) continue;/, "")],
    ["the CoG line is drawn at the window CoG, not the bar's",
      b => b.replace("srs.priceToCoordinate(c.cog)", "srs.priceToCoordinate(glass.cog!)")],
    ["the governor's alpha is bypassed",
      b => b.replace('ctx.globalAlpha = att.alpha("valueCandle")', "ctx.globalAlpha = 1")],
    ["words painted at rest",
      b => b.replace("if (hit && vcSpeaks) {", "if (true) {")],
    ["a third text site appears at rest",
      b => b.replace("vcPlaced++;", 'vcPlaced++; ctx.fillText("CoG", gx, yCog);')],
    ["words skip the permission table",
      b => b.replace('const vcSpeaks = att.speaks("valueCandle");', "const vcSpeaks = true;")],
    ["the form receipt loses its NONE state",
      b => b.replace('ds.valueCandleForm = "NONE";', "")],
  ];
  for (const [name, mutate] of mutants) {
    it(`fires: ${name}`, () => {
      const broken = mutate(block);
      expect(broken, `mutation "${name}" did not apply — the block moved`).not.toBe(block);
      expect(audit(broken).length).toBeGreaterThan(0);
    });
  }
});
