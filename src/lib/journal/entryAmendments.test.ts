import { describe, expect, it } from "vitest";
import { AMENDMENT_MAX_CHARS, AMENDMENTS_PER_ENTRY, amendmentLine, appendAmendment, readAmendmentBook } from "./entryAmendments";

const missing = ["SETUP", "LESSON", "PROCESS"] as const;

describe("add what was missing — append-only notes beside a saved entry", () => {
  it("adds a dated note for a missing field and keeps every earlier note untouched", () => {
    const one = appendAmendment({}, "journal|a", missing, "SETUP", "  ORB retest  ", 1000);
    expect(one.ok).toBe(true);
    if (!one.ok) return;
    const two = appendAmendment(one.book, "journal|a", missing, "LESSON", "Wait for the close", 2000);
    expect(two.ok && two.book["journal|a"]).toEqual([
      { field: "SETUP", value: "ORB retest", at: 1000 },
      { field: "LESSON", value: "Wait for the close", at: 2000 },
    ]);
    expect(one.book["journal|a"]).toHaveLength(1); // the earlier book is not mutated
  });

  it("refuses a field the entry already recorded: a note can only fill a gap", () => {
    expect(appendAmendment({}, "k", missing, "MFE", "2.1", 1)).toEqual({ ok: false, reason: "NOT_MISSING" });
  });

  it("refuses empty, over-long, unknown process words, and more than the per-entry cap", () => {
    expect(appendAmendment({}, "k", missing, "SETUP", "   ", 1)).toEqual({ ok: false, reason: "EMPTY" });
    expect(appendAmendment({}, "k", missing, "SETUP", "x".repeat(AMENDMENT_MAX_CHARS + 1), 1)).toEqual({ ok: false, reason: "TOO_LONG" });
    expect(appendAmendment({}, "k", missing, "PROCESS", "kind of", 1)).toEqual({ ok: false, reason: "BAD_PROCESS" });
    expect(appendAmendment({}, "k", missing, "PROCESS", "Followed my plan", 1).ok).toBe(true);
    const full = { k: Array.from({ length: AMENDMENTS_PER_ENTRY }, (_, i) => ({ field: "SETUP" as const, value: "s", at: i })) };
    expect(appendAmendment(full, "k", missing, "SETUP", "one more", 99)).toEqual({ ok: false, reason: "FULL" });
  });

  it("reads only well-formed notes; unreadable storage is an empty book", () => {
    expect(readAmendmentBook(null)).toEqual({});
    expect(readAmendmentBook("{bad")).toEqual({});
    expect(readAmendmentBook(JSON.stringify({ a: [{ field: "SETUP", value: "ok", at: 1 }, { field: "HACK", value: "x", at: 2 }, { field: "LESSON", value: "", at: 3 }], b: "nope" })))
      .toEqual({ a: [{ field: "SETUP", value: "ok", at: 1 }] });
  });

  it("a note says when it was added and that it came after the outcome", () => {
    expect(amendmentLine({ field: "SETUP", value: "ORB retest", at: 1 }, "Setup", "Oct 22")).toBe("Added Oct 22, after the outcome · Setup: ORB retest");
  });
});
