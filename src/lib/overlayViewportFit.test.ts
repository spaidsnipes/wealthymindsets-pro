import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p, out);
    } else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Overlay viewport-fit Sentinel — Founding Execution Contract §8
 * LIVE PRODUCT / MULTI-DEVICE ACCEPTANCE CONTRACT.
 *
 * Representative widths the contract names:
 *   iPhone  ~375 / 390 / 393 / 430
 *   iPad    ~768 / 820 / 1024
 *
 * A fixed-pixel overlay wider than the narrowest phone cannot fit, and an
 * overlay centred by `calc(50% - HALFpx)` goes NEGATIVE once the viewport is
 * narrower than its own width:
 *
 *   ChartSettingsModal  width 520, left calc(50% - 260px)
 *     → at 390px:  left = -65px, right edge = 455px
 *       cut off on BOTH sides at once; its controls were unreachable.
 *   ChartToolbar indicators  width 420, left = trigger.left
 *     → at 390px: ~130px off the right edge.
 *
 * Canon Sentinel attack list names "responsive breakage" and "hidden
 * unreachable controls" explicitly.
 */
const NARROWEST_PHONE = 375;

describe("overlay viewport fit", () => {
  const files = walk(path.join(process.cwd(), "src"));

  it("the settings modal clamps to the viewport and never goes off-canvas", () => {
    const src = strip(fs.readFileSync(
      path.join(process.cwd(), "src/components/chart/ChartSettingsModal.tsx"), "utf8"));
    expect(src).toContain('width: "min(520px, calc(100vw - 24px))"');
    expect(src).toContain('left: "max(12px, calc(50% - 260px))"');
    expect(src).not.toMatch(/width:\s*520,/);
  });

  it("the indicators popover clamps width and pulls back from the right edge", () => {
    const src = strip(fs.readFileSync(
      path.join(process.cwd(), "src/components/chart/ChartToolbar.tsx"), "utf8"));
    expect(src).toContain('width:"min(420px, calc(100vw - 16px))"');
    expect(src).toContain("calc(100vw - 428px)");
    expect(src).not.toMatch(/zIndex:9999,\s*width:420,/);
  });

  it("no fixed overlay is wider than the narrowest phone WITHOUT a viewport clamp", () => {
    // A numeric width is fine when paired with a viewport-relative maxWidth
    // (DrawingToolsPanel does this with maxWidth: "94vw"). What is never fine
    // is a hardcoded width with no clamp at all.
    const offenders: string[] = [];
    for (const f of files) {
      const src = strip(fs.readFileSync(f, "utf8"));
      if (!/position:\s*["']fixed["']/.test(src)) continue;
      const clamped = /maxWidth:\s*["'][^"']*(vw|calc\()/.test(src);
      if (clamped) continue;
      for (const m of src.matchAll(/\bwidth:\s*(\d{3,4})\b/g)) {
        const w = Number(m[1]);
        if (w > NARROWEST_PHONE) {
          offenders.push(`${path.relative(process.cwd(), f)} → unclamped width: ${w}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("trigger-anchored dropdowns clamp their left edge to the viewport", () => {
    // DrawingToolsPanel positioned two portal dropdowns at the trigger's raw
    // `left`. Width was clamped to 94vw but POSITION was not, so a panel
    // anchored mid-toolbar still ran off the right edge on phone widths.
    const src = strip(fs.readFileSync(
      path.join(process.cwd(), "src/components/chart/DrawingToolsPanel.tsx"), "utf8"));
    expect(src).toContain("const clampLeft");
    expect(src).toContain("window.innerWidth - panelWidth - 8");
    expect(src).not.toMatch(/setMenuPos\(\{\s*left:\s*r\.left\s*,/);
    expect(src).not.toMatch(/setStylePos\(\{\s*left:\s*r\.left\s*,/);
  });

  it("the clamp keeps a panel on-screen at every contract width", () => {
    // Pure arithmetic mirror of clampLeft, exercised at the widths §8 names.
    const clampLeft = (left: number, panelWidth: number, viewport: number) =>
      Math.max(8, Math.min(left, viewport - panelWidth - 8));
    for (const viewport of [375, 390, 393, 430, 768, 820, 1024, 1280, 1440, 1728]) {
      const panelWidth = Math.min(620, viewport * 0.94);
      for (const triggerLeft of [0, 40, 200, viewport - 20, viewport + 100]) {
        const left = clampLeft(triggerLeft, panelWidth, viewport);
        expect(left).toBeGreaterThanOrEqual(8);
        // Never extends past the right gutter, unless the panel simply cannot
        // fit (it always can here, since panelWidth <= 0.94 * viewport).
        expect(left + panelWidth).toBeLessThanOrEqual(viewport);
      }
    }
  });

  it("centring math cannot produce a negative left at phone widths", () => {
    // `calc(50% - Npx)` is only safe when guarded by max(gutter, …).
    const offenders: string[] = [];
    for (const f of files) {
      const src = strip(fs.readFileSync(f, "utf8"));
      for (const m of src.matchAll(/left:\s*["'`]calc\(50% - (\d+)px\)["'`]/g)) {
        offenders.push(`${path.relative(process.cwd(), f)} → unguarded calc(50% - ${m[1]}px)`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
