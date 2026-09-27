/**
 * SENTINEL — no hook below ChartsDashboard's hydration gate.
 *
 * 2026-09-27 04:22Z, serving: a hook placed after `if (!mounted) return …`
 * ran on the second render and not the first. React #310 ("rendered more
 * hooks than during the previous render") took the whole of /charts down.
 * Every top-level `useX(` in the component must come before the gate.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ChartsDashboard — hooks above the hydration gate", () => {
  it("no top-level hook call after `if (!mounted) {`", () => {
    const src = readFileSync(join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
    const start = src.indexOf("export function ChartsDashboard(");
    const gate = src.indexOf("  if (!mounted) {", start);
    expect(start).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(start);
    // The component body ends at the first column-0 closing brace after the gate.
    const end = src.indexOf("\n}\n", gate);
    const after = src.slice(gate, end > 0 ? end : undefined);
    const hooks = [...after.matchAll(/^ {2}(?:const|let)\s[^=\n]+=\s*(?:React\.)?(use[A-Z]\w*)\(/gm)].map(m => m[1]);
    const bare = [...after.matchAll(/^ {2}(?:React\.)?(use[A-Z]\w*)\(/gm)].map(m => m[1]);
    expect([...hooks, ...bare], "a hook below the hydration gate crashes /charts (React #310)").toEqual([]);
  });
});
