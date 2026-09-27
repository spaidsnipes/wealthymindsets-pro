/**
 * GARDEN 16 §46 · A CAMERA NEVER EATS THE TRADER'S OWN ARRANGEMENT — 2026-09-27.
 *
 * Serving 3c65fee7 (TSLA 5m): Workspace › Regime camera over a CUSTOM stack put
 * the stack down and the rail offered no way back. The room now publishes the
 * arrangement a camera replaces; the Workspace door offers "↩ Your arrangement"
 * through the saved-layout apply path (same compiler, same locks).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { announceOwnArrangement, announcedOwnArrangement } from "./equipmentChannel";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const ROOM = read("src/components/chart/ChartsDashboard.tsx");
const DOOR = read("src/components/os/SavedLayoutsDoor.tsx");

describe("the trader's own arrangement", () => {
  it("the channel remembers the last published arrangement and forgets on null", () => {
    announceOwnArrangement({ DERIVATIVES_PRESSURE: true, LIQUIDITY_WEATHER: true });
    expect(announcedOwnArrangement()).toEqual({ DERIVATIVES_PRESSURE: true, LIQUIDITY_WEATHER: true });
    announceOwnArrangement(null);
    expect(announcedOwnArrangement()).toBeNull();
  });

  it("the room captures at the ONE desk door, only for a named camera pressed while no desk is in force", () => {
    const door = ROOM.slice(ROOM.indexOf("arrangementDeskRef.current = (desk: ArrangementId | SavedLayoutRequest) => {"), ROOM.indexOf("useEffect(() => subscribeSavedLayoutRequests("));
    expect(door).toContain('if (typeof desk === "string" && arrangementVM.activeId === null) {');
    expect(door).toContain("const own = captureArrangement(arrangementMenu);");
    expect(door.indexOf("announceOwnArrangement(own)")).toBeLessThan(door.indexOf("applyRespectingLocks("));
    expect(ROOM.match(/announceOwnArrangement\(/g) ?? []).toHaveLength(2); // the capture + the room's leave
  });

  it("the room withdraws it when it leaves", () => {
    expect(ROOM).toContain("announceArrangementCapture(null);\n    announceOwnArrangement(null);");
  });

  it("the door offers it back through requestSavedLayout, and only while the chart is arranged otherwise", () => {
    expect(DOOR).toContain("{own && capture && !savedArrangementInForce(own, capture) ? (");
    expect(DOOR).toContain('onClick={() => requestSavedLayout({ layoutId: "own-arrangement", switches: own })}');
  });
});
