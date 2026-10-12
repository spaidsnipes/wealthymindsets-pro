/**
 * LIVE ONLY — the Founder's standing order of 2026-10-12: "remove anything delayed and dead".
 * See docs/operations/LIVE_ONLY_SOURCES.md.
 *
 * No client surface (src outside src/app/api) may ask a delayed or dead price route in CODE. Comments
 * may still name the history. Two exemptions, each for a reason that is not a delayed price:
 *   - src/lib/backtest/engine.ts — the backtester reads completed HISTORY bars.
 *   - src/lib/marketData/fvg/fvgBarSource.ts — its injected-fetcher TEST SEAM; the default path is live.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(process.cwd(), "src");
const EXEMPT = new Set(["src/lib/backtest/engine.ts", "src/lib/marketData/fvg/fvgBarSource.ts"]);
const BANNED: readonly [RegExp, string][] = [
  [/\/api\/yahoo\?[^`'"]*type=(quote|candles)|\/api\/yahoo\?\$\{|`\/api\/yahoo\?/, "Yahoo quote/candles (delayed)"],
  [/\/api\/market-data\/cboe\//, "Cboe delayed options"],
  [/\/api\/alpaca-stream/, "the dead Alpaca stream route"],
  [/\/api\/market-data\/(moomoo|longbridge)\//, "the dead moomoo / Longbridge lanes"],
  [/api\.polygon\.io/, "Polygon from a client surface"],
  [/aplacawsproxy/, "the dead Railway Alpaca relay"],
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return p.includes(`${path.sep}app${path.sep}api`) ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}
const codeOnly = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("live-only sources (Founder 2026-10-12)", () => {
  const all = files(ROOT);
  it("the scan reads the client tree", () => {
    expect(all.length).toBeGreaterThan(500);
  });
  it("no client surface asks a delayed or dead price route in code", () => {
    const offenders: string[] = [];
    for (const f of all) {
      const rel = path.relative(process.cwd(), f);
      if (EXEMPT.has(rel)) continue;
      const code = codeOnly(readFileSync(f, "utf8"));
      for (const [re, what] of BANNED) if (re.test(code)) offenders.push(`${rel} — ${what}`);
    }
    expect(offenders).toEqual([]);
  });
  it("the standing order is written down where the team reads it", () => {
    expect(readFileSync("docs/operations/LIVE_ONLY_SOURCES.md", "utf8")).toContain("Do not reintroduce a delayed or dead price source");
  });
});
