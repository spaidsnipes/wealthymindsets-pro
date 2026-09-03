import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raw = fs.readFileSync(
  path.join(process.cwd(), "src/app/backtesting/page.tsx"),
  "utf8",
);

/**
 * Strip comments before asserting. These Sentinels document the defect they
 * guard, and that documentation legitimately quotes the removed code — so a
 * naive whole-file match would flag the explanation as the bug.
 */
const page = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Backtest progress truth Sentinel — LIVING-PIXEL LAW.
 *
 * The run exposes no incremental progress signal: fetchBars() is a single
 * await and runRealBacktest() is synchronous. The page nonetheless animated
 * `p += Math.random() * 12` on a 90ms interval and rendered it as "N%",
 * capped at 92. A trader watching "68%" believed two-thirds of the backtest
 * had completed. The number had no owner — it was decorative motion presented
 * as measurement.
 *
 * Canon: "motion: sparse, stateful, meaningful."
 */
describe("backtest progress truth", () => {
  it("no random-driven progress percentage", () => {
    expect(page).not.toMatch(/Math\.random\(\)\s*\*\s*12/);
    // No randomness may feed the progress state at all.
    const i = page.indexOf("setProgress");
    expect(i).toBeGreaterThan(-1);
    expect(page).not.toMatch(/setProgress\([^)]*Math\.random/);
  });

  it("does not render a fabricated percentage while running", () => {
    expect(page).not.toContain("{Math.round(progress)}%");
  });

  it("uses an honest indeterminate indicator instead", () => {
    expect(page).toContain('role="progressbar"');
    expect(page).toContain('aria-busy="true"');
    expect(page).toContain("working…");
  });
});
