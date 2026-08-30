import { describe, expect, it, vi } from "vitest";
import { persistAcademyNote, readAcademyNote } from "./educationNotesStorage";

describe("Academy note browser persistence truth", () => {
  it("fails closed to an empty note when browser read is unavailable", () => {
    expect(readAcademyNote({ getItem: () => { throw new Error("blocked"); } }, "wm-notes-1")).toBe("");
  });

  it("reports PERSISTED only after exact readback", () => {
    let stored: string | null = null;
    const storage = {
      setItem: (_key: string, value: string) => { stored = value; },
      getItem: () => stored,
    };

    expect(persistAcademyNote(storage, "wm-notes-1", "Protect capital")).toEqual({
      status: "PERSISTED",
    });
  });

  it("fails closed when readback differs", () => {
    const storage = {
      setItem: vi.fn(),
      getItem: () => "older note",
    };

    expect(persistAcademyNote(storage, "wm-notes-1", "new note")).toEqual({
      status: "UNAVAILABLE",
      reason: "Browser readback did not match the note.",
    });
  });

  it("fails closed when browser storage throws", () => {
    const storage = {
      setItem: () => { throw new Error("quota"); },
      getItem: () => null,
    };

    expect(persistAcademyNote(storage, "wm-notes-1", "note")).toEqual({
      status: "UNAVAILABLE",
      reason: "Browser storage is unavailable.",
    });
  });
});
