/**
 * TOOL DOOR — Active Tools' Configure deep-links to the tool's family door
 * (Drive Garden 18 snapshot 10-02 §B5, 2026-10-07). `document` is a plain
 * EventTarget here: the owner only needs an event bus.
 */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { selectProfileMenu } from "@/lib/marketData/viewModels/selectProfileMenu";
import { EQUIPMENT_EVENT, type EquipmentRequest } from "./equipmentChannel";
import { familyDoorFor, openToolDoor, subscribeToolDoor, takePendingToolDoor, TOOL_DOOR_HOLD_MS } from "./toolDoor";

const g = globalThis as unknown as { document?: unknown };
const original = g.document;
beforeEach(() => { g.document = new EventTarget(); });
afterEach(() => { takePendingToolDoor(() => true, 0); g.document = original; });

describe("which door holds a tool", () => {
  it("every catalogue reading has a door: order-flow readings → the W, profiles and lenses → Chart tools", () => {
    const entries = selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active: {} }).entries;
    for (const e of entries) expect(familyDoorFor(e.id), e.id).not.toBeNull();
    expect(familyDoorFor("ABSORPTION")).toBe("order-flow");
    expect(familyDoorFor("TPO_PROFILE")).toBe("chart-tools");
    expect(familyDoorFor("FP_delta")).toBe("order-flow");
  });
  it("a finder-only instrument has no door — Configure falls back to its card", () => {
    expect(familyDoorFor("SESSION_BANDS")).toBeNull();
    expect(openToolDoor("SESSION_BANDS")).toBe(false);
  });
});

describe("open → the door is picked up and the row is asked for", () => {
  it("picks the door up through the rail's own equipment event and tells mounted doors", () => {
    const picked: EquipmentRequest[] = [];
    (g.document as EventTarget).addEventListener(EQUIPMENT_EVENT, (e) => picked.push((e as CustomEvent<EquipmentRequest>).detail));
    const heard: string[] = [];
    const off = subscribeToolDoor((id) => heard.push(id));
    expect(openToolDoor("ABSORPTION", 1000)).toBe(true);
    expect(picked).toEqual([{ equipmentId: "order-flow", intent: "pick-up" }]);
    expect(heard).toEqual(["ABSORPTION"]);
    off();
  });

  it("a door that MOUNTS after the press takes the request once, only if it holds the row and only while fresh", () => {
    openToolDoor("TPO_PROFILE", 1000);
    expect(takePendingToolDoor((id) => id === "ABSORPTION", 1100)).toBeNull();
    expect(takePendingToolDoor((id) => id === "TPO_PROFILE", 1100)).toBe("TPO_PROFILE");
    expect(takePendingToolDoor(() => true, 1100)).toBeNull();
    openToolDoor("TPO_PROFILE", 1000);
    expect(takePendingToolDoor(() => true, 1000 + TOOL_DOOR_HOLD_MS + 1)).toBeNull();
  });

  it("is inert on the server", () => {
    g.document = undefined;
    expect(openToolDoor("ABSORPTION")).toBe(false);
    expect(() => subscribeToolDoor(() => {})()).not.toThrow();
  });
});

describe("the doors listen; Configure uses the owner", () => {
  it("ProfilesMenu takes the request and brings its own row forward", () => {
    const src = readFileSync("src/components/chart/ProfilesMenu.tsx", "utf8");
    expect(src).toContain("takePendingToolDoor(holds)");
    expect(src).toContain("subscribeToolDoor(");
    expect(src).toMatch(/querySelector<HTMLElement>\(`\[data-profile-id="\$\{id\}"\]`\)/);
  });
  it("Active Tools' Configure opens the door, falling back to the card only when none holds the tool", () => {
    const src = readFileSync("src/components/chart/ActiveToolsPanel.tsx", "utf8");
    expect(src).toContain("onClick={() => { if (!openDoor(id)) onConfigure(id); }}");
    expect(src).toContain("openDoor = openToolDoor");
  });
});
