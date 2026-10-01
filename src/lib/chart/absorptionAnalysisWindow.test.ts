import { describe, expect, it } from "vitest";
import { absorptionAnalysisWindow } from "./absorptionAnalysisWindow";

describe("UI-06 absorption analysis scope", () => {
  it("limits the full field and owner measurement to the newest30 visible bars", () => {
    expect(absorptionAnalysisWindow(200, { from: 45, to: 199 })).toEqual({ from: 170, to: 200, windowCapped: true });
  });
  it("scrolling into history cannot borrow the unseen live edge", () => {
    expect(absorptionAnalysisWindow(200, { from: 10, to: 79 })).toEqual({ from: 50, to: 80, windowCapped: true });
  });
  it("does not fill a short or empty visible window with invented offscreen bars", () => {
    expect(absorptionAnalysisWindow(200, { from: 51, to: 59 })).toEqual({ from: 51, to: 60, windowCapped: false });
    expect(absorptionAnalysisWindow(200, { from: 210, to: 240 })).toEqual({ from: 200, to: 200, windowCapped: false });
    expect(absorptionAnalysisWindow(0, null)).toEqual({ from: 0, to: 0, windowCapped: false });
  });
});
