/**
 * Broker Ledger (Webull lifetime) truth audit: fees UNREPORTED vs $0, WM-paired
 * round trips said as such, NY-month buckets, coverage "read N days" on screen,
 * the truncation guard (split at ≥ SPLIT_AT rows, end date exclusive) still in
 * place, money through formatMoney, times with their zone.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ledgerCoverageLine, nyMonth, readWebullHistory, reconstructEpisodes, summarizeLedger, WEBULL_PAIRING_TRUTH } from "./webullLedger";
import { SPLIT_AT, walkWebullHistory, type HistoryPage } from "./webullLedgerWalk";

const SRC = path.resolve(__dirname, "../..");
const NOW = Date.parse("2026-10-07T20:00:00Z");
/** One Webull order-history order, in Webull's own field names; `fees: null` = Webull sent no fee statement. */
const order = (id: string, side: "BUY" | "SELL", price: number, at: string, fees: number[] | null = [0.02, 0.03], commission: Record<string, string> = {}) => ({
  client_order_id: `c-${id}`, combo_type: "NORMAL", combo_order_id: `g-${id}`,
  orders: [{ symbol: "TSLA", side, status: "FILLED", legs: [], ...(fees ? { fees: fees.map(v => ({ type: "REGULATORY_FEE", actual_value: String(v) })) } : {}), commission,
    order_id: id, instrument_type: "EQUITY", total_quantity: "10", filled_quantity: "10", filled_price: String(price), filled_time_at: at, place_time_at: at, order_type: "MARKET" }],
});

describe("fees: UNREPORTED is not $0", () => {
  it("an order Webull stated fees for is reported (a $0 statement included); one with no fee list and no commission is UNREPORTED", () => {
    const [a, b, c] = readWebullHistory([order("1", "BUY", 445, "2026-10-01T14:00:00Z"), order("2", "SELL", 446, "2026-10-01T14:05:00Z", null), order("3", "SELL", 446, "2026-10-01T14:06:00Z", null, { actual_value: "0" })], "ACC1");
    expect([a.feesReported, b.feesReported, c.feesReported]).toEqual([true, false, true]);
  });
  it("a round trip with an unstated fee counts it, says it, and the summary names the trades — never '$0 fees'", () => {
    const [e] = reconstructEpisodes(readWebullHistory([order("1", "BUY", 445, "2026-10-01T14:00:00Z"), order("2", "SELL", 446, "2026-10-01T14:05:00Z", null)], "ACC1"), NOW);
    expect(e.feesUnreportedFills).toBe(1);
    expect(e.exits[0].feesReported).toBe(false);
    expect(summarizeLedger([e]).feesUnreportedTrades).toBe(1);
    const ui = readFileSync(path.join(SRC, "components/journal/WebullLifetimeLedger.tsx"), "utf8");
    expect(ui).toContain('f.feesReported === false ? "fees UNREPORTED"');
    expect(ui).toContain("Webull stated no fees; not counted as $0");
    expect(ui).toMatch(/trades include fills with no stated fee \(UNREPORTED, not \$0\)/);
  });
});

describe("round trips are said to be paired by WM", () => {
  it("the page's truth line names the WM pairing (no open/close link from Webull)", () => {
    expect(WEBULL_PAIRING_TRUTH).toMatch(/PAIRED BY WM flat-to-flat .* does not link a close to its open/);
    expect(readFileSync(path.join(SRC, "components/journal/WebullLifetimeLedger.tsx"), "utf8")).toContain("${WEBULL_PAIRING_TRUTH}");
  });
});

describe("times and months on the trader's market clock", () => {
  it("a close at 20:30 ET on Sep 30 is September (New York), not October (UTC)", () => {
    expect(nyMonth("2026-10-01T00:30:00Z")).toBe("2026-09");
    const [e] = reconstructEpisodes(readWebullHistory([order("1", "BUY", 445, "2026-09-30T23:00:00Z"), order("2", "SELL", 446, "2026-10-01T00:30:00Z")], "ACC1"), NOW);
    expect(summarizeLedger([e]).byMonth.map(b => b.key)).toEqual(["2026-09"]);
  });
  it("every clock on the page names its zone; money goes through formatMoney", () => {
    const ui = readFileSync(path.join(SRC, "components/journal/WebullLifetimeLedger.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(ui.length).toBeGreaterThan(5_000);
    for (const m of ui.matchAll(/toLocale(?:Time)?String\(([^)]*\{[^}]*\})?\)/g)) {
      if (/minimumFractionDigits|maximumFractionDigits/.test(m[0])) continue;
      expect(m[0]).toMatch(/timeZoneName/);
    }
    expect(ui).toMatch(/const usd = .*formatMoney\(v\)/);
    expect(ui).not.toMatch(/\$\$\{Math\.abs/);
  });
});

describe("coverage: how much history was read is on screen", () => {
  it("'read N days of history, back to D (today included) · stopped: why'", () => {
    expect(ledgerCoverageLine({ askedBackTo: "2025-01-01", stoppedBecause: "QUIET_YEARS" }, NOW)).toBe("read 645 days of history, back to 2025-01-01 (today included) · stopped: two quiet years before that");
    expect(ledgerCoverageLine({ askedBackTo: "2026-01-01", stoppedBecause: "REFUSED", reason: "TOO_MANY" }, NOW)).toMatch(/stopped: Webull refused \(TOO_MANY\) — older history NOT read$/);
    expect(ledgerCoverageLine({ askedBackTo: "", stoppedBecause: "PAGE_BUDGET" }, NOW)).toMatch(/^read an unknown number of days .* page budget reached — older history NOT read$/);
    const ui = readFileSync(path.join(SRC, "components/journal/WebullLifetimeLedger.tsx"), "utf8");
    expect(ui).toContain('data-testid="ledger-coverage"');
    expect(ui).toContain('data-testid="ledger-read-method"');
  });
});

describe("truncation guard still in place", () => {
  it("SPLIT_AT is 30 and a long window that answers SPLIT_AT rows is split until every order is read; end date asked as tomorrow", async () => {
    expect(SPLIT_AT).toBe(30);
    const all = Array.from({ length: 45 }, (_, i) => order(`j${i}`, i % 2 ? "SELL" : "BUY", 400 + i, new Date(Date.UTC(2026, 0, 2 + Math.floor(i / 2), 15)).toISOString()));
    const asked: [string, string][] = [];
    const page: HistoryPage = async (start, end, cursor) => {
      asked.push([start, end]);
      if (cursor) return { ok: true, payload: [] };
      const inWin = all.filter(o => { const t = o.orders[0].filled_time_at.slice(0, 10); return t >= start && t < end; });   // end exclusive
      const oneDay = Date.parse(end) - Date.parse(start) <= 86_400_000;
      return { ok: true, payload: oneDay ? inWin : inWin.slice(0, SPLIT_AT) };
    };
    const walk = await walkWebullHistory("ACC1", page, { today: new Date("2026-01-31T12:00:00Z"), floor: "2026-01-01", quietYears: 1, sleep: async () => {}, gapMs: 0 });
    expect(walk.orders.length).toBe(45);
    expect(asked.some(([, e]) => e === "2026-02-01")).toBe(true);   // the first window ends TOMORROW: today is included
  });
});
