/**
 * G7 — one renderer may not kill the glass. Serving fault injection
 * (2026-09-29): a single throw inside draw() escaped the loop before its
 * reschedule, so the overlay never painted again, even after the fault was
 * lifted. The loop catches the frame, names it, resets 2D state, continues.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const loop = MC.slice(MC.indexOf("const loop = (now: number) => {"), MC.indexOf("rafId = requestAnimationFrame(loop);\n    };"));

describe("the overlay paint loop survives a renderer fault", () => {
  it("draw() runs inside try/catch and the reschedule is outside it", () => {
    expect(loop).toMatch(/try \{\s*draw\(\);/);
    expect(loop).toContain("ds.paintFault = `${paintFaults}:${name.slice(0, 120)}`;");
    expect(loop).toContain('?.reset?.();');
    expect(MC).toContain("rafId = requestAnimationFrame(loop);\n    };");
  });
  it("a recovered frame withdraws the fault receipt", () => {
    expect(loop).toContain("if (canvasRef.current?.dataset.paintFault) delete canvasRef.current.dataset.paintFault;");
  });
});
