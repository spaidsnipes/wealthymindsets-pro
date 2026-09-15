/**
 * deltaVPGeometry — the gate the canvas could never have.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 *
 * This build has now confirmed six times that `tsc --noEmit` stays EXIT=0
 * through behavioural breaks: renames are type-visible, wrong answers are not.
 * Every law below is a WRONG-ANSWER law. Each one can be broken while every
 * other gate in the repo stays green:
 *
 *   - Drop the 2px floor in `dvpRowBox` and a squeezed row draws 0px tall. The
 *     trader sees no volume at a price where volume exists. Numbers in, numbers
 *     out; `tsc` is content.
 *   - Replace the 0.7 exponent with 1.0 and every row except the POC collapses
 *     toward nothing on a thin profile. "Less volume here" reads as "no volume
 *     here" — a filled absence, which this build forbids by name.
 *   - Drop the zero-volume guard in `dvpAskWidth` and the width is NaN.
 *     `fillRect` with a NaN width draws nothing at all, silently.
 *
 * The band was gated by geometry measurement and the DOM components by static
 * markup. A canvas has neither, so the only gate available is to make the
 * arithmetic a function and stand over the function. That is what this is.
 *
 * ── Scope, stated honestly ───────────────────────────────────────────────────
 *
 * This proves the ARITHMETIC. It does not prove the pixels. Whether the box
 * renders correctly on a live chart remains an open item with no automated
 * channel — it is HUMAN_PROOF_REQUIRED, not green.
 */

import { describe, it, expect } from "vitest";
import {
  DVP_GUTTER,
  DVP_MIN_BOX_W,
  DVP_MIN_BOX_H,
  DVP_MIN_LABEL_ROW_H,
  DVP_MIN_CAPTION_W,
  dvpBinCount,
  dvpBoxAdmitsProfile,
  dvpProfileRefusal,
  dvpRefusalMessage,
  dvpColumns,
  dvpRowBox,
  dvpRowCulled,
  dvpBarWidth,
  dvpAskWidth,
  dvpFormatCount,
} from "./deltaVPGeometry";

describe("dvpBinCount — bins come from the box, and are clamped at both ends", () => {
  it("is roughly one row per 22px in the ordinary middle", () => {
    expect(dvpBinCount(220)).toBe(10);
    expect(dvpBinCount(440)).toBe(20);
  });

  it("never falls below 6 — a two-row profile is a staircase, not a shape", () => {
    expect(dvpBinCount(0)).toBe(6);
    expect(dvpBinCount(27)).toBe(6);
    expect(dvpBinCount(-500)).toBe(6);
  });

  it("never exceeds 40 — a full-screen box must not melt the draw loop", () => {
    expect(dvpBinCount(4000)).toBe(40);
    expect(dvpBinCount(Number.MAX_SAFE_INTEGER)).toBe(40);
  });

  it("always returns a whole number of bins", () => {
    for (const h of [100, 133, 267, 501, 888]) {
      expect(Number.isInteger(dvpBinCount(h))).toBe(true);
    }
  });
});

describe("dvpBoxAdmitsProfile — a box too small for two labelled columns is refused", () => {
  it("admits a box comfortably past both minimums with rows to draw", () => {
    expect(dvpBoxAdmitsProfile(200, 180, 12)).toBe(true);
  });

  it("refuses a box with no rows, however large — nothing is not a profile", () => {
    expect(dvpBoxAdmitsProfile(900, 700, 0)).toBe(false);
  });

  it("refuses at and below each minimum, and admits one pixel past it", () => {
    expect(dvpBoxAdmitsProfile(DVP_MIN_BOX_W, 180, 5)).toBe(false);
    expect(dvpBoxAdmitsProfile(DVP_MIN_BOX_W + 1, 180, 5)).toBe(true);
    expect(dvpBoxAdmitsProfile(200, DVP_MIN_BOX_H, 5)).toBe(false);
    expect(dvpBoxAdmitsProfile(200, DVP_MIN_BOX_H + 1, 5)).toBe(true);
  });

  it("refusal is the branch that shows the hint — so it must be reachable", () => {
    // The draw loop's else-branch writes the refusal sentence. If this predicate
    // could never be false the trader would get an empty box with no
    // explanation, which is an undisclosed absence.
    expect(dvpBoxAdmitsProfile(20, 20, 3)).toBe(false);
  });

  it("never disagrees with the reason given to the trader", () => {
    // The predicate is DERIVED from dvpProfileRefusal for exactly this reason.
    // If they ever drift apart, the box would refuse while the message says
    // nothing is wrong, or draw while the message names an obstacle.
    for (const w of [0, 20, DVP_MIN_BOX_W, DVP_MIN_BOX_W + 1, 548]) {
      for (const h of [0, 10, DVP_MIN_BOX_H, DVP_MIN_BOX_H + 1, 142]) {
        for (const rows of [0, 1, 12]) {
          expect(dvpBoxAdmitsProfile(w, h, rows)).toBe(
            dvpProfileRefusal(w, h, rows) === "none",
          );
        }
      }
    }
  });
});

describe("dvpProfileRefusal — the trader is told the obstacle that is actually there", () => {
  /**
   * THE DEFECT THIS BLOCK EXISTS TO KEEP DEAD.
   *
   * Observed live on wealthymindsetspro.com on 2026-09-15, TSLA 15m: a delta-vp
   * box measuring roughly 548x142 CSS px displayed "Delta+VP — draw a wider box
   * over bars". It was an order of magnitude past BOTH minimums. It was not
   * narrow. There were simply no per-level rows for those bars, and no amount of
   * dragging would ever produce one.
   */
  it("names a size obstacle only when the size is the obstacle", () => {
    expect(dvpProfileRefusal(548, 142, 0)).toBe("no-levels");
    expect(dvpProfileRefusal(40, 142, 12)).toBe("too-narrow");
    expect(dvpProfileRefusal(548, 12, 12)).toBe("too-short");
    expect(dvpProfileRefusal(548, 142, 12)).toBe("none");
  });

  it("puts no-levels AHEAD of both size reasons when a box is both", () => {
    // A size complaint implies "resize and you will get your profile". That is a
    // promise this build cannot keep when there is nothing to bin, so the
    // unfixable cause is named first even though the box is also too small.
    expect(dvpProfileRefusal(10, 10, 0)).toBe("no-levels");
    expect(dvpProfileRefusal(0, 0, 0)).toBe("no-levels");
    expect(dvpProfileRefusal(-100, -100, -3)).toBe("no-levels");
  });

  it("refuses AT each minimum and admits one pixel past it", () => {
    expect(dvpProfileRefusal(DVP_MIN_BOX_W, 142, 12)).toBe("too-narrow");
    expect(dvpProfileRefusal(DVP_MIN_BOX_W + 1, 142, 12)).toBe("none");
    expect(dvpProfileRefusal(548, DVP_MIN_BOX_H, 12)).toBe("too-short");
    expect(dvpProfileRefusal(548, DVP_MIN_BOX_H + 1, 12)).toBe("none");
  });

  it("checks width before height, so the first thing to fix is named once", () => {
    expect(dvpProfileRefusal(10, 10, 12)).toBe("too-narrow");
  });
});

describe("dvpRefusalMessage — one sentence per obstacle, and no false promises", () => {
  it("gives every refusal its own sentence", () => {
    const seen = new Set(
      (["no-levels", "too-narrow", "too-short"] as const).map(dvpRefusalMessage),
    );
    expect(seen.size).toBe(3);
    for (const m of seen) expect(m.length).toBeGreaterThan(0);
  });

  it("says nothing when nothing is wrong", () => {
    expect(dvpRefusalMessage("none")).toBe("");
  });

  it("does NOT ask the trader to resize when resizing cannot help", () => {
    // This is the whole atom. The old single string said "draw a wider box over
    // bars" for all three causes, sending the trader on an errand that could
    // never succeed. The no-levels sentence must not name a box action.
    const m = dvpRefusalMessage("no-levels");
    expect(m).toMatch(/no per-level/i);
    expect(m).not.toMatch(/wider|narrow|short|bigger|larger|resize|box/i);
  });

  it("names the CAPTURE condition, which is the one thing the trader can act on", () => {
    // Traced in MainChart's getBarSubProfile: historical OHLCV carries no
    // aggressor-side executions, and the build refuses to synthesize them. The
    // tape accumulator is reset on every symbol/source/timeframe change. So the
    // profile exists for exactly one population — bars watched live on this
    // chart. "No data" alone would leave the trader unable to tell a limitation
    // from a fault; naming the condition tells them when it WILL work.
    expect(dvpRefusalMessage("no-levels")).toMatch(/captured live only/i);
  });

  it("DOES ask for a resize on the two causes a resize can fix", () => {
    expect(dvpRefusalMessage("too-narrow")).toMatch(/narrow/i);
    expect(dvpRefusalMessage("too-short")).toMatch(/short/i);
  });

  it("every sentence still identifies the tool it came from", () => {
    for (const r of ["no-levels", "too-narrow", "too-short"] as const) {
      expect(dvpRefusalMessage(r)).toContain("Delta+VP");
    }
  });
});

describe("dvpColumns — the two columns share the box and never overlap the gutter", () => {
  it("splits a box down the middle with a gutter on each side", () => {
    const c = dvpColumns(100, 200);
    expect(c.midX).toBe(200);
    expect(c.leftW).toBe(100 - DVP_GUTTER);
    expect(c.rightW).toBe(100 - DVP_GUTTER);
  });

  it("keeps both columns inside the box for odd widths — no bar escapes the border", () => {
    for (const w of [57, 101, 199, 333]) {
      const c = dvpColumns(40, w);
      expect(c.midX - DVP_GUTTER - c.leftW).toBe(40);
      expect(c.midX + DVP_GUTTER + c.rightW).toBe(40 + w);
    }
  });

  it("is independent of where the box sits on screen", () => {
    const a = dvpColumns(0, 240);
    const b = dvpColumns(915, 240);
    expect(a.leftW).toBe(b.leftW);
    expect(a.rightW).toBe(b.rightW);
    expect(b.midX - 915).toBe(a.midX);
  });
});

describe("dvpRowBox — a row is never drawn as nothing", () => {
  it("takes the edges in either order, because price grows up and y grows down", () => {
    expect(dvpRowBox(100, 130)).toEqual(dvpRowBox(130, 100));
  });

  it("leaves a 1px hairline between neighbouring rows", () => {
    const r = dvpRowBox(100, 130);
    expect(r.top).toBe(100);
    expect(r.height).toBe(29);
  });

  it("floors a squeezed row at 2px — a 0px row silently drops displayed volume", () => {
    // THE LAW. Remove the floor and `Math.abs(0) - 1` is -1: fillRect draws
    // nothing, and the trader reads absence where the truth is a tight row.
    expect(dvpRowBox(400, 400).height).toBe(2);
    expect(dvpRowBox(400, 401).height).toBe(2);
    expect(dvpRowBox(400, 402).height).toBe(2);
    expect(dvpRowBox(400, 403.5).height).toBeGreaterThanOrEqual(2);
  });

  it("never returns a negative or zero height for any edge pair", () => {
    for (const [a, b] of [[0, 0], [10, 10.5], [88, 87.2], [-5, -5]] as const) {
      expect(dvpRowBox(a, b).height).toBeGreaterThanOrEqual(2);
    }
  });

  it("centres midY inside the row it belongs to", () => {
    const r = dvpRowBox(100, 130);
    expect(r.midY).toBe(r.top + r.height / 2);
    expect(r.midY).toBeGreaterThan(r.top);
    expect(r.midY).toBeLessThan(r.top + r.height);
  });
});

describe("dvpRowCulled — only rows genuinely off the box are dropped", () => {
  const BOX_Y = 100;
  const BOX_H = 200;

  it("keeps a row sitting squarely inside the box", () => {
    expect(dvpRowCulled(dvpRowBox(150, 170), BOX_Y, BOX_H)).toBe(false);
  });

  it("keeps a row straddling either edge — a clipped row is still a true row", () => {
    expect(dvpRowCulled(dvpRowBox(90, 110), BOX_Y, BOX_H)).toBe(false);
    expect(dvpRowCulled(dvpRowBox(290, 310), BOX_Y, BOX_H)).toBe(false);
  });

  it("culls a row entirely above and entirely below the box", () => {
    expect(dvpRowCulled(dvpRowBox(10, 40), BOX_Y, BOX_H)).toBe(true);
    expect(dvpRowCulled(dvpRowBox(500, 540), BOX_Y, BOX_H)).toBe(true);
  });

  it("does not cull on the 1px tolerance band — rounding must not delete a row", () => {
    // A row whose bottom lands exactly on the box top is touching, not gone.
    expect(dvpRowCulled(dvpRowBox(80, BOX_Y), BOX_Y, BOX_H)).toBe(false);
  });
});

describe("dvpBarWidth — near-zero and absent must never look the same", () => {
  it("gives the full column, less its 2px inset, to a full fraction", () => {
    expect(dvpBarWidth(1, 100, 3)).toBe(98);
  });

  it("compresses the scale so a small fraction is still visible", () => {
    // THE LAW. With a linear scale a 10% row on a 100px column is 10px and
    // reads as nothing beside the POC. The 0.7 exponent lifts it to 20px:
    // "less volume here" instead of "no volume here".
    const compressed = dvpBarWidth(0.1, 100, 3);
    expect(compressed).toBeGreaterThan(Math.round(0.1 * 98));
    expect(compressed).toBe(Math.round(Math.pow(0.1, 0.7) * 98));
  });

  it("stays monotonic — more volume is never a shorter bar", () => {
    let prev = -1;
    for (let f = 0; f <= 1.0001; f += 0.05) {
      const w = dvpBarWidth(f, 200, 3);
      expect(w).toBeGreaterThanOrEqual(prev);
      prev = w;
    }
  });

  it("honours the floor so a non-zero row is never drawn as nothing", () => {
    expect(dvpBarWidth(0, 100, 3)).toBe(3);
    expect(dvpBarWidth(0.0001, 100, 3)).toBe(3);
    expect(dvpBarWidth(0.5, 4, 2)).toBeGreaterThanOrEqual(2);
  });

  it("never returns a width below the floor even in a degenerate column", () => {
    // A negative column width comes from a box narrower than its own gutters.
    // The guard is refused there too: the caller must not be handed a negative
    // fillRect, which paints leftward across the chart.
    expect(dvpBarWidth(1, -40, 2)).toBe(2);
  });

  it("returns whole pixels — a fractional fillRect blurs the bar edge", () => {
    for (const f of [0.13, 0.37, 0.62, 0.99]) {
      expect(Number.isInteger(dvpBarWidth(f, 137, 3))).toBe(true);
    }
  });
});

describe("dvpAskWidth — the ask/bid split, and the divide-by-zero that would erase it", () => {
  it("splits in proportion to the buy share", () => {
    expect(dvpAskWidth(100, 75, 100)).toBe(75);
    expect(dvpAskWidth(100, 0, 100)).toBe(0);
    expect(dvpAskWidth(100, 100, 100)).toBe(100);
  });

  it("splits a zero-volume row evenly rather than dividing by zero", () => {
    // THE LAW. `0/0` is NaN, and `fillRect(x, y, NaN, h)` draws nothing —
    // silently. An even split is visibly a row with no imbalance, which is the
    // truth of a row with no trades.
    const w = dvpAskWidth(60, 0, 0);
    expect(Number.isNaN(w)).toBe(false);
    expect(w).toBe(30);
  });

  it("leaves a bid remainder that exactly completes the bar", () => {
    // The draw loop paints ask then bid as `vBarW - askW`. If askW ever
    // exceeded vBarW the bid rect would have negative width and paint leftward.
    for (const [buy, vol] of [[1, 3], [2, 3], [7, 9], [0, 5], [5, 5]] as const) {
      const ask = dvpAskWidth(41, buy, vol);
      expect(ask).toBeGreaterThanOrEqual(0);
      expect(ask).toBeLessThanOrEqual(41);
    }
  });

  it("returns whole pixels", () => {
    expect(Number.isInteger(dvpAskWidth(41, 17, 23))).toBe(true);
  });
});

describe("dvpFormatCount — compact, but never a different number", () => {
  it("prints counts below a thousand exactly", () => {
    expect(dvpFormatCount(0)).toBe("0");
    expect(dvpFormatCount(7)).toBe("7");
    expect(dvpFormatCount(999)).toBe("999");
  });

  it("keeps one decimal in the thousands, where the digit still fits", () => {
    expect(dvpFormatCount(1000)).toBe("1.0k");
    expect(dvpFormatCount(1250)).toBe("1.3k");
    expect(dvpFormatCount(9999)).toBe("10.0k");
  });

  it("drops the decimal past ten thousand, where it would overflow the gutter", () => {
    expect(dvpFormatCount(10000)).toBe("10k");
    expect(dvpFormatCount(384210)).toBe("384k");
  });

  it("returns magnitude only — the draw loop supplies the sign itself", () => {
    // The caller writes `${up ? "+" : "−"}${fmtN(row.delta)}`. If this function
    // also emitted a sign the label would read "+-1.3k".
    expect(dvpFormatCount(-1250)).toBe("1.3k");
    expect(dvpFormatCount(-7)).toBe("7");
    expect(dvpFormatCount(-1250).startsWith("-")).toBe(false);
  });

  it("rounds rather than truncating, so a count is never understated", () => {
    expect(dvpFormatCount(6.6)).toBe("7");
  });
});

describe("the constants are the shipped constants", () => {
  it("holds the values lifted verbatim out of the draw loop", () => {
    // Moving code must not improve it. These numbers are what the Founder has
    // been looking at; changing one changes the shipped picture, and that is a
    // decision, not a refactor.
    expect(DVP_GUTTER).toBe(3);
    expect(DVP_MIN_BOX_W).toBe(56);
    expect(DVP_MIN_BOX_H).toBe(26);
    expect(DVP_MIN_LABEL_ROW_H).toBe(9);
    expect(DVP_MIN_CAPTION_W).toBe(26);
  });
});
