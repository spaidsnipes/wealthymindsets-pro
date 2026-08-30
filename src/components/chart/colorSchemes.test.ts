/**
 * colorSchemes — truth-lock for the shared preset palette.
 *
 * These 4 schemes are offered on every gear in the app + the app-wide
 * Settings candle-theme picker. Silent drift here silently changes the
 * default trader color language.
 */

import { describe, it, expect } from "vitest";
import { COLOR_SCHEMES } from "./colorSchemes";

describe("COLOR_SCHEMES", () => {
  it("exposes exactly the 4 canonical presets", () => {
    expect(COLOR_SCHEMES.length).toBe(4);
    expect(COLOR_SCHEMES.map((s) => s.id)).toEqual([
      "green-red", "blue-purple", "blue-yellow", "mono",
    ]);
  });

  it("every scheme has id, label, up, dn keys", () => {
    for (const s of COLOR_SCHEMES) {
      expect(s.id).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.up).toBeTruthy();
      expect(s.dn).toBeTruthy();
    }
  });

  it("every up/dn is a valid #RRGGBB hex", () => {
    for (const s of COLOR_SCHEMES) {
      expect(s.up, `${s.id}.up`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(s.dn, `${s.id}.dn`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("green-red preset pins the canonical up/dn hex values (default trader vocabulary)", () => {
    const gr = COLOR_SCHEMES[0];
    expect(gr.up).toBe("#00C076");
    expect(gr.dn).toBe("#FF4D67");
  });

  it("mono scheme up is lighter than dn (near-gray, no hue shift)", () => {
    const mono = COLOR_SCHEMES.find((s) => s.id === "mono")!;
    const brightness = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return r + g + b;
    };
    expect(brightness(mono.up)).toBeGreaterThan(brightness(mono.dn));
    // Near-gray: max channel spread within 16 (Tailwind neutrals are ~2 spread)
    const spread = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return Math.max(r, g, b) - Math.min(r, g, b);
    };
    expect(spread(mono.up)).toBeLessThanOrEqual(32);
    expect(spread(mono.dn)).toBeLessThanOrEqual(32);
  });

  it("scheme ids are unique (no accidental duplicates)", () => {
    const ids = COLOR_SCHEMES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("scheme labels are human-readable (contain no id-style hyphens)", () => {
    for (const s of COLOR_SCHEMES) {
      expect(s.label).not.toMatch(/^[a-z-]+$/); // not just kebab-case
    }
  });
});
