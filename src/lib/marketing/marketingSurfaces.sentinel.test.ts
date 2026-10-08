import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BANNED, offenders } from "./bannedClaims";

/**
 * The §57 banned-claims sweep, beyond the selling story (night shift
 * 2026-10-07, coordinator ruling): every surface that carries marketing or
 * product-promise copy is swept with the same patterns.
 *
 * One exemption, named: "win rate" is banned as a MARKETING stat, but /profile
 * and /paper print the trader's OWN measured win rate over their own trades
 * (with the 20-trade INSUFFICIENT guard). Those two files are swept with that
 * one pattern removed — every other pattern still applies to them.
 */
const SURFACES = [
  "src/app/shop/page.tsx",
  "src/app/proof-lane/page.tsx",
  "src/app/copy-trading/page.tsx",
  "src/app/tv/page.tsx",
  "src/app/radio/page.tsx",
  "src/app/lounge/page.tsx",
  "src/app/legal/page.tsx",
  "src/app/education/page.tsx",
  "src/app/layout.tsx",
  "src/components/brand/RealmGateway.tsx",
  "src/components/pwa/InstallPrompt.tsx",
] as const;
const OWN_STATS = ["src/app/profile/page.tsx", "src/app/paper/page.tsx"] as const;

function copyOf(path: string): string {
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("§57 banned claims — every marketing surface, not only the story", () => {
  it("no banned claim on any listed surface", () => {
    for (const p of SURFACES) expect(offenders(copyOf(p)), p).toEqual([]);
  });
  it("the trader's own-stats pages carry no banned claim except their own measured win rate", () => {
    for (const p of OWN_STATS) {
      const hits = offenders(copyOf(p)).filter(n => n !== "win rate / accuracy stat");
      expect(hits, p).toEqual([]);
    }
  });
  it("the shared list is the one the selling story reads (positive control)", () => {
    expect(BANNED.length).toBeGreaterThanOrEqual(8);
    expect(offenders("Guaranteed profits — trusted by 12,000+ traders")).toEqual(expect.arrayContaining(["guaranteed outcome", "invented stat"]));
  });
});
