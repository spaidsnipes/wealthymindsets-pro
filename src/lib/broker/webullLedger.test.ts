import { describe, expect, it } from "vitest";
import { reconstructEpisodes, readWebullHistory, summarizeLedger } from "./webullLedger";

/** One Webull order-history order, in Webull's own field names. */
const order = (o: { id: string; side: "BUY" | "SELL"; qty: number; price: number; at: string; status?: string; fees?: number[]; strike?: string; expiry?: string; right?: "CALL" | "PUT"; symbol?: string; combo?: string }) => ({
  client_order_id: `c-${o.id}`,
  combo_type: o.combo ?? "NORMAL",
  combo_order_id: `g-${o.id}`,
  orders: [{
    symbol: o.symbol ?? "TSLA", side: o.side, status: o.status ?? "FILLED",
    legs: o.right ? [{ symbol: o.symbol ?? "TSLA", option_type: o.right, option_expire_date: o.expiry ?? "2026-06-10", strike_price: o.strike ?? "407.50", option_contract_multiplier: "100" }] : [],
    fees: (o.fees ?? [0.02, 0.03]).map(v => ({ type: "REGULATORY_FEE", actual_value: String(v) })),
    commission: {},
    order_id: o.id, instrument_type: o.right ? "OPTION" : "EQUITY", total_quantity: String(o.qty),
    filled_quantity: o.status === "CANCELLED" ? "0" : String(o.qty),
    ...(o.status === "CANCELLED" ? {} : { filled_price: String(o.price), filled_time_at: o.at }),
    place_time_at: o.at, order_type: "MARKET",
  }],
});

const NOW = Date.parse("2026-10-02T15:00:00Z");

describe("Webull lifetime ledger — raw → episodes → outcome P&L", () => {
  it("reads Webull's order history: contract, multiplier and itemised fees", () => {
    const [o] = readWebullHistory([order({ id: "1", side: "BUY", qty: 1, price: 0.8, at: "2026-06-10T13:37:48Z", right: "CALL", fees: [0.02, 0.03] })], "ACC1");
    expect(o).toMatchObject({ instrumentKey: "TSLA 2026-06-10 407.5C", multiplier: 100, side: "BUY", filledPrice: 0.8, feeTotal: 0.05, status: "FILLED" });
  });

  it("an option round trip is premium × multiplier, minus Webull's fees", () => {
    const orders = readWebullHistory([
      order({ id: "1", side: "BUY", qty: 1, price: 0.8, at: "2026-06-10T13:37:48Z", right: "CALL", fees: [0.02, 0.03] }),
      order({ id: "2", side: "SELL", qty: 1, price: 0.92, at: "2026-06-10T13:38:15Z", right: "CALL", fees: [0.02, 0.03, 0.01, 0.01] }),
      order({ id: "3", side: "SELL", qty: 1, price: 0.68, at: "2026-06-10T13:37:50Z", right: "CALL", status: "CANCELLED" }),
    ], "ACC1");
    const [e] = reconstructEpisodes(orders, NOW);
    expect(e).toMatchObject({ label: "RECONSTRUCTED", direction: "LONG", gross: 12, fees: 0.12, net: 11.88, holdMs: 27_000 });
  });

  it("scales in and out are one episode; a crossing fill opens the next", () => {
    const orders = readWebullHistory([
      order({ id: "1", side: "BUY", qty: 100, price: 10, at: "2026-07-01T14:00:00Z" }),
      order({ id: "2", side: "BUY", qty: 100, price: 12, at: "2026-07-01T14:05:00Z" }),
      order({ id: "3", side: "SELL", qty: 150, price: 13, at: "2026-07-01T14:10:00Z" }),
      order({ id: "4", side: "SELL", qty: 100, price: 13, at: "2026-07-01T14:20:00Z" }),
      order({ id: "5", side: "BUY", qty: 50, price: 12, at: "2026-07-01T14:30:00Z" }),
    ], "ACC1");
    const eps = reconstructEpisodes(orders, NOW);
    expect(eps).toHaveLength(2);
    expect(eps[0]).toMatchObject({ direction: "LONG", maxQuantity: 200, gross: 400 });
    expect(eps[1]).toMatchObject({ direction: "SHORT", gross: 50, label: "RECONSTRUCTED" });
  });

  it("a long option open past its expiry is UNSETTLED and never enters realised P&L", () => {
    const orders = readWebullHistory([
      order({ id: "1", side: "BUY", qty: 1, price: 0.09, at: "2026-06-29T14:31:57Z", right: "CALL", expiry: "2026-06-29" }),
    ], "ACC1");
    const eps = reconstructEpisodes(orders, NOW);
    expect(eps[0]).toMatchObject({ label: "UNSETTLED", net: null, entryCost: 9 });
    const s = summarizeLedger(eps);
    expect(s).toMatchObject({ closed: 0, unsettled: 1, unsettledCost: 9, net: 0 });
  });

  it("summary: win rate, expectancy, profit factor and drawdown from closed trades only", () => {
    const rt = (id: string, buy: number, sell: number, day: string) => [
      order({ id: `${id}a`, side: "BUY", qty: 1, price: buy, at: `${day}T14:00:00Z`, fees: [0] }),
      order({ id: `${id}b`, side: "SELL", qty: 1, price: sell, at: `${day}T14:01:00Z`, fees: [0] }),
    ];
    const orders = readWebullHistory([...rt("x", 10, 15, "2026-06-01"), ...rt("y", 10, 7, "2026-06-02"), ...rt("z", 10, 9, "2026-07-03")], "ACC1");
    const s = summarizeLedger(reconstructEpisodes(orders, NOW));
    expect(s).toMatchObject({ closed: 3, wins: 1, losses: 2, net: 1, expectancy: 0.33, profitFactor: 1.25, maxDrawdown: 4 });
    expect(s.byMonth.map(b => [b.key, b.net])).toEqual([["2026-06", 2], ["2026-07", -1]]);
  });
});
