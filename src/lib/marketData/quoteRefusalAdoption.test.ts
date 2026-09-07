/**
 * A REFUSAL MUST NOT DISAPPEAR — enforced across every surface, not intended.
 *
 * `yahooQuoteObserved` is the SF-D01 gate. It is correct and it stays. But it
 * returns a boolean, so on its own it destroys the reason the endpoint had
 * already computed — and each surface then invented its own way to say
 * nothing:
 *
 *   TickerTape  refused row rendered "quote pending"  -> a delay that never ends
 *   scanner     refused row dropped from the results  -> a count with no denominator
 *
 * Both measured on 2026-09-07 against the SAME provider answer:
 *   /api/yahoo?sym=NQ1!&type=quote -> price 29565.25, resolution UNKNOWN,
 *   "a day/meta close must not be presented as a live observation."
 *
 * The rule: a surface that consults the gate must also consult
 * `yahooQuoteRefusal`, the one owner of WHY, and must put the answer where
 * the trader can reach it. Otherwise WM makes a decision on his behalf and
 * hides it.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

/** Every non-test source file, walked rather than remembered. */
function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(tsx|ts)$/.test(entry.name)) continue;
      if (entry.name.includes(".test.")) continue;
      found.push(path.relative(SRC, full));
    }
  };
  walk(SRC);
  return found.sort();
}

/**
 * Files that consult the SF-D01 gate — by EITHER function. `yahooQuoteRefusal`
 * is the strictly-more-informative sibling: non-null exactly when the boolean
 * would say no AND a provider actually answered, an equivalence pinned by the
 * PARTITION test in yahooQuoteObserved.test.ts. A file that reads only the
 * reason has consulted the gate and kept more of it, not less.
 */
function gateConsumers(): string[] {
  return sourceFiles().filter((rel) => {
    // The owner defines the gate; it does not consume it.
    if (rel === path.join("lib", "marketData", "yahooQuoteObserved.ts")) return false;
    return /yahooQuote(Observed|Refusal)\(/.test(read(rel));
  });
}

/**
 * Files that ASK `/api/yahoo` for a quote. This is the set that matters, and
 * it is not the same set as the one above — that was the hole this file
 * originally had. The first version of this Sentinel enumerated gate CALLERS
 * and required each to carry the reason, which is a real rule but an
 * unfalsifiable one: a surface that reads the endpoint and never asks the gate
 * at all was not enumerated, so it passed by saying nothing.
 *
 * `useWebSocket.ts` was exactly that file. It fetched
 * /api/yahoo?type=quote, read `observation` ONLY to decide whether to stamp a
 * timestamp, and returned the price regardless — so `29565.25` reached
 * `state.ticker.price` and rendered in the chart header while the strip beside
 * it read DATA UNAVAILABLE. It passed every test in this file.
 */
function yahooQuoteReaders(): string[] {
  return sourceFiles().filter((rel) => {
    if (rel.startsWith(path.join("app", "api") + path.sep)) return false; // the endpoints themselves
    if (rel === path.join("lib", "marketData", "yahooQuoteObserved.ts")) return false;
    return /\/api\/yahoo\?[^`'"]*type=quote/.test(read(rel));
  });
}

/**
 * Readers that do NOT yet consult the gate. This list may only SHRINK.
 *
 * It is written down rather than skipped because an unlisted gap is an
 * invisible one: each of these renders an /api/yahoo price with no SF-D01
 * check, which is the same "fake-fresh" defect MainChart had, on a surface
 * that has not been fixed yet. Naming them converts an unknown into a queue.
 */
const UNGATED_DEBT = [
  "app/paper/page.tsx",
  "components/chart/MainChart.tsx",
  "components/chart/StockInfoPanel.tsx",
  "components/chart/WatchlistPanel.tsx",
].sort();

describe("SF-D01 refusal — every gate consumer also carries the reason", () => {
  it("finds the consumers it is meant to protect", () => {
    // A guard on the guard: if the search silently matched nothing, every
    // assertion below would pass vacuously.
    const consumers = gateConsumers();
    expect(consumers.length).toBeGreaterThan(0);
    expect(consumers).toContain("components/layout/TickerTape.tsx");
    expect(consumers).toContain("app/scanner/page.tsx");
    expect(consumers).toContain("hooks/useWebSocket.ts");
  });

  it.each(gateConsumers())("%s reads WHY, not only WHETHER", (rel) => {
    const src = read(rel);
    expect(src, `${rel} must import the one owner of the reason`).toContain("yahooQuoteRefusal");
    expect(src, `${rel} must actually call it`).toMatch(/yahooQuoteRefusal\(/);
  });
});

describe("SF-D01 — asking Yahoo for a quote obliges you to consult the gate", () => {
  it("finds the readers it is meant to police", () => {
    const readers = yahooQuoteReaders();
    expect(readers.length).toBeGreaterThan(0);
    expect(readers).toContain("hooks/useWebSocket.ts");
  });

  it("the un-gated debt is exactly what is written down — and may only shrink", () => {
    const ungated = yahooQuoteReaders().filter((rel) => !/yahooQuote(Observed|Refusal)\(/.test(read(rel)));
    // A NEW un-gated reader fails here rather than shipping silently. A FIXED
    // one fails too, with the instruction to delete its line — so the debt
    // list can never quietly grow back after being paid down.
    expect(ungated.sort()).toEqual(UNGATED_DEBT);
  });
});

describe("chart quote — a refused price is retracted, not relabelled", () => {
  const HOOK = read("hooks/useWebSocket.ts");
  const CHART = read("components/chart/MainChart.tsx");

  it("consults the gate BEFORE reading the price, not after", () => {
    // Measured: /api/yahoo?sym=NQ1!&type=quote returns price 29565.25 ===
    // prevClose 29565.25 with resolution UNKNOWN. The old code read
    // `observation` only to decide `observedAt` and returned the price anyway.
    const mkAt = HOOK.indexOf("const mk = ");
    // The body contains `};` on inner returns, so close on the declaration's
    // own indentation instead.
    const mk = HOOK.slice(mkAt, HOOK.indexOf("\n  };", mkAt));
    const gateAt = mk.indexOf("yahooQuoteRefusal(");
    const priceAt = mk.indexOf("j?.price ?? j?.c");
    expect(gateAt, "mk() must consult the gate").toBeGreaterThan(-1);
    expect(priceAt).toBeGreaterThan(-1);
    expect(gateAt, "the price must not be read before the gate answers").toBeLessThan(priceAt);
  });

  it("zeroes ticker.price on refusal so existing `price > 0` consumers degrade", () => {
    // Fifteen surfaces already spell "no price" as `price > 0` being false.
    // Routing a refusal into that path is what makes the fix reach all of them
    // without each having to learn a new flag.
    expect(HOOK).toMatch(/ticker:\s*\{\s*price:\s*0,\s*change:\s*0,\s*changePct:\s*0/);
  });

  it("a live aggressor tape outranks a REST refusal", () => {
    // The tape observes real trades. The quote endpoint declining to certify
    // its own snapshot says nothing about those prints, so it must not wipe
    // a price the tape is actively producing.
    expect(HOOK).toMatch(/if \(tapeSourceRef\.current == null\) \{/);
  });

  it("a certified answer clears the previous round's refusal", () => {
    // Otherwise a resolved condition becomes a permanent accusation.
    expect(HOOK).toMatch(/quoteRefusal:\s*null,\n\s*ticker:\s*\{\s*price:\s*realPrice/);
  });

  it("the chart never falls back to the hardcoded seed price", () => {
    // `lastPrice` initialises to getBase(symbol) — a constant (NQ1! → 30476).
    // Once the refused quote is retracted, a bare `: lastPrice` fallback would
    // print a number no market ever produced. candles.length is the proof that
    // lastPrice came from a real bar.
    expect(CHART).toMatch(/ticker\.price\s*:\s*\(candles\.length\s*>\s*0\s*\?\s*lastPrice\s*:\s*0\)/);
    expect(CHART, "an unproven price must render as a dash, not a number").toMatch(
      /if \(!\(shown > 0\)\) \{/,
    );
  });

  it("§8 — a refusal does not wear the vocabulary of an empty feed", () => {
    // "DATA UNAVAILABLE" says nothing arrived. Something did arrive, on time.
    expect(CHART).toMatch(/quoteRefusal \? "QUOTE NOT CERTIFIED" : "DATA UNAVAILABLE"/);
    expect(CHART, "the reason must be reachable from the strip").toContain(
      "QUOTE NOT CERTIFIED — ${quoteRefusal}",
    );
  });
});

describe("scanner — a count without a denominator is not a scan result", () => {
  const SCANNER = read("app/scanner/page.tsx");

  it("the round carries what it ASKED, not only what it found", () => {
    // Measured: header read "28 delayed-quote signals" over a 30-symbol
    // universe, and nothing on screen accounted for the missing 2.
    expect(SCANNER).toMatch(/attempted:\s*scannerSymbols\.length/);
    expect(SCANNER).toMatch(/refusals\.set\(sym,\s*refusal\)/);
  });

  it("puts the denominator where the phone can still reach it", () => {
    // Measured at 375: in the header strip the chip rendered at right:393 —
    // past the viewport edge — and pushed `.wm-scanner-actions` to w:0,
    // collapsing the pre-existing Filters button. The status bar is the row
    // that already speaks about the data (results count, QUOTE STATE) and has
    // no controls to displace, so it absorbs the fact by wrapping instead.
    const statusBarAt = SCANNER.indexOf("{filtered.length}/{results.length} results");
    expect(statusBarAt, "status bar not found").toBeGreaterThan(-1);
    expect(
      SCANNER.indexOf("wm-scanner-uncertified"),
      "the chip must live in the status bar, not the width-starved header",
    ).toBeGreaterThan(statusBarAt);
    // Without wrapping, the status bar would clip the fact off the right edge
    // on a phone exactly as the header did.
    const openAt = SCANNER.lastIndexOf("<div className=", statusBarAt);
    const bar = SCANNER.slice(openAt, SCANNER.indexOf(">", openAt));
    expect(bar, "the status bar must wrap under pressure").toContain("flex-wrap");
  });

  it("renders the denominator and names every refused symbol", () => {
    const chip = SCANNER.slice(
      SCANNER.indexOf("wm-scanner-uncertified"),
      SCANNER.indexOf("</span>", SCANNER.indexOf("wm-scanner-uncertified")),
    );
    expect(chip, "no uncertified chip found").not.toHaveLength(0);
    expect(chip, "must show refused count over attempted count").toMatch(
      /\{round\.refusals\.size\}\s*of\s*\{round\.attempted\}/,
    );
    expect(chip, "the reason must be reachable, per symbol").toMatch(
      /\[\.\.\.round\.refusals\]\.map\(\(\[sym, reason\]\)/,
    );
  });

  it("is silent on a clean round rather than printing a zero", () => {
    // "0 not certified" on every clean scan is noise, and noise is what stops
    // the chip from being read on the round that matters.
    expect(SCANNER).toMatch(/round\.refusals\.size\s*>\s*0\s*&&/);
  });

  it("a refused symbol is never counted as a result", () => {
    // The gate's positive branch is the ONLY path that writes a quote; the
    // refusal path is its else. If a future edit made refusal additive, a
    // symbol WM declined would appear as a scan hit.
    const guard = SCANNER.indexOf("if (price > 0 && yahooQuoteObserved(quoteJson))");
    expect(guard).toBeGreaterThan(-1);
    const branch = SCANNER.slice(guard, SCANNER.indexOf("} catch {}", guard));
    expect(branch).toMatch(/}\s*else\s*{[\s\S]*yahooQuoteRefusal\(quoteJson\)/);
    expect(
      branch.slice(branch.indexOf("else")),
      "the refusal branch must not write a quote",
    ).not.toContain("results.set(");
  });
});
