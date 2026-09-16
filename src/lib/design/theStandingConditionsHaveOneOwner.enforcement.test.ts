/**
 * SENTINEL — the two standing conditions have ONE owner and ONE rendering.
 *
 * THE DEFECT: QuestionDrivenShell's docblock draws the mockup silhouette with
 * a STATE block in the sticky left rail. The build had none. EVIDENCE DEBT and
 * RIGHT OF WAY existed only in `<footer data-testid="question-driven-footer">`
 * at the bottom of a very long scrolling deck. A standing condition you have
 * to go looking for is not standing — it is buried, which is the same defect
 * class as 522dd24 (a band that was "above the fold" of a drawer nested inside
 * another drawer).
 *
 * THE OVER-CORRECTION the fix had to avoid: simply adding the rail block would
 * put the same two readings on screen twice — TWO OWNERS OF ONE FACT ON ONE
 * SCREEN, the exact shape that let the deck's section index drift from its
 * banners (3b94017). And simply DELETING the footer would silently drop both
 * conditions below 900px, where `.wm-qd-rail { display: none }` already hides
 * the rail entirely.
 *
 * So: computed ONCE into `standingConditions`, rendered by ONE component in
 * two layouts, and the two sites are MUTUALLY EXCLUSIVE by media query.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..", "..");
const SHELL = "src/components/command/QuestionDrivenShell.tsx";
const src = readFileSync(resolve(ROOT, SHELL), "utf8");

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
const codeOnly = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const code = codeOnly(src);

describe("the standing conditions have one owner", () => {
  it("self-test: codeOnly strips prose but keeps rendered code", () => {
    expect(codeOnly("/* wm-qd-footer */ const a = 1;")).not.toContain("wm-qd-footer");
    expect(codeOnly('const c = "wm-qd-footer";')).toContain("wm-qd-footer");
  });

  it("THE DEFECT: the rail carries the standing conditions, not only the footer", () => {
    expect(
      code,
      "The mockup's rail carries STATE under the room list. Leaving the two " +
        "conditions only in a footer at the bottom of a long scroll is burying " +
        "them — the same defect as a band nested inside two closed drawers.",
    ).toContain('data-testid="question-driven-rail-state"');
    // Inside the <nav>, not merely somewhere in the file.
    const navStart = code.indexOf('className="wm-qd-rail"');
    const navEnd = code.indexOf("</nav>", navStart);
    expect(navStart).toBeGreaterThan(-1);
    expect(navEnd).toBeGreaterThan(navStart);
    expect(code.slice(navStart, navEnd)).toContain("question-driven-rail-state");
  });

  it("ONE OWNER: both conditions are compiled once and mapped, never retyped", () => {
    expect(code).toContain("const standingConditions: readonly StandingCondition[]");
    // Each label is typed exactly once — in the compiled array.
    for (const label of ["Evidence Debt", "Right of Way"]) {
      const hits = code.split(`"${label}"`).length - 1;
      expect(hits, `"${label}" must be typed once, in standingConditions`).toBe(1);
    }
    // ...and read twice, by map, once per layout.
    const maps = code.match(/standingConditions\.map\(/g) ?? [];
    expect(maps.length).toBe(2);
    expect(code).toContain('layout="stack"');
    expect(code).toContain('layout="bar"');
  });

  it("OVER-CORRECTION: the footer is NOT deleted — below 900px it is the only carrier", () => {
    expect(
      code,
      "`.wm-qd-rail { display: none }` below 900px means deleting the footer " +
        "would erase both standing conditions on every phone.",
    ).toContain('data-testid="question-driven-footer"');
    expect(code).toContain('className="wm-qd-footer"');
  });

  it("ONE SCREEN, ONE RENDERING: rail and footer can never both be visible", () => {
    const style = src.slice(src.indexOf("<style>"));
    expect(style).toMatch(/@media \(max-width: 900px\)[\s\S]*?\.wm-qd-rail \{ display: none/);
    expect(style).toMatch(/@media \(min-width: 901px\)[\s\S]*?\.wm-qd-footer \{ display: none/);
    // The breakpoints must be complementary — a gap or an overlap would mean a
    // viewport width with two copies of the same fact, or none at all.
    const maxes = [...style.matchAll(/max-width: (\d+)px/g)].map((m) => Number(m[1]));
    const mins = [...style.matchAll(/min-width: (\d+)px/g)].map((m) => Number(m[1]));
    expect(maxes.length).toBe(1);
    expect(mins.length).toBe(1);
    expect(mins[0]).toBe(maxes[0] + 1);
  });

  it("OVER-CORRECTION: no severity band is painted into the rail", () => {
    // The mockup shows "EVIDENCE DEBT · HIGH". `HIGH` has no producer in this
    // repo; the shell renders the count computeEvidenceDebt genuinely owns.
    expect(code).not.toMatch(/"HIGH"/);
    expect(code).not.toMatch(/"CLEAR"/);
  });

  it("OVER-CORRECTION: an uncompiled ledger still reads UNKNOWN, never PAID", () => {
    expect(code).toContain('const debtUnknown = openEvidenceItems === null');
    expect(code).toMatch(/debtUnknown\s*\n?\s*\?\s*"UNKNOWN"/);
  });
});
