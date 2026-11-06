import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { derivativesPressureStanding as standing } from "./derivativesPressureStanding";

describe("Derivatives Pressure / Brick Walls — why nothing is drawn (one owner)", () => {
  it("an unanswered chain is AWAITING, never an absence", () => {
    for (const e of ["LOADING", null, undefined, ""]) {
      const s = standing(e, "TSLA");
      expect(s.kind).toBe("AWAITING");
      expect(s.pending).toBe(true);
      expect(s.sentence).not.toMatch(/unavailable|no option/i);
    }
  });
  it("open interest still arriving says how much has arrived", () => {
    const s = standing("GATHERING_OI:12/40", "NQ1!");
    expect(s.kind).toBe("GATHERING");
    expect(s.sentence).toContain("12 of 40 contracts reported");
  });
  it("a guest / unconnected account is told it needs a broker — not 'unavailable on this feed'", () => {
    for (const e of ["NEEDS_A_CONNECTED_BROKER", "TASTYTRADE_NOT_CONNECTED"]) {
      const s = standing(e, "SPY");
      expect(s.kind).toBe("NEEDS_BROKER");
      expect(s.pending).toBe(false);
      expect(s.sentence).not.toMatch(/tastytrade/i); // no vendor names in member words
    }
  });
  it("no listed options market (spot FX, most coins) is its own finding", () => {
    expect(standing("UNSUPPORTED", "EURUSD").kind).toBe("NO_OPTIONS_MARKET");
  });
  it("provider-reported zero OI / no contracts near price is a finding about positioning, not the pipe", () => {
    expect(standing("PROVIDER_REPORTS_ZERO_OI:2/40", "CL1!").kind).toBe("NO_POSITIONING");
    expect(standing("NO_CONTRACTS_NEAR_PRICE", "CL1!").kind).toBe("NO_POSITIONING");
  });
  it("transport, throttling and 5xx read as unreachable + retrying", () => {
    for (const e of ["TRANSPORT", "RATE_LIMITED", "TIMEOUT", "HTTP 502", "CHAIN_503", "CHAIN_429"]) expect(standing(e, "BTCUSD").kind, e).toBe("UNREACHABLE");
  });
  it("an unknown edge is named, never rounded into a known one", () => {
    const s = standing("CHAIN_404", "ABC");
    expect(s.kind).toBe("OTHER");
    expect(s.sentence).toContain("chain 404");
  });
});

describe("sentinel: both surfaces route the silence through the owner", () => {
  it("MainChart and ChartsDashboard no longer print the raw edge or 'Unavailable on this feed'", () => {
    const main = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    const dash = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
    expect(main).toContain("derivativesPressureStanding(");
    expect(dash).toContain("derivativesPressureStanding(");
    expect(dash).not.toContain('"Unavailable on this feed"');
    expect(main).not.toMatch(/no option positioning for \$\{symbol\} \(/);
  });
  it("the equity chain hook names the owner refusal instead of swallowing it", () => {
    const hook = readFileSync("src/lib/broker/useTastyEquityOptionLegs.ts", "utf8");
    expect(hook).toContain('"NEEDS_A_CONNECTED_BROKER"');
    expect(hook).toMatch(/if \(edge\) return \{ receipt: null, edge \}/);
  });
});
