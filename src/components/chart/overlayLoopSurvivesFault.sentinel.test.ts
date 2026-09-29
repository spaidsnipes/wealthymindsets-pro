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

describe("the pressure world is isolated inside the frame", () => {
  it("its block is try/catch with a named fault receipt and a balanced save/restore", () => {
    expect(MC).toContain("ds.derivativesPressureFault = (err instanceof Error");
    expect(MC).toMatch(/pressureFrontHitRef\.current = null;[\s\S]{0,200}ctx\.save\(\);\s*try \{\s*const dp = derivativesPressureRef\.current;/);
  });
});

describe("every top-level layer of draw() is isolated and named (G7, 2026-09-29)", () => {
  it("no top-level statement of draw() that paints is left bare, and no top-level catch is silent", async () => {
    const ts = await import("typescript");
    const sf = ts.createSourceFile("MainChart.tsx", MC, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let draw: import("typescript").ArrowFunction | null = null;
    const find = (n: import("typescript").Node): void => {
      if (draw) return;
      if (ts.isVariableDeclaration(n) && n.name.getText(sf) === "draw" && n.initializer && ts.isArrowFunction(n.initializer)) { draw = n.initializer; return; }
      ts.forEachChild(n, find);
    };
    find(sf);
    expect(draw).not.toBeNull();
    const body = (draw as unknown as import("typescript").ArrowFunction).body as import("typescript").Block;
    const lines = (st: import("typescript").Node) => sf.getLineAndCharacterOfPosition(st.end).line - sf.getLineAndCharacterOfPosition(st.getStart(sf)).line;
    // Layers begin after the attention governor exists; setup above it is excluded.
    const govAt = MC.indexOf("let att = selectAttentionGovernor(");
    expect(govAt).toBeGreaterThan(0);
    const bare = body.statements.filter(st => st.getStart(sf) > govAt && lines(st) >= 8
      && (ts.isBlock(st) || (ts.isIfStatement(st) && ts.isBlock(st.thenStatement))));
    expect(bare.map(st => MC.slice(st.getStart(sf), st.getStart(sf) + 60))).toEqual([]);
    const silent = body.statements.filter(st => st.getStart(sf) > govAt && ts.isTryStatement(st) && st.catchClause && !st.catchClause.variableDeclaration && lines(st) >= 8);
    expect(silent.map(st => MC.slice(st.getStart(sf), st.getStart(sf) + 60))).toEqual([]);
    expect(MC).toContain("if (layerFaults.length) canvas.dataset.layerFaults =");
  });
});
