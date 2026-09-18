import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chartFeedRecency } from "./chartFeedRecency";

const SRC = resolve(__dirname, "..", "..");

/** Strips comments so a Sentinel cannot be satisfied — or fooled — by prose. */
function codeOf(rel: string): string {
  return readFileSync(resolve(SRC, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const UTC = "UTC";
/** 2026-09-17 19:00:00Z — a clean half-hour boundary. */
const BAR_OPEN_S = Date.UTC(2026, 8, 17, 19, 0, 0) / 1000;
const MIN = 60_000;
const HALF_HOUR = 1800;
const ONE_MIN = 60;

describe("chartFeedRecency — the same clock time means fresh or dead", () => {
  it("× THE HEADLINE DEFECT: one age, two timeframes, OPPOSITE verdicts", () => {
    /**
     * This is the whole reason the module exists. The newest bar opened
     * twelve minutes ago in BOTH cases. On a 30m chart that bar is the one
     * forming right now and nothing is wrong. On a 1m chart the screen is
     * eleven bars behind and the tape is dead.
     *
     * A bare `LAST 07:00 PM` renders identically in both worlds.
     */
    const now = BAR_OPEN_S * 1000 + 12 * MIN;
    const slow = chartFeedRecency(BAR_OPEN_S, HALF_HOUR, now, UTC);
    const fast = chartFeedRecency(BAR_OPEN_S, ONE_MIN, now, UTC);

    expect(slow.kind).toBe("CURRENT_BAR");
    expect(slow.barsBehind).toBe(0);

    expect(fast.kind).toBe("BARS_BEHIND");
    expect(fast.barsBehind).toBe(12);

    // Same instant, same timestamp on screen — and the product must not
    // render the same sentence about them.
    expect(slow.glyph).not.toBe(fast.glyph);
    expect(slow.spoken).not.toBe(fast.spoken);
  });

  it("× THE MISSING VERB: the glyph says OPENED, never a bare LAST", () => {
    const s = chartFeedRecency(BAR_OPEN_S, HALF_HOUR, BAR_OPEN_S * 1000 + MIN, UTC);
    expect(s.glyph).toMatch(/OPENED/);
    // "LAST 07:00 PM" is the exact shape being retired: a timestamp with no
    // verb, in the slot a trader reads for freshness.
    expect(s.glyph).not.toMatch(/^LAST /);
    expect(s.title).toMatch(/OPENING time, not a last-update time/);
  });

  it("§35: the absolute timestamp is never replaced by the verdict", () => {
    for (const [interval, label] of [[HALF_HOUR, "30m"], [ONE_MIN, "1m"]] as const) {
      const s = chartFeedRecency(BAR_OPEN_S, interval, BAR_OPEN_S * 1000 + 12 * MIN, UTC);
      expect(s.glyph, label).toMatch(/07:00 PM/);
      expect(s.title, label).toMatch(/07:00 PM/);
    }
  });

  it("the age is reported in BARS, not minutes — dimensionless over absolute", () => {
    const s = chartFeedRecency(BAR_OPEN_S, HALF_HOUR, BAR_OPEN_S * 1000 + 95 * MIN, UTC);
    expect(s.barsBehind).toBe(3);
    expect(s.glyph).toMatch(/3 BARS BEHIND/);
    expect(s.title).toMatch(/Bars, not minutes/);
  });

  it("singular and plural are not the same word", () => {
    const one = chartFeedRecency(BAR_OPEN_S, HALF_HOUR, BAR_OPEN_S * 1000 + 31 * MIN, UTC);
    expect(one.barsBehind).toBe(1);
    expect(one.glyph).toMatch(/1 BAR BEHIND/);
    expect(one.glyph).not.toMatch(/BARS BEHIND/);
    expect(one.title).toMatch(/1 whole bar should have opened/);

    const two = chartFeedRecency(BAR_OPEN_S, HALF_HOUR, BAR_OPEN_S * 1000 + 61 * MIN, UTC);
    expect(two.glyph).toMatch(/2 BARS BEHIND/);
  });

  it("the boundary is the interval, exactly — not a tuned constant", () => {
    const justInside = chartFeedRecency(
      BAR_OPEN_S, HALF_HOUR, BAR_OPEN_S * 1000 + (HALF_HOUR * 1000 - 1), UTC);
    expect(justInside.kind).toBe("CURRENT_BAR");

    const exactlyOne = chartFeedRecency(
      BAR_OPEN_S, HALF_HOUR, BAR_OPEN_S * 1000 + HALF_HOUR * 1000, UTC);
    expect(exactlyOne.kind).toBe("BARS_BEHIND");
    expect(exactlyOne.barsBehind).toBe(1);
  });

  it("CURRENT_BAR claims arithmetic, never a live feed", () => {
    /**
     * The badge beside this reading owns the LIVE/DELAYED/STALE verdict. A
     * timestamp cannot certify that ticks are arriving, and a second, weaker
     * opinion about that would only agree with the first until one was edited.
     */
    const s = chartFeedRecency(BAR_OPEN_S, HALF_HOUR, BAR_OPEN_S * 1000 + MIN, UTC);
    expect(s.glyph).not.toMatch(/\bLIVE\b/);
    expect(s.spoken).not.toMatch(/\bLIVE\b/);
    expect(s.title).toMatch(/whether ticks are actually arriving/);
  });

  it("a bar stamped in the future is UNKNOWN, not 'current'", () => {
    const s = chartFeedRecency(BAR_OPEN_S, HALF_HOUR, (BAR_OPEN_S - 600) * 1000, UTC);
    expect(s.kind).toBe("UNKNOWN");
    expect(s.barsBehind).toBeNull();
    expect(s.title).toMatch(/in the future/);
  });

  it("× THE ZERO THAT MEANS 'DO NOT KNOW': barsBehind is null, never 0", () => {
    /**
     * `0` is a real verdict here — it means "the newest bar is the forming
     * bar". Reusing it for "could not tell" would be the same overclaim this
     * whole module exists to remove, wearing a number's clothes.
     */
    const cases: ReadonlyArray<readonly [unknown, unknown, unknown, string]> = [
      [null, HALF_HOUR, BAR_OPEN_S * 1000, "no bar time"],
      [0, HALF_HOUR, BAR_OPEN_S * 1000, "zero bar time"],
      [Number.NaN, HALF_HOUR, BAR_OPEN_S * 1000, "NaN bar time"],
      [BAR_OPEN_S, null, BAR_OPEN_S * 1000, "no interval"],
      [BAR_OPEN_S, 0, BAR_OPEN_S * 1000, "zero interval"],
      [BAR_OPEN_S, -5, BAR_OPEN_S * 1000, "negative interval"],
      [BAR_OPEN_S, HALF_HOUR, null, "no clock"],
      [BAR_OPEN_S, HALF_HOUR, Number.NaN, "NaN clock"],
    ];
    for (const [bar, interval, now, label] of cases) {
      const s = chartFeedRecency(bar as never, interval as never, now as never, UTC);
      expect(s.kind, label).toBe("UNKNOWN");
      expect(s.barsBehind, label).toBeNull();
      expect(s.glyph, label).toBe("NEWEST BAR — TIME UNKNOWN");
      expect(s.title, label).toMatch(/will not render a freshness reading it cannot support/);
    }
  });

  it("the UNKNOWN arms say WHICH ingredient is missing", () => {
    // A refusal that does not name its cause is a shrug with a border on it.
    expect(chartFeedRecency(null, HALF_HOUR, 1, UTC).title).toMatch(/no bar timestamp/);
    expect(chartFeedRecency(BAR_OPEN_S, null, 1, UTC).title).toMatch(/no bar interval/);
    expect(chartFeedRecency(BAR_OPEN_S, HALF_HOUR, null, UTC).title).toMatch(/no clock/);
  });

  it("the verdict is SPOKEN, not hover-only", () => {
    const behind = chartFeedRecency(BAR_OPEN_S, ONE_MIN, BAR_OPEN_S * 1000 + 12 * MIN, UTC);
    expect(behind.spoken).toMatch(/12 bars behind/);
    expect(behind.spoken).toMatch(/07:00 PM/);

    const current = chartFeedRecency(BAR_OPEN_S, HALF_HOUR, BAR_OPEN_S * 1000 + MIN, UTC);
    expect(current.spoken).toMatch(/currently forming/);
  });

  it("is pure — no clock of its own", () => {
    const a = chartFeedRecency(BAR_OPEN_S, HALF_HOUR, BAR_OPEN_S * 1000 + MIN, UTC);
    const b = chartFeedRecency(BAR_OPEN_S, HALF_HOUR, BAR_OPEN_S * 1000 + MIN, UTC);
    expect(a).toEqual(b);
    expect(codeOf("lib/chart/chartFeedRecency.ts")).not.toMatch(/Date\.now\(\)/);
  });
});

describe("MainChart adoption", () => {
  const CODE = codeOf("components/chart/MainChart.tsx");

  it("× THE VERBLESS CLOCK: `LAST ${lastStr}` is gone from the source", () => {
    expect(CODE, "the bare timestamp came back into the freshness slot")
      .not.toMatch(/LAST \$\{lastStr\}/);
  });

  it("the badge compiles through chartFeedRecency", () => {
    expect(CODE).toContain("chartFeedRecency(");
    expect(CODE).toContain("feedRecency.glyph");
    expect(CODE).toContain("feedRecency.title");
  });

  it("the verdict reaches assistive tech and the DOM, not just a hover", () => {
    expect(CODE).toContain("aria-label={feedRecency.spoken}");
    expect(CODE).toContain("data-feed-recency-kind={feedRecency.kind}");
  });

  it("the interval comes from the same state the countdown uses", () => {
    // One interval, two readers. A second derivation would agree with the
    // first only until someone edited one of them.
    expect(CODE).toMatch(/chartFeedRecency\(\s*lastBarT,\s*intervalSec,\s*nowMs/);
  });
});
