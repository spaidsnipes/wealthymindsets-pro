/**
 * THE ONE PRIMARY ACTION (house pass 2026-10-10).
 *
 * Eight commit buttons across Settings, Journal, Academy and Backtest wore a
 * teal-to-blue gradient (#00D4AA → #4FA3E0) that neither colour owner holds —
 * the house's most third-party-looking element. They now read one owner,
 * `WM_PRIMARY_ACTION` in wmTokens.ts (hero brass into line brass, obsidian
 * ink, the sign-in door's existing primary). This sentinel keeps the retired
 * pairs out of src and keeps each known commit site on the owner.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WM, WM_PRIMARY_ACTION } from "./wmTokens";

const SRC = resolve(__dirname, "../..");

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** The retired gradient pairs, any spacing or case. */
const RETIRED = [
  /linear-gradient\(\s*\d+deg\s*,\s*#00D4AA\s*,\s*#4FA3E0\s*\)/i,
  /linear-gradient\(\s*\d+deg\s*,\s*#00E5CC\s*,\s*#7B6CF7\s*\)/i,
];

const COMMIT_SITES: ReadonlyArray<[file: string, minUses: number]> = [
  ["components/layout/shellPanels.tsx", 1], // Save Settings
  ["app/journal/page.tsx", 3],              // New Entry, + Log New Trade, Save Trade Entry
  ["app/education/page.tsx", 2],            // Next Question / See Results, Close Knowledge Check
  ["app/backtesting/page.tsx", 3],          // Run Backtest, its progress bar, Send to Journal
  ["app/profile/page.tsx", 1],              // Open Lounge
  ["components/pine/CustomIndicatorBuilder.tsx", 1], // Run Preview
];

describe("one primary action — the commit button has one owner", () => {
  it("the owner is canonical brass with obsidian ink", () => {
    expect(String(WM_PRIMARY_ACTION.background)).toContain(WM.gold.hero);
    expect(String(WM_PRIMARY_ACTION.background)).toContain(WM.gold.line);
    expect(WM_PRIMARY_ACTION.color).toBe(WM.surface.deepest);
  });

  it("no source file paints the retired teal/blue or cyan/violet gradient", () => {
    const files = sourceFiles(SRC);
    expect(files.length).toBeGreaterThan(200);
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const re of RETIRED) if (re.test(src)) offenders.push(`${f.slice(SRC.length + 1)} ${re}`);
    }
    expect(offenders).toEqual([]);
  });

  it("every known commit site reads WM_PRIMARY_ACTION", () => {
    for (const [file, minUses] of COMMIT_SITES) {
      const src = readFileSync(join(SRC, file), "utf8");
      expect(src.length, file).toBeGreaterThan(1000);
      const uses = (src.match(/WM_PRIMARY_ACTION\b/g) ?? []).length - 1; // minus the import
      expect(uses, file).toBeGreaterThanOrEqual(minUses);
    }
  });
});
