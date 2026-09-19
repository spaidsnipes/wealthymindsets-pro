import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const chip = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/NectarVaultChip.tsx"),
  "utf8",
);

describe("chart Market Evidence chip", () => {
  it("uses outcome-facing public vocabulary", () => {
    expect(chip).toContain("Market Evidence.");
    expect(chip).toContain("Evidence saved");
    expect(chip).toContain('aria-label="Open Market Evidence"');
    expect(chip).toContain("View all →");
    expect(chip).not.toContain("WM Nectar Vault —");
    expect(chip).not.toContain(">VAULT</span>");
    expect(chip).not.toContain("provider rights UNKNOWN");
  });

  /**
   * THE VISIBLE COUNT CARRIES ITS OWN NOUN.
   *
   * /charts shows three evidence counts in one viewport — this chip's, the
   * DECISION rail's "0/8 dimensions resolved", and NEXT's "9 unpaid evidence
   * nodes". The chip's scope ("symbol summaries retained in this browser")
   * already exists, but only in `aria-label` and `title`. A bare integer beside
   * an 8 and a 9 is readable as a share of them.
   *
   * Pinned from BOTH sides so the repair cannot be undone by a tidy-up: the
   * noun must be present, and the bare-count render must be absent. The second
   * assertion is the one that matters — without it, deleting the noun and
   * leaving the aria-label alone would keep this green.
   */
  it("the visible evidence count says what it counts, not just how many", () => {
    expect(chip).toContain('symbols.length === 1 ? "symbol" : "symbols"');
    expect(chip).not.toMatch(/·\s*\{symbols\.length\}\s*<\/span>/);
    // The screen-reader sentence is the scope this visible label was derived
    // from. If it ever narrows, the visible noun is no longer backed by it.
    expect(chip).toContain("retained in this browser");
  });

  it("preserves the canonical observation owner and internal route", () => {
    expect(chip).toContain("getKnownSessionSymbols");
    expect(chip).toContain("subscribeSessionSymbolStore");
    expect(chip).toContain("setActiveSymbol(symbol)");
    expect(chip).toContain("symbols.slice(0, 6)");
    expect(chip).toContain('href="/nectar"');
  });

  it("keeps the chart clean until the trader deliberately opens retained evidence", () => {
    expect(chip).toContain("<details");
    expect(chip).toContain("<summary");
    expect(chip).toContain('title="Open retained browser summaries"');
    expect(chip).toContain('maxWidth: "calc(100vw - 24px)"');
    expect(chip).toContain("minHeight: 44, minWidth: 44");
    /**
     * REMAPPED 2026-09-19 — this line pinned `aria-pressed={isActive}`, and so
     * it was the test protecting the corpse: the bubble's `onClick` is
     * `if (!isActive) setActiveSymbol(symbol)`, which makes pressing an active
     * row a no-op. `aria-pressed` promised a reversal the control cannot do.
     *
     * The LAW this line was reaching for is unchanged and is what is pinned
     * now: the active row is DISTINGUISHABLE in the accessibility tree, not
     * merely by colour. `aria-current` is the attribute that says "this is the
     * one you are looking at" without promising it can be un-said.
     */
    expect(chip).toContain('aria-current={isActive ? "true" : undefined}');
    expect(chip).not.toContain('left: "50%"');
    expect(chip).not.toContain('transform: "translateX(-50%)"');
  });
});

/**
 * ONE SYMBOL, THREE TAPES, ONE NAME.
 *
 * MEASURED LIVE 2026-09-19 on https://wealthymindsetspro.com/charts at 1920:
 * six bubbles in the group, TWO carrying aria-pressed="true", both speaking the
 * identical name "Switch chart to BTC. …", and disagreeing — one Δ read
 * +428.84, the other +0.0159. `wm:session-symbol-store:v1` held twelve slots,
 * three of them BTC (`BTC::coinbase`, `BTC::binance`, `BTC::unavailable`).
 *
 * `getKnownSessionSymbols()` returns `tapeSource`. The chip destructured only
 * `{ symbol, slot }`. Every symptom above is that one discarded word.
 *
 * COMMENT-STRIPPED, and that is load-bearing here: the repair's own prose in
 * NectarVaultChip.tsx quotes `aria-pressed` several times to explain why it
 * left. Without the strip, the negative assertion below would fail against the
 * FIXED file and pass only once the explanation were deleted — a test that
 * punishes reasoning and rewards its removal.
 */
describe("chart Market Evidence bubbles — the identity contract", () => {
  const strip = (code: string) =>
    code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  const code = strip(chip);

  it("the strip detector is not vacuous", () => {
    expect(code).toContain("symbols.slice(0, 6)");
    expect(code.length).toBeGreaterThan(1000);
  });

  it("carries the whole identity — the tape source is no longer discarded", () => {
    expect(code).toContain("symbols.slice(0, 6).map(({ symbol, tapeSource, slot })");
  });

  it("keys each row by symbol AND tape, so three BTC records stop colliding", () => {
    expect(code).toContain("key={`${symbol}::${tapeSource}`}");
    expect(code).not.toMatch(/key=\{symbol\}/);
  });

  it("never promises a reversal the bubble cannot perform", () => {
    expect(code).not.toContain("aria-pressed");
    expect(code).toContain('aria-current={isActive ? "true" : undefined}');
    // The no-op that made aria-pressed unkeepable is still the behaviour; this
    // pins WHY aria-current is the honest attribute here.
    expect(code).toContain("if (!isActive) setActiveSymbol(symbol);");
  });

  it("two rows for one symbol no longer speak the same sentence", () => {
    expect(code).toContain("sourceSpoken");
    expect(code).toMatch(/Switch chart to \$\{symbol\}, \$\{sourceSpoken\}/);
    // The old undifferentiated name must be gone, not merely supplemented.
    expect(code).not.toMatch(/`Switch chart to \$\{symbol\}\. /);
  });

  it("an unsourced reading is not dressed up as a venue", () => {
    expect(code).toContain('tapeSource === "unavailable" ? "tape source unavailable"');
    expect(code).toContain("data-evidence-tape-source={tapeSource}");
  });

  it("the provenance reaches the eye, not only the screen reader", () => {
    expect(code).toMatch(/\{tapeSource === "unavailable" \? "—" : tapeSource\}/);
  });
});
