import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expectancyFact } from "./edgeCellFacts";
import { selectSessionEdge } from "./selectSessionEdge";

/**
 * ONE QUANTITY MAY NOT HAVE TWO OWNERS.
 *
 * `/proof-lane`'s Expectancy cell and `/journal`'s week chip read the SAME
 * `selectSessionEdge().expectancyR`. The cell went through `expectancyFact`,
 * which owns its sign, its colour and its reason. The chip formatted the
 * number inline and painted itself GOLD unconditionally, so a NEGATIVE week's
 * expectancy wore a positive week's clothes — and `>= 0` drove the sign, so an
 * exactly-flat week rendered a signed "+0.00R/trade".
 *
 * That `>= 0` is DEFECT TWO from `edgeCellFacts`'s own header, alive on a
 * second surface. COLOUR IS A CLAIM, and a chip cannot opt out of it by being
 * small.
 */
describe("the /journal week chip and the /proof-lane cell are one owner", () => {
  it("× THE GOLDEN LOSS: a negative week is not toned like a positive one", () => {
    const gain = expectancyFact(0.42, 4);
    const loss = expectancyFact(-0.42, 4);
    expect(gain.tone).toBe("GAIN");
    expect(loss.tone).toBe("LOSS");
    expect(gain.tone).not.toBe(loss.tone);
    expect(loss.text).toBe("-0.42R");
    expect(loss.text).not.toContain("+");
  });

  it("× THE SIGNED ZERO: exactly flat is neither a gain nor a loss", () => {
    const flat = expectancyFact(0, 3);
    expect(flat.tone).toBe("FLAT");
    expect(flat.measured).toBe(true);
    expect(flat.text).toBe("0.00R");
    expect(flat.text).not.toContain("+");   // the old chip printed "+0.00R/trade"
    expect(flat.text).not.toContain("-");
  });

  it("× THE FABRICATED UNDEFINED: an absent expectancy is never 'undefinedR'", () => {
    const none = expectancyFact(undefined, 0);
    expect(none.measured).toBe(false);
    expect(none.tone).toBe("NONE");
    expect(none.text).not.toContain("undefined");
    expect(none.text).not.toContain("NaN");
    expect(none.text).not.toBe("—");
    // The old chip's tooltip read `expectancy ${expectancyR?.toFixed(2)}R`,
    // which renders the literal word "undefined" when the field is absent.
    expect(none.reason).toMatch(/ABSENCE of a measurement/);
  });

  it("× THE UNQUALIFIED EDGE: the sample size travels with the number", () => {
    const one = expectancyFact(1.5, 1);
    expect(one.reason).toMatch(/1 R-tagged entry/);
    expect(one.reason).toMatch(/not an edge it can vouch for/);
    expect(expectancyFact(1.5, 4).reason).toMatch(/4 R-tagged entries/);
  });

  it("composes with the real selectSessionEdge — one number, one owner", () => {
    const edge = selectSessionEdge([
      { id: "a", date: "2026-09-10", realizedR: 1, result: "win" },
      { id: "b", date: "2026-09-11", realizedR: -2, result: "loss" },
    ] as never);
    const cell = expectancyFact(edge.expectancyR, edge.rTaggedEntries);
    expect(edge.rTaggedEntries).toBe(2);
    expect(cell.tone).toBe("LOSS");           // (1 + -2) / 2 = -0.5
    expect(cell.text).toBe("-0.50R");
  });
});

describe("/journal week chip adoption", () => {
  const src = readFileSync(join(process.cwd(), "src/app/journal/page.tsx"), "utf8");

  it("× THE UNCONDITIONAL GOLD: the chip tones from a declared RTone", () => {
    expect(src).toContain("expectancyFact");
    expect(src).toContain("WEEK_EDGE_TONE");
    expect(src).toMatch(/Record<RTone, string>/);
    // The old chip: gold border, gold background, gold text, on every week.
    // Pinned to THIS chip's exact class list — the day-model label elsewhere on
    // the page is a CATEGORY, not a measurement, and is entitled to its gold.
    expect(src).not.toContain(
      '"px-2 py-0.5 rounded-full text-[10px] font-bold border border-wm-gold/40 bg-wm-gold/10 text-wm-gold"',
    );
  });

  it("× THE SECOND FORMATTER: the chip no longer computes its own sign", () => {
    expect(src).not.toContain('weekEdge.expectancyR >= 0 ? "+" : ""');
    expect(src).not.toContain("weekEdge.expectancyR?.toFixed(2)");
  });

  it("× THE DEAD-IMPORT PASS: the owner is imported AND used", () => {
    expect(src.split("expectancyFact").length - 1).toBeGreaterThan(1);
  });
});
