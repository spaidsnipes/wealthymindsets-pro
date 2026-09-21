/**
 * SENTINEL — EVERY DECLARED EQUIPMENT HAS A DRAWN MARK.
 *
 * The drawer draws tiles now, and a tile without its glyph is not a smaller
 * tile: it is a hole where the trader's eye was taught to look. The failure
 * mode this guards is the one that never announces itself — someone adds a
 * reading to `roomEquipment.ts`, ships it, and it wears nothing.
 *
 * It also runs the other way. A glyph keyed to an id no room hands out is dead
 * paint carried forever by everyone who reads this file looking for the live
 * set, which is how a map becomes untrustworthy without becoming wrong.
 */
import { describe, expect, it } from "vitest";

import { EQUIPMENT_GLYPHS, equipmentGlyph } from "./equipmentGlyphs";
import { allRoomEquipmentIds } from "@/lib/workspace/roomEquipment";

describe("equipment glyphs are exhaustive over declared equipment", () => {
  it("names at least the equipment the product ships today", () => {
    // A floor, so an accidental emptying of either side cannot pass by making
    // both sets vacuously equal.
    expect(allRoomEquipmentIds().length).toBeGreaterThanOrEqual(12);
  });

  it("draws every id `roomEquipment` declares", () => {
    const missing = allRoomEquipmentIds().filter((id) => equipmentGlyph(id) === null);
    expect(missing, `equipment with no drawn mark: ${missing.join(", ")}`).toEqual([]);
  });

  it("draws nothing no room hands out", () => {
    const declared = new Set(allRoomEquipmentIds());
    const orphans = Object.keys(EQUIPMENT_GLYPHS).filter((id) => !declared.has(id));
    expect(orphans, `glyphs for equipment no room has: ${orphans.join(", ")}`).toEqual([]);
  });
});
