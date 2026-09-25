/**
 * THE VOLUME PROFILE LABELS ITS KEY LEVELS BY DEFAULT, NOT EVERY ROW.
 *
 * Founder glass, serving, BTC-USD 1m, REGIME desk (2026-09-25 02:44 CDT): with
 * `wm_vp_labels` never set, the Session/Classic VP printed a number on every
 * row that had room — a full-height column of 0.01 / <0.01 values beside the
 * price axis, the very "wall of numbers" the renderer's own comment names as
 * what made the VP look broken. Garden Pass 12: redundant low-value labels are
 * suppressed; the market stays dominant. "all" stays one click away in the gear.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));

describe("VP label default", () => {
  it("the renderer labels every row only when the trader chose \"all\"", () => {
    const chart = read("src/components/chart/MainChart.tsx");
    expect(chart).toContain("let vpLabelAll = false;");
    expect(chart).toContain('vpLabelAll = localStorage.getItem("wm_vp_labels") === "all";');
  });

  it("the gear shows the same default the renderer applies", () => {
    const room = read("src/components/chart/ChartsDashboard.tsx");
    expect(room).toContain('useState<"all" | "key">("key")');
    expect(room).toContain('localStorage.getItem("wm_vp_labels") === "all" ? "all" : "key"');
  });
});
