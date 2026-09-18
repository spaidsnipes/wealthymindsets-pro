/**
 * THE BAND'S OWN LAWS, now that two surfaces depend on it.
 *
 * `MarketCanvasPanel.test.tsx` already guards the band AS THE PANEL DRAWS IT,
 * and those tests are untouched — they are the panel's contract with its
 * reader. What is here is the contract the band owes EVERY caller, including
 * the one that hides it from assistive technology and the one that shrinks it
 * into a 10px chip row.
 *
 * The distinction matters because the pill is the surface where this reading
 * has already gone wrong once in production: it read "7 unresolved" on live
 * TSLA while the panel beside it said "RESOLVED (4)" — eleven marks on a board
 * of eight — because PARTIAL was counted in both. A shared owner is only worth
 * the name if the SCALES cannot drift apart the way those two counts did.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DimensionStandingBand, standingInWords, STANDING } from "./DimensionStandingBand";

/** The eight canonical dimensions, named as the compiler names them. */
const DIMS = [
  "Regime",
  "Direction",
  "Location",
  "Participation",
  "Volatility",
  "Liquidity",
  "Time",
  "Correlation",
] as const;

type VM = React.ComponentProps<typeof DimensionStandingBand>["vm"];

/** A board, split at two cut points. Always eight dimensions. */
const board = (nResolved: number, nMeasured: number): VM => ({
  resolved: DIMS.slice(0, nResolved),
  measured: DIMS.slice(nResolved, nResolved + nMeasured),
  missing: DIMS.slice(nResolved + nMeasured),
});

const render = (vm: VM, scale: "panel" | "pill" = "panel"): string =>
  renderToStaticMarkup(<DimensionStandingBand vm={vm} testId="t" scale={scale} />);

const standings = (html: string): readonly string[] =>
  [...html.matchAll(/data-standing="(\w+)"/g)].map((m) => m[1]);

const markStyles = (html: string): readonly string[] =>
  [...html.matchAll(/data-testid="t-mark"[^>]*style="([^"]*)"/g)].map((m) => m[1]);

describe("DimensionStandingBand — the row is the denominator", () => {
  it("KEEPS THE WIDTH OF WHAT THE HOUSE DOES NOT KNOW", () => {
    // The whole claim. A board that resolved two of eight draws the same length
    // of row as one that resolved seven — only the light differs. A denominator
    // that shrinks to flatter its numerator is not a denominator.
    for (const [r, m] of [[0, 0], [2, 1], [0, 8], [8, 0], [7, 1]] as const) {
      const styles = markStyles(render(board(r, m)));
      expect(styles, `board ${r}/${m}`).toHaveLength(DIMS.length);
      for (const s of styles) expect(s).toContain("flex:1 1 0");
    }
  });

  it("changes EXACTLY ONE thing between standings — the fill", () => {
    // Compared property by property rather than forbidding a list of names, so
    // a geometry property nobody thought to forbid cannot slip through either.
    const styles = markStyles(render(board(1, 1)));
    const props = (s: string) =>
      new Map(s.split(";").filter(Boolean).map((d) => [d.split(":")[0], d] as const));
    const [a, b, c] = styles.map(props);
    for (const other of [b, c]) {
      expect([...a.keys()]).toEqual([...other.keys()]);
      expect([...a.keys()].filter((k) => a.get(k) !== other.get(k))).toEqual(["background"]);
    }
  });

  it("orders the row from what is known toward what is not — and a caller cannot reorder it", () => {
    // The order is a law, which is why the component takes the VM rather than
    // three arrays: there is no longer an argument to pass them wrong in.
    expect(standings(render(board(2, 1)))).toEqual([
      "RESOLVED", "RESOLVED", "MEASURED", "MISSING", "MISSING", "MISSING", "MISSING", "MISSING",
    ]);
  });

  it("adds nothing up — the marks ARE the count (§15)", () => {
    const html = render(board(2, 1));
    // No digit anywhere in the rendered band. A count printed beside a row that
    // already shows the count is the "small meter under a number" this replaced.
    expect(html.replace(/<[^>]*>/g, "")).not.toMatch(/\d/);
    expect(html).not.toMatch(/\d+\s*%/);
  });
});

describe("DimensionStandingBand — distinguished by FILL, never by hue (§9)", () => {
  it("gives the three standings three different fills and no green", () => {
    const fills = new Set(
      [...render(board(2, 1)).matchAll(/data-standing="\w+"[^>]*background:([^;"]+)/g)].map(
        (m) => m[1],
      ),
    );
    expect(fills.size, "two standings share a fill — one of them is invisible").toBe(3);
    for (const html of [render(board(8, 0)), render(board(0, 8)), render(board(0, 0))]) {
      for (const m of html.matchAll(/#([0-9a-f]{6})\b/gi)) {
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
        expect(g > r && g > b, `green-dominant #${m[1]}`).toBe(false);
      }
    }
  });

  it("KEEPS MEASURED VISUALLY DISTINCT FROM BOTH NEIGHBOURS", () => {
    // The bucket that exists because these surfaces used to double-count it.
    // Folded into RESOLVED it overstates the board; folded into MISSING it
    // tells a trader to go and gather evidence that has already been gathered.
    const fill = (s: keyof typeof STANDING) => STANDING[s].fill;
    expect(new Set([fill("RESOLVED"), fill("MEASURED"), fill("MISSING")]).size).toBe(3);
  });
});

describe("DimensionStandingBand — HOW MUCH, never WHICH", () => {
  it("hangs no dimension name on any mark, at either scale", () => {
    // The first cut hung the name on each mark's `title`, which quietly
    // defeated the panel's own row cap: the ledger declines to draw more than
    // six rows and says "+3 more", and a ninth name arriving in a tooltip makes
    // that disclosure false about the markup it is printed in.
    for (const scale of ["panel", "pill"] as const) {
      const html = render(board(2, 1), scale);
      for (const dim of DIMS) expect(html, `${dim} leaked at ${scale}`).not.toContain(dim);
    }
  });

  it("speaks the heading's word, not the compiler's key", () => {
    // The panel is read at rest, so a hover is useful there.
    const html = render(board(0, 0), "panel");
    expect(html).toMatch(/data-standing="MISSING"[^>]*title="unresolved"/);
  });
});

describe("DimensionStandingBand — two sizes, one instrument", () => {
  it("DRAWS THE SAME BOARD IN BOTH SCALES — same marks, same order", () => {
    // The thing a shared owner is FOR. If the two scales could disagree about
    // the board, the extraction would have bought nothing.
    expect(standings(render(board(2, 1), "panel"))).toEqual(
      standings(render(board(2, 1), "pill")),
    );
  });

  it("carries the heading only where there is room for one", () => {
    expect(render(board(2, 1), "panel")).toContain("Dimension standing");
    // In a 10px chip row a heading would be larger than the band it labels.
    expect(render(board(2, 1), "pill")).not.toContain("Dimension standing");
  });

  it("does not grow the chip row it sits in", () => {
    const pill = render(board(2, 1), "pill");
    expect(pill).toMatch(/height:3px/);
    expect(pill).toMatch(/display:inline-block/);
    expect(pill).not.toMatch(/margin-bottom:1[0-9]px/);
  });

  it("hangs no tooltip on a mark at pill scale", () => {
    // The pill owns one tooltip for the whole control; eight more inside it
    // would fight it, and the pill's carries the entire reading anyway.
    expect(render(board(2, 1), "pill")).not.toContain("title=");
  });
});

describe("DimensionStandingBand — nothing observed draws nothing", () => {
  it("DRAWS ABSOLUTELY NOTHING FOR A BOARD WITH NO DIMENSIONS", () => {
    // §Silence Is A Feature. An empty row is a denominator of zero wearing a
    // row's clothes, and it would read as "we looked and found nothing" on a
    // surface that has not looked.
    const empty = { resolved: [], measured: [], missing: [] };
    expect(render(empty, "panel")).toBe("");
    expect(render(empty, "pill")).toBe("");
  });

  it("draws a genuinely dark board as eight unlit marks, not as nothing", () => {
    // The case that IS zero rather than unknown: eight dimensions, none of them
    // resolved. That is a finding, and keeping it distinct from the null above
    // is the whole of H1 in this component.
    const styles = markStyles(render(board(0, 0)));
    expect(styles).toHaveLength(8);
    expect(new Set(styles).size, "a dark board must be uniform").toBe(1);
  });
});

describe("standingInWords — the picture, for anything that cannot see it", () => {
  it("says the same three buckets in the same order as the marks", () => {
    expect(standingInWords(board(2, 1))).toBe(
      "2 resolved, 1 measured, not decision-grade, 5 unresolved",
    );
  });

  it("OMITS AN EMPTY BUCKET RATHER THAN PRINTING IT AS ZERO — H1", () => {
    // "0 unresolved" is a fact nobody needs and a clause every board would
    // carry. Worse, a reader scanning for absence finds a number there.
    expect(standingInWords(board(8, 0))).toBe("8 resolved");
    expect(standingInWords(board(0, 0))).toBe("8 unresolved");
  });

  it("says nothing at all about a board that has no dimensions", () => {
    expect(standingInWords({ resolved: [], measured: [], missing: [] })).toBe("");
  });

  it("counts exactly what the marks count — walked across the whole board", () => {
    // The words and the geometry are built from the same arrays in the same
    // order, and this is the assertion that keeps them that way.
    for (let r = 0; r <= 8; r += 1) {
      const vm = board(r, 8 - r === 0 ? 0 : 1);
      const words = standingInWords(vm);
      const drawn = standings(render(vm));
      for (const [key, { word }] of Object.entries(STANDING)) {
        const inWords = Number(words.match(new RegExp(`(\\d+) ${word}`))?.[1] ?? 0);
        const inMarks = drawn.filter((s) => s === key).length;
        expect(inWords, `${key} at ${r} resolved`).toBe(inMarks);
      }
    }
  });
});
