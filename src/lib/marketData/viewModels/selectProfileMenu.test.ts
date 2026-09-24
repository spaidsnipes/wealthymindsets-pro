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
import { PROFILE_FAMILY, selectProfileMenu, type ProfileId, type ProfileMenuInput } from "./selectProfileMenu";

const ALL_IDS: readonly ProfileId[] = [
  "FIXED_RANGE",
  "SESSION",
  "DELTA_VP",
  "ABSORPTION",
  "IMBALANCE_STACK",
  "VALUE_CANDLE",
  "DELTA_DIVERGENCE",
  "LIQUIDITY_WEATHER",
  // H-701. Needs bars and nothing else: it weighs a bar against the bars
  // before it, so it is neither prints-dependent nor side-dependent.
  "EFFORT_MARK",
  // H-702. Aggressor delta at real grid prices — side-dependent.
  "DELTA_LEVELS",
  // H-703. HVN/LVN nodes off the developing profile. Needs bars only —
  // neither side-dependent nor prints-dependent.
  "LIVING_PROFILE",
  // P-110 #10. Time at price from bar ranges — no volume, no side.
  "TPO_PROFILE",
  // P-110 #2. Volume since the last confirmed swing — bars only.
  "STRUCTURE_PROFILE",
  // P-110 #5. Numbers about the Living Profile — bars only.
  "PROFILE_DNA",
  // Living Profile's developing value, bar by bar — bars only, no lookahead.
  "VALUE_MIGRATION",
  // P-110 #4. Prior sessions' value carried forward — bars only.
  "PROFILE_MEMORY",
  // P-110 #3. Agreement across the switched-on species — bars only.
  "PROFILE_FUSION",
  // P-110 #9. Completed sessions aggregated — bars only.
  "COMPOSITE_PROFILE",
  // P-110 #7. The bars in view — bars only; moves with the camera.
  "VISIBLE_RANGE_PROFILE",
  // P-110 #8. Trader-anchored range from bars — a DRAW gesture, no side.
  "ANCHORED_RANGE",
  // H-901. A dimmer over the profile family — reads the regime owner.
  "REGIME_LIGHTING",
  // Question-driven mode on the same camera — reads absorption/exhaustion.
  "QUESTION_LENS",
  "SCAFFOLDING",
  "ANATOMY_CARDS",
  "MARKET_STRUCTURE",
];

/** The rows that require provider-stated aggressor side. */
const SIDED: readonly ProfileId[] = [
  "DELTA_VP",
  "IMBALANCE_STACK",
  "VALUE_CANDLE",
  "DELTA_DIVERGENCE",
  "DELTA_LEVELS",
];

function input(over: Partial<ProfileMenuInput> = {}): ProfileMenuInput {
  return {
    barsPresent: true,
    printsPresent: true,
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

  it("side-dependent rows require side while Liquidity Weather only requires prints", () => {
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
    expect(byId.LIQUIDITY_WEATHER.availability).toBe("READY");
    expect(vm.readyCount).toBe(ALL_IDS.length - SIDED.length);
  });

  it("Liquidity Weather waits for prints without falsely asking for aggressor side", () => {
    const vm = selectProfileMenu(input({ printsPresent: false, observedAggressorFlow: false }));
    const weather = vm.entries.find(e => e.id === "LIQUIDITY_WEATHER")!;
    expect(weather.availability).toBe("WAITING_FOR_PRINTS");
    expect(weather.availabilityNote).toMatch(/side is not required/i);
  });

  it("the side-dependent rows share ONE fact about the tape", () => {
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

/*
  THE GAP BETWEEN "SWITCHED ON" AND "DRAWING".

  `activeCount` and `readyCount` are each true and each incomplete, and the
  product shipped for weeks in the state these tests describe: four order-flow
  readings defaulting ON, all four gated behind one tape check, none of them
  drawing, and a gold chip reporting a number that looked like success.

  Wording is still not asserted — only that the fact is carried, that it names
  the readings, and that it cannot be reported when nothing is being withheld.
*/
describe("selectProfileMenu — a lit switch that draws nothing says so", () => {
  it("THE SHIPPED STATE: side-dependent readings are silent while Liquidity Weather still draws", () => {
    const vm = selectProfileMenu(
      input({
        observedAggressorFlow: false,
        active: {
          ABSORPTION: true,
          IMBALANCE_STACK: true,
          VALUE_CANDLE: true,
          DELTA_DIVERGENCE: true,
          LIQUIDITY_WEATHER: true,
        },
      }),
    );

    expect(vm.activeCount).toBe(5);
    // Absorption draws from bars; Liquidity Weather draws from raw prints.
    expect(vm.silentCount).toBe(3);
    expect(
      vm.summary,
      "the chip is the only thing a trader sees without opening the menu, so " +
        "it must carry the withheld count rather than a number that reads as " +
        "five layers of working chart",
    ).toContain("3");
  });

  it("counts the switch the trader threw, not the drawing it produced", () => {
    // A chip that answered "1" here would be hiding the trader's own five
    // choices from them to make itself look correct.
    const vm = selectProfileMenu(
      input({
        observedAggressorFlow: false,
        active: { ABSORPTION: true, IMBALANCE_STACK: true, VALUE_CANDLE: true, DELTA_DIVERGENCE: true, LIQUIDITY_WEATHER: true },
      }),
    );
    expect(vm.activeCount).toBe(5);
  });

  it("names the silent readings, so the count is an answer and not a riddle", () => {
    const vm = selectProfileMenu(
      input({ observedAggressorFlow: false, active: { VALUE_CANDLE: true, LIQUIDITY_WEATHER: true } }),
    );
    expect(vm.silentNote).toContain("WM Value Candle");
    expect(vm.silentNote).not.toContain("Liquidity Weather");
  });

  it("does not name a reading that is silent but switched OFF", () => {
    // An off switch is not a withheld layer. Listing it would turn the note
    // into a catalogue of everything this tape cannot do, which is the menu's
    // job, not the chip's.
    const vm = selectProfileMenu(
      input({ observedAggressorFlow: false, active: { VALUE_CANDLE: true } }),
    );
    expect(vm.silentCount).toBe(1);
    expect(vm.silentNote).not.toContain("Liquidity Weather");
  });

  it("says nothing at all when every active reading can draw", () => {
    const vm = selectProfileMenu(
      input({ observedAggressorFlow: true, active: { ABSORPTION: true, VALUE_CANDLE: true } }),
    );
    expect(vm.silentCount).toBe(0);
    expect(vm.silentNote).toBe("");
    expect(
      vm.summary,
      "a chart with nothing withheld must not carry a withholding notice — a " +
        "warning that is always present is a warning nobody reads",
    ).not.toMatch(/silent/i);
  });

  it("says nothing when the trader has switched everything off", () => {
    const vm = selectProfileMenu(input({ observedAggressorFlow: false, active: {} }));
    expect(vm.silentCount).toBe(0);
    expect(vm.silentNote).toBe("");
    expect(vm.summary).toBe("PROFILES");
  });

  it("distinguishes WAIT from DO NOT WAIT, because they ask opposite things", () => {
    const noBars = selectProfileMenu(
      input({ barsPresent: false, active: { ABSORPTION: true } }),
    );
    const noTape = selectProfileMenu(
      input({ observedAggressorFlow: false, active: { VALUE_CANDLE: true } }),
    );
    expect(noBars.silentCount).toBe(1);
    expect(noTape.silentCount).toBe(1);
    expect(
      noBars.silentNote,
      "a trader told 'waiting for bars' waits; a trader told 'this tape " +
        "states no side' stops waiting and changes symbol. One sentence for " +
        "both states would cost them the difference.",
    ).not.toBe(noTape.silentNote);
  });

  it("carries both reasons when the two absences overlap", () => {
    // No bars makes EVERYTHING waiting, so this is the precedence case: the
    // note must not report only the narrower tape gap.
    const vm = selectProfileMenu(
      input({ barsPresent: false, observedAggressorFlow: false, active: { ABSORPTION: true, VALUE_CANDLE: true } }),
    );
    expect(vm.silentCount).toBe(2);
    expect(vm.silentNote).toContain("Absorption");
    expect(vm.silentNote).toContain("WM Value Candle");
  });

  it("silent readings are exactly active-minus-drawing, with no third bucket", () => {
    for (const id of ALL_IDS) {
      const vm = selectProfileMenu(input({ observedAggressorFlow: false, active: { [id]: true } }));
      const drawing = vm.entries.filter(e => e.active && e.availability === "READY").length;
      expect(vm.activeCount - drawing).toBe(vm.silentCount);
      expect(vm.silentCount).toBe(SIDED.includes(id) ? 1 : 0);
    }
  });

  it("a lit Liquidity Weather row says waiting for prints when prints are absent", () => {
    const vm = selectProfileMenu(input({
      printsPresent: false,
      observedAggressorFlow: false,
      active: { LIQUIDITY_WEATHER: true },
    }));
    expect(vm.silentCount).toBe(1);
    expect(vm.silentSummary).toBe("1 silent · waiting for prints");
    expect(vm.silentNote).toMatch(/per-trade prints/i);
  });

  /*
    ── THE SUITE WAS GREEN WHILE THE PRODUCT SPOKE BADLY ────────────────────

    Every assertion above is `toContain`. `toContain` is satisfied by a
    sentence that begins in the middle of a word, so the note shipped to the
    serving chart reading:

        "…Delta Divergence. this tape has not stated an aggressor side…"

    A full stop followed by a lowercase letter. Found by reading the live chip
    in the Founder's browser, which no unit test in this file could have done
    for me — `toContain` tests what is PRESENT and this was a defect of how the
    present things were JOINED.

    So the shape of the whole sentence is asserted now, across every state that
    produces one, rather than one more substring.
  */
  it("every note it can produce is a well-formed sentence", () => {
    const states = [
      { barsPresent: true,  observedAggressorFlow: false },
      { barsPresent: true, printsPresent: false, observedAggressorFlow: false },
      { barsPresent: false, observedAggressorFlow: false },
      { barsPresent: false, observedAggressorFlow: true },
    ];
    const everythingOn = Object.fromEntries(ALL_IDS.map(id => [id, true]));

    for (const state of states) {
      const note = selectProfileMenu(input({ ...state, active: everythingOn })).silentNote;
      if (note === "") continue;

      expect(note, `no sentence ends this note: ${note}`).toMatch(/\.$/);
      expect(
        note,
        `a full stop is followed by a lowercase letter, so two sentences were ` +
          `joined as if one were a fragment: ${note}`,
      ).not.toMatch(/\.\s+[a-z]/);
      expect(note[0], `the note opens lowercase: ${note}`).not.toMatch(/[a-z]/);
    }
  });
});

describe("ONE DOOR PER FAMILY — tools are not smushed together (Founder, 2026-09-24 08:13)", () => {
  const base = { barsPresent: true, printsPresent: true, observedAggressorFlow: true, active: {} };
  const ids = (families: readonly ("PROFILE" | "ORDER_FLOW" | "READING")[]) =>
    selectProfileMenu({ ...base, families }).entries.map(e => e.id);

  it("every row belongs to exactly one family, and the families cover the catalogue", () => {
    const all = selectProfileMenu(base).entries.map(e => e.id).sort();
    const split = [...ids(["PROFILE"]), ...ids(["ORDER_FLOW"]), ...ids(["READING"])].sort();
    expect(split).toEqual(all);
    for (const id of all) expect(PROFILE_FAMILY[id]).toBeDefined();
  });

  it("Tools › Order flow holds the order-flow tools — and no profile", () => {
    const of = ids(["ORDER_FLOW"]);
    expect(of).toEqual(expect.arrayContaining(["ABSORPTION", "ANATOMY_CARDS", "IMBALANCE_STACK", "DELTA_DIVERGENCE"]));
    expect(of.some(id => /PROFILE|RANGE|SESSION/.test(id))).toBe(false);
  });

  it("the Profiles door holds no order-flow tool and no lens", () => {
    const pr = ids(["PROFILE"]);
    for (const id of ["ABSORPTION", "ANATOMY_CARDS", "QUESTION_LENS", "SCAFFOLDING", "REGIME_LIGHTING"]) {
      expect(pr).not.toContain(id);
    }
  });

  it("a single-family door names itself on its badge", () => {
    expect(selectProfileMenu({ ...base, families: ["ORDER_FLOW"], active: { ABSORPTION: true } }).summary).toBe("ORDER FLOW · 1");
    expect(selectProfileMenu({ ...base, active: {} }).summary).toBe("PROFILES");
  });
});
