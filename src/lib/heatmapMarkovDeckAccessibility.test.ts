import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/heatmaps/page.tsx"),
  "utf8",
);

describe("Heat Map Markov Deck handoff accessibility", () => {
  it("keeps one native, named and encoded Command Deck action", () => {
    expect(page).toContain('className="wm-markov-deck-action"');
    expect(page).toContain('aria-label={`Open ${ms.sym} on the Command Deck`}');
    expect(page).toContain('router.push(`/command-deck?symbol=${encodeURIComponent(ms.sym)}`)');
    expect(page).toContain("e.stopPropagation()");
    expect(page).not.toMatch(/wm-markov-deck-action[\s\S]{0,1000}onKeyDown/);
  });

  it("provides touch size and unmistakable keyboard focus", () => {
    expect(page).toContain("minWidth: 44");
    expect(page).toContain("minHeight: 44");
    expect(page).toContain('touchAction: "manipulation"');
    expect(page).toContain(".wm-markov-deck-action:focus-visible");
    expect(page).toContain("<style jsx global>");
    expect(page).toContain("outline: 3px solid #f0b429");
    expect(page).toContain("outline-offset: 2px");
  });

  it("reserves responsive card space without obscuring truth state", () => {
    expect(page).toContain("minHeight: 44, paddingRight: 52");
    expect(page).toContain('textOverflow: "ellipsis"');
    expect(page).toContain('whiteSpace: "nowrap"');
    expect(page).toContain("flexShrink: 0");
    expect(page).toContain("Return unavailable · scenario not computed");
  });
});
