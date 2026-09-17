import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExitRampCard } from "./ExitRampCard";
import type { ExitRamp } from "@/lib/experience/composeExitRamp";

const waitingRamp: ExitRamp = {
  version: "wm.exit-ramp.v1",
  state: "WAITING",
  done: [],
  saved: [],
  open: ["Await new evidence."],
  next: null,
  return: null,
  recap: "WAITING — 1 open",
  safeToLeave: false,
  headline: "Waiting on new evidence before the next action.",
};

describe("ExitRampCard presentation", () => {
  it("embeds the complete receipt without creating another card shell", () => {
    const html = renderToStaticMarkup(<ExitRampCard ramp={waitingRamp} presentation="embedded" />);
    expect(html).toContain('data-presentation="embedded"');
    expect(html).toContain("Await new evidence.");
    expect(html).toContain("border:none");
    expect(html).toContain("background:transparent");
  });

  it("keeps the bordered card presentation as the reusable default", () => {
    const html = renderToStaticMarkup(<ExitRampCard ramp={waitingRamp} />);
    expect(html).toContain('data-presentation="card"');
    expect(html).toContain("background:#0b0b0d");
  });
});

/**
 * §9 — "No green shield. No green means safe. Verified truth is a sentence."
 *
 * This suite exists because the violation was LITERAL and still shipped: the
 * word SAFE TO LEAVE rendered in #5cb85c on a green halo. It survived a
 * repo-wide colour sweep because the token is named `WM.state.ok`, so nothing
 * that grepped for green ever saw it.
 *
 * Asserted on the MARKUP rather than on a token constant, for the same reason
 * the sample pages are: the trader sees a page, not a palette, and a future
 * edit that reaches for a different green would pass a token-name check.
 */
const safeRamp: ExitRamp = {
  version: "wm.exit-ramp.v1",
  state: "DONE",
  done: ["Thesis recorded.", "Protective order acknowledged."],
  saved: ["Decision receipt written."],
  open: [],
  next: "Review at the close.",
  return: "Return when the level is retested.",
  recap: "DONE — nothing outstanding",
  safeToLeave: true,
  headline: "Nothing is outstanding. This is a clean stopping point.",
};

/**
 * GREEN-DOMINANT, not "contains a green channel". Every ivory and brass in
 * this house has a green component — #ede6d3 and #c9a55c both do — so a test
 * that banned the channel would ban the palette. A colour reads as green to a
 * human when its green channel beats both of the others.
 */
function greenDominantColours(html: string): Array<[number, number, number]> {
  const colours: Array<[number, number, number]> = [];
  for (const m of html.matchAll(/#([0-9a-f]{6})\b/gi)) {
    const hex = m[1];
    colours.push([
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]);
  }
  for (const m of html.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    colours.push([Number(m[1]), Number(m[2]), Number(m[3])]);
  }
  return colours.filter(([r, g, b]) => g > r && g > b);
}

describe("ExitRampCard — §9, the receipt may never wear a green shield", () => {
  it("renders the word SAFE with no green anywhere on the card", () => {
    const html = renderToStaticMarkup(<ExitRampCard ramp={safeRamp} />);
    // The verdict is still stated — §9 removes the colour, never the sentence.
    expect(html).toContain("SAFE TO LEAVE");
    expect(greenDominantColours(html)).toEqual([]);
  });

  it("puts no green on the unsafe card either", () => {
    const html = renderToStaticMarkup(<ExitRampCard ramp={waitingRamp} />);
    expect(greenDominantColours(html)).toEqual([]);
  });

  it("names the specific colours that must never return to this card", () => {
    const html = renderToStaticMarkup(<ExitRampCard ramp={safeRamp} />);
    // WM.state.ok and WM.halo.ok. Pinned by value so a rename of the token
    // cannot quietly reintroduce the shade under a different key.
    expect(html).not.toContain("#5cb85c");
    expect(html).not.toContain("rgba(92,184,92");
  });

  it("states the safe verdict as restrained ivory fact, not as reassurance", () => {
    const html = renderToStaticMarkup(<ExitRampCard ramp={safeRamp} />);
    // Ivory is the house colour for a FINDING. Brass is reserved for the
    // direction this card is allowed to raise its voice in — what is still
    // outstanding — so the safe verdict must not be brass either.
    expect(html).toContain("#ede6d3");
  });

  it("does not glow behind the safe verdict", () => {
    const safe = renderToStaticMarkup(<ExitRampCard ramp={safeRamp} />);
    const unsafe = renderToStaticMarkup(<ExitRampCard ramp={waitingRamp} />);
    // A halo is emphasis. Emphasis belongs on the outstanding thing, and the
    // safe card has no outstanding thing to emphasise.
    expect(safe).toContain("background:transparent");
    expect(unsafe).toContain("rgba(201,165,92,0.15)");
  });
});
