/**
 * A STOPPED LAYER WITHDRAWS EVERY RECEIPT IT PUBLISHED.
 *
 * Founder glass, serving, BTC-USD 1m (2026-09-25 02:44 CDT): after switching
 * from ORDER FLOW to REGIME the anatomy block stopped running, but the canvas
 * still read questionLens=ABSORPTION:3, absorptionDepthForm=SHELF — receipts
 * for geometry nobody could see. The OFF branch only cleared three keys.
 *
 * This sentinel derives the key set from the block itself, so a receipt added
 * to the block later cannot be forgotten by the OFF branch.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

function anatomyBlock(): string {
  const i = SRC.indexOf("      if (absorptionAnatomyActive) {\n        try {");
  expect(i).toBeGreaterThan(-1);
  let d = 0;
  for (let k = SRC.indexOf("{", i); k < SRC.length; k++) {
    if (SRC[k] === "{") d++;
    else if (SRC[k] === "}" && --d === 0) return SRC.slice(i, k);
  }
  throw new Error("anatomy block not closed");
}

describe("anatomy receipts are withdrawn when the block stops", () => {
  it("the OFF branch withdraws every key the block writes", () => {
    const written = new Set([...anatomyBlock().matchAll(/\bds\.([A-Za-z0-9_]+)\s*=(?!=)/g)].map(m => m[1]));
    expect(written.size).toBeGreaterThan(10);
    const list = SRC.slice(SRC.indexOf("const ANATOMY_BLOCK_RECEIPTS = ["), SRC.indexOf("] as const;", SRC.indexOf("const ANATOMY_BLOCK_RECEIPTS")));
    const withdrawn = new Set([...list.matchAll(/"([A-Za-z0-9_]+)"/g)].map(m => m[1]));
    // absorption and questionLens are set to "OFF" explicitly rather than deleted.
    const missing = [...written].filter(k => !withdrawn.has(k) && k !== "absorption" && k !== "questionLens");
    expect(missing).toEqual([]);
  });

  it("the OFF branch runs the list and states the lens is off", () => {
    const off = SRC.slice(SRC.indexOf("if (!absorptionAnatomyActive) {"), SRC.indexOf("if (absorptionAnatomyActive) {"));
    expect(off).toContain("for (const k of ANATOMY_BLOCK_RECEIPTS) delete ds[k];");
    expect(off).toContain('ds.questionLens = "OFF";');
  });
});
