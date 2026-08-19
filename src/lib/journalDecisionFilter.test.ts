import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  filterLinkedDecisionEntries,
  parseLinkedDecisionIds,
  withoutLinkedDecisions,
} from "./journalDecisionFilter";

const journalPage = readFileSync(resolve(__dirname, "../app/journal/page.tsx"), "utf8");

describe("Journal linked-decision filter contract", () => {
  it("parses exact trimmed and deduplicated IDs in source order", () => {
    expect(parseLinkedDecisionIds(" a, b,a,  c ")).toEqual(["a", "b", "c"]);
  });

  it("bounds the filter and rejects empty, control, and oversized IDs", () => {
    const many = Array.from({ length: 60 }, (_, index) => `id-${index}`).join(",");
    expect(parseLinkedDecisionIds(many)).toHaveLength(50);
    expect(parseLinkedDecisionIds(`ok,,bad\nvalue,${"x".repeat(129)}`)).toEqual(["ok"]);
  });

  it("removes only the linked-decision parameter", () => {
    expect(withoutLinkedDecisions("decisions=a%2Cb&tag=CLC")).toBe("/journal?tag=CLC");
    expect(withoutLinkedDecisions("decisions=unknown")).toBe("/journal");
  });

  it("fails closed for unknown linked IDs and preserves all entries when inactive", () => {
    const entries = [{ id: "one" }, { id: "two" }];
    expect(filterLinkedDecisionEntries(entries, ["two"], true)).toEqual([{ id: "two" }]);
    expect(filterLinkedDecisionEntries(entries, ["unknown"], true)).toEqual([]);
    expect(filterLinkedDecisionEntries(entries, [], false)).toBe(entries);
  });

  it("wires the linked IDs conjunctively and fails closed when none match", () => {
    expect(journalPage).toContain('const linkedFilterActive = searchParams.has("decisions");');
    expect(journalPage).toContain("filterLinkedDecisionEntries(entries, linkedDecisionIds, linkedFilterActive)");
    expect(journalPage).toContain('"No linked decisions found"');
    expect(journalPage).toContain("min-h-11");
  });
});
