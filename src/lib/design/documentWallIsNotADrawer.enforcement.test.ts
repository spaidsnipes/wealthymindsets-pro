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

/**
 * RE-PINNED, NOT RELAXED — the passport left the wall for WORKSPACE.
 *
 * The Market Object Passport is no longer a wall document. It is now equipment
 * the trader picks up (ROOM → WORKSPACE → PREVIEW → DRAWER → ENTER → RETURN),
 * because eight object rows pinned permanently open on MARKET is the
 * "permanently displaying every invention" the interaction directive bans.
 *
 * That move could ALSO be exactly the regression this Sentinel exists to stop —
 * "we moved it somewhere" is what burial sounds like from the inside. So the
 * rule did not soften; it forked into the reachability guarantee appropriate to
 * each mechanism:
 *
 *   · WALL panels must be mounted once, at zero <details> depth, above the
 *     Workspace fold, carrying their own probe handle. Unchanged.
 *   · EQUIPMENT panels must be mounted once, at zero <details> depth, AND be
 *     registered equipment of this room (so the rail draws a one-press entry),
 *     AND be reached through `renderDepth` (so a full-screen depth exists).
 *
 * A panel that is neither on the wall nor registered equipment is buried, and
 * both lists are asserted, so deleting an entry from one does not quietly grant
 * amnesty — the panel simply fails the other.
 */
const WALL_PANELS = ["DecisionReceiptPanel"] as const;
const EQUIPMENT_PANELS = ["MarketObjectPassportPanel"] as const;
const PANELS = [...EQUIPMENT_PANELS, ...WALL_PANELS] as const;

/** The room's equipment registry — the thing that makes the rail draw an entry. */
const registry = fs.readFileSync(
  path.join(process.cwd(), "src/lib/workspace/roomEquipment.ts"),
  "utf8",
);

describe("SENTINEL — the document wall is not a drawer", () => {
  it("this is still the deck — the suite cannot go vacuous by a rename", () => {
    expect(src, REL).toContain("data-wm-document-wall");
    for (const panel of PANELS) expect(src, `${REL} → ${panel}`).toContain(`<${panel}`);
  });

  it("a panel that left the wall became EQUIPMENT — not merely deleted", () => {
    // The assertion that makes the fork safe. Removing the passport from the
    // wall is legitimate ONLY because the rail now offers it; removing it from
    // the wall and forgetting the rail entry is the original defect wearing a
    // refactor's clothes, and nothing else in this file would notice.
    expect(registry, "roomEquipment.ts → /command-deck has no passport entry").toMatch(
      /id:\s*"market-object-passport"/,
    );
    expect(src, `${REL} → the room never hands the passport to the equipment layer`).toMatch(
      /equipmentId:\s*"market-object-passport"/,
    );
    for (const panel of EQUIPMENT_PANELS) {
      const depth = src.indexOf("renderDepth:", src.indexOf(`equipmentId: "market-object`));
      expect(depth, `${REL} → ${panel} equipment has no depth`).toBeGreaterThan(-1);
      expect(
        src.slice(depth, depth + 300),
        `${REL} → ${panel} is registered but its full experience renders something else`,
      ).toContain(`<${panel}`);
    }
  });

  it("ENTER must buy the equipment panel real DEPTH, not a bigger box", () => {
    // The passport's docked depth folds each object's lineage behind a
    // <details>. That is defensible at 420px and indefensible on a whole
    // screen — "if the intelligence exists but requires hunting through
    // implementation containers: FAIL". So the panel takes `unabridged` and
    // the room must forward it; hardcoding it, or dropping it, would make the
    // full stage a resize and re-bury the evidence lineage one click down.
    expect(src, `${REL} → the passport's full stage does not uncap it`).toMatch(
      /<MarketObjectPassportPanel[\s\S]{0,120}unabridged=\{unabridged\}/,
    );
    const panel = fs.readFileSync(
      path.join(process.cwd(), "src/components/experience/MarketObjectPassportPanel.tsx"),
      "utf8",
    );
    expect(panel, "MarketObjectPassportPanel → unabridged must bypass the disclosure").toMatch(
      /if\s*\(unabridged\)/,
    );
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
    // rendered and the document is on it".
    expect(src, REL).toContain('data-wm-document="receipt"');
    // And the wall must COUNT itself honestly. The passport's article left; a
    // wall still advertising two documents would make every live probe that
    // reads this attribute report a surface that is not there.
    const wall = src.indexOf("data-wm-document-wall");
    const count = /data-wm-documents="(\d+)"/.exec(src.slice(wall, wall + 400))?.[1];
    expect(count, `${REL} → the wall does not declare how many documents it holds`).toBeDefined();
    expect(
      Number(count),
      `${REL} → the wall claims ${count} documents but ${WALL_PANELS.length} are mounted on it`,
    ).toBe(WALL_PANELS.length);
  });
});
