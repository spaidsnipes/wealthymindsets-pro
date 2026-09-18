/**
 * THE FIGURE'S LAWS — written against the two defects that were live.
 *
 * `realizedR >= 0 ? green : red` with `>= 0 ? "+" : ""` beside it. One
 * expression, two separate failures, and the second one survives any repair
 * aimed at the first — which is exactly what happened: c2d5087b fixed both on
 * the Decision Receipt and /journal kept both for another month.
 *
 * So the sign is tested at the boundary, in its own right, and not merely as a
 * side effect of asserting the colour.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";

import { RealizedRFigure, signedR, type RealizedRScale } from "./RealizedRFigure";

const render = (realizedR: number | null | undefined, scale: RealizedRScale = "CHIP"): string =>
  renderToStaticMarkup(<RealizedRFigure realizedR={realizedR} scale={scale} testId="t" />);

describe("RealizedRFigure — §9, a profitable trade is not a good trade", () => {
  it("IS THE SAME COLOUR AT EVERY SIGN", () => {
    // The repair, stated as the law. A win and a loss differ by the glyph, and
    // by nothing else — because the fact the house actually judges is whether
    // the exit was BY RULE, and that is printed separately.
    const colourOf = (html: string) => html.match(/color:\s*([^;"]+)/)?.[1]?.trim();
    const shades = new Set(
      [-3.2, -1, -0.01, 0, 0.01, 1, 4.5].map((r) => colourOf(render(r))),
    );
    expect(shades.size, "the figure changes colour with its sign").toBe(1);
    expect([...shades][0]).toBe("#ede6d3");
  });

  it("CARRIES NO GREEN-DOMINANT COLOUR IN ANY STATE", () => {
    for (const scale of ["CHIP", "FIGURE"] as const) {
      for (const r of [-2, 0, 2]) {
        const html = render(r, scale);
        for (const m of html.matchAll(/#([0-9a-f]{6})\b/gi)) {
          const [red, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
          expect(g > red && g > b, `green-dominant #${m[1]}`).toBe(false);
        }
        for (const m of html.matchAll(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
          const [red, g, b] = [1, 2, 3].map((i) => Number(m[i]));
          expect(g > red && g > b, `green-dominant ${m[0]}`).toBe(false);
        }
      }
    }
  });

  it("changes NOTHING but size between the two scales", () => {
    // A detail figure that was subtly warmer than its own list chip would be
    // the verdict returning through the scale prop.
    const pick = (html: string) => (html.match(/color:\s*([^;"]+)/)?.[1] ?? "").trim();
    expect(pick(render(2, "CHIP"))).toBe(pick(render(2, "FIGURE")));
  });
});

describe("RealizedRFigure — a scratch is not a gain", () => {
  it("DOES NOT PREFIX A PLUS TO ZERO — the defect that survives a colour repair", () => {
    // `>= 0` filed a flat trade under the favourable outcome for free. H1's
    // shape, in the place a trader reads fastest.
    expect(signedR(0)).toBe("0.00R");
    expect(render(0)).toContain(">0.00R<");
    expect(render(0)).not.toContain("+");
  });

  it("walks the boundary either side of zero", () => {
    expect(signedR(0.01)).toBe("+0.01R");
    expect(signedR(-0.01)).toBe("-0.01R");
    // -0 is zero. A sign bit is not a gain either, and toFixed would print
    // "-0.00" while the comparator called it flat.
    expect(signedR(-0)).toBe("0.00R");
  });

  it("does not round a losing trade into a scratch that then reads as flat", () => {
    // 0.004 prints as "0.00R" and that is correct — but it must not acquire a
    // plus on the way, which `>= 0` would have given it.
    expect(signedR(0.004)).toBe("+0.00R");
    expect(signedR(-0.004)).toBe("-0.00R");
  });
});

describe("RealizedRFigure — H1, no reading is not a reading of zero", () => {
  it("DRAWS NOTHING WHEN THERE IS NO REALIZED R", () => {
    // Records that pre-date the Proof Lane fields have no R. Drawing "0.00R"
    // would report a scratch the house never observed.
    for (const v of [null, undefined, NaN, Infinity, -Infinity]) {
      expect(render(v as number | null | undefined), String(v)).toBe("");
    }
  });

  it("draws a real zero, because a measured scratch IS a finding", () => {
    expect(render(0)).not.toBe("");
    expect(render(0)).toContain('data-realized-r="0"');
  });
});

describe("RealizedRFigure — the call sites that used to draw it themselves", () => {
  const source = (rel: string) =>
    readFileSync(path.join(process.cwd(), rel), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");

  it("NO ROUTE STILL SPELLS THE SIGN OR THE COLOUR ITSELF", () => {
    // The point of the extraction. Three call sites drew this number, one was
    // repaired and two were not, and nothing connected them. Aimed at the
    // EXPRESSION rather than at either route's palette — /journal carries
    // legitimate green elsewhere and is entitled to.
    for (const rel of ["src/app/journal/page.tsx", "src/components/experience/DecisionReceiptPanel.tsx"]) {
      const src = source(rel);
      expect(src, `${rel} still compares realizedR against 0 for a colour or a sign`).not.toMatch(
        /realizedR\s*>=\s*0/,
      );
    }
  });

  it("/journal renders both of its R readings through the one owner", () => {
    const src = source("src/app/journal/page.tsx");
    expect([...src.matchAll(/<RealizedRFigure/g)].length).toBe(2);
    // And neither is hand-formatted alongside it.
    expect(src).not.toMatch(/realizedR\.toFixed\(2\)\}R/);
  });
});
