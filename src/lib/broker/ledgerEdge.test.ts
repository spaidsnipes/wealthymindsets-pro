import { describe, expect, it } from "vitest";
import { MIN_SAMPLE, comparablesFor, computeLedgerEdge } from "./ledgerEdge";
import { reconstructEpisodes, readWebullHistory } from "./webullLedger";

const NOW = Date.parse("2026-10-02T20:00:00Z");
let seq = 0;
/** A one-contract 0DTE TSLA call round trip opened at `open` (UTC ISO), held `holdS` seconds, P&L in premium points. */
const trip = (open: string, holdS: number, buy: number, sell: number, bracket = false) => {
  const id = ++seq;
  const close = new Date(Date.parse(open) + holdS * 1000).toISOString();
  const leg = { symbol: "TSLA", option_type: "CALL", option_expire_date: open.slice(0, 10), strike_price: "400", option_contract_multiplier: "100" };
  const o = (side: string, price: number, at: string, sfx: string, combo: string) => ({
    client_order_id: `c${id}${sfx}`, combo_type: combo,
    orders: [{ order_id: `o${id}${sfx}`, symbol: "TSLA", side, status: "FILLED", total_quantity: "1", filled_quantity: "1", filled_price: String(price), filled_time_at: at, place_time_at: at, order_type: "MARKET", legs: [leg], fees: [] }],
  });
  return [o("BUY", buy, open, "a", bracket ? "MASTER" : "NORMAL"), o("SELL", sell, close, "b", bracket ? "STOP_LOSS" : "NORMAL")];
};

describe("Personal Edge from the broker ledger — sample sizes first, no causes", () => {
  it("groups by time of day (New York), attempt number, hold, DTE and bracket", () => {
    seq = 0;
    const raw = [
      ...trip("2026-09-29T13:31:00Z", 30, 1.0, 1.2, true),   // 09:31 ET, 1st, <1 min, win +20, bracket
      ...trip("2026-09-29T14:10:00Z", 600, 1.0, 0.8),         // 10:10 ET, 2nd, 5–15 min, loss −20
      ...trip("2026-09-29T15:00:00Z", 120, 1.0, 0.7),         // 11:00 ET, 3rd, 1–5 min, loss −30
    ];
    const edge = computeLedgerEdge(reconstructEpisodes(readWebullHistory(raw, "A"), NOW));
    const dim = (id: string) => edge.dimensions.find(d => d.id === id)!.buckets.map(b => [b.key, b.n, b.net]);
    expect(edge.universe).toBe(3);
    expect(dim("time")).toEqual([["09:30–10:00 ET", 1, 20], ["10:00–11:00 ET", 1, -20], ["11:00–13:00 ET", 1, -30]]);
    expect(dim("attempt")).toEqual([["1st trade of the day", 1, 20], ["2nd trade of the day", 1, -20], ["3rd trade of the day", 1, -30]]);
    expect(dim("hold")).toEqual([["< 1 min", 1, 20], ["1–5 min", 1, -30], ["5–15 min", 1, -20]]);
    expect(dim("dte")).toEqual([["0DTE", 3, -30]]);
    expect(dim("bracket").sort()).toEqual([["Bracket attached", 1, 20], ["No bracket at entry", 2, -50]]);
    expect(edge.daily).toMatchObject({ days: 1, thirdPlusDays: 1, thirdPlusTrades: 1, thirdPlusNet: -30 });
  });

  it("a group under MIN_SAMPLE is INSUFFICIENT EVIDENCE; at MIN_SAMPLE it is SUPPORTED", () => {
    seq = 0;
    const raw = Array.from({ length: MIN_SAMPLE }, (_, i) => trip(`2026-09-${String(1 + (i % 28)).padStart(2, "0")}T13:35:00Z`, 30, 1, 1.1)).flat();
    const edge = computeLedgerEdge(reconstructEpisodes(readWebullHistory(raw, "A"), NOW));
    const t = edge.dimensions.find(d => d.id === "time")!.buckets[0];
    expect(t).toMatchObject({ key: "09:30–10:00 ET", n: MIN_SAMPLE, evidence: "SUPPORTED" });
    const few = computeLedgerEdge(reconstructEpisodes(readWebullHistory(trip("2026-09-01T13:35:00Z", 30, 1, 1.1), "A"), NOW));
    expect(few.dimensions[0].buckets[0].evidence).toBe("INSUFFICIENT EVIDENCE");
  });

  it("comparables: other trades with the same entry window, attempt, DTE and call/put", () => {
    seq = 0;
    const raw = [
      ...trip("2026-09-29T13:31:00Z", 30, 1.0, 1.2),   // 09:31 ET 1st 0DTE call +20
      ...trip("2026-09-30T13:35:00Z", 30, 1.0, 0.9),   // 09:35 ET 1st 0DTE call −10 (comparable)
      ...trip("2026-09-30T14:10:00Z", 30, 1.0, 0.5),   // 10:10 ET 2nd — not comparable
    ];
    const eps = reconstructEpisodes(readWebullHistory(raw, "A"), NOW);
    const c = comparablesFor(eps[0].id, eps)!;
    expect(c).toMatchObject({ n: 1, wins: 0, net: -10, evidence: "INSUFFICIENT EVIDENCE", conditions: { time: "09:30–10:00 ET", attempt: "1st trade of the day", dte: "0DTE", right: "Calls" } });
  });
});
