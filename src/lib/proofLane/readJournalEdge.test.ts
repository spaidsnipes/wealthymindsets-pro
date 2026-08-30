import { describe, expect, it } from "vitest";
import {
  JOURNAL_STORAGE_KEY,
  LEGACY_JOURNAL_STORAGE_KEY,
} from "@/lib/traderMemory/adapters/journalStorage";
import { readProofLaneJournalEdge } from "./readJournalEdge";

function storage(values: Record<string, string> = {}): Pick<Storage, "getItem"> {
  return { getItem: (key) => values[key] ?? null };
}

describe("Proof Lane Journal edge read truth", () => {
  it("resolves canonical records through the existing edge compiler", () => {
    const result = readProofLaneJournalEdge(storage({
      [JOURNAL_STORAGE_KEY]: JSON.stringify([
        { date: "2026-08-30", result: "win", realizedR: 1.25, processQuality: "FOLLOWED_PLAN" },
      ]),
    }));
    expect(result).toMatchObject({
      status: "RESOLVED",
      edge: { totalEntries: 1, rTaggedEntries: 1, cumulativeR: 1.25 },
    });
  });

  it("keeps an absent Journal distinct from a failed read", () => {
    expect(readProofLaneJournalEdge(storage())).toEqual({ status: "ABSENT" });
  });

  it("accepts the canonical owner's legacy compatibility read", () => {
    expect(readProofLaneJournalEdge(storage({
      [LEGACY_JOURNAL_STORAGE_KEY]: JSON.stringify([
        { date: "2026-08-29", result: "loss", realizedR: -1, processQuality: "BROKE_RULES" },
      ]),
    }))).toMatchObject({ status: "RESOLVED", edge: { totalEntries: 1, cumulativeR: -1 } });
  });

  it("does not fabricate an empty measured sample from invalid bytes", () => {
    expect(readProofLaneJournalEdge(storage({ [JOURNAL_STORAGE_KEY]: "not-json" }))).toMatchObject({
      status: "UNAVAILABLE",
    });
  });

  it("does not fabricate an empty measured sample when storage is blocked", () => {
    expect(readProofLaneJournalEdge({ getItem() { throw new Error("SecurityError"); } })).toMatchObject({
      status: "UNAVAILABLE",
    });
  });
});
