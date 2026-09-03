import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const chain = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/OptionsChain.tsx"),
  "utf8",
);

/**
 * OptionsChain truth Sentinel — LIVING-PIXEL LAW.
 *
 * The panel's own header claimed it "never fabricates contracts when the
 * provider returns no data". True of contracts, false of their contents: every
 * quoted field was coerced with `?? 0`, so an unquoted strike rendered
 * bid 0.00 / ask 0.00 / IV 0.0% / delta 0.00 — a contract that looks real,
 * worthless, and free to buy.
 */
describe("options chain cell truth", () => {
  it("no quoted field is coerced to zero at construction", () => {
    expect(chain).not.toMatch(/call\?\.\w+\s*\?\?\s*0/);
    expect(chain).not.toMatch(/put\?\.\w+\s*\?\?\s*0/);
  });

  it("price and greek cells render through the formatter", () => {
    expect(chain).not.toMatch(/row\.[cp](Bid|Ask|Delta|Gamma|Theta|Vega)\.toFixed/);
    expect(chain).toContain("formatOptionNumber(row.cBid, 2)");
    expect(chain).toContain("formatOptionNumber(row.pDelta, 2)");
  });

  it("implied volatility is never multiplied out of a missing value", () => {
    expect(chain).not.toMatch(/\(row\.[cp]IV \* 100\)\.toFixed/);
    expect(chain).toContain("formatOptionPercent(row.cIV)");
  });

  it("open interest and volume distinguish 'none' from 'not quoted'", () => {
    expect(chain).not.toMatch(/row\.[cp](OI|Vol)\.toLocaleString\(\)/);
    expect(chain).toContain("formatOptionCount(row.cOI)");
  });

  it("the ATM header readout cannot print a confident zero", () => {
    expect(chain).not.toContain("(atm.cIV * 100).toFixed(1)");
    expect(chain).toContain("formatOptionPercent(atm.cIV)");
  });
});

/**
 * The footer's put/call ratio is a headline sentiment number. It was summed
 * over fabricated zeros and divided by `Math.max(1, callsOI)`, which invented
 * a denominator whenever no call interest existed.
 */
describe("options chain footer truth", () => {
  it("no longer forces a denominator", () => {
    expect(chain).not.toContain("Math.max(1,chain.reduce");
    expect(chain).not.toMatch(/Math\.max\(1,\s*chain\.reduce/);
  });

  it("aggregates through the observed-only summary", () => {
    expect(chain).toContain("summariseOpenInterest(chain)");
    expect(chain).not.toMatch(/chain\.reduce\(\(s,r\)\s*=>\s*s\+r\.[cp]OI/);
  });

  it("discloses coverage when some strikes did not report", () => {
    expect(chain).toContain("partial coverage");
    expect(chain).toContain("oi.complete");
  });

  it("says why the ratio is missing rather than showing a bare dash", () => {
    expect(chain).toContain("a put/call ratio is not defined");
  });
});

/**
 * Dead-affordance Sentinel — LIVING-PIXEL LAW ("no design theater").
 *
 * Every chain row carried `cursor-pointer` and a hover highlight, but the
 * <tr> had no onClick. The surface told the trader "this strike is clickable"
 * — hand cursor, row lights up — and then did nothing. An affordance that
 * cannot act is a promise the product does not keep.
 *
 * The interactive styling is now earned: it appears only when a real
 * onSelectStrike handler is supplied, so the affordance and the behaviour
 * cannot drift apart again.
 */
describe("options chain affordance truth", () => {
  it("does not advertise clickability unconditionally", () => {
    expect(chain).not.toContain('"border-b border-wm-border/25 hover:bg-wm-surface/30 transition-colors cursor-pointer"');
    expect(chain).toContain('onSelectStrike && "hover:bg-wm-surface/30 cursor-pointer');
  });

  it("binds the click to the handler that justifies the cursor", () => {
    expect(chain).toContain("onClick={onSelectStrike ? () => onSelectStrike(row) : undefined}");
  });

  it("an interactive row is reachable by keyboard, not mouse only", () => {
    expect(chain).toContain('role={onSelectStrike ? "button" : undefined}');
    expect(chain).toContain("tabIndex={onSelectStrike ? 0 : undefined}");
    expect(chain).toContain('e.key === "Enter" || e.key === " "');
  });
});
