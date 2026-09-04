/**
 * paperContractMultiplier — /paper settled futures at 1x, so a trader
 * practising position sizing read risk that was wrong by up to 1000x.
 *
 * The defect, stated exactly:
 *
 *   /paper's UNIVERSE carries five CME futures (NQ1! ES1! RTY1! GC1! CL1!)
 *   next to equities, ETFs and spot crypto. Every money path multiplied
 *   quantity by PRICE and stopped there:
 *
 *     applyFill    cashDelta = -signedQty * fillPx
 *     applyFill    realized  = closeQty * (fillPx - avgPx) * sign
 *     /paper       unrealPnl = (mark - avgPx) * qty
 *     /paper       equity    = cash + SUM(qty * marketPx)
 *     fill loop    selectOrderRejection called with no multiplier
 *
 *   A 10-point move on one NQ contract is worth $200. It rendered as $10.
 *   A $1.00 move on one CL contract is worth $1,000. It rendered as $1.
 *
 * Why this is the dangerous direction rather than a cosmetic rounding gap:
 * canon weakness #9 is PAPER-FILL OVERCONFIDENCE, and the stated reason paper
 * exists is that "position sizing is the habit paper trading exists to build".
 * Understating loss by 20x-1000x is the most confident possible way to teach
 * the wrong habit. The options path already applied OPT_MULTIPLIER correctly;
 * futures were simply never given a point value. This is H-Bkt 5 — "Journal
 * missing contract-type multiplier, option trades computed 100x too low" —
 * one surface over.
 *
 * The last test is the one that matters after today. A fix to five hardcoded
 * symbols decays the moment somebody adds a sixth contract to the universe, so
 * the universe itself is cross-checked against the multiplier table: adding a
 * futures symbol without a point value fails the suite instead of the trader.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyFill,
  contractMultiplier,
  CONTRACT_MULTIPLIERS,
  type Order,
  type Position,
} from "./paperTrade";

const REPO_ROOT = resolve(__dirname, "..", "..");
const PAPER_PAGE = join(REPO_ROOT, "src/app/paper/page.tsx");

const ord = (symbol: string, side: "buy" | "sell", qty: number): Order => ({
  id: "o1", symbol, side, type: "market", qty, status: "filled", ts: 0,
});

describe("contract point value", () => {
  it("carries the real CME specification, not a guess", () => {
    expect(contractMultiplier("NQ1!")).toBe(20);      // E-mini Nasdaq-100
    expect(contractMultiplier("ES1!")).toBe(50);      // E-mini S&P 500
    expect(contractMultiplier("RTY1!")).toBe(50);     // E-mini Russell 2000
    expect(contractMultiplier("GC1!")).toBe(100);     // 100 troy oz
    expect(contractMultiplier("CL1!")).toBe(1_000);   // 1,000 barrels
  });

  it("leaves shares, ETFs and spot crypto at 1x", () => {
    for (const s of ["AAPL", "TSLA", "NVDA", "SPY", "QQQ", "BTC", "ETH"]) {
      expect(contractMultiplier(s), `${s} must settle 1:1`).toBe(1);
    }
  });

  it("an unknown symbol is 1x rather than throwing", () => {
    expect(contractMultiplier("")).toBe(1);
    expect(contractMultiplier("NOT_A_SYMBOL")).toBe(1);
  });
});

describe("realized P&L carries the point value", () => {
  it("a 10-point NQ win is $200, not $10", () => {
    const open = applyFill([], ord("NQ1!", "buy", 1), 21_750, 20);
    const close = applyFill(open.positions, ord("NQ1!", "sell", 1), 21_760, 20);
    expect(close.realized).toBe(200);
    expect(close.trade.pnl).toBe(200);
  });

  it("a $1.00 crude win is $1,000 — the 1000x case", () => {
    const open = applyFill([], ord("CL1!", "buy", 1), 78.00, 1_000);
    const close = applyFill(open.positions, ord("CL1!", "sell", 1), 79.00, 1_000);
    expect(close.realized).toBe(1_000);
  });

  it("scales a LOSS by the same factor — this is the point", () => {
    // The habit paper trading exists to build. A 10-point adverse NQ move is
    // $200 of real damage; at 1x it read as $10 and taught the wrong size.
    const open = applyFill([], ord("NQ1!", "buy", 1), 21_750, 20);
    const close = applyFill(open.positions, ord("NQ1!", "sell", 1), 21_740, 20);
    expect(close.realized).toBe(-200);
  });

  it("scales a short's P&L too", () => {
    const open = applyFill([], ord("ES1!", "sell", 2), 5_870, 50);
    const close = applyFill(open.positions, ord("ES1!", "buy", 2), 5_860, 50);
    // Short 2 ES, covered 10 points lower: 2 x 10 x $50.
    expect(close.realized).toBe(1_000);
  });

  it("equities are byte-identical to the pre-fix behaviour", () => {
    // The 18-branch state matrix in paperTrade.test.ts calls applyFill with
    // three arguments. If the default drifted off 1 every one of those
    // expectations would silently change meaning.
    const withDefault = applyFill([], ord("AAPL", "buy", 10), 226);
    const explicit1x = applyFill([], ord("AAPL", "buy", 10), 226, 1);
    expect(withDefault.cashDelta).toBe(-2_260);
    expect(withDefault.cashDelta).toBe(explicit1x.cashDelta);
  });
});

describe("cash moves at notional", () => {
  it("buying one NQ debits $435,000, not $21,750", () => {
    expect(applyFill([], ord("NQ1!", "buy", 1), 21_750, 20).cashDelta).toBe(-435_000);
  });

  it("selling credits at the same scale", () => {
    expect(applyFill([], ord("NQ1!", "sell", 1), 21_750, 20).cashDelta).toBe(435_000);
  });

  it("a bad multiplier falls back to 1x instead of producing NaN money", () => {
    for (const bad of [Number.NaN, Infinity, 0, -20]) {
      const r = applyFill([], ord("NQ1!", "buy", 1), 21_750, bad);
      expect(Number.isFinite(r.cashDelta), `multiplier ${bad} produced non-finite cash`).toBe(true);
      expect(r.cashDelta).toBe(-21_750);
    }
  });
});

describe("avgPx stays a quoted price", () => {
  it("the position records the price, never the notional", () => {
    // The blotter renders avgPx/marketPx to the trader. If the multiplier
    // leaked into them the screen would disagree with the tape.
    const r = applyFill([], ord("NQ1!", "buy", 1), 21_750, 20);
    const pos = r.positions[0] as Position;
    expect(pos.avgPx).toBe(21_750);
    expect(pos.marketPx).toBe(21_750);
    expect(r.trade.px).toBe(21_750);
  });
});

describe("the /paper surface applies it on every money line", () => {
  const page = readFileSync(PAPER_PAGE, "utf8");

  it("fills route through the adapter, which derives it from ord.symbol", () => {
    expect(page).toContain("applyFillShared(positions, ord, fillPx, contractMultiplier(ord.symbol))");
  });

  it("the buying-power gate is funded at notional", () => {
    expect(page).toContain("const mult = contractMultiplier(ord.symbol);");
    expect(page).toContain("multiplier: mult,");
    expect(page).toContain("cashRunning -= ord.qty * fillPx * mult;");
  });

  it("unrealized P&L and the equity curve both carry it", () => {
    expect(page).toContain("* contractMultiplier(pos.symbol)");
    expect(page).toContain("p.qty*p.marketPx*contractMultiplier(p.symbol)");
  });
});

/**
 * The durable half. Everything above pins five symbols that are correct today;
 * this pins the RULE, so a sixth contract cannot quietly reintroduce the bug.
 */
describe("BLOCKER-GUARD: the universe cannot outgrow the multiplier table", () => {
  const page = readFileSync(PAPER_PAGE, "utf8");

  /**
   * Parse UNIVERSE into [symbol, humanName] pairs straight from the source.
   *
   * Key order is NOT assumed. An earlier draft matched `"SYM": { name: "..."`
   * and a revive-attempt proved that brittle: reordering the object keys to
   * `{ base, name, tick }` — exactly what an editor key-sort does — made all
   * five futures invisible, and the "every derivative has a point value" test
   * then passed GREEN while CL1! genuinely had no point value. So the symbol
   * and the name are matched independently, in two steps.
   */
  function universeEntries(): [string, string][] {
    const block = /const UNIVERSE[^{]*\{([\s\S]*?)\n\};/.exec(page);
    expect(block, "UNIVERSE literal not found — this guard cannot run").toBeTruthy();
    return [...block![1].matchAll(/"([^"]+)"\s*:\s*\{([^}]*)\}/g)].map((m) => {
      const name = /\bname\s*:\s*"([^"]+)"/.exec(m[2]);
      return [m[1], name ? name[1] : ""] as [string, string];
    });
  }

  it("the parser is not vacuous and sees the real universe", () => {
    const entries = universeEntries();
    expect(entries.length).toBeGreaterThanOrEqual(16);
    expect(entries.map((e) => e[0])).toContain("NQ1!");
    expect(entries.map((e) => e[0])).toContain("AAPL");

    // Classification below is BY NAME, so an entry parsed without one would be
    // waved through as "not a derivative" rather than flagged. A nameless
    // entry means the parser degraded, not that the universe is clean.
    expect(entries.filter(([, name]) => name === "").map(([sym]) => sym)).toEqual([]);
  });

  it("every derivative in the universe has a point value", () => {
    // Classified by the page's own human-readable name, so a new contract is
    // caught by what it IS rather than by a list this test would have to be
    // told about. Crude Oil is named without the word "Futures", which is
    // exactly the kind of gap a naive suffix check would wave through.
    const DERIVATIVE = /futures|crude oil/i;
    const missing = universeEntries()
      .filter(([, name]) => DERIVATIVE.test(name))
      .filter(([sym]) => contractMultiplier(sym) === 1)
      .map(([sym, name]) => `${sym} (${name})`);

    expect(
      missing,
      `Futures in /paper's UNIVERSE with no entry in CONTRACT_MULTIPLIERS. ` +
      `At 1x their P&L, cash and buying power are all understated by the ` +
      `contract's point value. Add the CME specification to ` +
      `CONTRACT_MULTIPLIERS in src/lib/paperTrade.ts.`,
    ).toEqual([]);
  });

  it("the table names no symbol the universe does not trade", () => {
    // The opposite drift: a stale entry for a delisted contract reads as
    // coverage that no longer applies to anything.
    const universe = new Set(universeEntries().map(([sym]) => sym));
    const orphaned = Object.keys(CONTRACT_MULTIPLIERS).filter((s) => !universe.has(s));
    expect(orphaned).toEqual([]);
  });
});
