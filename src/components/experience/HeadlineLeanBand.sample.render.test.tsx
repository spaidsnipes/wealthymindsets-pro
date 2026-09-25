/**
 * THE BAND, ON REAL HEADLINES, IN ONE PAGE.
 *
 * The unit suite proves each law in isolation. This renders the whole ladder of
 * readings onto one page — the way a reader actually meets them, stacked in a
 * feed — and asserts the things that are only visible when the readings sit
 * next to each other:
 *
 *   - the never-read row and the found-nothing row do not look alike
 *   - no two distinct readings draw the same picture
 *   - every row's zero lands on the same x, so the feed has a spine
 *
 * The page is written to the OS temp dir so a browser can measure it. It is
 * deliberately NOT written into public/ — a local inspection artifact must not
 * become a deployed route. The
 * measured receipt is the only thing that can prove the last of those three,
 * because a fixed side width is a claim about LAYOUT and this file only sees
 * strings.
 */

import { describe, expect, it, beforeAll } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";

import { HeadlineLeanBand, leanInWords } from "./HeadlineLeanBand";
import { selectHeadlineLean, LEAN_SLOTS } from "@/lib/experience/selectHeadlineLean";

/**
 * Real headlines, chosen so each row is a state the old bar got wrong.
 * The middle two are the pair that collided: both scored ~50, both said
 * "Neutral", and they are opposite findings.
 */
const HEADLINES: readonly (readonly [string, string])[] = [
  ["never-read", ""],
  ["found-nothing", "Company files quarterly paperwork with the regulator"],
  ["found-both", "Record inflows follow crash warning"],
  ["thin-bullish", "Strong gains despite one concern"],
  ["thin-bearish", "Concerns weaken outlook despite one strong print"],
  ["clear-bullish", "Record surge as inflows rally to a new top"],
  ["clear-bearish", "Crash warning as losses and declines drop further"],
  ["over-the-row", "surge beat upgrade raised rally accelerating record inflow positive"],
];

const HTML_PATH = "/tmp/headline-lean-band-sample.html";

let SAMPLE_HTML = "";

const rowOf = (name: string): string =>
  SAMPLE_HTML.match(new RegExp(`data-row="${name}"([\\s\\S]*?)(?=data-row="|</main>)`))?.[1] ?? "";

const marks = (html: string, side: "bullish" | "bearish"): number =>
  [...html.matchAll(new RegExp(`data-side="${side}"`, "g"))].length;

beforeAll(() => {
  const rows = HEADLINES.map(([name, text]) => {
    const lean = selectHeadlineLean(text);
    return (
      <div
        key={name}
        data-row={name}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 14px",
          borderLeft: "3px solid rgba(237,230,211,0.18)",
          borderBottom: "1px solid rgba(138,130,113,0.14)",
        }}
      >
        <HeadlineLeanBand lean={lean} testId={`row-${name}`} />
        <span data-testid={`word-${name}`} style={{ color: "#c2b892", fontSize: 11 }}>
          {lean ? lean.direction : ""}
        </span>
        <span style={{ color: "#8a8271", fontSize: 12, flex: "1 1 0" }}>
          {text || "(no headline text — the house could not look)"}
        </span>
      </div>
    );
  });

  SAMPLE_HTML = renderToStaticMarkup(
    <html lang="en">
      <body style={{ margin: 0, background: "#07080a", fontFamily: "ui-sans-serif, system-ui" }}>
        <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>{rows}</main>
      </body>
    </html>,
  );

  fs.writeFileSync(HTML_PATH, `<!doctype html>${SAMPLE_HTML}`, "utf8");
});

describe("HeadlineLeanBand sample — the ladder of readings, seen together", () => {
  it("writes a page a browser can measure", () => {
    expect(fs.existsSync(HTML_PATH)).toBe(true);
    expect(SAMPLE_HTML.length).toBeGreaterThan(500);
  });

  it("DRAWS ABSOLUTELY NOTHING ON THE NEVER-READ ROW — H1, in context", () => {
    // The row still exists; the headline is still listed. What is absent is any
    // band at all, because the house did not look and must not appear to have.
    const row = rowOf("never-read");
    expect(row).toContain("could not look");
    expect(row).not.toContain("data-testid=\"row-never-read\"");
    expect(row).not.toContain("data-direction");
  });

  it("KEEPS THE COLLIDING PAIR APART — the defect this replaced, on one page", () => {
    const nothing = rowOf("found-nothing");
    const both = rowOf("found-both");

    expect(nothing).toContain('data-direction="NO_VOCABULARY"');
    expect(both).toContain('data-direction="CONFLICTED"');

    // A different attribute is not enough. They must draw differently.
    expect(marks(nothing, "bullish") + marks(nothing, "bearish")).toBe(0);
    expect(marks(both, "bullish")).toBeGreaterThan(0);
    expect(marks(both, "bearish")).toBeGreaterThan(0);
  });

  it("NO TWO READINGS ON THE PAGE DRAW THE SAME PICTURE", () => {
    // The strongest single statement available to a string test: eight distinct
    // readings, eight distinct bands. If any future change flattens two states
    // into one, this fails without anyone having predicted WHICH two.
    const bands = HEADLINES.map(([name]) => {
      const row = rowOf(name);
      return row.replace(/data-testid="[^"]*"/g, "").replace(/row-[a-z-]+/g, "");
    });
    const drawn = bands.filter((b) => b.includes("data-direction"));
    expect(drawn.length).toBe(HEADLINES.length - 1);
    expect(new Set(drawn).size, "two readings render identically").toBe(drawn.length);
  });

  it("CAPS THE DRAWING AND SAYS SO, WITH THE TRUE COUNT STILL IN THE MARKUP", () => {
    const row = rowOf("over-the-row");
    expect(marks(row, "bullish")).toBe(LEAN_SLOTS);
    expect(row).toContain('data-clamped="true"');
    // Scoped to the side that actually clamped. The BEARISH side is rendered
    // first and reads data-count="0", so an unscoped scan finds the zero and
    // reports that the true count was lost — the assertion would have failed
    // for the wrong reason, which is only marginally better than passing for
    // the wrong reason.
    const bullishSide = row.match(/<span[^>]*data-testid="row-over-the-row-bullish"[^>]*>/)?.[0] ?? "";
    expect(Number(bullishSide.match(/data-count="(\d+)"/)?.[1] ?? 0)).toBeGreaterThan(LEAN_SLOTS);
    expect(bullishSide).toContain(`data-drawn="${LEAN_SLOTS}"`);
  });

  it("carries the disclaimer on EVERY band that is drawn", () => {
    for (const [name, text] of HEADLINES) {
      if (text.trim() === "") continue;
      expect(rowOf(name), name).toContain("not a prediction");
    }
  });

  it("prints no percentage and no green anywhere on the page — §9, §15", () => {
    expect(SAMPLE_HTML).not.toMatch(/\d+%/);
    for (const m of SAMPLE_HTML.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
      expect(g > r && g > b, `green-dominant #${m[1]}`).toBe(false);
    }
  });

  it("the words on each row agree with the marks on that row", () => {
    for (const [name, text] of HEADLINES) {
      const lean = selectHeadlineLean(text);
      if (!lean) continue;
      const row = rowOf(name);
      expect(marks(row, "bullish"), name).toBe(Math.min(lean.bullish, LEAN_SLOTS));
      expect(marks(row, "bearish"), name).toBe(Math.min(lean.bearish, LEAN_SLOTS));
      expect(row, name).toContain(leanInWords(lean).slice(0, 24));
    }
  });
});
