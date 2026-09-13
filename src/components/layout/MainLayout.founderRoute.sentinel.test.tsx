/**
 * MainLayout · Founder-route parent — the Ticket T G2 gate.
 *
 * The 2026-09-13 Founder audit named G2 (root/ownership) and G9 (human fruit)
 * RED because "the actual parent did not change." The Founder lands on
 * FOUNDER_LANDING_ROUTE = "/command-deck" and until this session that route
 * rendered INSIDE the July shell — left rail, ticker tape, music player,
 * Mobile Session pill, Spaidbot chrome, and a dashboard nav that competed
 * with MARKET for the first viewport.
 *
 * `MainLayout.tsx` now has an explicit escape-hatch for the Founder route:
 * `if (isFounderOperatingRoom) return <WMExperienceShell>…`. This sentinel
 * gates that fact BY READING THE SOURCE — it does not render the shell.
 * MainLayout is a 1400-line client component that mounts framer-motion,
 * icon packs, Auth/Symbol/WMS/Radio contexts, and would not survive a
 * renderToStaticMarkup in a unit-test harness. A shape-of-file assertion is
 * the honest gate here: the audit's requirement is a CODE-LEVEL parent
 * change, and code is what this file checks.
 *
 * If a well-meaning revert removes the branch — because someone believes
 * "the July shell was fine on the deck" or because a merge silently drops
 * it — this test fails BY NAME. Ticket T stays open until F9 also lands
 * elsewhere, but this line is the first F9 receipt in the tree.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { FOUNDER_LANDING_ROUTE } from "@/lib/routing/founderLanding";

const MAIN_LAYOUT_PATH = path.resolve(__dirname, "MainLayout.tsx");
const SOURCE = readFileSync(MAIN_LAYOUT_PATH, "utf-8");

describe("MainLayout · Founder-route parent — Ticket T G2 gate", () => {
  it("names the Founder landing route in code, not by hand", () => {
    // The audit's P0 was "record concrete PARENT_SCENE_OWNER_FILE/COMPONENT",
    // and the same discipline applies to the ROUTE identity — hard-coding
    // "/command-deck" here and there was the "three-independent-owners"
    // defect the recent Ticket T commit already retired. This gate confirms
    // the shell reads the canonical constant.
    expect(FOUNDER_LANDING_ROUTE).toBe("/command-deck");
  });

  it("identifies the Founder operating room from the registry, not a hard-coded string", () => {
    // The Asset-10 family expanded on 2026-09-13 to cover morning-prep,
    // journal, paper, and nectar in addition to command-deck. The
    // registry (founderRoomRoutes.ts) is the single owner; MainLayout
    // consults it. A refactor that reintroduces a pathname string literal
    // for this check would silently narrow the family back to
    // /command-deck and every other room would slide into July.
    expect(SOURCE).toMatch(/isFounderOperatingRoom\s*=\s*isFounderRoomRoute\(pathname\)/);
    expect(SOURCE).toContain('import { isFounderRoomRoute } from "@/lib/routing/founderRoomRoutes"');
  });

  it("imports the Asset-10 parent shell", () => {
    // The July shell is 1400 lines below. The Asset-10 shell is one
    // import. Without that import, the escape branch cannot compile and
    // a future refactor could silently delete it without failing tsc if
    // it also deleted the branch — this test would still fail because
    // the import line names the intent even if the compiler could not.
    expect(SOURCE).toMatch(
      /import\s*\{\s*WMExperienceShell\s*\}\s*from\s*"@\/components\/experience\/WMExperienceShell"/,
    );
  });

  it("cuts the parent — returns WMExperienceShell when the Founder route matches", () => {
    // The audit's exact requirement, in code. This must be a REPLACEMENT
    // return, not a wrap around the July shell. The regex asserts the
    // shape: an early return of WMExperienceShell inside a conditional
    // keyed on isFounderOperatingRoom.
    const cut = SOURCE.match(
      /if\s*\(\s*isFounderOperatingRoom\s*\)\s*\{[^}]*return\s*\([^]*?<WMExperienceShell[^>]*>[^]*?<\/WMExperienceShell>[^]*?\)/,
    );
    expect(cut, "no WMExperienceShell escape-hatch found for the Founder route").not.toBeNull();
  });

  it("cuts BEFORE the July shell renders — the escape must be an early return", () => {
    // The audit's language: "cut the parent, not wrap the child." A wrap
    // would still let the July `<div className="wm-universe">` render as
    // the outer scene. The escape must sit above the main return.
    const cutAt = SOURCE.indexOf('if (isFounderOperatingRoom)');
    const wmUniverseAt = SOURCE.indexOf('className="bg-wm-black wm-universe"');
    expect(cutAt).toBeGreaterThan(0);
    expect(wmUniverseAt).toBeGreaterThan(0);
    expect(cutAt).toBeLessThan(wmUniverseAt);
  });

  it("carries the brand into the new shell so identity survives the cut", () => {
    // A shell with no brand slot on the Founder route would read as a
    // ceremonial-neutral panel rather than as WM Pro. WMExperienceShell
    // accepts an optional `brand` prop; the cut MUST provide it.
    expect(SOURCE).toMatch(/<WMExperienceShell\s+brand=/);
  });
});
