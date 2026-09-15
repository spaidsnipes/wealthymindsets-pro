import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { strengthDisclosure, strengthScore } from "@/lib/scannerStrength";
import { classifyScan } from "@/lib/scannerSignalEvidence";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/app/scanner/page.tsx"),
  "utf8",
);
const page = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Scanner strength-grade Sentinel — canon weakness #4 SCORE ADDICTION.
 *
 * "A+" reads like a validated signal quality. It is actually a fixed-weight
 * bucket over two real inputs: |change %| x0.5 + volume ratio x0.3. The inputs
 * are honest market data, so the grade is not fabricated — but rendering a
 * letter grade with no disclosure implies a validation that never happened.
 *
 * Sibling controls already disclose ("Real percentage move"; refresh cadence
 * "does not certify every row as real-time"); the grade chip was the gap.
 */
describe("scanner strength disclosure", () => {
  it("states the exact formula and its real inputs", () => {
    const d = strengthDisclosure(4, 2);
    expect(d).toContain("|change %|");
    expect(d).toContain("volume ratio");
    expect(d).toContain("observed data only");
  });

  it("explicitly denies being a validated quality or prediction", () => {
    const d = strengthDisclosure(1, 1);
    expect(d).toContain("not a validated signal quality");
    expect(d).toContain("prediction");
  });

  it("reports the same score the grader buckets on", () => {
    // |6| * 0.5 + 4 * 0.3 = 3 + 1.2 = 4.20
    expect(strengthDisclosure(6, 4)).toContain("4.20");
    // Negative moves use absolute value.
    expect(strengthDisclosure(-6, 4)).toContain("4.20");
  });

  it("the disclosed score matches the grader's own arithmetic", () => {
    expect(strengthScore(6, 4)).toBeCloseTo(4.2, 5);
    expect(strengthScore(-6, 4)).toBeCloseTo(4.2, 5);
  });

  it("both strength chips carry the disclosure", () => {
    // This assertion used to read `/title=\{strengthDisclosure\(/` and expect 2.
    // It was REWRITTEN, not relaxed. The page no longer rebuilds the sentence:
    // it renders the one `classifyScan` emitted beside the grade. The old form
    // would now count 0 and fail for the right reason, which is why it had to
    // change — but the replacement is strictly stronger, because it also bans
    // the render site from computing the sentence itself (next test).
    const uses = page.match(/title=\{(?:r|selected)\.disclosure \?\? undefined\}/g) ?? [];
    expect(uses.length).toBe(2);
  });

  it("the page cannot rebuild the disclosure from casts", () => {
    // The old render sites read `strengthDisclosure(r.changePct as number, ...)`.
    // Those casts were CORRECT — the JSX only reaches them when `r.strength`
    // is non-null — but the invariant is owned by classifyScan and was being
    // asserted here with an `as number` in between whose whole job is to stop
    // the compiler from asking. If the ladder ever graded on volume alone, the
    // cast would keep compiling and the tooltip would read "NaN".
    expect(page).not.toContain("strengthDisclosure(");
  });

  it("a grade always carries its disclosure, and an unrated row never does", () => {
    // The pairing is the point: `disclosure` is non-null EXACTLY when
    // `strength` is. This is the invariant the render sites used to assume.
    const rated = classifyScan({ changePct: 6, volRatio: 4, rsi: 50 });
    expect(rated.strength).not.toBeNull();
    expect(rated.disclosure).toContain("observed data only");
    // Built from the same two inputs the bucket scored.
    expect(rated.disclosure).toContain("4.20");

    for (const ev of [
      { changePct: null, volRatio: 4, rsi: 50 },
      { changePct: 6, volRatio: null, rsi: 50 },
      { changePct: null, volRatio: null, rsi: null },
    ]) {
      const c = classifyScan(ev);
      expect(c.strength).toBeNull();
      // No grade, so no grade disclosure. "from observed data only" on a row
      // with no observation would itself be the lie.
      expect(c.disclosure).toBeNull();
    }
  });
});
