/**
 * SENTINEL — `scene=capture` shows the product, never the owner (coordinator
 * ruling 2026-10-10, marketing still). Every block that shows the signed-in
 * trader's own money, position, broker quote or account carries
 * `data-owner-private`; the page marks itself under capture; one rule withholds
 * them all; the chart draws no paper, broker or order line.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseProofScene } from "@/lib/chart/proofScene";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("capture renders no owner-private block", () => {
  it("each owner block opts in", () => {
    expect(read("src/components/layout/HeaderPnL.tsx")).toContain('data-owner-private="paper-pnl"');
    expect(read("src/components/chart/ChartBookStrip.tsx")).toContain('data-owner-private="position-strip"');
    expect(read("src/components/experience/DecisionSpineBand.tsx")).toContain('data-owner-private="broker-quote"');
  });
  it("the page marks itself and one rule withholds every opted-in block", () => {
    expect(read("src/components/layout/VerifySceneBanner.tsx")).toContain('document.documentElement.dataset.capture = "true";');
    expect(read("src/app/globals.css")).toContain('html[data-capture="true"] [data-owner-private] { display: none !important; }');
  });
  it("the chart draws no paper, broker or order line under capture, and no draft handle", () => {
    const C = read("src/components/chart/MainChart.tsx");
    expect([...C.matchAll(/if \(proofCaptureOpen\(\)\) return;/g)].length).toBe(3);
    expect(C).toContain("|| replayCameraOn || proofCaptureOpen()) return null;");
  });
  it("capture is a clean scene: layers by address, writes held", () => {
    const s = parseProofScene("?scene=capture&on=LivingProfile");
    expect(s.active).toBe(true);
    expect(s.clean).toBe(true);
  });
});
