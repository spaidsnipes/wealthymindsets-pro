/**
 * SENTINEL — ONE FVG HISTORY, READ AS OF THE CAMERA'S CLOCK (Garden 19 §20–§21).
 *
 *  1. Only the FVG owners and their named readers call `detectFvgs` /
 *     `createFvgEngine`. A room, a component or a route that scans bars for gaps
 *     itself is a second engine.
 *  2. Chart code (src/components/chart/**) that reads FVG objects goes through
 *     `fvgSceneForCamera` and hands it the replay cursor
 *     (`replayCursorTimeSec`), so under Replay the state comes from
 *     `fvgStateAsOf(replayT)` — never the live ledger.
 *  3. `fvgSceneForCamera` itself reads `fvgStateAsOf` under replay.
 *
 * Rule 2 binds the chart lane the moment it imports the FVG owners; MainChart's
 * legacy `IND.fairValueGaps` paint is that lane's to retire (reported, not edited here).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../..");
const SRC = path.join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== "node_modules") walk(p, out); continue; }
    if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join("/");

/** The owners and the named readers allowed to run the one engine. */
const ENGINE_CALLERS = new Set([
  "src/lib/marketData/fvg/fvgEngine.ts",
  "src/lib/marketData/fvg/fvgCamera.ts",
  "src/lib/backtest/fvgStudy.ts",
  "src/lib/scanner/fvgScanConditions.ts",
  "src/lib/journal/fvgDecisionReference.ts",
  // (2026-10-07: chart lane D's fvgGlass.ts no longer runs the engine — its
  // live increment memo moved INTO fvgCamera (createFvgCameraMemo) — so it is
  // not a caller and is not listed.)
]);

describe("FVG camera sentinel", () => {
  const files = walk(SRC);

  it("scanned real material (a sentinel that read nothing must not report clean)", () => {
    expect(files.length).toBeGreaterThan(500);
    expect(files.filter(f => rel(f).startsWith("src/components/chart/")).length).toBeGreaterThan(20);
  });

  it("only the owners and named readers call the engine", () => {
    const offenders = files
      .filter(f => /\b(detectFvgs|createFvgEngine)\s*\(/.test(readFileSync(f, "utf8")))
      .map(rel)
      .filter(f => !ENGINE_CALLERS.has(f));
    expect(offenders).toEqual([]);
  });

  it("chart code reading FVG objects goes through fvgSceneForCamera with the replay cursor", () => {
    const chart = files.filter(f => rel(f).startsWith("src/components/chart/"));
    const offenders: string[] = [];
    for (const f of chart) {
      const src = readFileSync(f, "utf8");
      // Any chart file that PRODUCES an FVG ledger (directly or via the glass memo) is a reader of the history.
      if (!/\b(fvgSceneForCamera|advanceFvgLedger|fvgStateAsOf|detectFvgs|createFvgEngine)\s*\(/.test(src)) continue;
      if (!/\bfvgSceneForCamera\(/.test(src)) offenders.push(`${rel(f)}: produces an FVG ledger without fvgSceneForCamera (Replay could see the live ledger)`);
      else if (!/replayCursorTimeSec/.test(src)) offenders.push(`${rel(f)}: calls fvgSceneForCamera without replayCursorTimeSec`);
    }
    expect(offenders).toEqual([]);
  });

  it("the camera helper reads fvgStateAsOf under replay", () => {
    const src = readFileSync(path.join(SRC, "lib/marketData/fvg/fvgCamera.ts"), "utf8");
    expect(src).toMatch(/fvgStateAsOf\(full,/);
    expect(src).toMatch(/replayCursorTimeSec === null\s*\?\s*full/);
  });
});
