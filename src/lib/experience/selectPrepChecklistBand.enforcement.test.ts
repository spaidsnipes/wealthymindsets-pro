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
