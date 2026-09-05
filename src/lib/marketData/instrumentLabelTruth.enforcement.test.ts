/**
 * A price may not be displayed under the name of an instrument it is not.
 *
 * WHY THIS FILE EXISTS (2026-09-05, read off the Founder's live screen with
 * computer-use, not hypothesised). One /charts screenshot carried BOTH:
 *
 *   ticker rail:  ES1!  ● SESSION CLOSED — LAST VERIFIED  7,722.00  -32.75 (-0.42%)
 *   bottom bar:   S&P 500                                 7722.00 ▼ -32.75  -0.42%
 *
 * and the same doubling for NQ1! / "NASDAQ". One price, two identities, one
 * screen. The bottom bar subscribed to futures (YM1!, NQ1!, ES1!) and printed
 * them under cash-index names, inside a strip whose own chip reads
 * "US CASH SESSION · CLOSED".
 *
 * This is not pedantry. ES1! and the S&P 500 differ by basis, keep different
 * sessions, and settle differently. A product that prints one number under
 * both names is teaching the trader they are the same instrument, and the
 * first time he acts on a futures move believing the cash index moved, the
 * screen has lied to him about what he owns. LIVING-PIXEL LAW: every material
 * pixel has a real owner, and the label IS part of the pixel.
 *
 * BottomIndexBar was already careful about WHETHER to paint a number — it
 * renders an em-dash without a verified quote. Nobody had checked WHAT the
 * number was called. That asymmetry is the whole lesson: value guards do not
 * imply identity guards.
 *
 * Two things are pinned, because fixing only the first lets it return:
 *   1. The rule is executable — labelMisnamesInstrument catches the pairing.
 *   2. The component cannot re-inline a label. It must render from the
 *      canonical pairs, so symbol and name cannot drift apart in a later edit.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CASH_INDEX_DISPLAY_NAMES,
  US_INDEX_BAR_INSTRUMENTS,
  canonicalAssetClass,
  labelMisnamesInstrument,
} from "./canonicalIdentity";

const BOTTOM_INDEX_BAR = resolve(__dirname, "../../components/chart/BottomIndexBar.tsx");

describe("a cash-index name may never label a futures quote", () => {
  it("catches the exact pairings observed live on 2026-09-05", () => {
    // These three shipped. Each one is the reproduction, not an analogy.
    expect(labelMisnamesInstrument("S&P 500", "ES1!")).toBe(true);
    expect(labelMisnamesInstrument("NASDAQ", "NQ1!")).toBe(true);
    expect(labelMisnamesInstrument("Dow Jones", "YM1!")).toBe(true);
  });

  it("accepts the corrected labels", () => {
    expect(labelMisnamesInstrument("S&P Futures", "ES1!")).toBe(false);
    expect(labelMisnamesInstrument("Nasdaq Futures", "NQ1!")).toBe(false);
    expect(labelMisnamesInstrument("Dow Futures", "YM1!")).toBe(false);
  });

  it("is case- and whitespace-insensitive, so casing is not an escape hatch", () => {
    expect(labelMisnamesInstrument("  s&p 500 ", "ES1!")).toBe(true);
    expect(labelMisnamesInstrument("nasdaq   100", "NQ1!")).toBe(true);
  });

  it("makes no claim about non-futures symbols", () => {
    // An equity or ETF named after an index is not the same defect: SPY really
    // is the thing SPY is. The rule is scoped to the contract/index confusion.
    expect(labelMisnamesInstrument("S&P 500", "SPY")).toBe(false);
    expect(labelMisnamesInstrument("NASDAQ", "AAPL")).toBe(false);
  });

  it("names indices only — a cash-index name never contains 'futures'", () => {
    // Guards the constant itself: adding "S&P Futures" to this list would
    // silently ban the correct label and force someone back to the wrong one.
    for (const name of CASH_INDEX_DISPLAY_NAMES) {
      expect(name.toUpperCase()).not.toContain("FUTURES");
    }
  });
});

describe("the shipped bottom-bar pairs are self-consistent", () => {
  it("every pair survives its own rule", () => {
    const offenders = US_INDEX_BAR_INSTRUMENTS
      .filter((i) => labelMisnamesInstrument(i.label, i.symbol))
      .map((i) => `${i.label} <- ${i.symbol}`);

    // Named, not counted — the failure must say which pair to fix.
    expect(offenders).toEqual([]);
  });

  it("every futures pair says so in the label", () => {
    // Rejecting the cash name is necessary but not sufficient: a label of
    // "US 500" evades CASH_INDEX_DISPLAY_NAMES while still hiding that the
    // quote is a dated contract. The trader must be able to read the asset
    // class off the bar without knowing our symbology.
    const unlabelled = US_INDEX_BAR_INSTRUMENTS
      .filter((i) => canonicalAssetClass(i.symbol) === "futures")
      .filter((i) => !/futures/i.test(i.label))
      .map((i) => `${i.label} <- ${i.symbol}`);

    expect(unlabelled).toEqual([]);
  });
});

describe("single owner: the component cannot re-inline a label", () => {
  it("BottomIndexBar renders from the canonical pairs", () => {
    const src = readFileSync(BOTTOM_INDEX_BAR, "utf8");
    expect(src).toContain("US_INDEX_BAR_INSTRUMENTS");
  });

  it("BottomIndexBar hardcodes no IndexTicker label", () => {
    // The original defect was a literal: <IndexTicker label="S&P 500" ... />.
    // Banning the LITERAL, not just the wrong string, is what makes this
    // durable: re-inlining any name reopens the drift between the symbol and
    // what it is called, and the next wrong name would be invisible again.
    const src = readFileSync(BOTTOM_INDEX_BAR, "utf8");
    const inlined = src.match(/<IndexTicker\s+label="[^"]*"/g) ?? [];

    expect(inlined).toEqual([]);
  });
});
