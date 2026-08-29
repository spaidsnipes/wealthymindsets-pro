import { describe, expect, it } from "vitest";

import {
  JOURNAL_STORAGE_KEY,
  LEGACY_JOURNAL_STORAGE_KEY,
} from "./journalStorage";
import { readJournalSnapshots } from "./useJournalSnapshots";

function port(seed: Record<string, string> = {}) {
  return {
    getItem(key: string) {
      return seed[key] ?? null;
    },
  };
}

function entry(id: string) {
  return {
    id,
    date: "2026-08-25T12:00:00.000Z",
    symbol: "ES1!",
    side: "long",
    entry: 6500,
    exit: 6505,
    size: 1,
    pnl: 250,
    pct: 0.08,
    tags: ["plan-followed"],
    setup: "Opening drive",
    processQuality: "FOLLOWED_PLAN",
  };
}

describe("readJournalSnapshots", () => {
  it("gives canonical Journal records precedence and applies caller ownership", () => {
    const snapshots = readJournalSnapshots(port({
      [JOURNAL_STORAGE_KEY]: JSON.stringify([entry("canonical")]),
      [LEGACY_JOURNAL_STORAGE_KEY]: JSON.stringify([entry("legacy")]),
    }), "owner-1");
    expect(snapshots.map((snapshot) => snapshot.decisionId)).toEqual(["canonical"]);
    expect(snapshots[0]?.ownerId).toBe("owner-1");
    expect(snapshots[0]?.ruleAdherenceAtDecision).toBe(true);
    expect(snapshots[0]?.review).toBeUndefined();
  });

  it("treats canonical empty data as authoritative over legacy data", () => {
    expect(readJournalSnapshots(port({
      [JOURNAL_STORAGE_KEY]: "[]",
      [LEGACY_JOURNAL_STORAGE_KEY]: JSON.stringify([entry("legacy")]),
    }), "owner-1")).toEqual([]);
  });

  it("uses legacy records only when canonical storage is absent", () => {
    expect(readJournalSnapshots(port({
      [LEGACY_JOURNAL_STORAGE_KEY]: JSON.stringify([entry("legacy")]),
    }), "owner-1").map((snapshot) => snapshot.decisionId)).toEqual(["legacy"]);
  });

  it("fails closed instead of falling back from malformed canonical data", () => {
    expect(readJournalSnapshots(port({
      [JOURNAL_STORAGE_KEY]: "{",
      [LEGACY_JOURNAL_STORAGE_KEY]: JSON.stringify([entry("legacy")]),
    }), "owner-1")).toEqual([]);
  });

  it("returns empty for absent ownership, unavailable storage, or malformed records", () => {
    expect(readJournalSnapshots(port({
      [JOURNAL_STORAGE_KEY]: JSON.stringify([entry("valid")]),
    }), null)).toEqual([]);
    expect(readJournalSnapshots({ getItem() { throw new Error("blocked"); } }, "owner-1")).toEqual([]);
    expect(readJournalSnapshots(port({
      [JOURNAL_STORAGE_KEY]: JSON.stringify([{ id: "invalid" }, entry("valid")]),
    }), "owner-1").map((snapshot) => snapshot.decisionId)).toEqual(["valid"]);
  });
});
