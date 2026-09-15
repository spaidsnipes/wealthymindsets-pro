import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyOptionSpot,
  classifyStrikeCell,
  optionSpotFact,
  optionSpotReason,
  strikeCellFact,
  strikeCellReason,
  type OptionSpotState,
  type StrikeCellState,
} from "./optionChainCellFacts";

const ALL_SPOT: readonly OptionSpotState[] = [
  "OBSERVED",
  "NO_SPOT_RECEIVED",
  "SPOT_IS_ANOTHER_SYMBOL",
  "SPOT_NOT_NUMERIC",
  "AWAITING_FIRST_PRINT",
];

const ALL_CELL: readonly StrikeCellState[] = [
  "REVIEWABLE",
  "NOT_LISTED",
  "WM_CLOCK_UNREAD",
  "CONTRACT_UNDATED",
];

describe("classifyStrikeCell — four situations, not one dash", () => {
  it("× THE DEFECT: an absent contract and an undatable one are not the same cell", () => {
    const absent = classifyStrikeCell({
      contractPresent: false,
      clockMs: 1_700_000_000_000,
      timingReviewable: false,
    });
    const undated = classifyStrikeCell({
      contractPresent: true,
      clockMs: 1_700_000_000_000,
      timingReviewable: false,
    });
    expect(absent).toBe("NOT_LISTED");
    expect(undated).toBe("CONTRACT_UNDATED");
    expect(absent).not.toBe(undated);
  });

  it("× THE WORSE LIE: WM's unread clock must not be reported as the contract's fault", () => {
    const state = classifyStrikeCell({
      contractPresent: true,
      clockMs: Number.NaN,
      timingReviewable: false,
    });
    expect(state).toBe("WM_CLOCK_UNREAD");
    expect(strikeCellReason(state, "call", 420, "TSLA")).toMatch(/WM's own bookkeeping/i);
    expect(strikeCellReason(state, "call", 420, "TSLA")).toMatch(/NOT a fault in the provider/i);
  });

  it("a null clock is the same unread clock as a NaN one", () => {
    expect(
      classifyStrikeCell({ contractPresent: true, clockMs: null, timingReviewable: true }),
    ).toBe("WM_CLOCK_UNREAD");
    expect(
      classifyStrikeCell({ contractPresent: true, clockMs: undefined, timingReviewable: true }),
    ).toBe("WM_CLOCK_UNREAD");
  });

  it("an absent contract outranks the clock — there is nothing to date", () => {
    expect(
      classifyStrikeCell({ contractPresent: false, clockMs: Number.NaN, timingReviewable: false }),
    ).toBe("NOT_LISTED");
  });

  it("a listed, dated, reviewable contract is the only actionable state", () => {
    expect(
      classifyStrikeCell({ contractPresent: true, clockMs: 1, timingReviewable: true }),
    ).toBe("REVIEWABLE");
    for (const s of ALL_CELL) {
      expect(strikeCellFact(s, "call", 420, "TSLA").actionable).toBe(s === "REVIEWABLE");
      expect(strikeCellFact(s, "put", 420, "TSLA").measured).toBe(s === "REVIEWABLE");
    }
  });
});

describe("classifyOptionSpot — the `: 0` sentinel, unpacked", () => {
  it("× THE DEFECT: four situations must not collapse into one number", () => {
    const seen = new Set<OptionSpotState>([
      classifyOptionSpot({ symbol: "TSLA", spot: null }),
      classifyOptionSpot({ symbol: "TSLA", spot: { symbol: "NVDA", price: 180 } }),
      classifyOptionSpot({ symbol: "TSLA", spot: { symbol: "TSLA", price: Number.NaN } }),
      classifyOptionSpot({ symbol: "TSLA", spot: { symbol: "TSLA", price: 0 } }),
    ]);
    expect(seen.size).toBe(4);
    expect(seen).toContain("NO_SPOT_RECEIVED");
    expect(seen).toContain("SPOT_IS_ANOTHER_SYMBOL");
    expect(seen).toContain("SPOT_NOT_NUMERIC");
    expect(seen).toContain("AWAITING_FIRST_PRINT");
  });

  it("× THE HIDDEN CROSS-SYMBOL PRICE: identity outranks any statement about the number", () => {
    expect(
      classifyOptionSpot({ symbol: "TSLA", spot: { symbol: "NVDA", price: Number.NaN } }),
    ).toBe("SPOT_IS_ANOTHER_SYMBOL");
    const said = optionSpotReason("SPOT_IS_ANOTHER_SYMBOL", "TSLA", "nvda");
    expect(said).toContain("NVDA");
    expect(said).toContain("TSLA");
  });

  it("symbol matching is case- and whitespace-insensitive, as identity is upstream", () => {
    expect(
      classifyOptionSpot({ symbol: " tsla ", spot: { symbol: "TSLA", price: 420.5 } }),
    ).toBe("OBSERVED");
  });

  it("× `> 0` IS NOT isFinite: a corrupt quote is a feed fault, not an unprinted one", () => {
    expect(
      classifyOptionSpot({ symbol: "TSLA", spot: { symbol: "TSLA", price: Number.POSITIVE_INFINITY } }),
    ).toBe("SPOT_NOT_NUMERIC");
    expect(
      classifyOptionSpot({ symbol: "TSLA", spot: { symbol: "TSLA", price: "420" } }),
    ).toBe("SPOT_NOT_NUMERIC");
  });

  it("an observed spot is formatted only where it is known finite", () => {
    const f = optionSpotFact("OBSERVED", 420.5, "TSLA", "TSLA");
    expect(f.text).toBe("420.50");
    expect(f.measured).toBe(true);
  });

  it("a non-finite price can never be formatted, even if the state says OBSERVED", () => {
    const f = optionSpotFact("OBSERVED", Number.NaN, "TSLA", "TSLA");
    expect(f.measured).toBe(false);
    expect(f.text).not.toMatch(/NaN/);
  });
});

describe("every cell is honest about itself", () => {
  it("× THE BARE GLYPH: no fact text is a dash, empty, or a lone glyph", () => {
    const texts = [
      ...ALL_CELL.flatMap(s => [
        strikeCellFact(s, "call", 420, "TSLA").text,
        strikeCellFact(s, "put", 420, "TSLA").text,
      ]),
      ...ALL_SPOT.map(s => optionSpotFact(s, 420.5, "TSLA", "TSLA").text),
    ];
    for (const t of texts) {
      expect(t).not.toBe("—");
      expect(t).not.toBe("-");
      expect(t).not.toBe("");
      expect(t.trim().length).toBeGreaterThan(2);
    }
  });

  it("× THE RESTATED DASH: every reason is a sentence, not a restatement of the label", () => {
    for (const s of ALL_CELL) {
      const f = strikeCellFact(s, "call", 420, "TSLA");
      expect(f.reason.length).toBeGreaterThan(80);
      expect(f.reason).not.toBe(f.text);
      expect(f.reason).toMatch(/\.$/);
    }
    for (const s of ALL_SPOT) {
      const f = optionSpotFact(s, 420.5, "TSLA", "TSLA");
      expect(f.reason.length).toBeGreaterThan(60);
      expect(f.reason).not.toBe(f.text);
    }
  });

  it("× THE FABRICATED HALT: no refusal may claim the strike or symbol is not trading", () => {
    const strip = (s: string) =>
      s
        .replace(/not about whether[^.]*\./gi, "")
        .replace(/not a statement about[^.]*\./gi, "")
        .replace(/not an absence of trading[^.]*\./gi, "");
    for (const s of ALL_CELL) {
      expect(strip(strikeCellReason(s, "call", 420, "TSLA"))).not.toMatch(
        /\bis not trading\b|\bhalted\b|\bdoes not exist\b/i,
      );
    }
    for (const s of ALL_SPOT) {
      expect(strip(optionSpotReason(s, "TSLA", "TSLA"))).not.toMatch(
        /\bis not trading\b|\bhalted\b/i,
      );
    }
    // The disclaimers the stripper removes must actually BE there — this test
    // cannot be passed by deleting them.
    expect(strikeCellReason("NOT_LISTED", "call", 420, "TSLA")).toMatch(/not about whether/i);
    expect(optionSpotReason("SPOT_NOT_NUMERIC", "TSLA", "TSLA")).toMatch(/not an absence of trading/i);
  });

  it("× THE STALE UNDERLYING: no refusal offers a last-known spot", () => {
    for (const s of ALL_SPOT) {
      expect(optionSpotReason(s, "TSLA", "TSLA")).not.toMatch(/last[- ]known price is/i);
    }
    expect(optionSpotReason("NO_SPOT_RECEIVED", "TSLA", null)).toMatch(/last-known/i);
  });

  it("call and put cells never share a label for a side-specific fact", () => {
    for (const s of ALL_CELL) {
      const c = strikeCellFact(s, "call", 420, "TSLA");
      const p = strikeCellFact(s, "put", 420, "TSLA");
      expect(c.reason).not.toBe(p.reason);
    }
  });
});

describe("OptionsChain page adoption", () => {
  const src = readFileSync(
    join(process.cwd(), "src/components/chart/OptionsChain.tsx"),
    "utf8",
  )
    // Strip block comments and WHOLE-LINE `//` only. Never strip an inline
    // trailing `//`: that truncates a `://` in a URL and blinds the Sentinel.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter(l => !/^\s*\/\//.test(l))
    .join("\n");

  it("× THE DEFECT: the action cells no longer fall through to a bare dash", () => {
    expect(src).not.toMatch(/\}\)\(\)\s*:\s*"—"/);
  });

  it("× THE DEFECT: the Spot cell no longer renders a bare dash", () => {
    expect(src).not.toMatch(/hasObservedSpot\s*\?[^:]*:\s*"—"/);
  });

  it("× THE WORSE LIE: the render no longer passes NaN as WM's clock", () => {
    expect(src).not.toMatch(/optionContractObservationTiming\([^)]*\?\?\s*Number\.NaN\)/);
  });

  it("the page reads the owners rather than re-deciding", () => {
    for (const owner of [
      "classifyOptionSpot",
      "classifyStrikeCell",
      "optionSpotFact",
      "strikeCellFact",
    ]) {
      expect(src).toContain(owner);
    }
  });

  it("every adopted cell carries its reason to both title and aria-label", () => {
    expect(src).toMatch(/spotFact\.reason/);
    expect(src).toMatch(/Fact\.reason/);
  });
});
