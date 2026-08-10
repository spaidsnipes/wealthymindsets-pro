import { describe, expect, it } from "vitest";
import {
  overlayFrameBudgetMs,
  PROFILE_OVERLAY_FRAME_MS,
  shouldDrawOverlay,
  STANDARD_OVERLAY_FRAME_MS,
} from "./chartOverlayGovernor";

describe("chart overlay governor", () => {
  it("uses a stricter budget for volume-profile paint", () => {
    expect(overlayFrameBudgetMs(false)).toBe(STANDARD_OVERLAY_FRAME_MS);
    expect(overlayFrameBudgetMs(true)).toBe(PROFILE_OVERLAY_FRAME_MS);
    expect(PROFILE_OVERLAY_FRAME_MS).toBeGreaterThan(STANDARD_OVERLAY_FRAME_MS);
  });

  it("never paints in a hidden tab", () => {
    expect(shouldDrawOverlay({ hidden: true, now: 1_000, lastDrawAt: 0, frameBudgetMs: 33 })).toBe(false);
  });

  it("coalesces frames until the budget has elapsed", () => {
    expect(shouldDrawOverlay({ hidden: false, now: 32, lastDrawAt: 0, frameBudgetMs: 33 })).toBe(false);
    expect(shouldDrawOverlay({ hidden: false, now: 33, lastDrawAt: 0, frameBudgetMs: 33 })).toBe(true);
  });
});
