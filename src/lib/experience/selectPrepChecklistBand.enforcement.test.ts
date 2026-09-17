/**
 * THE DECK MAY NOT COUNT THE TRADER'S PREP BY ITSELF.
 *
 * `/command-deck` used to answer one question twice. `OpeningBellSlot` compiled
 * the count through `selectPrepEvidence` into a careful sentence; a few hundred
 * lines below, `TodayPrepBridge` read `checklistDone` and `checklistTotal` RAW
 * off the adapter and printed `{done}/{total} checked`.
 *
 * Two roads to one fact (§24). The raw road carried none of the owner's
 * refusals — no clamp, no cap, and no idea that `UNAVAILABLE` must never be
 * drawn as zero. It was gated on `checklistTotal > 0`, which happens to be
 * sufficient today only because the adapter zeroes an unreadable summary; the
 * gate is an accident of a neighbouring module, not a rule this file stated.
 *
 * This is a source Sentinel because the surface is a Founder route with hooks
 * and cannot be rendered in isolation. It asserts the INVARIANT — the route
 * asks the owner — rather than pinning a location.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(SRC, p), "utf8");

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("prep checklist band — enforcement", () => {
  const deck = stripComments(read("app/command-deck/page.tsx"));

  it("routes the deck's prep count through the owner, not the adapter", () => {
    expect(deck).toContain("selectPrepChecklistBand");
    expect(deck).toMatch(/selectPrepChecklistBand\(\s*selectPrepEvidence\(/);
  });

  it("does NOT print a bare done/total fraction off the adapter any more", () => {
    // The exact shape that was there: two adapter fields divided by a slash in
    // JSX. If it returns, the deck is answering the question twice again.
    expect(deck).not.toMatch(/\{prep\.checklistDone\}\s*\/\s*\{prep\.checklistTotal\}/);
  });

  it("reads the adapter's counts ONLY to hand them to the owner", () => {
    // Every mention of the raw fields must sit inside a `selectPrepEvidence`
    // argument list. A third reader would be a third road to the same fact.
    const uses = [...deck.matchAll(/prep\.checklist(?:Done|Total)/g)];
    expect(uses.length).toBeGreaterThan(0); // not vacuous
    const inOwnerCall = [...deck.matchAll(/checklist(?:Done|Total):\s*prep\.checklist(?:Done|Total)/g)];
    expect(inOwnerCall).toHaveLength(uses.length);
  });

  it("keeps the band's marks anonymous — HOW MANY, never WHICH", () => {
    // `openingBellPrep` refuses to map a count onto named rows. A mark carrying
    // an item id or label would fabricate that mapping at the render layer,
    // wearing the trader's own authority.
    const band = stripComments(read("lib/experience/selectPrepChecklistBand.ts"));
    expect(band).not.toMatch(/\b(label|id|text|title)\s*:/);
    expect(band).toMatch(/readonly checked: boolean/);
  });

  it("refuses to draw anything but an OBSERVED count — H1", () => {
    const band = stripComments(read("lib/experience/selectPrepChecklistBand.ts"));
    expect(band).toMatch(/evidence\.kind !== "OBSERVED"\) return null/);
    expect(band).toMatch(/done == null \|\| total == null\) return null/);
  });

  it("gives an unchecked item the same width as a checked one", () => {
    // The denominator may not shrink to flatter the numerator. Asserted on the
    // route because that is where a width is chosen.
    const bandMarkup = deck.match(/data-testid="prep-checklist-mark"[\s\S]{0,320}/)![0];
    expect(bandMarkup).toContain('flex: "1 1 0"');
    // One conditional — the FILL — and nothing conditional about the geometry.
    expect(bandMarkup).toMatch(/background: mark\.checked \?/);
    expect(bandMarkup).not.toMatch(/(width|flex|height): mark\.checked \?/);
  });

  it("states the count in the house's FINDING colour, not its raised voice", () => {
    // The fraction was brass #c9a55c — the one direction the house may raise
    // its voice — and it was raising it at the trader about the trader.
    const count = deck.match(/data-testid="prep-checklist-count"[\s\S]{0,200}/)![0];
    expect(count).toContain("#8a8271");
    expect(count).not.toContain("#c9a55c");
  });

  it("puts no readiness verdict or percentage beside the band — §15", () => {
    const region = deck.match(/data-testid="prep-checklist-band"[\s\S]{0,900}/)![0];
    expect(region).not.toMatch(/\b(READY|NOT_READY|SCORE|GRADE|%)\b/);
  });
});

/**
 * THREE ROOMS, ONE MORNING.
 *
 * /command-deck, /journal and /morning-prep all show the trader's prep count.
 * /morning-prep went through the owner from the start; the other two each kept
 * a private copy of the arithmetic, and the two copies had already drifted —
 * the deck printed "7/11 checked", the journal printed "checklist 7/11", and
 * the journal turned the figure GREEN when the last box was ticked.
 *
 * Asserted as one suite because the defect is not "a file is wrong". It is that
 * a fact with an owner can be reached without asking the owner, and the third
 * room to do it will look reasonable in isolation too.
 */
describe("prep checklist band — every room asks the same owner", () => {
  const ROOMS = [
    "app/command-deck/page.tsx",
    "app/journal/page.tsx",
    "app/morning-prep/page.tsx",
  ] as const;

  it.each(ROOMS)("%s reaches the count through selectPrepEvidence", (room) => {
    expect(stripComments(read(room))).toMatch(/selectPrepEvidence\(\{/);
  });

  it.each(ROOMS)("%s does its own division nowhere", (room) => {
    const src = stripComments(read(room));
    // A slash between the two adapter fields, in any spacing, in any order.
    expect(src).not.toMatch(/checklistDone\}?\s*\/\s*\{?prep\.checklistTotal/);
    expect(src).not.toMatch(/\bdone\}\s*\/\s*\{total\b/);
  });

  it.each(ROOMS)("%s colours no prep count green — §9", (room) => {
    // The journal turned #7fbf7f on a full list and /morning-prep turned
    // #00D4AA at 100%: green-means-safe, aimed at the trader's own discipline.
    // A full checklist is not a safe trade, and the room has no standing to
    // congratulate anyone for one.
    //
    // Asserted against the EXPRESSIONS that decide a prep colour, not against
    // proximity. A window-based guard failed here on unrelated growth-practice
    // chips that happen to sit on a route with "prep" in its name — and a guard
    // that makes a route rename its own palette to satisfy a rule about the
    // prep count has started distorting the thing it protects.
    const src = stripComments(read(room));
    const decisions = [
      ...src.matchAll(/(?:done|i\.done|mark\.checked|pct)\s*===?[^?]*\?[^:]*:[^,}\n]*/g),
      ...src.matchAll(/(?:mark\.checked|i\.done)\s*\?[^:]*:[^,}\n]*/g),
    ].map((m) => m[0]);
    expect(decisions.length).toBeGreaterThan(0); // not vacuous on any room
    for (const d of decisions) {
      for (const c of d.matchAll(/#([0-9a-f]{6})\b/gi)) {
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(c[1].slice(i, i + 2), 16));
        expect(g > r && g > b, `green #${c[1]} decides a prep colour in ${room}: ${d}`).toBe(false);
      }
    }
  });

  it("states no percentage of the trader anywhere on the prep routes — §15", () => {
    // /morning-prep drew `width: {pct}%` over the checklist. Three of eleven
    // items is not 27% prepared; `openingBellPrep` refuses a readiness score
    // two hundred lines away, and a bar is not an exemption from that.
    for (const room of ROOMS) {
      const src = stripComments(read(room));
      expect(src, room).not.toMatch(/checklist\.length\)\s*\*\s*100/);
      expect(src, room).not.toMatch(/width:\s*`\$\{pct\}%`/);
    }
  });

  it("draws the band in the two rooms that show NO item list, and not in the one that does", () => {
    // Refusal 3. /morning-prep renders the trader's named rows. A band of
    // anonymous marks beside them would invite the reader to map the third mark
    // to the third row — fabricating the mapping the owner declined to invent,
    // and making it look like it came from the trader.
    expect(stripComments(read("app/command-deck/page.tsx"))).toContain("selectPrepChecklistBand");
    expect(stripComments(read("app/journal/page.tsx"))).toContain("selectPrepChecklistBand");
    expect(stripComments(read("app/morning-prep/page.tsx"))).not.toContain("selectPrepChecklistBand");
  });
});
