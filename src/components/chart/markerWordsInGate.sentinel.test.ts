/**
 * D · TEXT OVERLAP — the library's own marker words (pattern markers, Pine
 * shapes) are painted by lightweight-charts outside the overlay's word gate.
 * They now CLAIM their boxes at the start of every overlay frame, so overlay
 * words that would cover them yield (wordRegistry.ts).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("marker words are in the word gate", () => {
  it("every visible marker's text claims its box before any overlay word paints", () => {
    expect(src.length).toBeGreaterThan(100000);
    const at = src.indexOf("// THE LIBRARY'S OWN MARKER WORDS");
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at, src.indexOf("} catch { /* a marker read never stops the frame */ }", at));
    expect(block).toContain("markersPluginRef.current?.markers?.()");
    expect(block).toContain("pineMarkersPluginRef.current?.markers?.()");
    expect(block).toContain("wordGate.panel(m.text!, { x: +xr - w / 2, y, w, h });");
    // After the frame began, and before the first overlay word of the frame.
    const begin = src.indexOf("wordGate.beginFrame({ mode: wordGateMode");
    expect(begin).toBeGreaterThan(-1);
    expect(at).toBeGreaterThan(begin);
    const between = src.slice(begin, at).replace(/\/\/.*$/gm, "");
    // Only the RAW-mode stamp (which returns) may paint before the claims.
    expect((between.match(/\.fillText\(/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(between).toContain('canvas.dataset.raw = "OFF";');
  });
});
