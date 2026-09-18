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

  it("draws no band of its own — it asks the single owner for the picture", () => {
    /* ── THIS LAW MOVED HOUSE, AND GOT STRONGER DOING IT ────────────────────
     *
     * The denominator may not shrink to flatter the numerator. That was
     * asserted here, against the route, "because that is where a width is
     * chosen" — and it no longer is. The band is
     * `components/experience/PrepChecklistBand.tsx` now, and the width is not
     * even reachable from a call site.
     *
     * The law travelled with it. `PrepChecklistBand.test.tsx` →
     * "KEEPS THE WIDTH OF WHAT THE TRADER HAS NOT DONE" reads the style that
     * actually ships on every mark, and its neighbour compares a checked mark
     * against an unchecked one property by property rather than forbidding
     * three by name. What stood here asserted that the literal `flex: "1 1 0"`
     * appeared within 320 characters of a test id: a band written `flexGrow: 1`
     * would have passed it while obeying nothing.
     *
     * What is left here is the part that is genuinely about THIS ROUTE.
     */
    expect(deck).toContain("<PrepChecklistBand");
    // Not one hand-rolled mark anywhere on the route. A second copy of the band
    // is how the four-pixel drift that caused the extraction starts again.
    expect(deck).not.toMatch(/data-testid="prep-checklist-mark"/);
    expect(deck).not.toMatch(/flex: "1 1 0"[\s\S]{0,240}mark\.checked/);
  });

  it("chooses the WORDS of the reading, and never its arithmetic", () => {
    // The caption is a FUNCTION of the already-compiled band. The route may
    // phrase the count; there is nothing there for it to divide.
    expect(deck).toMatch(/caption=\{\(b\) =>[\s\S]{0,120}b\.done[\s\S]{0,60}b\.total/);
    expect(deck).not.toMatch(/\{prepBand\.done\}\s*of\s*\{prepBand\.total\}/);
  });

  it("keeps the colour and §15 laws enforced SOMEWHERE — they are not simply gone", () => {
    /* A migrated Sentinel is indistinguishable from a deleted one unless
     * something checks that the new owner picked it up. Two laws left this file
     * with the band — the count's FINDING colour, and the §15 silence beside
     * it — and this is the receipt that they landed.
     *
     * Asserted by NAME against the new suite, so deleting a law over there
     * fails over here, where the reason it exists is written down.
     */
    const migrated = read("components/experience/PrepChecklistBand.test.tsx");
    expect(migrated).toContain("states the count in the house's FINDING colour");
    expect(migrated).toContain("no readiness verdict and no percentage");
    expect(migrated).toContain("KEEPS THE WIDTH OF WHAT THE TRADER HAS NOT DONE");
    // And it must actually render the component, not read its source — the
    // whole reason the move was worth making.
    expect(migrated).toContain("renderToStaticMarkup");
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

  /* ── THE §9 SCAN FOLLOWS THE DECISION, NOT THE ROUTE ──────────────────────
   *
   * The journal turned #7fbf7f on a full list and /morning-prep turned #00D4AA
   * at 100%: green-means-safe, aimed at the trader's own discipline. A full
   * checklist is not a safe trade, and no room has standing to congratulate
   * anyone for one.
   *
   * This scanned every room for the EXPRESSIONS that decide a prep colour,
   * rather than for green near the word "prep" — a proximity guard had already
   * false-fired here on unrelated growth-practice chips that happen to sit on a
   * route with "prep" in its name, and a guard that makes a route rename its
   * own palette to satisfy a rule about the prep count has started distorting
   * the thing it protects.
   *
   * Two of the three rooms now decide NO prep colour at all: the conditional
   * fill moved into the band's owner. Left as it was, the non-vacuity check
   * (`decisions.length > 0`) would fail them for having become STRUCTURALLY
   * incapable of the defect — the guard punishing the cure.
   *
   * So the scan is aimed where the decision now lives, and the rooms that gave
   * it up are held to the stronger statement instead: they choose no prep
   * colour whatsoever.
   */
  const COLOUR_DECIDERS = [
    "components/experience/PrepChecklistBand.tsx",
    "app/morning-prep/page.tsx",
  ] as const;

  it.each(COLOUR_DECIDERS)("%s decides no prep colour green — §9", (file) => {
    const src = stripComments(read(file));
    const decisions = [
      ...src.matchAll(/(?:done|i\.done|mark\.checked|pct)\s*===?[^?]*\?[^:]*:[^,}\n]*/g),
      ...src.matchAll(/(?:mark\.checked|i\.done)\s*\?[^:]*:[^,}\n]*/g),
    ].map((m) => m[0]);
    expect(decisions.length, "nothing here decides a prep colour any more").toBeGreaterThan(0);
    for (const d of decisions) {
      for (const c of d.matchAll(/#([0-9a-f]{6})\b/gi)) {
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(c[1].slice(i, i + 2), 16));
        expect(g > r && g > b, `green #${c[1]} decides a prep colour in ${file}: ${d}`).toBe(false);
      }
    }
  });

  it("the band's WHOLE palette is the prep palette — every colour in it, checked", () => {
    /* NARROW ON PURPOSE, AND THE NARROWING IS THE POINT.
     *
     * The band names its fills as constants (`CHECKED`, `UNCHECKED`, `COUNT`)
     * rather than writing literals at the decision site, so the scan above —
     * which reads conditional EXPRESSIONS — cannot see them. A green would now
     * be introduced at the constant, where nothing was looking.
     *
     * The fix is a whole-file palette sweep, and it is sound HERE for a reason
     * that does not generalise: `PrepChecklistBand.tsx` is a single-purpose
     * file whose entire palette IS the prep palette. There is no other element
     * in it to have an opinion about colour.
     *
     * Aimed one file wider, this same sweep failed `/morning-prep` over
     * `#88F5D3` — a rule-adherence day-streak chip, nothing to do with the
     * checklist. That is verbatim the false positive this suite's author
     * already cured once: "a guard that makes a route rename its own palette to
     * satisfy a rule about the prep count has started distorting the thing it
     * protects." A route is a room full of other people's decisions; a
     * component is one decision. The sweep belongs only on the second.
     *
     * (The streak chip's green is a real §9 question and it is NOT this
     * Sentinel's to answer — `noGreenInTheRoom` is scoped to
     * `components/experience/` and does not reach app routes, so today nothing
     * guards it. Filed separately rather than smuggled in here, because a guard
     * that grows a new jurisdiction every time it notices something is how
     * these become unmaintainable.)
     */
    const src = stripComments(read("components/experience/PrepChecklistBand.tsx"));
    const colours = [...src.matchAll(/#([0-9a-f]{6})\b/gi)];
    expect(colours.length, "no colour constants left to check").toBeGreaterThan(0);
    for (const c of colours) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(c[1].slice(i, i + 2), 16));
      expect(g > r && g > b, `green-dominant #${c[1]} in the band`).toBe(false);
    }
  });

  it.each(["app/command-deck/page.tsx", "app/journal/page.tsx"] as const)(
    "%s decides no prep colour AT ALL — the stronger state",
    (room) => {
      // Not "chooses no green": chooses nothing. There is no conditional fill
      // left on these routes to turn any colour, which is why the band could
      // not drift between them again even if someone wanted it to.
      const src = stripComments(read(room));
      expect(src).not.toMatch(/mark\.checked\s*\?/);
      expect(src).toContain("<PrepChecklistBand");
    },
  );

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
