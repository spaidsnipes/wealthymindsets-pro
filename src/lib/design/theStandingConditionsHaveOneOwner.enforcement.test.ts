/**
 * SENTINEL — the two standing conditions have ONE owner and ONE rendering,
 * and the OS has ONE frame.
 *
 * THE ORIGINAL DEFECT: EVIDENCE DEBT and RIGHT OF WAY existed only in a footer
 * at the bottom of a very long scrolling deck. A standing condition you have to
 * go looking for is not standing — it is buried, the same defect class as
 * 522dd24 (a band "above the fold" of a drawer nested inside another drawer).
 *
 * THE OVER-CORRECTION the fix had to avoid: simply ADDING a rail block would
 * put the same two readings on screen twice — TWO OWNERS OF ONE FACT ON ONE
 * SCREEN, the shape that let the deck's section index drift from its banners
 * (3b94017). And simply DELETING the footer would silently drop both conditions
 * below the rail breakpoint, where the rail does not render at all.
 *
 * THE LARGER DEFECT, named by the Founder: "make sure we dont have seperate
 * shells its one os". The same reasoning that forbids two renderings of one
 * condition forbids three frames around one product. So this Sentinel now
 * guards BOTH: the conditions are compiled once by `osChrome` and rendered by
 * one component in two mutually-exclusive layouts, and `QuestionDrivenShell` is
 * an adapter that draws nothing — not a second shell.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..", "..");
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), "utf8");

const FRAME = "src/components/os/WMOperatingSystem.tsx";
const COMPILER = "src/lib/os/osChrome.ts";
const ADAPTER = "src/components/command/QuestionDrivenShell.tsx";

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
const codeOnly = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const frameSrc = read(FRAME);
const frame = codeOnly(frameSrc);
const compiler = codeOnly(read(COMPILER));
const adapter = codeOnly(read(ADAPTER));

describe("the standing conditions have one owner", () => {
  it("self-test: codeOnly strips prose but keeps rendered code", () => {
    expect(codeOnly("/* os-standing-bar */ const a = 1;")).not.toContain("os-standing-bar");
    expect(codeOnly('const c = "os-standing-bar";')).toContain("os-standing-bar");
    // Proof the files were actually read, not silently empty or renamed.
    for (const [rel, src] of [
      [FRAME, frame],
      [COMPILER, compiler],
      [ADAPTER, adapter],
    ] as const) {
      expect(src.length, `${rel} is empty or unreadable`).toBeGreaterThan(400);
    }
  });

  it("THE DEFECT: the rail carries the standing conditions, not only the bottom bar", () => {
    expect(
      frame,
      "The canon's rail carries STATE under the room list. Leaving the two " +
        "conditions only in a bar at the bottom of a long scroll is burying them.",
    ).toContain('data-testid="os-rail-state"');
    // Inside the <nav>, not merely somewhere in the file.
    const navStart = frame.indexOf('className="wm-os-rail"');
    const navEnd = frame.indexOf("</nav>", navStart);
    expect(navStart).toBeGreaterThan(-1);
    expect(navEnd).toBeGreaterThan(navStart);
    expect(frame.slice(navStart, navEnd)).toContain("os-rail-state");
  });

  it("ONE OWNER: the conditions are compiled outside the frame and mapped, never retyped", () => {
    expect(frame).toContain("compileStandingConditions({");
    // Each label is typed exactly once in the whole system — in the compiler.
    for (const label of ["Evidence Debt", "Right of Way"]) {
      expect(compiler.split(`"${label}"`).length - 1, `"${label}" belongs to osChrome`).toBe(1);
      expect(frame, `the frame must not retype "${label}"`).not.toContain(`"${label}"`);
    }
    // ...and read twice, by map, once per layout.
    expect((frame.match(/standingConditions\.map\(/g) ?? []).length).toBe(2);
    expect(frame).toContain('layout="stack"');
    expect(frame).toContain('layout="bar"');
  });

  it("OVER-CORRECTION: the bottom bar is NOT deleted — below the breakpoint it is the only carrier", () => {
    expect(
      frame,
      "The rail is display:none below the breakpoint, so deleting the bar " +
        "would erase both standing conditions on every phone.",
    ).toContain('data-testid="os-standing-bar"');
    expect(frame).toContain('className="wm-os-standing-bar"');
  });

  it("ONE SCREEN, ONE RENDERING: rail and bar can never both be visible", () => {
    const style = frameSrc.slice(frameSrc.indexOf("<style>"));
    expect(style).toMatch(/@media \(max-width: \$\{OS_RAIL_BREAKPOINT_PX\}px\)[\s\S]*?\.wm-os-rail \{ display: none/);
    expect(style).toMatch(
      /@media \(min-width: \$\{OS_RAIL_BREAKPOINT_PX \+ 1\}px\)[\s\S]*?\.wm-os-standing-bar \{ display: none/,
    );
    // Complementarity must be ARITHMETIC, not a convention. Two hand-written
    // literals (900 / 901) can drift into a gap — a viewport width with NO
    // standing conditions — or an overlap, which renders each of them twice.
    expect(style, "the breakpoint must be interpolated, never re-typed as a literal").not.toMatch(
      /(max|min)-width: \d+px/,
    );
  });

  it("OVER-CORRECTION: no severity band is painted anywhere", () => {
    // The mockups show "EVIDENCE DEBT · HIGH". `HIGH` has no producer in this
    // repo; the OS renders the count computeEvidenceDebt genuinely owns.
    for (const src of [frame, compiler]) {
      expect(src).not.toMatch(/"HIGH"/);
      expect(src).not.toMatch(/"CLEAR"/);
    }
  });

  it("OVER-CORRECTION: an uncompiled ledger still reads UNKNOWN, never PAID", () => {
    expect(compiler).toContain("const debtUnknown = openEvidenceItems === null");
    expect(compiler).toMatch(/debtUnknown\s*\n?\s*\?\s*"UNKNOWN"/);
  });
});

describe("ONE OS — there is not a second shell", () => {
  it("QuestionDrivenShell is an adapter: it draws no silhouette of its own", () => {
    // Every one of these was in this file before the collapse. If any comes
    // back, the deck has quietly grown its own frame again.
    for (const drawn of ["<nav", "<footer", "<style>", "position: \"sticky\"", "borderRight"]) {
      expect(adapter, `the adapter must not re-draw ${drawn} — the OS frame owns the silhouette`).not.toContain(
        drawn,
      );
    }
    expect(adapter).toContain("WMOperatingSystem");
  });

  it("POSITIVE CONTROL: the adapter scan can detect a re-grown shell", () => {
    const regrown = 'const x = <nav className="wm-qd-rail" />;';
    expect(regrown).toContain("<nav");
    expect(adapter).not.toContain("<nav");
  });

  it("the room list has ONE owner — the adapter re-exports rather than retypes", () => {
    expect(frame).toContain("export const OS_ROOMS");
    expect(adapter).toContain("OS_ROOMS");
    // A room href typed in the adapter would be a second definition of a route.
    expect(adapter).not.toMatch(/href:\s*"/);
  });
});
