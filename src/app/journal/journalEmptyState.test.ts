import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Guest audit 2026-10-25 (390 / 834 / desktop): an empty journal blamed filters nobody had set.
const PAGE = readFileSync(path.join(process.cwd(), "src/app/journal/page.tsx"), "utf8");

describe("an empty journal says it is empty, not filtered", () => {
  it("no entries at all → 'No journal entries yet' and how to make the first one", () => {
    expect(PAGE).toContain('entries.length === 0 ? "No journal entries yet" : "No entries found"');
    expect(PAGE).toContain('entries.length === 0 ? "Tap New journal entry to log your first trade — or a day you chose not to trade."');
  });
  it("entries that a filter hides still read as filtered", () => {
    expect(PAGE).toContain(': "Nothing in the journal matches these filters."}');
  });
});
