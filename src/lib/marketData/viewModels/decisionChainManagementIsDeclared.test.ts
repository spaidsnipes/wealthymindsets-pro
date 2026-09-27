/**
 * The management node reads the trader's DECLARED phase — never a position
 * anyone observed (Garden 16 §36, found on the glass 2026-09-27: the deck said
 * "Management · active — Trade open" while its Book read Position UNOBSERVED).
 * Source read of the chain owner's three narratives.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/lib/marketData/viewModels/selectDecisionChain.ts"), "utf8");

describe("management speaks of what was declared, not what was observed", () => {
  it("each narrative names the declaration; none asserts an open or closed trade as fact", () => {
    expect(SRC).toContain('"You declared a trade — management rules apply. No position is read here."');
    expect(SRC).toContain('"You declared the trade closed — post-exit integrity applies."');
    expect(SRC).toContain('"No trade declared — management not active."');
    const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/"Trade open —|"Trade closed —|"No open position —/);
  });
});
