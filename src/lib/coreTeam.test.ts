/**
 * coreTeam — truth-lock for the isCoreTeam predicate.
 *
 * Core team accounts get blue check + crown W badge + unlimited free
 * music uploads. Silent drift here would silently grant/revoke special
 * privileges — a P0 identity mistake.
 *
 * Locks:
 *   - Handle matching case-insensitive + @-prefix optional
 *   - Email matching case-insensitive + trimmed
 *   - Both handle + email null → false
 *   - Non-core handle + non-core email → false
 */

import { describe, it, expect } from "vitest";
import { isCoreTeam, CORE_TEAM_HANDLES, CORE_TEAM_EMAILS } from "./coreTeam";

describe("CORE_TEAM_HANDLES set", () => {
  it("contains the canonical SpaidFX handle", () => {
    expect(CORE_TEAM_HANDLES.has("@spaidedfx")).toBe(true);
  });
  it("contains the current test handle", () => {
    expect(CORE_TEAM_HANDLES.has("@noosleepspaid")).toBe(true);
  });
});

describe("CORE_TEAM_EMAILS set", () => {
  it("contains the founder email", () => {
    expect(CORE_TEAM_EMAILS.has("dhill5711@gmail.com")).toBe(true);
  });
});

describe("isCoreTeam — handle path", () => {
  it("true for canonical @-prefixed handle", () => {
    expect(isCoreTeam("@spaidedfx")).toBe(true);
  });
  it("true when handle is supplied WITHOUT @ prefix (auto-prepends)", () => {
    expect(isCoreTeam("spaidedfx")).toBe(true);
    expect(isCoreTeam("wink")).toBe(true);
  });
  it("case-insensitive handle match", () => {
    expect(isCoreTeam("@SpaidedFX")).toBe(true);
    expect(isCoreTeam("PSLIM")).toBe(true);
  });
  it("trims whitespace before matching", () => {
    expect(isCoreTeam("  @spaidedfx  ")).toBe(true);
    expect(isCoreTeam("  wink  ")).toBe(true);
  });
  it("false for non-core handles", () => {
    expect(isCoreTeam("@random-user")).toBe(false);
    expect(isCoreTeam("outsider")).toBe(false);
  });
});

describe("isCoreTeam — email path (short-circuits before handle check)", () => {
  it("true for canonical founder email", () => {
    expect(isCoreTeam(null, "dhill5711@gmail.com")).toBe(true);
  });
  it("case-insensitive email + trimmed", () => {
    expect(isCoreTeam(null, "DHILL5711@Gmail.com")).toBe(true);
    expect(isCoreTeam(null, "  dhill5711@gmail.com  ")).toBe(true);
  });
  it("true even with a non-core handle when email is core (email wins)", () => {
    expect(isCoreTeam("@random-user", "dhill5711@gmail.com")).toBe(true);
  });
  it("false for non-core email + non-core handle", () => {
    expect(isCoreTeam("@random", "outsider@example.com")).toBe(false);
  });
});

describe("isCoreTeam — null/empty inputs", () => {
  it("both undefined → false", () => {
    expect(isCoreTeam()).toBe(false);
  });
  it("both null → false", () => {
    expect(isCoreTeam(null, null)).toBe(false);
  });
  it("empty-string handle → false (not empty-string match)", () => {
    expect(isCoreTeam("", null)).toBe(false);
  });
});
