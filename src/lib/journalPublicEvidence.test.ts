import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const journalPage = fs.readFileSync(
  path.join(process.cwd(), "src/app/journal/page.tsx"),
  "utf8",
);

describe("Journal public market-evidence contract", () => {
  it("presents captured observations without private infrastructure vocabulary", () => {
    expect(journalPage).toContain("Market Evidence at Journal Time");
    expect(journalPage).toContain("No market observations for");
    expect(journalPage).not.toContain("Nectar at Journal Time");
    expect(journalPage).not.toContain("See current Nectar detail");
  });

  it("returns through the ONE market camera with the selected symbol", () => {
    // 2026-09-24: the return lands /charts, the one market HOME. The legacy
    // deck was a second market and has no door in the house plan.
    expect(journalPage).toContain("Open on the market →");
    expect(journalPage).toContain("/charts?symbol=");
    expect(journalPage).not.toContain("/command-deck?symbol=");
    expect(journalPage).not.toContain('href={`/nectar/${encodeURIComponent(selected.symbol)}`}');
  });

  it("keeps the return action at the shared touch-target minimum", () => {
    // The closer is `</Link>`, not `</a>`: this return action crosses a door,
    // and a raw anchor there is a full document load that would drop the live
    // session on the way back to the deck. The element type is OWNED by
    // src/lib/internalAnchorNavigation.sentinel.test.ts — this line only has
    // to stay consistent with it, and must not re-decide it.
    expect(journalPage).toMatch(/Open on the market →[\s\S]*?<\/Link>/);
    expect(journalPage).toContain("style={{ minHeight: 44 }}");
  });
});
