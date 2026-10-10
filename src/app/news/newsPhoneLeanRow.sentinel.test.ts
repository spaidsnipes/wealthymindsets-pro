import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * NEWS AT 390 (serving 450527a, 2026-10-10): the keyword-lean tally wrapped to
 * 103 px above the wire. On a phone it is one row; the "not a prediction"
 * disclaimer stays in view beside the label; desktop keeps the long line.
 */
const SRC = readFileSync(path.join(process.cwd(), "src/app/news/page.tsx"), "utf8");

describe("the lean tally is one row on a phone and never loses its disclaimer", () => {
  it("reads the room", () => {
    expect(SRC.length).toBeGreaterThan(20_000);
  });
  it("one scrolling row under 640, wrapping from 640", () => {
    expect(SRC).toContain('data-testid="news-lean-row" className="flex flex-nowrap sm:flex-wrap');
    expect(SRC).toMatch(/data-testid="news-lean-row"[^>]*overflow-x-auto sm:overflow-visible/);
  });
  it("the phone disclaimer sits inside the label group; the desktop one is the long line", () => {
    const label = SRC.indexOf("Headline keyword lean\n");
    const short = SRC.indexOf('<span className="sm:hidden text-[10px] italic"');
    expect(label).toBeGreaterThan(0);
    expect(short).toBeGreaterThan(label);
    expect(SRC.slice(short, short + 200)).toContain("not a prediction");
    expect(SRC).toContain('className="hidden sm:inline ml-auto text-[9px] italic"');
    expect(SRC).toContain("keyword tally over the headline text — not a prediction");
  });
});
