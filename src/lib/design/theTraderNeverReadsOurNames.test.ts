import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";
import { INTERNAL_NAMES, INTERNAL_NAME_WORDS } from "./internalNames";

/**
 * EVERY JSX TEXT NODE IN THE PRODUCT, NOT THE TWO THAT ALREADY LEAKED.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────
 * Two internal names reached a Founder surface in one day. Both were caught by
 * LOOKING at prod while 8548+ tests stayed green. Both were then pinned — and
 * both pins named the offending component:
 *
 *   `roomAdoptsEquipment`            → the rail entry + the room's descriptors
 *   `theMirrorIsNotAMarketPanel`     → `ATHOSInterventionPanel`, then
 *                                      `StructureContextNote`
 *
 * That is ENUMERATION, and this codebase has already paid for enumeration
 * twice (see the `chainVm` gate rule in `theStewardIsNotAMarketPanel`): a rule
 * that lists its members cannot notice a new member, and the list here is
 * literally "the components we have already been burned by". The third leak
 * would ship exactly as the first two did.
 *
 * So this rule checks the CRITERION instead of the membership: no Founder-
 * facing JSX text anywhere under `src/` may speak one of our names.
 *
 * ── WHY THE TYPESCRIPT PARSER AND NOT A REGEX ─────────────────────────
 * The first copy sentinel written in this codebase tried to extract string
 * literals with `/"([^"\\]{8,})"/g` and quietly matched the GAPS BETWEEN
 * literals — quote pairing does not survive a regex over real source. Its own
 * probe passed, which is how it was found, and the baton recorded the verdict:
 * a rule that passes its own probe is not a rule, it is decoration.
 *
 * `typescript` is already a dependency of this repo, and it has an exact
 * answer to "is this token prose or is it code". `ts.SyntaxKind.JsxText` is
 * the thing between the tags — the literal characters a browser paints. An
 * identifier is never a `JsxText`, so `ATHOSInterventionPanel` in an import,
 * `athos.interventions` in a prop, and `chainVm.dlar` inside a `{}` expression
 * are all invisible to this scan WITHOUT a single whitelist entry. That is the
 * whole reason to reach for the parser: the previous approaches had to choose
 * between banning a legitimate read and missing the text node one token away
 * on the same line.
 *
 * ── WHAT THIS DOES NOT COVER (stated, not implied) ────────────────────
 * Copy that is COMPUTED — built in a `.ts` selector and handed to JSX as an
 * expression — is not a `JsxText` node and is not seen here. The rendering
 * rules in `theMirrorIsNotAMarketPanel` are the instrument for that, and the
 * registry read in `roomAdoptsEquipment` is the instrument for rail labels.
 * Three overlapping rules, none of which subsumes the others. This one owns
 * the largest and cheapest surface: words typed directly into a component.
 */

const SRC = path.resolve(__dirname, "../..");

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      tsxFiles(p, out);
    } else if (e.name.endsWith(".tsx")) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Attributes whose STRING value is painted for a human. Deliberately short:
 * every entry is a thing a screen reader reads aloud or a browser renders, and
 * nothing here is a class name, an id, a test id, or a route.
 */
const HUMAN_ATTRS = new Set([
  "title",
  "label",
  "alt",
  "placeholder",
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
]);

type Copy = { file: string; line: number; text: string };

function founderFacingCopy(file: string): Copy[] {
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: Copy[] = [];

  const record = (node: ts.Node, text: string) => {
    if (!text.trim()) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    found.push({ file: path.relative(SRC, file), line: line + 1, text: text.trim() });
  };

  const walk = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      record(node, node.text);
    } else if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const v = node.initializer;
      if (HUMAN_ATTRS.has(node.name.text) && v && ts.isStringLiteral(v)) record(node, v.text);
    }
    ts.forEachChild(node, walk);
  };
  walk(sf);
  return found;
}

describe("the trader never reads our names for things", () => {
  const files = tsxFiles(SRC);
  const copy = files.flatMap(founderFacingCopy);

  /**
   * THE CONTROL, AND IT IS NOT CEREMONY.
   *
   * A ban asserted over an empty array passes perfectly and proves nothing —
   * the exact failure mode the `StructureContextNote` rendering rule was
   * already caught in, where four `return null` guards could silently hand the
   * ban an empty string. If `tsxFiles` ever walks the wrong directory, if the
   * parser is handed `.ts` ScriptKind and stops producing JsxText, or if a
   * future refactor moves components out from under `src/`, THIS is what goes
   * red — not the ban below, which would go quietly green forever.
   */
  it("the extractor actually found the product's copy", () => {
    expect(
      files.length,
      "no .tsx files found under src/ — the walker is pointed at the wrong " +
        "directory and every ban in this file is vacuous",
    ).toBeGreaterThan(100);

    expect(
      copy.length,
      "the TypeScript parse produced no JsxText at all. Either the ScriptKind " +
        "is wrong or the AST shape changed; re-pin this, do not delete it.",
    ).toBeGreaterThan(1000);

    // Two sentences known to be typed directly into components, one of which
    // is the very line that produced this file. If the extractor stops seeing
    // these it has stopped seeing copy.
    const all = copy.map((c) => c.text).join("\n");
    expect(
      all,
      "the extractor no longer sees StructureContextNote's label — the one " +
        "piece of copy this whole rule was written because of",
    ).toMatch(/Direction, location, aggression, response/i);
  });

  /**
   * THE RULE ITSELF. One assertion per name so a failure says WHICH name, and
   * the message carries file:line plus the offending sentence — because the
   * two real instances of this defect were each a single line in a 3000-line
   * page, and "somewhere in src/ you said ATHOS" is not an actionable failure.
   */
  for (const [i, pattern] of INTERNAL_NAMES.entries()) {
    const word = INTERNAL_NAME_WORDS[i] ?? String(pattern);

    it(`no Founder-facing text speaks "${word}"`, () => {
      const leaks = copy.filter((c) => pattern.test(c.text));
      expect(
        leaks.map((c) => `  ${c.file}:${c.line}  ${JSON.stringify(c.text)}`).join("\n"),
        `Founder-facing copy speaks the internal name "${word}".\n\n` +
          `This is a name the trader is never taught and never navigates to, ` +
          `so reading it here is not a hint — it is a leak. Say the thing in ` +
          `the trader's own vocabulary instead; see src/lib/design/internalNames.ts ` +
          `for why this name is on the list and what it costs to add another.\n\n` +
          `Sites:\n`,
      ).toBe("");
    });
  }
});
