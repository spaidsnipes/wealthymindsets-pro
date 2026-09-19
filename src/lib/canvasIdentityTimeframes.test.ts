import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { normalizeTFId } from "@/lib/timeframes";

/**
 * Repo-wide canvas-identity timeframe Sentinel.
 *
 * canonicalMarketStateIdentity throws on an unknown timeframe — deliberately,
 * so a bad store key fails loudly instead of silently mismatching. But every
 * call site wraps it in try/catch to tolerate option OCC / non-canonical
 * futures symbols, which converts that loud failure into a silent null.
 *
 * Three pages passed timeframe "15" (not a TFId; "15m" is). All three threw on
 * every render, caught, nulled the identity, and rendered no Market Canvas at
 * all — dead from the commits that added them:
 *   /ai-bot, /journal (detail), /nectar/[symbol]
 *
 * This walks the source tree and proves every literal timeframe handed to
 * canonicalMarketStateIdentity actually normalizes, so the catch can never
 * again hide a typo.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

/** The one call-site shape both rules below depend on. Defined once. */
const CALL_SITE = /canonicalMarketStateIdentity\(\{[^}]*timeframe:\s*"([^"]+)"/g;

describe("canvas identity timeframes", () => {
  const files = walk(path.join(process.cwd(), "src"));

  /**
   * ANTI-VACUITY — added 2026-09-19, paying down the frozen debt recorded in
   * `src/lib/ops/sentinelsProveTheyScanned.test.ts`.
   *
   * Both rules below assert emptiness, and BOTH depend on one brittle thing:
   * a regex that assumes the call is written as an inline object literal with
   * a double-quoted timeframe. That assumption is one refactor from false.
   * Switch the call sites to a variable, a template string, or a spread, and
   * the regex matches nothing — `bad` is empty, `offenders` is empty, the gate
   * is green, and the exact typo it was built to catch walks straight back in.
   *
   * The defect this file records was three dead pages shipped by a silent
   * catch. A gate that goes quietly blind is the same failure one level up.
   *
   * So: prove the scan reaches source, prove the module is still reachable in
   * it, and prove the call-site pattern still finds real matches.
   *
   * MEASURED 2026-09-19, and the measurement corrected a first guess that was
   * wrong by 27. A naive `grep` over `src/` reported 31 literal timeframes; the
   * real number this gate can see is **4**, because `walk()` excludes test
   * files and the other 27 matches were all in tests. The floor below is set
   * from the true number, not the flattering one.
   *
   * THE 4 ARE WORTH NAMING, BECAUSE THEY ARE THE GATE'S REAL SCOPE. Eight
   * non-test modules reference `canonicalMarketStateIdentity`; only three pass
   * a literal — `/journal`, `/nectar/[symbol]` and `/ai-bot` (twice). Those are
   * EXACTLY the three pages the original regression killed. The other five
   * (`/command-deck`, `MobileSessionPill`, `ChartsDashboard`,
   * `sanctuarySessionContext`, `canonicalIdentity`) pass a variable, and this
   * file cannot see a single one of them: a bad timeframe reaching the identity
   * through a variable is invisible here and always has been.
   *
   * That is a scope limit, stated rather than papered over. This gate covers
   * LITERALS. Catching a computed timeframe needs the call to validate at
   * runtime, which is a different instrument and is not pretended to here.
   */
  it("ANTI-VACUITY: the scan reaches source and the call-site pattern still matches", () => {
    expect(
      files.length,
      "walk(src) found almost no TypeScript — did src/ move, or did the " +
        "extension filter stop matching?",
    ).toBeGreaterThan(200);

    const referencing = files.filter((f) =>
      fs.readFileSync(f, "utf8").includes("canonicalMarketStateIdentity"),
    );
    expect(
      referencing.length,
      "no module references canonicalMarketStateIdentity — either the " +
        "function was renamed or the canvas identity path was removed, and " +
        "both rules below are now guarding nothing",
    ).toBeGreaterThanOrEqual(4);

    let literals = 0;
    for (const file of referencing) {
      const src = fs.readFileSync(file, "utf8");
      for (const _ of src.matchAll(CALL_SITE)) literals++;
    }
    expect(
      literals,
      "the call-site pattern found ZERO literal timeframes. The pattern " +
        "assumes an inline object literal with a double-quoted timeframe; if " +
        "the call sites were refactored to a variable or a template string, " +
        "this gate has gone blind and the rules below are green over nothing. " +
        "Re-derive the pattern from how the calls are actually written now",
    ).toBeGreaterThanOrEqual(3);
  });

  it("every literal timeframe passed to canonicalMarketStateIdentity normalizes", () => {
    const bad: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      if (!src.includes("canonicalMarketStateIdentity")) continue;
      // Match `timeframe: "X"` inside a canonicalMarketStateIdentity call.
      const re = /canonicalMarketStateIdentity\(\{[^}]*timeframe:\s*"([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const tf = m[1]!;
        if (normalizeTFId(tf) === null) {
          bad.push(`${path.relative(process.cwd(), file)} → timeframe "${tf}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('the specific regression value "15" is gone from every call site', () => {
    const offenders = files.filter(f => {
      const src = fs.readFileSync(f, "utf8");
      return /canonicalMarketStateIdentity\(\{[^}]*timeframe:\s*"15"/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});
