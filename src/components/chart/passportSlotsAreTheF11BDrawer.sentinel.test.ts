/**
 * THE PASSPORT IS THE F11B DRAWER — and every slot has one owner.
 *
 * Plate: `WM_NewMockup_85_F11B_Passport_Drawer` (2026-09-26). The drawer's
 * rows are BIRTH SOURCE · AGE · TOUCHES · DEFENSES · CONSUMPTION · DECAY ·
 * INVALIDATION · FIDELITY, and its footer PASSPORT ID · INSPECTED. The slots
 * are compiled once (`selectPassportSlots`) and rendered, never hand-written
 * in the drawer: a hand-written row is how a slot ends up with no owner and a
 * number nobody measured.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { PASSPORT_SLOT_ORDER, PASSPORT_SLOT_TITLES } from "@/lib/marketData/viewModels/selectPassportSlots";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));

const TICKET = read("src/components/chart/ChartInspectTicket.tsx");
const SLOTS = read("src/lib/marketData/viewModels/selectPassportSlots.ts");
const LIFECYCLE = read("src/lib/marketData/viewModels/selectZoneLifecycle.ts");

/** The drawer's own source: from the slot row to the ticket's export. */
const DRAWER = TICKET.slice(TICKET.indexOf("function PassportSlotRow("), TICKET.indexOf("export function ChartInspectTicket("));

describe("the Passport is the F11B drawer", () => {
  it("the eight slots, in the plate's order", () => {
    expect([...PASSPORT_SLOT_ORDER]).toEqual([
      "BIRTH_SOURCE", "AGE", "TOUCHES", "DEFENSES", "CONSUMPTION", "DECAY", "INVALIDATION", "FIDELITY",
    ]);
    expect(PASSPORT_SLOT_ORDER.map(id => PASSPORT_SLOT_TITLES[id])).toEqual([
      "BIRTH SOURCE", "AGE", "TOUCHES", "DEFENSES", "CONSUMPTION", "DECAY", "INVALIDATION", "FIDELITY",
    ]);
  });

  it("the selector returns the slots in that order and nowhere else builds one", () => {
    expect(SLOTS).toContain("const slots = [birthSource, age, touches, defenses, consumption, decay, invalidation, fidelity];");
    expect(DRAWER).toContain("{vm.slots.map(s => <PassportSlotRow key={s.id} s={s} />)}");
    // No slot title is typed into the drawer by hand.
    for (const title of Object.values(PASSPORT_SLOT_TITLES)) {
      if (title === "AGE") continue; // too short to be distinctive; covered by the render test
      expect(DRAWER).not.toContain(`>${title}<`);
    }
  });

  it("a ZONE and a LEVEL open the SAME drawer", () => {
    expect(TICKET).toContain("if (selectedZone || selectedLevel) {");
    expect(TICKET.match(/<PassportDrawer\b/g)?.length).toBe(1);
    expect(TICKET).not.toContain("INVALIDATION CONDITION");
    expect(TICKET).not.toContain("SOURCE FIDELITY");
  });

  it("the footer: PASSPORT ID · INSPECTED AS OF · DECISION, after the slots", () => {
    const slotsAt = DRAWER.indexOf('data-testid="passport-slots"');
    const footerAt = DRAWER.indexOf('data-testid="passport-footer"');
    expect(slotsAt).toBeGreaterThan(-1);
    expect(footerAt).toBeGreaterThan(slotsAt);
    const footer = DRAWER.slice(footerAt);
    expect(footer.indexOf("PASSPORT ID:")).toBeGreaterThan(-1);
    expect(footer.indexOf("INSPECTED AS OF:")).toBeGreaterThan(footer.indexOf("PASSPORT ID:"));
    expect(footer.indexOf("DECISION:")).toBeGreaterThan(footer.indexOf("INSPECTED AS OF:"));
  });

  it("status marks take the palette owner's tones — no hex in the drawer's slot row", () => {
    const row = DRAWER.slice(0, DRAWER.indexOf("function PassportDrawer("));
    expect(row).toContain("wmToneColor(PASSPORT_TONE[s.status])");
    expect(row).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(SLOTS).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });

  it("CONSUMPTION is the lifecycle owner's measure, and a slot never grades", () => {
    expect(LIFECYCLE).toContain("deepestPenetration:");
    expect(SLOTS).toContain("const depth = lc?.deepestPenetration ?? null;");
    expect(SLOTS).not.toMatch(/Math\.random|Date\.now\(/);
    expect(SLOTS).not.toMatch(/["'`][^"'`]*\b(Strong|Weak|High probability|strength)\b/);
  });

  it("the drawer stands on the wall away from the object, measured from its pin", () => {
    expect(DRAWER).toContain("passportDockSide({ objectX: x, paneWidth: hr.width");
    expect(DRAWER).toContain("[data-market-object-target=");
    expect(DRAWER).toContain('dock === "RIGHT" ? "right-[76px]" : "left-2"');
  });
});
