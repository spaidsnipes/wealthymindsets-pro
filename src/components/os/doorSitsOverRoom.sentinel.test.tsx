/**
 * SENTINEL — AN OPEN DOOR SITS OVER THE WHOLE ROOM, AND THE HEADLINE STEPS PAST IT.
 *
 * ── THE MEASUREMENT THIS PINS ──────────────────────────────────────────────
 *
 * Live /charts, 1905px desktop, NQ1! 15m, 2026-09-25, Workspace door open.
 * Four pieces of chart chrome misbehaved against the 264px sheet:
 *
 *   D data-window toggle (MainChart, zIndex 70) ... printed beside "MODE"
 *   "Vol 16" volume footer label .................. printed on the Draw card
 *   Question Lens "ASK · Auto · …" row ............ printed on Review / Draw
 *   price legend headline "NQ1! · 15m · 30741.25"  hidden UNDER the sheet
 *
 * ONE RULE covers the first three: the room is sealed into a single stacking
 * layer beneath an open door, so no z-index inside it can out-rank the door.
 * The fourth is the one piece the trader must still READ, so it is told where
 * the door ends and steps past it — no second price owner inside the door.
 *
 * ── WHY SOURCE AND NOT A BROWSER ───────────────────────────────────────────
 *
 * No DOM environment in this repo, and the door only exists after a click
 * (`setScenePanel`), so `renderToStaticMarkup` can see the CLOSED frame only.
 * The closed half is rendered; the open half is read from comment-stripped
 * source, length-anchored so a slice that misses its boundaries cannot pass
 * vacuously. The pixel proof is the orchestrator's screenshot on the live
 * site (see the session click script).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { stripComments } from "@/lib/sourceScan";
import { WMOperatingSystem } from "./WMOperatingSystem";
import { ClearOfOpenDoor } from "./ClearOfOpenDoor";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";

const read = (rel: string): string => stripComments(readFileSync(join(process.cwd(), rel), "utf8"));

const OS = read("src/components/os/WMOperatingSystem.tsx");
const CHART = read("src/components/chart/MainChart.tsx");
const BAND = read("src/components/os/ClearOfOpenDoor.tsx");

/** `<main data-testid="os-room" … </main>` — throws rather than returning "". */
function mainElement(src: string): string {
  const open = src.indexOf('data-testid="os-room"');
  if (open < 0) throw new Error("no os-room <main> in the frame source");
  const start = src.lastIndexOf("<main", open);
  const end = src.indexOf("</main>", open);
  if (start < 0 || end < 0) throw new Error("os-room has no <main> boundaries");
  return src.slice(start, end);
}

describe("the room is sealed beneath an open door (D toggle, Vol label, ASK row)", () => {
  it("<main> isolates exactly while a door is over it", () => {
    const main = mainElement(OS);
    expect(main.length).toBeGreaterThan(400);
    expect(
      main,
      "the room is no longer sealed under an open door — any chart z-index above the door's (the D toggle's 70) prints on the sheet again",
    ).toMatch(/isolation:\s*doorOverRoom\s*\?\s*"isolate"\s*:\s*undefined/);
  });

  it("'a door is over the room' means an equipment-mode panel is open — every panel, not one", () => {
    // Workspace, Tools, Rooms and Community share ONE pinned sheet in
    // equipment mode, so the rule must key on "any panel", not on Workspace.
    expect(OS).toMatch(/const doorOverRoom = equipmentMode && scenePanel !== null;/);
  });

  it("the door itself is the pinned overlay the room is sealed beneath", () => {
    // If the sheet stopped being a positioned layer with a z-index, sealing
    // the room would put the room OVER the door instead.
    expect(OS).toMatch(/position: "absolute" as const,\s*left: 0,\s*top: 0,\s*bottom: 0,\s*zIndex: 40,/);
    expect(OS).toMatch(/<nav\s+ref=\{doorRef\}\s+className="wm-os-rail"/);
  });

  it("a CLOSED frame carries no isolation — a room with no door open stacks as it always did", () => {
    const html = renderToStaticMarkup(
      <WMOperatingSystem
        activeHref="/charts"
        surface="Charts"
        destinations="equipment"
        openEvidenceItems={null}
        rightOfWay="UNKNOWN"
        rightOfWayResolved={false}
        feed={FEEDLESS_SURFACE}
      >
        <div>room</div>
      </WMOperatingSystem>,
    );
    const at = html.indexOf('data-testid="os-room"');
    expect(at).toBeGreaterThan(0);
    const tag = html.slice(html.lastIndexOf("<main", at), html.indexOf(">", at));
    expect(tag).toContain("overflow:auto");
    expect(tag).not.toContain("isolation");
  });
});

describe("the legend headline steps past the open door (symbol + price stay readable)", () => {
  it("the frame announces the door's right edge while open, and retracts it on close", () => {
    expect(OS).toMatch(/announceOpenDoorEdge\(doorRef\.current\?\.getBoundingClientRect\(\)\.right \?\? null\)/);
    expect(OS).toMatch(/announceOpenDoorEdge\(null\);\s*\};\s*\}, \[doorOverRoom\]\);/);
  });

  it("the price legend band is a ClearOfOpenDoor — the same band, not a second headline", () => {
    expect(CHART.length).toBeGreaterThan(10000);
    expect(
      CHART,
      "MainChart's price legend band is no longer door-aware — the headline hides under an open Workspace door again",
    ).toMatch(
      /<ClearOfOpenDoor\s+style=\{\{\s*position: "absolute", top: 0, left: 0, right: 0, height: PRICE_LEGEND_OVERLAY_H,/,
    );
    // Exactly one: a second door-aware legend would be a second price owner.
    expect(CHART.match(/<ClearOfOpenDoor\b/g) ?? []).toHaveLength(1);
  });

  it("the band measures its OWN pane against the announced edge (split layouts are not pushed)", () => {
    expect(BAND).toMatch(/offsetParent/);
    expect(BAND).toMatch(/doorInsetFor\(edge, r\.left, r\.width\)/);
    expect(BAND).toMatch(/subscribeOpenDoorEdge\(measure\)/);
  });

  it("with no door open the band renders byte-identical to the plain div it replaced", () => {
    const style = { position: "absolute" as const, top: 0, left: 0, right: 0, height: 28, zIndex: 20 };
    const band = renderToStaticMarkup(
      <ClearOfOpenDoor style={style} className="flex items-center gap-4 px-3">
        <span>NQ1!</span>
      </ClearOfOpenDoor>,
    );
    const plain = renderToStaticMarkup(
      <div style={style} className="flex items-center gap-4 px-3">
        <span>NQ1!</span>
      </div>,
    );
    expect(band).toBe(plain);
  });
});
