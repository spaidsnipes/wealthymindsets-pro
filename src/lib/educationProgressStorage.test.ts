import { describe, expect, it, vi } from "vitest";
import { persistAcademyProgress } from "./educationProgressStorage";

const progress = {
  1: { completed: false, lessons: { "of-1": false } },
};

describe("Academy progress browser persistence truth", () => {
  it("reports PERSISTED only after exact serialized readback", () => {
    let stored: string | null = null;
    const storage = {
      setItem: (_key: string, value: string) => { stored = value; },
      getItem: () => stored,
    };

    expect(persistAcademyProgress(storage, "wm_edu_progress", progress)).toEqual({ status: "PERSISTED" });
  });

  it("fails closed on readback mismatch", () => {
    const storage = { setItem: vi.fn(), getItem: () => "{}" };
    expect(persistAcademyProgress(storage, "wm_edu_progress", progress)).toEqual({
      status: "UNAVAILABLE",
      reason: "Browser progress readback did not match.",
    });
  });

  it("fails closed when storage throws", () => {
    const storage = {
      setItem: () => { throw new Error("quota"); },
      getItem: () => null,
    };
    expect(persistAcademyProgress(storage, "wm_edu_progress", progress)).toEqual({
      status: "UNAVAILABLE",
      reason: "Browser progress storage is unavailable.",
    });
  });
});
