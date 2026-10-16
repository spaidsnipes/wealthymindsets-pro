import { describe, expect, it } from "vitest";
import { DELTA_VIEWS, DELTA_VIEW_LABEL, deltaBarPx, deltaBubbleR, deltaScale, parseDeltaView } from "./deltaView";

describe("Delta — one tool, five views (plate 25)", () => {
  it("names the five views the plate names, and defaults to Bars", () => {
    expect(DELTA_VIEWS.map(v => DELTA_VIEW_LABEL[v])).toEqual(["Bars", "Ribbon", "Bubbles", "Number on candle", "Heat strip"]);
    expect(parseDeltaView("heat")).toBe("heat");
    expect(parseDeltaView("nonsense")).toBe("bars");
    expect(parseDeltaView(null)).toBe("bars");
  });
  it("one scale for the band: the largest |delta| on camera", () => {
    expect(deltaScale([120, -691, 40])).toBe(691);
    expect(deltaScale([])).toBe(1);
  });
  it("bars are signed and capped to the half band; bubbles grow by area", () => {
    expect(deltaBarPx(691, 691, 28)).toBe(28);
    expect(deltaBarPx(-345.5, 691, 28)).toBe(-14);
    expect(deltaBarPx(5000, 691, 28)).toBe(28);
    expect(deltaBubbleR(691, 691, 12)).toBe(12);
    expect(deltaBubbleR(172.75, 691, 12)).toBe(6);
    expect(deltaBubbleR(1, 691, 12)).toBe(2);
  });
});

describe("one outlier does not flatten the band (2026-10-16)", () => {
  it("8+ bars: p90 × 1.5, never above the max; the outlier is beyond scale", async () => {
    const { deltaScale: ds, deltaBeyondScale } = await import("./deltaView");
    const vals = [10, -12, 8, 15, -9, 11, -14, 13, 7, -178];
    const s = ds(vals);
    expect(s).toBeLessThan(178);
    expect(s).toBeGreaterThanOrEqual(15);
    expect(deltaBeyondScale(-178, s)).toBe(true);
    expect(deltaBeyondScale(12, s)).toBe(false);
    expect(ds([120, -691, 40])).toBe(691);
  });
});
