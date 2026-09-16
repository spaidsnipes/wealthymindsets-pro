/**
 * SENTINEL — delta bubble binning has ONE writer, ANYWHERE.
 *
 * The behaviour is tested in deltaBubbleLevels.test.ts against the shipped
 * function. This file exists to stop the loop being re-implemented, which is
 * what it used to do inline in the renderer.
 *
 * WHY THAT MATTERS MORE THAN IT SOUNDS
 *
 * The previous version of THIS file re-typed the binning loop into the test
 * and asserted on the copy, then string-matched MainChart for three
 * identifiers. That arrangement is wrong in both directions:
 *
 *   - renaming a local (`bucketLo` → `lo`) went red with no behaviour change;
 *   - changing behaviour while keeping the identifiers stayed green.
 *
 * And it could never have caught what was actually wrong in the shipped
 * function, because the copy only reproduced the part that had already been
 * fixed. Two real defects sat one line below the copied loop for as long as
 * the copy was the coverage: a bubble printing a bucket CENTRE as the price
 * flow occurred at, and a rounded price used as bucket identity — which
 * silently merged buckets on tight bars and dropped their aggressor volume.
 *
 * A test that mirrors the implementation tests the mirror.
 *
 * WHY THE SWEEP IS REPO-WIDE NOW — this Sentinel named a FILE, and lost
 *
 * The previous version read the source of `src/components/chart/MainChart.tsx`
 * and nothing else. It was green and it was blind. `scripts/audit-bubbles.mjs`
 * held a THIRD copy of the binning loop the entire time, carrying BOTH defects
 * the extraction fixed:
 *
 *     const priceLevel = +Number(lo + i * levelStep + levelStep / 2).toFixed(dp);
 *     ...
 *     if (Math.abs(t.price - priceLevel) < half) { bid += t.bid; ask += t.ask; }
 *
 * It had zero callers, was never executed by vitest, exited 0 with "9 passed,
 * 0 failed", and — worst of all — ASSERTED one of the defects as correct:
 *
 *     assert("bucket centers differ from raw ticks",
 *            levels.some(l => !data.has(l.priceLevel)));
 *
 * That assertion requires the printed bubble price to NOT be a real traded
 * tick. It is the third instance of the same class (see the note below, and
 * baton G): a check that is load-bearing in the WRONG direction and goes red
 * the moment the bug is fixed. It was also exactly the instrument a human
 * would reach for to "verify bubbles" — a green stamp on the old defect.
 *
 * The file was deleted rather than re-pointed at the new formula, because a
 * fourth copy pointed at the right answer is still a fourth copy. The history
 * is kept here instead, and the guard below now sweeps all of `src/` and
 * `scripts/` so the copy cannot come back anywhere.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");
const SELF = relative(REPO_ROOT, __filename);

const SWEPT_DIRS = ["src", "scripts"];
const SWEPT_EXT = /\.(tsx|mjs|cjs|ts|js|jsx)$/;

function sweptFiles(): string[] {
  const out: string[] = [];
  for (const dir of SWEPT_DIRS) {
    let entries: string[];
    try {
      entries = readdirSync(join(REPO_ROOT, dir), { recursive: true }) as string[];
    } catch {
      continue; // a swept dir may legitimately not exist
    }
    for (const e of entries) {
      const rel = join(dir, e);
      if (!SWEPT_EXT.test(rel)) continue;
      if (rel.split(sep).includes("node_modules")) continue;
      if (rel === SELF) continue;
      out.push(rel);
    }
  }
  return out;
}

/** Source with comments stripped — a comment quoting the defect is not the defect. */
function codeOf(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const FILES = sweptFiles();

/**
 * Each entry is an INVARIANT with the reason it is an invariant, not a
 * location. If one of these strings can be found anywhere under src/ or
 * scripts/, the binning logic has forked again.
 */
const FORBIDDEN: ReadonlyArray<{ readonly pattern: RegExp; readonly why: string }> = [
  {
    pattern: /Math\.abs\(\s*\w+\.price\s*-\s*priceLevel\s*\)\s*<\s*half/,
    why: "strict-centre bucket test — drops every exact bucket edge, including the bar's own low and high",
  },
  {
    pattern: /Math\.abs\(\s*price\s*-\s*center\s*\)\s*<\s*half/,
    why: "the same strict-centre test with the locals renamed",
  },
  {
    pattern: /\bbidByLevel\b/,
    why: "inline bid accumulator — the shared module owns level aggregation",
  },
  {
    pattern: /\baskByLevel\b/,
    why: "inline ask accumulator — the shared module owns level aggregation",
  },
  {
    pattern: /priceLevel\s*=\s*\+?\s*Number\([^)]*levelStep\s*\/\s*2\s*\)/,
    why: "a bucket CENTRE assigned to priceLevel — the printed price must be a REAL traded tick (ownerPrice), never a synthetic midpoint",
  },
];

describe("delta bubble binning — single writer, repo-wide", () => {
  it("sweeps a non-trivial number of source files (the sweep itself can rot)", () => {
    // A guard that silently swept zero files would be green and useless — the
    // exact failure this file is here to stop repeating.
    expect(FILES.length).toBeGreaterThan(100);
    expect(FILES).toContain(join("src", "components", "chart", "MainChart.tsx"));
    expect(FILES).toContain(join("src", "lib", "deltaBubbleLevels.ts"));
  });

  it("MainChart delegates to the shared module instead of binning inline", () => {
    const src = codeOf(join("src", "components", "chart", "MainChart.tsx"));
    expect(src).toContain("computeDeltaBubbleLevels");
    expect(src).toContain("@/lib/deltaBubbleLevels");
  });

  it("no file under src/ or scripts/ re-implements the bucket loop", () => {
    const offenders: string[] = [];
    for (const rel of FILES) {
      const code = codeOf(rel);
      for (const { pattern, why } of FORBIDDEN) {
        if (pattern.test(code)) offenders.push(`${rel}: ${why}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the deleted audit script has not come back", () => {
    // scripts/audit-bubbles.mjs was an unreferenced third copy that asserted
    // the bucket-centre defect as correct behaviour. Named explicitly because
    // its NAME is the thing a human reaches for; the invariant sweep above
    // would catch its contents, this catches its resurrection under any form.
    expect(FILES).not.toContain(join("scripts", "audit-bubbles.mjs"));
  });
});

/**
 * Historical record of the original defect, kept because it explains the
 * comment in the shared module and is cheap to keep honest.
 *
 * This reproduction is deliberately written with locals the sweep above does
 * NOT match (`p`/`mid`, not `price`/`center`), so the record cannot trip the
 * guard it sits beside.
 */
describe("regression record — the strict-centre comparison", () => {
  /** Old behaviour, reproduced exactly. NOT the shipped code. */
  function assignStrict(p: number, lo: number, step: number, numLev: number): number | null {
    const halfStep = step / 2;
    for (let i = 0; i < numLev; i++) {
      const mid = lo + i * step + step / 2;
      if (Math.abs(p - mid) < halfStep) return i;
    }
    return null;
  }

  it("dropped every exact bucket edge, including the bar's own low and high", () => {
    const lo = 0, hi = 1, numLev = 4, step = (hi - lo) / numLev;
    for (const edge of [0.0, 0.25, 0.5, 1.0]) {
      expect(assignStrict(edge, lo, step, numLev)).toBeNull();
    }
  });
});

/**
 * THE SPAWN-KEY ASSERTION THAT USED TO LIVE HERE IS GONE ON PURPOSE.
 *
 * It read:
 *
 *     expect(src).toContain(<the bar-time + bucket-INDEX template>);
 *     expect(src).not.toContain(<the bar-time + priceLevel template>);
 *
 * It was correct when written. `priceLevel` then carried a rounded bucket
 * CENTRE, two buckets on a tight bar could round alike, and keying on that
 * value suppressed the second bubble and lost its aggressor volume. Pinning
 * the key to the bucket index was the right fix for that defect.
 *
 * The premise then changed underneath it. `priceLevel` became `ownerPrice` —
 * the heaviest REAL tick in the bucket — and because bucket assignment is a
 * pure function of price, two buckets can no longer share one. The collision
 * the assertion was defending against became impossible, while the index it
 * insisted on acquired a defect the price never had: it renumbers whenever a
 * live bar makes a new extreme, so one price zone double-spawned and another
 * was silently suppressed.
 *
 * So this assertion spent that whole period REQUIRING the defect. It was not
 * merely stale; it was load-bearing in the wrong direction, and it went red at
 * the moment the bug was fixed. That is the failure mode baton G named: a
 * Sentinel that pins a LOCATION defends the location and loses the law.
 *
 * It is not re-pointed at the new formula here, because that would repeat the
 * mistake one layer over. Identity is now owned by `deltaBubbleLevelKey` in
 * src/lib/deltaBubbleLevels.ts, where deltaBubbleLevels.test.ts asserts the
 * PROPERTY ("a zone keeps its identity while the bar's window moves beneath
 * it") rather than the text, and deltaBubbleLevels.adoption.sentinel.test.ts
 * holds MainChart to delegating to it. Two owners, two questions, no third
 * copy.
 */
