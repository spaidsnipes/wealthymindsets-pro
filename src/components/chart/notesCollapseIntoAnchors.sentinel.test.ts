/**
 * SENTINEL — Garden 19 §16 "NOTES MOVE INTELLIGENTLY" (audit 2026-10-08).
 *
 * When several chart words collide, they collapse into ONE contextual anchor
 * ("3 MARKET EVENTS", tap → the list) at the place they happened; the marks
 * themselves stay drawn. The composer (eventNoteComposer.composeNoteAnchors)
 * existed, but six word sites withheld a colliding word SILENTLY instead of
 * handing it over — the word simply vanished from the glass. Each now pushes
 * its word, with its own geometry, to `displacedNotes`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MC = readFileSync(path.join(__dirname, "MainChart.tsx"), "utf8");

describe("§16 — a colliding word is composed, never silently dropped", () => {
  it("the composer runs once a frame over every displaced word", () => {
    expect(MC).toContain("const anchors = composeOn ? composeNoteAnchors(displacedNotes) : [];");
  });
  it.each([
    ["data-gap words", 'displacedNotes.push({ layer: "DATA GAP", text: t, x: mid,'],
    ["zone names", 'if (ty == null) displacedNotes.push({ layer: "ZONE", text: words,'],
    ["VP words on candles", 'displacedNotes.push({ layer: "PROFILE", text: wd.text,'],
    ["VP level pair", 'displacedNotes.push({ layer: "PROFILE", text: `${nameTxt} ${chipTxt}`,'],
    ["Profile Memory chips", 'if (spotM.onCandles) displacedNotes.push({ layer: "MEMORY", text, x: lx + w / 2, y });'],
    ["Exhaustion chip on chip", 'displacedNotes.push({ layer: "EXHAUSTION", text: chipTxt,'],
    ["Imbalance", 'layer: "IMBALANCE"'],
    ["Memory Ghost", 'layer: "MEMORY GHOST"'],
    ["Derivatives", 'layer: "DERIVATIVES"'],
    ["Structure", 'layer: "STRUCTURE"'],
    ["Wisdom line", 'layer: "WISDOM"'],
  ])("%s hand a held word to the composer", (_name, needle) => {
    expect(MC).toContain(needle);
  });
});
