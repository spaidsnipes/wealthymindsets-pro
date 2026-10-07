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
