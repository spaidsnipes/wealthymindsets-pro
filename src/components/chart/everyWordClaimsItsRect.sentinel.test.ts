/**
 * SENTINEL — no word on the chart glass bypasses the word registry.
 *
 * Serving all-on at 390 and 834 (92895d6, 2026-10-09) failed the pairwise
 * collision audit although every taught painter was clean: the rule lived in
 * the painters, so the next painter was free to break it. The rule now lives
 * in the context's own fillText (src/lib/chart/wordRegistry.ts). This file
 * pins that MainChart cannot route around it.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const REG = readFileSync(path.join(process.cwd(), "src/lib/chart/wordRegistry.ts"), "utf8");

describe("every word claims its rect before it paints", () => {
  it("every 2D context MainChart paints words on is gated, and its frame is begun, before any text call", () => {
    const gates = [...CHART.matchAll(/installWordGate\(ctx\)/g)].map(m => m.index ?? -1);
    const contexts = [...CHART.matchAll(/const ctx = canvas\.getContext\("2d"\);/g)].map(m => m.index ?? -1);
    expect(contexts.length).toBe(2);
    expect(gates.length).toBe(contexts.length);
    contexts.forEach((at, i) => {
      const firstText = CHART.indexOf("ctx.fillText(", at);
      expect(gates[i]).toBeGreaterThan(at);
      expect(gates[i]).toBeLessThan(firstText);
      expect(CHART.indexOf("beginFrame(", gates[i])).toBeLessThan(firstText);
    });
  });
  it("every text call goes through the gated context — no raw prototype call, no other context's fillText, no strokeText words", () => {
    const calls = [...CHART.matchAll(/([A-Za-z_.]+)\.fillText\(/g)].map(m => m[1]);
    expect(calls.length).toBeGreaterThan(150);
    expect(calls.filter(c => c !== "ctx")).toEqual([]);
    expect(CHART).not.toMatch(/prototype\.fillText|fillText\.(call|apply|bind)\(/);
    // Halos ask the same registry (the gate wraps strokeText too) — and only on the gated context.
    expect([...CHART.matchAll(/([A-Za-z_.]+)\.strokeText\(/g)].map(m => m[1]).filter(c => c !== "ctx")).toEqual([]);
    expect(REG).toContain("ctx.strokeText = gated(rawStroke);");
  });
  it("the allow-list is explicit: only wordGate.sovereign may paint unjudged, and MainChart does not use it for market words", () => {
    // Axis and price-scale text belong to the charting library's own canvases;
    // the overlay has no sovereign call today. Adding one is a reviewed act.
    expect([...CHART.matchAll(/\.sovereign\(/g)].length).toBe(0);
    expect(REG).toContain("if (!live || sovereignDepth > 0) return paint();");
  });
  it("the newest candles' column is a registry blocker at every width, from the first word of the frame", () => {
    expect(CHART).toContain("wordGate.beginFrame({ mode: wordGateMode, dpr, column: wordGateColumnRef.current, onHeld: w => { wordGateHeld.push(w); } });");
    expect(CHART).toContain("wordGateColumnRef.current = newestColumnKeepOut();\n      wordGate.setColumn(wordGateColumnRef.current);");
    // No width condition anywhere near the column hand-off.
    const i = CHART.indexOf("wordGate.setColumn(wordGateColumnRef.current);");
    expect(CHART.slice(i - 300, i + 60)).not.toMatch(/W\s*[<>]=?\s*\d/);
  });
  it("a withheld word is listed, never dropped; the note anchors read the same registry; the verdicts are a receipt", () => {
    expect(CHART).toContain('displacedNotes.push({ layer: "WORDS", text: hw.text.trim(), x: hw.rect.x + hw.rect.w / 2, y: hw.rect.y + hw.rect.h / 2 });');
    expect(CHART).toContain("const wordRectsNow = wordGate.rects().map(q => ({ x: q.x, y: q.y, w: q.w, h: q.h }));");
    expect(CHART).toContain("floatingChips.splice(chipsBeforeWords, wordRectsNow.length);");
    expect(CHART).toContain("canvas.dataset.wordGate = wordGate.receipt();");
  });
  it("withholding is by address until the verdicts are read on serving (OBSERVE changes nothing on the glass)", () => {
    expect(REG).toContain('if (verdict === "PAINT" || mode === "OBSERVE") return paint();');
    expect(REG).toContain('get("gate") === "enforce" ? "ENFORCE" : "OBSERVE"');
  });
});
