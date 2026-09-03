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

describe("canvas identity timeframes", () => {
  const files = walk(path.join(process.cwd(), "src"));

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
