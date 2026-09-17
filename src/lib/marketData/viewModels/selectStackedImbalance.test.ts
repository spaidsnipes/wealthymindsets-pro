/**
 * These tests are written against the four ways this reading can be
 * manufactured, because those are the only ways it can be wrong in a way that
 * still looks right on a screen:
 *
 *   1. choosing the level size until stacks appear
 *   2. grading the stack with the prints that built it
 *   3. awarding an untested stack the same badge as a defended one
 *   4. letting a run of nearly-empty levels outvote a real one
 *
 * Plus the disclosure: this module reads `side`, so unlike its neighbour it
 * owes one on every tape, and no caller may switch that off.
 */

import { describe, it, expect } from "vitest";
import {
  selectStackedImbalance,
  observeTickSize,
  STACKED_IMBALANCE_VERSION,
  STACK_MIN_PRINTS,
  MIN_STACK_LEVELS,
  IMBALANCE_RATIO_PCT,
} from "./selectStackedImbalance";
import type { AggressorTick } from "../selectAggressorFlow";

type Method = "PROVIDER" | "TICK_RULE";

function px(base: number, tick: number, k: number): number {
  return Number((base + k * tick).toPrecision(12));
}

function prints(
  price: number,
  side: "buy" | "sell",
  sizeEach: number,
  count: number,
  method: Method = "PROVIDER",
): AggressorTick[] {
  return Array.from({ length: count }, () => ({
    price,
    size: sizeEach,
    side,
    trade: true,
    marketEvent: { aggressorMethod: method as never },
  }));
}

/**
 * A ladder with heavy one-way buying stacked on the top three levels and
 * nothing meaningful opposing it on the diagonal below. Offsets 3, 4 and 5 are
 * the stack; 0, 1 and 2 are ordinary two-sided trade underneath it.
 */
function formation(base: number, tick: number, method: Method = "PROVIDER"): AggressorTick[] {
  const p = (k: number) => px(base, tick, k);
  return [
    ...prints(p(0), "buy", 25, 2, method),
    ...prints(p(0), "sell", 25, 2, method),
    ...prints(p(1), "buy", 25, 2, method),
    ...prints(p(1), "sell", 25, 2, method),
    ...prints(p(2), "buy", 30, 2, method),
    ...prints(p(2), "sell", 50, 4, method),
    ...prints(p(3), "buy", 150, 6, method),
    ...prints(p(3), "sell", 25, 4, method),
    ...prints(p(4), "buy", 150, 6, method),
    ...prints(p(4), "sell", 25, 4, method),
    ...prints(p(5), "buy", 150, 6, method),
    ...prints(p(5), "sell", 25, 2, method),
  ];
}

/**
 * Exactly as many response prints as the module's declared 60/40 split will
 * put on the response side of a formation of length `n` — computed rather than
 * hardcoded, so the fixture cannot silently drift away from the split.
 */
function respond(
  n: number,
  base: number,
  tick: number,
  path: readonly number[],
  method: Method = "PROVIDER",
): AggressorTick[] {
  const count = Math.round((n * 2) / 3);
  return Array.from({ length: count }, (_, i) => ({
    price: px(base, tick, path[i % path.length]),
    size: 40,
    side: (i % 2 === 0 ? "buy" : "sell") as "buy" | "sell",
    trade: true,
    marketEvent: { aggressorMethod: method as never },
  }));
}

function tape(
  base: number,
  tick: number,
  path: readonly number[],
  method: Method = "PROVIDER",
): AggressorTick[] {
  const f = formation(base, tick, method);
  return [...f, ...respond(f.length, base, tick, path, method)];
}

/** Response shapes, in offsets from `base`. The stack sits at offsets 3–5. */
const CAME_BACK_AND_HELD = [4, 3, 6, 7];
const ONE_TICK_THROUGH = [4, 2, 5, 3];
const TORE_THROUGH = [4, 2, -1, 0];
const NEVER_RETURNED = [7, 8, 9, 10];

describe("selectStackedImbalance — it refuses before it reports", () => {
  it("says so when there is no tape at all", () => {
    for (const empty of [null, undefined, []]) {
      const vm = selectStackedImbalance(empty);
      expect(vm.verdict).toBe("UNMEASURED");
      expect(vm.levels).toEqual([]);
      expect(vm.detail.length).toBeGreaterThan(0);
    }
  });

  it("names how short the tape was rather than reporting on it", () => {
    const vm = selectStackedImbalance(prints(100, "buy", 10, 12));
    expect(vm.verdict).toBe("UNMEASURED");
    expect(vm.detail).toContain("12");
    expect(vm.detail).toContain(String(STACK_MIN_PRINTS));
  });

  it("will not read a ladder from a tape with no sides", () => {
    // Every print is real and none of them says who paid. A diagonal
    // imbalance is a statement about the aggressor, so this is not a thin
    // reading — it is no reading.
    const sideless: AggressorTick[] = Array.from({ length: 80 }, (_, i) => ({
      price: 100 + (i % 6) * 0.01,
      size: 100,
      trade: true,
    }));
    expect(selectStackedImbalance(sideless).verdict).toBe("UNMEASURED");
  });

  it("will not read a ladder from quotes", () => {
    const quotes = formation(100, 0.01).map((t) => ({ ...t, trade: false }));
    expect(selectStackedImbalance(quotes).verdict).toBe("UNMEASURED");
  });

  it("will not read a ladder when every print landed at one price", () => {
    const flat = [...prints(100, "buy", 10, 40), ...prints(100, "sell", 10, 40)];
    const vm = selectStackedImbalance(flat);
    expect(vm.verdict).toBe("UNMEASURED");
    expect(vm.detail).toContain("one price");
  });

  it("reports NO_STACK, not UNMEASURED, when it read the tape and found nothing", () => {
    // A read that found nothing is a result. Reporting it as a failure to read
    // is how a working module gets blamed for a quiet market.
    const balanced: AggressorTick[] = [];
    for (let k = 0; k < 8; k++) {
      balanced.push(...prints(px(100, 0.01, k), "buy", 100, 4));
      balanced.push(...prints(px(100, 0.01, k), "sell", 100, 4));
    }
    const vm = selectStackedImbalance(balanced);
    expect(vm.verdict).toBe("NO_STACK");
    expect(vm.levels).toEqual([]);
    expect(vm.tickSize).toBeCloseTo(0.01, 10);
    expect(vm.detail.length).toBeGreaterThan(0);
  });
});

describe("selectStackedImbalance — the ladder is measured, not assumed", () => {
  it("reads the tape's own price grid", () => {
    expect(observeTickSize([10, 10.01, 10.02, 10.03])).toBeCloseTo(0.01, 10);
    expect(observeTickSize([10, 10.25, 10.5, 10.75])).toBeCloseTo(0.25, 10);
    expect(observeTickSize([1.0001, 1.0002, 1.0003])).toBeCloseTo(0.0001, 10);
  });

  it("is not shattered by a single off-grid print", () => {
    // ONE artefact must not redefine the whole ladder. If the smallest gap
    // always won, a single bad print would split the tape into levels nothing
    // traded on, and every stack would vanish. A real grid repeats itself; an
    // artefact does not.
    expect(observeTickSize([10, 10.25, 10.2501, 10.5, 10.75])).toBeCloseTo(0.25, 10);
  });

  it("has nothing to say about a single price", () => {
    expect(observeTickSize([10])).toBeNull();
    expect(observeTickSize([10, 10, 10])).toBeNull();
    expect(observeTickSize([])).toBeNull();
  });

  it("reports the grid it used, so the reading can be argued with", () => {
    const vm = selectStackedImbalance(tape(100, 0.01, CAME_BACK_AND_HELD));
    expect(vm.tickSize).toBeCloseTo(0.01, 10);
  });

  it("reads a $2,000 quarter-tick instrument the same way it reads a penny one", () => {
    // The fixture is the same SHAPE at two scales. If the verdict or the stack
    // depth changes, some constant in this module is secretly denominated in
    // dollars, which would make it right on exactly one instrument.
    const cheap = selectStackedImbalance(tape(100, 0.01, TORE_THROUGH));
    const dear = selectStackedImbalance(tape(2000, 0.25, TORE_THROUGH));
    expect(cheap.verdict).toBe(dear.verdict);
    expect(cheap.direction).toBe(dear.direction);
    expect(cheap.levels.length).toBe(dear.levels.length);
    expect(cheap.beyondInSpreads).toBeCloseTo(dear.beyondInSpreads!, 6);
  });
});

describe("selectStackedImbalance — the claim and its test are separate evidence", () => {
  it("splits the window and accounts for every print it accepted", () => {
    const t = tape(100, 0.01, CAME_BACK_AND_HELD);
    const vm = selectStackedImbalance(t);
    expect(vm.formationPrints).toBe(42);
    expect(vm.responsePrints).toBe(28);
    expect(vm.formationPrints + vm.responsePrints).toBe(t.length);
  });

  it("finds the stack the formation actually contains", () => {
    const vm = selectStackedImbalance(tape(100, 0.01, CAME_BACK_AND_HELD));
    expect(vm.direction).toBe("BUY");
    expect(vm.levels.length).toBe(MIN_STACK_LEVELS);
    expect(vm.stackLow).toBeCloseTo(100.03, 6);
    expect(vm.stackHigh).toBeCloseTo(100.05, 6);
    for (const l of vm.levels) expect(l.ratio).toBeGreaterThanOrEqual(IMBALANCE_RATIO_PCT);
  });

  it("returns a different verdict for the same stack under a different response", () => {
    // The formation bytes are IDENTICAL across these three. Everything that
    // differs is what happened afterwards, which is the entire point of the
    // module: the stack is the claim, not the finding.
    const held = selectStackedImbalance(tape(100, 0.01, CAME_BACK_AND_HELD));
    const broke = selectStackedImbalance(tape(100, 0.01, TORE_THROUGH));
    const away = selectStackedImbalance(tape(100, 0.01, NEVER_RETURNED));
    expect(held.verdict).toBe("DEFENDED");
    expect(broke.verdict).toBe("BROKEN");
    expect(away.verdict).toBe("UNTESTED");
    expect(held.levels).toEqual(broke.levels);
    expect(held.levels).toEqual(away.levels);
  });

  it("measures how far past the edge price got in the window's own scale", () => {
    const broke = selectStackedImbalance(tape(100, 0.01, TORE_THROUGH));
    expect(broke.beyondInSpreads!).toBeGreaterThan(0);
    expect(broke.retestedTo).toBeCloseTo(99.99, 6);
    const held = selectStackedImbalance(tape(100, 0.01, CAME_BACK_AND_HELD));
    // It came into the stack and stopped exactly at the far edge: zero beyond.
    expect(held.beyondInSpreads!).toBeLessThanOrEqual(0);
  });
});

describe("selectStackedImbalance — an untested stack has proven nothing", () => {
  it("does not award a badge to a level price never came back to", () => {
    const vm = selectStackedImbalance(tape(100, 0.01, NEVER_RETURNED));
    expect(vm.verdict).toBe("UNTESTED");
    expect(vm.retestedTo).toBeNull();
    expect(vm.beyondInSpreads).toBeNull();
    expect(vm.detail).toContain("proven nothing");
  });

  it("does not call a defended level broken because of a one-tick wick", () => {
    // Price traded exactly one tick past the far edge and came back. Calling
    // that a break would mean no level in any market has ever held, which is a
    // reading that cannot be wrong and therefore says nothing.
    const vm = selectStackedImbalance(tape(100, 0.01, ONE_TICK_THROUGH));
    expect(vm.verdict).toBe("DEFENDED");
    expect(vm.retestedTo).toBeCloseTo(100.02, 6);
  });
});

describe("selectStackedImbalance — empty levels are not conviction", () => {
  it("will not let a run of nearly-empty levels outvote a real stack", () => {
    // Four levels of two lots each, with nothing at all on their diagonals, so
    // each one scores as a maximum one-sided imbalance. On length alone they
    // beat the genuine three-level stack below them. They are also, in plain
    // terms, a price range nobody traded — and a reading that prefers them has
    // learned to find its strongest signals in the emptiest part of the tape.
    const base = 100;
    const tick = 0.01;
    const f = [
      ...formation(base, tick),
      ...prints(px(base, tick, 6), "buy", 2, 1),
      ...prints(px(base, tick, 7), "buy", 2, 1),
      ...prints(px(base, tick, 8), "buy", 2, 1),
      ...prints(px(base, tick, 9), "buy", 2, 1),
      ...prints(px(base, tick, 10), "buy", 2, 1),
    ];
    const vm = selectStackedImbalance([
      ...f,
      ...respond(f.length, base, tick, CAME_BACK_AND_HELD),
    ]);
    expect(vm.levels.length).toBe(3);
    expect(vm.stackLow).toBeCloseTo(100.03, 6);
    expect(vm.stackHigh).toBeCloseTo(100.05, 6);
  });

  it("marks a genuinely one-sided level rather than inventing a ratio for it", () => {
    const vm = selectStackedImbalance(tape(100, 0.01, CAME_BACK_AND_HELD));
    for (const l of vm.levels) {
      if (l.opposingVolume === 0) expect(l.oneSided).toBe(true);
      else expect(l.oneSided).toBe(false);
      expect(l.dominantVolume).toBeGreaterThan(0);
    }
  });
});

describe("selectStackedImbalance — it discloses the evidence it used", () => {
  it("demands disclosure on every tape, because it always reads side", () => {
    // Its neighbour `selectLiquidityWeather` sets this false and proves it by
    // never touching `side`. This module cannot: a diagonal imbalance IS an
    // aggressor claim. A caller must not be able to turn that off.
    for (const m of ["PROVIDER", "TICK_RULE"] as const) {
      const vm = selectStackedImbalance(tape(100, 0.01, CAME_BACK_AND_HELD, m));
      expect(vm.requiresDisclosure).toBe(true);
    }
    expect(selectStackedImbalance(null).requiresDisclosure).toBe(true);
    expect(selectStackedImbalance(prints(100, "buy", 1, 3)).requiresDisclosure).toBe(true);
  });

  it("carries the provenance of the sides it leaned on", () => {
    const stamped = selectStackedImbalance(tape(100, 0.01, CAME_BACK_AND_HELD, "PROVIDER"));
    const inferred = selectStackedImbalance(tape(100, 0.01, CAME_BACK_AND_HELD, "TICK_RULE"));
    expect(stamped.provenance).toBe("PROVIDER");
    expect(inferred.provenance).toBe("INFERRED");
    // Same numbers, different standing. The reading does not get quieter on an
    // inferred tape — it gets a label, and the panel is what must act on it.
    expect(inferred.verdict).toBe(stamped.verdict);
  });
});

describe("selectStackedImbalance — shape", () => {
  it("is versioned and pure", () => {
    const t = tape(100, 0.01, TORE_THROUGH);
    expect(selectStackedImbalance(t).version).toBe(STACKED_IMBALANCE_VERSION);
    expect(selectStackedImbalance(t)).toEqual(selectStackedImbalance(t));
  });

  it("never ships an empty detail, in any state", () => {
    const cases = [
      null,
      prints(100, "buy", 1, 5),
      tape(100, 0.01, CAME_BACK_AND_HELD),
      tape(100, 0.01, TORE_THROUGH),
      tape(100, 0.01, NEVER_RETURNED),
    ];
    for (const c of cases) {
      const vm = selectStackedImbalance(c);
      expect(vm.detail.trim().length).toBeGreaterThan(0);
      expect(vm.detail).not.toContain("undefined");
      expect(vm.detail).not.toContain("NaN");
    }
  });

  it("keeps a stack's extent consistent with the levels it shipped", () => {
    const vm = selectStackedImbalance(tape(100, 0.01, TORE_THROUGH));
    const lows = vm.levels.map((l) => l.price);
    expect(vm.stackLow).toBeCloseTo(Math.min(...lows), 10);
    expect(vm.stackHigh).toBeCloseTo(Math.max(...lows), 10);
  });
});
