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

describe("the profile family is isolated inside the frame", () => {
  it("runWMVP wraps its body, names the fault, restores state; every frame starts from reset 2D state", () => {
    expect(MC).toContain("try { runWMVPBody(); if (canvasRef.current?.dataset.vpFault) delete canvasRef.current.dataset.vpFault; }");
    expect(MC).toContain("if (ds) ds.vpFault = (err instanceof Error");
    expect(MC).toContain("(ctx as CanvasRenderingContext2D & { reset?: () => void }).reset?.();\n      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);");
  });
});
