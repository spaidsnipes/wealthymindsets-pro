import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Serving BTC 15m, 2026-10-01: Absorption = PRIMARY set inside scene=clean
// rewrote the trader's own wm_visual_roles. Composition stores hold in scenes.
describe("proof scenes never write the trader's composition", () => {
  for (const f of ["src/lib/workspace/visualRoles.ts", "src/lib/chart/profileStrengthStore.ts"]) {
    it(f, () => {
      const src = readFileSync(f, "utf8");
      expect(src).toContain("proofSceneHoldsWrites()");
      const write = src.slice(src.indexOf("export function write"));
      expect(write.indexOf("proofSceneHoldsWrites()")).toBeLessThan(write.indexOf("localStorage.setItem"));
    });
  }
});
