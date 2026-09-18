import { describe, it, expect } from "vitest";

import {
  GRAIN_OPACITY,
  GRAIN_TILE,
  VIGNETTE_PEAK_ALPHA,
  compositeGrain,
  compositeVignette,
  grainedPair,
  overlayChannel,
} from "./sanctuaryComposite";
import { WM, wmContrast } from "./wmTokens";

/**
 * The blend arithmetic, checked against the properties the room depends on.
 *
 * These are not tests that the code does what the code does. Each one pins a
 * claim some other file is already relying on — the tile's neutrality, the
 * direction the vignette moves a ratio — where getting it wrong would produce a
 * legibility guard that passes while the screen is unreadable.
 */

describe("overlay blend", () => {
  it("leaves the backdrop untouched at mid-grey, on BOTH branches", () => {
    // This is the identity `grainTile.enforcement.test.ts` pins the tile's mean
    // to 128 for. If it ever stopped holding, every route in the product would
    // shift luminance at once and no single component would look guilty.
    for (const cb of [0, 0.1, 0.25, 0.5, 0.5001, 0.75, 0.9, 1]) {
      expect(overlayChannel(cb, 0.5)).toBeCloseTo(cb, 12);
    }
  });

  it("is continuous across the branch it switches on", () => {
    // The two halves of the definition meet at cb = 0.5. A discontinuity here
    // would put a visible seam through any gradient the grain sits on.
    for (const cs of [0, 0.25, 0.5, 0.75, 1]) {
      expect(overlayChannel(0.5, cs)).toBeCloseTo(overlayChannel(0.5000001, cs), 5);
    }
  });

  it("darkens below mid-grey and lightens above it", () => {
    const cb = 0.3;
    expect(overlayChannel(cb, 0.2)).toBeLessThan(cb);
    expect(overlayChannel(cb, 0.8)).toBeGreaterThan(cb);
  });

  it("stays inside the channel", () => {
    for (let b = 0; b <= 1; b += 0.05) {
      for (let s = 0; s <= 1; s += 0.05) {
        const out = overlayChannel(b, s);
        expect(out).toBeGreaterThanOrEqual(-1e-12);
        expect(out).toBeLessThanOrEqual(1 + 1e-12);
      }
    }
  });
});

describe("compositeGrain", () => {
  it("returns the colour unchanged at the tile's mean", () => {
    for (const hex of Object.values(WM.text)) {
      expect(compositeGrain(hex, GRAIN_OPACITY.desktop, GRAIN_TILE.mean)).toBe(hex);
    }
  });

  it("returns the colour unchanged at zero opacity, whatever the grain", () => {
    expect(compositeGrain("#ede6d3", 0, GRAIN_TILE.min)).toBe("#ede6d3");
    expect(compositeGrain("#ede6d3", 0, GRAIN_TILE.max)).toBe("#ede6d3");
  });

  it("moves a pixel only slightly at the shipped opacity — this layer is a whisper", () => {
    // The Canon's window is 0.04-0.07 precisely because the layer is meant to
    // be felt and not read. If this ever grew teeth, it would be visible here
    // long before anyone argued about a screenshot.
    const lit = compositeGrain(WM.surface.mid, GRAIN_OPACITY.desktop, GRAIN_TILE.max);
    const dark = compositeGrain(WM.surface.mid, GRAIN_OPACITY.desktop, GRAIN_TILE.min);
    for (const [i] of [0, 1, 2].entries()) {
      const spread = Math.abs(
        parseInt(lit.slice(1 + i * 2, 3 + i * 2), 16) -
          parseInt(dark.slice(1 + i * 2, 3 + i * 2), 16),
      );
      expect(spread).toBeLessThanOrEqual(3);
    }
  });

  it("is gentler on a phone than on a desk", () => {
    const deskDark = compositeGrain(WM.text.body, GRAIN_OPACITY.desktop, GRAIN_TILE.min);
    const phoneDark = compositeGrain(WM.text.body, GRAIN_OPACITY.phone, GRAIN_TILE.min);
    // Closer to the original means less excursion.
    expect(wmContrast(phoneDark, WM.text.body)).toBeLessThan(
      wmContrast(deskDark, WM.text.body),
    );
  });
});

describe("compositeVignette", () => {
  it("darkens toward black and reaches it at full alpha", () => {
    expect(compositeVignette("#ffffff", 0)).toBe("#ffffff");
    expect(compositeVignette("#ffffff", 1)).toBe("#000000");
  });

  it("defaults to the deepest corner, not a flattering middle", () => {
    expect(compositeVignette("#c0b8a0")).toBe(compositeVignette("#c0b8a0", VIGNETTE_PEAK_ALPHA));
  });

  it("RUINS a ratio when it is applied to the text as well as the ground", () => {
    // The load-bearing fact behind the shell's z-order, kept as arithmetic
    // rather than as a comment somebody can delete. Scaling both sides toward
    // black does not preserve the ratio, because the +0.05 in the WCAG formula
    // does not scale with them.
    const clean = wmContrast(WM.text.body, WM.surface.mid);
    const bothDarkened = wmContrast(
      compositeVignette(WM.text.body),
      compositeVignette(WM.surface.mid),
    );
    expect(clean).toBeGreaterThan(9);
    expect(bothDarkened).toBeLessThan(4.5);
  });

  it("HELPS a ratio when it is applied only to the ground", () => {
    // Which is the arrangement the shell actually ships: content plane above,
    // atmosphere below. The vignette deepens the field behind light text.
    const clean = wmContrast(WM.text.muted, "#07080a");
    const groundOnly = wmContrast(WM.text.muted, compositeVignette("#07080a"));
    expect(groundOnly).toBeGreaterThan(clean);
  });
});

describe("grainedPair", () => {
  it("gives the glyph the dark excursion and the ground the bright one", () => {
    const { text, surface } = grainedPair(WM.text.hero, WM.surface.deep, GRAIN_OPACITY.desktop);
    expect(wmContrast(text, surface)).toBeLessThan(wmContrast(WM.text.hero, WM.surface.deep));
  });

  it("never reports a pair as SAFER than the clean tokens", () => {
    // A worst case that came out better than the ideal would mean the excursions
    // were assigned the wrong way round, and the guard would be measuring the
    // grain's best behaviour.
    for (const t of Object.values(WM.text)) {
      for (const s of Object.values(WM.surface)) {
        const { text, surface } = grainedPair(t, s, GRAIN_OPACITY.desktop);
        expect(wmContrast(text, surface)).toBeLessThanOrEqual(wmContrast(t, s) + 1e-9);
      }
    }
  });
});
