/**
 * The geometry of the two 2026-09-26 findings, as arithmetic. Every rectangle
 * below was MEASURED on local /charts (TSLA 15m, real UI path) — see the
 * header of popoverPlacement.ts for the before numbers.
 */
import { describe, expect, it } from "vitest";
import {
  placeAnchoredMenu,
  placePanelBeside,
  rectsOverlap,
  POPOVER_VIEWPORT_GUTTER_PX,
  type ViewportRect,
} from "./popoverPlacement";

/** The menu's box once CSS resolves `top`/`bottom` + `maxHeight` for a natural height. */
const menuBox = (vh: number, p: ReturnType<typeof placeAnchoredMenu>, natural: number) => {
  const h = Math.min(natural, p.maxHeight);
  const top = p.side === "below" ? p.top! : vh - p.bottom! - h;
  return { top, bottom: top + h, h };
};

describe("placeAnchoredMenu — Tools › Chart tools › [Chart tools] at 1600x900", () => {
  // Trigger measured at y 844–888 at the foot of the drawer; menu 630px.
  const vh = 900;
  const anchor = { top: 844, bottom: 888 };

  it("BEFORE: dropped below the trigger, 8px of 630 were on screen", () => {
    const oldTop = anchor.bottom + 4;
    expect(oldTop).toBe(892);
    expect(vh - oldTop).toBe(8);
  });

  it("AFTER: opens upward, wholly inside the viewport, clear of the trigger", () => {
    const p = placeAnchoredMenu({ viewportHeight: vh, anchor, menuHeight: 630 });
    expect(p.side).toBe("above");
    expect(p.top).toBeUndefined();
    expect(p.bottom).toBe(60); // 900 − (844 − 4)
    const box = menuBox(vh, p, 630);
    expect(box).toEqual({ top: 210, bottom: 840, h: 630 }); // measured on the glass: t 210, b 840
    expect(box.top).toBeGreaterThanOrEqual(POPOVER_VIEWPORT_GUTTER_PX);
    expect(box.bottom).toBeLessThanOrEqual(anchor.top);
  });

  it("opens below when the whole menu fits below (the trigger near the top)", () => {
    const p = placeAnchoredMenu({ viewportHeight: vh, anchor: { top: 90, bottom: 134 }, menuHeight: 630 });
    expect(p.side).toBe("below");
    expect(p.top).toBe(138);
    expect(p.bottom).toBeUndefined();
    expect(menuBox(vh, p, 630).bottom).toBeLessThanOrEqual(vh - POPOVER_VIEWPORT_GUTTER_PX);
  });

  it("when neither side holds it, takes the roomier side and caps to it (internal scroll)", () => {
    // 1280x600, trigger 544–588: measured on the glass at t 9, h 531, overflowY auto.
    const p = placeAnchoredMenu({ viewportHeight: 600, anchor: { top: 544, bottom: 588 }, menuHeight: 630 });
    expect(p.side).toBe("above");
    expect(p.maxHeight).toBe(532); // 544 − 4 − 8
    const box = menuBox(600, p, 630);
    expect(box.top).toBe(POPOVER_VIEWPORT_GUTTER_PX);
    expect(box.h).toBeLessThan(630);
  });

  it("an unmeasured menu (first render) takes the roomier side, never off-screen", () => {
    const low = placeAnchoredMenu({ viewportHeight: vh, anchor, menuHeight: null });
    expect(low.side).toBe("above");
    const high = placeAnchoredMenu({ viewportHeight: vh, anchor: { top: 60, bottom: 104 }, menuHeight: null });
    expect(high.side).toBe("below");
  });

  it("a design cap (the symbol list's 460) bounds the menu on either side", () => {
    const p = placeAnchoredMenu({ viewportHeight: vh, anchor: { top: 90, bottom: 118 }, menuHeight: 460, cap: 460 });
    expect(p).toEqual({ side: "below", top: 122, maxHeight: 460 });
    const low = placeAnchoredMenu({ viewportHeight: vh, anchor, menuHeight: 460, cap: 460 });
    expect(low.side).toBe("above");
    expect(low.maxHeight).toBe(460);
  });

  it("never places any part of a menu outside the viewport, for any trigger row", () => {
    for (const vhh of [600, 720, 900, 1080]) {
      for (let t = 0; t <= vhh - 44; t += 13) {
        for (const natural of [120, 460, 630, 2000]) {
          const p = placeAnchoredMenu({ viewportHeight: vhh, anchor: { top: t, bottom: t + 44 }, menuHeight: natural });
          const box = menuBox(vhh, p, natural);
          expect(box.top).toBeGreaterThanOrEqual(0);
          expect(box.bottom).toBeLessThanOrEqual(vhh - POPOVER_VIEWPORT_GUTTER_PX + 0.5);
          // …and never over its own trigger.
          if (box.h > 0) expect(box.bottom <= t || box.top >= t + 44).toBe(true);
        }
      }
    }
  });
});

describe("placePanelBeside — Workspace › Draw › Drawing style at 1600x900", () => {
  const viewport = { width: 1600, height: 900 };
  const sheet: ViewportRect = { left: 1281, top: 69, right: 1600, bottom: 519 }; // the drawer's tool group
  const swatch: ViewportRect = { left: 1289, top: 467, right: 1333, bottom: 511 };
  const trendLine: ViewportRect = { left: 1289, top: 142, right: 1333, bottom: 186 };
  const panel = { width: 220, height: 206 };

  it("BEFORE: the old clamp put the popover on the sheet's own buttons", () => {
    // The swatch opened it at the WHOLE group's right edge + 6, clamped back:
    // x 1372, y sheet.top + 8 — measured x 1372–1592, y 77–283.
    const oldLeft = Math.max(8, Math.min(sheet.right + 6, viewport.width - panel.width - 8));
    expect(oldLeft).toBe(1372);
    expect(rectsOverlap({ left: oldLeft, top: sheet.top + 8, right: oldLeft + 220, bottom: sheet.top + 8 + 206 }, sheet)).toBe(true);
  });

  it("AFTER: opens LEFT of the drawer, level with the swatch, covering none of it", () => {
    const p = placePanelBeside({ viewport, anchor: swatch, avoid: sheet, panel });
    expect(p.side).toBe("left");
    expect(p).toMatchObject({ left: 1055, top: 467 }); // measured on the glass: x 1055–1275, y 467–673
    const box = { left: p.left, top: p.top, right: p.left + panel.width, bottom: p.top + panel.height };
    expect(rectsOverlap(box, sheet)).toBe(false);
    expect(box.right).toBeLessThanOrEqual(viewport.width - POPOVER_VIEWPORT_GUTTER_PX);
    expect(box.bottom).toBeLessThanOrEqual(viewport.height - POPOVER_VIEWPORT_GUTTER_PX);
  });

  it("lines up with the tool that summoned it (Trend Line row)", () => {
    const p = placePanelBeside({ viewport, anchor: trendLine, avoid: sheet, panel });
    expect(p).toMatchObject({ side: "left", left: 1055, top: 142 });
  });

  it("beside the 40px desktop rail it opens to the RIGHT, as it always did", () => {
    const rail: ViewportRect = { left: 0, top: 80, right: 40, bottom: 860 };
    const tool: ViewportRect = { left: 5, top: 120, right: 35, bottom: 150 };
    const p = placePanelBeside({ viewport, anchor: tool, avoid: rail, panel });
    expect(p).toMatchObject({ side: "right", left: 46, top: 120 });
  });

  it("slides up so a low anchor never pushes the panel past the bottom edge", () => {
    const rail: ViewportRect = { left: 0, top: 80, right: 40, bottom: 860 };
    const low: ViewportRect = { left: 5, top: 820, right: 35, bottom: 850 };
    const p = placePanelBeside({ viewport, anchor: low, avoid: rail, panel });
    expect(p.top).toBe(900 - 8 - 206);
  });

  it("with no room on any side it overlaps last, still inside the viewport, height capped", () => {
    const tiny = { width: 240, height: 300 };
    const avoid: ViewportRect = { left: 0, top: 0, right: 240, bottom: 300 };
    const p = placePanelBeside({ viewport: tiny, anchor: { left: 10, top: 10, right: 40, bottom: 40 }, avoid, panel });
    expect(p.side).toBe("overlap");
    expect(p.left).toBeGreaterThanOrEqual(8);
    expect(p.left + panel.width).toBeLessThanOrEqual(tiny.width - 8 + 0.5);
    expect(p.top + Math.min(panel.height, p.maxHeight)).toBeLessThanOrEqual(tiny.height - 8);
  });

  it("never covers the avoid group when any side has room, and never leaves the viewport", () => {
    for (const vw of [375, 390, 768, 1024, 1280, 1600, 1920]) {
      for (const vh of [667, 844, 900]) {
        const drawerW = Math.min(320, vw);
        const avoid: ViewportRect = { left: vw - drawerW, top: 69, right: vw, bottom: 519 };
        for (let y = 77; y < 519; y += 65) {
          const anchor: ViewportRect = { left: avoid.left + 8, top: y, right: avoid.left + 52, bottom: y + 44 };
          const p = placePanelBeside({ viewport: { width: vw, height: vh }, anchor, avoid, panel });
          const h = Math.min(panel.height, p.maxHeight);
          const box = { left: p.left, top: p.top, right: p.left + panel.width, bottom: p.top + h };
          expect(box.left).toBeGreaterThanOrEqual(8);
          expect(box.right).toBeLessThanOrEqual(vw - 8 + 0.5);
          expect(box.top).toBeGreaterThanOrEqual(0);
          expect(box.bottom).toBeLessThanOrEqual(vh - 8 + 0.5);
          if (p.side !== "overlap") expect(rectsOverlap(box, avoid)).toBe(false);
        }
      }
    }
  });
});
