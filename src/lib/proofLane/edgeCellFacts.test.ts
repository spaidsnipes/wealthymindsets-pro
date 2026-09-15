import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cumulativeRFact,
  expectancyFact,
  formatR,
  maxDrawdownFact,
  rTone,
  winLossLineFact,
} from "./edgeCellFacts";
import { selectSessionEdge, type EdgeEntry } from "./selectSessionEdge";

function entry(over: Partial<EdgeEntry>): EdgeEntry {
  return {
    date: "2026-09-15",
    result: "win",
    processQuality: "UNRESOLVED",
    ...over,
  };
}

describe("rTone — a zero is not a gain", () => {
  it("× THE SIGNED ZERO: exactly zero is FLAT, never GAIN", () => {
    expect(rTone(0)).toBe("FLAT");
    expect(rTone(-0)).toBe("FLAT");
    expect(rTone(0.0001)).toBe("GAIN");
    expect(rTone(-0.0001)).toBe("LOSS");
  });

  it("× THE ABSENT READING: a non-number is NONE, never LOSS", () => {
    for (const v of [undefined, null, Number.NaN, "1.2", {}]) {
      expect(rTone(v)).toBe("NONE");
    }
  });

  it("formatR earns its plus sign", () => {
    expect(formatR(1.4)).toBe("+1.40R");
    expect(formatR(-0.75)).toBe("-0.75R");
    expect(formatR(0)).toBe("0.00R");
  });
});

describe("cumulativeRFact — a flat session is not a green one", () => {
  it("× THE FABRICATED PROFIT: a flat session must not render +0.00R in a gain tone", () => {
    const f = cumulativeRFact(0, 2);
    expect(f.text).toBe("0.00R");
    expect(f.text).not.toContain("+");
    expect(f.tone).toBe("FLAT");
    expect(f.measured).toBe(true);
    expect(f.reason).toMatch(/MEASUREMENT of flat/i);
  });

  it("a real gain and a real loss keep their sign and their tone", () => {
    expect(cumulativeRFact(2.5, 3).tone).toBe("GAIN");
    expect(cumulativeRFact(2.5, 3).text).toBe("+2.50R");
    expect(cumulativeRFact(-1.25, 3).tone).toBe("LOSS");
    expect(cumulativeRFact(-1.25, 3).text).toBe("-1.25R");
  });

  it("× THE UNSTATED SCOPE: every arm says entries without R are not counted", () => {
    for (const v of [0, 2.5, -1.25]) {
      expect(cumulativeRFact(v, 3).reason).toMatch(/without R are not counted/i);
    }
  });
});

describe("expectancyFact — an unknown expectancy is not a losing one", () => {
  it("× THE RED UNKNOWN: a missing expectancy must not carry a LOSS tone", () => {
    const f = expectancyFact(undefined, 0);
    expect(f.tone).toBe("NONE");
    expect(f.measured).toBe(false);
    expect(f.text).not.toBe("—");
    expect(f.reason).toMatch(/ABSENCE of a measurement/i);
    expect(f.reason).toMatch(/NOT a negative one/i);
  });

  it("× THE SIGNED ZERO, AGAIN: a zero expectancy is FLAT", () => {
    const f = expectancyFact(0, 4);
    expect(f.tone).toBe("FLAT");
    expect(f.text).toBe("0.00R");
  });

  it("× THE SILENT SAMPLE: a real expectancy always prints what it averaged over", () => {
    expect(expectancyFact(1.1, 3).reason).toMatch(/3 R-tagged entries/);
    expect(expectancyFact(1.1, 1).reason).toMatch(/1 R-tagged entry/);
    expect(expectancyFact(1.1, 3).reason).toMatch(/not an edge it can vouch for/i);
  });
});

describe("maxDrawdownFact — a scope unstated is a scope assumed", () => {
  it("× THE ACCOUNT DRAWDOWN: the figure must deny being an account or brokerage number", () => {
    const f = maxDrawdownFact(1.8, 5);
    expect(f.reason).toMatch(/NOT an account drawdown/i);
    expect(f.reason).toMatch(/NOT a brokerage figure/i);
    expect(f.reason).toMatch(/outside this browser/i);
  });

  it("× ZERO IS A READING HERE, NOT AN ABSENCE: 0.00R with entries is measured", () => {
    const f = maxDrawdownFact(0, 3);
    expect(f.measured).toBe(true);
    expect(f.text).toBe("0.00R");
    expect(f.reason).toMatch(/No trough formed/i);
  });

  it("× BUT ZERO WITH NO PATH IS AN ABSENCE: no R-tagged entries is not a drawdown of zero", () => {
    const f = maxDrawdownFact(0, 0);
    expect(f.measured).toBe(false);
    expect(f.tone).toBe("NONE");
    expect(f.reason).toMatch(/not a drawdown of zero/i);
  });
});

describe("winLossLineFact — two populations must not wear one sentence", () => {
  it("× THE INFERRED DENOMINATOR: a differing R sample must be named on the line itself", () => {
    const f = winLossLineFact("win", 5, 2, 1.4);
    expect(f.text).toContain("5 winners graded");
    expect(f.text).toContain("over 2 with R");
    expect(f.reason).toMatch(/DIFFERENT DENOMINATORS/);
    expect(f.reason).toMatch(/over the 2, NOT the 5/);
  });

  it("× THE VANISHED AVERAGE: winners with no R must SAY so, not render nothing", () => {
    const f = winLossLineFact("win", 3, 0, undefined);
    expect(f.measured).toBe(false);
    expect(f.tone).toBe("NONE");
    expect(f.text).toContain("3 winners graded");
    expect(f.text).toMatch(/no R-tagged winner to average/);
    expect(f.reason).toMatch(/cannot be questioned by the reader/i);
  });

  it("even a matching denominator warns the two can diverge", () => {
    const f = winLossLineFact("loss", 2, 2, -0.8);
    expect(f.text).toContain("avg -0.80R over 2 with R");
    expect(f.reason).toMatch(/diverge on the next entry/i);
  });

  it("× THE GRADE/ARITHMETIC CONFLATION: a grade is never allowed to stand in for R", () => {
    expect(winLossLineFact("win", 5, 2, 1.4).reason).toMatch(
      /will not let one stand in for the other/i,
    );
  });
});

describe("selectSessionEdge carries the denominator it used to discard", () => {
  it("× THE LOST DENOMINATOR: rWinnerSampleSize is the population avgWinnerR averaged", () => {
    const edge = selectSessionEdge([
      entry({ result: "win", realizedR: 2 }),
      entry({ result: "win", realizedR: 1 }),
      entry({ result: "win" }),
      entry({ result: "win" }),
      entry({ result: "win" }),
    ]);
    expect(edge.winners).toBe(5);
    expect(edge.rWinnerSampleSize).toBe(2);
    expect(edge.avgWinnerR).toBe(1.5);
    // The exact defect: 1.5 is the average of TWO, while the count says FIVE.
    expect(edge.rWinnerSampleSize).not.toBe(edge.winners);
  });

  it("× THE DISAGREEMENT: a trade graded win with negative R lands in the loser sample", () => {
    const edge = selectSessionEdge([entry({ result: "win", realizedR: -0.2 })]);
    expect(edge.winners).toBe(1);
    expect(edge.rWinnerSampleSize).toBe(0);
    expect(edge.rLoserSampleSize).toBe(1);
  });
});

describe("/proof-lane adoption", () => {
  const code = readFileSync(
    join(process.cwd(), "src/app/proof-lane/page.tsx"),
    "utf8",
  );

  it("× THE SIGNED ZERO ON SCREEN: no cell may derive its sign or colour from >= 0", () => {
    expect(code).not.toContain('cumulativeR >= 0 ? "+" : ""');
    expect(code).not.toContain('measured.cumulativeR >= 0 ? "text-emerald-300" : "text-rose-300"');
    expect(code).not.toContain('measured.expectancyR >= 0 ? "+" : ""');
  });

  it("× THE RED UNKNOWN ON SCREEN: colour must come from a tone, not a nullish number", () => {
    expect(code).not.toContain("measured.expectancyR != null && measured.expectancyR >= 0");
    expect(code).toContain("toneClass");
  });

  it("× THE VANISHED AVERAGE ON SCREEN: the bare && that deleted the clause is gone", () => {
    expect(code).not.toContain("measured.avgWinnerR != null && (");
    expect(code).not.toContain("measured.avgLoserR != null && (");
    expect(code).toContain("winLossLineFact");
  });

  it("the four owners are the only source of these cells", () => {
    expect(code).toContain("cumulativeRFact");
    expect(code).toContain("expectancyFact");
    expect(code).toContain("maxDrawdownFact");
    expect(code).toContain("rWinnerSampleSize");
    expect(code).toContain("rLoserSampleSize");
  });

  it("× THE SILENT TOOLTIP: every adopted cell carries its reason", () => {
    for (const name of ["cumulativeFact", "expectancyCell", "drawdownFact", "winLine", "lossLine"]) {
      expect(code).toMatch(new RegExp(`${name}\\.reason`));
    }
  });
});
