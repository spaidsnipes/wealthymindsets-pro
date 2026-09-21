/**
 * SENTINEL: the objection terracotta has exactly one owner.
 *
 * ── The defect this file exists to prevent ──────────────────────────────────
 *
 * Until 2026-09-21 the colour #e07b5c was rendered by FOURTEEN files and owned
 * by none. It is the product's colour for a REFUSAL — BLOCKED, HARD RULE,
 * CONTRADICTION, OBJECTION, DEBT, NO TRADE — and `wmTokens.ts` did not mention
 * it. The token file's stated purpose is that "a future design refresh touches
 * ONE file"; for this colour that claim was simply false, and a palette pass
 * would have moved `WM.state.warn` while leaving every actual refusal behind.
 *
 * The fix was a new token, `WM.state.objection`, plus this scan. The scan is
 * the part that lasts. Fourteen literals did not appear because anyone decided
 * to duplicate a colour — they appeared one at a time, each author reasonably
 * copying the hex from the surface next door, because nothing told them a
 * token existed. Deleting the literals without leaving a guard just restarts
 * that clock. A CONVENTION cannot stop the fifteenth; a failing test can.
 *
 * ── Why this Sentinel is keyed on the literal, when the LAST one must not be ──
 *
 * The Sentinel in `marketCanvasVerdictTone.test.ts` had to be re-keyed away
 * from this very hex, because there it was an INCIDENTAL detail: the thing
 * being guarded was the verdict→colour table, and #e07b5c appeared in eleven
 * innocent files that were not verdict tables at all.
 *
 * Here the relationship is inverted. The literal IS the defect — any
 * appearance of this hex outside the token file is, by definition, a surface
 * that re-typed a colour it should have imported. There is no innocent use.
 * That is what makes a bare literal scan the right instrument this time, and
 * it is worth saying out loud so the two Sentinels do not read as inconsistent.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { WM, objectionTint } from "./wmTokens";

const SRC = join(process.cwd(), "src");
const OWNER = join(SRC, "lib", "design", "wmTokens.ts");

/** Every .ts/.tsx under src/, excluding tests — a test may legitimately quote a value. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      sourceFiles(p, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

/** The opaque hex, and the rgba channels it decomposes to. Either is a re-type. */
const OBJECTION_HEX = /#e07b5c/i;
const OBJECTION_RGBA = /rgba?\(\s*224\s*,\s*123\s*,\s*92\s*[,)]/;

function offendersFor(re: RegExp): string[] {
  return sourceFiles(SRC)
    .filter((p) => p !== OWNER)
    .filter((p) => re.test(stripComments(readFileSync(p, "utf8"))))
    .map((p) => p.slice(SRC.length + 1));
}

describe("the objection terracotta has exactly one owner", () => {
  it("SENTINEL: no source file outside wmTokens.ts writes the objection hex", () => {
    expect(
      offendersFor(OBJECTION_HEX),
      "these files hard-code #e07b5c instead of reading `WM.state.objection`. " +
        "Fourteen files once did this and the token file silently lied about " +
        "owning the colour. Import the token. If you are painting a FAILURE " +
        "(stale feed, failed save) rather than a REFUSAL, you want " +
        "`WM.state.warn` — read the state docblock in wmTokens.ts first.",
    ).toEqual([]);
  });

  it("SENTINEL: nor its rgba decomposition, which is the same re-type in disguise", () => {
    // Spelling the tint as `rgba(224,123,92,0.45)` evades a hex scan while
    // committing the identical offence — and it is how MOST of the fourteen
    // surfaces actually drifted, since chips need a fill and a frame. Use
    // `objectionTint(alpha)`, which derives the channels FROM the token.
    expect(
      offendersFor(OBJECTION_RGBA),
      "these files hard-code the objection colour in rgba form. Call " +
        "`objectionTint(alpha)` so a palette refresh moves the fill WITH the " +
        "foreground instead of leaving a terracotta frame around a new colour.",
    ).toEqual([]);
  });

  it("THE SENTINEL IS NOT VACUOUS: it reads real files and can see a violation", () => {
    // A scan that silently walked zero files would report a permanently clean
    // repository forever. Prove the walk, the patterns, and the stripper.
    const files = sourceFiles(SRC);
    expect(files.length).toBeGreaterThan(200);
    expect(files).toContain(OWNER);

    // The patterns must match the shapes they claim to hunt — including the
    // capitalised spelling, which a scan written with a bare string would miss.
    expect(OBJECTION_HEX.test('const WARN = "#e07b5c";')).toBe(true);
    expect(OBJECTION_HEX.test('BLOCKED: { fg: "#E07B5C" }')).toBe(true);
    expect(OBJECTION_RGBA.test('border: "rgba(224,123,92,0.45)"')).toBe(true);
    expect(OBJECTION_RGBA.test("rgb(224, 123, 92)")).toBe(true);

    // …and must NOT match the OTHER red. `WM.state.warn` is a legitimate,
    // widely-rendered colour; a Sentinel that fired on it would be noise from
    // birth, and the fastest way to get a guard ignored is to cry wolf once.
    expect(OBJECTION_HEX.test('tone: "#c05a4a"')).toBe(false);
    expect(OBJECTION_RGBA.test('halo: "rgba(192,90,74,0.15)"')).toBe(false);

    // The stripper must remove prose while preserving code. Without this
    // control, an over-greedy stripper would blank every file and the two
    // scans above would pass by seeing nothing at all. This is not theoretical
    // here: `RealizedRFigure.tsx` quotes the hex in a docblock describing a
    // repaired defect, and that sentence must stay quotable without failing CI.
    const sample = stripComments('/* was "#e07b5c" once */\nconst x = "#e07b5c";');
    expect(sample).not.toContain("was");
    expect(sample).toContain('const x = "#e07b5c";');
  });

  it("the token and its tint still hold the shipped value (independent record)", () => {
    // Written as a literal ON PURPOSE. Deriving this from the module under test
    // would make it agree with any future edit, including a wrong one. THIS is
    // the line to change, deliberately, if the objection colour ever moves.
    expect(WM.state.objection).toBe("#e07b5c");
    expect(objectionTint(0.45)).toBe("rgba(224,123,92,0.45)");
  });
});
