import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/heatmaps/page.tsx"),
  "utf8",
);

describe("Heat Map Markov Deck handoff accessibility", () => {
  it("keeps one native, named and encoded MARKET action (the one camera, not the deck)", () => {
    expect(page).toContain('className="wm-markov-deck-action"');
    expect(page).toContain('aria-label={`Open ${ms.sym} on the market`}');
    expect(page).toContain('router.push(`/charts?symbol=${encodeURIComponent(ms.sym)}`)');
    // A heat cell selects an instrument; the ONE market camera shows it.
    expect(page).not.toContain("/command-deck?symbol=");
    expect(page).toContain("e.stopPropagation()");
    expect(page).not.toMatch(/wm-markov-deck-action[\s\S]{0,1000}onKeyDown/);
  });

  it("provides touch size and unmistakable keyboard focus", () => {
    expect(page).toContain("minWidth: 44");
    expect(page).toContain("minHeight: 44");
    expect(page).toContain('touchAction: "manipulation"');
    expect(page).toContain(".wm-markov-deck-action:focus-visible");
    expect(page).toContain("<style jsx global>");
    // Was pinned to the literal #f0b429. The ring now reads from the brass
    // token, so this follows the design system rather than freezing a value it
    // no longer owns. The requirement — 3px, solid, identity metal — is intact.
    expect(page).toContain("outline: 3px solid ${WM.gold.mark}");
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
