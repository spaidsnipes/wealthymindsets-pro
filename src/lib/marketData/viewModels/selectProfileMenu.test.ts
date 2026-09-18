/**
 * The menu's whole job is to be the one honest inventory of what this product
 * owns. Two ways it could lie, and these tests sit on both:
 *
 *   1. It could ADVERTISE something with no module behind it. So every entry's
 *      `owner` is checked against the filesystem — a name in this list without
 *      a file is an orphaned feature, and that is exactly how one survives.
 *   2. It could say READY for a profile the feed cannot draw, or say "wait"
 *      when the honest answer is "do not wait". So availability is asserted
 *      per state, including the precedence between the two absences.
 *
 * Wording is never asserted. The sentences belong to the module.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { selectProfileMenu, type ProfileId, type ProfileMenuInput } from "./selectProfileMenu";

const ALL_IDS: readonly ProfileId[] = [
  "FIXED_RANGE",
  "SESSION",
  "DELTA_VP",
  "ABSORPTION",
  "IMBALANCE_STACK",
  "VALUE_CANDLE",
  "DELTA_DIVERGENCE",
  "LIQUIDITY_WEATHER",
];

/** The rows that cannot be computed from volume alone. */
const SIDED: readonly ProfileId[] = [
  "DELTA_VP",
  "IMBALANCE_STACK",
  "VALUE_CANDLE",
  "DELTA_DIVERGENCE",
  "LIQUIDITY_WEATHER",
];

function input(over: Partial<ProfileMenuInput> = {}): ProfileMenuInput {
  return {
    barsPresent: true,
    observedAggressorFlow: true,
    active: {},
    ...over,
  };
}

describe("selectProfileMenu — one door in front of every profile", () => {
  it("offers every invention this repo owns, in reading order", () => {
    const vm = selectProfileMenu(input());
    expect(vm.entries.map(e => e.id)).toEqual(ALL_IDS);
  });

  it("EVERY ENTRY HAS A REAL OWNER: the named module exists on disk", () => {
    // A menu is the place a product is most tempted to advertise something it
    // does not have. This is the assertion that makes that impossible.
    const vm = selectProfileMenu(input());
    for (const entry of vm.entries) {
      const abs = path.join(process.cwd(), entry.owner);
      expect(fs.existsSync(abs), `${entry.id} names ${entry.owner}, which does not exist`).toBe(true);
    }
  });

  it("every entry names what it draws and the levels it publishes", () => {
    const vm = selectProfileMenu(input());
    for (const entry of vm.entries) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.what.length).toBeGreaterThan(10);
      expect(entry.levels.length).toBeGreaterThan(0);
    }
  });
});

describe("selectProfileMenu — the gesture is published, not assumed", () => {
  it("DELTA+VP IS A BOX, NOT A SWITCH: it is the one entry that arms a tool", () => {
    // `delta-vp` is a drawing tool in MainChart — the trader drags a region and
    // the profile is built inside it. A checkbox here would promise that one
    // click puts something on the chart when one click puts a cursor on it.
    const vm = selectProfileMenu(input());
    const byId = Object.fromEntries(vm.entries.map(e => [e.id, e]));
    expect(byId.DELTA_VP.gesture).toBe("DRAW");
    expect(byId.FIXED_RANGE.gesture).toBe("TOGGLE");
    expect(byId.SESSION.gesture).toBe("TOGGLE");
    expect(byId.ABSORPTION.gesture).toBe("TOGGLE");
  });

  it("the two gestures read differently — the note is the disclosure, not decoration", () => {
    const vm = selectProfileMenu(input());
    const draw = vm.entries.find(e => e.gesture === "DRAW")!;
    const toggle = vm.entries.find(e => e.gesture === "TOGGLE")!;
    expect(draw.gestureNote).not.toBe(toggle.gestureNote);
    expect(draw.gestureNote.length).toBeGreaterThan(10);
  });
});

describe("selectProfileMenu — availability is measured, never assumed", () => {
  it("with bars and a sided tape, everything is READY", () => {
    const vm = selectProfileMenu(input());
    expect(vm.entries.every(e => e.availability === "READY")).toBe(true);
    expect(vm.readyCount).toBe(ALL_IDS.length);
  });

  it("the tape-fed rows wait on a sided tape — the bar-fed ones draw from volume", () => {
    // Most feeds this product can reach never state an aggressor. Showing any
    // of these as ready and drawing nothing is the defect Asset 03 exists to
    // avoid: a shape that keeps its look and loses its meaning.
    const vm = selectProfileMenu(input({ observedAggressorFlow: false }));
    const byId = Object.fromEntries(vm.entries.map(e => [e.id, e]));
    for (const id of SIDED) {
      expect(byId[id].availability, `${id} should need a sided tape`).toBe("NEEDS_SIDED_TAPE");
    }
    expect(byId.FIXED_RANGE.availability).toBe("READY");
    expect(byId.SESSION.availability).toBe("READY");
    expect(byId.ABSORPTION.availability).toBe("READY");
    expect(vm.readyCount).toBe(ALL_IDS.length - SIDED.length);
  });

  it("the four order-flow readings share ONE fact about the tape, not four", () => {
    // `useOrderFlowReadings` gates all of them behind a single call to
    // `hasVerifiedAggressorTape` and hands every selector the same null array
    // when it fails — precisely so they can never momentarily disagree about
    // whether the tape was real. The menu must not re-open that question.
    const off = selectProfileMenu(input({ observedAggressorFlow: false }));
    const notes = new Set(
      off.entries.filter(e => SIDED.includes(e.id)).map(e => e.availabilityNote),
    );
    expect(notes.size, "the sided rows gave different reasons for one fact").toBe(1);
  });

  it("names ONLY coordinates in `levels` — a cost has no price", () => {
    // Liquidity weather measures size per unit of spread. Its stage, trend and
    // cost figures are words in the chrome and have no location on the axis;
    // the menu is the easiest place in the product to imply that they do.
    const vm = selectProfileMenu(input());
    const weather = vm.entries.find(e => e.id === "LIQUIDITY_WEATHER")!;
    expect(weather.levels).toEqual(["Stall shelves"]);

    // And delta is counted in contracts while the axis is in dollars, so the
    // divergence row may name its two pivot PRICES and nothing else.
    const div = vm.entries.find(e => e.id === "DELTA_DIVERGENCE")!;
    expect(div.levels.join(" ")).not.toMatch(/delta|cvd/i);
  });

  it("with no bars, NOTHING is ready — including the ones that only need volume", () => {
    const vm = selectProfileMenu(input({ barsPresent: false }));
    expect(vm.entries.every(e => e.availability === "WAITING_FOR_BARS")).toBe(true);
    expect(vm.readyCount).toBe(0);
  });

  it("NO BARS IS THE WIDER ABSENCE: it outranks the sided-tape gap on Delta+VP", () => {
    // Reporting "this tape states no side" on an empty chart names the narrower
    // gap while the bigger one goes unmentioned — the trader then waits for the
    // wrong thing.
    const vm = selectProfileMenu(input({ barsPresent: false, observedAggressorFlow: false }));
    const delta = vm.entries.find(e => e.id === "DELTA_VP")!;
    expect(delta.availability).toBe("WAITING_FOR_BARS");
  });

  it("the three states carry three different reasons — one sentence for all is no disclosure", () => {
    const ready = selectProfileMenu(input()).entries[0].availabilityNote;
    const waiting = selectProfileMenu(input({ barsPresent: false })).entries[0].availabilityNote;
    const unsided = selectProfileMenu(input({ observedAggressorFlow: false })).entries.find(
      e => e.id === "DELTA_VP",
    )!.availabilityNote;
    expect(new Set([ready, waiting, unsided]).size).toBe(3);
    for (const note of [ready, waiting, unsided]) {
      expect(note.length).toBeGreaterThan(10);
    }
  });
});

describe("selectProfileMenu — the chip counts what is DRAWN, not what is possible", () => {
  it("reads PROFILES with nothing switched on", () => {
    const vm = selectProfileMenu(input());
    expect(vm.activeCount).toBe(0);
    expect(vm.summary).toBe("PROFILES");
  });

  it("carries the ACTIVE count, never the ready count", () => {
    // A badge reading "4" over a chart with nothing drawn on it is a claim the
    // chart contradicts the moment the trader looks up.
    const vm = selectProfileMenu(input({ active: { FIXED_RANGE: true } }));
    expect(vm.readyCount).toBe(ALL_IDS.length);
    expect(vm.activeCount).toBe(1);
    expect(vm.summary).toContain("1");
    expect(vm.summary).not.toContain(String(ALL_IDS.length));
  });

  it("an active profile stays active even when the feed cannot draw it", () => {
    // The trader's switch is their own state. The menu reports both facts
    // side by side rather than silently flipping the switch off.
    const vm = selectProfileMenu(input({ observedAggressorFlow: false, active: { DELTA_VP: true } }));
    const delta = vm.entries.find(e => e.id === "DELTA_VP")!;
    expect(delta.active).toBe(true);
    expect(delta.availability).toBe("NEEDS_SIDED_TAPE");
    expect(vm.activeCount).toBe(1);
  });

  it("an absent key is off, not on — `active` is a partial record", () => {
    const vm = selectProfileMenu(input({ active: { SESSION: false } }));
    expect(vm.entries.every(e => e.active === false)).toBe(true);
  });
});
