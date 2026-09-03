import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "src/app/command-deck/page.tsx"), "utf8");

describe("Command Deck clutter conservation", () => {
  it("keeps One Story primary and moves chronology behind a calm disclosure", () => {
    const oneStory = page.indexOf("<OneStoryStrip vm={oneStory} />");
    const chapterHistory = page.indexOf('className="wm-cd-chapter-history"');

    expect(oneStory).toBeGreaterThan(0);
    expect(chapterHistory).toBeGreaterThan(oneStory);
    expect(page).not.toContain('SectionBanner number={1} label="Story Ribbon · Market Narrative"');
    expect(page.match(/<StoryRibbon state=\{state\} history=\{history\} \/>/g)).toHaveLength(1);
  });

  it("is closed by default while preserving native keyboard disclosure behavior", () => {
    const start = page.indexOf('<details className="wm-cd-chapter-history">');
    const end = page.indexOf("</details>", start);
    const block = page.slice(start, end);

    expect(block).toContain("<summary>Market chapter history</summary>");
    expect(page.slice(start, page.indexOf(">", start))).not.toMatch(/\b(?:open|defaultOpen)\b/);
    expect(block).toContain('<div className="wm-cd-chapter-history-content">');
  });

  it("keeps the disclosure touchable, focus-visible and horizontally contained", () => {
    expect(page).toContain(".wm-cd-chapter-history > summary");
    expect(page).toContain("min-height: 44px");
    expect(page).toContain(".wm-cd-chapter-history > summary:focus-visible");
    expect(page).toContain(".wm-cd-chapter-history-content");
    expect(page).toContain("min-width: 0");
    expect(page).toContain("overflow-x: auto");
  });

  it("does not remove the canonical evidence and decision surfaces", () => {
    expect(page).toContain("<MarketCanvasPanel vm={marketCanvas} />");
    expect(page).toContain("<DecisionChainPanel");
    expect(page).toContain("open={deckEmphasis.deepSectionsOpen}");
    expect(page).toContain("Evidence");
  });
});
