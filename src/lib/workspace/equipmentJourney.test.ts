import { describe, expect, it } from "vitest";

import {
  EQUIPMENT_CLOSED,
  equipmentJourneyReducer as run,
  marketStaysVisible,
  pendingScrollRestore,
  type EquipmentAction,
  type EquipmentJourney,
} from "./equipmentJourney";
import { isRoomEquipment, roomEquipment } from "./roomEquipment";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

const open = (id = "market-reality", decisionId: string | null = "DEC-1"): EquipmentAction => ({
  type: "OPEN",
  equipmentId: id,
  decisionId,
});

const drive = (actions: readonly EquipmentAction[], from: EquipmentJourney = EQUIPMENT_CLOSED) =>
  actions.reduce(run, from);

describe("equipmentJourney — ROOM → WORKSPACE → PREVIEW → DRAWER → ENTER → RETURN", () => {
  it("walks the whole journey and comes back to the exact stage it left", () => {
    // The Founder's acceptance test, as a reduction: preview it, enter it,
    // experience its depth, and return WITHOUT losing your place.
    const drawer = drive([open(), { type: "EXPAND" }]);
    expect(drawer.stage).toBe("drawer");

    const full = run(drawer, { type: "ENTER", scrollY: 812 });
    expect(full.stage).toBe("full");

    const back = run(full, { type: "RETURN" });
    expect(back.stage, "RETURN dropped the trader at preview, not the drawer they left").toBe(
      "drawer",
    );
    expect(back.returnTo).toBeNull();
  });

  it("RETURN from a PREVIEW-entered journey lands on preview, not drawer", () => {
    // The stage is recorded at ENTER, not assumed. If RETURN always went to
    // `drawer`, entering from the compact widget would come back to a working
    // surface the trader never opened — a different room than they left.
    const full = drive([open(), { type: "ENTER", scrollY: 10 }]);
    expect(run(full, { type: "RETURN" }).stage).toBe("preview");
  });

  it("carries ONE decisionId untouched through every stage — no second brain", () => {
    // "Entering a drawer may change the scene. It may never create another
    // semantic brain." The id is captured at OPEN and is the same object at
    // full depth, so FULL is the same projection with more room, not a
    // recompilation that could disagree with the widget beside the chart.
    const states = [
      drive([open("market-reality", "DEC-77")]),
      drive([open("market-reality", "DEC-77"), { type: "EXPAND" }]),
      drive([open("market-reality", "DEC-77"), { type: "EXPAND" }, { type: "ENTER", scrollY: 5 }]),
      drive([
        open("market-reality", "DEC-77"),
        { type: "EXPAND" },
        { type: "ENTER", scrollY: 5 },
        { type: "RETURN" },
      ]),
    ];
    for (const s of states) {
      expect(s.decisionId, `stage ${s.stage} lost the decision`).toBe("DEC-77");
      expect(s.equipmentId, `stage ${s.stage} lost the equipment`).toBe("market-reality");
    }
  });

  it("holds ONE piece of equipment at a time — the card farm cannot re-form", () => {
    // There is no representable state with two ids. A list-shaped state is how
    // a room becomes a permanent card farm one honest feature at a time.
    const after = drive([open("market-reality"), { type: "EXPAND" }, open("other", "DEC-2")]);
    expect(after.equipmentId).toBe("other");
    expect(after.decisionId).toBe("DEC-2");
    expect(after.stage, "re-opening from the Workspace returns to the threshold").toBe("preview");
  });

  it("EXPAND only widens a preview — never demotes the full experience", () => {
    const full = drive([open(), { type: "ENTER", scrollY: 3 }]);
    expect(run(full, { type: "EXPAND" })).toBe(full);
    expect(run(EQUIPMENT_CLOSED, { type: "EXPAND" }), "nothing was chosen to expand").toBe(
      EQUIPMENT_CLOSED,
    );
  });

  it("ENTER from closed is a no-op — full depth of nothing is not a scene", () => {
    expect(run(EQUIPMENT_CLOSED, { type: "ENTER", scrollY: 100 })).toBe(EQUIPMENT_CLOSED);
  });

  it("RETURN outside the full experience is a no-op, not a close", () => {
    // A RETURN that also closed would make the control mean two things
    // depending on where you pressed it.
    const preview = drive([open()]);
    expect(run(preview, { type: "RETURN" })).toBe(preview);
  });

  it("records the scroll offset at ENTER and refuses impossible ones", () => {
    const at = (scrollY: number) =>
      drive([open(), { type: "ENTER", scrollY }]).returnTo?.scrollY;
    expect(at(1280)).toBe(1280);
    // A restore to a position that does not exist is worse than the top: it
    // looks like the room moved on its own.
    expect(at(Number.NaN)).toBe(0);
    expect(at(-40)).toBe(0);
    expect(at(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("returnTo exists ONLY inside the full experience", () => {
    // A lingering returnTo is a promise to restore that nothing will keep.
    expect(drive([open()]).returnTo).toBeNull();
    expect(drive([open(), { type: "EXPAND" }]).returnTo).toBeNull();
    expect(drive([open(), { type: "ENTER", scrollY: 9 }]).returnTo).not.toBeNull();
    expect(drive([open(), { type: "ENTER", scrollY: 9 }, { type: "RETURN" }]).returnTo).toBeNull();
    expect(drive([open(), { type: "ENTER", scrollY: 9 }, { type: "CLOSE" }]).returnTo).toBeNull();
  });

  it("CLOSE puts everything away, from any stage", () => {
    for (const path of [[open()], [open(), { type: "EXPAND" } as const], [open(), { type: "ENTER", scrollY: 1 } as const]]) {
      expect(drive([...path, { type: "CLOSE" }])).toEqual(EQUIPMENT_CLOSED);
    }
  });

  it("the market stays visible everywhere except the full experience", () => {
    expect(marketStaysVisible("preview")).toBe(true);
    expect(marketStaysVisible("drawer"), "a drawer that hides the market is another app").toBe(true);
    expect(marketStaysVisible("closed")).toBe(true);
    expect(marketStaysVisible("full")).toBe(false);
  });

  it("pendingScrollRestore owes a restore exactly once, on the way out of full", () => {
    const full = drive([open(), { type: "EXPAND" }, { type: "ENTER", scrollY: 640 }]);
    expect(pendingScrollRestore(full, run(full, { type: "RETURN" }))).toBe(640);
    // CLOSE also leaves full, and the trader is still owed their place.
    expect(pendingScrollRestore(full, run(full, { type: "CLOSE" }))).toBe(640);
    // Entering owes nothing; restoring on the way IN would fight the overlay.
    const drawer = drive([open(), { type: "EXPAND" }]);
    expect(pendingScrollRestore(drawer, full)).toBeNull();
    expect(pendingScrollRestore(full, full)).toBeNull();
  });
});

describe("roomEquipment — WORKSPACE is the current room's equipment, not a directory", () => {
  it("the market room has real equipment with trader-facing language", () => {
    const list = roomEquipment("/command-deck");
    expect(list.length).toBeGreaterThan(0);
    for (const e of list) {
      expect(e.label.length, e.id).toBeGreaterThan(0);
      expect(e.hint.length, e.id).toBeGreaterThan(0);
      // No implementation vocabulary in Founder-facing chrome.
      expect(
        `${e.label} ${e.hint}`,
        `${e.id} leaks implementation vocabulary into the rail`,
      ).not.toMatch(/panel|compiler|projection|vm\b|selector|House|Garden/i);
    }
  });

  it("never offers an href — equipment cannot become a route", () => {
    // ── REMAPPED 2026-09-19 · THE RULE IS THE ABSENCE, NOT THE ARITY ────────
    // This asserted an EXACT key list, which made it a shape lock rather than
    // the ban it is named for: adding any field at all — including the `kind`
    // that finally stopped the OS frame filling "Tools" with destinations —
    // failed it, while the one thing it exists to forbid was never named.
    //
    // So it now states the ban directly. Equipment may carry whatever the
    // product decides it carries; what it may never carry is a way to travel.
    const ROUTE_LIKE = /^(href|url|route|path|to|link)$/i;
    for (const room of ["/command-deck", INSTRUMENT_VIEW_ROUTE]) {
      const list = roomEquipment(room);
      expect(list.length, room).toBeGreaterThan(0);
      for (const e of list) {
        const routes = Object.keys(e).filter((k) => ROUTE_LIKE.test(k));
        expect(routes, `${room}/${e.id} can navigate — that is a route per invention`).toEqual([]);
        for (const v of Object.values(e)) {
          expect(
            typeof v === "string" && v.startsWith("/"),
            `${room}/${e.id} carries a path-shaped value: ${String(v)}`,
          ).toBe(false);
        }
      }
    }
  });

  it("a room with no equipment yet returns nothing at all", () => {
    // Honest emptiness: the rail renders no heading, rather than a heading
    // over a promise.
    expect(roomEquipment("/journal")).toEqual([]);
    expect(roomEquipment(null)).toEqual([]);
    expect(roomEquipment(undefined)).toEqual([]);
    expect(roomEquipment("/nope")).toEqual([]);
  });

  it("a room keeps its Workspace while a journey is in the URL", () => {
    // The regression this stops: reading the raw href meant the moment the
    // trader opened equipment, the rail's Workspace emptied — the list would
    // disappear at exactly the instant it was being used.
    expect(roomEquipment("/command-deck?equip=market-reality&stage=drawer")).toEqual(
      roomEquipment("/command-deck"),
    );
    expect(roomEquipment("/command-deck#chart")).toEqual(roomEquipment("/command-deck"));
  });

  it("isRoomEquipment refuses an id the room does not have", () => {
    // The stage/equip pair arrives from the URL, where anyone can type.
    expect(isRoomEquipment("/command-deck", "market-reality")).toBe(true);
    expect(isRoomEquipment("/command-deck", "market-realityy")).toBe(false);
    expect(isRoomEquipment("/journal", "market-reality")).toBe(false);
    expect(isRoomEquipment("/command-deck", null)).toBe(false);
    expect(isRoomEquipment("/command-deck", "")).toBe(false);
  });
});
