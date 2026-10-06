/**
 * Garden 18 §4 (2026-10-06): an empty scanner says WHY — a failed scan, an
 * empty scan and a filter result are three different facts.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scannerEmptyReason, type ScannerEmptyInput } from "./scannerEmptyReason";

const base: ScannerEmptyInput = { resultsCount: 0, scanFailed: false, lastRefreshAt: null, search: "", signalsActive: 6, signalsTotal: 6, minVol: 0, minPct: 0, sectors: [] };
const PAGE = readFileSync(path.resolve(__dirname, "../../app/scanner/page.tsx"), "utf8");

describe("scannerEmptyReason", () => {
  it("THE DEFECT: a failed scan is never blamed on the filters", () => {
    const r = scannerEmptyReason({ ...base, scanFailed: true });
    expect(r).toMatch(/could not be read from the quote provider/);
    expect(r).toMatch(/not a filter result/);
    expect(r).not.toMatch(/match current filters/);
  });
  it("an empty scan says nothing was observed", () => {
    expect(scannerEmptyReason(base)).toMatch(/returned no symbols/);
  });
  it("a filter result names the filters that excluded every row", () => {
    const r = scannerEmptyReason({ ...base, resultsCount: 40, search: "zzz", signalsActive: 2, minVol: 3, minPct: 1.5, sectors: ["Energy"] });
    expect(r).toBe('40 symbols were read; none passes search "zzz" · 2 of 6 signal types · volume ≥ 3× average · move ≥ 1.5% · sector Energy.');
  });
  it("the page records a failed refresh and renders the reason", () => {
    expect(PAGE).toContain("setScanFailed(true);");
    expect(PAGE).toContain('data-testid="scanner-empty-reason"');
    expect(PAGE).not.toContain("No signals match current filters");
  });
});

describe("Academy / News truth already pinned (verified 2026-10-06)", () => {
  const EDU = readFileSync(path.resolve(__dirname, "../../app/education/page.tsx"), "utf8");
  const NEWS = readFileSync(path.resolve(__dirname, "../../components/experience/HeadlineLeanBand.tsx"), "utf8");
  it("a locked module says unlock is not connected (no entitlement is wired), never a paywall it cannot check", () => {
    expect(EDU).toContain("Preview locked · unlock not connected");
    expect(EDU).not.toMatch(/Upgrade to unlock|Pro members only/i);
  });
  it("completion is labelled browser-local", () => {
    expect(EDU).toContain("Progress saved in this browser after verified readback.");
  });
  it("keyword sentiment stays labelled non-predictive", () => {
    expect(NEWS).toContain("a keyword tally over the headline, not a prediction.");
  });
});

describe("a failed refresh over existing rows is said, not silent", () => {
  it("the footer names it beside the received time", () => {
    expect(PAGE).toContain('{scanFailed && lastRefresh ? " · latest refresh failed — rows are from that time" : ""}');
  });
});
