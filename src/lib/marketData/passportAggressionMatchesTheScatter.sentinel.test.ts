/**
 * SENTINEL — the Passport AGGRESSION node and the Asset 03 scatter must read
 * the SAME bars over the SAME window, through the SAME owner.
 *
 * FOUND FROM USE: the Passport read "Aggression unresolved — No verified
 * evidence supplied at snapshot time" while the Aggression vs Response view
 * beside it was plotting effort against response with a measured efficiency
 * ratio. Canon Weakness #1, fifth instance.
 *
 * The repair wires `selectAggressionResponse` into the publisher. That fix
 * carries TWO hazards, and this file guards both.
 *
 * ── HAZARD 1 · A SECOND OWNER OF THE MEASUREMENT ────────────────────────────
 *
 * `selectAggressionResponse` wraps `selectAbsorptionAnatomy`, which is the one
 * owner of "did this bar absorb". If the publisher ever called the anatomy
 * selector directly — or grew its own effort maths — the Passport could seal an
 * efficiency the scatter never plotted. That is the SAME defect the wire was
 * written to close, pointing the other way.
 *
 * ── HAZARD 2 · THE WINDOW, WHICH IS THE SUBTLER ONE ─────────────────────────
 *
 * Every term in this VM is normalised against the window's OWN peak. So the
 * efficiency ratio is not a property of the market — it is a property of the
 * market AND the window length. Two surfaces reading identical bars over
 * `windowBars: 30` and `windowBars: 60` would disagree while both were
 * correct, and nothing would throw.
 *
 * That is the disagreement defect wearing a config value, and it is invisible
 * to every render test in the repo. Both numbers would be internally
 * defensible; only their EQUALITY is the product requirement.
 *
 * The regression shape is a substitution at a wiring site, not a crash, so the
 * sources are read literally rather than exercised.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";

function read(rel: string): string {
  return stripComments(fs.readFileSync(path.join(process.cwd(), rel), "utf8"));
}

const PUBLISHER = "src/lib/marketData/chartMarketStatePublisher.ts";
const DASHBOARD = "src/components/chart/ChartsDashboard.tsx";

/**
 * `{ windowBars: 30 }`, however it is spaced, and whatever expression supplies
 * the bars. A `[^)]*` first argument matcher is WRONG here: the publisher
 * passes `profileBarsFrom(input.bars)`, whose own close paren ends the class
 * before the options object is ever reached.
 */
const WINDOW_BARS = /selectAggressionResponse\([\s\S]{0,160}?windowBars:\s*(\d+)/;

describe("the Passport aggression dimension has exactly one source owner", () => {
  it("compiles through selectAggressionResponse, not through the anatomy selector", () => {
    const src = read(PUBLISHER);
    expect(src).toContain("selectAggressionResponse");
    expect(src).toContain("deriveAggressionDimension");
    // A legitimate function — just not this file's to call.
    expect(src).not.toContain("selectAbsorptionAnatomy");
  });

  it("THE WINDOWS MATCH: the Passport measures the same span the scatter draws", () => {
    const pub = WINDOW_BARS.exec(read(PUBLISHER));
    const dash = WINDOW_BARS.exec(read(DASHBOARD));
    expect(pub, "publisher must pass an explicit windowBars").not.toBeNull();
    expect(dash, "dashboard must pass an explicit windowBars").not.toBeNull();
    // Equality is the requirement. The specific number is free to change, so
    // long as it changes in BOTH places on the same day.
    expect(pub![1]).toBe(dash![1]);
  });

  it("THE DISAGREEMENT CANNOT RETURN: Aggression is no longer hard-coded unresolved", () => {
    const src = read(PUBLISHER);
    // The old line was a bare `"Aggression",` entry in the unresolved array.
    expect(src).toMatch(
      /\.\.\.\(aggression\.resolution === "RESOLVED" \? \[\] : \["Aggression"\]\)/,
    );
    expect(src).not.toMatch(/^\s*"Aggression",\s*$/m);
  });

  it("the derived dimension actually reaches canonical state", () => {
    // Deriving it and then not publishing it would leave the rail exactly as
    // wrong as before, with none of the symptoms of a broken wire.
    expect(read(PUBLISHER)).toMatch(/dimensions:\s*\{[^}]*\baggression\b[^}]*\}/);
  });
});

describe("the side may never be named without a signed tape", () => {
  it("the deriver gates every side verdict behind the NET_AGGRESSION axis", () => {
    const src = read("src/lib/marketData/deriveAggressionDimension.ts");
    // The three side-naming verdicts live BELOW the axis guard. If that guard
    // is ever removed or moved after them, an unsigned tape could print
    // "BUYERS PRESSING" — a fabrication, and the worst output this lane can
    // produce. Ordering is the property, so ordering is what is asserted.
    const guard = src.indexOf('vm.aggressionAxis !== "NET_AGGRESSION"');
    const buyers = src.indexOf("AGGRESSION_VERDICTS.BUYERS\n");
    expect(guard, "axis guard must exist").toBeGreaterThan(-1);
    expect(buyers, "side verdict must exist").toBeGreaterThan(-1);
    expect(buyers).toBeGreaterThan(guard);
  });
});
