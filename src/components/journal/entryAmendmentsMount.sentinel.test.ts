import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Founder 2026-10-22: "these answers have been answered" — Megazord §5 asks for a correction audit trail, so a
// saved entry takes dated notes beside it, never a rewrite. The entry view mounts the notes under the gaps.
describe("the Journal entry offers 'add what was missing' beside the saved entry", () => {
  const page = readFileSync("src/app/journal/page.tsx", "utf8");
  const ui = readFileSync("src/components/journal/TradeVenue.tsx", "utf8");
  it("mounts the notes right after the completeness line, keyed like the review", () => {
    expect(page).toMatch(/<EntryCompletenessLine entry=\{selected\} \/>\s*\n\s*<EntryAmendments entry=\{selected\} entryKey=\{journalReviewKey\(selected\)\} \/>/);
  });
  it("stores under the member's own key, append-only, and never edits the entry", () => {
    expect(ui).toMatch(/managementKey\(ENTRY_AMENDMENTS_STORAGE_KEY\)/);
    expect(ui).toMatch(/appendAmendment\(book, entryKey, gaps\.map\(g => g\.id\)/);
    expect(ui).not.toMatch(/setEntries|onEdit|updateEntry/);
  });
});
