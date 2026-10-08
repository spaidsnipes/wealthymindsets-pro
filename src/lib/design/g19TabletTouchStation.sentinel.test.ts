/**
 * G19 §22 — THE TABLET IS A TOUCH STATION, NOT A STRETCHED PHONE (2026-10-08).
 *
 * Swept on serving at 834x1112 (portrait) and 1180x820 (landscape) with a
 * coarse pointer on /charts, /desk, /journal, /scanner, /backtesting:
 *   · the touch floors were capped at 1023px, so a LANDSCAPE iPad lost them;
 *   · TRADE carried 34 controls under 44px, /desk 33–38, the text fields 20px;
 *   · four affordances appeared only on mouse hover (journal image ✕, tape
 *     symbol ✕, indicator category, the scanner map's industry ranking card,
 *     the lifetime-ledger curve readout).
 * A finger has no hover. These locks keep each of those from coming back.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "..", "..");
const CSS = readFileSync(path.join(SRC, "app", "globals.css"), "utf8");
const read = (rel: string) => readFileSync(path.join(SRC, rel), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

// The five tablet routes and the components they mount (MainChart is the
// chart lane's; its canvas has no DOM hover reveals).
const SCOPE = [
  "app/charts", "app/desk", "app/journal", "app/scanner", "app/backtesting",
  "components/journal", "components/layout", "components/desk", "components/chart",
].flatMap(d => walk(path.join(SRC, d))).filter(f => !f.endsWith("MainChart.tsx"));

describe("G19 §22 tablet touch station", () => {
  it("touch floors follow the pointer, not a 1023px width cap", () => {
    expect(CSS).not.toContain("(pointer: coarse) and (max-width: 1023px)");
  });

  it("the order ticket, the desk, the shell icons and text fields carry the 44px floor on touch", () => {
    expect(CSS).toMatch(/@media \(pointer: coarse\) \{\s*\[data-testid="trade-panel"\] \{ z-index: 74 !important; \}/);
    expect(CSS).toContain('[data-testid="trade-panel"] :is(button, select, summary, input:not([type="checkbox"]):not([type="radio"])) {\n    min-height: 44px !important;');
    expect(CSS).toContain(".wm-desk-chrome :is(button, a, select, input) {\n    min-height: 44px !important;");
    expect(CSS).toContain(".wm-shell-actions :is(button, a)::after");
    expect(CSS).toContain('button[data-testid="canvas-summary-pill"]::after');
    expect(CSS).toMatch(/input:is\(:not\(\[type\]\), \[type="text"\], \[type="search"\]/);
  });

  it("nothing in the tablet routes is revealed only by hover", () => {
    // Vacuity guard: the scope must actually hold the route and component files.
    expect(SCOPE.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    for (const f of SCOPE) {
      read(path.relative(SRC, f)).split("\n").forEach((line, i) => {
        // A purely decorative hover wash (aria-hidden, the control under it is
        // already visible and tappable) is not an affordance.
        const hoverOpacity = /opacity-0[^"`]*group-hover:opacity-100/.test(line) && !/\[@media\(hover:none\)\]:opacity-100/.test(line) && !line.includes('aria-hidden="true"');
        const hoverDisplay = /\bhidden\b[^"`]*group-hover:(block|inline|flex)/.test(line) && !/\[@media\(hover:none\)\]:(block|inline|flex)/.test(line) && !line.includes("⌘K");
        if (hoverOpacity || hoverDisplay) offenders.push(`${path.relative(SRC, f)}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("the lifetime-ledger curve reads under a finger (pointer events, not mouse events)", () => {
    const src = read("components/journal/WebullLifetimeLedger.tsx");
    expect(src).toContain("onPointerDown={e => readAt(e)}");
    expect(src).not.toMatch(/onMouseMove=\{e => \{ const r = e\.currentTarget\.getBoundingClientRect\(\)/);
  });

  it("the scanner map's industry ranking opens by tap, and finger mouse-compat events do not toggle it", () => {
    const src = read("app/scanner/map/page.tsx");
    expect(src).toContain('className="wm-heat-industry-label [@media(pointer:coarse)]:min-h-[44px]"');
    expect(src).toContain("aria-expanded={hovered?.industry.name === industry.name}");
    expect(src).toContain('onPointerEnter={e => { if (e.pointerType === "mouse") handleMouseEnter(e, industry); }}');
  });
});
