import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * SENTINEL — <details> IS NOT A SURFACE.
 *
 * The Market Object Passport and the Decision Receipt were both built, both
 * wired to real compilers, and both mounted on /command-deck — three collapsed
 * <details> deep. The Workspace toggle, then the evidence drawer, then one of
 * their own. Present in the DOM, absent from the product.
 *
 * That is the whole failure: every automated check that asks "is it rendered?"
 * answered YES for months while the Founder, looking at the actual page, saw
 * nothing and said so. A drawer three clicks down is indistinguishable from
 * unshipped to the only observer who matters.
 *
 * This file's own source already diagnosed it in prose — "<details> IS NOT A
 * SURFACE" is a comment in command-deck/page.tsx that predates the fix and was
 * never acted on for these two panels. A comment does not hold a line. This
 * does.
 *
 * NEVER DELETE THIS SENTINEL — re-pin it to the meaning, with stronger
 * assertions than it had.
 */

const REL = "src/app/command-deck/page.tsx";

/**
 * COMMENT-STRIPPED, and that matters more here than usual: the prose ABOVE the
 * document wall discusses <details> at length. A naive scan would read those
 * sentences as evidence of the very burial they describe.
 */
const src = fs
  .readFileSync(path.join(process.cwd(), REL), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * How many unclosed <details> elements are open at a given source offset.
 *
 * Deliberately a real balance count rather than a "is there a <details> earlier
 * in the file" check: the deck has many drawers that OPEN AND CLOSE above the
 * document wall, and treating those as enclosing would make this Sentinel fire
 * on a correct layout — which is the fastest way to get a Sentinel deleted.
 */
function drawerDepthAt(offset: number): number {
  const before = src.slice(0, offset);
  const opens = before.match(/<details[\s>]/g)?.length ?? 0;
  const closes = before.match(/<\/details>/g)?.length ?? 0;
  return opens - closes;
}

const PANELS = ["MarketObjectPassportPanel", "DecisionReceiptPanel"] as const;

describe("SENTINEL — the document wall is not a drawer", () => {
  it("this is still the deck — the suite cannot go vacuous by a rename", () => {
    expect(src, REL).toContain("data-wm-document-wall");
    for (const panel of PANELS) expect(src, `${REL} → ${panel}`).toContain(`<${panel}`);
  });

  it("each document is mounted EXACTLY ONCE — no drawer copy left behind", () => {
    // A second mount inside a <details> would let the top-level one be deleted
    // later with every other assertion here still passing.
    for (const panel of PANELS) {
      const mounts = src.match(new RegExp(`<${panel}[\\s/>]`, "g")) ?? [];
      expect(mounts.length, `${REL} → ${panel} mount count`).toBe(1);
    }
  });

  it("NEITHER document sits inside any <details> — zero drawers deep", () => {
    // THE LOAD-BEARING ASSERTION. One is the regression that shipped; three is
    // the one the Founder actually hit. Any depth above zero is the defect.
    for (const panel of PANELS) {
      const at = src.indexOf(`<${panel}`);
      expect(at, `${REL} → ${panel} not found`).toBeGreaterThan(-1);
      expect(
        drawerDepthAt(at),
        `${REL} → ${panel} is buried ${drawerDepthAt(at)} <details> deep`,
      ).toBe(0);
    }
  });

  it("the wall itself is above the Workspace fold, not inside it", () => {
    // Ordering is the part a human sees. A document wall rendered BELOW the
    // Workspace drawer is technically un-buried and still never scrolled to.
    const wall = src.indexOf("data-wm-document-wall");
    const workspace = src.indexOf("wm-cd-secondary-workspace");
    expect(wall, `${REL} → document wall missing`).toBeGreaterThan(-1);
    expect(workspace, `${REL} → workspace drawer missing`).toBeGreaterThan(-1);
    expect(wall, `${REL} → the wall must precede the Workspace drawer`).toBeLessThan(
      workspace,
    );
  });

  it("each document carries its own measurement handle", () => {
    // `data-wm-document-wall` proves the section exists; per-document handles
    // are what let a live probe distinguish "the wall rendered" from "the wall
    // rendered and BOTH documents are on it".
    expect(src, REL).toContain('data-wm-document="passport"');
    expect(src, REL).toContain('data-wm-document="receipt"');
  });
});
