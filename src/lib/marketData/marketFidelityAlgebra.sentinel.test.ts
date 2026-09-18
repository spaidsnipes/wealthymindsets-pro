/**
 * THE ALGEBRA'S SENTINEL — aimed at the CONJUNCTION, not at the word.
 *
 * The unit tests prove the owner answers correctly. They cannot prove a surface
 * asked it. That gap is the whole history of this codebase: realized R was
 * drawn through three doors and repaired at one; the sentiment score was
 * counted through two; the streak floor disagreed across two routes.
 *
 * ── WHY THIS GUARD IS NARROW, AND MUST STAY NARROW ───────────────────────────
 *
 * The obvious guard — "ban the word EXECUTABLE outside the owner" — is WRONG
 * here, and a survey proves it rather than a hunch:
 *
 *     src/lib/broker/selectFirstBrokenJoint.ts   EXECUTABLE (broker joint rung)
 *     src/lib/ops/healthDimensions.ts            EXECUTABLE (health dimension)
 *
 * Both are legitimate and both are a DIFFERENT DOMAIN. The canon does not merely
 * permit that collision, it REQUIRES it: three honesty domains, never flattened
 * into one badge. A guard that banned the word would force the broker layer to
 * rename a correct concept to satisfy a rule about market bars — which is the
 * mistake `selectPrepChecklistBand.enforcement.test.ts` already records:
 *
 *   "a guard that makes a route rename its own palette to satisfy a rule about
 *    the prep count has started distorting the thing it protects."
 *
 * So this file bans the CONJUNCTION — a market-fidelity test standing next to a
 * broker test — because the conjunction is the thing that was supposed to have
 * exactly one owner. The word is free.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const OWNER_REL = "src/lib/marketData/marketFidelityAlgebra.ts";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Comments name the shades they removed. A colour in a comment paints nothing. */
function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const FILES = walk(SRC).filter(
  (f) => !f.includes("marketFidelityAlgebra") && !/\.test\.tsx?$/.test(f),
);

const rel = (f: string) => f.slice(ROOT.length + 1);

describe("this Sentinel proves it actually scanned", () => {
  /**
   * The empty-scan defect, and the house has been caught by it twice. Every
   * guard below asserts a violation list is EMPTY — which is exactly what a
   * scan that found NO FILES also reports. A bad glob, a moved directory or a
   * tightened filter would turn this whole file green forever while policing
   * nothing, and nothing about the output would say so.
   *
   * So the denominator is asserted before any numerator is trusted. This is
   * the same law as the Evidence Debt ledger's "payable is the only honest
   * denominator", applied to a Sentinel instead of to a trader.
   */
  it("FOUND MATERIAL — an empty sweep is not a clean sweep", () => {
    expect(FILES.length).toBeGreaterThan(200);
  });

  it("and the sweep reaches the places the law is about", () => {
    // Not merely "some files". The guards are about surfaces and market-data
    // modules specifically, so the scan must demonstrably include both.
    expect(FILES.some((f) => rel(f).startsWith("src/components/"))).toBe(true);
    expect(FILES.some((f) => rel(f).startsWith("src/lib/marketData/"))).toBe(true);
  });
});

describe("the owner is where the algebra lives", () => {
  const owner = code(join(ROOT, OWNER_REL));

  it("exports all four verbs of the canon's four lines", () => {
    for (const verb of ["canPaint", "canCompileIntent", "canGo", "canWait"]) {
      expect(owner, verb).toMatch(new RegExp(`export function ${verb}\\b`));
    }
  });

  it("NEVER FLATTENS THE THREE DOMAINS INTO ONE BADGE", () => {
    // The canon's central refusal. If this module ever grows a function that
    // returns a single combined label, the forbidden badge has an owner and
    // will be drawn — correctly, consistently, and falsely.
    expect(owner).not.toMatch(/function\s+\w*(combined|overall|unified|flatten)\w*/i);
  });

  it("asOf is required in the TYPE, not merely checked at runtime", () => {
    // A guard can be deleted. An optional `asOf?: number` would let a caller
    // omit the moment and still typecheck, and "fidelity without asOf is a
    // mood" would survive only as a comment.
    expect(owner).toMatch(/readonly asOf: number;/);
    expect(owner).not.toMatch(/readonly asOf\?:/);
  });

  it("does not reach for a clock — a default asOf is the defect it repairs", () => {
    // ff40d5f stamped a 12-hour-old close as now. The only reason that was
    // possible is that something knew the current time at the moment it was
    // describing a past one.
    expect(owner).not.toMatch(/Date\.now\(\)|new Date\(\)/);
  });
});

describe("no surface re-derives the intent conjunction", () => {
  it("NOBODY ELSE SPELLS 'EXECUTABLE **AND** BROKER' THEMSELVES", () => {
    // The conjunction, not the word. A file may say EXECUTABLE all it likes;
    // what it may not do is stand a market-fidelity test beside a broker test
    // and reach its own conclusion, because that conclusion is `canCompileIntent`
    // and there is supposed to be one of it.
    const offenders: string[] = [];
    for (const file of FILES) {
      const src = code(file);
      if (!/["']EXECUTABLE["']/.test(src)) continue;
      // Within 200 characters — close enough to be one expression rather than
      // two unrelated facts that happen to share a module.
      if (/["']EXECUTABLE["'][\s\S]{0,200}["']UNVERIFIED["']/.test(src)) offenders.push(rel(file));
      if (/["']UNVERIFIED["'][\s\S]{0,200}["']EXECUTABLE["']/.test(src)) offenders.push(rel(file));
    }
    expect(offenders, `re-derives canCompileIntent: ${offenders.join(", ")}`).toEqual([]);
  });

  it("NO SECOND DECLARATION OF THE CLOSED FIVE", () => {
    // The zoo guard. A second union type carrying the same five values is how
    // a closed algebra quietly becomes two algebras that agree until they
    // don't — the exact shape of the three realizedR call sites.
    const offenders: string[] = [];
    for (const file of FILES) {
      const src = code(file);
      const unions = src.match(/["']INDICATIVE["'][\s\S]{0,160}?["']DEGRADED["']/g) ?? [];
      for (const u of unions) {
        // A union declaration joins with `|`. A lookup table or a switch over
        // the owner's own values is not a second declaration.
        if (/\|/.test(u) && /["']STALE["']|["']PARTIAL["']/.test(u)) offenders.push(rel(file));
      }
    }
    expect(offenders, `declares its own fidelity union: ${offenders.join(", ")}`).toEqual([]);
  });

  it("the three domains keep their separate homes, and this proves it on purpose", () => {
    // Positive control for the guard above. These two files legitimately say
    // EXECUTABLE in the BROKER and OPS domains. If a future tightening of this
    // Sentinel starts failing them, the tightening is wrong — the canon
    // requires three domains, and two of them are here.
    for (const r of ["src/lib/broker/selectFirstBrokenJoint.ts", "src/lib/ops/healthDimensions.ts"]) {
      expect(code(join(ROOT, r)), r).toMatch(/EXECUTABLE/);
    }
  });
});

describe("the pipeline vocabulary crosses at one door", () => {
  /**
   * THE FIRST DRAFT OF THIS TEST WAS WRONG, AND THE WAY IT WAS WRONG IS THE
   * LESSON THE FILE IS ABOUT.
   *
   * It flagged any file that mentioned CANONICAL_FIDELITY_LABELS near the
   * strings INDICATIVE, PARTIAL *or* DEGRADED — and immediately reddened on
   * `src/lib/systemHealth/fidelityToHealth.ts`, which is entirely innocent. It
   * maps the seven pipeline labels onto SUBSYSTEM HEALTH (NORMAL / DEGRADED /
   * BLOCKED / UNAVAILABLE / RECOVERING). It shares exactly one word with the
   * market five — "DEGRADED" — and shares no meaning with it at all.
   *
   * That is the third domain doing its job, and a guard that made systemHealth
   * rename a correct state to satisfy a rule about market bars would have been
   * the documented mistake for the third time in one codebase.
   *
   * So the guard keys on INDICATIVE, which is the market domain's shibboleth:
   * no other vocabulary in this house uses it. A collision word proves nothing;
   * a word only one domain owns proves the crossing.
   */
  it("only the owner maps a canonical fidelity LABEL onto a market fidelity", () => {
    // `fidelityFromPipelineLabel` is the sanctioned crossing. A second mapping
    // is how the seven become de-facto badges by drift rather than by decision.
    const offenders: string[] = [];
    for (const file of FILES) {
      const src = code(file);
      if (!/CANONICAL_FIDELITY_LABELS/.test(src)) continue;
      if (/["']INDICATIVE["']/.test(src)) offenders.push(rel(file));
    }
    expect(offenders, `a second pipeline→market mapping: ${offenders.join(", ")}`).toEqual([]);
  });

  it("systemHealth keeps its own DEGRADED, and that is not this rule's business", () => {
    // Positive control, pinning the finding above so the guard cannot be
    // "tidied" back into the loose form that flagged an innocent file.
    const health = code(join(ROOT, "src/lib/systemHealth/fidelityToHealth.ts"));
    expect(health).toMatch(/DEGRADED/);
    expect(health).not.toMatch(/["']INDICATIVE["']/);
  });
});
