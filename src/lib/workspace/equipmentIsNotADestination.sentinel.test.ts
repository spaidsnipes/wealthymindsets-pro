import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { roomEquipment } from "./roomEquipment";

/**
 * SENTINEL — EQUIPMENT AND DESTINATIONS MAY NOT SHARE A NAME.
 *
 * THE DEFECT THIS WAS BORN FROM, observed on the live rail:
 *
 *     ROOMS      … Heatmaps · **Passport** · Paper Trade · Journal
 *     WORKSPACE  … Market reality · **Object passport**
 *
 * Two unrelated things, four lines apart, sharing a noun. The ROOM "Passport"
 * is `/nectar` — the trader's OWN memory. The equipment was the MARKET
 * OBJECT's evidence lineage. Nothing on screen distinguished them.
 *
 * WHY THAT IS STRUCTURAL, NOT COSMETIC. `roomEquipment.ts`'s own header
 * records that the tool directory and the Workspace list were collapsed into
 * one heading for months, and that the cost was a product which could only
 * ship a new invention as a new place to travel to. The two lists answer
 * genuinely different questions:
 *
 *     ROOMS     → where else can I GO
 *     WORKSPACE → what can I pick up WITHOUT going anywhere
 *
 * A trader cannot keep those questions apart if the answers share vocabulary.
 * So the separation is enforced in WORDS, not only in data structure — because
 * the data structure was already separate on the day the defect shipped, and
 * being separate in the source did not stop them reading as the same thing.
 *
 * NEVER DELETE THIS SENTINEL — re-pin it to the meaning, with stronger
 * assertions than it had.
 */

const DESTINATIONS_REL = "src/lib/routing/wmDestinations.ts";

/**
 * Destination labels, read from source rather than imported.
 *
 * `wmDestinations.ts` pulls in `lucide-react` icon components. This suite has
 * no business booting an icon library to learn what a menu entry is called,
 * and a test that drags a rendering dependency in is a test that will one day
 * be skipped for being slow. The positive control below is what keeps the
 * source-scan honest.
 */
function destinationLabels(): string[] {
  const src = fs.readFileSync(path.join(process.cwd(), DESTINATIONS_REL), "utf8");
  return [...src.matchAll(/^\s*\{\s*href:[^}]*?label:\s*"([^"]+)"/gm)].map((m) => m[1]);
}

/** Case- and punctuation-insensitive word bag, so "Passport" ≡ "passport". */
function words(label: string): Set<string> {
  return new Set(
    label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

/**
 * Every room that has equipment, and the file that BUILDS that room's
 * descriptors.
 *
 * This was a bare list of hrefs while `/command-deck` was the only room with
 * equipment, and the name-agreement test below simply hardcoded the deck's
 * page. `/charts` adopting the grammar made that hardcoding a silent hole: the
 * new room's descriptors would never have been checked against the rail's
 * labels, and the test would have kept passing while reporting on one room.
 *
 * So the room now arrives WITH its source. Adding a room to
 * `roomEquipment.ts` and forgetting to add it here is caught by the coverage
 * assertion in the positive control — the registry is the authority on which
 * rooms exist, and this map has to keep up with it, not the other way round.
 */
const ROOM_SOURCES: Readonly<Record<string, string>> = {
  "/command-deck": "src/app/command-deck/page.tsx",
  "/charts": "src/components/chart/ChartsDashboard.tsx",
};

const ROOMS_WITH_EQUIPMENT = Object.keys(ROOM_SOURCES);

describe("SENTINEL — equipment is not a destination", () => {
  it("the detector is not vacuous — it can see both lists", () => {
    // POSITIVE CONTROL on the source scan. If the destination regex ever stops
    // matching, every collision assertion below compares equipment against an
    // EMPTY list and passes forever while reporting nothing. A silent detector
    // reads exactly like a clean bill of health, which is worse than no test.
    const labels = destinationLabels();
    expect(labels.length, `${DESTINATIONS_REL} → the destination scan found nothing`).
      toBeGreaterThan(15);
    expect(labels, "the scan no longer reaches the ROOMS group").toContain("Command Deck");
    expect(labels, "the scan no longer reaches the trader's own Passport room").toContain(
      "Passport",
    );

    // And the equipment side must be non-empty, or the intersection is trivially
    // clean for the wrong reason.
    const equipment = ROOMS_WITH_EQUIPMENT.flatMap((r) => roomEquipment(r));
    expect(equipment.length, "no room has any equipment — this suite proves nothing").
      toBeGreaterThan(1);

    // COVERAGE CONTROL. `ROOM_SOURCES` is hand-maintained; the registry is the
    // authority. A room that gains equipment but never gains an entry here
    // would be invisible to every assertion in this file, and the file would
    // keep reporting green about the rooms it still remembers.
    const registry = fs.readFileSync(
      path.join(process.cwd(), "src/lib/workspace/roomEquipment.ts"),
      "utf8",
    );
    //
    // Counted, not name-matched. A room key may be a literal (`"/command-deck"`)
    // or a computed reference to the route's owner (`[INSTRUMENT_VIEW_ROUTE]`),
    // and a scan that only understood literals would go quietly blind on the
    // second form — reporting "all rooms covered" about a list it could no
    // longer read. The count survives both spellings.
    const body = registry.slice(registry.indexOf("EQUIPMENT_BY_ROOM"));
    const keys = [...body.matchAll(/^\s*(?:"\/[a-z0-9-]+"|\[[A-Z0-9_]+\]):\s*\[/gm)];
    expect(keys.length, "the registry scan found no rooms at all").toBeGreaterThan(1);
    expect(
      keys.length,
      `roomEquipment.ts registers ${keys.length} rooms but this Sentinel checks ` +
        `${ROOMS_WITH_EQUIPMENT.length} — add the new room to ROOM_SOURCES with the ` +
        `file that builds its descriptors`,
    ).toBe(ROOMS_WITH_EQUIPMENT.length);
    for (const href of ROOMS_WITH_EQUIPMENT) {
      expect(
        roomEquipment(href).length,
        `ROOM_SOURCES names "${href}" but the registry gives it no equipment`,
      ).toBeGreaterThan(0);
    }
  });

  it("no equipment label is a destination label", () => {
    // The exact-collision half. "Passport" as equipment would be indistinguishable
    // from the room you travel to.
    const labels = new Set(destinationLabels().map((l) => l.toLowerCase()));
    for (const room of ROOMS_WITH_EQUIPMENT) {
      for (const e of roomEquipment(room)) {
        expect(
          labels.has(e.label.toLowerCase()),
          `${room} → equipment "${e.label}" is also somewhere you can GO`,
        ).toBe(false);
      }
    }
  });

  /**
   * THE INCIDENT, PINNED BY NAME — and deliberately NOT generalised.
   *
   * The first draft of this file tried to state the rule as a metric: an
   * equipment label that shares a word with a destination must carry strictly
   * more words than that destination. It went red immediately, and correctly —
   * "Market reality" shares *market* with the "Market Intel" tool and is not
   * remotely confusable with it, because the distinguishing word differs.
   *
   * Every weaker variant has the same problem in the other direction. Subset
   * matching, head-noun matching: each one either fires on labels that read
   * fine or lets the original defect through. The judgment "do these two read
   * as the same thing to a trader" is not a word count.
   *
   * A rule tuned until it agrees with the author is not a Sentinel; it is a
   * rubber stamp with a test runner. So the general claim is abandoned and the
   * SPECIFIC hazard is pinned instead: the passport equipment shares a noun
   * with a room, that collision reached the live rail once, and the qualifier
   * that fixed it may not be quietly removed. Narrow, but true — and it fails
   * for exactly the reason it says it will.
   */
  it("the passport equipment still says WHOSE passport it is", () => {
    const passport = roomEquipment("/command-deck").find(
      (e) => e.id === "market-object-passport",
    );
    expect(passport, "/command-deck lost its passport equipment entirely").toBeDefined();

    const mine = words(passport!.label);
    expect(mine.has("passport"), "the equipment stopped calling itself a passport").toBe(true);

    // The room at /nectar is called "Passport" and is the trader's OWN. This
    // one is the market object's, and the label has to carry that or the two
    // rail entries are one word apart from identical.
    expect(
      mine.has("market") && mine.has("object"),
      `equipment "${passport!.label}" no longer distinguishes itself from the ` +
        `"Passport" room — it must name the MARKET OBJECT it passports`,
    ).toBe(true);
  });

  it("the ROOM the trader presses and the WIDGET that opens agree on the name", () => {
    // A rail entry called one thing that opens a panel titled another reads as
    // a different thing having loaded — the directive's "another app loaded"
    // sensation in miniature. The ROOM builds the descriptor; this pins that
    // its `title` is the registry's `label`, verbatim, in EVERY room.
    //
    // Two rooms now share the `market-reality` id, so this also quietly pins
    // something the single-room version could not: both rooms must land on the
    // same title, because both are compared against the same registry label.
    for (const room of ROOMS_WITH_EQUIPMENT) {
      const rel = ROOM_SOURCES[room];
      const src = fs
        .readFileSync(path.join(process.cwd(), rel), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");

      for (const e of roomEquipment(room)) {
        const at = src.indexOf(`equipmentId: "${e.id}"`);
        expect(at, `${rel} → no descriptor for ${room} equipment "${e.id}"`).toBeGreaterThan(-1);
        const title = /title:\s*"([^"]+)"/.exec(src.slice(at, at + 400))?.[1];
        expect(title, `${rel} → "${e.id}" descriptor has no title to compare`).toBeDefined();
        expect(
          title,
          `${room}: the rail says "${e.label}" but the widget that opens says "${title}"`,
        ).toBe(e.label);
      }
    }
  });

  /**
   * THE PLUMBING HAS EXACTLY ONE IMPLEMENTATION.
   *
   * The grammar's stages live in a shared reducer, so two rooms can never
   * disagree about what DRAWER means. What they CAN disagree about is
   * everything wrapped around it: whether the room announces its stage (the
   * rail marks equipment open in one room and dead in the other), and whether
   * RETURN restores `os-room.scrollTop` or `window.scrollY` (the "return to
   * the exact room" promise silently degrades to "return to the top" on
   * whichever room got it wrong). Both mistakes were made and measured on the
   * deck before `useEquipmentJourney` existed.
   *
   * A room that re-implements the wiring inline would pass every other test in
   * this file. So the rule is stated where it can be seen: rooms CONSUME the
   * hook; only the hook touches the channel.
   */
  it("no room re-implements the journey wiring", () => {
    const CHANNEL = [
      "subscribeEquipment",
      "reflectJourneyInUrl",
      "announceEquipmentStage",
      "pendingScrollRestore",
      "equipmentJourneyReducer",
    ];

    for (const room of ROOMS_WITH_EQUIPMENT) {
      const rel = ROOM_SOURCES[room];
      const src = fs
        .readFileSync(path.join(process.cwd(), rel), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");

      expect(
        src.includes("useEquipmentJourney("),
        `${rel} → ${room} has equipment but never calls useEquipmentJourney`,
      ).toBe(true);

      for (const symbol of CHANNEL) {
        expect(
          src.includes(symbol),
          `${rel} → ${room} reaches for "${symbol}" directly. That wiring has one ` +
            `owner (useEquipmentJourney); a per-room copy is a second semantic brain`,
        ).toBe(false);
      }
    }
  });
});
