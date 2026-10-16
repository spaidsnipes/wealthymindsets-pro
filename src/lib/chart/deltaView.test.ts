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
