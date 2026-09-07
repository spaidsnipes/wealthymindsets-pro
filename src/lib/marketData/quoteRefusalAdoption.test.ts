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

/**
 * Every file that consults the SF-D01 gate, found by search rather than by
 * memory — a fourth consumer added later is enumerated automatically and must
 * satisfy the rule, instead of quietly inheriting the old defect.
 */
function gateConsumers(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (entry.name.includes(".test.")) continue;
      // The owner defines the gate; it does not consume it.
      if (full.endsWith(path.join("marketData", "yahooQuoteObserved.ts"))) continue;
      if (fs.readFileSync(full, "utf8").includes("yahooQuoteObserved(")) {
        found.push(path.relative(SRC, full));
      }
    }
  };
  walk(SRC);
  return found.sort();
}

describe("SF-D01 refusal — every gate consumer also carries the reason", () => {
  it("finds the consumers it is meant to protect", () => {
    // A guard on the guard: if the search silently matched nothing, every
    // assertion below would pass vacuously.
    const consumers = gateConsumers();
    expect(consumers.length).toBeGreaterThan(0);
    expect(consumers).toContain("components/layout/TickerTape.tsx");
    expect(consumers).toContain("app/scanner/page.tsx");
  });

  it.each(gateConsumers())("%s reads WHY, not only WHETHER", (rel) => {
    const src = read(rel);
    expect(src, `${rel} must import the one owner of the reason`).toContain("yahooQuoteRefusal");
    expect(src, `${rel} must actually call it`).toMatch(/yahooQuoteRefusal\(/);
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
