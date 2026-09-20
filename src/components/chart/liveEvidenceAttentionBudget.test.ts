import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "MainChart.tsx"), "utf8");

describe("live evidence respects the four-chunk market frame", () => {
  it("fuses the post-arrival tape disclosure into the compact Nectar instrument", () => {
    expect(source).toContain('data-visual-density="compact"');
    expect(source).toContain("● LIVE TAPE");
    expect(source).toContain("historical bars before this tab opened stay blank");
    expect(source).toContain("Collector receipts this runtime");
    expect(source).not.toContain('className="wm-footprint-live-status"');
  });

  it("keeps the pre-arrival explanation because blank footprints need a reason", () => {
    expect(source).toContain("Collecting live executed trades…");
    expect(source).toContain("Footprints populate from this point forward");
  });
});
