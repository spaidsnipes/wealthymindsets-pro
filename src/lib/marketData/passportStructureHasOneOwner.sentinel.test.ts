/**
 * SENTINEL — the Passport STRUCTURE node must read the compiled swing sequence,
 * and must never become a sixth inline caller of the raw pivot detector.
 *
 * FOUND FROM USE: the Passport read "Structure unresolved — No verified
 * evidence supplied at snapshot time" while the chart beside it was drawing
 * Strong Highs/Lows, Liquidity Pools and CHoCH markers off `swingHighLow` on
 * the very same bars. Canon Weakness #1, sixth and final instance.
 *
 * ── HAZARD 1 · A SECOND DETECTOR ────────────────────────────────────────────
 *
 * `selectMarketStructure` wraps `swingHighLow`, which is the one owner of
 * "where is a pivot". MainChart already calls that detector inline four times,
 * at two different lookbacks. If the publisher grew a fifth inline call — or
 * its own pivot maths — the Passport could seal a sequence the chart never
 * drew. That is the SAME defect the wire was written to close, pointing the
 * other way.
 *
 * ── HAZARD 2 · THE PERMANENT CAVEAT GOING QUIET ─────────────────────────────
 *
 * A fractal pivot needs `lookback` bars on BOTH sides, so the newest bars can
 * never be pivots. Unlike a thin window, this is not a shortage that more data
 * cures — it is the method. If `confirmationLagNote` ever stopped riding the
 * RESOLVED path, the Passport would print a confirmed structure as a current
 * one, and every test in the repo would stay green: the value would still be
 * correct, only the admission beside it would be gone.
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
const DERIVER = "src/lib/marketData/deriveStructureDimension.ts";
const OWNER = "src/lib/marketData/viewModels/selectMarketStructure.ts";

describe("the Passport structure dimension has exactly one source owner", () => {
  it("compiles through selectMarketStructure, not through the raw detector", () => {
    const src = read(PUBLISHER);
    expect(src).toContain("selectMarketStructure");
    expect(src).toContain("deriveStructureDimension");
    // A legitimate function — just not this file's to call.
    expect(src).not.toContain("swingHighLow");
  });

  it("the owner is the ONLY thing in the marketData lane that reads the detector", () => {
    // The deriver must stay a reader. If it ever imported the detector it would
    // be free to disagree with the VM it was handed.
    expect(read(DERIVER)).not.toContain("swingHighLow");
    expect(read(OWNER)).toContain("swingHighLow");
  });

  it("THE DISAGREEMENT CANNOT RETURN: Structure is no longer hard-coded unresolved", () => {
    const src = read(PUBLISHER);
    // The old line was a bare `"Structure",` entry in the unresolved array.
    expect(src).toMatch(
      /\.\.\.\(structure\.resolution === "RESOLVED" \? \[\] : \["Structure"\]\)/,
    );
    expect(src).not.toMatch(/^\s*"Structure",\s*$/m);
  });

  it("the derived dimension actually reaches canonical state", () => {
    // Deriving it and then not publishing it would leave the rail exactly as
    // wrong as before, with none of the symptoms of a broken wire.
    expect(read(PUBLISHER)).toMatch(/dimensions:\s*\{[^}]*\bstructure\b[^}]*\}/);
  });
});

describe("the permanent confirmation caveat may never go quiet", () => {
  it("the deriver seeds unknowns from the lag note BEFORE any branch splits", () => {
    const src = read(DERIVER);
    // The RESOLVED return is the dangerous one: it is the only path where an
    // empty `unknowns` would look like a legitimately clean reading. Asserting
    // the seeding happens ABOVE the thin-window branch keeps both returns fed
    // from one line, so the caveat cannot be dropped from just one of them.
    const seed = src.indexOf("const unknowns = [vm.confirmationLagNote]");
    // The BRANCH, not the `export const` declaration near the top of the file
    // — a bare `indexOf("STRUCTURE_RESOLVE_MIN_BARS")` finds the constant's own
    // definition and makes this assertion meaningless.
    const thinBranch = src.indexOf("vm.barCount < STRUCTURE_RESOLVE_MIN_BARS");
    const resolved = src.lastIndexOf('resolution: "RESOLVED"');
    expect(seed, "lag note must seed unknowns").toBeGreaterThan(-1);
    expect(resolved, "a RESOLVED path must exist").toBeGreaterThan(-1);
    expect(seed).toBeLessThan(thinBranch);
    expect(seed).toBeLessThan(resolved);
  });

  it("the owner publishes the lag as a field, not as a comment", () => {
    const src = read(OWNER);
    expect(src).toContain("confirmationLagNote");
    expect(src).toContain("unconfirmedBars");
  });
});
