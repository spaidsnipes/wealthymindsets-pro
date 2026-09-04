/**
 * chartOrderContractCoverage — the SCOPE LIMIT of the /paper point-value fix,
 * stated out loud so it cannot be mistaken for coverage it does not have.
 *
 * What was fixed (paperContractMultiplier.test.ts): /paper settled its five
 * CME futures at 1x on every money line. That is closed, and a Sentinel
 * cross-checks /paper's UNIVERSE against CONTRACT_MULTIPLIERS so a SIXTH
 * contract added to /paper cannot quietly reintroduce it.
 *
 * What that Sentinel CANNOT see, and this file makes visible:
 *
 *   placeChartMarketOrder(symbol: string, ...) takes an ARBITRARY symbol —
 *   whatever the chart is currently displaying — not one of /paper's sixteen.
 *   The chart's own catalog (SymbolSearch LOCAL_SYMBOLS) carries FIFTEEN
 *   futures. Five have a point value. Ten do not, and would settle 1:1.
 *
 * Why this is a named blocker rather than a bug fix today:
 *
 *   placeChartMarketOrder has ZERO production callers. The one-click chart
 *   BUY/SELL path it was written for is not wired to anything, so no trader
 *   can currently route a Dow or Silver order into the paper ledger. The
 *   defect is unreachable, not absent.
 *
 * Why the gap is NOT closed here by adding ten more table entries:
 *
 *   Every value in CONTRACT_MULTIPLIERS is a published CME contract
 *   specification, and a WRONG point value is strictly worse than a missing
 *   one — 1x is visibly, obviously too small, while a plausible-looking wrong
 *   multiplier reads as authoritative. Silver is 5,000 troy oz, copper is
 *   25,000 lbs, the treasuries quote in 32nds, the FX contracts are each a
 *   different notional. Those are lookups against the exchange, not
 *   inferences from a ticker, and they are not being guessed here.
 *   Additionally: /paper does not trade these, so adding them would break the
 *   companion Sentinel that forbids table entries for symbols the universe
 *   does not carry. Coverage has to arrive WITH the surface that needs it.
 *
 * This test therefore pins the CURRENT honest state. It goes red when:
 *   - someone wires placeChartMarketOrder into production (the gap becomes
 *     live and the ten symbols must be specified before that ships), or
 *   - the chart catalog gains or loses a futures contract, or
 *   - one of the ten gains a point value (retire it from the list).
 *
 * Any of those is a human-reads-this event, which is the whole point.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contractMultiplier } from "./paperTrade";

const REPO_ROOT = resolve(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "src");
const CATALOG = "src/components/ui/SymbolSearch.tsx";
const ORDER_MODULE = "src/lib/paperTrade.ts";

function walkProduction(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
      out.push(...walkProduction(p));
      continue;
    }
    if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** Bare-identifier match, so a point-free adoption still counts as a consumer. */
function referencingFiles(sym: string, exclude: readonly string[]): string[] {
  const hits: string[] = [];
  for (const abs of walkProduction(SRC)) {
    const rel = relative(REPO_ROOT, abs);
    if (exclude.includes(rel)) continue;
    const body = readFileSync(abs, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    if (new RegExp(`\\b${sym}\\b`).test(body)) hits.push(rel);
  }
  return hits.sort();
}

/**
 * Every futures contract the chart can display, as [symbol, label].
 *
 * Read from the catalog's own `cat:"Futures"` classification rather than from
 * a list kept here, so a contract added to the chart is picked up by what it
 * IS. Key order is not assumed — the /paper guard was blinded by exactly that
 * assumption during a revive-attempt.
 */
function chartFutures(): [string, string][] {
  const src = readFileSync(join(REPO_ROOT, CATALOG), "utf8");
  return [...src.matchAll(/\{([^{}]*\bcat\s*:\s*"Futures"[^{}]*)\}/g)]
    .map((m) => {
      const sym = /\bsym\s*:\s*"([^"]+)"/.exec(m[1]);
      const label = /\blabel\s*:\s*"([^"]+)"/.exec(m[1]);
      return [sym ? sym[1] : "", label ? label[1] : ""] as [string, string];
    })
    .filter(([sym]) => sym !== "");
}

describe("chart order path — contract coverage", () => {
  it("the catalog parser is not vacuous and sees the real futures list", () => {
    const futures = chartFutures();
    expect(futures.length).toBeGreaterThanOrEqual(15);

    const syms = futures.map((f) => f[0]);
    expect(syms).toContain("NQ1!"); // covered
    expect(syms).toContain("YM1!"); // NOT covered — both halves must be visible

    // Classification below is by symbol, but the message a human reads is the
    // label. A contract parsed without one means the parser degraded.
    expect(futures.filter(([, label]) => label === "").map(([s]) => s)).toEqual([]);
  });

  it("the five /paper contracts really are covered", () => {
    // Positive control. If contractMultiplier stopped resolving anything, the
    // blocker list below would swell and read as a much bigger gap than exists.
    for (const s of ["NQ1!", "ES1!", "RTY1!", "GC1!", "CL1!"]) {
      expect(contractMultiplier(s), `${s} lost its point value`).toBeGreaterThan(1);
    }
  });

  it("BLOCKER: placeChartMarketOrder has zero production callers", () => {
    // This is the ONLY reason the coverage gap below is inert. If this fails,
    // the chart order path went live: the ten contracts named in the next test
    // must be given real CME specifications BEFORE that ships, or a trader can
    // route a Dow/Silver/Treasury order that settles at 1:1.
    expect(referencingFiles("placeChartMarketOrder", [ORDER_MODULE])).toEqual([]);
  });

  it("BLOCKER: ten chart futures have no point value — pinned, not hidden", () => {
    const uncovered = chartFutures()
      .filter(([sym]) => contractMultiplier(sym) === 1)
      .map(([sym, label]) => `${sym} (${label})`);

    // Pinned EXACTLY rather than counted. A count would let one contract be
    // swapped for another silently; the exact list forces a human to re-read.
    expect(
      uncovered,
      "Chart futures with no entry in CONTRACT_MULTIPLIERS. Inert only while " +
        "placeChartMarketOrder stays unwired (asserted above). Look up the real " +
        "CME specification before covering any of these — a wrong point value " +
        "is worse than a missing one, because 1x is obviously wrong and a " +
        "plausible wrong number is not.",
    ).toEqual([
      "YM1! (Dow Jones Futures)",
      "SI1! (Silver Futures)",
      "HG1! (Copper Futures)",
      "ZB1! (30-Year T-Bond Futures)",
      "ZN1! (10-Year T-Note Futures)",
      "6E1! (Euro Futures)",
      "6J1! (Yen Futures)",
      "6B1! (British Pound Futures)",
      "VX1! (VIX Futures)",
      "NG1! (Natural Gas Futures)",
    ]);
  });
});
