/**
 * SENTINEL — bubble SIZE has one owner, repo-wide.
 *
 * bubbleDrawGeometry.ts can hold a perfect law and still be decoration if the
 * renderer keeps its own formula. That is not hypothetical here: delta bubble
 * LEVELS were extracted and Sentinel-locked a while ago, and the whole time the
 * RADIUS stayed inline in MainChart.tsx in two separate places, unowned and
 * untested, disagreeing with each other about how to encode size.
 *
 * WHAT THIS GUARD CANNOT SEE — measured, not guessed. Mutation-testing the
 * frame-peak assertions below: replacing `bubbleFramePeak(...)` with a
 * constant FAILS them, as intended. Neutering the rescale LOOP BODY
 * (`if (true) continue;`) leaves them GREEN — `b.baseR = nextR` is still
 * present in the text, and source text cannot tell reachable code from dead
 * code. A rendered canvas of bubbles on live tape is the only witness for
 * that, and canvas has no DOM. Recorded so the next reader does not mistake
 * this file's green for a pixel proof.
 *
 * This guard is written as an INVARIANT swept across src/ and scripts/, not as
 * a check on one file. deltaBubbleBinning.test.ts named a FILE, stayed green,
 * and missed a third copy of the binning loop sitting in scripts/ the entire
 * time. The lesson cost enough to apply pre-emptively.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");
const SELF = relative(REPO_ROOT, __filename);
const OWNER = join("src", "lib", "bubbleDrawGeometry.ts");
const OWNER_TEST = join("src", "lib", "bubbleDrawGeometry.test.ts");
const MAIN_CHART = join("src", "components", "chart", "MainChart.tsx");

const SWEPT_DIRS = ["src", "scripts"];
const SWEPT_EXT = /\.(tsx|mjs|cjs|ts|js|jsx)$/;

function sweptFiles(): string[] {
  const out: string[] = [];
  for (const dir of SWEPT_DIRS) {
    let entries: string[];
    try {
      entries = readdirSync(join(REPO_ROOT, dir), { recursive: true }) as string[];
    } catch {
      continue;
    }
    for (const e of entries) {
      const rel = join(dir, e);
      if (!SWEPT_EXT.test(rel)) continue;
      if (rel.split(sep).includes("node_modules")) continue;
      if (rel === SELF || rel === OWNER || rel === OWNER_TEST) continue;
      out.push(rel);
    }
  }
  return out;
}

/** Comments stripped — quoting a dead formula in a comment is not shipping it. */
function codeOf(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const FILES = sweptFiles();

const FORBIDDEN: ReadonlyArray<{ readonly pattern: RegExp; readonly why: string }> = [
  {
    pattern: /baseR\s*=\s*Math\.round\(\s*\d+\s*\+/,
    why: "a radius built by ADDING a constant floor into the ramp — that is a baseline, not a floor, and it paints an empty zone at a fifth of the peak's area",
  },
  {
    pattern: /Math\.min\(\s*2[0-9]\s*,\s*\d+\s*\+\s*Math\.sqrt/,
    why: "a clamped radius ramp — the clamp saturates every large print into one identical bubble",
  },
  {
    pattern: /Math\.sqrt\(\s*Math\.max\(\s*0\s*,\s*\w*[Rr]atio\w*\s*-\s*1\s*\)/,
    why: "the `ratio - 1` dead zone — every value at or below the normalizer collapses into one indistinguishable dot",
  },
  {
    pattern: /\/\s*Math\.max\(\s*1\s*,\s*bar\s*Mean\s*\)/,
    why: "sizing against a bar MEAN — the outlier the bubble exists to show drags the mean and silently shrinks its neighbours",
  },
];

describe("bubble draw geometry — single writer, repo-wide", () => {
  it("sweeps a non-trivial number of files and can see the renderer", () => {
    // A guard that silently swept zero files is green and useless.
    expect(FILES.length).toBeGreaterThan(100);
    expect(FILES).toContain(MAIN_CHART);
  });

  it("MainChart delegates BOTH bubble surfaces to the owner", () => {
    const src = codeOf(MAIN_CHART);
    expect(src).toContain("@/lib/bubbleDrawGeometry");
    expect(src).toContain("deltaBubbleRadius(");
    expect(src).toContain("bigTradeBubbleRadius(");
  });

  it("no file under src/ or scripts/ re-derives a bubble radius", () => {
    const offenders: string[] = [];
    for (const rel of FILES) {
      const code = codeOf(rel);
      for (const { pattern, why } of FORBIDDEN) {
        if (pattern.test(code)) offenders.push(`${rel}: ${why}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("BOTH bubble families rescale against a FRAME peak, every frame", () => {
    // The per-bar peak made every bar volunteer a maximum-size disc, so a
    // three-lot bar and a thirty-thousand-lot bar drew the same picture side
    // by side. A source assertion, because the population a peak is taken
    // over is not visible in any single call's output.
    const src = codeOf(MAIN_CHART);
    expect(src).toContain("bubbleFramePeak(deltaBubblesRef.current.map(");
    expect(src).toContain("bubbleFramePeak(bubblesRef.current.map(");
    // And the rescale must actually WRITE baseR — computing a frame peak and
    // leaving the spawn-time radius in place is the failure this guards.
    expect(src).toMatch(/nextR\s*=\s*deltaBubbleRadius\([\s\S]{0,80}?deltaFramePeak\)/);
    expect(src).toMatch(/nextR\s*=\s*bigTradeBubbleRadius\([\s\S]{0,80}?bigFramePeak\)/);
    expect(src.match(/b\.baseR\s*=\s*nextR/g) ?? []).toHaveLength(2);
  });

  it("the two families are never pooled into one peak", () => {
    // A print's dominant side and a zone's net measure different things.
    // One peak across both would be a third normalizer defect, not a fix.
    const src = codeOf(MAIN_CHART);
    expect(src).not.toMatch(/bubbleFramePeak\(\s*\[\s*\.\.\.(bubblesRef|deltaBubblesRef)/);
  });

  it("loudness is not decided by a pixel count", () => {
    // `playBloop(baseR > 24)` asked the RENDERER whether a trade was loud.
    // It only ever worked by accident of the old clamp, and with size
    // normalized to the bar's peak it would sound on every single bar.
    const src = codeOf(MAIN_CHART);
    expect(src).not.toMatch(/playBloop\(\s*baseR\b/);
  });
});
