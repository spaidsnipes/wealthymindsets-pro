/**
 * THE COMMAND DECK IS EQUIPMENT OF THE MARKET CAMERA — registered once, in
 * neither hand, opening at its drawer. 2026-09-26, Garden 16 §10 + §11.
 */
import { describe, expect, it } from "vitest";

import {
  COMMAND_DECK_EQUIPMENT_ID,
  COMMAND_DECK_REGION_ID,
  allRoomEquipmentIds,
  isJourneyEquipment,
  journeyOpensAtDrawer,
  roomEquipment,
  roomEquipmentOfKind,
} from "./roomEquipment";
import { readJourneyFromUrl } from "./equipmentChannel";
import { EQUIPMENT_CLOSED, equipmentJourneyReducer } from "./equipmentJourney";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { ACTIVATOR_GLYPHS, EQUIPMENT_GLYPHS } from "@/components/os/equipmentGlyphs";

describe("the Command Deck in the equipment registry", () => {
  it("/charts declares exactly ONE deck — the control has one drawer to name", () => {
    const decks = roomEquipmentOfKind(INSTRUMENT_VIEW_ROUTE, "deck");
    expect(decks.map((d) => d.id)).toEqual([COMMAND_DECK_EQUIPMENT_ID]);
    expect(COMMAND_DECK_EQUIPMENT_ID).toBe("command-deck");
    expect(COMMAND_DECK_REGION_ID).toBe("wm-command-deck");
  });

  it("it is a holdable journey tenant — not direct, not a momentary command", () => {
    const deck = roomEquipment(INSTRUMENT_VIEW_ROUTE).find((e) => e.id === COMMAND_DECK_EQUIPMENT_ID)!;
    expect(deck.direct).toBeFalsy();
    expect(deck.momentary).toBeFalsy();
    expect(deck.unbuilt).toBeUndefined();
    expect(isJourneyEquipment(INSTRUMENT_VIEW_ROUTE, COMMAND_DECK_EQUIPMENT_ID)).toBe(true);
  });

  it("it is in NEITHER hand — never a Workspace or Tools tile", () => {
    for (const hand of ["workspace", "lens"] as const) {
      expect(roomEquipmentOfKind(INSTRUMENT_VIEW_ROUTE, hand).map((e) => e.id)).not.toContain(
        COMMAND_DECK_EQUIPMENT_ID,
      );
    }
  });

  it("only the market camera has one — the legacy deck room does not hold a deck of itself", () => {
    expect(roomEquipmentOfKind("/command-deck", "deck")).toEqual([]);
    expect(roomEquipmentOfKind("/journal", "deck")).toEqual([]);
  });

  it("a control surface opens at its DRAWER; every reading keeps its threshold", () => {
    expect(journeyOpensAtDrawer(INSTRUMENT_VIEW_ROUTE, COMMAND_DECK_EQUIPMENT_ID)).toBe(true);
    for (const e of roomEquipment(INSTRUMENT_VIEW_ROUTE)) {
      if (e.id === COMMAND_DECK_EQUIPMENT_ID) continue;
      expect(journeyOpensAtDrawer(INSTRUMENT_VIEW_ROUTE, e.id), e.id).toBe(false);
    }
    for (const e of roomEquipment("/command-deck")) {
      expect(journeyOpensAtDrawer("/command-deck", e.id), e.id).toBe(false);
    }
    expect(journeyOpensAtDrawer(INSTRUMENT_VIEW_ROUTE, null)).toBe(false);
    expect(journeyOpensAtDrawer("/journal", COMMAND_DECK_EQUIPMENT_ID)).toBe(false);
  });

  it("OPEN then EXPAND — the two actions the journey dispatches — land at the drawer", () => {
    const opened = equipmentJourneyReducer(EQUIPMENT_CLOSED, {
      type: "OPEN",
      equipmentId: COMMAND_DECK_EQUIPMENT_ID,
      decisionId: "dec-1",
    });
    const expanded = equipmentJourneyReducer(opened, { type: "EXPAND" });
    expect(expanded.stage).toBe("drawer");
    expect(expanded.equipmentId).toBe(COMMAND_DECK_EQUIPMENT_ID);
    expect(expanded.decisionId).toBe("dec-1");
  });

  it("a shared link names it, and the address carries no route of its own", () => {
    expect(readJourneyFromUrl("?symbol=TSLA&tf=1D&equip=command-deck&stage=drawer")).toMatchObject({
      equipmentId: COMMAND_DECK_EQUIPMENT_ID,
      stage: "drawer",
    });
  });

  it("the label says WHOSE deck it is, and is not the legacy destination's bare name", () => {
    const deck = roomEquipment(INSTRUMENT_VIEW_ROUTE).find((e) => e.id === COMMAND_DECK_EQUIPMENT_ID)!;
    expect(deck.label).toBe("Your command deck");
    expect(deck.label.toLowerCase()).not.toBe("command deck");
    expect(deck.label.toLowerCase()).toContain("command deck");
  });

  it("the masthead mark and the registry mark are the SAME drawing", () => {
    expect(allRoomEquipmentIds()).toContain(COMMAND_DECK_EQUIPMENT_ID);
    expect(EQUIPMENT_GLYPHS[COMMAND_DECK_EQUIPMENT_ID]).toBeDefined();
    expect(EQUIPMENT_GLYPHS[COMMAND_DECK_EQUIPMENT_ID]).toBe(ACTIVATOR_GLYPHS.deck);
  });
});
