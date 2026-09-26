/**
 * EVERY PAINTING LAYER ASKS THE PERMISSION — H-501 · F13 SEMANTIC ZOOM.
 *
 * Measured on serving (TSLA 15m desktop, Founder layers, FAR = 755 bars,
 * badge "FAR · REGIME + ENVELOPE SPEAK", 2026-09-25): the FAR glass still
 * carried the FOUNDATION six-step card, exhaustion marks, the H-101 WAIT tag,
 * SWING ABOVE / BELOW tags, the value-band chip, liquidity ladders and words,
 * anatomy / absorption sentences and full-width regime magnets. Each layer
 * decided its own depth rule, or had none.
 *
 * `selectSemanticPermission` is now the ONE table (SPEAK / QUIET / SILENT per
 * layer per depth), read through the attention governor. This file holds
 * MainChart to it:
 *
 *   (a) every layer in the table is asked at its block's gate
 *       (`att.paints("<layer>"…)`), after the governor exists;
 *   (b) every layer that is QUIET at some depth withholds its words through
 *       `att.speaks("<layer>")` (named exceptions below);
 *   (c) the selected object overrides at every per-item gate;
 *   (d) no block decides WHETHER it paints from the depth itself — the only
 *       `semanticDensity.depth` reads left are FORM reads, listed here;
 *   (e) the receipts are re-published every frame and withdrawn when empty;
 *   (f) FAR silences what serving showed at FAR.
 *
 * The audit is a pure function of the source, so the MUTATION checks at the
 * bottom run it over deliberately broken copies and require it to fire.
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DEPTH_LAYERS,
  SEMANTIC_PERMISSION,
  permissionAt,
  type DepthLayer,
} from "@/lib/marketData/viewModels/selectSemanticPermission";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

/** Layers whose paint is not a block of its own: how each one asks instead. */
const ASKS_OTHERWISE: Partial<Record<DepthLayer, string>> = {
  // The candles are the chart library's; H-501 dims them with the FAR veil,
  // whose weight is the table's.
  candles: "ctx.fillStyle = `rgba(11,10,8,${(1 - att.candlesDim).toFixed(2)})`;",
};

/**
 * QUIET layers that need no `speaks` gate, and why:
 *   candles     — a veil, no words;
 *   regimeField — a light, no words (its QUIET is the governor's cap);
 *   marketZones — an unselected zone is a wordless outline already; the
 *                 selected zone's callout is the selection and speaks.
 */
const QUIET_WITHOUT_WORDS = new Set<DepthLayer>(["candles", "regimeField", "marketZones"]);

/** Each QUIET layer's word gates, at the words themselves (not just "asks somewhere"). */
const WORD_GATES = [
  'if (price == null || !att.speaks("livingProfile")) return;',
  'if (price == null || !att.speaks("compositeProfile")) return;',
  'if (Number.isFinite(top) && att.speaks("compositeProfile")) {',
  'if (price == null || !att.speaks("visibleRangeProfile")) return;',
  'if (Number.isFinite(top) && att.speaks("visibleRangeProfile")) {',
  'if (att.speaks("fusedObject")) levelChip(',
  'const vpSpeaks = att.speaks("volumeProfile");',
  "for (const wd of vpSpeaks ? vpWords : []) {",
  "if (vpSpeaks) {",
  'for (const wd of att.speaks("liquidityLifecycle") ? words : []) {',
  'const fpNumbers = att.speaks("footprint");',
  "if (rH >= 10 && fpNumbers) {",
  "const bd = fpNumbers ? barTapeDelta(getBarSubProfile(c)) : null;",
  "if (!fpNumbers) break;",
  'if (!att.speaks("dataGaps") && g.emptyIntervals < 3) continue;',
  'const msSpeaks = att.speaks("marketStructure");',
  "const lastMarks = msSpeaks ? marks.filter(m => m.isLast) : [];",
  'if (ms.bias !== "UNCLEAR" && msSpeaks) {',
  "if (!att.speaks(key)) return;",
];

/** The per-item gates where a selected object overrides the depth. */
const SELECTION_OVERRIDES = [
  'if (!att.paints("marketZones", { selectedItem: selected })) continue;',
  'if (!att.paints("absorption", { selectedItem: anatomySelReading?.currentId === anatomyTargetId(zoneTarget(zone)) })) continue;',
  'if (!att.paints("exhaustion", { selectedItem: markSelected })) continue;',
  'att.paints("anatomyCards", { selectedItem: true })',
  'att.paints("forceResponse", { selectedItem: true })',
];

/**
 * The only depth reads left: each changes a layer's FORM at a depth the
 * table already lets it paint at (Living's skeleton, the shelf's edges, the
 * NEAR rows-only footprint, the callout pick, the lens's NEAR yield, the
 * slice outline's camera test, the volume-band row's receipt word).
 */
const FORM_READS = [
  'const fpRowsOnly = semanticDensity.depth === "NEAR";',
  '&& semanticDensity.depth !== "FAR" && ys != null && +ys >= 0 && +ys <= pane0Bottom;',
  "const vpDepth = semanticDensity.depth;",
  "const calloutDepth = semanticDensity.depth;",
  "const depthD = semanticDensity.depth;",
  "const shelfDepth = semanticDensity.depth;",
  "const livingDepth = semanticDensity.depth;",
  "depth: semanticDensity.depth,",
];

const RECEIPTS = [
  "if (permissionNow) canvas.dataset.semanticPermission = permissionNow;",
  "else delete canvas.dataset.semanticPermission;",
  "if (withheldNow) canvas.dataset.semanticWithheld = withheldNow;",
  "else delete canvas.dataset.semanticWithheld;",
  "canvas.dataset.semanticCandlesDim = String(att.candlesDim);",
];

function audit(src: string): string[] {
  const out: string[] = [];
  const gov = src.indexOf("let att = selectAttentionGovernor({");
  if (gov < 0) return ["governor not found"];

  // (a) every layer asks, after the governor exists.
  for (const k of DEPTH_LAYERS) {
    const needle = ASKS_OTHERWISE[k] ?? `att.paints("${k}"`;
    const at = src.indexOf(needle);
    if (at < 0) out.push(`(a) ${k} never asks the permission table`);
    else if (at < gov) out.push(`(a) ${k} asks before the governor exists`);
  }

  // (b) every QUIET layer withholds its words through speaks().
  for (const k of DEPTH_LAYERS) {
    const quietSomewhere = (["FAR", "MID", "NEAR"] as const).some(d => permissionAt(k, d) === "QUIET");
    if (quietSomewhere && !QUIET_WITHOUT_WORDS.has(k) && !src.includes(`att.speaks("${k}")`)) {
      out.push(`(b) ${k} is QUIET at some depth but never asks speaks()`);
    }
  }

  for (const g of WORD_GATES) if (!src.includes(g)) out.push(`(b) word gate missing: ${g}`);

  // (c) the selected object overrides.
  for (const g of SELECTION_OVERRIDES) if (!src.includes(g)) out.push(`(c) selection override missing: ${g}`);

  // (d) no depth read decides whether a layer paints.
  const reads = src.split("\n").filter(l => /semanticDensity\.depth\b/.test(l)).map(l => l.trim());
  for (const r of reads) {
    if (!FORM_READS.some(f => r.includes(f))) out.push(`(d) a layer reads the depth itself: ${r}`);
  }
  for (const f of FORM_READS) if (!reads.some(r => r.includes(f))) out.push(`(d) form read moved or renamed: ${f}`);

  // (e) receipts, every frame, after the last governed site.
  for (const r of RECEIPTS) if (!src.includes(r)) out.push(`(e) receipt missing: ${r}`);
  const tiers = src.indexOf("canvas.dataset.attentionTiers = att.tiersReceipt();");
  const perm = src.indexOf("canvas.dataset.semanticPermission = permissionNow");
  if (!(perm > tiers && tiers > 0)) out.push("(e) semanticPermission is not published at the frame's end");
  const far = src.indexOf('if (att.paints("farEnvelope")) {');
  const farElse = src.indexOf("delete canvas.dataset.farForm;", far);
  const farBlock = far > 0 && farElse > far ? src.slice(far, farElse + 120) : "";
  if (!farBlock.includes("canvas.dataset.semanticCandlesDim = String(att.candlesDim);")) out.push("(e) the candle dim receipt is not written where the veil paints");
  if ((farBlock.match(/delete canvas\.dataset\.semanticCandlesDim;/g) ?? []).length < 2) out.push("(e) the candle dim receipt is not withdrawn off FAR");
  return out;
}

describe("every painting layer asks the ONE permission table (H-501)", () => {
  it("the audit reads real source (an empty sweep proves nothing)", () => {
    expect(DEPTH_LAYERS.length).toBeGreaterThan(40);
    expect((CHART.match(/att\.paints\("/g) ?? []).length).toBeGreaterThanOrEqual(DEPTH_LAYERS.length - 1);
  });

  it("MainChart passes the audit: every gate asks, QUIET layers withhold words, the selection overrides, no private depth rule, receipts published", () => {
    expect(audit(CHART)).toEqual([]);
  });

  it("(f) FAR silences what serving still showed at FAR on 2026-09-25", () => {
    for (const k of [
      "scaffolding", "exhaustion", "debtTag", "valueCandle", "liquidityLifecycle", "weather",
      "absorption", "anatomyCards", "regimeMagnets", "marketZones",
    ] as DepthLayer[]) {
      expect(SEMANTIC_PERMISSION[k][0], k).toBe("SILENT");
    }
    // What belongs: the envelope and its major names, the regime light, and
    // the major swings (QUIET: chevrons + the owner's letters).
    expect(SEMANTIC_PERMISSION.farEnvelope[0]).toBe("SPEAK");
    expect(SEMANTIC_PERMISSION.regimeField[0]).toBe("SPEAK");
    expect(SEMANTIC_PERMISSION.marketStructure[0]).toBe("QUIET");
    expect(SEMANTIC_PERMISSION.candles[0]).toBe("QUIET");
  });

  it("FAR's structure is the envelope's major swings, handed over — not a second detector", () => {
    expect(CHART).toContain("farMajorPivots = new Set(env.drawn ? env.named.map(n => `${n.kind}:${n.time}`) : []);");
    expect(CHART).toContain("if (farMajorPivots && !farMajorPivots.has(`${p.kind}:${p.time}`)) continue;");
    // QUIET structure: no rules, names or bias words.
    expect(CHART).toContain('const msSpeaks = att.speaks("marketStructure");');
    expect(CHART).toContain("const lastMarks = msSpeaks ? marks.filter(m => m.isLast) : [];");
    expect(CHART).toContain('if (ms.bias !== "UNCLEAR" && msSpeaks) {');
  });

  it("a withheld layer names its silence (SILENT:<depth>), never OFF", () => {
    // offWord is the one word-maker; every switched layer gate that can be
    // withheld routes its off receipt through it.
    expect((CHART.match(/att\.offWord\(/g) ?? []).length).toBeGreaterThanOrEqual(24);
    expect(CHART).toContain("if (fpSilent) dsFp.footprint = att.offWord(true);");
    expect(CHART).toContain('canvas.dataset.scaffolding = depth === "OFF" ? "OFF" : !scaffoldPaints ? att.offWord(true) :');
    expect(CHART).toContain('if (tagT && !att.permission.paints("debtTag")) canvas.dataset.debtTag = att.offWord(true);');
  });
});

describe("mutation checks — the audit fires on a broken copy", () => {
  const mutate = (from: string, to: string) => {
    expect(CHART.includes(from), `mutation anchor missing: ${from}`).toBe(true);
    return audit(CHART.replace(from, to));
  };

  it("a gate that stops asking (the FOUNDATION card at FAR)", () => {
    const v = audit(CHART.split('att.paints("scaffolding")').join("true"));
    expect(v.some(x => x.startsWith("(a) scaffolding never asks"))).toBe(true);
  });

  it("a layer that asks before the governor exists", () => {
    const moved = CHART.split('att.paints("candleTimer")').join("true")
      .replace("let att = selectAttentionGovernor({", 'void att.paints("candleTimer");\n      let att = selectAttentionGovernor({');
    expect(audit(moved).some(x => x.startsWith("(a) candleTimer asks before the governor exists"))).toBe(true);
  });

  it("a QUIET layer that keeps its words (Composite's level chips at NEAR)", () => {
    const v = audit(CHART.split('att.speaks("compositeProfile")').join("true"));
    expect(v.some(x => x.startsWith("(b) compositeProfile"))).toBe(true);
  });

  it("a QUIET caption that keeps printing (Composite's caption at NEAR)", () => {
    const v = mutate('if (Number.isFinite(top) && att.speaks("compositeProfile")) {', "if (Number.isFinite(top)) {");
    expect(v.some(x => x.startsWith("(b) word gate missing"))).toBe(true);
  });

  it("a selected zone that no longer overrides FAR", () => {
    const v = mutate('if (!att.paints("marketZones", { selectedItem: selected })) continue;', 'if (!att.paints("marketZones")) continue;');
    expect(v.some(x => x.startsWith("(c)"))).toBe(true);
  });

  it("a layer that decides its own depth rule again (the data-gap words)", () => {
    const v = mutate('if (!att.speaks("dataGaps") && g.emptyIntervals < 3) continue;', 'if (semanticDensity.depth === "FAR" && g.emptyIntervals < 3) continue;');
    expect(v.some(x => x.startsWith("(d)"))).toBe(true);
    expect(v.some(x => x.startsWith("(b) dataGaps"))).toBe(true);
  });

  it("a receipt that stops being withdrawn", () => {
    const v = mutate("else delete canvas.dataset.semanticWithheld;", "");
    expect(v.some(x => x.startsWith("(e)"))).toBe(true);
  });

  it("a candle veil that stops publishing what the candles read at", () => {
    const v = mutate("canvas.dataset.semanticCandlesDim = String(att.candlesDim);", "");
    expect(v.some(x => x.startsWith("(e)"))).toBe(true);
  });
});
