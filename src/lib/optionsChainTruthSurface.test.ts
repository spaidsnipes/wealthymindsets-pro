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
    // The provenance spelling is owned by `optionContractResponse`, not retyped
    // here. This assertion used to demand the literal `"alpaca"` in the source
    // text, which made it a copy of the duplicate truth it sat beside and a
    // guard preventing its own repair. The GATE is the invariant; the spelling
    // is enforced by `marketData/optionVocabularySingleOwner.test.ts`.
    expect(optionsChain).toContain('const hasAvailableData = !loading && receivedSymbol === symbol && dataSource === OPTION_CHAIN_SOURCE && sourceReceipt.source === OPTION_CHAIN_SOURCE && chain.length > 0');
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

  it("associates every row-level IV and Greek with visible unverified timing", () => {
    const table = optionsChain.indexOf('<table className="w-full min-w-max');
    const caption = optionsChain.indexOf("IV and Greek fields have no field-level provider timestamp.");
    const head = optionsChain.indexOf('<thead className="sticky top-0', table);
    expect(table).toBeGreaterThan(-1);
    expect(caption).toBeGreaterThan(table);
    expect(caption).toBeLessThan(head);
    expect(optionsChain).toContain("Quote and trade reference age does not date them.");
    expect(optionsChain).toContain('<caption className="caption-top');
    expect(optionsChain).not.toContain("IV and Greek fields are recent");
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
    // RE-PINNED TO THE MEANING, NOT THE SPELLING. This Sentinel used to assert
    // the literal `hasObservedSpot ? spotPrice.toLocaleString(…) : "—"`, which
    // pinned it to the very dash the cell now refuses to print. The MEANING —
    // a missing underlying must never render as a real zero-dollar spot — is
    // now carried by optionChainCellFacts, which additionally distinguishes
    // "no quote", "a quote for another symbol", "a corrupt quote" and "nothing
    // printed yet". The assertions below are strictly stronger: the sentinel
    // number may no longer be formatted onto the screen at all.
    expect(optionsChain).toContain("classifyOptionSpot({ symbol, spot })");
    expect(optionsChain).toContain("optionSpotFact(spotState, spot?.price, symbol, spot?.symbol)");
    expect(optionsChain).toContain("{spotFact.text}");
    expect(optionsChain).not.toContain("spotPrice.toLocaleString");
    expect(optionsChain).not.toMatch(/Spot:[\s\S]{0,120}: "—"/);
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
    // RE-PINNED TO THE MEANING. The old spelling passed `receiptClock ?? NaN`,
    // which made WM's own unread clock indistinguishable from the provider
    // failing to date the contract. The clock gap is now its own guard and the
    // timing call receives a clock it is known to have.
    expect(optionsChain).toContain("optionContractObservationTiming(contract, receiptClock)");
    expect(optionsChain).not.toContain("receiptClock ?? Number.NaN");
    expect(optionsChain).toContain('strikeCellReason("WM_CLOCK_UNREAD"');
    expect(optionsChain).toContain("if (!timing.reviewable)");
    expect(optionsChain).toContain("WM did not select this contract");
    expect(optionsChain).toContain("disabled={!cell.actionable}");
    expect(optionsChain).toContain('strikeCell(row.call, "call", row.strike)');
    expect(optionsChain).toContain('strikeCell(row.put, "put", row.strike)');
    const review = optionsChain.slice(
      optionsChain.indexOf("const timing = optionContractObservationTiming"),
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
    expect(optionsChain).toContain("When a source contract is accepted, its OSI identity has matched the selected underlying, side, expiry, and strike.");
    expect(optionsChain).toContain("That does not establish an executable broker instrument mapping, quote, buying power, or broker support.");
    expect(optionsChain).not.toContain("Executable quote, contract binding, buying power and broker support are not established");
    expect(optionsChain).toContain("Connect or inspect brokers");
    expect(optionsChain).toContain("onOpenBrokerConnect(event.currentTarget)");
    expect(dashboard).toContain("brokerFallbackTriggerRef.current = trigger");
    expect(dashboard).toContain("onOpenBrokerConnect={openBrokerConnect}");
    expect(dashboard).toContain("fallbackTriggerRef={brokerFallbackTriggerRef}");
  });
});
