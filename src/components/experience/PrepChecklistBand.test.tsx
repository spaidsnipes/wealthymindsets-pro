/**
 * THE BAND'S LAWS, MOVED OFF THE ROUTE AND ONTO THE PICTURE.
 *
 * These are not new rules. Every one of them was already enforced — by
 * `selectPrepChecklistBand.enforcement.test.ts`, as a SOURCE Sentinel reading
 * `app/command-deck/page.tsx` with a regex, because that file's own docblock
 * said it had to:
 *
 *   "This is a source Sentinel because the surface is a Founder route with
 *    hooks and cannot be rendered in isolation."
 *
 * That was true of the route and was never true of the band. A source Sentinel
 * is a guard that reads the SPELLING of a law rather than the law: it asserted
 * the literal `flex: "1 1 0"` appeared within 320 characters of a test id, so a
 * band that wrote `flexGrow: 1` would have passed while obeying nothing, and a
 * band that formatted its style object differently would have failed while
 * obeying everything. It caught the two rooms drifting only by luck.
 *
 * Pulling the band into a component it can actually render is what lets the
 * guard stop reading the source and start reading the PIXEL DECISION. Each test
 * below names the route Sentinel it replaces, so the migration is legible and
 * nobody re-adds the weaker one later believing it was lost.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PrepChecklistBand } from "./PrepChecklistBand";
import type { PrepChecklistBand as PrepChecklistBandVM } from "@/lib/experience/selectPrepChecklistBand";

/** A band the OWNER would have compiled — done first, then the rest. */
const band = (done: number, total: number): PrepChecklistBandVM => ({
  marks: [
    ...Array.from({ length: done }, () => ({ checked: true })),
    ...Array.from({ length: total - done }, () => ({ checked: false })),
  ],
  done,
  total,
  remaining: total - done,
});

const render = (
  vm: PrepChecklistBandVM | null,
  over: Partial<React.ComponentProps<typeof PrepChecklistBand>> = {},
): string =>
  renderToStaticMarkup(
    <PrepChecklistBand
      band={vm}
      testId="prep-checklist"
      caption={(b) => `${b.done} of ${b.total} checked`}
      {...over}
    />,
  );

/** Every mark's inline style, in draw order. */
const marks = (html: string): readonly string[] =>
  [...html.matchAll(/data-testid="[\w-]+-mark"[^>]*style="([^"]*)"/g)].map((m) => m[1]);

describe("PrepChecklistBand — the denominator may not shrink", () => {
  it("KEEPS THE WIDTH OF WHAT THE TRADER HAS NOT DONE", () => {
    // Replaces the route Sentinel "gives an unchecked item the same width as a
    // checked one", which read `flex: "1 1 0"` out of the page source. This
    // reads the style that actually ships on every mark.
    const styles = marks(render(band(3, 11)));
    expect(styles, "one mark per item on the trader's own list").toHaveLength(11);
    for (const s of styles) {
      expect(s).toContain("flex:1 1 0");
      expect(s).toContain("min-width:0");
      expect(s).toContain("height:4px");
    }
  });

  it("changes EXACTLY ONE thing between a checked and an unchecked mark", () => {
    // The old guard asserted the absence of three specific conditional
    // properties by name. This compares the two states directly, so a fourth
    // property nobody thought to forbid cannot slip through either.
    const styles = marks(render(band(1, 2)));
    const [lit, unlit] = styles;
    const props = (s: string) =>
      new Map(s.split(";").filter(Boolean).map((d) => [d.split(":")[0], d] as const));
    const [a, b] = [props(lit), props(unlit)];
    expect([...a.keys()], "the two states declare different properties").toEqual([...b.keys()]);
    const differing = [...a.keys()].filter((k) => a.get(k) !== b.get(k));
    expect(differing, "geometry must never ask whether an item is checked").toEqual(["background"]);
  });

  it("gives the same band the same width in every room — the drift this cured", () => {
    // /command-deck drew it 76px wide, /journal 72px. Nobody decided that. The
    // width is no longer reachable from a call site, so this asserts the only
    // thing left to assert: the two rooms get an identical band.
    const deck = render(band(3, 11), { testId: "prep-checklist" });
    const journal = render(band(3, 11), { testId: "journal-prep", inline: true });
    const width = (html: string) => html.match(/width:(\d+px)/)![1];
    expect(width(deck)).toBe(width(journal));
    expect(width(deck)).toBe("76px");
  });
});

describe("PrepChecklistBand — it draws a count, and passes no judgement", () => {
  it("states the count in the house's FINDING colour, not its raised voice", () => {
    // Replaces the route Sentinel of the same name. The fraction was once
    // brass #c9a55c — the one direction the house may raise its voice — and it
    // was raising it at the trader, about the trader.
    const count = render(band(3, 11)).match(
      /data-testid="prep-checklist-count"[^>]*style="([^"]*)"/,
    )![1];
    expect(count).toContain("color:#8a8271");
    expect(count).not.toContain("#c9a55c");
  });

  it("CARRIES NO GREEN AT ANY STATE — §9", () => {
    // Replaces the per-room "colours no prep count green" scan, which searched
    // route source for conditional colour expressions. The journal used to turn
    // this figure #7fbf7f the moment the last box was ticked; /morning-prep
    // turned #00D4AA at a full list. A full checklist is not a safe trade and
    // the house has no standing to congratulate anyone for one.
    //
    // Walked across the whole range, not sampled: the old defect only appeared
    // at the top of it.
    for (let done = 0; done <= 5; done += 1) {
      const html = render(band(done, 5));
      for (const m of html.matchAll(/#([0-9a-f]{6})\b/gi)) {
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
        expect(g > r && g > b, `green-dominant #${m[1]} at ${done}/5`).toBe(false);
      }
    }
  });

  it("puts no readiness verdict and no percentage beside the band — §15", () => {
    // Replaces the route Sentinel of the same name. Three of eleven items is
    // not 27% prepared, and a full band is not READY.
    const html = render(band(11, 11));
    expect(html).not.toMatch(/\b(READY|NOT_READY|SCORE|GRADE)\b/i);
    expect(html).not.toMatch(/\d+\s*%/);
  });
});

describe("PrepChecklistBand — HOW MANY, never WHICH", () => {
  it("hangs no name, id or label on a mark", () => {
    // `openingBellPrep` refuses to map a count onto named rows. A mark carrying
    // an item's text would fabricate that mapping at the render layer, wearing
    // the trader's own authority. The VM gives it nothing to leak — this
    // guards the render layer from inventing one.
    const html = render(band(3, 11));
    for (const style of marks(html)) expect(style).not.toMatch(/content|label/i);
    expect(html).not.toMatch(/\b(title|aria-label|alt)=/);
  });

  it("hides the picture from a screen reader and gives it the words instead", () => {
    // The band is aria-hidden, so the caption is not a caption: it carries the
    // whole reading. A band with no caption would be a picture nobody
    // non-visual can read, which is why `caption` is required rather than
    // optional.
    const html = render(band(3, 11));
    expect(html).toMatch(/data-testid="prep-checklist-band"[^>]*aria-hidden="true"/);
    expect(html).toContain("3 of 11 checked");
  });

  it("lets the room choose its words but never its arithmetic", () => {
    // The caption is a FUNCTION of the compiled band. A room receives `done`
    // and `total` already computed and has nothing to divide.
    const html = render(band(7, 11), { caption: (b) => `checklist ${b.done} of ${b.total}` });
    expect(html).toContain("checklist 7 of 11");
  });
});

describe("PrepChecklistBand — nothing observed draws nothing (H1)", () => {
  it("DRAWS ABSOLUTELY NOTHING FOR A NULL BAND", () => {
    // The cardinal defect, in geometry. The selector returns null for an
    // unreadable prep, an absent prep and an empty list — precisely so that
    // "we could not look" is never rendered as "you did nothing". A row of
    // unlit marks here would say the second thing in a picture.
    expect(render(null)).toBe("");
  });

  it("does not call the caption when there is no band to caption", () => {
    let called = false;
    render(null, {
      caption: () => {
        called = true;
        return "";
      },
    });
    expect(called, "a room was asked to describe a reading that does not exist").toBe(false);
  });

  it("draws a genuinely empty list as an unlit band, not as nothing", () => {
    // The one case that IS zero rather than unknown: the owner compiled a real
    // list and the trader has ticked none of it. That is a finding, and it is
    // the difference this component must keep visible against the null above.
    const styles = marks(render(band(0, 4)));
    expect(styles).toHaveLength(4);
    expect(new Set(styles).size, "an all-unchecked band must still be uniform").toBe(1);
  });
});

describe("PrepChecklistBand — it fits the room it is standing in", () => {
  it("does not break a line of running text when inline", () => {
    // /journal's strip is a run of text. A block element there would break the
    // line; the deck stacks it in a flex column and must not be inline.
    expect(render(band(3, 11), { inline: true })).toMatch(/<span[^>]*display:inline-flex/);
    expect(render(band(3, 11))).toMatch(/<div[^>]*display:flex/);
  });

  it("keeps the two rooms addressable apart", () => {
    // The rooms were already named apart and the enforcement Sentinel addresses
    // them by those names. A shared id would make "the deck draws it" and "the
    // journal draws it" indistinguishable to every guard that watches them.
    expect(render(band(1, 2), { testId: "journal-prep" })).toContain(
      'data-testid="journal-prep-mark"',
    );
    expect(render(band(1, 2), { testId: "journal-prep" })).not.toContain("prep-checklist");
  });

  it("publishes the count on the band itself for anything that measures it", () => {
    const html = render(band(3, 11));
    expect(html).toMatch(/data-done="3"/);
    expect(html).toMatch(/data-total="11"/);
  });
});
