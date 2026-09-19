/**
 * THE OBJECT PASSPORT, RENDERED — three states that must never collapse.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ObjectPassportSlots from "./ObjectPassportSlots";
import {
  MARKET_OBJECT_KINDS,
  type MarketObject,
  type MarketObjectKind,
} from "@/lib/marketData/marketObjectKinds";

const object = (over: Partial<MarketObject> = {}): MarketObject => ({
  objectId: "o1",
  kind: "ZONE",
  symbolId: "TSLA",
  sessionId: "s1",
  priceLow: 140,
  priceHigh: 178,
  birthBarId: "2023-05-12",
  testBarIds: ["b1", "b2", "b3"],
  lastResponseBarId: "2024-09-15",
  invalidationPrice: 139,
  state: "ALIVE",
  evidenceIds: [],
  decay: 0.0187,
  asOf: 1,
  fidelityAtBirth: "INDICATIVE",
  ...over,
});

const render = (props: Parameters<typeof ObjectPassportSlots>[0]): string =>
  renderToStaticMarkup(<ObjectPassportSlots {...props} />);

describe("the three states of absence, kept apart", () => {
  it("NEVER LOOKED DRAWS NOTHING — not an empty card", () => {
    // A surface that has not asked must not report a finding. Rendering "no
    // object" here would be the house answering a question it never put.
    expect(render({})).toBe("");
  });

  it("LOOKED AND FOUND NOTHING IS A FINDING, IN WORDS", () => {
    // The H1 defect this avoids: five empty slot chips read as an object that
    // has no memory, when the truth is that there is no object.
    const html = render({ object: null });
    expect(html).toContain("object-passport-none-selected");
    expect(html).not.toContain("object-slot-birthBarId");
    expect(html).not.toContain("object-kind-chip");
  });

  it("an object present fills every slot", () => {
    const html = render({ object: object() });
    for (const slot of ["birthBarId", "tests", "lastResponse", "state", "decay"]) {
      expect(html, slot).toContain(`object-slot-${slot}`);
    }
    expect(html).toContain("2023-05-12");
    expect(html).toContain("ALIVE");
    expect(html).toContain("0.0187");
    expect(html).toContain(">3<"); // three testBarIds, counted not listed
  });
});

describe("one drawer — the layout does not branch by kind", () => {
  it("EVERY KIND RENDERS THE SAME FIVE SLOTS", () => {
    // The law this enforces is the reason the contract exists: if one kind
    // could omit a slot, the drawer would need to know which kind it is looking
    // at, and the inspect would become seven inspects.
    for (const kind of MARKET_OBJECT_KINDS) {
      const band = kind === "LEVEL" || kind === "INVALIDATION" || kind === "ANCHOR";
      const html = render({
        object: object({ kind: kind as MarketObjectKind, priceHigh: band ? 140 : 178 }),
      });
      for (const slot of ["birthBarId", "tests", "lastResponse", "state", "decay"]) {
        expect(html, `${kind} is missing ${slot}`).toContain(`object-slot-${slot}`);
      }
    }
  });

  it("KIND ONLY CHANGES THE NOUN ON THE DOOR", () => {
    // Same object, two kinds: the SLOT REGION must come out byte-identical.
    //
    // The rail is deliberately excluded from this comparison, and the first
    // draft of this test got that wrong in a way worth recording. It compared
    // the whole markup, which fails — because the rail moves its emphasis to
    // whichever kind is current, which is exactly what §9 asks of it. Demanding
    // byte-equality across the whole component would have forbidden marking the
    // current kind at all, and the cheapest way to satisfy it would have been
    // to delete the mark. That is a guard distorting the thing it protects, and
    // this repo has the precedent written down.
    //
    // So the assertion is scoped to the region the law is actually about: the
    // drawer. The rail's own law is tested separately, below.
    const slots = (kind: "ZONE" | "GAP_FVG") => {
      const html = render({ object: object({ kind }) });
      const start = html.indexOf('data-testid="object-slot-birthBarId"');
      const end = html.indexOf('data-testid="closed-kinds-rail"');
      expect(start, "slot region not found").toBeGreaterThan(-1);
      expect(end, "rail not found").toBeGreaterThan(start);
      return html.slice(start, end);
    };
    expect(slots("ZONE")).toBe(slots("GAP_FVG"));
  });
});

describe("§15 — a slot is a value, never a grade", () => {
  it("DECAY KEEPS ITS NUMBER AND GAINS NO TRACK", () => {
    // A length beside a value invites "how full is this object", which is a
    // grade. The mockup's absence of a bar is a specification, not an omission.
    const html = render({ object: object() });
    expect(html).toContain("0.0187");
    expect(html).not.toMatch(/width:\s*\d+(\.\d+)?%/);
  });

  it("STATE IS A WORD", () => {
    for (const state of ["ALIVE", "TESTED", "DEFENDED", "CONSUMED", "INVALID"] as const) {
      const html = render({ object: object({ state }) });
      expect(html, state).toContain(state);
    }
  });

  it("renders no percentage anywhere", () => {
    expect(render({ object: object() })).not.toMatch(/\d%/);
  });
});

describe("§9 — the rail distinguishes by weight, never by hue", () => {
  it("SHOWS ALL SEVEN KINDS EVEN WITH NOTHING SELECTED", () => {
    // The question "is my Order Block supported?" is asked by a trader who has
    // selected nothing. The contract is true regardless of selection.
    const html = render({ object: null });
    for (const kind of MARKET_OBJECT_KINDS) {
      expect(html, kind).toContain(`closed-kind-${kind}`);
    }
    expect(html).toContain("Closed kinds");
  });

  it("MARKS THE CURRENT KIND WITHOUT GIVING IT A COLOUR OF ITS OWN", () => {
    const html = render({ object: object({ kind: "ZONE" }) });
    expect(html).toMatch(/closed-kind-ZONE[^>]*data-current="true"/);
    expect(html).toMatch(/closed-kind-GAP_FVG[^>]*data-current="false"/);

    // The colours present must come from the house's two text tones only. A
    // third hue appearing here would mean the palette had started saying
    // something about the market — and a ZONE is not warmer than a LEVEL.
    const colours = new Set(
      [...html.matchAll(/color:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1].toLowerCase()),
    );
    for (const c of colours) {
      expect(["#ede6d3", "#c2b892", "#8a8271", "#c9a55c"], `${c} is off-palette`).toContain(c);
    }
  });

  it("USES NO GREEN — no kind, and no state, reads as safe", () => {
    // §9: no green shield, no green means safe. CONSUMED and INVALID are the
    // states most likely to attract a colour, so they are rendered too.
    for (const state of ["ALIVE", "CONSUMED", "INVALID"] as const) {
      const html = render({ object: object({ state }) });
      for (const [, hex] of html.matchAll(/#([0-9a-fA-F]{6})/g)) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        expect(g > r && g > b, `#${hex} is green-dominant in ${state}`).toBe(false);
      }
    }
  });
});
