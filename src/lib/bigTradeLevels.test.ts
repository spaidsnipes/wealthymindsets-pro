import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  bigTradeLevelKey,
  computeBigTradeLevels,
  minBigTradeLot,
  type BigTradeTick,
} from "./bigTradeLevels";

/**
 * Big-trade bubble level ownership — the Big Trade half of the §13 gate.
 *
 * The headline defect these tests exist for: every print was rounded for
 * display (`toFixed(base > 100 ? 2 : 4)`) and the ROUNDED value then served as
 * the level's identity — the pick map key and the `bt:<time>:<price>` spawn
 * key. Two distinct block trades that round the same became one key, the
 * second overwrote the first, and its size was not merged anywhere. The bubble
 * never spawned and the trade vanished off the chart silently.
 *
 * See deltaBubbleLevels.ts for the same defect, one function earlier.
 */

const tick = (price: number, bid: number, ask: number): BigTradeTick => ({ price, bid, ask });

describe("minBigTradeLot — the lot floor by price magnitude", () => {
  it("scales down as the instrument's price scales up", () => {
    expect(minBigTradeLot(60_000)).toBe(0.15);   // BTC
    expect(minBigTradeLot(21_750)).toBe(0.15);
    expect(minBigTradeLot(150)).toBe(2);         // equities
    expect(minBigTradeLot(3_000)).toBe(2);       // ETH
    expect(minBigTradeLot(5)).toBe(0.03);
    expect(minBigTradeLot(0.16)).toBe(0.001);    // DOGE
  });

  it("is exclusive at every boundary, so a boundary price takes the lower tier", () => {
    expect(minBigTradeLot(10_000)).toBe(2);
    expect(minBigTradeLot(100)).toBe(0.03);
    expect(minBigTradeLot(1)).toBe(0.001);
  });
});

describe("THE DEFECT: two prints that round alike are two levels, not one", () => {
  it("keeps both BTC prints that collapse to the same 2 decimals", () => {
    // base > 100, so the old code did toFixed(2): both became "60123.45".
    const levels = computeBigTradeLevels([
      tick(60_123.4512, 0, 3),
      tick(60_123.4587, 4, 0),
    ], 60_000);

    expect(
      levels.length,
      "these are two separate block trades on opposite sides. Rounding them " +
      "to a shared key dropped one of them with no indication.",
    ).toBe(2);
    expect(levels.map((l) => l.priceLevel).sort((a, z) => a - z))
      .toEqual([60_123.4512, 60_123.4587]);
  });

  it("conserves the full size of both — the loser was overwritten, never merged", () => {
    const levels = computeBigTradeLevels([
      tick(60_123.4512, 0, 3),
      tick(60_123.4587, 4, 0),
    ], 60_000);
    expect(levels.reduce((s, l) => s + l.total, 0)).toBe(7);
  });

  it("keeps both sub-penny equity prints that collapse to the same cent", () => {
    const levels = computeBigTradeLevels([
      tick(150.0012, 0, 40),
      tick(150.0049, 30, 0),
    ], 150);
    expect(levels.length).toBe(2);
  });

  it("keeps both DOGE prints that collapse to the same 4 decimals", () => {
    // base <= 100 took toFixed(4); DOGE prints far finer than that.
    const levels = computeBigTradeLevels([
      tick(0.162345, 0, 0.01),
      tick(0.162389, 0.02, 0),
    ], 0.16);
    expect(levels.length).toBe(2);
  });
});

describe("the price a bubble claims is the price that printed", () => {
  it("reports the tick price verbatim — no display rounding at this layer", () => {
    const [level] = computeBigTradeLevels([tick(60_123.456789, 0, 5)], 60_000);
    expect(
      level!.priceLevel,
      "rounding is a label concern. A bubble that says a trade happened at " +
      "60123.46 when it happened at 60123.456789 is stating something false " +
      "about the tape.",
    ).toBe(60_123.456789);
  });
});

describe("bigTradeLevelKey — identity is exact by construction", () => {
  it("gives distinct keys to distinct prints in the same bar", () => {
    const a = { priceLevel: 60_123.4512, bid: 0, ask: 3, total: 3 };
    const z = { priceLevel: 60_123.4587, bid: 4, ask: 0, total: 4 };
    expect(bigTradeLevelKey(1_700_000_000, a)).not.toBe(bigTradeLevelKey(1_700_000_000, z));
  });

  it("gives the same key to the same print, so a bubble cannot spawn twice", () => {
    const a = { priceLevel: 60_123.4512, bid: 0, ask: 3, total: 3 };
    expect(bigTradeLevelKey(1_700_000_000, a)).toBe(bigTradeLevelKey(1_700_000_000, { ...a }));
  });

  it("scopes the key to the bar, so the same price in the next bar is a new bubble", () => {
    const a = { priceLevel: 60_123.4512, bid: 0, ask: 3, total: 3 };
    expect(bigTradeLevelKey(1_700_000_000, a)).not.toBe(bigTradeLevelKey(1_700_000_060, a));
  });
});

describe("selection — the lot floor and the ranking", () => {
  it("drops prints below the lot floor for the instrument", () => {
    const levels = computeBigTradeLevels([tick(150, 0, 1.9), tick(151, 0, 5)], 150);
    expect(levels.map((l) => l.priceLevel)).toEqual([151]);
  });

  it("returns nothing when no print clears the floor", () => {
    expect(computeBigTradeLevels([tick(150, 0, 0.5)], 150)).toEqual([]);
  });

  it("returns nothing for an empty or absent tape", () => {
    expect(computeBigTradeLevels([], 150)).toEqual([]);
    // Real callers build this array from a Map, but the guard is cheap and the
    // component previously had no test at all between the tape and the screen.
    expect(computeBigTradeLevels(undefined as never, 150)).toEqual([]);
  });

  it("ignores non-finite prices rather than anchoring a bubble at NaN", () => {
    const levels = computeBigTradeLevels([tick(Number.NaN, 0, 50), tick(150, 0, 50)], 150);
    expect(levels.map((l) => l.priceLevel)).toEqual([150]);
  });

  it("draws only the prints that stand out — the threshold is 1.35x the bar mean", () => {
    // 100 and 95 clear 1.35 x mean(68.3) = 92.25; the 10 does not. A bar's own
    // average is the yardstick, so this works on any instrument without an
    // absolute lot target.
    const levels = computeBigTradeLevels([
      tick(150, 0, 10), tick(151, 0, 95), tick(152, 0, 100),
    ], 150);
    expect(levels.map((l) => l.total)).toEqual([100, 95]);
  });

  it("shows ONLY the reserved leaders on a flat bar where nothing stands out", () => {
    // Every print the same size → nothing is 1.35x the mean → no threshold
    // picks at all. This is deliberate: a bar with no standout print should
    // not manufacture eight bubbles to look busy. The leaders still show so
    // the bar is not silent.
    const levels = computeBigTradeLevels([
      tick(150, 0, 50), tick(151, 0, 50), tick(152, 50, 0),
    ], 150);
    expect(levels.length).toBe(2);
    expect(levels.some((l) => l.ask > l.bid)).toBe(true);
    expect(levels.some((l) => l.bid > l.ask)).toBe(true);
  });

  it("breaks ties on price ascending, so identical input yields identical bubbles", () => {
    const input = [
      tick(152, 0, 100), tick(150, 0, 100), tick(151, 0, 100),
      ...Array.from({ length: 9 }, (_, i) => tick(160 + i, 0, 5)),
    ];
    const a = computeBigTradeLevels(input, 150).map((l) => l.priceLevel);
    const z = computeBigTradeLevels([...input].reverse(), 150).map((l) => l.priceLevel);
    expect(
      a,
      "the renderer spawns from this list; a reordering would look like new " +
      "prints arriving on a bar where nothing changed",
    ).toEqual(z);
    expect(a.slice(0, 3)).toEqual([150, 151, 152]);
  });

  it("a bar can produce at most 6 bubbles — 5 standouts plus the sell leader", () => {
    // MEASURED, not assumed, and the measurement is worth recording because it
    // is smaller than the code reads. The trailing `.slice(0, 8)` looks like
    // the ceiling, but the threshold pass is already capped at 5 and the BUY
    // leader is by definition the heaviest buy, so it is always inside that 5
    // and never adds a slot. Only the sell leader can be outside it. The real
    // ceiling is therefore 6, and 8 is slack. Both numbers are now visible to
    // anyone who changes either.
    const input = [
      // Five standout buys.
      ...Array.from({ length: 5 }, (_, i) => tick(150 + i, 0, 100)),
      // A lone small sell — above its own lot floor, below the bar threshold,
      // so it can only arrive via the reserved slot.
      tick(160, 3, 0),
      // Filler that drags the mean down far enough for the five to clear.
      ...Array.from({ length: 20 }, (_, i) => tick(170 + i, 0, 3)),
    ];
    const levels = computeBigTradeLevels(input, 150);
    expect(levels.length).toBe(6);
    expect(levels.filter((l) => l.bid > l.ask).length).toBe(1);
  });
});

describe("both sides are always represented on an active bar", () => {
  it("reserves a slot for the sell leader on an overwhelmingly one-sided bar", () => {
    // Five heavy buys plus one lone seller. Ranked purely by size the seller
    // loses every time — which is exactly why it needs a reserved slot. On a
    // one-sided bar that lone opposing print IS the absorption evidence.
    const input = [
      tick(150, 0, 500), tick(151, 0, 480), tick(152, 0, 460),
      tick(153, 0, 440), tick(154, 0, 420),
      tick(155, 3, 0),
    ];
    const levels = computeBigTradeLevels(input, 150);
    expect(levels.some((l) => l.bid > l.ask)).toBe(true);
  });

  it("does not invent a sell bubble when nothing sold", () => {
    const levels = computeBigTradeLevels([tick(150, 0, 500), tick(151, 0, 480)], 150);
    expect(levels.every((l) => l.ask >= l.bid)).toBe(true);
  });

  it("requires the leader to clear the floor ON ITS OWN SIDE, not in total", () => {
    // 1.9 sold + 0.5 bought clears the lot floor of 2 in total, but a 0.5-lot
    // buy is not this bar's buy leader.
    const levels = computeBigTradeLevels([tick(150, 1.9, 0.5)], 150);
    expect(levels.every((l) => l.bid > l.ask)).toBe(true);
  });
});

describe("MainChart delegates instead of re-typing the ranking", () => {
  const chart = readFileSync(
    resolve(__dirname, "../components/chart/MainChart.tsx"),
    "utf8",
  ).replace(/\s+/g, " ");

  it("gets its big-trade levels from the shared owner", () => {
    expect(chart).toMatch(/return computeBigTradeLevels\(ticks, base\)/);
  });

  it("builds the spawn identity through the owner, never from a rounded price", () => {
    expect(chart).toMatch(/const spawnKey = bigTradeLevelKey\(c\.time as number, lv\)/);
    expect(
      chart,
      "a display-rounded price used as a spawn key is the defect this atom " +
      "removed — it merged separate block trades into one bubble",
    ).not.toMatch(/`bt:\$\{c\.time\}:\$\{lv\.priceLevel\}`/);
  });

  it("does not round the print before ranking it", () => {
    expect(
      chart,
      "toFixed on the price at this layer reintroduces the collision",
    ).not.toMatch(/priceLevel: \+Number\(px\)\.toFixed\(dp\)/);
  });
});
