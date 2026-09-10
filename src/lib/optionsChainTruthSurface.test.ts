import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const optionsChain = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/OptionsChain.tsx"),
  "utf8",
);
const optionsRead = fs.readFileSync(path.join(process.cwd(), "src/lib/optionsChainRead.ts"), "utf8");
const dashboard = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"),
  "utf8",
);

describe("Options Chain truth and responsive surface", () => {
  it("never promotes a successful provider response to live fidelity", () => {
    expect(optionsChain).toContain('receiptAge.timing === "RECENT"');
    expect(optionsChain).toContain('"RECENT REFERENCE"');
    expect(optionsChain).toContain('"STALE REFERENCE"');
    expect(optionsChain).toContain('"REFERENCE TIMING UNVERIFIED"');
    expect(optionsChain).toContain("Indicative quotes are modified and trades are delayed; this is not an executable quote.");
    expect(optionsChain).toContain("Source response: Alpaca");
    expect(optionsChain).toContain("response page ${sourceReceipt.coverage.toLowerCase()}");
    expect(optionsChain).toContain("provider ${receiptAge.label}");
    expect(optionsChain).toContain("Provider observation: ${receiptAge.label}");
    expect(optionsChain).toContain("window.setInterval(tick, 60_000)");
    expect(optionsChain).toContain("window.clearInterval(clock)");
    expect(optionsChain).toContain("setReceiptClock(Date.now())");
    expect(optionsChain).not.toContain("LIVE • FMP");
    expect(optionsChain).not.toContain("Real data: Financial Modeling Prep API");
    expect(optionsChain).not.toContain("bg-wm-green animate-pulse");
  });

  it("gives loading precedence and suppresses stale chain statistics", () => {
    expect(optionsChain).toContain('const hasAvailableData = !loading && receivedSymbol === symbol && dataSource === "alpaca" && sourceReceipt.source === "alpaca" && chain.length > 0');
    expect(optionsChain).toContain('loading\n    ? "CHECKING · FIDELITY UNKNOWN"');
    // Footer stats moved into an IIFE to derive an observed-only OI summary.
    // The gate itself is the invariant: statistics must not render without
    // available data. Assert the gate, and that the summary sits INSIDE it.
    const gate = optionsChain.indexOf("{hasAvailableData && (() => {");
    expect(gate).toBeGreaterThan(-1);
    expect(optionsChain.indexOf("summariseOpenInterest(chain)")).toBeGreaterThan(gate);
    expect(optionsChain).toContain("{hasAvailableData && atm && (");
    expect(optionsChain).toContain('loading\n            ? "Checking options availability · fidelity UNKNOWN"');
  });

  it("identifies ATM Greeks as call-side values with unverified field timing", () => {
    expect(optionsChain).toContain("ATM CALL IV · TIMING UNVERIFIED:");
    expect(optionsChain).toContain("ATM CALL Δ · TIMING UNVERIFIED:");
    expect(optionsChain).toContain("When present, these call-side fields have no field-level Greek or IV timestamp.");
    expect(optionsChain).toContain("Quote and trade receipt age does not date them.");
    expect(optionsChain).toContain("formatOptionPercent(atm.cIV)");
    expect(optionsChain).toContain("formatOptionNumber(atm.cDelta, 2)");
    expect(optionsChain).not.toContain("<span>ATM IV:");
    expect(optionsChain).not.toContain("<span>ATM Δ:");
    expect(optionsChain).not.toContain("atm.pIV");
    expect(optionsChain).not.toContain("atm.pDelta");
  });

  it("fences superseded contract reads and bounds stalled bodies", () => {
    expect(optionsChain).toContain('contractRead.current?.cancel();');
    expect(optionsChain).toContain('signal: controller.signal');
    expect(optionsChain).toMatch(/await readOptionsResponse\(res, symbol\);\s*if \(!active\) return;/);
    expect(optionsRead).toContain('Options check timed out. Contract availability is unverified.');
    expect(optionsChain).toContain('setError(optionsReadFailure("TIMEOUT"))');
    expect(optionsChain).toContain('}, 12_000);');
    expect(optionsChain).toContain('return () => contractRead.current?.cancel();');
    expect(optionsChain).toContain('setAllContracts([])');
    expect(optionsChain).toContain(') : !hasAvailableData ? (');
  });

  it("keeps the panel contained and its primary controls touch reachable", () => {
    expect(optionsChain).toContain("w-full max-w-[700px] min-w-0");
    // Tablet inspection gets enough width to remain legible while preserving
    // a meaningful slice of the underlying canvas. Phone stays full; the
    // denser desktop composition returns to the narrower rail.
    expect(optionsChain).toContain("md:w-[55%] xl:w-[45%]");
    expect(optionsChain).not.toContain('className="w-[700px]');
    expect(optionsChain).toContain('aria-label="Refresh options data"');
    expect(optionsChain).toContain('aria-label="Close options chain"');
    expect(optionsChain).toContain("aria-pressed={showGreeks}");
    expect(optionsChain).toContain("aria-pressed={expiry === e}");
    expect(optionsChain).toContain("aria-pressed={tab === t}");
    expect(optionsChain).toContain("min-h-11 min-w-11");
    expect(optionsChain).toContain("min-w-max");
    expect(optionsChain).toContain('className="min-w-0 break-words"');
  });

  it("does not present a missing underlying quote as a real zero-dollar spot", () => {
    expect(optionsChain).toContain("const spotPrice = spot?.symbol === symbol ? spot.price : 0");
    expect(optionsChain).toContain("const hasObservedSpot = spotPrice > 0");
    expect(optionsChain).toContain('hasObservedSpot ? spotPrice.toLocaleString("en-US",{minimumFractionDigits:2}) : "—"');
    expect(optionsChain).toContain("Underlying quote has not been observed");
    expect(optionsChain).toContain('const itm: OptionRow["itm"] = atm == null ? "unknown"');
    expect(optionsChain).not.toContain('Spot: <span className="text-wm-text font-bold">{price.toLocaleString');
  });

  it("binds chain narrowing to a current-symbol spot exactly once", () => {
    expect(dashboard).toContain("identifiedOptionSpot(symbol, tickerOwner, ticker.price)");
    expect(optionsChain).toContain("const spotBoundSymbol = useRef<string | null>(spotPrice > 0 ? symbol : null)");
    expect(optionsChain).toContain("if (spotPrice <= 0 || spotBoundSymbol.current === symbol) return;");
    expect(optionsChain).toContain("spotBoundSymbol.current = symbol;");
  });

  it("preserves the canonical fetch and fail-closed chain construction", () => {
    expect(optionsChain).toContain("/api/market-data/alpaca/options?symbol=");
    expect(optionsChain).not.toContain("/api/fmp?path=/v3/options/");
    expect(optionsRead).toContain("parseOptionContractResponse(data)");
    expect(optionsRead).toContain('failure: optionsReadFailure("NO EVENTS")');
    expect(optionsChain).toContain('setError(optionsReadFailure("NO EVENTS"))');
    expect(optionsChain).toMatch(/if \(!result.ok\) \{\s*setError\(result.failure\);\s*return;/);
    expect(optionsChain).not.toContain("setError(String(e))");
    expect(optionsChain).toContain("{error?.recovery");
    expect(optionsChain).toContain("buildChain(allContracts, priceKey, isoDate)");
    expect(optionsChain).toContain("WealthyMindsets will not fabricate contracts");
  });

  it("makes expression the primary job while keeping raw contracts inspectable", () => {
    expect(optionsChain).toContain('useState<"expression" | "inspect">("expression")');
    expect(optionsChain).toContain("Underlying → expression → shared intent");
    expect(optionsChain).toContain("Keep the thesis on the chart");
    expect(optionsChain).toContain("Inspect contracts");
    expect(optionsChain).toContain('hidden={scene !== "expression"}');
    expect(optionsChain).toContain('hidden={scene !== "inspect"}');
    expect(optionsChain).toContain("{expression}");
    expect(optionsChain).not.toContain('scene === "expression" && expression');
    expect(optionsChain).toContain('aria-pressed={scene === "expression"}');
    expect(optionsChain).toContain('aria-pressed={scene === "inspect"}');
    expect(optionsChain).toContain('scene === "expression" ? "border-wm-gold/60 bg-wm-gold/10 text-wm-gold"');
    expect(optionsChain).toContain('scene === "inspect" ? "border-wm-gold/60 bg-wm-gold/10 text-wm-gold"');
    expect(optionsChain).toContain("onSelectContract?.(contract, sourceReceipt, timing)");
    expect(optionsChain).toContain("optionContractObservationTiming(contract, receiptClock ?? Number.NaN)");
    expect(optionsChain).toContain("if (!timing.reviewable)");
    expect(optionsChain).toContain("WM did not select this contract");
    expect(optionsChain).toContain("disabled={!reviewable}");
    expect(optionsChain).toContain('reviewable ? "Review call" : "Timing unverified"');
    const review = optionsChain.slice(
      optionsChain.indexOf("function reviewContract"),
      optionsChain.indexOf("// Keep latest price"),
    );
    const failClosedGuard = /if \(!timing\.reviewable\) \{[\s\S]*?setSelectionNotice\([\s\S]*?\);\s*return;\s*\}\s*setSelectionNotice\(""\);\s*onSelectContract\?\.\(contract, sourceReceipt, timing\);[\s\S]*?setScene\("expression"\);/;
    expect(review).toMatch(failClosedGuard);
    // Anti-vacuity mutation: removing the early return must make the Sentinel
    // fail, because both forbidden effects would otherwise run.
    expect(review.replace("return;", "")).not.toMatch(failClosedGuard);
    expect(optionsChain).toContain('setScene("expression")');
    expect(optionsChain).toContain("expressionHeading.current?.focus()");
    expect(optionsChain).toContain("Selection is not an order.");
    expect(optionsChain).toContain("Recording intent does not submit an order or establish protection.");
    expect(optionsChain).toContain("Connect or inspect brokers");
    expect(optionsChain).toContain("onOpenBrokerConnect(event.currentTarget)");
    expect(dashboard).toContain("brokerFallbackTriggerRef.current = trigger");
    expect(dashboard).toContain("onOpenBrokerConnect={openBrokerConnect}");
    expect(dashboard).toContain("fallbackTriggerRef={brokerFallbackTriggerRef}");
  });
});
