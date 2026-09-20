import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { NARROW_VIEWPORT_MAX_PX } from "./narrowViewport";
import {
  B701_LARGE_MIN_PX,
  B701_MEDIUM_MIN_PX,
  B701_ONE_ZOOM_QUERY,
  bandForWidth,
  zoomsForBand,
  type CanvasBand,
} from "./resizeBreakpoints";

const css = () =>
  readFileSync(resolve(__dirname, "../../app/globals.css"), "utf8");

describe("B-701 · the three bands the blueprint draws", () => {
  // The sheet's own numbers. If one of these is ever edited, the edit is a
  // change to the BLUEPRINT and must be argued against the sheet, not here.
  it("carries the sheet's thresholds and no others", () => {
    expect(B701_MEDIUM_MIN_PX).toBe(768);
    expect(B701_LARGE_MIN_PX).toBe(1200);
  });

  // Off-by-one is the entire failure mode of a breakpoint. Both sides of both
  // thresholds are asserted so a `<=` cannot quietly become a `<`.
  it.each<[number, CanvasBand]>([
    [0, "SMALL"],
    [320, "SMALL"],
    [390, "SMALL"],
    [767, "SMALL"],
    [768, "MEDIUM"],
    [834, "MEDIUM"],
    [1023, "MEDIUM"],
    [1024, "MEDIUM"],
    [1199, "MEDIUM"],
    [1200, "LARGE"],
    [1440, "LARGE"],
    [1920, "LARGE"],
  ])("a %ipx floor is %s", (width, band) => {
    expect(bandForWidth(width)).toBe(band);
  });

  // A width we could not read must show LEAST, not most — the safe direction
  // for a gate whose false positives are invisible crowding.
  it("falls to SMALL on a width it cannot read", () => {
    expect(bandForWidth(Number.NaN)).toBe("SMALL");
    expect(bandForWidth(-1)).toBe("SMALL");
    // Infinity is NOT finite, so it lands in SMALL too. That reads oddly for
    // an "infinitely wide" floor, and it is deliberate: an infinite width is
    // not a measurement, it is the absence of one, and the absence of a
    // measurement must show the fewest zooms. Asserted so the behaviour is
    // chosen rather than inherited from `Number.isFinite`.
    expect(bandForWidth(Number.POSITIVE_INFINITY)).toBe("SMALL");
  });

  it("names the sheet's own zoom count per band", () => {
    expect(zoomsForBand("SMALL")).toBe(0); // base plan only
    expect(zoomsForBand("MEDIUM")).toBe(1); // one enlarged zoom
    expect(zoomsForBand("LARGE")).toBe(2); // both enlarged zooms
  });

  it("never permits more zooms as the floor narrows", () => {
    let previous = zoomsForBand(bandForWidth(320));
    for (let w = 320; w <= 1920; w += 1) {
      const zooms = zoomsForBand(bandForWidth(w));
      expect(zooms).toBeGreaterThanOrEqual(previous);
      previous = zooms;
    }
    expect(previous).toBe(2);
  });
});

describe("B-701 · one number, one owner", () => {
  // The failure `narrowViewport.ts` writes out at length: when CSS and TS each
  // hold a copy of a breakpoint, BOTH directions of disagreement are silent.
  it("hands globals.css the same MEDIUM band it computes", () => {
    expect(B701_ONE_ZOOM_QUERY).toBe(
      "(min-width: 1024px) and (max-width: 1199px)",
    );
    expect(css()).toContain(`@media ${B701_ONE_ZOOM_QUERY}`);
  });

  it("collapses exactly the second zoom in that band, and nothing else", () => {
    const block = css().match(
      /@media \(min-width: 1024px\) and \(max-width: 1199px\) \{[\s\S]*?\n\}/,
    );
    expect(block, "the B-701 MEDIUM block must exist in globals.css").not.toBeNull();

    // The WATCHLIST is zoom 2. It is the one that gives way first, because the
    // DECISION rail (zoom 1) is about the SELECTED object — the thing the
    // trader is looking at — and the watchlist is about the alternates.
    expect(block![0]).toContain(".wm-chart-watchlist");

    // The camera must not be touched by a band rule. C-101's 70% floor is the
    // reason the zooms collapse at all; collapsing the camera would invert it.
    expect(block![0]).not.toContain("wm-market-room");
    expect(block![0]).not.toContain("wm-chart-dashboard");
  });

  it("keeps the 1023 rail law and the 1200 zoom law distinct", () => {
    // These are two different questions and merging them would strip the
    // primary sidebar and DOM ladder off a 1100px laptop that has room for
    // them. See the header of resizeBreakpoints.ts.
    expect(NARROW_VIEWPORT_MAX_PX).toBe(1023);
    expect(B701_LARGE_MIN_PX).not.toBe(NARROW_VIEWPORT_MAX_PX + 1);

    // The MEDIUM CSS band begins exactly one pixel above the rail cliff, so
    // there is no width that both rules claim and no width that neither does.
    expect(B701_ONE_ZOOM_QUERY).toContain(
      `min-width: ${NARROW_VIEWPORT_MAX_PX + 1}px`,
    );
  });
});

describe("B-701 · the band is measurable on the live glass", () => {
  it("is published as a receipt by the room it governs", () => {
    const dashboard = readFileSync(
      resolve(__dirname, "../../components/chart/ChartsDashboard.tsx"),
      "utf8",
    );
    // A band nobody can read from the outside cannot be proven on the running
    // app. This receipt is how a live measurement names which band it saw.
    expect(dashboard).toContain("useCanvasBand");
    expect(dashboard).toContain("data-b701-band");
  });
});
