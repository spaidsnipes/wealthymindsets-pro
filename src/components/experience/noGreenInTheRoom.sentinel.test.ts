/**
 * §9 SENTINEL — NO GREEN MEANS SAFE, IN THE ROOM.
 *
 * Build Order §9: "No green shield. No green means safe. Verified truth is a
 * sentence."
 *
 * ── WHY A SENTINEL AND NOT ANOTHER SWEEP ─────────────────────────────────────
 *
 * A repo-wide §9 colour sweep was run and closed. It missed three live
 * violations, all in this directory, all found later by reading the files:
 *
 *   · ExitRampCard rendered the words SAFE TO LEAVE in #5cb85c on a green halo
 *   · DecisionWhyPanel rendered every CLEARED check in sage #9db88a
 *   · MarketCanvasPanel rendered its RESOLVED and CLEARED labels in #7ac57a
 *
 * None were caught, because a sweep is an event and the rule is a permanent
 * property. A human grepping for "green" finds nothing when the token is
 * called `WM.state.ok` and the literal is `#9db88a`. This file makes the rule
 * enforceable by a machine that cannot be talked out of it.
 *
 * ── SCOPE: THIS DIRECTORY ONLY, AND THAT IS DELIBERATE ───────────────────────
 *
 * The repo carries green-dominant colour in ~98 files. Most is not a §9
 * matter: the brand teal, and the candle/order-flow UP convention, which is a
 * statement about PRICE DIRECTION rather than about safety, and which every
 * trader on earth already reads that way. Freezing all of it would be noise,
 * and would collide with owners of surfaces this shift does not hold.
 *
 * `src/components/experience/` is the decision room. It is where a verdict is
 * rendered next to a trader's capital, and it is exactly where green stops
 * being decoration and starts being a promise. The rule is enforced here.
 *
 * ── WHAT THIS DOES NOT CLAIM ─────────────────────────────────────────────────
 *
 * It does not judge meaning. It cannot tell a green verdict from a green
 * candle, so it does not pretend to: every green-dominant literal in the room
 * must appear in ALLOWED below WITH A WRITTEN REASON. Adding one is cheap and
 * takes ten seconds — writing the sentence is the entire point, because the
 * three violations above would all have failed to produce one.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOM = __dirname;

/**
 * GREEN-DOMINANT, not "contains a green channel". Every ivory and brass in
 * this house has a green component — #ede6d3 is (237,230,211) and #c9a55c is
 * (201,165,92) — so a channel ban would ban the palette. A colour reads as
 * green to a human when its green channel beats both of the others.
 */
/**
 * A colour named in a COMMENT paints nothing. This Sentinel's own subjects
 * document the exact shade they removed — "used to render in #9db88a" — which
 * is the most useful sentence in those files and must not be the thing that
 * fails the build.
 *
 * Only block comments and whole-line `//` comments are stripped. A naive
 * strip-to-end-of-line on every `//` would eat the rest of any line holding a
 * URL, and could therefore HIDE a real colour — a false negative in a safety
 * scanner, which is the one direction this must never fail in. A trailing
 * comment after real code keeps its line, so `affirm: "#9db88a", // green`
 * is still caught.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

function greenDominantLiterals(input: string): string[] {
  const source = withoutComments(input);
  const found = new Set<string>();
  for (const m of source.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const hex = m[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (g > r && g > b) found.add(`#${hex.toLowerCase()}`);
  }
  for (const m of source.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (g > r && g > b) found.add(`rgb(${r},${g},${b})`);
  }
  return [...found].sort();
}

/**
 * THE REVIEWED LEDGER. Every entry is a green that a human looked at and
 * decided is not a safety claim. No entry may be added without a reason, and
 * "it looked fine" is not one.
 *
 * Note what is NOT here: there is no allowance for a verdict, a grade, a
 * CLEARED/RESOLVED/PASSED label, a SAFE badge, or any word that tells the
 * trader a condition has been met. Those are the green shield by definition,
 * and §9 says the shield does not exist — the sentence carries the truth.
 */
const ALLOWED: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "DeckMarketChart.tsx": {
    "#5cb85c":
      "Candle UP colour. A statement about price direction, not about safety — "
      + "the universal chart convention every trader already reads as direction. "
      + "Paired with a DOWN colour, so it encodes a sign, not a verdict.",
  },
  "AbsorptionAnatomyPanel.tsx": {
    "#00d4aa": "WM brand teal, used as a section accent. Names no condition and grades nothing.",
  },
  "AbsorptionAnatomyView.tsx": {
    "#00d4aa":
      "BUY side of a directional volume split — buyer-initiated volume and a "
      + "positive aggression delta, paired with a SELL red. It encodes WHO WAS "
      + "THE AGGRESSOR, the same statement a candle's up colour makes, and it "
      + "grades nothing. The criterion ticks and the STRENGTH word in this file "
      + "deliberately do NOT use it: those are conditions-met claims, and §9 "
      + "says the shield does not exist.",
  },
  "DeltaDivergencePanel.tsx": {
    "#00d4aa": "WM brand teal, used as a section accent. Names no condition and grades nothing.",
  },
  "LiquidityWeatherPanel.tsx": {
    "#00d4aa": "WM brand teal, used as a section accent. Names no condition and grades nothing.",
  },
  "StackedImbalancePanel.tsx": {
    "#00d4aa": "WM brand teal, used as a section accent. Names no condition and grades nothing.",
    "rgb(0,212,170)": "The same brand teal, written as rgba for a low-opacity wash.",
  },
};

/**
 * OUTSTANDING §9 DEBT — known violations this shift did not have the standing
 * to repair. Deliberately NOT folded into ALLOWED: an allowance says "a human
 * looked and this is fine", and that would be a lie about these.
 *
 * DecisionReceiptPanel.tsx carries `affirm: "#9db88a", // green — process
 * honored`, a REVIEWED grade in the same sage, and a realised-R figure that
 * turns green when the number is positive. The first two are §9 violations on
 * their face — green meaning a condition was met. The third is the subtler
 * one: a positive R rendered green teaches that a won trade was a good
 * decision, which is precisely the process/outcome conflation the receipt
 * exists to prevent.
 *
 * It is not repaired here because the file carries uncommitted work by another
 * owner, and the house rule is that contractors may not overwrite Decision /
 * Position files without collision review. Listing it keeps the debt visible
 * and bounded: the test below fails if the list GROWS, so this cannot become a
 * quiet parking space for new green.
 */
const OUTSTANDING: Readonly<Record<string, readonly string[]>> = {
  "DecisionReceiptPanel.tsx": ["#9db88a"],
};

/**
 * Test files are excluded from the scan for one narrow reason: the §9 GUARDS
 * themselves must name the banned colours in order to assert their absence.
 * ExitRampCard.test.tsx pins "#5cb85c" precisely so that shade can never come
 * back. A scanner that failed its own guard would force the guard to be
 * written in a way that cannot pin a value, which is worse than the gap.
 */
function roomSourceFiles(): string[] {
  return readdirSync(ROOM)
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => !/\.(test|sentinel|render)\./.test(f) && !f.endsWith(".d.ts"))
    .sort();
}

describe("§9 Sentinel — the decision room wears no green shield", () => {
  it("scans a room that actually has files in it", () => {
    // A scanner pointed at nothing passes forever. Pin the floor.
    expect(roomSourceFiles().length).toBeGreaterThan(20);
  });

  it("has no green-dominant colour that a human has not signed for", () => {
    const unreviewed: Array<{ file: string; colour: string }> = [];

    for (const file of roomSourceFiles()) {
      const source = readFileSync(path.join(ROOM, file), "utf8");
      const allowedHere = ALLOWED[file] ?? {};
      const outstandingHere = OUTSTANDING[file] ?? [];
      for (const colour of greenDominantLiterals(source)) {
        if (colour in allowedHere) continue;
        if (outstandingHere.includes(colour)) continue;
        unreviewed.push({ file, colour });
      }
    }

    // If this fails: either the colour is a safety claim — in which case §9
    // says remove it, and a FINDING is rendered in ivory (#ede6d3) — or it is
    // not, in which case add it to ALLOWED with a sentence saying why.
    expect(unreviewed).toEqual([]);
  });

  it("keeps the ledger honest — every allowance carries a real reason", () => {
    for (const [file, colours] of Object.entries(ALLOWED)) {
      for (const [colour, reason] of Object.entries(colours)) {
        // A one-word reason is how a ledger like this rots into a rubber stamp.
        expect(reason.length, `${file} ${colour}`).toBeGreaterThan(40);
      }
    }
  });

  it("does not carry a stale allowance for a colour that is gone", () => {
    // An allowance that outlives its colour is an invitation: the next author
    // finds a pre-approved green sitting in the ledger and uses it.
    for (const [file, colours] of Object.entries(ALLOWED)) {
      const source = readFileSync(path.join(ROOM, file), "utf8");
      const present = greenDominantLiterals(source);
      for (const colour of Object.keys(colours)) {
        expect(present, `${file} no longer contains ${colour}`).toContain(colour);
      }
    }
  });

  it("holds the outstanding debt at exactly one file and does not let it grow", () => {
    // A debt list that can absorb new entries silently is not a debt list, it
    // is a bypass. Pinned by count AND by name.
    expect(Object.keys(OUTSTANDING)).toEqual(["DecisionReceiptPanel.tsx"]);
  });

  it("closes the debt automatically once the file is repaired", () => {
    // When DecisionReceiptPanel's green is removed under collision review,
    // this fails and forces the entry out of OUTSTANDING — so the list cannot
    // outlive the violation and become a pre-approved green for the next author.
    for (const [file, colours] of Object.entries(OUTSTANDING)) {
      const source = readFileSync(path.join(ROOM, file), "utf8");
      const present = greenDominantLiterals(source);
      for (const colour of colours) {
        expect(present, `${file} is repaired — remove ${colour} from OUTSTANDING`).toContain(colour);
      }
    }
  });

  it("catches the three greens this Sentinel was written for", () => {
    // Proof the detector bites rather than passing vacuously. These are the
    // exact literals that shipped in this directory.
    expect(greenDominantLiterals('color:"#5cb85c"')).toEqual(["#5cb85c"]);
    expect(greenDominantLiterals('color:"#9db88a"')).toEqual(["#9db88a"]);
    expect(greenDominantLiterals('color:"#7ac57a"')).toEqual(["#7ac57a"]);
    expect(greenDominantLiterals("background:rgba(92,184,92,0.15)")).toEqual(["rgb(92,184,92)"]);
  });

  it("does not fire on the house ivory, brass or charcoal", () => {
    expect(
      greenDominantLiterals('a:"#ede6d3" b:"#c9a55c" c:"#d4af37" d:"#8a8271" e:"#07080a"'),
    ).toEqual([]);
    expect(greenDominantLiterals("rgba(237,230,211,0.55) rgba(201,165,92,0.85)")).toEqual([]);
  });
});
