/**
 * The chart toolbar's picker — the THIRD symbol catalogue, and the one the
 * trader actually opens.
 *
 * ── Why this file exists, and why no test caught it ─────────────────────────
 *
 * Two atoms on 2026-09-11 made `SymbolSearch` and the shell dialog answer to
 * `symbolAssetClass` through `reconcileSearchCategory`. Both shipped green.
 * Then the live app was opened on /charts and typed into, and the dropdown
 * read:
 *
 *     VX1!   VIX Futures              [Futures]
 *     VIX    CBOE Volatility Index    [ETFs]
 *
 * `VX1!` resolves to `^VIX` in this app — a cash index, not a contract. The
 * correction had landed twice already and could not reach this file, because
 * no test knew this file had a catalogue in it.
 *
 * That is the lesson worth more than the fix: the rule was known, written
 * down, and enforced by a Sentinel. Only LOOKING found the third copy. So the
 * last test below scans the whole repo, and the next catalogue cannot be
 * silent about who owns its badges.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";
import {
  reconcileSearchCategory,
  type SearchCategory,
} from "@/lib/marketData/searchResultCategory";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SRC = join(REPO_ROOT, "src");
const TOOLBAR = "src/components/chart/ChartToolbar.tsx";
const toolbar = readFileSync(join(REPO_ROOT, TOOLBAR), "utf8");

/** Parsed from the shipping file, so this cannot drift from what renders. */
function rawRows(): Map<string, string> {
  const out = new Map<string, string>();
  const re = /\{\s*sym:\s*"([^"]+)",\s*name:\s*"([^"]*)",\s*cat:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(toolbar))) out.set(m[1], m[3]);
  return out;
}

describe("the chart toolbar's badges answer to the class owner", () => {
  it("the parser is not vacuous and sees the real catalogue", () => {
    const rows = rawRows();
    expect(rows.size).toBeGreaterThan(200);
    expect(rows.get("VX1!")).toBe("Futures"); // the CURATOR's opinion, pre-reconciliation
    expect(rows.get("AAPL")).toBe("Stocks");
  });

  it("routes the built-in list through reconcileSearchCategory", () => {
    expect(toolbar).toMatch(/RAW_CHART_SYMBOLS/);
    expect(toolbar).toMatch(/reconcileSearchCategory\(s\.sym/);
  });

  it("OVERRULES the two badges that were MEASURED wrong on the live app", () => {
    const raw = rawRows();
    // A badge may not promise an instrument the chart will not load. `VX1!`
    // charts `^VIX`, so it is not a contract.
    expect(reconcileSearchCategory("VX1!", vocab(raw.get("VX1!")))).toBe("Index");
    // The second row could NOT be fixed by reconciliation, and that is worth
    // writing down. `classifySymbol("VIX")` answers EQUITY — the bare-ticker
    // heuristic cannot know that one is a cash index — so the curator's "ETFs"
    // was accepted as a legal equity refinement and the badge stayed wrong.
    // The owner was not taught a special case; the ROW was wrong. MEASURED:
    // /api/yahoo?sym=VIX is {"error":"No data"} while ^VIX is 15.84, so the
    // row was offered and unchartable. It is now `^VIX`, which the owner
    // classifies correctly without being told anything new.
    expect(classifySymbol("VIX")).toBe("EQUITY");
    expect(raw.has("VIX"), "the unchartable bare-VIX row must stay retired").toBe(false);
    expect(reconcileSearchCategory("^VIX", vocab(raw.get("^VIX")))).toBe("Index");
  });

  it("KEEPS the curator where it is legitimately better informed", () => {
    // `classifySymbol` sees EQUITY for both and cannot see a fund wrapper.
    // That refinement is the one thing a curator is allowed to add.
    expect(classifySymbol("SPY")).toBe("EQUITY");
    expect(reconcileSearchCategory("SPY", "ETF")).toBe("ETF");
    expect(reconcileSearchCategory("QQQ", "ETF")).toBe("ETF");
    // But it may not promote a futures contract into a fund.
    expect(reconcileSearchCategory("GC1!", "ETF")).toBe("Futures");
  });

  it("the filter chips speak the owner's vocabulary, not a second one", () => {
    // The filter compares chip to badge for EQUALITY. A display vocabulary of
    // its own does not look wrong — it silently empties the list.
    const chips = /const SYM_CATS = \[([^\]]+)\]/.exec(toolbar)?.[1] ?? "";
    expect(chips).toMatch(/"Stock"/);
    expect(chips).toMatch(/"ETF"/);
    expect(chips, "VIX and VX1! had nowhere honest to sit").toMatch(/"Index"/);
    expect(chips, "the plural display vocabulary must stay retired").not.toMatch(/"Stocks"|"ETFs"/);
  });
});

describe("the worldwide half asks a vendor that can actually answer", () => {
  it("no longer calls the route that is NOT CONFIGURED in production", () => {
    // MEASURED on the live host: /api/finnhub?type=search answers
    // {"edge":"NOT CONFIGURED","missing":["FINNHUB_KEY"]} for every query, so
    // the footer's "search any symbol worldwide" was false every time it
    // rendered. /api/symbol-search needs no key — Yahoo is its keyless
    // fallback. "No website or provider stops ATH."
    expect(toolbar).not.toMatch(/api\/finnhub\?q=/);
    expect(toolbar).toMatch(/api\/symbol-search\?q=/);
  });

  it("stops swallowing the failure, and stops re-deriving the badge", () => {
    expect(toolbar, "an empty catch re-buries the reason").not.toMatch(
      /catch\s*\{\s*\/\*[^*]*silently fail[^*]*\*\/\s*\}/,
    );
    expect(toolbar).toMatch(/setLiveFailure/);
    expect(
      toolbar,
      "the private vendor-vocabulary ternary must stay deleted — the route " +
        "already reconciled the category, and re-deriving it is how two halves " +
        "of one dropdown start disagreeing",
    ).not.toMatch(/r\.type === "Crypto"/);
  });

  it("says WHICH sentence it is saying, and stops promising reach it lost", () => {
    expect(toolbar).toMatch(/Worldwide search unavailable/);
    expect(toolbar).toMatch(/No built-in symbol matches/);
    expect(toolbar).toMatch(/built-in list only/);
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   The scan that would have found this file on the first atom.
   ════════════════════════════════════════════════════════════════════════════ */

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

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** A hand-typed symbol catalogue: three or more `{sym, ..., cat}` literals. */
const CATALOGUE_ROW = /\{\s*sym:\s*"[^"]+",[^{}]*\bcat:\s*"[A-Z][A-Za-z]*"/g;

describe("a FOURTH symbol catalogue cannot be silent about who owns its badges", () => {
  it("every file that declares one also reconciles it", () => {
    const offenders: string[] = [];
    for (const abs of walkProduction(SRC)) {
      const raw = readFileSync(abs, "utf8");
      const rows = raw.match(CATALOGUE_ROW)?.length ?? 0;
      if (rows < 3) continue;
      // Comments are STRIPPED before the compliance check. Every file in this
      // repo explains itself at length, and this very file names the owner in
      // prose several times — a scan that reads prose would have been
      // satisfied by a docblock and enforced nothing. Proven by REVIVE: the
      // first version of this test did exactly that.
      const code = stripComments(raw);
      if (/reconcileSearchCategory\s*\(/.test(code)) continue;
      offenders.push(`${relative(REPO_ROOT, abs)} (${rows} rows)`);
    }
    expect(
      offenders,
      "These files hand-type a symbol catalogue with category badges but never " +
        "ask `symbolAssetClass` whether the badge is true. That is how `VX1!` " +
        "wore a futures badge on /charts for weeks after the correction landed " +
        "in two other pickers. Route the list through reconcileSearchCategory " +
        "— see curatedSymbolCatalog.ts for the shape.",
    ).toEqual([]);
  });

  it("the scan is not vacuous — it can see the catalogues that DO comply", () => {
    // A repo-wide scan that matches nothing passes for the wrong reason. This
    // asserts the pattern really does find the known catalogues.
    const found = walkProduction(SRC).filter(
      (abs) => (readFileSync(abs, "utf8").match(CATALOGUE_ROW)?.length ?? 0) >= 3,
    ).map((abs) => relative(REPO_ROOT, abs)).sort();
    expect(found).toContain(TOOLBAR);
    expect(found).toContain("src/lib/marketData/curatedSymbolCatalog.ts");
  });
});

/** Normalise the toolbar's plural curator vocabulary the way the file does. */
function vocab(raw: string | undefined): SearchCategory | null {
  const map: Record<string, SearchCategory> = {
    Stocks: "Stock", ETFs: "ETF", Futures: "Futures",
    Crypto: "Crypto", Forex: "Forex", Index: "Index",
  };
  return raw ? map[raw] ?? null : null;
}
