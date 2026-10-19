/**
 * FL-06 ABSORPTION SHELF — presentation may change; geometry may not.
 *
 * The desktop shelf is allowed to lose its floating gold-card shell and gain
 * the reference's restrained hatch. It is not allowed to gain a decorative
 * minimum height, extend across the chart, or acquire a second placement
 * compiler. MainChart paints only inside the real time/price rectangle emitted
 * by selectAbsorptionAnatomy; narrow charts retain the backed label.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const chart = readFileSync(
  join(process.cwd(), "src/components/chart/MainChart.tsx"),
  "utf8",
);

describe("the FL-06 absorption shelf stays attached to measured price geometry", () => {
  it("clips the desktop hatch to the real zone rectangle", () => {
    expect(chart).toContain("const desktopShelfInstrument = W >= 960");
    expect(chart).toContain("ctx.rect(x0, yHi, bw, bh)");
    expect(chart).toContain("ctx.clip()");
    expect(chart).toContain("for (let hx = x0 - bh; hx < x1 + bh; hx += hatchStep)");
  });

  it("uses a direct desktop annotation while preserving the narrow backed label", () => {
    expect(chart).toContain("if (desktopShelfInstrument)");
    // Updated 2026-09-25 (FL-06 ① "Absorption Shelf (Sell Side)"): the desktop
    // annotation paints `shelfWords` — the shelf's NAME (+ owner-named side)
    // at rest, the numeric `chip` only on the selected shelf. Same placement.
    expect(chart).toContain("const shelfWords = desktopShelfInstrument && !shelfSelected ? shelfName : chip;");
    expect(chart).toContain("ctx.fillText(shelfWords, chipX, chipY + chipH / 2 + 0.5)");
    expect(chart).toContain("ctx.fillRect(chipX, chipY, chipW, chipH)");
    expect(chart).toContain("ctx.fillText(chip, chipX + 6, chipY + chipH / 2 + 0.5)");
  });

  it("keeps effort basis visible but removes its desktop card shell", () => {
    expect(chart).toContain("const desktopBasisChrome = W >= 960");
    // 2026-10-16: the desktop caption takes its seat through the keep-out owner (DAY BIAS chip now sits there).
    expect(chart).toContain("ctx.fillText(basisTxt, spotB.rect.x, spotB.rect.y + 7.5)");
    expect(chart).toContain("ctx.fillText(basisTxt, nx + 6, ny + 7.5)");
    // Pin moved 2026-09-30: the UNMEASURED refusal takes the measured basis
    // slot (it kept the pre-legend (8, 8) spot and printed under the symbol).
    expect(chart).toContain("ctx.fillText(txt, desktopBasisChrome ? rbx : rbx + 6, rby + 7.5)");
    expect(chart).not.toContain("ctx.fillText(txt, desktopBasisChrome ? 8 : 14, 15.5)");
  });

  it("keeps the measured-window count while making it quiet desktop chrome", () => {
    expect(chart).toContain("const desktopWindowChrome = W >= 960");
    // 2026-10-19: winX = the window start, stepped right of a rail or a left-docked Inspect Ticket.
    expect(chart).toContain("ctx.fillText(winTxt, winX + 3, plotBottom - 11.5 - winDy)");
    // 2026-10-17: its row, one row up, or held — never over a word already on the glass.
    expect(chart).toContain("ctx.fillRect(winX + 3, plotBottom - 18 - winDy, winW + 10, 13)");
    expect(chart).toContain("ctx.fillText(winTxt, winX + 8, plotBottom - 11.5 - winDy)");
  });

  it("still has exactly one absorption placement compiler call", () => {
    const executable = chart
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");
    expect(executable.match(/\bselectAbsorptionAnatomy\s*\(/g) ?? []).toHaveLength(1);
  });
});
