/**
 * THE LAWS THE OLD SCORER BROKE, EACH WITH THE HEADLINE THAT BREAKS IT.
 *
 * Every test here names a defect that was live on /news, and most of them are
 * written as a headline rather than as a number, because the whole argument for
 * a tally over a score is that a tally can be checked against the sentence it
 * came from.
 */

import { describe, expect, it } from "vitest";
import { selectHeadlineLean } from "./selectHeadlineLean";

const lean = (text: string) => selectHeadlineLean(text);

describe("selectHeadlineLean — one observation, counted once", () => {
  it("COUNTS A TERM ONCE HOWEVER OFTEN THE WRITER REPEATED IT", () => {
    // Repetition is a property of the writing, not of the market. The old
    // scorer used `includes`, so this was already true of the word walk — but
    // it then added a SECOND bonus for `detectBullish`, which was computed
    // from these same words. That is the double count, and it is gone because
    // there is now exactly one walk over the vocabulary.
    const once = lean("Record inflows")!;
    const many = lean("Record record record inflows inflows")!;
    expect(many.bullish).toBe(once.bullish);
    expect(many.matched).toBe(once.matched);
  });

  it("reports the two sides separately, and `matched` is exactly their sum", () => {
    // Nothing downstream should ever add these itself — two adders drift.
    for (const text of ["surge and rally", "crash warning", "record crash", "nothing here"]) {
      const l = lean(text)!;
      expect(l.matched, text).toBe(l.bullish + l.bearish);
    }
  });

  it("scales nothing and grades nothing — §15", () => {
    const l = lean("surge rally record")!;
    // The reading is integers that count things. Not one of them is out of 100.
    expect(Number.isInteger(l.bullish)).toBe(true);
    expect(Number.isInteger(l.bearish)).toBe(true);
    expect(Object.keys(l).sort()).toEqual(["bearish", "bullish", "direction", "matched"]);
    // The old surface's tell: a neutral BASELINE that exists before evidence.
    expect(Object.values(l)).not.toContain(50);
  });
});

describe("selectHeadlineLean — nothing found is not the same as both found", () => {
  it("SEPARATES 'READ IT, FOUND NOTHING' FROM 'READ IT, FOUND BOTH'", () => {
    // The cardinal defect on the old surface: these two headlines BOTH scored
    // ~50 and BOTH read "Neutral". They are opposite states. The second is a
    // real warning to a trader; the first is silence.
    const nothing = lean("Company files quarterly paperwork with the regulator")!;
    const both = lean("Record inflows follow crash warning")!;

    expect(nothing.direction).toBe("NO_VOCABULARY");
    expect(both.direction).toBe("CONFLICTED");
    expect(nothing.direction).not.toBe(both.direction);

    expect(nothing.matched).toBe(0);
    expect(both.bullish).toBeGreaterThan(0);
    expect(both.bearish).toBeGreaterThan(0);
  });

  it("RETURNS NOTHING AT ALL WHEN THERE WAS NOTHING TO READ — H1", () => {
    // The third state, and the one that must never be drawn: the house did not
    // look. Distinct again from NO_VOCABULARY, where it looked and found none.
    expect(lean("")).toBeNull();
    expect(lean("   ")).toBeNull();
    expect(lean("\n\t ")).toBeNull();
  });

  it("gives a read-but-empty headline a real reading, not a null", () => {
    // The mirror of the above. "We looked and found nothing" is a FINDING and
    // must survive as one, or the room cannot tell it from "we did not look".
    const l = lean("Company files quarterly paperwork with the regulator");
    expect(l).not.toBeNull();
    expect(l!.bullish).toBe(0);
    expect(l!.bearish).toBe(0);
  });
});

describe("selectHeadlineLean — the direction is a comparison, not a threshold", () => {
  it("CALLS A ONE-TERM LEAD A LEAD — the old margin hid it", () => {
    // `detectBullish` required `bull > bear + 1`, so 2 bullish against 1 bearish
    // reported NEUTRAL — a claim the headline did not make. A thin lead is
    // still a lead; the band shows both sides so the reader sees how thin.
    const l = lean("Strong gains despite one concern")!;
    expect(l.bullish).toBeGreaterThan(l.bearish);
    expect(l.direction).toBe("BULLISH");
  });

  it("is symmetric — the same evidence the other way round leans the other way", () => {
    // A scorer with asymmetric bonuses would fail this and nobody would notice,
    // because no one reads two mirrored headlines side by side in production.
    const up = lean("record growth")!;
    const down = lean("crash losses")!;
    expect(up.direction).toBe("BULLISH");
    expect(down.direction).toBe("BEARISH");
    expect(up.bullish).toBe(down.bearish);
    expect(up.bearish).toBe(down.bullish);
  });

  it("only ever answers with a direction it has a name for — §24", () => {
    const NAMES = ["BULLISH", "BEARISH", "CONFLICTED", "NO_VOCABULARY"];
    const texts = [
      "surge", "crash", "surge crash", "quiet filing", "RECORD INFLOW",
      "Beat and raised, but distribution and warning signal narrow",
    ];
    for (const t of texts) expect(NAMES, t).toContain(lean(t)!.direction);
  });

  it("reads regardless of the case the publisher used", () => {
    expect(lean("SURGE")!.direction).toBe("BULLISH");
    expect(lean("Surge")!.direction).toBe("BULLISH");
    expect(lean("sUrGe")!.direction).toBe("BULLISH");
  });
});

describe("selectHeadlineLean — the tally can always be checked against the sentence", () => {
  it("never claims more matched terms than the vocabulary holds", () => {
    // The guard against a future weighting sneaking back in: whatever the
    // counts mean, they are bounded by the number of distinct terms.
    const everything = lean(
      "surge beat upgrade raised rally accelerating record inflow positive lead " +
        "clear strong gains jumps rises top growth bullish " +
        "drop fall concern underperform correction distribution weaken negative " +
        "narrow signal declines falls losses crash warning bearish",
    )!;
    expect(everything.bullish).toBe(18);
    expect(everything.bearish).toBe(16);
    expect(everything.matched).toBe(34);
    // Everything matched on both sides — a tie, and therefore CONFLICTED is
    // wrong here only if one list is longer, which it is. The house reports
    // what it counted rather than what would be tidy.
    expect(everything.direction).toBe("BULLISH");
  });

  it("does not let one side's vocabulary silently outgrow the other unnoticed", () => {
    // Not a law about balance — the lists are allowed to differ. It is a law
    // that the difference is VISIBLE, because an all-terms headline leans
    // bullish purely because there are 18 bullish terms and 16 bearish ones,
    // and that is a property of our word list, not of the news.
    const all = lean(
      "surge beat upgrade raised rally accelerating record inflow positive lead " +
        "clear strong gains jumps rises top growth bullish " +
        "drop fall concern underperform correction distribution weaken negative " +
        "narrow signal declines falls losses crash warning bearish",
    )!;
    expect(
      Math.abs(all.bullish - all.bearish),
      "the vocabularies have drifted far apart — an all-terms headline now leans hard for no reason in the news",
    ).toBeLessThanOrEqual(3);
  });
});
