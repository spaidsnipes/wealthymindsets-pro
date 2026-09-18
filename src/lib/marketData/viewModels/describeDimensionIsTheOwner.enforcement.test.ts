/**
 * × A VALUE PRINTED WITHOUT ITS STANDING READS AS A RESOLVED VALUE.
 *
 * `MarketStateResolution` has THREE buckets — RESOLVED / PARTIAL / UNKNOWN —
 * and `${dim.value ?? "unresolved"}` can only see TWO, because it tests
 * NULLISHNESS and nullishness is not a standing. PARTIAL is precisely the
 * resolution that CARRIES a value while not being decision-grade, so the `??`
 * never fires for it and the measured sentence comes out byte-for-byte
 * identical to the committed one:
 *
 *     direction RESOLVED "LONG" → "direction LONG"
 *     direction PARTIAL  "LONG" → "direction LONG"
 *
 * This shipped FOUR separate times before anyone noticed, in four different
 * files, each written by someone who had not read the other three — and once in
 * the sharper form `${volatility.value ?? "resolved"}`, which named the
 * STRONGEST of the three standings for a dimension that had no reading at all.
 *
 * THAT IS WHY THIS FILE EXISTS. `describeDimension` in canonicalMarketState.ts
 * is now the single owner of the phrasing, and its `switch` is TOTAL over
 * `DimensionStanding` so a fourth standing fails the BUILD. But a rule that
 * lives only inside a helper protects only the call sites that remember to
 * reach for it; the next narrative written will reach for `??` again. This
 * test makes "reach for `??` instead" a RED BUILD rather than a silent lie.
 *
 * WHY SOURCE-LEVEL: the defect is invisible at runtime. Nothing throws, no
 * assertion trips, and the sentence is grammatical. The only place it is
 * legible is the source text.
 *
 * Exceptions are ALLOWLISTED BY FILE WITH A REASON, not waved through — each
 * one below was read and cleared individually.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const VM_DIR = resolve(__dirname);

/**
 * Audited exceptions. A file may only appear here with a reason that explains
 * how the STANDING still reaches the reader by some other route.
 */
const ALLOWED: Record<string, string> = {
  "selectDecisionChain.ts":
    "`verdict: state.X.value ?? \"UNRESOLVED\"` is not a narrative — each node " +
    "also carries `resolution` and `indicator: dimIndicator(resolution, value)`, " +
    "which IS a three-way split (UNKNOWN / WATCH / OK). DecisionChainPanel " +
    "renders the indicator and folds it into the a11y label, so a PARTIAL node " +
    "is visibly distinct from a RESOLVED one.",
  "selectMarketObjectPassport.ts":
    "`String(d.value ?? \"\")` sits INSIDE the `lifecycle === \"RESOLVED\"` " +
    "branch of `summarise()`. The middle bucket is handled separately and says " +
    "\"is forming\" — the three standings already have three sentences.",
};

/** Strip block and line comments so the rule's own prose cannot trip it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const OFFENDING = /\.value\s*\?\?\s*["'`]/;

function viewModelSources(): string[] {
  return readdirSync(VM_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"))
    .sort();
}

describe("describeDimension is the owner of dimension phrasing", () => {
  it("no view model reaches for `.value ?? \"…\"` outside the audited exceptions", () => {
    const sources = viewModelSources();

    // VACUITY GUARD — a scan that finds nothing is indistinguishable from a
    // scan that finds nothing WRONG. If this directory is ever moved or
    // renamed, `sources` goes empty and the emptiness assertion below would
    // pass GREEN forever while policing nothing. See
    // src/lib/ops/sentinelsProveTheyScanned.test.ts — that has already happened
    // three times in this repo.
    expect(sources.length).toBeGreaterThan(20);
    // And the scan must actually be able to SEE the pattern it polices: the
    // allowlisted files are a live positive control.
    expect(Object.keys(ALLOWED).length).toBeGreaterThan(0);

    const offenders: string[] = [];

    for (const file of sources) {
      const code = stripComments(readFileSync(resolve(VM_DIR, file), "utf8"));
      if (!OFFENDING.test(code)) continue;
      if (file in ALLOWED) continue;
      const line = code
        .split("\n")
        .find((l) => OFFENDING.test(l))
        ?.trim();
      offenders.push(`${file}: ${line}`);
    }

    expect(
      offenders,
      "a `??` fallback tests NULLISHNESS, which cannot see PARTIAL — " +
        "a dimension that CARRIES a value while not being decision-grade. " +
        "Use describeDimension() from ../canonicalMarketState, or add the file " +
        "to ALLOWED with a reason explaining how the standing still reaches " +
        "the reader.",
    ).toEqual([]);
  });

  it("every allowlisted file still exists and still contains the pattern it was excused for", () => {
    // An allowlist entry that no longer matches anything is a stale excuse
    // waiting to cover a NEW offence in the same file. Force it to be deleted.
    const stale: string[] = [];
    const sources = viewModelSources();

    for (const file of Object.keys(ALLOWED)) {
      if (!sources.includes(file)) {
        stale.push(`${file}: allowlisted but no longer a view model source`);
        continue;
      }
      const code = stripComments(readFileSync(resolve(VM_DIR, file), "utf8"));
      if (!OFFENDING.test(code)) {
        stale.push(`${file}: allowlisted but no longer contains the pattern — delete the entry`);
      }
    }

    expect(stale).toEqual([]);
  });

  it("the owner itself is total over the three standings", async () => {
    const { describeDimension } = await import("../canonicalMarketState");
    const base = { confidence: null, evidence: [], contradictions: [], unknowns: [] };

    const resolvedText = describeDimension({ ...base, resolution: "RESOLVED", value: "LONG" });
    const measuredText = describeDimension({ ...base, resolution: "PARTIAL", value: "LONG" });
    const missingText = describeDimension({ ...base, resolution: "UNKNOWN", value: null });

    // The whole point: three standings, three DIFFERENT sentences.
    expect(new Set([resolvedText, measuredText, missingText]).size).toBe(3);
    // And a reading that WAS taken is still shown — hiding it is the opposite
    // failure from overclaiming it.
    expect(measuredText).toContain("LONG");
    // A dimension that was never supplied at all must not invent a value.
    expect(describeDimension(null)).toBe(missingText);
    expect(describeDimension(undefined)).toBe(missingText);
  });
});
