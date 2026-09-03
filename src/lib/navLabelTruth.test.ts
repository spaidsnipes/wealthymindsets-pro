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
    expect(layout).not.toContain('label: "AI Bot"');
    expect(layout).not.toMatch(/label:\s*"AI /);
  });

  it("the /ai-bot nav label matches what the page says it is", () => {
    expect(layout).toContain('label: "Market Intel"');
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
