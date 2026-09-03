import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

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

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Repo-wide day-change guard coverage.
 *
 * useWebSocket.flush() leaves change/changePct at their initial 0 until
 * prevCloseRef holds a REAL prior close. Five separate surfaces each
 * re-implemented the "is this a real change?" check and four got it wrong,
 * because finiteness and sign cannot distinguish "genuinely flat" from
 * "no reference close yet" — 0 and 0 are finite, and `>= 0` calls zero "up".
 *
 * Observed on prod:
 *   ChartsDashboard  "BTC 77,556.11 ↑ +0.00 +0.00%"
 *   MainChart        "381.33 +0.00 (+0.00%)"
 * both green, both beside a verified-looking badge, both while the tape showed
 * a real multi-percent move for the same symbol.
 *
 * This asserts no surface reintroduces the naive comparison.
 */
describe("ticker change guard coverage", () => {
  const files = walk(path.join(process.cwd(), "src"))
    .filter(f => !f.endsWith("selectTickerChangeDisplay.ts"));

  it("no surface treats ticker.change >= 0 as a direction", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = strip(fs.readFileSync(f, "utf8"));
      if (/ticker\.change\s*>=\s*0/.test(src) || /ticker\.changePct\s*>=\s*0/.test(src)) {
        offenders.push(path.relative(process.cwd(), f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no surface manufactures a zero percent when the value is absent", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = strip(fs.readFileSync(f, "utf8"));
      if (/changePct\s*\?\.\s*toFixed\([^)]*\)\s*\?\?\s*["']0\.00["']/.test(src)) {
        offenders.push(path.relative(process.cwd(), f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every day-change surface routes through the shared guard", () => {
    // Files that render a formatted change must import the selector, or carry
    // the explicit zero-pair guard inline (the two chart headers do).
    const rendering = files.filter(f => {
      const src = strip(fs.readFileSync(f, "utf8"));
      return /ticker\.changePct(\s*as number)?\s*\)?\.toFixed\(/.test(src)
        || /chg\.changePct\.toFixed\(/.test(src)
        || /tickerChange\.changePct\.toFixed\(/.test(src);
    });
    expect(rendering.length).toBeGreaterThan(0);

    const unguarded = rendering.filter(f => {
      const src = strip(fs.readFileSync(f, "utf8"));
      const usesSelector = src.includes("selectTickerChangeDisplay");
      const inlineGuard = src.includes("ticker.change === 0 && ticker.changePct === 0");
      return !usesSelector && !inlineGuard;
    }).map(f => path.relative(process.cwd(), f));

    expect(unguarded).toEqual([]);
  });
});
