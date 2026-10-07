import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Chrome 121+ ignores the global ::-webkit-scrollbar skin on any element that
 * sets the standard `scrollbar-width`, and then paints the OS default (a white
 * track on dark graphite — the Academy module list, Sheriff 2026-10-07). Any
 * scroll area in these rooms that sets a width must also set its colour.
 */
const FILES = ["src/app/education/page.tsx", "src/app/login/page.tsx"];

describe("scrollbars keep the room's skin", () => {
  for (const f of FILES) {
    it(f, () => {
      const src = readFileSync(f, "utf8");
      const widths = src.match(/scrollbarWidth\s*:/g)?.length ?? 0;
      const colours = src.match(/scrollbarColor\s*:/g)?.length ?? 0;
      expect(widths).toBeGreaterThan(0);
      expect(colours, `${f}: every scrollbarWidth needs a scrollbarColor`).toBeGreaterThanOrEqual(widths);
    });
  }
});
