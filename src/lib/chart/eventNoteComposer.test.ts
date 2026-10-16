import { describe, expect, it } from "vitest";
import { anchorListLines, anchorWord, anchorsKey, composeNoteAnchors, type DisplacedNote } from "./eventNoteComposer";

const n = (layer: string, text: string, x: number, y: number): DisplacedNote => ({ layer, text, x, y });

describe("notes move intelligently (§16) — the composer aggregates, never deletes (§14)", () => {
  it("collapses colliding words into ONE contextual anchor", () => {
    const a = composeNoteAnchors([n("STRUCTURE", "HH", 100, 50), n("STRUCTURE", "HL", 120, 80), n("TRUTH", "TRUTH HIGH 21000", 130, 60)]);
    expect(a).toHaveLength(1);
    expect(a[0].word).toBe("3 MARKET EVENTS");
    expect(anchorListLines(a[0])).toEqual(["STRUCTURE · HH", "STRUCTURE · HL", "TRUTH · TRUTH HIGH 21000"]);
  });

  it("keeps far-apart events as separate anchors, at the place they happened", () => {
    const a = composeNoteAnchors([n("A", "x", 10, 10), n("B", "y", 400, 300)]);
    expect(a.map(q => q.word)).toEqual(["1 MARKET EVENT", "1 MARKET EVENT"]);
    expect(a[1].x).toBe(400);
  });

  it("conserves every note — none is deleted, even one with no position", () => {
    const notes = [n("A", "1", 5, 5), n("B", "2", 900, 5), n("C", "3", NaN, 1), n("D", "4", 30, 20)];
    const out = composeNoteAnchors(notes).flatMap(q => q.notes);
    expect(out).toHaveLength(notes.length);
    for (const x of notes) expect(out).toContain(x);
  });

  it("receives words only — it has no way to switch a layer, an evidence class or an order off", () => {
    const keys = Object.keys(composeNoteAnchors([n("A", "w", 1, 1)])[0]).sort();
    expect(keys).toEqual(["notes", "word", "x", "y"]);
  });

  it("pluralises and keys deterministically", () => {
    expect(anchorWord(1)).toBe("1 MARKET EVENT");
    const a = composeNoteAnchors([n("A", "w", 1, 1)]);
    expect(anchorsKey(a)).toBe(anchorsKey(composeNoteAnchors([n("A", "w", 1, 1)])));
  });
});

import { PIP_HIT, pipHitRect, placePipHit } from "./eventNoteComposer";

describe("the lone-word pip's touch target", () => {
  const pip = { x: 500, y: 100, w: 12, h: 12 };
  it("carries a ≥44px hit square centred on the 12px pip", () => {
    const h = pipHitRect(pip);
    expect(h.w).toBe(PIP_HIT); expect(h.h).toBe(PIP_HIT);
    expect(h.x + h.w / 2).toBe(506); expect(h.y + h.h / 2).toBe(106);
  });
  it("moves left until its square is clear of the newest-candle clear zone", () => {
    const p = placePipHit(pip, 520, [])!;
    const h = pipHitRect(p);
    expect(h.x + h.w).toBeLessThanOrEqual(520);
    expect(p.w).toBe(12);
  });
  it("never overlaps a neighbour pip's square", () => {
    const first = pipHitRect(placePipHit(pip, 1000, [])!);
    const second = pipHitRect(placePipHit({ ...pip, x: 510 }, 1000, [first])!);
    expect(second.x + second.w <= first.x || first.x + first.w <= second.x).toBe(true);
  });
  it("gives up (null) rather than plant a square in the clear zone", () => {
    expect(placePipHit({ ...pip, x: 10 }, 20, [], 0)).toBeNull();
  });
});

describe("plate 30 — market events in plain English (texts read on serving 5863f6d)", () => {
  it("speaks each held label as one short sentence; non-events are not counted", async () => {
    const { plainEventSentence, plainAnchorWord } = await import("./eventNoteComposer");
    expect(plainEventSentence("STRUCTURE", "HH")).toBe("Higher high — buyers in control");
    expect(plainEventSentence("STRUCTURE", "LL")).toBe("Lower low — sellers pressing");
    expect(plainEventSentence("STRUCTURE", "SWING ABOVE · 30196.75")).toBe("Swing high at 30,196.75");
    expect(plainEventSentence("DERIVATIVES", "P30200 ×11 SELL · ~$110k")).toBe("11 puts at 30,200 sold (~$110k)");
    expect(plainEventSentence("WORDS", "CALL OI 30200 · 629")).toBe("629 call contracts open at 30,200");
    expect(plainEventSentence("WORDS", "dPOC 30040.00 · -65.00 THIS SESSION · EST")).toBe("Most-traded price moved to 30,040 (−65 today, estimated)");
    expect(plainEventSentence("WORDS", "MARKET SURPRISE · 1 of 10 went this far")).toBe("Unusual move — only 1 in 10 sessions go this far");
    expect(plainEventSentence("ZONE", "SUPPLY ZONE · DEFENDED · 2 TESTS")).toBe("Sellers defended the supply zone (2nd test)");
    expect(plainEventSentence("WORDS", "MID · ZONES + PROFILE SPEAK")).toBeNull();
    expect(plainEventSentence("WORDS", "80 bars")).toBeNull();
    const a = (texts: [string, string][]) => ({ x: 0, y: 0, word: "", notes: texts.map(([layer, text]) => ({ layer, text, x: 0, y: 0 })) });
    expect(plainAnchorWord(a([["STRUCTURE", "HL"]]))).toBe("Higher low held");
    expect(plainAnchorWord(a([["WORDS", "MID · ZONES + PROFILE SPEAK"], ["STRUCTURE", "SWING BELOW · 30195.25"], ["WORDS", "CALL OI 30200 · 629"]]))).toBe("2 events · Show list");
    expect(plainAnchorWord(a([["WORDS", "80 bars"]]))).toBeNull();
    expect(plainEventSentence("WORDS", "DOM READING CHIP")).toBeNull();
  });
});
