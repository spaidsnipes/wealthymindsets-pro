import { describe, expect, it } from "vitest";
import { deribitCurrencyFor, dvolFrom, normalizeDeribitOptions } from "./deribitOptions";
import { selectDerivativesPressure } from "./viewModels/selectDerivativesPressure";

const NOW = Date.parse("2026-09-28T01:00:00Z");
const row = (name: string, oi: number, iv = 45) => ({ instrument_name: name, open_interest: oi, mark_iv: iv, estimated_delivery_price: 84000, creation_timestamp: NOW - 1000, volume: 1 });

describe("Deribit public options → the one pressure receipt", () => {
  it("names only BTC / ETH", () => {
    expect(deribitCurrencyFor("BTC-USD")).toBe("BTC");
    expect(deribitCurrencyFor("ethusd")).toBe("ETH");
    expect(deribitCurrencyFor("SOL-USD")).toBeNull();
    expect(deribitCurrencyFor("TSLA")).toBeNull();
  });
  it("parses the instrument name, IV percent → fraction, OI in coins, current clock", () => {
    const r = normalizeDeribitOptions({ result: [row("BTC-30OCT26-90000-C", 120), row("BTC-30OCT26-80000-P", 95), row("ETH-30OCT26-3000-C", 5), { instrument_name: "junk" }] }, "BTC", 60, NOW, 35.2);
    expect(r.source).toBe("DERIBIT_PUBLIC");
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ type: "call", expiration: "2026-10-30", strike: 90000, openInterest: 120, iv: 0.45 });
    expect(r.spot).toBe(84000);
    expect(r.iv30).toBe(35.2);
    expect(r.dropped).toBe(2);
  });
  it("drops expired and beyond-horizon contracts without calling them errors", () => {
    const r = normalizeDeribitOptions({ result: [row("BTC-1SEP26-90000-C", 10), row("BTC-25DEC27-90000-C", 10)] }, "BTC", 60, NOW);
    expect(r.rows).toHaveLength(0);
    expect(r.dropped).toBe(0);
  });
  it("DVOL newest close is iv30; nothing → null (never estimated)", () => {
    expect(dvolFrom({ result: { data: [[1, 35, 36, 34, 35.07], [2, 35, 35.4, 35, 35.22]] } })).toBe(35.22);
    expect(dvolFrom({ result: { data: [] } })).toBeNull();
  });
  it("the owner compiles it with 1-coin contracts and names its source", () => {
    // ≥ MIN_ROWS (40) contracts inside the ±30% band: 30 strikes × call + put.
    const strikes = Array.from({ length: 30 }, (_, i) => 70000 + i * 1000);
    const result = strikes.flatMap(k => [row(`BTC-30OCT26-${k}-C`, 400), row(`BTC-30OCT26-${k}-P`, 300)]);
    const r = normalizeDeribitOptions({ result }, "BTC", 60, NOW, 35);
    const vm = selectDerivativesPressure(r, [{ time: NOW / 1000 - 60, open: 84000, high: 84100, low: 83900, close: 84000 }], NOW);
    expect(vm.drawn).toBe(true);
    if (!vm.drawn) return;
    expect(vm.source).toBe("DERIBIT_PUBLIC");
    expect(vm.fidelity).toBe("SNAPSHOT");
    expect(vm.clocks.oiAsOf).toBe("CURRENT");
    // 1 coin per contract: exposure at spot is bounded by OI·S²·Γ·1%, not ×100.
    expect(vm.gross).toBeLessThan(30 * 700 * 84000 * 84000 * 0.01);
    expect(vm.envelope?.session).toBeCloseTo(84000 * 0.35 * Math.sqrt(1 / 365), 0);
  });
});
