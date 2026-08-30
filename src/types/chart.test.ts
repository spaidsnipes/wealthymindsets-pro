/**
 * chart types — truth-lock for DEFAULT_DRAWING_STYLE + isStyleCapableTool.
 *
 * These are shared across MainChart, DrawingToolsPanel and sidebars.
 * Silent drift on the default color / width silently changes every new
 * drawing; a wrong isStyleCapableTool result would allow the style
 * gear to open on tools that don't have a style (crash surface).
 */

import { describe, it, expect } from "vitest";
import { DEFAULT_DRAWING_STYLE, isStyleCapableTool, type DrawingTool } from "./chart";

describe("DEFAULT_DRAWING_STYLE", () => {
  it("pins canonical color + width + dash + opacity", () => {
    expect(DEFAULT_DRAWING_STYLE).toEqual({
      color: "#00D4AA",
      width: 2,
      dash: "solid",
      opacity: 100,
    });
  });

  it("color is a valid #RRGGBB hex", () => {
    expect(DEFAULT_DRAWING_STYLE.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("width is in the 1-4 range documented at type site", () => {
    expect(DEFAULT_DRAWING_STYLE.width).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_DRAWING_STYLE.width).toBeLessThanOrEqual(4);
  });

  it("opacity is 0-100 range (percent, not 0-1)", () => {
    expect(DEFAULT_DRAWING_STYLE.opacity).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_DRAWING_STYLE.opacity).toBeLessThanOrEqual(100);
  });
});

describe("isStyleCapableTool", () => {
  it("returns FALSE for the 4 non-styleable tools", () => {
    expect(isStyleCapableTool("cursor")).toBe(false);
    expect(isStyleCapableTool("select")).toBe(false);
    expect(isStyleCapableTool("eraser")).toBe(false);
    expect(isStyleCapableTool("crosshair")).toBe(false);
  });

  it("returns TRUE for drawing tools that carry style", () => {
    const styleable: DrawingTool[] = [
      "trendline", "hline", "fibonacci", "pitchfork", "brush",
      "arrow", "text", "rect", "measure", "long-position",
      "delta-vp", "gann-box",
    ];
    for (const t of styleable) {
      expect(isStyleCapableTool(t), t).toBe(true);
    }
  });
});
