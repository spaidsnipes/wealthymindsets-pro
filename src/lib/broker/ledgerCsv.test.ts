import { describe, expect, it } from "vitest";
import { ledgerCsv } from "./ledgerCsv";
import { reconstructEpisodes, readWebullHistory } from "./webullLedger";

describe("ledger CSV export — the trader's own rows, quoted safely", () => {
  it("one row per episode with ids and truth label; commas and quotes escaped", () => {
    const o = (id: string, side: string, price: string, at: string) => ({ client_order_id: id, orders: [{ order_id: id, symbol: "TSLA", side, status: "FILLED", filled_quantity: "1", filled_price: price, filled_time_at: at, legs: [{ option_type: "CALL", option_expire_date: "2026-10-02", strike_price: "390", option_contract_multiplier: "100" }], fees: [{ actual_value: "0.05" }] }] });
    const eps = reconstructEpisodes(readWebullHistory([o("A1", "BUY", "0.13", "2026-10-01T14:10:47Z"), o("B2", "SELL", "0.12", "2026-10-01T14:12:46Z")], "OS5B"), Date.parse("2026-10-02T20:00:00Z"));
    const csv = ledgerCsv(eps).trim().split("\n");
    expect(csv).toHaveLength(2);
    expect(csv[1]).toContain(",TSLA 2026-10-02 390C,LONG,1,100,0.1300,0.1200,-1,0.10,-1.1,RECONSTRUCTED,A1,B2,");
    expect(ledgerCsv([{ ...eps[0], note: 'say "hi", ok' }])).toContain('"say ""hi"", ok"');
  });
});
