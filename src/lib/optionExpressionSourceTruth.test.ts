import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const expression = fs.readFileSync(path.join(process.cwd(), "src/components/chart/OptionExpressionIntent.tsx"), "utf8");
const dashboard = fs.readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("selected option source truth", () => {
  it("carries the exact Alpaca indicative receipt into display and shared intent", () => {
    // These two assertions used to read `receipt.source !== "alpaca"` and
    // `receipt.fidelity !== "INDICATIVE"` — i.e. this test DEMANDED the retyped
    // literal, making it a sixth copy of the very DUPLICATE TRUTH it sat next
    // to and actively blocking the repair. The GATE is what matters here; the
    // spelling is `optionContractResponse`'s to own. That single-owner rule is
    // enforced by `optionVocabularySingleOwner.test.ts`, not re-litigated here.
    expect(dashboard).toContain('receipt.source !== OPTION_CHAIN_SOURCE');
    expect(dashboard).toContain('receipt.fidelity !== OPTION_CHAIN_FIDELITY');
    expect(dashboard).toContain('|| !timing.reviewable');
    expect(dashboard).not.toContain('providerTimestamp: receipt.newestProviderTimestamp');
    expect(expression).toContain('quote timestamp ${contract.quoteTimestamp ?? "not observed"}');
    expect(expression).toContain('trade timestamp ${contract.tradeTimestamp ?? "not observed"}');
    expect(expression).toContain('quote {quoteTiming} · trade {tradeTiming}');
    expect(expression).toContain('quote timing ${observationTiming.quote.timing}');
    expect(expression).toContain('trade timing ${observationTiming.trade.timing}');
    expect(expression).toContain('!purpose.trim() || !canRecord');
    expect(expression).toContain('Reference timing is unverified for both the exact quote and trade.');
    expect(expression).toContain('{source === OPTION_CHAIN_SOURCE ? "Alpaca" : "Unknown source"} reference');
    expect(expression).toContain("Source OSI identity matches the selected underlying, side, expiry, and strike.");
    expect(expression).toContain("Executable broker instrument mapping and support remain unverified.");
    expect(expression).toContain("source OSI identity matches the selected underlying, side, expiry, and strike; executable quote and broker instrument mapping/support remain unverified. No order requested.");
    expect(expression).toContain("This review does not open a position.");
    expect(expression).not.toContain("Contract-to-underlying binding and broker support need verification.");
    expect(expression).not.toContain("executable quote and contract binding unverified");
    expect(expression).not.toContain("FMP reference");
    expect(expression).not.toContain("Reference source FMP");
  });
});

describe("asOf is readable without a pointer", () => {
  /**
   * The absolute observation instant used to exist ONLY inside a `title=`
   * attribute. Hover is a pointer affordance; the phone and the iPad — the
   * PRIMARY devices under the mobile-and-visual-confirmation standard — have
   * no hover, so the one auditable fact about a reference price was unreachable
   * exactly where it was needed most. A relative "4m old" is not a substitute:
   * it can only be trusted if you already trust the clock that produced it.
   */
  it("renders the instant as text, not only as a tooltip", () => {
    expect(expression).toContain("Observed at · quote {stampText(contract.quoteTimestamp, quoteStamp)}");
    expect(expression).toContain("trade {stampText(contract.tradeTimestamp, tradeStamp)}");
    // The relative age stays. Both vocabularies are wanted; the defect was
    // having only the one that cannot be checked.
    expect(expression).toContain("quote {quoteTiming} · trade {tradeTiming}");
  });

  /**
   * Local time and time-zone name come from the browser. Formatting either
   * during render is the #418 hydration defect this repo has already shipped.
   * `optionsObservationStamp` demands the post-mount clock as a GATE so the
   * unsafe call cannot be written by accident — this pins that the surface
   * actually passes the gated clock and not `Date.now()`.
   */
  it("formats the instant only after this browser has stated the time", () => {
    expect(expression).toContain("optionsObservationStamp(contract.quoteTimestamp ?? null, receiptClock ?? Number.NaN)");
    expect(expression).toContain("optionsObservationStamp(contract.tradeTimestamp ?? null, receiptClock ?? Number.NaN)");
    expect(expression).not.toContain("optionsObservationStamp(contract.quoteTimestamp ?? null, Date.now())");
  });

  /**
   * A provider timestamp this browser cannot yet localise was still OBSERVED.
   * Printing "not observed" for it would blame the provider for our own clock,
   * and those two states have different next actions — wait, versus ask the
   * provider why it printed nothing.
   */
  it("separates 'not observed' from 'we cannot say when yet'", () => {
    expect(expression).toContain(`stamp ?? (raw ? "awaiting this browser's clock" : "not observed")`);
  });
});
