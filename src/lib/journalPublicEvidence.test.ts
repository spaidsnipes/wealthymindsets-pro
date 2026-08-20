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
    expect(journalPage).toMatch(/Open current evidence →[\s\S]*?<\/a>/);
    expect(journalPage).toContain("style={{ minHeight: 44 }}");
  });
});
