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

  it("returns through the canonical public workspace with the selected symbol", () => {
    expect(journalPage).toContain("Open current evidence →");
    expect(journalPage).toContain("/command-deck?symbol=");
    expect(journalPage).not.toContain('href={`/nectar/${encodeURIComponent(selected.symbol)}`}');
  });

  it("keeps the return action at the shared touch-target minimum", () => {
    // The closer is `</Link>`, not `</a>`: this return action crosses a door,
    // and a raw anchor there is a full document load that would drop the live
    // session on the way back to the deck. The element type is OWNED by
    // src/lib/internalAnchorNavigation.sentinel.test.ts — this line only has
    // to stay consistent with it, and must not re-decide it.
    expect(journalPage).toMatch(/Open current evidence →[\s\S]*?<\/Link>/);
    expect(journalPage).toContain("style={{ minHeight: 44 }}");
  });
});
