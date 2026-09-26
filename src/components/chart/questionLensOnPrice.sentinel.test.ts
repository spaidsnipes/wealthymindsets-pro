/**
 * THE QUESTION LENS PAINTS ON PRICE — GP12 §67, plates UI-04 / UI-15 / UI-07
 * (2026-09-26).
 *
 * Serving before this (TSLA 15m and NQ1! 15m, Founder on Trap?): every
 * question painted the same thin band at its price and one chip; nothing on
 * price said WHERE the break was, which bar paid which debt item, or which
 * highs were tested. The canon draws each question's own geometry: UI-04's
 * zone rings, leader words and effort columns; UI-15's leg, levels and held
 * higher low; UI-07's ✓ / ✗ per item.
 *
 * The law this pins:
 *   (a) the chart PROJECTS `lens.marks` — the selector's price × time
 *       geometry — and finds no level, swing or zone of its own;
 *   (b) every mark kind the selector can emit has a painter;
 *   (c) the geometry passes behind every chip already on the glass;
 *   (d) words are placed strictly by the keep-out owner against the candle
 *       bodies in their row, the chips on the glass and the lens's own strip
 *       and card — or HELD, never printed through — and each placed word
 *       becomes a chip later layers step round;
 *   (e) FAR (H-501: the lens speaks at every depth) keeps the minimal form;
 *   (f) the receipt questionLensForm=<KIND>:<geometry list> is published every
 *       frame the lens paints and withdrawn when it does not; its card form is
 *       questionLensCard, withdrawn with the anatomy block;
 *   (g) the SECONDARY NOISE quiet stays: the lens still quiets the rest.
 *
 * The audit is a pure function of the source; the MUTATION checks run it over
 * broken copies and require it to fire. A breadcrumb, not a renderer.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const CHART = read("src/components/chart/MainChart.tsx");
const LENS = read("src/lib/marketData/viewModels/selectQuestionLens.ts");

const MARK_KINDS = (() => {
  const m = LENS.match(/export type LensMarkKind = ([^;]+);/);
  return m ? [...m[1].matchAll(/"([A-Z_]+)"/g)].map(x => x[1]) : [];
})();

function onPriceBlock(src: string): string {
  const a = src.indexOf("/* ── ON PRICE — each question's own geometry");
  const b = src.indexOf("const narrowLens = W < 640;", a);
  return a > 0 && b > a ? src.slice(a, b) : "";
}

function audit(src: string): string[] {
  const out: string[] = [];
  const block = onPriceBlock(src);
  if (!block) return ["the ON PRICE block is missing (or no longer sits before the card)"];
  const tagAt = src.indexOf('const tagWord = lens.kind === "EXHAUSTION"');
  if (!(tagAt > 0 && src.indexOf(block) > tagAt)) out.push("ON PRICE does not follow the band and its tag");

  // (a) projection only.
  if (!block.includes("const marks = [...(lens.marks ?? [])]")) out.push("(a) the marks are not the lens's own");
  for (const forbidden of ["marketStructureRef", ".pivots", ".zones", "selectExhaustion(", "anatomy."]) {
    if (block.includes(forbidden)) out.push(`(a) the chart reads an owner itself: ${forbidden}`);
  }

  // (b) every kind has a painter.
  if (MARK_KINDS.length < 10) out.push("(b) LensMarkKind not found in the selector");
  const order = block.match(/const order = \[([^\]]+)\] as const;/);
  for (const k of MARK_KINDS) {
    if (!order || !order[1].includes(`"${k}"`)) out.push(`(b) ${k} has no place in the paint order`);
    // A painter is a branch that opens on the kind (PAID / OWED share the glyph branch).
    const branch = new RegExp(`if \\((?:m\\.kind === "[A-Z_]+" \\|\\| )*m\\.kind === "${k}"(?: \\|\\| m\\.kind === "[A-Z_]+")*\\) \\{`);
    const glyph = (k === "PAID" || k === "OWED") && block.includes('const paid = m.kind === "PAID";');
    if (!glyph && !branch.test(block)) out.push(`(b) ${k} has no painter`);
  }

  // (c) geometry behind the chips.
  const cut = block.indexOf('ctx.clip(markCut, "evenodd");');
  const loop = block.indexOf("for (const m of marks) {");
  if (cut < 0 || !block.includes("for (const ch of floatingChips) if (!lensOwnMarkBoxes.has(ch)) markCut.rect(")) out.push("(c) the geometry is not cut round the chips");
  else if (loop < cut) out.push("(c) the marks paint before the cut");

  // The ring and the break bar own their pixels before the tag is placed.
  const own = src.indexOf("lensOwnMarkBoxes.add(box);");
  const ownPush = src.indexOf("floatingChips.push(box);", own);
  if (!(own > 0 && ownPush > own && ownPush < tagAt)) out.push("(c) the question's own marks are not chips before its tag");

  // (d) words: strict keep-out placement, HELD when blocked, then a chip.
  const place = block.indexOf("const spot = placeClearOfKeepOut(slots[0], [...keepOut(), ...rowBodiesAt(yTop, yBot)], {");
  if (place < 0) out.push("(d) words are not placed by the keep-out owner against the bodies in their row");
  const placeArgs = place > 0 ? block.slice(place, block.indexOf("});", place)) : "";
  if (!placeArgs.includes("blockers: [...floatingChips, ...lensOwnRects],")) out.push("(d) words do not step round the chips and the lens's own strip / card");
  if (!placeArgs.includes("strict: true,")) out.push("(d) words are not placed strictly");
  const held = block.indexOf('if (spot.mode === "BLOCKED"');
  const printed = block.indexOf("ctx.fillText(word, r.x + 5, r.y + r.h / 2 + 0.5);");
  if (!(held > place && printed > held)) out.push("(d) a blocked word still prints");
  const chip = block.indexOf("floatingChips.push({ x: r.x, y: r.y, w: r.w, h: r.h });");
  if (!(chip > printed)) out.push("(d) a placed word is not registered as a chip");
  if (!block.includes("recordKeepOut(keepOutLedger, spot);")) out.push("(d) word placements are not counted in the keep-out ledger");

  // (e) FAR keeps the minimal form.
  if (!block.includes('if (lensFar && (m.kind === "EFFORT" || m.kind === "PAID" || m.kind === "OWED" || m.kind === "DEFENSE")) continue;')) out.push("(e) FAR paints columns, ✓ / ✗ or wedges");
  if ((block.match(/if \(m\.word && !lensFar\)/g) ?? []).length < 2) out.push("(e) FAR prints leader words");
  if (!/if \(!lensFar\) \{\s*for \(const sil of lens\.silences \?\? \[\]\)/.test(block)) out.push("(e) FAR prints the silences");
  if (!block.includes('...(lensFar ? ["far"] : [])')) out.push("(e) the receipt does not say FAR's form");

  // (f) receipts.
  if (!block.includes("ds.questionLensForm = `${lens.kind}:${formList.length ? formList.join(\",\") : \"none\"}`;")) out.push("(f) the per-question receipt is missing");
  if (!block.includes("lensFormPainted = true;")) out.push("(f) the receipt is not marked as painted this frame");
  if (!src.includes("if (!lensFormPainted) delete ds.questionLensForm;")) out.push("(f) the receipt is not withdrawn");
  if (!/const ANATOMY_BLOCK_RECEIPTS = \[[\s\S]*?"questionLensCard",[\s\S]*?\] as const;/.test(src)) out.push("(f) questionLensCard is not withdrawn with the block");
  if (!src.includes("delete ds.questionLensCard;")) out.push("(f) questionLensCard outlives its frame");
  if (!src.includes("ds.questionLensForm = `${lens.choice}:silence(refused)`;")) out.push("(f) a refused question does not name its silence");

  // (g) the quiet stays.
  if (!src.includes("questionQuiet = 0.35;") || !src.includes("att = att.withQuestionQuiet(questionQuiet);")) out.push("(g) the SECONDARY NOISE quiet is gone");
  return out;
}

describe("the Question Lens paints each question's geometry on price (GP12 §67, 2026-09-26)", () => {
  it("MainChart passes the audit", () => {
    // Proof the scan found its material: the block and the selector's kinds.
    expect(onPriceBlock(CHART).length).toBeGreaterThan(4000);
    expect(MARK_KINDS.length).toBeGreaterThan(10);
    expect(audit(CHART)).toEqual([]);
  });

  it("the selector names every kind the chart paints", () => {
    expect(MARK_KINDS.sort()).toEqual(["ARROW", "BAND", "BREAK_BAR", "DEFENSE", "EFFORT", "LEG", "LEVEL", "OWED", "PAID", "RING", "WINDOW"]);
  });

  const mutate = (from: string, to: string) => {
    expect(CHART.includes(from), from).toBe(true);
    return audit(CHART.replace(from, to));
  };

  it("MUTATION: FAR painting the full form fires (e)", () => {
    const v = mutate('if (lensFar && (m.kind === "EFFORT" || m.kind === "PAID" || m.kind === "OWED" || m.kind === "DEFENSE")) continue;', "");
    expect(v.some(x => x.startsWith("(e)"))).toBe(true);
  });

  it("MUTATION: a word placed loosely, or printed when blocked, or never registered, fires (d)", () => {
    expect(mutate("                      strict: true,\n                      alternates: slots.slice(1),", "                      alternates: slots.slice(1),")
      .some(x => x === "(d) words are not placed strictly")).toBe(true);
    expect(mutate('if (spot.mode === "BLOCKED" || spot.rect.x', "if (false || spot.rect.x").some(x => x === "(d) a blocked word still prints")).toBe(true);
    expect(mutate("floatingChips.push({ x: r.x, y: r.y, w: r.w, h: r.h });", "").some(x => x === "(d) a placed word is not registered as a chip")).toBe(true);
    expect(mutate("blockers: [...floatingChips, ...lensOwnRects],", "blockers: [],").some(x => x.startsWith("(d) words do not step round"))).toBe(true);
  });

  it("MUTATION: geometry over the chips, or a tag free to print on the ring, fires (c)", () => {
    expect(mutate('ctx.clip(markCut, "evenodd");', "").some(x => x.startsWith("(c)"))).toBe(true);
    expect(mutate("                    floatingChips.push(box);\n", "").some(x => x === "(c) the question's own marks are not chips before its tag")).toBe(true);
  });

  it("MUTATION: the chart finding its own swings fires (a)", () => {
    expect(mutate("const marks = [...(lens.marks ?? [])]", "const marks = [...(marketStructureRef.current?.pivots ?? [])]").some(x => x.startsWith("(a)"))).toBe(true);
  });

  it("MUTATION: a mark kind with no painter fires (b)", () => {
    expect(mutate('if (m.kind === "DEFENSE") {', "if (false) {").some(x => x === "(b) DEFENSE has no painter")).toBe(true);
  });

  it("MUTATION: a receipt that is not published or not withdrawn fires (f)", () => {
    expect(mutate("if (!lensFormPainted) delete ds.questionLensForm;", "").some(x => x.startsWith("(f)"))).toBe(true);
    expect(mutate("            delete ds.questionLensCard;\n", "").some(x => x === "(f) questionLensCard outlives its frame")).toBe(true);
  });
});
