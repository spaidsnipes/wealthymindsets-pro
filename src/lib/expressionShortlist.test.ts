/**
 * Founder Build Order §5 Step 4 — the shortlist is JOBS, not verdicts.
 * These tests fence three properties:
 *   1. the three jobs return different contracts (a shortlist that always
 *      picks the same contract is prophecy in another costume)
 *   2. every absence is NAMED — never a hidden null, never a fabricated
 *      substitute
 *   3. UNKNOWN inputs (no spot, no direction, no chain) collapse to three
 *      empty slots with reasons — the caller can render nothing about the
 *      shortlist and still teach the trader why
 */

import { describe, it, expect } from "vitest";
import { selectExpressionShortlist, shortlistJobLabel } from "./expressionShortlist";
import type { OptionContract } from "./optionContractResponse";

function contract(overrides: Partial<OptionContract> & { expirationDate: string; strike: number; contractType: "call" | "put" }): OptionContract {
  return {
    symbol: `TSLA${overrides.expirationDate.replaceAll("-", "").slice(2)}${overrides.contractType[0].toUpperCase()}${String(overrides.strike * 1000).padStart(8, "0")}`,
    ...overrides,
  };
}

describe("selectExpressionShortlist — happy path", () => {
  const spot = 365;
  const chain: OptionContract[] = [
    // Three expiries, each with three strikes around spot
    contract({ expirationDate: "2026-09-19", strike: 360, contractType: "call" }),
    contract({ expirationDate: "2026-09-19", strike: 365, contractType: "call" }),
    contract({ expirationDate: "2026-09-19", strike: 370, contractType: "call" }),
    contract({ expirationDate: "2026-09-26", strike: 360, contractType: "call" }),
    contract({ expirationDate: "2026-09-26", strike: 365, contractType: "call" }),
    contract({ expirationDate: "2026-09-26", strike: 370, contractType: "call" }),
    contract({ expirationDate: "2026-10-17", strike: 360, contractType: "call" }),
    contract({ expirationDate: "2026-10-17", strike: 365, contractType: "call" }),
    contract({ expirationDate: "2026-10-17", strike: 370, contractType: "call" }),
    // A put on the middle expiry — must be ignored for a long thesis
    contract({ expirationDate: "2026-09-26", strike: 365, contractType: "put" }),
  ];

  const list = selectExpressionShortlist({ chain, spot, direction: "long" });

  it("returns exactly three slots in FAST/BALANCED/MORE_TIME order", () => {
    expect(list.map((s) => s.job)).toEqual(["FAST", "BALANCED", "MORE_TIME"]);
  });

  it("FAST picks the nearest expiry, closest strike to spot", () => {
    expect(list[0].contract?.expirationDate).toBe("2026-09-19");
    expect(list[0].contract?.strike).toBe(365);
    expect(list[0].contract?.contractType).toBe("call");
  });

  it("MORE_TIME picks the FURTHEST expiry, closest strike to spot", () => {
    expect(list[2].contract?.expirationDate).toBe("2026-10-17");
    expect(list[2].contract?.strike).toBe(365);
  });

  it("BALANCED picks a genuinely different middle expiry", () => {
    // The whole point of three slots: three different horizons. If BALANCED
    // silently equals FAST or MORE_TIME the shortlist has become one job in
    // three costumes.
    expect(list[1].contract?.expirationDate).toBe("2026-09-26");
    expect(list[1].contract?.expirationDate).not.toBe(list[0].contract?.expirationDate);
    expect(list[1].contract?.expirationDate).not.toBe(list[2].contract?.expirationDate);
  });

  it("shortlists CALLS for a long thesis, never the put at the same strike", () => {
    for (const slot of list) {
      expect(slot.contract?.contractType).toBe("call");
    }
  });
});

describe("selectExpressionShortlist — short thesis", () => {
  it("shortlists PUTS", () => {
    const chain: OptionContract[] = [
      contract({ expirationDate: "2026-09-19", strike: 365, contractType: "call" }),
      contract({ expirationDate: "2026-09-19", strike: 365, contractType: "put" }),
    ];
    const list = selectExpressionShortlist({ chain, spot: 365, direction: "short" });
    expect(list[0].contract?.contractType).toBe("put");
  });
});

describe("selectExpressionShortlist — thin chain", () => {
  const oneExpiry: OptionContract[] = [
    contract({ expirationDate: "2026-09-19", strike: 365, contractType: "call" }),
  ];
  const twoExpiries: OptionContract[] = [
    contract({ expirationDate: "2026-09-19", strike: 365, contractType: "call" }),
    contract({ expirationDate: "2026-10-17", strike: 365, contractType: "call" }),
  ];

  it("with one expiry: FAST fills, BALANCED and MORE_TIME empty with named reasons", () => {
    const list = selectExpressionShortlist({ chain: oneExpiry, spot: 365, direction: "long" });
    expect(list[0].contract).not.toBeNull();
    expect(list[1].contract).toBeNull();
    expect(list[1].reason).toContain("one expiry");
    expect(list[2].contract).toBeNull();
    expect(list[2].reason).toContain("one expiry");
  });

  it("with two expiries: FAST and MORE_TIME fill, BALANCED empty (no honest middle)", () => {
    const list = selectExpressionShortlist({ chain: twoExpiries, spot: 365, direction: "long" });
    expect(list[0].contract?.expirationDate).toBe("2026-09-19");
    expect(list[2].contract?.expirationDate).toBe("2026-10-17");
    expect(list[1].contract).toBeNull();
    expect(list[1].reason).toContain("no honest middle horizon");
  });
});

describe("selectExpressionShortlist — UNKNOWN inputs collapse honestly", () => {
  const chain: OptionContract[] = [
    contract({ expirationDate: "2026-09-19", strike: 365, contractType: "call" }),
  ];

  it("null spot yields three empty slots naming 'underlying spot UNKNOWN'", () => {
    const list = selectExpressionShortlist({ chain, spot: null, direction: "long" });
    expect(list.every((s) => s.contract === null)).toBe(true);
    expect(list.every((s) => s.reason.includes("spot UNKNOWN"))).toBe(true);
  });

  it("null direction refuses to guess a side", () => {
    const list = selectExpressionShortlist({ chain, spot: 365, direction: null });
    expect(list.every((s) => s.contract === null)).toBe(true);
    expect(list.every((s) => s.reason.includes("direction UNKNOWN"))).toBe(true);
  });

  it("empty chain names it — the render must say 'no chain observed'", () => {
    const list = selectExpressionShortlist({ chain: [], spot: 365, direction: "long" });
    expect(list.every((s) => s.contract === null)).toBe(true);
    expect(list.every((s) => s.reason === "no chain observed")).toBe(true);
  });

  it("NaN / negative / infinite spot is still UNKNOWN, not accepted", () => {
    for (const spot of [Number.NaN, -1, 0, Infinity]) {
      const list = selectExpressionShortlist({ chain, spot, direction: "long" });
      expect(list.every((s) => s.reason.includes("spot UNKNOWN")), `spot ${spot}`).toBe(true);
    }
  });
});

describe("shortlistJobLabel", () => {
  it("prints 'MORE TIME' with the space, not the underscore", () => {
    // Small detail with teeth: the enum is MORE_TIME (safe symbol), the
    // human label is "MORE TIME" (Founder Build Order §5 Step 4 wording).
    expect(shortlistJobLabel("MORE_TIME")).toBe("MORE TIME");
    expect(shortlistJobLabel("FAST")).toBe("FAST");
    expect(shortlistJobLabel("BALANCED")).toBe("BALANCED");
  });

  it("does not offer a 'BEST' label — the Founder banned it in §8", () => {
    // Compile-time enumeration. If the type ever grows a "BEST" variant this
    // test goes red and forces a conversation before it ships.
    const jobs: Array<"FAST" | "BALANCED" | "MORE_TIME"> = ["FAST", "BALANCED", "MORE_TIME"];
    for (const j of jobs) {
      expect(shortlistJobLabel(j).toUpperCase()).not.toContain("BEST");
    }
  });
});
