/**
 * PAPER AND BROKER PRICE-LINE WORDS ARE READ ON THE GLASS — Garden 16 §17,
 * found on the glass 2026-09-26 (TSLA 15m, 1600×900 and DPR 2).
 *
 * lightweight-charts right-aligns a price line's `title` against the price
 * axis — the column where the WM overlay paints the Living Profile body, the
 * live-price bar and the WAIT tag. "PAPER" read; "LONG 10 · +$21.10" sat under
 * the WAIT tag and "WEBULL COST ×3" under the profile. BEFORE/AFTER frames:
 * scratchpad g16/eyes/paperlines-{before,after}-dpr{1,2}*.png.
 *
 * This Sentinel reads source (a breadcrumb; the frames are the proof). It pins:
 *   - both native lines carry the owner's empty title — no words in the gutter;
 *   - the words come from the owner (`paperPositionLineTitle`,
 *     `brokerCostLineTitle`) and ride to the overlay;
 *   - the overlay places them through the keep-out owner — every candle body
 *     on the row, every chip already on the glass, strict — left of the
 *     profile family, and WITHHOLDS (never overprints) a word with no clear spot;
 *   - they are placed after the WAIT tag, so they step around it;
 *   - the frame publishes `priceLineWords` in every state.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function between(a: string, b: string): string {
  const i = SRC.indexOf(a);
  const j = SRC.indexOf(b, i + 1);
  expect(i, a).toBeGreaterThan(-1);
  expect(j, b).toBeGreaterThan(i);
  return SRC.slice(i, j);
}

const PAPER = () => between("Paper-trade position lines (native price lines + live P&L)", "BROKER COST LINE (HOUSE PLAN bolt-on #6)");
const BROKER = () => between("/* ── BROKER COST LINE (HOUSE PLAN bolt-on #6)", "Log / pct / auto scale mode");
const WORDS = () => between("PRICE-LINE WORDS · PAPER AND BROKER", "ATTENTION RECEIPT — every layer");

describe("paper and broker price-line words live on the WM glass", () => {
  it("no native price line in either block carries words", () => {
    for (const [name, b] of [["paper", code(PAPER())], ["broker", code(BROKER())]] as const) {
      const calls = [...b.matchAll(/createPriceLine\(\{[\s\S]*?\}\)/g)].map(m => m[0]);
      expect(calls.length, `${name}: createPriceLine not found`).toBeGreaterThan(0);
      for (const c of calls) {
        expect(c, `${name}: native title must be the owner's empty title`).toContain("title: PRICE_LINE_NATIVE_TITLE,");
        expect(c).not.toMatch(/title(?::\s*(?!PRICE_LINE_NATIVE_TITLE)\w|\s*[,}])/);
      }
      expect(b, `${name}: a live refresh must not put words back on the native line`).not.toMatch(/applyOptions\(\{[^}]*title/);
    }
  });

  it("the words come from their owner and ride to the overlay", () => {
    expect(code(BROKER())).toContain("const title = brokerCostLineTitle(p);");
    expect(code(BROKER())).not.toMatch(/`WEBULL COST/);
    expect(code(BROKER())).toContain('priceLineWordsRef.current.broker.push({ kind: "BROKER", price: p.paintLevel, text: title, ink: "#E8B54D" });');
    expect(code(PAPER())).toContain('priceLineWordsRef.current.paper.push({ kind: "PAPER", price: pos.avgPx, text, ink: paperColor(up) });');
    // Each effect clears its own words with its own lines.
    expect(code(PAPER())).toContain("priceLineWordsRef.current.paper = [];");
    expect(code(BROKER())).toContain("priceLineWordsRef.current.broker = [];");
  });

  it("the overlay places them through the keep-out owner: candles on the row, chips, strict; left of the profile", () => {
    const w = code(WORDS());
    expect(w).toContain("const rightEnd = priceLineWordsRightEdge({");
    expect(w).toContain("profileStackLeft: dsP.profileStackLeft ? Number(dsP.profileStackLeft) : null,");
    expect(w).toContain("livingBodyLeft,");
    expect(w).toMatch(/placeClearOfKeepOut\(\s*onLine,\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(y - h - 2, y \+ h \+ 2\)\],\s*\{ minX: keepOutMinX\(\), blockers: floatingChips, strict: true, alternates: alts \},\s*\)/);
    expect(w).toContain("floatingChips.push({ x: r.x, y: r.y, w: r.w, h: r.h });");
  });

  it("a word with no clear spot is WITHHELD, never overprinted, and the receipt names it every frame", () => {
    const w = code(WORDS());
    const blocked = w.indexOf('if (spotP.mode === "BLOCKED") { placedP.push({ kind: wd.kind, price: wd.price, mode: "WITHHELD" }); continue; }');
    const paint = w.indexOf("ctx.fillText(wd.text");
    expect(blocked).toBeGreaterThan(-1);
    expect(paint).toBeGreaterThan(blocked);
    expect(w).toContain("canvas.dataset.priceLineWords = priceLineWordsReceipt(placedP);");
    // Published outside the `if (wordsP.length)` branch: NONE is a receipt too.
    expect(w.lastIndexOf("canvas.dataset.priceLineWords")).toBeGreaterThan(w.lastIndexOf("ctx.restore();"));
  });

  it("placed after the WAIT tag, so they step around it rather than under it", () => {
    const tag = SRC.indexOf("H-101 · THE DEBT TAG LIVES ON THE EVENT");
    const words = SRC.indexOf("PRICE-LINE WORDS · PAPER AND BROKER");
    expect(tag).toBeGreaterThan(-1);
    expect(words).toBeGreaterThan(tag);
  });
});
