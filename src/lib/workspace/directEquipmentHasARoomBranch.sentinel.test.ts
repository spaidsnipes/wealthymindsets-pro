/**
 * SENTINEL — A DIRECT INSTRUMENT IS A PROMISE THE ROOM HAS TO KEEP.
 *
 * ── THE DEFECT THIS EXISTS TO CATCH ────────────────────────────────────────
 *
 * `roomEquipment.ts` is a DECLARATION. Adding an entry there paints a control
 * into the Workspace or Tools drawer immediately, with a label and a hint, and
 * nothing anywhere fails if the room never listens for it. The trader gets a
 * button that looks exactly like the seven working ones and does nothing at
 * all — the single worst outcome available, because a painted door teaches
 * that the product is broken rather than that the feature is absent.
 *
 * JOURNEY equipment is protected from this by accident: `useEquipmentJourney`
 * opens a threshold and the room's `chartEquipmentContent` chooser would fall
 * through to a visibly wrong panel, which someone would notice. DIRECT
 * equipment has no such backstop. `isJourneyEquipment` filters it OUT of the
 * journey on purpose (see the `direct` field's note), so the ONLY thing that
 * makes a direct instrument work is a hand-written `req.equipmentId === "…"`
 * branch inside the room. A declaration with no branch is silence, and silence
 * is what this file converts into a failing test.
 *
 * ── AND THE SECOND HALF: THE ROOM HAS TO ANSWER BACK ───────────────────────
 *
 * `equipmentChannel.ts` records what happened the last time this was only half
 * wired: Replay opened, and pressing the rail entry again left it
 * `aria-pressed="true"` with the panel still up. Three presses, one outcome.
 * `aria-pressed` is a contract, not a lamp — a control that reports itself
 * pressed has promised that pressing it again un-presses it. So a direct
 * instrument owes TWO things: a branch that hears the rail, and an
 * `announceEquipmentStage` that tells the rail what actually happened. Either
 * one alone ships a liar.
 *
 * ── WHY A HAND-WRITTEN ROOM MAP AND NOT A SCAN ─────────────────────────────
 *
 * Same argument `EQUIPMENT_BY_ROOM` makes about itself. A scan that guessed
 * which component owns `/charts` would quietly stop covering a room the day
 * someone renamed a file, and a Sentinel that silently stops covering things
 * is worse than no Sentinel. If a room gains direct equipment and is not in
 * this map, the test below says so BY NAME rather than passing vacuously.
 *
 * ── STRIPCOMMENTS, AND THE CONTROL THAT KEEPS IT HONEST ────────────────────
 *
 * The branches are matched against comment-stripped source, because every one
 * of these ids is discussed at length in prose directly above the code that
 * implements it — an unstripped scan would pass on the documentation alone,
 * which is the exact shape of a Sentinel that cannot fail. And because
 * `stripComments` is now load-bearing, the last test proves it did not simply
 * blank the file: an over-greedy stripper would return "" for every source in
 * the repo and report a permanently, silently clean codebase.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { roomEquipment, ARRANGEMENT_EQUIPMENT_ID } from "./roomEquipment";

/**
 * The three arrangement door ids, taken from the registry's own map rather
 * than retyped. A private copy here would keep passing after a desk was
 * renamed — the exact failure mode that map exists to prevent.
 */
const ARRANGEMENT_ID_SET: Readonly<Record<string, true>> = Object.fromEntries(
  Object.values(ARRANGEMENT_EQUIPMENT_ID).map((id) => [id, true as const]),
);

/**
 * Room href → the component that answers for that room.
 *
 * The href keys are IMPORTED, never retyped. A private copy of "/charts" here
 * would keep passing after the Founder moved the instrument view, which is the
 * failure `roomEquipment.ts` already has its own Sentinel against.
 */
const ROOM_COMPONENT: Readonly<Record<string, string>> = {
  [INSTRUMENT_VIEW_ROUTE]: "src/components/chart/ChartsDashboard.tsx",
};

/** Every room that declares at least one DIRECT instrument today. */
const ROOMS_WITH_DIRECT_EQUIPMENT = Object.keys(ROOM_COMPONENT).filter((href) =>
  roomEquipment(href).some((e) => e.direct),
);

function roomSource(href: string): string {
  return stripComments(readFileSync(join(process.cwd(), ROOM_COMPONENT[href]), "utf8"));
}

describe("SENTINEL — every direct instrument is wired in the room that declares it", () => {
  it("covers at least one room, so the suite below cannot pass by finding nothing", () => {
    // NOT-VACUOUS CONTROL #1. Everything after this iterates a list. A list
    // that silently became empty — a renamed route, a `direct` flag dropped —
    // would turn this whole file into a green no-op.
    expect(
      ROOMS_WITH_DIRECT_EQUIPMENT.length,
      "no room declares direct equipment any more; either the grammar was removed (delete this file) or the map above went stale (fix it)",
    ).toBeGreaterThan(0);
  });

  it("every room that declares direct equipment is in the component map", () => {
    // The map is the thing that can go stale, so it is the thing under test.
    // `/command-deck` has journey lenses only today; the day it gains a direct
    // instrument, this is the line that has to be updated or it fails.
    for (const href of ROOMS_WITH_DIRECT_EQUIPMENT) {
      expect(
        ROOM_COMPONENT[href],
        `${href} declares direct equipment but no component is named for it here`,
      ).toBeTruthy();
    }
  });

  it("the room HEARS the rail — a branch per direct id", () => {
    for (const href of ROOMS_WITH_DIRECT_EQUIPMENT) {
      const src = roomSource(href);
      for (const e of roomEquipment(href).filter((x) => x.direct)) {
        expect(
          src,
          `${ROOM_COMPONENT[href]} → "${e.label}" is painted into the drawer but the room never listens for "${e.id}". ` +
            `That ships a control that does nothing.`,
        ).toMatch(new RegExp(`req\\.equipmentId\\s*===\\s*["']${e.id}["']`));
      }
    }
  });

  it("the room ANSWERS BACK — a stage announcement per HOLDABLE direct id", () => {
    // `momentary` entries are excluded ON PURPOSE, and the next test is the
    // other half of that purpose. A command holds nothing, so it has no stage
    // to report; demanding an announce here would force the room to fabricate
    // one, and the rail would then paint `aria-pressed` on a button whose
    // reversal cannot exist. REMODELLED, NOT WEAKENED: what was one blanket
    // requirement is now a requirement plus a PROHIBITION — a momentary entry
    // that starts announcing is a failure this suite reports by name.
    for (const href of ROOMS_WITH_DIRECT_EQUIPMENT) {
      const src = roomSource(href);
      for (const e of roomEquipment(href).filter((x) => x.direct && !x.momentary)) {
        expect(
          src,
          `${ROOM_COMPONENT[href]} → "${e.label}" opens but never reports its stage, so the rail's aria-pressed ` +
            `will claim it is still held after the trader closes it from the panel's own control.`,
        ).toMatch(new RegExp(`announceEquipmentStage\\(\\s*["']${e.id}["']`));
      }
    }
  });

  it("a MOMENTARY command never announces a stage — a stage would be a fabricated holding", () => {
    // The inverse guard that makes the exclusion above a design rather than a
    // loophole. If a room starts announcing a stage for a momentary id, the
    // rail would report the command as held — pressed with empty hands — and
    // the aria-pressed contract (press again to reverse) would be a promise
    // nothing can keep: un-pressing Clean cannot pick the instruments back up.
    for (const href of ROOMS_WITH_DIRECT_EQUIPMENT) {
      const src = roomSource(href);
      for (const e of roomEquipment(href).filter((x) => x.direct && x.momentary)) {
        expect(
          src,
          `${ROOM_COMPONENT[href]} → "${e.label}" is momentary but announces a stage; a command that ` +
            `claims to be held is a liar the moment the trader picks anything back up.`,
        ).not.toMatch(new RegExp(`announceEquipmentStage\\(\\s*["']${e.id}["']`));
      }
    }
  });

  it("NOT VACUOUS: stripComments left real code behind", () => {
    // CONTROL #2. If `stripComments` ever over-matched and returned "", all
    // four tests above would still pass for zero direct instruments and fail
    // loudly for one — but a subtler over-match (say, eating everything after
    // the first `/*` in a file) would blank the TAIL and quietly stop covering
    // whatever is wired at the bottom. So: assert the stripped source still
    // contains the subscription the branches live inside.
    for (const href of ROOMS_WITH_DIRECT_EQUIPMENT) {
      const src = roomSource(href);
      expect(
        src.length,
        `${ROOM_COMPONENT[href]} → stripComments returned almost nothing; this suite is scanning air`,
      ).toBeGreaterThan(1000);
      expect(
        src,
        `${ROOM_COMPONENT[href]} → the equipment subscription itself is gone from the stripped source, ` +
          `so the branch assertions above are not looking at live code`,
      ).toContain("subscribeEquipment");
    }
  });
});

/**
 * SENTINEL — THE LIT DESK IS COMPILED, NOT REMEMBERED.
 *
 * The Workspace rail now lights the arrangement the chart is currently in.
 * There are exactly two ways to build that light, and only one of them is
 * true:
 *
 *   COMPILED  — the room publishes `selectChartArrangement(...).activeId`,
 *               read off the live switch positions. Hand-flip one switch in
 *               the Tools drawer and the desk becomes CUSTOM; the light goes
 *               out, correctly, with nobody having pressed anything.
 *
 *   REMEMBERED — the room (or the rail) stores "the last desk I sent". This
 *               is one line shorter, passes every click-through by hand, and
 *               is a lamp describing a desk the trader has already left. It
 *               is the PARROT: chrome repeating the last thing it heard.
 *
 * The two are indistinguishable from a screenshot, which is why they are
 * separated here mechanically: an announce whose argument is a LITERAL desk id
 * can only have come from a press site, because the compiler's answer is not
 * knowable at authoring time.
 */
describe("SENTINEL — the arrangement the rail lights comes from the compiler", () => {
  const RAIL = "src/components/os/WMOperatingSystem.tsx";
  const railSource = () => stripComments(readFileSync(join(process.cwd(), RAIL), "utf8"));

  it("the room publishes the COMPILER's answer", () => {
    for (const href of ROOMS_WITH_DIRECT_EQUIPMENT) {
      const src = roomSource(href);
      if (!roomEquipment(href).some((e) => e.id in ARRANGEMENT_ID_SET)) continue;
      expect(
        src,
        `${ROOM_COMPONENT[href]} → offers named arrangements but never announces which one is in force; ` +
          `the rail then offers three desks and reports none of them`,
      ).toContain("announceEquipmentArrangement(");
      expect(
        src,
        `${ROOM_COMPONENT[href]} → announces an arrangement without reading selectChartArrangement; ` +
          `the only honest source of "which desk is this" is the compiler over the live switches`,
      ).toContain("selectChartArrangement(");
    }
  });

  it("the room NEVER announces a literal desk id — that is the remembered-press shape", () => {
    for (const href of ROOMS_WITH_DIRECT_EQUIPMENT) {
      const src = roomSource(href);
      for (const id of Object.keys(ARRANGEMENT_ID_SET)) {
        expect(
          src,
          `${ROOM_COMPONENT[href]} → announces "${id}" as a literal. A desk id known at authoring time ` +
            `can only have come from the press that sent it, so this light would survive the trader ` +
            `leaving the desk by hand.`,
        ).not.toMatch(
          new RegExp(`announceEquipmentArrangement\\(\\s*["']${id}["']`),
        );
      }
    }
  });

  it("the rail is TOLD — it subscribes, and keeps no memory of its own presses", () => {
    const src = railSource();
    expect(
      src,
      `${RAIL} → the rail does not subscribe to the arrangement channel, so nothing can light`,
    ).toContain("subscribeEquipmentArrangement");
    expect(
      src,
      `${RAIL} → the rail must read the channel's memory on mount; the frame closes this panel on the ` +
        `announce that opens equipment, so a rail starting from null shows an un-lit desk after remount`,
    ).toContain("arrangedEquipmentId()");
  });

  it("a lit desk takes aria-current, NEVER aria-pressed", () => {
    // The whole reason this is a second channel. `aria-pressed` promises a
    // reversal — press again and it un-presses — and pressing ORDER FLOW twice
    // does not un-arrange the chart. If the light were folded into `open`,
    // three commands would start promising a toggle that cannot exist.
    const src = railSource();
    expect(
      src,
      `${RAIL} → nothing renders aria-current, so the lit desk is claiming to be a held toggle`,
    ).toMatch(/aria-current=\{inForce/);
    expect(
      src,
      `${RAIL} → aria-pressed is no longer omitted for a momentary command`,
    ).toMatch(/aria-pressed=\{momentary \? undefined/);
    // And the inverse: the arranged flag must not be what feeds aria-pressed.
    expect(
      src,
      `${RAIL} → aria-pressed is being fed the arrangement light; a command has become a fake toggle`,
    ).not.toMatch(/aria-pressed=\{[^}]*inForce/);
  });

  it("NOT VACUOUS: there really are named arrangements to light", () => {
    // Everything above iterates or greps for these three ids. If the desks
    // were removed from the registry, this file would pass by finding nothing.
    expect(
      Object.keys(ARRANGEMENT_ID_SET).length,
      "no named arrangements are declared any more; either the grammar went away (delete this block) or the map went stale",
    ).toBe(3);
    for (const href of ROOMS_WITH_DIRECT_EQUIPMENT) {
      const offered = roomEquipment(href).filter((e) => e.id in ARRANGEMENT_ID_SET);
      expect(
        offered.length,
        `${href} → the arrangement desks are no longer offered in this room's rail`,
      ).toBe(3);
      for (const e of offered) {
        expect(
          e.momentary,
          `${href} → "${e.label}" stopped being momentary; a desk press is a command, not a holding`,
        ).toBe(true);
      }
    }
  });
});
