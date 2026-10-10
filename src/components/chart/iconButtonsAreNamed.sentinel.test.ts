/**
 * NO CONTROL IS NAMED ONLY BY A HOVER TOOLTIP (hover-only audit, 2026-10-10).
 *
 * A `title` shows on mouse hover and nowhere else: a phone, a tablet and a
 * keyboard user never see it. Ten icon-only buttons in the chart, desk and
 * broker folders were named only that way (magnet, lock, show/hide drawings,
 * the drawing-style swatch with no name at all, line widths, Big Trades and
 * footprint colour gears, indicator settings, reset, close). Each now carries
 * an aria-label (and aria-pressed / aria-expanded where it toggles or opens).
 *
 * The scan: every <button> whose body holds no text (only icons / swatches)
 * must carry aria-label or aria-labelledby on its opening tag. MainChart is the
 * chart lane's and is listed, not scanned (its line-width chips, ~29953).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DIRS = ["src/components/chart", "src/components/desk", "src/components/broker"];
const SKIP = new Set(["MainChart.tsx"]);

function openingTagEnd(block: string): number {
  let depth = 0;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return i;
  }
  return -1;
}

function unnamedIconButtons(src: string): number[] {
  const lines: number[] = [];
  for (const m of src.matchAll(/<(button|motion\.button)\b/g)) {
    const close = src.indexOf(`</${m[1]}>`, m.index!);
    if (close < 0 || close - m.index! > 3000) continue;
    const block = src.slice(m.index!, close);
    const end = openingTagEnd(block);
    if (end < 0) continue;
    const opening = block.slice(0, end);
    if (/aria-label(ledby)?=/.test(opening)) continue;
    const body = block.slice(end + 1)
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\{[^{}]*\}/g, "X");
    if (body.replace(/\s+/g, "") === "") lines.push(src.slice(0, m.index!).split("\n").length);
  }
  return lines;
}

describe("icon-only buttons carry a name a touch screen and a screen reader can read", () => {
  const files = DIRS.flatMap(d => readdirSync(path.join(process.cwd(), d))
    .filter(f => f.endsWith(".tsx") && !f.includes(".test.") && !SKIP.has(f))
    .map(f => path.join(d, f)));

  it("ANTI-VACUITY: the scan read the folders and finds a planted offender", () => {
    expect(files.length).toBeGreaterThan(60);
    expect(unnamedIconButtons('<button title="x" onClick={f}><X size={3} /></button>')).toEqual([1]);
    expect(unnamedIconButtons('<button aria-label="Close" onClick={f}><X size={3} /></button>')).toEqual([]);
    expect(unnamedIconButtons('<button onClick={f}>Close</button>')).toEqual([]);
  });

  it("no icon-only button is named only by title (or not at all)", () => {
    const offenders = files.flatMap(f => unnamedIconButtons(readFileSync(path.join(process.cwd(), f), "utf8")).map(l => `${f}:${l}`));
    expect(offenders).toEqual([]);
  });
});
