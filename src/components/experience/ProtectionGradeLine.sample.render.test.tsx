/**
 * THE PROTECTION LINE, RENDERED WHERE A HUMAN CAN LOOK AT IT.
 *
 * Same law and same pattern as the decision-rail sample: a drawn change nobody
 * looked at is not shipped, and the routes that carry this line need a session.
 *
 *     open $(node -p "require('os').tmpdir()+'/protection-line-sample.html'")
 *
 * ── THIS ONE IS CLOSER TO REAL THAN A FIXTURE ────────────────────────────────
 *
 * The decision-rail sample hand-builds view models. This page does not: every
 * row below is the REAL `selectProtectionState` compiling from a stated
 * (filled, protected) pair, so the grades, the §7 sentences and the coverage
 * proportions are all genuine compiler output. What is constructed is only the
 * INPUT — a book of six hypothetical positions.
 *
 * That still makes it a fixture, and it still says so on its face. A page of
 * position sizes that could be mistaken for the trader's own book would be
 * worse than no page.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import ProtectionGradeLine from "./ProtectionGradeLine";
import { selectProtectionState } from "@/lib/protectionState";

const PUBLIC_SAMPLE = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "public",
  "protection-line-sample.html",
);

/**
 * Six books, chosen because their coverage must NOT look alike — the exact
 * failure the track was added to end, where two opposite exposures differed by
 * one character of a sentence.
 */
const BOOKS = [
  { caption: "Nothing held", input: { filledQty: 0, brokerAckedProtectedQty: 0 } },
  { caption: "Held, nothing covering it", input: { filledQty: 5, brokerAckedProtectedQty: 0 } },
  { caption: "One of three covered", input: { filledQty: 3, brokerAckedProtectedQty: 1 } },
  { caption: "Two of three covered", input: { filledQty: 3, brokerAckedProtectedQty: 2 } },
  { caption: "Wholly covered", input: { filledQty: 4, brokerAckedProtectedQty: 4 } },
  {
    caption: "Wholly covered, but the book could not be read this cycle",
    input: { filledQty: 4, brokerAckedProtectedQty: 4, brokerStateUnverified: true },
  },
] as const;

let SAMPLE_HTML = "";
let SAMPLE_WRITE_ERROR = "";
try {
  const rows = BOOKS.map((book) => {
    const state = selectProtectionState(book.input);
    return `
    <section style="display:flex;flex-direction:column;gap:6px">
      <div style="font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:#8a8271">${book.caption}</div>
${renderToStaticMarkup(<ProtectionGradeLine state={state} book="PAPER BOOK" />)}
    </section>`;
  }).join("\n");

  const sample = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>WM Pro · Protection line sample</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body { margin:0; padding:0; background:#07080a; color:#f3efe6;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    main { padding:8px 24px 32px; display:flex; flex-direction:column; gap:18px; max-width:960px; }
  </style>
</head>
<body>
  <div style="padding:20px 24px 0;font-size:11px;line-height:1.6;color:#8a8271;max-width:760px">
    <strong style="color:#d4af37;letter-spacing:.8px">FIXTURE BOOKS — NOT YOUR POSITIONS.</strong>
    The component and the grade compiler are the real ones; only the six
    (filled, protected) pairs below are constructed. No row is a statement about
    any account.
  </div>
  <main>${rows}</main>
</body>
</html>`;
  SAMPLE_HTML = sample;
  const dest = path.join(tmpdir(), "protection-line-sample.html");
  writeFileSync(dest, sample);
  writeFileSync(PUBLIC_SAMPLE, sample);
  process.stdout.write(`\n  Protection line sample written to: ${dest}\n`);
  process.stdout.write(`  Open it: file://${dest}\n\n`);
} catch (error) {
  SAMPLE_WRITE_ERROR = error instanceof Error ? error.message : String(error);
}

describe("Protection line sample — coverage must be visible, and never green", () => {
  it("wrote the sample without error", () => {
    expect(SAMPLE_WRITE_ERROR).toBe("");
    expect(SAMPLE_HTML.length).toBeGreaterThan(0);
  });

  it("draws a track for every held book and none for the flat one", () => {
    const tracks = SAMPLE_HTML.match(/data-testid="protection-coverage-bar"/g) ?? [];
    // Six books, one of which holds nothing.
    expect(tracks.length).toBe(5);
  });

  it("makes opposite exposures visibly opposite", () => {
    // The defect the track exists to end: one-of-three and two-of-three
    // differed by a single character of a sentence.
    expect(SAMPLE_HTML).toContain('data-uncovered-pct="67"');
    expect(SAMPLE_HTML).toContain('data-uncovered-pct="33"');
  });

  it("hatches the unverified read rather than drawing it solid", () => {
    expect(SAMPLE_HTML).toContain('data-stale="true"');
  });

  it("puts no green anywhere on the page", () => {
    // §9 — "No green shield. No green means safe." Asserted on the MARKUP, not
    // on a palette constant, because a page is what the trader actually sees.
    //
    // The rule is GREEN-DOMINANT, not "contains any green channel": every brass
    // and ivory in this palette has a green component, and a test that banned
    // the channel would ban the house colours. A colour reads as green to a
    // human when its green channel beats both of the others.
    const colours: Array<[number, number, number]> = [];
    for (const m of SAMPLE_HTML.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const hex = m[1];
      colours.push([
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ]);
    }
    for (const m of SAMPLE_HTML.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
      colours.push([Number(m[1]), Number(m[2]), Number(m[3])]);
    }
    expect(colours.length).toBeGreaterThan(0);
    const greenDominant = colours.filter(([r, g, b]) => g > r && g > b);
    expect(greenDominant).toEqual([]);
  });

  it("says on its own face that the books are fixtures", () => {
    expect(SAMPLE_HTML).toContain("FIXTURE BOOKS — NOT YOUR POSITIONS.");
  });
});
