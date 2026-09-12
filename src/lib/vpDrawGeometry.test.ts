import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  VP_AXIS_MARGIN_PX,
  VP_COLUMN_GAP_PX,
  VP_MIN_ROW_PX,
  vpBarSplit,
  vpBarWidth,
  vpColumnLayout,
  vpLabelFits,
  vpRowRect,
} from "./vpDrawGeometry";

/**
 * Volume Profile DRAW geometry — the half of the profile the trader looks at.
 *
 * vpEngine owns where the volume goes and has a full suite. Turning a bucket
 * into a rectangle was still inline in drawWMVP with no coverage, even though
 * the comments there make specific claims about the honesty of the picture:
 * pixel-flush rows, bar length directly proportional to volume, the histogram
 * never on top of the price labels. A comment is not a guard.
 */

describe("vpColumnLayout — the histogram is a lane, never a wall", () => {
  it("clears the price axis by a fixed margin, so bars never sit on the numbers", () => {
    const { right } = vpColumnLayout(1200, 90, 0, 1);
    expect(right).toBe(1200 - 90 - VP_AXIS_MARGIN_PX);
  });

  it("reserves the axis width it is GIVEN, not a fixed guess", () => {
    // BTC's 59,800.00 axis is far wider than a $12 stock's. A fixed 60px
    // reserve let the bars bleed over the numbers on crypto.
    const narrow = vpColumnLayout(1200, 60, 0, 1).right;
    const wide = vpColumnLayout(1200, 130, 0, 1).right;
    expect(wide).toBeLessThan(narrow);
    expect(narrow - wide).toBe(70);
  });

  it("caps a single column at 13% of the usable span", () => {
    expect(vpColumnLayout(600, 90, 0, 1).width).toBeCloseTo((600 - 90) * 0.13, 6);
  });

  it("caps a single column absolutely at 116px on a wide screen", () => {
    // Without the absolute cap a 4K chart would give the profile a 300px slab.
    expect(vpColumnLayout(3000, 90, 0, 1).width).toBe(116);
  });

  it("narrows both columns when Fixed and Session VP are both on", () => {
    expect(vpColumnLayout(3000, 90, 0, 2).width).toBe(84);
    expect(vpColumnLayout(600, 90, 0, 2).width).toBeCloseTo((600 - 90) * 0.1, 6);
  });

  it("places the second column SIDE BY SIDE, not stacked on the first", () => {
    // Two histograms in the same right-anchored column was the BTC "VP looks
    // wrong" bug: overlapping bars and colliding labels.
    const a = vpColumnLayout(1200, 90, 0, 2);
    const z = vpColumnLayout(1200, 90, 1, 2);
    expect(a.right - z.right).toBe(a.width + VP_COLUMN_GAP_PX);
    expect(z.right).toBeLessThanOrEqual(a.right - a.width);
  });

  it("THE FIX: says a column does not fit rather than painting it off-canvas", () => {
    // Usable span too small to hold two columns. The inline code produced a
    // negative right edge and drew every bar left of x=0 — the profile was
    // requested, the work was done, and nothing appeared.
    // MEASURED boundary: with two columns the second one's left edge is
    // 0.8 * usable - 18, so it walks off the canvas once the usable span drops
    // below ~22px. 110 - 90 = 20 is inside that.
    const z = vpColumnLayout(110, 90, 1, 2);
    expect(
      z.fits,
      "a column drawn at negative x is invisible. Silently drawing nothing is " +
      "the defect; declining out loud is the fix.",
    ).toBe(false);
  });

  it("fits a normal desktop and a phone-width chart", () => {
    expect(vpColumnLayout(1200, 90, 0, 1).fits).toBe(true);
    expect(vpColumnLayout(1200, 90, 1, 2).fits).toBe(true);
    expect(vpColumnLayout(390, 70, 0, 1).fits).toBe(true);
  });

  it("refuses when the price axis is as wide as the canvas", () => {
    expect(vpColumnLayout(90, 90, 0, 1).fits).toBe(false);
    expect(vpColumnLayout(60, 90, 0, 1).fits).toBe(false);
  });

  it("refuses non-finite geometry rather than emitting NaN pixels", () => {
    expect(vpColumnLayout(Number.NaN, 90, 0, 1).fits).toBe(false);
    expect(vpColumnLayout(1200, Number.NaN, 0, 1).fits).toBe(false);
  });
});

describe("vpRowRect — adjacent rows are pixel-flush", () => {
  it("snaps BOTH endpoints, so a row's top is the row above it's bottom", () => {
    // The defect this replaces: round(yTop) + round(yBot - yTop) drifted +/-1px
    // and left hairline gaps between contiguous bars — the "spaced-out sticks".
    // Three contiguous buckets at fractional coordinates.
    const lower = vpRowRect(100.6, 110.4, 500)!;
    const middle = vpRowRect(90.8, 100.6, 500)!;
    const upper = vpRowRect(81.1, 90.8, 500)!;
    expect(middle.y + middle.height).toBe(lower.y);
    expect(upper.y + upper.height).toBe(middle.y);
  });

  it("leaves no gap and no overlap across a long fractional run", () => {
    const step = 7.3;
    for (let i = 0; i < 40; i++) {
      const below = vpRowRect(500 - i * step, 500 - (i - 1) * step, 5000)!;
      const above = vpRowRect(500 - (i + 1) * step, 500 - i * step, 5000)!;
      expect(above.y + above.height, `run index ${i}`).toBe(below.y);
    }
  });

  it("floors a sub-pixel row so a level that genuinely traded is not invisible", () => {
    expect(vpRowRect(100.0, 100.4, 500)!.height).toBe(VP_MIN_ROW_PX);
  });

  it("caps a row so one bucket cannot fill the pane at extreme zoom", () => {
    expect(vpRowRect(0, 900, 120)!.height).toBe(120);
  });

  it("keeps a separation gap once the row can spare a pixel", () => {
    const tall = vpRowRect(0, 20, 500)!;
    expect(tall.height).toBe(20);
    expect(tall.drawHeight).toBe(19);
  });

  it("spends no pixel on the gap when the row has none to spare", () => {
    const thin = vpRowRect(0, 2, 500)!;
    expect(thin.height).toBe(2);
    expect(thin.drawHeight).toBe(2);
  });

  it("never returns a zero-height row", () => {
    for (const [t, b] of [[50, 50], [50, 49], [50, 50.2]] as const) {
      expect(vpRowRect(t, b, 500)!.drawHeight).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns null for a coordinate the price scale could not produce", () => {
    // Off-screen is not zero. A row with no position must not be drawn at the
    // top of the pane as though it were priced there.
    expect(vpRowRect(null, 100, 500)).toBeNull();
    expect(vpRowRect(100, null, 500)).toBeNull();
    expect(vpRowRect(Number.NaN, 100, 500)).toBeNull();
    expect(vpRowRect(100, Number.POSITIVE_INFINITY, 500)).toBeNull();
  });
});

describe("vpBarWidth — length is the volume, not a shaping curve", () => {
  it("gives the POC the full column and nothing else", () => {
    expect(vpBarWidth(1000, 1000, 100)).toBe(100);
    expect(vpBarWidth(500, 1000, 100)).toBe(50);
  });

  it("is LINEAR in volume — half the volume is half the bar", () => {
    // A power curve made low levels fake-wide and saturated high levels into
    // one chunky solid block: a picture of the curve, not of the volume.
    const full = vpBarWidth(1000, 1000, 200);
    for (const frac of [0.1, 0.25, 0.5, 0.75]) {
      expect(vpBarWidth(1000 * frac, 1000, 200)).toBe(Math.round(full * frac));
    }
  });

  it("has no aesthetic baseline — a 5% level draws 5%, not a comfortable minimum", () => {
    expect(vpBarWidth(50, 1000, 200)).toBe(10);
  });

  it("floors a genuinely-traded level at 1px rather than dropping it", () => {
    expect(vpBarWidth(1, 1_000_000, 100)).toBe(1);
  });

  it("draws nothing for a level with no volume", () => {
    expect(vpBarWidth(0, 1000, 100)).toBe(0);
    expect(vpBarWidth(-5, 1000, 100)).toBe(0);
  });

  it("cannot exceed the column even if a level somehow beats the stated peak", () => {
    expect(vpBarWidth(5000, 1000, 100)).toBe(100);
  });

  it("draws nothing rather than NaN pixels on degenerate inputs", () => {
    expect(vpBarWidth(100, 0, 100)).toBe(0);
    expect(vpBarWidth(100, 1000, 0)).toBe(0);
    expect(vpBarWidth(Number.NaN, 1000, 100)).toBe(0);
  });
});

describe("vpBarSplit — the two halves are exactly the bar", () => {
  it("conserves the bar's length at every ratio", () => {
    for (let w = 1; w <= 120; w++) {
      for (const r of [0, 0.01, 0.333, 0.5, 0.666, 0.99, 1]) {
        const { upWidth, downWidth } = vpBarSplit(w, r);
        expect(
          upWidth + downWidth,
          `w=${w} r=${r}: rounding both halves independently would draw the ` +
          "level a pixel wider or narrower than its own volume",
        ).toBe(w);
        expect(upWidth).toBeGreaterThanOrEqual(0);
        expect(downWidth).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("gives an all-buying level the whole bar, and all-selling none of it", () => {
    expect(vpBarSplit(100, 1)).toEqual({ upWidth: 100, downWidth: 0 });
    expect(vpBarSplit(100, 0)).toEqual({ upWidth: 0, downWidth: 100 });
  });

  it("clamps a ratio outside 0..1 instead of drawing outside the bar", () => {
    expect(vpBarSplit(100, 1.4)).toEqual({ upWidth: 100, downWidth: 0 });
    expect(vpBarSplit(100, -0.4)).toEqual({ upWidth: 0, downWidth: 100 });
  });

  it("splits an unknown ratio evenly rather than inventing a side", () => {
    expect(vpBarSplit(100, Number.NaN)).toEqual({ upWidth: 50, downWidth: 50 });
  });

  it("draws nothing for a bar with no length", () => {
    expect(vpBarSplit(0, 0.5)).toEqual({ upWidth: 0, downWidth: 0 });
  });
});

describe("vpLabelFits — labels de-overlap", () => {
  it("lets the first label through", () => {
    expect(vpLabelFits(120, Number.NEGATIVE_INFINITY)).toBe(true);
  });

  it("rejects a label that would collide with the last one, above or below", () => {
    expect(vpLabelFits(120, 112)).toBe(false);
    expect(vpLabelFits(112, 120)).toBe(false);
  });

  it("accepts a label exactly at the spacing threshold", () => {
    expect(vpLabelFits(133, 120)).toBe(true);
    expect(vpLabelFits(107, 120)).toBe(true);
  });
});

describe("MainChart delegates the draw geometry instead of re-typing it", () => {
  const chart = readFileSync(
    resolve(__dirname, "../components/chart/MainChart.tsx"),
    "utf8",
  );
  const code = chart
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("POSITIVE CONTROL: the renderer source was actually read", () => {
    expect(chart.length).toBeGreaterThan(100_000);
    expect(code, "this is not MainChart").toContain("function drawWMVP");
  });

  it("imports the geometry owner", () => {
    expect(code).toContain("@/lib/vpDrawGeometry");
  });

  it("gets its column layout from the owner", () => {
    expect(code).toMatch(/vpColumnLayout\(/);
    expect(
      code,
      "the inline width/right arithmetic is what produced an off-canvas column",
    ).not.toMatch(/const vpRight = \(W - priceScaleW - 6\)/);
  });

  it("gets its row rectangle from the owner", () => {
    expect(code).toMatch(/vpRowRect\(/);
    expect(
      code,
      "rounding the height independently is the hairline-gap defect",
    ).not.toContain("Math.round(yTop)");
  });

  it("gets its bar length and split from the owner", () => {
    expect(code).toMatch(/vpBarWidth\(/);
    expect(code).toMatch(/vpBarSplit\(/);
    expect(
      code,
      "a power curve or baseline here is a picture of the shaping function",
    ).not.toMatch(/Math\.pow\(\s*tot\s*\/\s*maxBucket/);
  });
});
