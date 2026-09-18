/**
 * SENTINEL — the Profiles menu must remain THE ONE DOOR.
 *
 * Founder directive: "there should also have a profiles drop down for all the
 * different vps and the profiles i created, the inventions."
 *
 * The failure class here is not a crash. It is DRIFT BACK: someone adds a fifth
 * profile and, because a standalone toolbar button is two lines and a menu entry
 * is a catalogue edit, they add the button. Three months later the product again
 * has inventions nobody can enumerate — which is the exact state this menu was
 * built to end. A render test cannot see that: a toolbar with one extra button
 * renders perfectly.
 *
 * So two things are pinned. First, that the dashboard actually mounts the menu
 * and routes every profile through it. Second, that the three standalone VP
 * toggle buttons the menu REPLACED have not grown back beside it.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { selectProfileMenu } from "@/lib/marketData/viewModels/selectProfileMenu";

function read(rel: string): string {
  return stripComments(fs.readFileSync(path.join(process.cwd(), rel), "utf8"));
}

describe("Profiles menu wiring", () => {
  it("the dashboard mounts the menu", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    expect(src).toContain("<ProfilesMenu");
  });

  it("THE MENU IS PINNED, NOT BEHIND THE STUDY LID", () => {
    /*
     * This is the defect this menu shipped with, caught on prod.
     *
     * The menu first went where the three buttons it replaced had been: inside
     * the second toolbar row, which is gated by `studyToolsOpen` and defaults to
     * FALSE. Every test passed and the chip was nowhere on the live chart.
     *
     * That is not a new failure. It is exactly what the Founder reported once
     * already — "the wm pro smartmoney button was taken from the charts and i
     * dont know why" — when e3ce41f moved that whole row behind the same lid.
     *
     * And it bites this menu HARDER than it bit that button. The Smart Money
     * button hid a panel the trader already knew existed. This menu's entire
     * job is to let a trader ENUMERATE what the product owns. A catalogue
     * behind a closed lid catalogues nothing: you cannot discover, from a shut
     * drawer, that the drawer is where discovery lives.
     *
     * So the invariant is positional, because the bug was positional.
     */
    const src = read("src/components/chart/ChartsDashboard.tsx");

    // 1. It is handed to the toolbar as the pinned slot, not rendered inline.
    expect(src).toContain("profilesSlot={");

    // 2. It is not inside the row that defaults closed. The study row opens at
    //    `studyToolsOpen && <div` and runs to the end of the toolbar block, so a
    //    mount that appears BEFORE that opening cannot be inside it.
    const lid = src.indexOf("studyToolsOpen && <div");
    const mount = src.indexOf("<ProfilesMenu");
    expect(lid, "the study-tools lid moved — re-derive this check").toBeGreaterThan(-1);
    expect(mount, "ChartsDashboard no longer mounts ProfilesMenu").toBeGreaterThan(-1);
    expect(
      mount,
      "ProfilesMenu is mounted inside the `studyToolsOpen` row, which defaults to CLOSED — " +
        "the chip will not exist on the live chart until the trader opens a drawer they have " +
        "no reason to know about. Pass it as ChartToolbar's `profilesSlot` instead.",
    ).toBeLessThan(lid);
  });

  it("the toolbar renders the slot INSIDE the always-visible pinned cluster", () => {
    // A slot prop that is accepted and never rendered is the same silence with
    // extra ceremony, so the render site is pinned too — and pinned to the one
    // cluster documented as "always visible, never clipped".
    const src = read("src/components/chart/ChartToolbar.tsx");
    const cluster = src.indexOf("wm-chart-toolbar-pinned");
    const slot = src.indexOf("{profilesSlot}");
    expect(cluster, "the pinned cluster class moved — re-derive this check").toBeGreaterThan(-1);
    expect(slot, "ChartToolbar accepts `profilesSlot` but never renders it").toBeGreaterThan(-1);
    expect(slot, "`profilesSlot` renders outside the pinned cluster").toBeGreaterThan(cluster);
  });

  it("EVERY compiled profile is routed — a catalogue entry with no handler is a dead row", () => {
    // The menu prints what `selectProfileMenu` compiles. If an id reaches the
    // screen with no branch at the wiring site, the trader clicks it and the
    // chart does nothing — a control that lies by responding to nothing.
    const src = read("src/components/chart/ChartsDashboard.tsx");
    const vm = selectProfileMenu({ barsPresent: true, observedAggressorFlow: true, active: {} });
    for (const entry of vm.entries) {
      expect(src, `${entry.id} is in the catalogue but not handled in ChartsDashboard`)
        .toContain(entry.id);
    }
  });

  it("availability is fed from MEASURED facts, not from optimism", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    // Bars RECEIVED, not bars requested.
    expect(src).toMatch(/barsPresent=\{chartBars\.length > 0\}/);
    // A sided print OBSERVED, not a connected socket.
    expect(src).toMatch(/observedAggressorFlow=\{chartFlowSnap\.hasFlow\}/);
  });

  it("THE OLD DOORS STAY CLOSED: the three replaced VP toggle buttons have not grown back", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    // Matches the exact shape those buttons had: a text-only child between the
    // opening `>` and the closing tag.
    for (const label of ["WM Fixed VP", "WM Session VP", "Absorption"]) {
      expect(src, `"${label}" is a standalone toolbar button again — it belongs in the menu`)
        .not.toMatch(new RegExp(`>\\s*${label}\\s*<`));
    }
  });

  it("the menu does not decide anything — the list and the reasons come from the compiler", () => {
    const src = read("src/components/chart/ProfilesMenu.tsx");
    expect(src).toContain("selectProfileMenu(");
    // No second opinion about what can draw.
    expect(src).toContain("entry.availabilityNote");
    expect(src).not.toMatch(/NEEDS_SIDED_TAPE\s*=\s*/);
  });

  it("A CONTROL THAT CANNOT DRAW IS STILL REACHABLE: no `disabled` on the rows", () => {
    // The condition changes DURING a session, and `disabled` removes the row
    // from a screen reader's button list and from a phone's tap targets — one
    // silence becomes two. The reason is printed instead.
    const src = read("src/components/chart/ProfilesMenu.tsx");
    expect(src).not.toMatch(/\bdisabled\b/);
    expect(src).toContain("aria-label");
    expect(src).toContain('aria-checked');
  });
});
