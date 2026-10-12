/**
 * With the delayed poll removed (2026-10-12), a market whose live stream is quiet — the CME daily halt,
 * a weekend — keeps its LAST live price on the watchlist and the ticker tape, stamped with when it was
 * heard, and is never presented as live.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("last live price when the stream is idle", () => {
  it("watchlist: an empty row takes tastytrade's last price with its own timestamp, not as fresh", () => {
    const wl = readFileSync("src/components/chart/WatchlistPanel.tsx", "utf8");
    expect(wl).toContain("} : !(rawItem.price > 0) && tt && tt.price > 0 && tt.at > 0 ? {");
    expect(wl).toContain("providerObservedAt: tt.at,");
    // `fresh` stays the live-lane test, so the row badge can never call this LIVE.
    expect(wl).toContain("fresh={liveFresh}");
  });
  it("ticker tape: an empty row takes the last price with its age, and live stays false", () => {
    const tape = readFileSync("src/components/layout/TickerTape.tsx", "utf8");
    expect(tape).toContain("providerAgeMs: Math.max(0, nowMs - last.at)");
    const branch = tape.slice(tape.indexOf("const last = !(row.price > 0)"), tape.indexOf("if (!exch || !(row.price > 0)) return row;"));
    expect(branch).not.toMatch(/live:\s*true|fresh:\s*true/);
  });
});
