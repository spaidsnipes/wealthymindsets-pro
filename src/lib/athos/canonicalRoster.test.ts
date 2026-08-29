import { describe, it, expect } from "vitest";
import {
  CANONICAL_ATHOS_ROSTER,
  CANONICAL_ROLE_NAMES,
  LEGACY_SHORTHAND_MAP,
  resolveRole,
} from "./canonicalRoster";

/**
 * canon §THE TWELVE ROLES (ATHOS Master Manual v2.0, 2026-07-28) —
 * the twelve names + fruits + titles are locked verbatim.
 */
describe("canonicalRoster — canon §Twelve Roles", () => {
  const EXPECTED = [
    ["Elias",     "Chief Strategy Officer",                     "Love"],
    ["Grace",     "Chief Revenue Officer",                      "Kindness"],
    ["Caleb",     "Director of Business Intelligence",          "Patience"],
    ["Sophia",    "Chief Consulting Officer",                   "Goodness"],
    ["Noah",      "Chief Engineering Officer",                  "Faithfulness"],
    ["Micah",     "Chief Experience Officer",                   "Gentleness"],
    ["Hope",      "Chief Growth Officer",                       "Joy"],
    ["Shalom",    "Chief Customer Officer",                     "Peace"],
    ["Nehemiah",  "Chief Operations and Production Officer",    "Self-Control"],
    ["Atlas",     "Chief Knowledge System",                     "Truth, Wisdom, Stewardship, Clarity, Legacy"],
    ["Forge",     "Master Systems Builder",                     "Excellence"],
    ["Sentinel",  "Master Quality Builder",                     "Precision"],
  ] as const;

  it("exports exactly twelve roles in canon order", () => {
    expect(CANONICAL_ATHOS_ROSTER.length).toBe(12);
    expect(CANONICAL_ROLE_NAMES).toEqual(EXPECTED.map(([n]) => n));
  });

  it("each role has the verbatim canon name + title + core value", () => {
    for (let i = 0; i < EXPECTED.length; i++) {
      const [name, title, coreValue] = EXPECTED[i];
      expect(CANONICAL_ATHOS_ROSTER[i].name).toBe(name);
      expect(CANONICAL_ATHOS_ROSTER[i].title).toBe(title);
      expect(CANONICAL_ATHOS_ROSTER[i].coreValue).toBe(coreValue);
    }
  });

  it("every role has a non-empty mission (canon: no placeholder mission)", () => {
    for (const r of CANONICAL_ATHOS_ROSTER) {
      expect(r.mission.length).toBeGreaterThan(0);
    }
  });

  it("the roster is frozen (Sentinel lock)", () => {
    expect(Object.isFrozen(CANONICAL_ATHOS_ROSTER)).toBe(true);
  });
});

describe("LEGACY_SHORTHAND_MAP — supersession of the 7-role shorthand", () => {
  it("maps the six still-valid shorthands to canonical role names", () => {
    expect(LEGACY_SHORTHAND_MAP.ATHOS).toBe("Elias");
    expect(LEGACY_SHORTHAND_MAP.NOAH).toBe("Noah");
    expect(LEGACY_SHORTHAND_MAP.MICAH).toBe("Micah");
    expect(LEGACY_SHORTHAND_MAP.NEHEMIAH).toBe("Nehemiah");
    expect(LEGACY_SHORTHAND_MAP.ATLAS).toBe("Atlas");
    expect(LEGACY_SHORTHAND_MAP.SENTINEL).toBe("Sentinel");
  });

  it("ORKIN is explicitly SUPERSEDED (canon: never existed in ATHOS Master Manual)", () => {
    expect(LEGACY_SHORTHAND_MAP.ORKIN).toBe("SUPERSEDED");
  });
});

describe("resolveRole — canonical + shorthand lookup", () => {
  it("resolves the twelve canonical names case-insensitively", () => {
    expect(resolveRole("Noah")?.title).toBe("Chief Engineering Officer");
    expect(resolveRole("noah")?.title).toBe("Chief Engineering Officer");
    expect(resolveRole("FORGE")?.title).toBe("Master Systems Builder");
    expect(resolveRole("Sentinel")?.coreValue).toBe("Precision");
  });

  it("resolves the six live shorthands to their canonical roles", () => {
    expect(resolveRole("ATHOS")?.name).toBe("Elias");
    expect(resolveRole("NOAH")?.name).toBe("Noah");
    expect(resolveRole("MICAH")?.name).toBe("Micah");
    expect(resolveRole("NEHEMIAH")?.name).toBe("Nehemiah");
    expect(resolveRole("ATLAS")?.name).toBe("Atlas");
    expect(resolveRole("SENTINEL")?.name).toBe("Sentinel");
  });

  it("returns null for ORKIN (SUPERSEDED — no canonical equivalent)", () => {
    expect(resolveRole("ORKIN")).toBeNull();
    expect(resolveRole("orkin")).toBeNull();
  });

  it("returns null for names never in canon (canon: do not invent)", () => {
    expect(resolveRole("Ghost")).toBeNull();
    expect(resolveRole("")).toBeNull();
    expect(resolveRole("Ronin")).toBeNull();
  });
});
