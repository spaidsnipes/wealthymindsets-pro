/**
 * "Buyer effort is being absorbed" is one of the most consequential sentences
 * this product can print. It tells a trader that the side they can SEE pressing
 * is losing to a side they cannot see. This suite exists so that sentence
 * cannot be produced cheaply.
 *
 * Four ways it could be produced cheaply, each forbidden below:
 *
 *   · from a balanced tape, where nobody is pressing at all
 *   · from a move measured in ticks, so the same half-dollar is a finding on
 *     one instrument and noise on the next
 *   · from tick-rule guesses wearing the same chrome as venue-stamped sides
 *   · from an empty window, by calling zero effort "absorbed"
 */

import { describe, it, expect } from "vitest";
import {
  selectAbsorption,
  ABSORPTION_VERSION,
  PRESSING_IMBALANCE_THRESHOLD,
  ABSORBED_DISPLACEMENT_SPREADS,
} from "./selectAbsorption";
import type { AggressorTick } from "../selectAggressorFlow";

/** A venue-stamped print — the strongest evidence class this tape carries. */
const tick = (
  price: number,
  size: number,
  side: "buy" | "sell",
  method: string = "PROVIDER",
): AggressorTick => ({
  price,
  size,
  side,
  trade: true,
  marketEvent: { aggressorMethod: method as never },
});

/** Repeat a print n times. */
const many = (n: number, price: number, size: number, side: "buy" | "sell") =>
  Array.from({ length: n }, () => tick(price, size, side));

describe("selectAbsorption — it refuses before it reports", () => {
  it("is UNMEASURED with no tape at all", () => {
    for (const input of [null, undefined, [] as AggressorTick[]]) {
      const vm = selectAbsorption(input);
      expect(vm.verdict).toBe("UNMEASURED");
      expect(vm.pressingSide).toBeNull();
      expect(vm.efficiency).toBeNull();
      expect(vm.detail.length).toBeGreaterThan(10);
    }
  });

  it("is UNMEASURED when the prints carry no aggressor side", () => {
    // A tape of real prints with no sides is not a balanced tape. It is a tape
    // that cannot answer the question, and saying BALANCED would be a finding
    // we have no evidence for.
    const unsided: AggressorTick[] = Array.from({ length: 30 }, (_, i) => ({
      price: 100 + i * 0.01,
      size: 10,
      trade: true,
    }));
    expect(selectAbsorption(unsided).verdict).toBe("UNMEASURED");
  });

  it("ignores anything that is not a trade print", () => {
    // Quotes carry a price and a size and are not executions. Counting them as
    // effort would manufacture pressure out of an order book.
    const quotes: AggressorTick[] = [
      { price: 100, size: 500, side: "buy" },
      { price: 100, size: 500, side: "buy", trade: false },
    ];
    expect(selectAbsorption(quotes).verdict).toBe("UNMEASURED");
  });

  it("is BALANCED — not ABSORBED — when neither side is pressing", () => {
    // The cheap version of this module would see "lots of buying, no move" in
    // any flat tape. Half the buying is selling; nobody is pressing; there is
    // no effort on the table.
    const even = [...many(20, 100, 10, "buy"), ...many(20, 100.01, 10, "sell")];
    const vm = selectAbsorption(even);
    expect(vm.verdict).toBe("BALANCED");
    expect(vm.pressingSide).toBeNull();
    expect(vm.imbalance).toBeLessThan(PRESSING_IMBALANCE_THRESHOLD);
    expect(vm.detail).toContain("pressing");
  });
});

describe("selectAbsorption — the verdict follows effort AND response", () => {
  it("calls ABSORBED when buyers press and price does not travel", () => {
    const ticks = [
      ...many(40, 100.0, 50, "buy"),
      ...many(4, 100.01, 10, "sell"),
      tick(100.0, 20, "buy"),
    ];
    const vm = selectAbsorption(ticks);
    expect(vm.verdict).toBe("ABSORBED");
    expect(vm.pressingSide).toBe("BUYERS");
    expect(vm.netEffort).toBeGreaterThan(0);
    expect(vm.detail).toContain("Buyers");
  });

  it("calls ABSORBED when sellers press and price does not fall", () => {
    const ticks = [
      ...many(40, 100.0, 50, "sell"),
      ...many(4, 100.01, 10, "buy"),
      tick(100.0, 20, "sell"),
    ];
    const vm = selectAbsorption(ticks);
    expect(vm.verdict).toBe("ABSORBED");
    expect(vm.pressingSide).toBe("SELLERS");
    expect(vm.netEffort).toBeLessThan(0);
  });

  it("calls EFFICIENT when the pressing side is paid in its own direction", () => {
    const ticks = Array.from({ length: 40 }, (_, i) => tick(100 + i * 0.05, 50, "buy"));
    const vm = selectAbsorption(ticks);
    expect(vm.verdict).toBe("EFFICIENT");
    expect(vm.pressingSide).toBe("BUYERS");
    expect(vm.displacement!).toBeGreaterThan(0);
  });

  it("calls ABSORBED — never EFFICIENT — when price moves AGAINST the pressure", () => {
    // Heavy buying and price ends lower is the strongest form of the finding,
    // and a magnitude-only implementation would report it as an efficient move.
    const ticks = Array.from({ length: 40 }, (_, i) => tick(102 - i * 0.05, 50, "buy"));
    const vm = selectAbsorption(ticks);
    expect(vm.displacement!).toBeLessThan(0);
    expect(vm.netEffort).toBeGreaterThan(0);
    expect(vm.verdict).toBe("ABSORBED");
  });

  it("calls ABSORBED when every print landed at one price under heavy pressure", () => {
    // No spread to measure travel against, because there was no travel. The
    // purest absorption a tape can show must not fall through to BALANCED.
    const vm = selectAbsorption(many(50, 100, 100, "buy"));
    expect(vm.verdict).toBe("ABSORBED");
    expect(vm.displacementInSpread).toBeNull();
  });
});

describe("selectAbsorption — the move is measured against the window's own scale", () => {
  it("reads the SAME price move differently in a quiet and a loud window", () => {
    // This is the test that fails on any implementation using ticks, cents or
    // percent. A 0.4 travel is a real move in a window whose prints all sit
    // within a few cents, and nothing at all in one that has been swinging
    // dollars.
    const quiet = selectAbsorption([
      ...Array.from({ length: 40 }, (_, i) => tick(100 + i * 0.01, 50, "buy")),
    ]);
    const loud = selectAbsorption([
      ...Array.from({ length: 20 }, (_, i) => tick(100 + i * 0.4, 50, "buy")),
      ...Array.from({ length: 19 }, (_, i) => tick(108 - i * 0.4, 50, "buy")),
      tick(100.4, 50, "buy"),
    ]);
    expect(quiet.verdict).toBe("EFFICIENT");
    expect(loud.displacement!).toBeCloseTo(0.4, 2);
    expect(loud.verdict).toBe("ABSORBED");
    expect(ABSORBED_DISPLACEMENT_SPREADS).toBeGreaterThan(0);
  });

  it("publishes displacement in spreads, not only in price", () => {
    const vm = selectAbsorption(
      Array.from({ length: 40 }, (_, i) => tick(100 + i * 0.05, 50, "buy")),
    );
    expect(vm.displacement).not.toBeNull();
    expect(vm.displacementInSpread).not.toBeNull();
    expect(Math.abs(vm.displacementInSpread!)).toBeGreaterThan(ABSORBED_DISPLACEMENT_SPREADS);
  });

  it("gives an efficiency ratio only when there is net effort to divide by", () => {
    const pressed = selectAbsorption(
      Array.from({ length: 40 }, (_, i) => tick(100 + i * 0.05, 50, "buy")),
    );
    expect(pressed.efficiency).not.toBeNull();
    expect(pressed.efficiency!).toBeGreaterThan(0);

    const parity = selectAbsorption([
      ...many(10, 100, 10, "buy"),
      ...many(10, 100.5, 10, "sell"),
    ]);
    expect(parity.netEffort).toBe(0);
    expect(parity.efficiency).toBeNull();
  });

  it("does not round the efficiency ratio away on a real-scale tape", () => {
    // WRITTEN BECAUSE A RENDERED PANEL PRINTED "0.00e+0". A cent of travel
    // against twenty thousand shares is about 4e-7. Any fixed-decimal rounding
    // reports that as zero — and a zero has also thrown away the SIGN, so the
    // panel said price went nowhere when it had in fact gone DOWN under buying,
    // which is the strongest form of this module's finding.
    const ticks = [
      ...many(300, 100.05, 70, "buy"),
      ...many(60, 100.05, 70, "sell"),
      tick(100.04, 70, "buy"),
    ];
    const vm = selectAbsorption(ticks);
    expect(vm.displacement!).toBeLessThan(0);
    expect(vm.efficiency).not.toBeNull();
    expect(vm.efficiency).not.toBe(0);
    expect(vm.efficiency!).toBeLessThan(0);
  });
});

describe("selectAbsorption — it carries the provenance of the sides it used", () => {
  it("demands no disclosure only when every side came from the venue", () => {
    const vm = selectAbsorption(many(40, 100, 50, "buy"));
    expect(vm.provenance).toBe("PROVIDER");
    expect(vm.requiresDisclosure).toBe(false);
  });

  it("flags a tick-rule tape for disclosure even though the math is identical", () => {
    // Same prints, same verdict, weaker evidence. The numbers do not change;
    // what a surface is allowed to imply with them does.
    const provider = selectAbsorption(many(40, 100, 50, "buy"));
    const inferred = selectAbsorption(
      Array.from({ length: 40 }, () => tick(100, 50, "buy", "TICK_RULE")),
    );
    expect(inferred.verdict).toBe(provider.verdict);
    expect(inferred.netEffort).toBe(provider.netEffort);
    expect(inferred.provenance).toBe("INFERRED");
    expect(inferred.requiresDisclosure).toBe(true);
  });

  it("does not let one venue-stamped print launder a tape of guesses", () => {
    const mixed = selectAbsorption([
      tick(100, 50, "buy", "PROVIDER"),
      ...Array.from({ length: 40 }, () => tick(100, 50, "buy", "TICK_RULE")),
    ]);
    expect(mixed.provenance).toBe("MIXED");
    expect(mixed.requiresDisclosure).toBe(true);
  });
});

describe("selectAbsorption — shape", () => {
  it("is versioned and pure", () => {
    const ticks = [...many(20, 100, 50, "buy"), ...many(3, 100.02, 10, "sell")];
    expect(selectAbsorption(ticks).version).toBe(ABSORPTION_VERSION);
    expect(selectAbsorption(ticks)).toEqual(selectAbsorption(ticks));
  });

  it("never ships an empty detail, and keeps imbalance inside 0..1", () => {
    const cases: Array<AggressorTick[] | null> = [
      null,
      many(5, 100, 1, "buy"),
      [...many(5, 100, 1, "buy"), ...many(5, 100, 1, "sell")],
      Array.from({ length: 30 }, (_, i) => tick(100 + i * 0.03, 7, i % 3 === 0 ? "sell" : "buy")),
    ];
    for (const c of cases) {
      const vm = selectAbsorption(c);
      expect(vm.detail.length).toBeGreaterThan(0);
      expect(vm.imbalance).toBeGreaterThanOrEqual(0);
      expect(vm.imbalance).toBeLessThanOrEqual(1);
    }
  });
});
