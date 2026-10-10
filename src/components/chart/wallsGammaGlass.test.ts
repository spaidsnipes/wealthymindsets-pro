import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { edgeChipWords } from "@/components/chart/wallsGammaGlass";

describe("Walls & Gamma off camera is named at the edge, never dropped", () => {
  const m = (price: number, label: string) => ({ price, kinds: ["CALL_WALL"] as const, label });
  it("nearest first, with how many more", () => {
    expect(edgeChipWords("above", [m(790, "CALL WALL 790 · OI 42k"), m(800, "CALL WALL 800 · OI 30k")])).toBe("▲ CALL WALL 790 · OI 42k  +1 more");
    expect(edgeChipWords("below", [m(740, "PUT WALL 740 · OI 222k")])).toBe("▼ PUT WALL 740 · OI 222k");
    expect(edgeChipWords("above", [])).toBeNull();
  });
  it("the chart paints the edge chips and the Inspect card after the status line", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(100_000);
    const status = src.indexOf("// ONE status line for the family");
    const edge = src.indexOf("// OFF-CAMERA marks are named at the glass edge");
    const inspect = src.indexOf("// INSPECT — the bucket under the crosshair");
    expect(status).toBeGreaterThan(0);
    expect(edge).toBeGreaterThan(status);
    expect(inspect).toBeGreaterThan(edge);
  });
});

describe("DOM reading chips are keep-outs every placer and the word registry can read", () => {
  it("measures .wm-chart-reading-anchor into the floating-chip seed and declares each as a registry panel", () => {
    const src = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(100_000);
    expect(src).toContain('document.querySelectorAll(".wm-chart-reading-anchor")');
    expect(src).toContain('for (const r of memoD.rects) { forceChips.push(r); wordGate.panel("DOM READING CHIP", r); }');
    expect(src).toContain("canvas.dataset.domChipKeepOut =");
  });
});

describe("narrow glass: one folded line, words never cut", () => {
  it("wraps between ' · ' pieces only, truth first, then the off-camera levels", async () => {
    const { foldNarrowLine, offCameraShortWords } = await import("@/components/chart/wallsGammaGlass");
    const measure = (t: string) => t.length * 6;
    const truth = "GAMMA · PARTIAL · Cboe delayed · OI prior session · as of Sat, Oct 10, 04:44 AM ET · MODEL, ASSUMED DEALER SIDE";
    const off = offCameraShortWords({
      above: [{ price: 790, kinds: ["CALL_WALL"], label: "CALL WALL 790 · OI 121k" }, { price: 800, kinds: ["CALL_WALL"], label: "CALL WALL 800 · OI 90k" }],
      below: [{ price: 740, kinds: ["PUT_WALL"], label: "PUT WALL 740 · OI 222k" }],
    });
    expect(off).toEqual(["▲ CALL WALL 790 +1", "▼ PUT WALL 740"]);
    const rows = foldNarrowLine([truth, ...off], 300, measure);
    expect(rows.length).toBeGreaterThan(1);
    for (const r of rows) expect(measure(r) <= 300 || !r.includes(" · ")).toBe(true);
    // Every piece survives whole, in order.
    expect(rows.join(" · ")).toBe([truth, ...off].join(" · "));
  });
});

describe("a Walls & Gamma tool's ⚙ opens Chart Settings at its own section", () => {
  it("gamma tools → GAMMA HEATMAP, call/put walls → Marks; other tools keep their family door", async () => {
    const { settingsSectionFor } = await import("@/lib/workspace/toolDoor");
    expect(settingsSectionFor("GAMMA_HEATMAP")).toBe("gamma-heat");
    expect(settingsSectionFor("GAMMA_FLIP")).toBe("gamma-heat");
    expect(settingsSectionFor("CALL_WALL")).toBe("marks");
    expect(settingsSectionFor("LIVING_PROFILE")).toBeNull();
    const modal = readFileSync(path.join(process.cwd(), "src/components/chart/ChartSettingsModal.tsx"), "utf8");
    expect(modal.length).toBeGreaterThan(5_000);
    expect(modal).toContain('data-settings-section="gamma-heat"');
    expect(modal).toContain('data-settings-section="marks"');
  });
});
