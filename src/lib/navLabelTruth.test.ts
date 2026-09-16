import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function read(p: string) {
  return fs.readFileSync(path.join(process.cwd(), p), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const layout = read("src/components/layout/MainLayout.tsx");
const aiBotPage = read("src/app/ai-bot/page.tsx");
/**
 * Nav LABELS are no longer typed in MainLayout — the rooms have one owner and
 * every rail derives from it. A label scan aimed at MainLayout would now pass
 * on an empty search, which is the quietest way for a Sentinel to stop working.
 * The label assertions follow the labels; the ALERT-GROUP assertions stay on
 * MainLayout, because that panel still lives there.
 */
const destinations = read("src/lib/routing/wmDestinations.ts");

/**
 * Navigation label truth Sentinel — canon §AI AUTHORITY CREEP.
 *
 * A nav label is a promise about the destination. Two overclaimed:
 *
 * "AI Bot" → /ai-bot is titled "Market Intelligence · Observed market data
 * only · no generated signals" and renders the canonical Market Canvas. It
 * operates no bot and emits no signals. The page was already honest; the nav
 * contradicted it.
 *
 * "AI Coaching Alerts" → the group contains a win-rate threshold, a trade-count
 * limit and journal pattern matching. All deterministic rules over the trader's
 * own data; no model runs.
 */
describe("navigation label truth", () => {
  it("no nav entry promises an AI engine", () => {
    expect(destinations).not.toContain('label: "AI Bot"');
    expect(destinations).not.toMatch(/label:\s*"AI /);
    // and MainLayout must not grow a second, hand-typed label list beside it
    expect(layout).not.toMatch(/label:\s*"AI /);
  });

  it("the /ai-bot nav label matches what the page says it is", () => {
    expect(destinations).toContain('label: "Market Intel"');
    expect(aiBotPage).toContain("Market Intelligence");
    expect(aiBotPage).toContain("no generated signals");
  });

  it("alert grouping does not claim AI coaching", () => {
    expect(layout).not.toContain("AI Coaching Alerts");
    expect(layout).toContain("Discipline Alerts");
  });

  it("the page still makes no model call", () => {
    expect(aiBotPage).not.toMatch(/anthropic|openai|gemini|\/api\/ai\b/i);
  });
});
