import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { persistAcademyNote, readAcademyNote } from "./educationNotesStorage";

describe("Academy note browser persistence truth", () => {
  it("does not fabricate an empty writable note when browser read is unavailable", () => {
    expect(readAcademyNote({ getItem: () => { throw new Error("blocked"); } }, "wm-notes-1")).toEqual({ status: "UNAVAILABLE" });
  });

  it("distinguishes a missing note from a failed read", () => {
    expect(readAcademyNote({ getItem: () => null }, "wm-notes-1")).toEqual({ status: "READ", value: "" });
  });

  it("catches a blocked localStorage property getter before both read and write", () => {
    const blocked = () => { throw new Error("SecurityError"); };
    expect(readAcademyNote(blocked, "wm-notes-1")).toEqual({ status: "UNAVAILABLE" });
    expect(persistAcademyNote(blocked, "wm-notes-1", "draft").status).toBe("UNAVAILABLE");
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

  it("keeps two lesson notes isolated across read-only visits and immediate edits", () => {
    const values = new Map([["wm-notes-A", "A original"], ["wm-notes-B", "B original"]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    };
    expect(readAcademyNote(storage, "wm-notes-A")).toEqual({ status: "READ", value: "A original" });
    expect(readAcademyNote(storage, "wm-notes-B")).toEqual({ status: "READ", value: "B original" });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(persistAcademyNote(storage, "wm-notes-A", "A newest").status).toBe("PERSISTED");
    // No timer advancement: a subsequent mount/read already sees the latest edit.
    expect(readAcademyNote(storage, "wm-notes-A")).toEqual({ status: "READ", value: "A newest" });
    expect(values.get("wm-notes-B")).toBe("B original");
  });

  it("supports intentionally clearing a note without treating empty as a failed save", () => {
    let value = "existing";
    const storage = { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
    expect(persistAcademyNote(storage, "wm-notes-A", "")).toEqual({ status: "PERSISTED" });
    expect(readAcademyNote(storage, "wm-notes-A")).toEqual({ status: "READ", value: "" });
  });
});

// Wiring guards are source checks, not a claim of React/browser lifecycle proof.
describe("Academy editor lifecycle wiring", () => {
  const page = readFileSync(new URL("../app/education/page.tsx", import.meta.url), "utf8");
  const notes = page.slice(page.indexOf("function LessonNotes"), page.indexOf("/* ── Quiz panel"));

  it("remounts the note editor for each lesson identity", () => {
    expect(page).toContain("<LessonNotes key={lesson.id} lessonId={lesson.id}/>");
  });

  it("writes only in an edit event, never on blur or a deferred timer", () => {
    expect(notes).not.toContain("onBlur");
    expect(notes).not.toContain("setTimeout");
    expect(notes).not.toContain("clearTimeout");
    expect(notes).toContain('if (readState !== "READ") return;');
    expect(notes).toContain("persistAcademyNote(() => window.localStorage, KEY, v)");
    expect(notes.match(/persistAcademyNote\(/g)).toHaveLength(1);
  });

  it("does not read browser storage in the initial render and disables unreadable notes", () => {
    expect(notes).toContain('useState("")');
    expect(notes).toContain("useEffect(() => {");
    expect(notes).toContain('disabled={readState !== "READ"}');
    expect(notes).toContain("Could not read note — editing disabled");
  });
});
