import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { paperSpotStat, describeObservationAge } from "./paperSpotDisclosure";
import {
  initialPaperQuoteReadiness,
  type PaperQuoteReadiness,
} from "../marketData/viewModels/selectPaperQuoteReadiness";

const PAPER = resolve(__dirname, "..", "..", "app", "paper", "page.tsx");

const NOW = 1_700_000_000_000;

const actionable: PaperQuoteReadiness = {
  status: "DELAYED",
  actionable: true,
  price: 412.5,
  observedAt: NOW - 60_000,
  availableAt: NOW - 60_000,
  receivedAt: NOW - 60_000,
  ageMs: 60_000,
  label: "ACTIVE · DEGRADED",
  reason: "Canonical delayed observation accepted for paper simulation only.",
};

/** The state the header erased: WM HOLDS a price, it just may not be traded on. */
const stale: PaperQuoteReadiness = {
  ...actionable,
  status: "STALE",
  actionable: false,
  ageMs: 23 * 60_000,
  label: "STALE PIPELINE · NOT ACTIONABLE",
  reason: "The last canonical observation exceeded the Paper freshness budget.",
};

const unknown: PaperQuoteReadiness = {
  status: "UNKNOWN",
  actionable: false,
  price: null,
  observedAt: null,
  availableAt: null,
  receivedAt: null,
  ageMs: null,
  label: "UNKNOWN · NOT ACTIONABLE",
  reason: "Canonical quote observation is UNKNOWN.",
};

describe("paperSpotStat: a permission is not an observation", () => {
  it("THE DEFECT: a stale price is still a price WM holds, and it is shown", () => {
    // `actionablePaperQuotePrice` returns null here — correctly, because
    // nothing may be traded on it. The header used that null to conclude WM
    // knew nothing, and printed a bare dash over a measured number.
    const s = paperSpotStat(stale, "TSLA", NOW);
    expect(s.value).toBe("$412.50");
    expect(s.value).not.toBe("—");
    expect(s.kind).toBe("MEASURED");
  });

  it("THE OTHER HALF: showing it must never let it read as current", () => {
    const s = paperSpotStat(stale, "TSLA", NOW);
    // The noun changes. "Spot" is a claim about NOW.
    expect(s.label).toBe("Last spot");
    // The tint refuses even though the figure survives — the same split the
    // account strip needed: the figure and the claim are separate.
    expect(s.tone).toBe("ALERT");
    expect(s.tone).not.toBe("NEUTRAL");
    // And the age must be stated, or "last" is unreadable.
    expect(s.reason).toContain("23 minutes ago");
    // The withheld ACTION is restated so nobody reads the price as permission.
    expect(s.reason).toMatch(/too old to authorize/i);
  });

  it("an actionable quote is not degraded by any of this", () => {
    const s = paperSpotStat(actionable, "TSLA", NOW);
    expect(s.label).toBe("Spot");
    expect(s.value).toBe("$412.50");
    expect(s.kind).toBe("MEASURED");
    expect(s.tone).toBe("NEUTRAL");
  });

  it("LOADING is pending, not missing — it must not claim UNKNOWN", () => {
    const s = paperSpotStat(initialPaperQuoteReadiness(), "TSLA", NOW);
    expect(s.kind).toBe("UNDEFINED");
    expect(s.value).not.toBe("UNKNOWN");
    expect(s.value).not.toBe("—");
    expect(s.reason).toMatch(/pending, not missing/i);
  });

  it("UNKNOWN is the ONLY state where WM holds no number, and it says so in a word", () => {
    const s = paperSpotStat(unknown, "TSLA", NOW);
    expect(s.value).toBe("UNKNOWN");
    expect(s.kind).toBe("UNKNOWN");
    expect(s.reason).toMatch(/not a price that is merely old/i);
  });

  it("no state renders a bare glyph, and every state carries a reason", () => {
    for (const r of [actionable, stale, initialPaperQuoteReadiness(), unknown]) {
      const s = paperSpotStat(r, "TSLA", NOW);
      expect(s.value.trim()).not.toBe("—");
      expect(s.value.trim().length).toBeGreaterThan(1);
      expect(s.reason.length).toBeGreaterThan(40);
      expect(s.reason).toContain("TSLA");
    }
  });

  it("a zero or non-finite price is not a price", () => {
    for (const bad of [0, Number.NaN, -1]) {
      const s = paperSpotStat({ ...stale, price: bad }, "TSLA", NOW);
      expect(s.value).toBe("UNKNOWN");
    }
  });

  it("describeObservationAge scales and refuses nonsense", () => {
    expect(describeObservationAge(5_000)).toBe("5s ago");
    expect(describeObservationAge(60_000)).toBe("1 minute ago");
    expect(describeObservationAge(23 * 60_000)).toBe("23 minutes ago");
    expect(describeObservationAge(3 * 3_600_000)).toBe("3 hours ago");
    expect(describeObservationAge(2 * 86_400_000)).toBe("2 days ago");
    expect(describeObservationAge(Number.NaN)).toBe("an unknown time ago");
  });
});

describe("the options chain composes the owner and keeps its refusal", () => {
  const code = readFileSync(PAPER, "utf8");

  it("the page does not compute the Spot tile itself", () => {
    expect(code).toContain("paperSpotStat(");
    // The exact erasure that was here.
    expect(code).not.toMatch(/Spot<\/span>\s*\n?\s*<span[^>]*>—<\/span>/);
  });

  it("× THE ORDER TICKET DOES NOT HAND-ROLL ITS OWN AGE SENTENCE", () => {
    // THE DEFECT, as shipped, on the line immediately above BUY / SELL:
    //
    //     `${Math.round((readiness.ageMs ?? 0) / 60_000)}m old`
    //
    // Three ways to read fresher than the evidence allowed. `?? 0` rendered an
    // UNKNOWN age as "0m old" — the most flattering number available, at the
    // moment WM knew the least. Minute-granularity rounding rendered every age
    // under thirty seconds as "0m old" too, so "unknown" and "just measured"
    // were the same words. And a negative age — an observation stamped ahead of
    // our clock, which is the ORDINARY case on a live feed — became "-0m old"
    // instead of being refused.
    //
    // `describeObservationAge` already refuses all three, and the Spot tile on
    // this same page already used it. Pinned to the ABSENCE of a second writer
    // rather than to a spelling of the cure.
    //
    // Block comments stripped first. The page NAMES the removed expression so
    // the next reader knows why it is gone; scanning the raw text would read
    // that record as the defect itself and force the history to be deleted to
    // make this rule pass. Rules that punish written-down history get it erased.
    const CODE = code.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(CODE).toContain("describeObservationAge(readiness.ageMs)");
    expect(CODE).not.toMatch(/ageMs \?\? 0/);
    // Minute granularity specifically, not rounding in general: the blotter's
    // FillPriceAgeNote rounds to SECONDS and pairs `m` with `% 60`, which keeps
    // every sub-minute age distinguishable. Dividing an age by 60_000 to print
    // it is the move that collapsed 0s, 29s and "unknown" into one string.
    expect(CODE).not.toMatch(/ageMs[\s\S]{0,24}60_000/);
    expect(CODE).not.toMatch(/m old`/);
  });

  it("the owner it now delegates to refuses exactly what the hand-rolled line admitted", () => {
    // Behavioural, not source — the three readings the ticket used to print.
    expect(describeObservationAge(-4_000)).toBe("an unknown time ago");
    expect(describeObservationAge(Number.NaN)).toBe("an unknown time ago");
    // Under a minute is stated in SECONDS, so it can never collapse into the
    // same "0m old" that an unknown age used to produce.
    expect(describeObservationAge(29_000)).toBe("29s ago");
    expect(describeObservationAge(29_000)).not.toMatch(/0m/);
  });

  it("an age WM does not hold says so, rather than defaulting to a number", () => {
    expect(code).toContain('"age unknown"');
  });

  it("THE REFUSAL IS NOT RELAXED: no strikes or premiums without an actionable price", () => {
    // Showing the last observation must not re-enable anything. The execution
    // boundary is still `actionablePaperQuotePrice` and the early return that
    // suppresses the whole chain must still be gated on it.
    expect(code).toContain("const spot = actionablePaperQuotePrice(readiness);");
    expect(code).toContain("if (spot == null)");
    expect(code).toContain("OPTIONS NOT ACTIONABLE");
    expect(code).toContain(
      "No strikes, modeled premiums, Greeks, marks, or option actions are produced without a finite canonical quote for",
    );
  });
});
