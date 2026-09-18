/**
 * §9 ON /journal's TWO VERDICT SURFACES — aimed at the expression, not the route.
 *
 * `noGreenInTheRoom.sentinel.test.ts` is scoped to `src/components/experience/`
 * and cannot see this file. The obvious repair — point it at `src/app/` — is
 * the one `src/lib/experience/selectPrepChecklistBand.enforcement.test.ts`
 * already records as a mistake: a whole-file or proximity colour guard aimed at
 * a route false-fires on unrelated elements, and "a guard that makes a route
 * rename its own palette to satisfy a rule about the prep count has started
 * distorting the thing it protects."
 *
 * /journal legitimately carries green elsewhere — the long/short side chips,
 * the win-rate meter, the P&L glyphs. This file takes no view on any of that.
 * It watches the TWO EXPRESSIONS that decide a verdict's colour, and nothing
 * else:
 *
 *   · the Analysis Maturity classifier's `color =` ternary
 *   · the Mental Gate's verdict block
 *
 * The third site — realized R — is not here, because it left the route
 * entirely. `RealizedRFigure` lives in the room and the Sentinel covers it.
 * That is the stronger repair, and where a surface can take it, it should.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const RAW = readFileSync(path.join(process.cwd(), "src/app/journal/page.tsx"), "utf8");

/**
 * A colour named in a COMMENT paints nothing — and the repairs below document
 * the exact shades they removed, which is the most useful sentence in each
 * block and must not be the thing that fails the build.
 */
const code = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

/** The slice of source that decides one surface's colour, and no more. */
function expressionAround(anchor: string, before: number, after: number): string {
  const at = code.indexOf(anchor);
  expect(at, `anchor not found — the surface was renamed: ${anchor}`).toBeGreaterThan(-1);
  return code.slice(Math.max(0, at - before), at + after);
}

const GREEN_CLASS = /-wm-green/;

describe("§9 — Analysis Maturity does not grade the trader", () => {
  const block = () => expressionAround("maturity.verdict ===", 400, 1200);

  it("FULFILLED IS NOT GREEN", () => {
    // §6 classifies what the ANALYSIS did, not how well the trader did. A
    // FULFILLED thesis can be a trade that should never have been taken, and
    // WRONG is frequently the most valuable entry in the book — a plan followed
    // to a structural invalidation is the process working. Green for FULFILLED
    // told the reader the opposite.
    expect(block()).not.toMatch(GREEN_CLASS);
  });

  it("does not distinguish the four verdicts by hue at all", () => {
    // Not merely "not green". Swapping FULFILLED to teal or to blue would pass
    // a green ban and commit the same offence — the classifier does not make a
    // judgement, so no channel here may carry one. Brass on ACTIVE is the one
    // exception and is named: an unfinished reading is the only state the house
    // has standing to raise its voice about.
    const hues = [...block().matchAll(/text-wm-(\w+)/g)].map((m) => m[1]);
    expect(new Set(hues.filter((h) => !["text", "dim", "muted"].includes(h)))).toEqual(
      new Set(["gold"]),
    );
  });

  it("still prints the verdict as a WORD, since the word is now the whole signal", () => {
    expect(code).toMatch(/\{maturity\.verdict\}/);
  });
});

describe("§9 — the Mental Gate stops issuing a permission it does not have", () => {
  const block = () => expressionAround("mentalGateResult.verdict ===", 500, 1400);

  it("NO GREEN SHIELD — the canon phrase, and this was one", () => {
    // A green panel around the words "✓ ACTION AUTHORIZED", on an instrument
    // whose own docblock says it is NOT GATED because "the trader is
    // authoritative".
    expect(block()).not.toMatch(GREEN_CLASS);
  });

  it("DOES NOT CLAIM TO AUTHORIZE ANYTHING", () => {
    // The words were half the breach. The house has no standing to authorise a
    // trade off four questions the trader answered about themselves, and saying
    // so with a tick made it a verdict rather than a reflection.
    expect(code).not.toContain("ACTION AUTHORIZED");
    expect(code).not.toMatch(/"✓[^"]*"/);
  });

  it("does not pay the trader in colour for the answer the house prefers", () => {
    // The Yes/No buttons were green and red. "Am I calm enough to follow the
    // plan?" answered NO is the honest answer and the only one that makes the
    // gate worth anything; red punished it. Selection is shown by FILL now.
    const buttons = expressionAround("mentalGate[key] === true", 200, 900);
    expect(buttons).not.toMatch(GREEN_CLASS);
    expect(buttons).not.toMatch(/-wm-red/);
  });

  it("still says WAIT, because WAIT is the gate working", () => {
    expect(code).toMatch(/WAIT/);
  });
});

describe("§9 — STEWARD, the third verdict, found by the sweep and not by the brief", () => {
  /**
   * This block exists because of a mistake worth keeping. The Mental Gate test
   * above bans a quoted tick ANYWHERE in the module, not just inside the gate's
   * own expression — written that way by accident, since every other assertion
   * here is deliberately scoped to one expression. The loose one reddened, and
   * what it had found was a SECOND green shield thirty lines from the header:
   * a ✓ HELD chip congratulating the trader for keeping their own rules.
   *
   * The narrow guards would never have seen it. Recorded so the next reader
   * does not "tidy" the module-wide tick ban into an expression-scoped one.
   */
  const chip = expressionAround("STEWARD ·", 700, 120);

  it("does not pay a green shield for keeping your own rules", () => {
    // HELD is the baseline, not an achievement. Paid in the safety colour it
    // makes the ABSENCE of green read as danger — on, for instance, a day the
    // trader correctly did not trade at all.
    expect(chip).not.toMatch(GREEN_CLASS);
  });

  it("KEEPS the red on BROKEN, and that asymmetry is the rule, not an oversight", () => {
    // §9 is not "never colour". A broken rule is an adverse PROCESS fact the
    // trader committed — the one class of thing the house has standing to
    // raise its voice about. An OUTCOME is not, which is why realized R, MFE,
    // MAE and the maturity verdict all went ivory while this did not.
    expect(chip).toMatch(/-wm-red/);
    expect(chip).toMatch(/BROKEN/);
  });

  it("states the verdict as a word, with no glyph grading it a second time", () => {
    expect(chip).not.toMatch(/✓|✕/);
    expect(chip).toMatch(/\{todayStewardship\.verdict\}/);
  });
});

describe("§9 — the realized-R figure left the route rather than being repaired in place", () => {
  it("is drawn by the owner in the room, where the Sentinel can see it", () => {
    expect(code).toMatch(/<RealizedRFigure/);
    expect(code).not.toMatch(/realizedR\s*>=\s*0/);
  });

  it("MFE and MAE are no longer a green/red pair", () => {
    // MFE is favourable by definition — it is the best the trade ever looked —
    // so green there was a hue spent on a tautology. A large MFE beside a small
    // realized R is a trade that gave profit back, which is not a green fact.
    const mfe = expressionAround(">MFE<", 100, 500);
    expect(mfe).not.toMatch(GREEN_CLASS);
  });
});
