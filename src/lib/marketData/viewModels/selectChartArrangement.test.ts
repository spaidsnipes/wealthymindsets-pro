/**
 * Tests for the arrangement compiler.
 *
 * The interesting assertions here are the ones that read the LIVE profile
 * catalogue rather than a fixture — `everyArmedProfileExists`,
 * `everyArmedProfileIsToggleable`, and the desk-distinctness check. A test that
 * hardcodes the arrangement contents proves the arithmetic; only a test that
 * cross-reads `selectProfileMenu` can notice that a desk started claiming a
 * reading the product no longer ships, or one that cannot be switched on.
 */

import { describe, expect, it } from "vitest";

import { selectProfileMenu, type ProfileId } from "./selectProfileMenu";
import {
  selectChartArrangement,
  arrangementSwitches,
  ARRANGEMENT_SPECS,
  type ArrangementId,
} from "./selectChartArrangement";

/** A chart with bars and a tape that states an aggressor side — the best case. */
const menuOn = (active: Readonly<Partial<Record<ProfileId, boolean>>> = {}) =>
  selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: true, active });

/** Bars, but a tape that never states a side — the ORDINARY futures case. */
const menuMute = (active: Readonly<Partial<Record<ProfileId, boolean>>> = {}) =>
  selectProfileMenu({ barsPresent: true, printsPresent: true, observedAggressorFlow: false, active });

/** No bars at all — a symbol that has not loaded. */
const menuEmpty = (active: Readonly<Partial<Record<ProfileId, boolean>>> = {}) =>
  selectProfileMenu({ barsPresent: false, printsPresent: false, observedAggressorFlow: false, active });

const vm = (menu: ReturnType<typeof menuOn>) => selectChartArrangement({ menu });

describe("the desks are real — cross-read against the shipped profile catalogue", () => {
  it("compiles a non-empty set of arrangements", () => {
    // Vacuity guard. Every test below reasons over `entries`; if the compiler
    // returned none they would all pass for the boring reason.
    expect(vm(menuOn()).entries.length).toBe(ARRANGEMENT_SPECS.length);
    expect(ARRANGEMENT_SPECS.length).toBeGreaterThan(0);
  });

  it("every armed profile is one the product actually ships", () => {
    const known = new Set(menuOn().entries.map(e => e.id));
    for (const spec of ARRANGEMENT_SPECS) {
      // CLEAN is the deliberate exception (REMODELLED 2026-09-22): the empty
      // desk arms nothing BY NAME. Every OTHER desk still may not.
      if (spec.id !== "CLEAN") {
        expect(spec.arms.length, `${spec.id} arms nothing`).toBeGreaterThan(0);
      }
      for (const id of spec.arms) {
        expect(
          known.has(id),
          `${spec.id} arms "${id}", which selectProfileMenu does not publish. ` +
            `Either the profile was renamed or removed. A desk that names a ` +
            `reading nobody owns is a menu entry for a feature that does not exist.`,
        ).toBe(true);
      }
    }
  });

  it("every armed profile can be switched on — no desk arms a DRAW gesture", () => {
    const gestureOf = new Map(menuOn().entries.map(e => [e.id, e.gesture] as const));
    for (const spec of ARRANGEMENT_SPECS) {
      for (const id of spec.arms) {
        expect(
          gestureOf.get(id),
          `${spec.id} arms "${id}", whose gesture is DRAW. An arrangement is a ` +
            `set of switch positions, and no switch position constitutes "a box ` +
            `has been dragged". This desk would report an armed reading that ` +
            `pressing it cannot actually arm.`,
        ).toBe("TOGGLE");
      }
    }
  });

  it("no two desks are the same desk", () => {
    // If two specs armed identical sets, `active` would be true for both and
    // `activeId` would silently pick whichever came first.
    const seen = new Map<string, ArrangementId>();
    for (const spec of ARRANGEMENT_SPECS) {
      const key = [...spec.arms].sort().join("|");
      const prior = seen.get(key);
      expect(
        prior,
        `${spec.id} and ${prior} arm exactly the same readings, so the chart ` +
          `can never tell which desk it is at.`,
      ).toBeUndefined();
      seen.set(key, spec.id);
    }
  });
});

describe("readiness is measured against the tape, not assumed", () => {
  it("REGIME is fully deliverable even when the tape states no side", () => {
    // This is the load-bearing claim of the whole design: there is somewhere
    // for a trader on a mute tape to go. If REGIME ever needs sided tape, the
    // arrangement set has to be re-derived, not patched.
    const regime = vm(menuMute()).entries.find(e => e.id === "REGIME")!;
    expect(regime.readiness).toBe("FULL");
    expect(regime.deliverableCount).toBe(regime.armedCount);
  });

  it("ORDER FLOW is only PARTIAL on a tape with no aggressor side", () => {
    const of = vm(menuMute()).entries.find(e => e.id === "ORDER_FLOW")!;
    expect(of.readiness).toBe("PARTIAL");
    // Absorption tiers down to plain traded volume, so exactly one survives.
    expect(of.deliverableCount).toBeGreaterThan(0);
    expect(of.deliverableCount).toBeLessThan(of.armedCount);
  });

  it("ORDER FLOW is FULL once the tape states a side", () => {
    const of = vm(menuOn()).entries.find(e => e.id === "ORDER_FLOW")!;
    expect(of.readiness).toBe("FULL");
    expect(of.deliverableCount).toBe(of.armedCount);
  });

  it("with no bars at all, every desk that arms a reading reports NONE", () => {
    for (const e of vm(menuEmpty()).entries) {
      if (e.arms.length === 0) continue; // CLEAN — held to its own truth below
      expect(e.readiness, `${e.id} claims to draw on a chart with no bars`).toBe("NONE");
      expect(e.deliverableCount).toBe(0);
    }
  });

  it("CLEAN is FULL on every tape — including a chart with no bars", () => {
    // Clean promises "just the market", and an empty chart can keep that
    // promise. NONE would tell the trader the tape cannot answer a question
    // Clean never asks.
    for (const menu of [menuOn(), menuMute(), menuEmpty()]) {
      const clean = vm(menu).entries.find(e => e.id === "CLEAN")!;
      expect(clean.readiness).toBe("FULL");
      expect(clean.armedCount).toBe(0);
    }
  });
});

describe("the note tells the trader whether waiting would help", () => {
  it("names the readings that cannot draw, rather than only counting them", () => {
    const of = vm(menuMute()).entries.find(e => e.id === "ORDER_FLOW")!;
    const menu = menuMute();
    for (const id of of.arms) {
      const entry = menu.entries.find(e => e.id === id)!;
      if (entry.availability === "READY") continue;
      expect(
        of.note,
        `${id} cannot draw but "${entry.label}" is absent from the note. A ` +
          `trader told "1 of 5" without being told WHICH four has been handed ` +
          `a riddle instead of an answer.`,
      ).toContain(entry.label);
    }
  });

  it("says DO NOT WAIT when the tape is the problem", () => {
    const of = vm(menuMute()).entries.find(e => e.id === "ORDER_FLOW")!;
    expect(of.note).toMatch(/aggressor side/i);
  });

  it("says WAIT when bars are the problem", () => {
    const of = vm(menuEmpty()).entries.find(e => e.id === "ORDER_FLOW")!;
    expect(of.note).toMatch(/no bars have loaded/i);
  });

  it("every note any state can produce is a well-formed sentence", () => {
    // Same shape rule the profiles note is held to, and for the same reason: a
    // full stop followed by a lowercase letter shipped to production once
    // already, and 25 `toContain` assertions could not see it.
    for (const menu of [menuOn(), menuMute(), menuEmpty()]) {
      for (const e of selectChartArrangement({ menu }).entries) {
        expect(e.note, `no sentence ends this note: ${e.note}`).toMatch(/\.$/);
        expect(
          e.note,
          `a full stop is followed by a lowercase letter, so two sentences ` +
            `were joined as if one were a fragment: ${e.note}`,
        ).not.toMatch(/\.\s+[a-z]/);
        expect(e.note[0], `the note opens lowercase: ${e.note}`).not.toMatch(/[a-z]/);
      }
    }
  });
});

describe("the chart knows which desk it is at", () => {
  /**
   * REMODELLED 2026-09-22. This test used to pin all-toggles-off as CUSTOM
   * ("it is not any of the three desks"). The HOUSE PLAN bolt-on names FOUR
   * desks — "CLEAN / ORDER FLOW / REGIME / REVIEW" — and all-off IS the first
   * of them. CUSTOM keeps its meaning for genuinely unnamed mixtures.
   */
  it("every toggle off is CLEAN — the bolt-on's first desk, not an anonymous state", () => {
    const out = vm(menuOn({}));
    expect(out.activeId).toBe("CLEAN");
    expect(out.declaration).toBe("WORKSPACE: CLEAN");
  });

  it("reports CUSTOM when the switches match no desk", () => {
    // A hand-flipped mixture: ABSORPTION alone is no desk's exact switch set
    // (REVIEW needs SESSION on with it; ORDER FLOW needs four more).
    const out = vm(menuOn({ ABSORPTION: true }));
    expect(out.activeId).toBeNull();
    expect(out.declaration).toBe("WORKSPACE: CUSTOM");
  });

  it("recognises a desk when the switches match it exactly", () => {
    for (const spec of ARRANGEMENT_SPECS) {
      const switches = arrangementSwitches(spec.id, menuOn());
      const out = vm(menuOn(switches));
      expect(
        out.activeId,
        `applying ${spec.id}'s own switches did not put the chart at ${spec.id}`,
      ).toBe(spec.id);
    }
  });

  it("at most one desk is ever active at once", () => {
    for (const spec of ARRANGEMENT_SPECS) {
      const out = vm(menuOn(arrangementSwitches(spec.id, menuOn())));
      expect(out.entries.filter(e => e.active).length).toBe(1);
    }
  });

  it("one extra switch is enough to leave the desk", () => {
    const regimeSwitches = arrangementSwitches("REGIME", menuOn());
    const out = vm(menuOn({ ...regimeSwitches, ABSORPTION: true }));
    expect(
      out.activeId,
      "the chart still claims to be at REGIME after the trader armed a reading " +
        "REGIME does not include. The declaration would be describing a desk " +
        "the trader is not sitting at.",
    ).toBeNull();
  });
});

describe("the declaration is printable chrome, not a debug string", () => {
  it("carries the deliverable count when the desk cannot be fully drawn", () => {
    const out = vm(menuMute(arrangementSwitches("ORDER_FLOW", menuMute())));
    expect(out.activeId).toBe("ORDER_FLOW");
    expect(
      out.declaration,
      "the chart declares ORDER FLOW on a tape that can draw only four of its " +
        "seven readings, with no indication that three are mute. That is the " +
        "beautiful lie this compiler exists to prevent.",
    ).toMatch(/4 OF 7 DRAWING/);
  });

  it("stays clean when the desk is fully deliverable", () => {
    const out = vm(menuOn(arrangementSwitches("ORDER_FLOW", menuOn())));
    expect(out.declaration).toBe("WORKSPACE: ORDER FLOW");
  });

  it("always opens with WORKSPACE, in every reachable state", () => {
    const states = [menuOn, menuMute, menuEmpty];
    for (const make of states) {
      for (const spec of [...ARRANGEMENT_SPECS.map(s => s.id), null]) {
        const base = make();
        const active = spec ? arrangementSwitches(spec, base) : {};
        const out = vm(make(active));
        expect(out.declaration.startsWith("WORKSPACE: ")).toBe(true);
        expect(out.declaration).toBe(out.declaration.trim());
      }
    }
  });
});

describe("arrangementSwitches hands back a complete, honest switch set", () => {
  it("turns OFF every toggle the desk does not arm", () => {
    const menu = menuOn();
    const switches = arrangementSwitches("REGIME", menu);
    for (const e of menu.entries) {
      if (e.gesture !== "TOGGLE") continue;
      const expected = ["FIXED_RANGE", "SESSION"].includes(e.id);
      expect(
        switches[e.id],
        `${e.id} was left ${switches[e.id]} by REGIME. A desk that only turns ` +
          `things ON accumulates the previous desk's layers, so the chart ` +
          `drifts further from its declaration with every press.`,
      ).toBe(expected);
    }
  });

  it("never writes a value for a DRAW profile", () => {
    const menu = menuOn();
    const drawIds = menu.entries.filter(e => e.gesture === "DRAW").map(e => e.id);
    expect(drawIds.length, "no DRAW profile in the catalogue to test against")
      .toBeGreaterThan(0);
    for (const spec of ARRANGEMENT_SPECS) {
      const switches = arrangementSwitches(spec.id, menu);
      for (const id of drawIds) {
        expect(
          id in switches,
          `${spec.id} wrote a switch value for ${id}, a DRAW profile. That ` +
            `implies this module may un-draw the trader's own range selection.`,
        ).toBe(false);
      }
    }
  });

  it("returns nothing for an unknown desk rather than guessing", () => {
    expect(arrangementSwitches("NOT_A_DESK" as ArrangementId, menuOn())).toEqual({});
  });
});

describe("the tile copy is one line (Founder: no paragraphs on the glass)", () => {
  it("a mute desk's shortNote is a single short line; a full desk says nothing", () => {
    const menu = selectProfileMenu({ barsPresent: true, printsPresent: false, observedAggressorFlow: false, active: {} });
    const vm = selectChartArrangement({ menu });
    const of = vm.entries.find(e => e.id === "ORDER_FLOW")!;
    expect(of.shortNote.length).toBeGreaterThan(0);
    expect(of.shortNote.length).toBeLessThanOrEqual(60);
    expect(of.note.length).toBeGreaterThan(of.shortNote.length);
    const clean = vm.entries.find(e => e.id === "CLEAN")!;
    expect(clean.shortNote).toBe("");
  });
});
