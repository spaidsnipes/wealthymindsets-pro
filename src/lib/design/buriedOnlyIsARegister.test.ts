import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * THE DECK'S DISCLOSURE DEBT, COUNTED FOR THE FIRST TIME.
 *
 * ── WHAT THIS IS ──────────────────────────────────────────────────────
 * A component is BURIED-ONLY in a room when EVERY one of its mounts in that
 * room's source sits inside at least one `<details>`. There is no path to it
 * that is not a second press.
 *
 * `roomAdoptsEquipment.sentinel.test.ts` already forbids that — but only for
 * components a room DECLARES as equipment. That is deliberate and it is also a
 * hole with a shape: an invention that is never registered as equipment can be
 * buried as deep as anyone likes and no rule notices. Measured on the day this
 * was written, `/command-deck` held TWENTY-TWO such components and `/charts`
 * held none. It is TWENTY-ONE now — the chain was enrolled as equipment in the
 * next commit, which is the register doing the only job it claims to do.
 *
 * ── WHY THIS DOES NOT DELETE ANYTHING ─────────────────────────────────
 * The previous baton recorded the principle the hard way: a first draft of the
 * equipment burial rule went red on the deck's second `MarketCanvasPanel`
 * mount, and two existing Sentinels pin that mount as intentional scene
 * composition. Writing a rule that forces a visible subtraction is how a
 * Sentinel starts deciding the product.
 *
 * So this is a REGISTER, not an approval list and not an eviction notice.
 * Several entries below are correct: `StoryRibbon` belongs one layer under One
 * Story by explicit design, and `SectionBanner` / `Stat` are layout primitives
 * that live wherever their section does. Others are genuine debt — the whole
 * Decision Chain is two disclosures deep with no other door, which is the
 * directive's "intelligence exists but requires hunting through implementation
 * containers" in its plainest form.
 *
 * What the register buys is that the number can no longer move in silence.
 * Bury a twenty-third thing and this goes red with its name in the message; un-
 * bury one and it goes red too, because a stale entry is a register that has
 * stopped describing the building. Either way somebody has to look.
 *
 * ── WHY SET EQUALITY AND NOT A COUNT ──────────────────────────────────
 * A budget of "no more than 22" passes a swap: one invention surfaces, another
 * is buried, the total holds and the rule reports nothing. The swap is exactly
 * the event worth seeing.
 */

const ROOMS = [
  { rel: "src/app/command-deck/page.tsx", label: "/command-deck" },
  { rel: "src/components/chart/ChartsDashboard.tsx", label: "/charts" },
] as const;

/**
 * Comment-stripped, so a `<details>` written in PROSE — and this repo's rooms
 * are full of prose about `<details>`, because both were cured of burial — can
 * never shift a real mount's depth. Colons are preserved ahead of `//` so
 * `https://` in a comment does not eat the rest of a line.
 */
function roomSource(rel: string): string {
  return fs
    .readFileSync(path.join(process.cwd(), rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function buriedOnly(src: string): string[] {
  const depthAt = (offset: number) => {
    const before = src.slice(0, offset);
    const opens = before.match(/<details[\s>]/g)?.length ?? 0;
    const closes = before.match(/<\/details>/g)?.length ?? 0;
    return opens - closes;
  };
  const depths = new Map<string, number[]>();
  const re = /<([A-Z][A-Za-z0-9]*)[\s/>]/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const list = depths.get(m[1]) ?? [];
    list.push(depthAt(m.index));
    depths.set(m[1], list);
  }
  return [...depths]
    .filter(([, d]) => Math.min(...d) > 0)
    .map(([name]) => name)
    .sort();
}

/**
 * THE REGISTER. Grouped by WHY, because "22 names" is a number and the reasons
 * are the part a human has to read.
 */
const REGISTER: Readonly<Record<string, readonly string[]>> = {
  "/command-deck": [
    // ── DEBT. Real intelligence whose only door is a second press. ──
    "ATHOSInterventionPanel",
    "DLARStrip",
    /* `DecisionChainPanel` WAS HERE, AND IT CAME OFF THE SAME DAY.
       It is the first entry this register has discharged: the chain is now the
       WORKSPACE grammar's third tenant, so `decisionChainEquipment`'s
       `renderDepth` mounts it at zero `<details>` depth and the room has a door
       to it that is not a second press. The numbered drawer section was NOT
       removed — the two deep mounts are still there, which is why this entry
       goes rather than stays: buried-only means EVERY mount is buried, and that
       stopped being true.

       Recorded here rather than silently deleted because the whole claim of
       this file is that the number cannot move without somebody looking. It
       moved 22 → 21, and this is the looking. */
    "DecisionWhyPanel",
    "LearningGenomeInspector",
    /* `MirrorPanel` WAS HERE. Second entry discharged, same mechanism as the
       first: it became the WORKSPACE grammar's fourth tenant, so
       `mirrorEquipment`'s `renderDepth` mounts it at zero `<details>` depth.
       The phase-gated in-room mount is untouched — this is a door added, not a
       surface moved, which is why the entry comes off rather than staying:
       buried-only means EVERY mount is buried, and that stopped being true.

       21 → 20. Recorded rather than silently deleted, because the whole claim
       of this file is that the number cannot move without somebody looking. */
    "PersonalEdgeChip",
    "PracticeHonestyLayer",
    "SceneAdmissionPanel",
    "StructureContextNote",
    "WhyInspector",
    // ── BY DESIGN. Deliberately one layer under something that is not. ──
    "StoryRibbon",            // One Story owns the primary read; this is the full chronology beneath it
    "PerCapabilityFidelityGrid",
    "ProviderWireStrip",
    "SceneAdmitsAmbient",
    // ── STRUCTURAL. Layout primitives; they live wherever their section does. ──
    "SectionBanner",
    "SemanticZoom",
    "Stat",
    // ── NAVIGATION / BRIDGES, not inventions. ──
    "CommandContextRibbon",
    "OpeningBellSlot",
    "RealmGateway",
    "TodayPrepBridge",
  ],
  /**
   * ZERO, and that is the interesting half. `/charts` adopted the equipment
   * grammar and carries 61 distinct components with not one of them buried-only
   * — including the two the chart room was explicitly cured of. An empty list
   * here is a claim, so the vacuity control below makes sure the scan is
   * capable of returning something for this file at all.
   */
  "/charts": [],
};

describe("every buried-only component is on the register", () => {
  for (const room of ROOMS) {
    const src = roomSource(room.rel);
    const found = buriedOnly(src);
    const declared = [...REGISTER[room.label]].sort();

    it(`${room.label} — the scan reaches this room at all`, () => {
      // Without this, a renamed file or a regex that stopped matching would
      // report "no buried components" and read exactly like a clean room.
      const mounts = src.match(/<[A-Z][A-Za-z0-9]*[\s/>]/g)?.length ?? 0;
      expect(mounts, `${room.rel} → no component mounts found; the scan is blind`)
        .toBeGreaterThan(20);
    });

    it(`${room.label} — nothing new was buried`, () => {
      const unregistered = found.filter((c) => !declared.includes(c));
      expect(
        unregistered,
        `${room.rel} → ${unregistered.join(", ")} now has NO mount outside a ` +
          `<details>. Either give it a door that is not a second press, or add ` +
          `it to the register in this file with the reason it belongs down there.`,
      ).toEqual([]);
    });

    it(`${room.label} — no entry has gone stale`, () => {
      const surfaced = declared.filter((c) => !found.includes(c));
      expect(
        surfaced,
        `${room.rel} → ${surfaced.join(", ")} is on the buried register but is ` +
          `no longer buried-only. Good news, and the register must be told: a ` +
          `list that has stopped describing the building is worse than no list.`,
      ).toEqual([]);
    });
  }
});

describe("the register is a debt ledger, not decoration", () => {
  it("/charts really does carry a room's worth of components", () => {
    // The zero above is only meaningful if this file is big enough for a zero
    // to be surprising.
    const src = roomSource("src/components/chart/ChartsDashboard.tsx");
    const distinct = new Set(
      [...src.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)].map((m) => m[1]),
    );
    expect(distinct.size).toBeGreaterThan(40);
  });

  /**
   * RE-PINNED, BECAUSE THE THING IT PINNED WAS CURED.
   *
   * This asserted that `DecisionChainPanel` was on the register and measurably
   * buried-only — the deck's single worst entry, held down so a register that
   * quietly lost its most important name would still go red. Enrolling the
   * chain as WORKSPACE equipment gave it a zero-depth mount, so the old
   * assertion is now false ON PURPOSE.
   *
   * Deleting it would leave the register with no independent anchor at all. So
   * it is re-pinned to the cure instead, and it is STRONGER than what it
   * replaced: it asserts both directions of the same fact — the chain is off
   * the register AND the measurement agrees, from the source, that it surfaced.
   * A register edited to "fix" a red run without touching the building would
   * satisfy the first half and fail the second.
   */
  it("the chain's cure is real in the building, not just on the list", () => {
    expect(
      REGISTER["/command-deck"],
      "DecisionChainPanel is back on the buried register — the equipment door was lost",
    ).not.toContain("DecisionChainPanel");
    const src = roomSource("src/app/command-deck/page.tsx");
    expect(
      buriedOnly(src),
      "the chain is off the register but the source says every mount is still " +
        "behind a <details> — the list was edited instead of the building",
    ).not.toContain("DecisionChainPanel");
    // And the door is the EQUIPMENT one, not an accident of some other mount.
    expect(src).toContain("decisionChainEquipment");
  });
});
