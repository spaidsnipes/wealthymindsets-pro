import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * SENTINEL — THE ROOM'S DOORS AND THE CHART'S MENU MAY NOT SHARE A NAME.
 *
 * THE DEFECT THIS WAS BORN FROM, observed on live /charts at 1920 wide:
 *
 *     masthead   [ ▤ WORKSPACE ]  [ ⌕ TOOLS ]
 *     toolbar                                        … ⋯ **Tools**
 *
 * Two buttons, one accessible name, eleven inches apart, opening two
 * completely different overlays. The masthead door is the ROOM's lens shelf,
 * owned by `WMOperatingSystem`. The toolbar control is the CHART's own menu —
 * Views, Flow & studies, Depth ladder, Pine, Replay, Compare, Alerts,
 * Instrument profile, Watchlist, Draw.
 *
 * A trader who wanted Replay had no way to know which "Tools" held it, and a
 * screen-reader user heard the same name twice with no way to tell them apart.
 *
 * WHY A SENTINEL AND NOT JUST A RENAME. This is the third instance of one
 * shape in this product: `equipmentIsNotADestination` caught ROOMS "Passport"
 * colliding with WORKSPACE "Object passport", and a second CanvasSummaryPill
 * once shipped under the first one's exact `ariaLabel`. Each time the two
 * things were already separate in the source, and being separate in the source
 * did not stop them reading as the same thing on screen. So the separation is
 * enforced in WORDS.
 *
 * WHAT THIS DOES NOT CLAIM. The Canon's §3 says the room should have exactly
 * two equipment doors and that most of the chart menu's contents belong behind
 * them. That consolidation has NOT happened and this file does not pretend it
 * has — it only guarantees that while two menus exist, a trader can tell which
 * is which.
 *
 * NEVER DELETE THIS SENTINEL — re-pin it to the meaning, with stronger
 * assertions than it had.
 */

const TOOLBAR_REL = "src/components/chart/ChartToolbar.tsx";
const OS_REL = "src/components/os/WMOperatingSystem.tsx";

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

/** Source with comments stripped — a door name in prose is not a door. */
function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("SENTINEL — one name per door", () => {
  it("the detector is not vacuous — it can still see both controls", () => {
    // POSITIVE CONTROL. If either scan stops finding its control, every
    // collision assertion below compares against nothing and passes forever
    // while reporting a clean bill of health. That reads exactly like safety.
    const os = code(OS_REL);
    const toolbar = code(TOOLBAR_REL);

    expect(os, "the OS masthead no longer renders its two equipment doors").toContain(
      '{kind === "workspace" ? "Workspace" : "Tools"}',
    );
    expect(
      toolbar,
      "the chart's own overflow menu trigger is gone from ChartToolbar",
    ).toContain("<MoreHorizontal size={13} /> Chart tools");
  });

  it("the chart's overflow menu is not called what the room's door is called", () => {
    const toolbar = code(TOOLBAR_REL);

    // The bare word, as a rendered label. `Chart tools` is fine; a lone
    // `Tools` immediately after the menu glyph is the exact regression.
    expect(
      toolbar,
      "ChartToolbar's overflow trigger is named `Tools` again — the same " +
        "accessible name the OS masthead door already owns",
    ).not.toMatch(/<MoreHorizontal[^>]*\/>\s*Tools\b/);
  });

  it("the chart's overflow menu carries an accessible name of its own", () => {
    const toolbar = code(TOOLBAR_REL);

    // The visible label and the accessible name must BOTH be specific. A
    // rename that left `aria-label="Tools"` behind would fix the sighted
    // reading and leave the screen-reader collision exactly where it was.
    expect(toolbar).toContain('aria-label="Chart tools"');
    expect(
      toolbar,
      "ChartToolbar names a control `Tools` with no scope — that is the " +
        "room door's name",
    ).not.toContain('aria-label="Tools"');
  });

  it("the room's two doors keep their canonical names — this is not a licence to rename them", () => {
    const os = code(OS_REL);

    // The collision could also be "resolved" by renaming the MASTHEAD, which
    // would be the wrong repair: Workspace and Tools are the Canon's two
    // hands and the approved frame draws them by those words. The narrower
    // control is the one that yields.
    expect(os).toContain('kind === "workspace" ? "Workspace" : "Tools"');
  });
});
