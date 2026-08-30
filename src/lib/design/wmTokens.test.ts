/**
 * wmTokens — truth-lock for the WM Design System tokens.
 *
 * Founder Aug-14 canon:
 *   "Gold must communicate importance, confirmation, state, or hierarchy.
 *    Do not make everything gold. Do not make everything glow."
 *
 * Locks the shape + specific values that consumers depend on. A future
 * design refresh should update the palette in ONE place, but the shape +
 * role vocabulary (5 tone names, 3 border intensities, semantic gold
 * palette) is contract that every panel across the app depends on.
 */

import { describe, it, expect } from "vitest";
import { WM, wmPanelStyle, wmToneColor } from "./wmTokens";

describe("WM tokens — surface hierarchy (deepest → highest)", () => {
  it("has all 5 depth layers named", () => {
    expect(Object.keys(WM.surface).sort()).toEqual(["deep", "deepest", "highest", "mid", "raised"]);
  });
  it("every surface is a 7-char hex (#RRGGBB)", () => {
    for (const [name, hex] of Object.entries(WM.surface)) {
      expect(hex, name).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("WM tokens — gold palette (importance / hierarchy)", () => {
  it("has the 5 canonical gold roles", () => {
    expect(Object.keys(WM.gold).sort()).toEqual(["hair", "halo", "hero", "line", "mark"]);
  });
  it("hero gold is #d4af37 (the canonical WM gold — do not drift)", () => {
    expect(WM.gold.hero).toBe("#d4af37");
  });
  it("halo is brightest (lightest) — for focus / active pulse only", () => {
    expect(WM.gold.halo).toBe("#ffd76a");
  });
});

describe("WM tokens — state vocabulary (5 semantic states + non-colour cue required)", () => {
  it("has the 5 canonical state names", () => {
    expect(Object.keys(WM.state).sort()).toEqual(["neutral", "ok", "unknown", "warn", "watch"]);
  });
  it("every state is a 7-char hex", () => {
    for (const [name, hex] of Object.entries(WM.state)) {
      expect(hex, name).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("WM tokens — border intensities (three, always low-opacity gold)", () => {
  it("has 3 border tiers", () => {
    expect(Object.keys(WM.border).sort()).toEqual(["hair", "line", "strong"]);
  });
  it("hair < line < strong opacity (visual hierarchy invariant)", () => {
    const opacityOf = (rgba: string): number => Number(rgba.match(/,\s*([\d.]+)\)/)?.[1] ?? 0);
    const hair = opacityOf(WM.border.hair);
    const line = opacityOf(WM.border.line);
    const strong = opacityOf(WM.border.strong);
    expect(hair).toBeLessThan(line);
    expect(line).toBeLessThan(strong);
  });
});

describe("WM tokens — spacing scale (architectural)", () => {
  it("scale is monotonically increasing xs → hero", () => {
    const order = [WM.space.xs, WM.space.sm, WM.space.md, WM.space.lg, WM.space.xl, WM.space.xxl, WM.space.hero];
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
  });
});

describe("WM tokens — typography (numeral font uses tabular-nums for alignment)", () => {
  it("numeral + hero styles both set fontVariantNumeric to tabular-nums", () => {
    expect(WM.type.numeral.fontVariantNumeric).toBe("tabular-nums");
    expect(WM.type.hero.fontVariantNumeric).toBe("tabular-nums");
  });
  it("label / labelSmall are uppercase (micro-caps)", () => {
    expect(WM.type.label.textTransform).toBe("uppercase");
    expect(WM.type.labelSmall.textTransform).toBe("uppercase");
  });
});

describe("wmPanelStyle", () => {
  it("inactive panel uses standard line border + no shadow", () => {
    const s = wmPanelStyle(false);
    expect(s.border).toContain(WM.border.line);
    expect(s.borderRadius).toBe(WM.radius.xl);
    expect(s.background).toBe(WM.surface.deep);
    expect(s.padding).toBe(WM.space.lg);
    expect(s.boxShadow).toBe("none");
  });

  it("active panel escalates to strong border + gold halo shadow", () => {
    const s = wmPanelStyle(true);
    expect(s.border).toContain(WM.border.strong);
    expect(s.boxShadow).toContain(WM.gold.hero);
  });

  it("defaults to inactive (safer visual — no accidental glow)", () => {
    // Called without argument — active defaults to false per Founder canon "do not make everything glow".
    expect(wmPanelStyle().boxShadow).toBe("none");
  });
});

describe("wmToneColor", () => {
  it("maps each of the 5 tones to the WM.state palette", () => {
    expect(wmToneColor("ok")).toBe(WM.state.ok);
    expect(wmToneColor("watch")).toBe(WM.state.watch);
    expect(wmToneColor("warn")).toBe(WM.state.warn);
    expect(wmToneColor("unknown")).toBe(WM.state.unknown);
    expect(wmToneColor("neutral")).toBe(WM.state.neutral);
  });
});
