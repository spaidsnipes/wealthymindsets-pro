import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyMarketFieldFreshness,
  parseTimeframeMs,
  describeAge,
  ASSUMED_BAR_INTERVAL_MS,
} from "./marketFieldFreshness";

const MIN = 60_000;
const HOUR = 60 * MIN;

describe("parseTimeframeMs", () => {
  it("parses the timeframe tokens this app actually uses", () => {
    expect(parseTimeframeMs("1m")).toBe(MIN);
    expect(parseTimeframeMs("5m")).toBe(5 * MIN);
    expect(parseTimeframeMs("15m")).toBe(15 * MIN);
    expect(parseTimeframeMs("1h")).toBe(HOUR);
    expect(parseTimeframeMs("4h")).toBe(4 * HOUR);
    expect(parseTimeframeMs("1d")).toBe(24 * HOUR);
    expect(parseTimeframeMs("1w")).toBe(7 * 24 * HOUR);
  });

  it("refuses rather than guesses", () => {
    // "M" is ambiguous between minute and month across trading UIs. A wrong
    // guess here silently moves the stale budget by a factor of 43,200, so
    // the honest answer is null and a declared assumption downstream.
    expect(parseTimeframeMs("1M")).toBeNull();
    expect(parseTimeframeMs("")).toBeNull();
    expect(parseTimeframeMs("intraday")).toBeNull();
    expect(parseTimeframeMs("0m")).toBeNull();
    expect(parseTimeframeMs("-5m")).toBeNull();
  });
});

describe("describeAge", () => {
  it("speaks in plain english, never a bare number", () => {
    expect(describeAge(0)).toBe("just now");
    expect(describeAge(3_000)).toBe("just now");
    expect(describeAge(42_000)).toBe("42s ago");
    expect(describeAge(4 * MIN)).toBe("4m ago");
    expect(describeAge(2 * HOUR)).toBe("2h ago");
    expect(describeAge(2 * HOUR + 10 * MIN)).toBe("2h 10m ago");
    expect(describeAge(26 * HOUR)).toBe("1 day ago");
    expect(describeAge(50 * HOUR)).toBe("2 days ago");
  });

  it("never reports a negative age as the future", () => {
    // Clock skew between the fetch stamp and the render clock must not print
    // "-3s ago", which reads as a broken app rather than a fresh read.
    expect(describeAge(-3_000)).toBe("just now");
  });
});

describe("classifyMarketFieldFreshness", () => {
  const base = { fetchedAtMs: 0, timeframe: "15m", session: "OPEN" as const };

  it("T-LIVE: a read inside one bar interval is FRESH", () => {
    const f = classifyMarketFieldFreshness({ ...base, nowMs: 5 * MIN });
    expect(f.kind).toBe("FRESH");
    expect(f.label).toBe("Read 5m ago");
    expect(f.budgetIsAssumed).toBe(false);
  });

  it("T-STALE: past one interval it AGES, past three it says STALE in words", () => {
    const aging = classifyMarketFieldFreshness({ ...base, nowMs: 20 * MIN });
    expect(aging.kind).toBe("AGING");

    const stale = classifyMarketFieldFreshness({ ...base, nowMs: 6 * HOUR });
    expect(stale.kind).toBe("STALE");
    // The Founder gate: the room must SAY stale, not imply it by a dimmer
    // colour. A trader who cannot see colour must still get the warning.
    expect(stale.label).toContain("STALE");
    expect(stale.label).toContain("6h ago");
    expect(stale.label).toContain("have not refreshed");
  });

  it("T-CLOSED: a shut tape yields FINAL, never STALE, at any age", () => {
    // The last bar IS the market when the market is closed. Decaying it would
    // tell the trader to distrust a number that is perfectly current.
    for (const nowMs of [1 * MIN, 6 * HOUR, 72 * HOUR]) {
      const f = classifyMarketFieldFreshness({ ...base, session: "CLOSED", nowMs });
      expect(f.kind).toBe("FINAL");
      expect(f.label).toContain("Session closed");
      expect(f.label).not.toContain("STALE");
    }
  });

  it("T-UNKNOWN: an unknown session is NOT treated as closed", () => {
    // The most dangerous state in the app: live tape, silent session signal,
    // hours-old candles. Silence must never buy an exemption from aging.
    const f = classifyMarketFieldFreshness({ ...base, session: "UNKNOWN", nowMs: 6 * HOUR });
    expect(f.kind).toBe("STALE");
    expect(f.label).toContain("STALE");
  });

  it("declares when the stale budget was assumed rather than derived", () => {
    const f = classifyMarketFieldFreshness({ ...base, timeframe: "intraday", nowMs: 1_000 });
    expect(f.budgetIsAssumed).toBe(true);
    expect(f.budgetMs).toBe(ASSUMED_BAR_INTERVAL_MS);
  });

  it("never lets a fast timeframe produce a hair-trigger budget", () => {
    // A 1m chart would otherwise go STALE 3 minutes after load, which trains
    // the trader to ignore the warning — the worst outcome for a truth signal.
    const f = classifyMarketFieldFreshness({ ...base, timeframe: "1m", nowMs: 90_000 });
    expect(f.budgetMs).toBe(MIN);
    expect(f.kind).toBe("AGING");
  });
});

describe("the MARKET field consumes the freshness owner", () => {
  // Adoption guard. A pure module with no consumer is not a truth fix, it is
  // an unused file that makes the repo look safer than it is.
  const chart = readFileSync(
    resolve(__dirname, "../../components/experience/DeckMarketChart.tsx"),
    "utf8",
  );

  it("stamps when the candles actually landed", () => {
    expect(chart).toMatch(/fetchedAtMs/);
  });

  it("routes staleness through the single owner, not a local rule", () => {
    expect(chart).toContain("classifyMarketFieldFreshness");
    expect(chart).toContain("marketFieldFreshness");
  });

  it("reads the canonical session signal rather than inventing a second one", () => {
    expect(chart).toContain("useSanctuarySession");
  });

  it("renders the as-of line so the age is visible, not merely computed", () => {
    expect(chart).toContain("deck-market-chart-asof");
  });
});
