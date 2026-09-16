/**
 * The fixtures must be the days they claim to be, IN MARKET TIME — and they
 * must stay that way in every timezone a CI runner might stand in.
 *
 * This is the guard that would have caught the local/CI split in one line
 * instead of it surfacing as eighteen confusing assertion failures about
 * futures sessions across five unrelated files.
 */
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  ET_CONSECUTIVE_WEEK,
  ET_DAY_BY_INDEX,
  SATURDAY,
  SUNDAY,
  WEDNESDAY,
  etDay,
  etWeekday,
} from "./marketDayFixtures";

describe("market day fixtures are ET-anchored", () => {
  it.each([
    ["SATURDAY", SATURDAY, "Sat"],
    ["SUNDAY", SUNDAY, "Sun"],
    ["WEDNESDAY", WEDNESDAY, "Wed"],
  ])("%s is a %s in America/New_York", (_name, at, expected) => {
    expect(etWeekday(at)).toBe(expected);
  });

  it("indexes ET_DAY_BY_INDEX by the weekday it actually is", () => {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    expect(ET_DAY_BY_INDEX).toHaveLength(7);
    ET_DAY_BY_INDEX.forEach((at, i) => {
      expect(etWeekday(at), `index ${i}`).toBe(names[i]);
    });
  });

  it("ET_CONSECUTIVE_WEEK covers all seven weekdays exactly once", () => {
    const seen = ET_CONSECUTIVE_WEEK.map(etWeekday);
    expect(new Set(seen).size).toBe(7);
  });

  it("anchors at midday ET, so no fixture can slip into an adjacent date", () => {
    // 16:00Z is 12:00 EDT / 11:00 EST — at least 11 hours from either
    // midnight, which is more slack than any offset or DST shift can consume.
    for (const at of [...ET_DAY_BY_INDEX, ...ET_CONSECUTIVE_WEEK]) {
      expect(at.getUTCHours()).toBe(16);
    }
  });

  it("etDay is offset-free: the caller names a DATE, never an hour", () => {
    // Writing the UTC offset by hand at each call site is how the original
    // defect got in. The helper owns the anchoring.
    expect(etWeekday(etDay("2026-09-05"))).toBe("Sat");
    expect(etWeekday(etDay("2026-12-25"))).toBe("Fri"); // EST side of DST
  });
});

describe("SENTINEL — no session test builds a day from the runner's local clock", () => {
  // `new Date(y, m, d)` is midnight LOCAL. In a session fixture that is a
  // second, unowned clock. These files must import the ET-anchored constants.
  const root = path.resolve(__dirname, "../../..");
  const GUARDED = [
    "src/lib/marketData/sessionToken.test.ts",
    "src/lib/marketData/canonicalIdentity.test.ts",
    "src/lib/marketData/canonicalCapabilityResolver.test.ts",
    "src/lib/marketData/pickerCryptoClassification.test.ts",
    "src/lib/experience/deckSceneSignals.test.ts",
    "src/components/command/sessionDetailText.test.ts",
    "src/components/command-deck/heroTruthSession.test.tsx",
  ];

  /**
   * A Sentinel that fails on its own honest prose is testing the wrong
   * surface: the docblocks in these files QUOTE `new Date(2026, 8, 5)` in
   * order to explain why it was wrong. Strip comments before scanning.
   */
  const codeOnly = (s: string): string =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  const offendersIn = (src: string): string[] => codeOnly(src).match(/new Date\(\s*\d{4}\s*,/g) ?? [];

  it("POSITIVE CONTROL: the scan detects the pattern it claims to forbid", () => {
    // Without this, a typo in the regex would make every assertion below pass
    // green forever while policing nothing — the exact failure mode
    // sentinelsProveTheyScanned exists to catch.
    expect(offendersIn("const SATURDAY = new Date(2026, 8, 5);")).toHaveLength(1);
    expect(offendersIn('/* was: new Date(2026, 8, 5) */')).toHaveLength(0);
    expect(offendersIn('const ok = new Date("2026-09-05T16:00:00Z");')).toHaveLength(0);
  });

  it.each(GUARDED)("%s builds no local-midnight Date", (rel) => {
    const src = fs.readFileSync(path.join(root, rel), "utf8");
    // Proof the scan read real material rather than an empty/renamed file.
    expect(src.length, `${rel} is empty or unreadable`).toBeGreaterThan(500);
    expect(
      offendersIn(src),
      `${rel} constructs a Date from local calendar parts. Import the ` +
        `ET-anchored fixtures from @/lib/marketData/marketDayFixtures instead — ` +
        `a market session is a fact about the exchange, not about the machine.`,
    ).toEqual([]);
  });

  it("every guarded file actually reads the shared owner", () => {
    for (const rel of GUARDED) {
      const src = fs.readFileSync(path.join(root, rel), "utf8");
      expect(src, rel).toMatch(/marketDayFixtures/);
    }
  });
});
