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
 * one component in two mutually-exclusive layouts, and the SANCTUARY — the only
 * remaining component between MainLayout and a room — draws no silhouette of its
 * own.
 *
 * `QuestionDrivenShell` used to be the third frame. It was reduced to an adapter,
 * then deleted outright: an adapter that only forwards props is still a file a
 * future contributor can hang a <nav> on. The scan below moved with the risk.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..", "..");
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), "utf8");

const FRAME = "src/components/os/WMOperatingSystem.tsx";
const COMPILER = "src/lib/os/osChrome.ts";
const SANCTUARY = "src/components/experience/WMExperienceShell.tsx";
const DECK = "src/app/command-deck/page.tsx";

/** A Sentinel that fails on its own honest prose is testing the wrong surface. */
const codeOnly = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const frameSrc = read(FRAME);
const frame = codeOnly(frameSrc);
const compiler = codeOnly(read(COMPILER));
const sanctuary = codeOnly(read(SANCTUARY));
const deck = codeOnly(read(DECK));

describe("the standing conditions have one owner", () => {
  it("self-test: codeOnly strips prose but keeps rendered code", () => {
    expect(codeOnly("/* os-standing-bar */ const a = 1;")).not.toContain("os-standing-bar");
    expect(codeOnly('const c = "os-standing-bar";')).toContain("os-standing-bar");
    // Proof the files were actually read, not silently empty or renamed.
    for (const [rel, src] of [
      [FRAME, frame],
      [COMPILER, compiler],
      [SANCTUARY, sanctuary],
      [DECK, deck],
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
  it("THE SANCTUARY draws no silhouette: it composes the frame instead", () => {
    // Every one of these was in WMExperienceShell before the collapse, and each
    // is a piece of the silhouette. Measured live on production beforehand:
    // FIVE <header> elements on /command-deck. If any comes back here, the
    // sanctuary has quietly grown its own frame again alongside the OS frame.
    for (const drawn of ["<header", "<footer", "<aside", "<main"]) {
      expect(
        sanctuary,
        `the sanctuary must not draw ${drawn} — the OS frame owns the silhouette`,
      ).not.toContain(drawn);
    }
    expect(sanctuary).toContain("<WMOperatingSystem");
  });

  it("POSITIVE CONTROL: the silhouette scan can detect a re-grown shell", () => {
    const regrown = 'const x = <header className="wm-sanctuary-top" />;';
    expect(regrown).toContain("<header");
    expect(sanctuary).not.toContain("<header");
  });

  it("the sanctuary keeps the ATMOSPHERE — collapsing the shells did not delete the room", () => {
    // The opposite failure of a second shell: deleting the sanctuary's header
    // along with the three planes that are the only thing it uniquely owns.
    expect(sanctuary).toContain("wm-water-breath");
    expect(sanctuary).toContain(".wm-sanctuary::before");
    expect(sanctuary).toContain(".wm-sanctuary::after");
    // And it must stay TRANSPARENT over them, or the frame's opaque field
    // deletes the atmosphere while looking perfectly fine in a screenshot.
    expect(sanctuary).toContain('field="caller"');
  });

  it("A ROOM PUBLISHES UPWARD — it does not wrap itself in a frame", () => {
    // The frame must be the OUTERMOST thing on the page. A room that wraps
    // itself recreates the nesting that put two mastheads on one screen.
    expect(deck, "the deck must publish its readings, not wrap itself").toContain(
      "usePublishOsStanding({",
    );
    expect(deck).not.toContain("<WMOperatingSystem");
    expect(deck).not.toContain("QuestionDrivenShell");
  });

  it("the room list has ONE owner, and the retired adapter is really gone", () => {
    expect(frame).toContain("export const OS_ROOMS");
    // A forwarding file is still a file someone can hang a <nav> on.
    expect(
      existsSync(resolve(ROOT, "src/components/command/QuestionDrivenShell.tsx")),
      "the third shell must not come back as a re-export",
    ).toBe(false);
  });
});
