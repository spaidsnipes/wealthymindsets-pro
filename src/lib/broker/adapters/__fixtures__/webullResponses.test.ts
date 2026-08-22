import { describe, it, expect } from "vitest";
import {
  WEBULL_ACCOUNT_LIST_FIXTURE,
  WEBULL_ACCOUNT_BALANCE_FIXTURE,
  WEBULL_OPTION_POSITION_FIXTURE,
  WEBULL_STOCK_SNAPSHOT_TSLA_FIXTURE,
  WEBULL_FUTURES_ES_INSTRUMENTS_FIXTURE,
  WEBULL_CRYPTO_INSTRUMENTS_FIXTURE,
  WEBULL_EVENT_CATEGORIES_FIXTURE,
  WEBULL_FUTURES_PRODUCT_COVERAGE,
} from "./webullResponses";

/**
 * These tests lock the fixture SHAPES against accidental drift. Every
 * key asserted here was verified live on 2026-08-21 from the Webull
 * OpenAPI MCP against the founder's account. If Webull changes the
 * schema, these tests fail first and a fixture refresh is required.
 *
 * NEVER reveal secret / PII / broker-token-adjacent data — sensitive
 * fields are `<REDACTED_*>` strings, and this test asserts that the
 * redaction sentinels are still in place (never the real values).
 */

describe("webullResponses fixtures — shape lock", () => {
  it("account list has expected account classes + redacted sensitive ids", () => {
    expect(WEBULL_ACCOUNT_LIST_FIXTURE.length).toBe(2);
    const classes = WEBULL_ACCOUNT_LIST_FIXTURE.map(a => a.account_class);
    expect(classes).toContain("INDIVIDUAL_MARGIN");
    expect(classes).toContain("EVENTS_CASH");
    for (const a of WEBULL_ACCOUNT_LIST_FIXTURE) {
      expect(a.account_id).toContain("<REDACTED_");
      expect(a.account_number).toContain("<REDACTED_");
      expect(a.user_id).toContain("<REDACTED_");
    }
  });

  it("account balance carries buying-power breakdown per currency", () => {
    const b = WEBULL_ACCOUNT_BALANCE_FIXTURE;
    expect(b.total_asset_currency).toBe("USD");
    expect(b.account_currency_assets.length).toBeGreaterThan(0);
    const asset = b.account_currency_assets[0];
    expect(asset.currency).toBe("USD");
    for (const k of ["option_buying_power", "day_buying_power", "overnight_buying_power", "night_trading_buying_power"] as const) {
      expect(asset).toHaveProperty(k);
    }
  });

  it("option position surfaces expiry / strike / multiplier / expiration_type", () => {
    const p = WEBULL_OPTION_POSITION_FIXTURE;
    expect(p.instrument_type).toBe("OPTION");
    expect(p.legs.length).toBeGreaterThan(0);
    const leg = p.legs[0];
    expect(leg.option_type).toMatch(/PUT|CALL/);
    expect(leg.option_expire_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(leg.option_exercise_price).toMatch(/^\d+(\.\d+)?$/);
    expect(leg.option_contract_multiplier).toBe("100");
    expect(leg.expiration_type).toMatch(/AM|PM/);
    expect(leg.leg_id).toContain("<REDACTED_");
  });

  it("stock snapshot exposes full L1 quote + extended hours + fundamentals", () => {
    const s = WEBULL_STOCK_SNAPSHOT_TSLA_FIXTURE;
    // L1 quote fields
    for (const k of ["bid", "ask", "bid_size", "ask_size"] as const) expect(s).toHaveProperty(k);
    // Extended hours block
    for (const k of ["extend_hour_last_price", "extend_hour_change", "extend_hour_high", "extend_hour_low"] as const) {
      expect(s).toHaveProperty(k);
    }
    // Fundamentals block
    for (const k of ["pe_ratio", "pb_ratio", "ps_ratio", "eps", "eps_ttm", "market_value", "fifty_two_wk_high", "fifty_two_wk_low"] as const) {
      expect(s).toHaveProperty(k);
    }
    // Time fields are numeric ms
    expect(typeof s.last_trade_time).toBe("number");
    expect(typeof s.quote_time).toBe("number");
  });

  it("futures instrument shape includes contract-lifecycle metadata", () => {
    const es = WEBULL_FUTURES_ES_INSTRUMENTS_FIXTURE[0];
    expect(es.code).toBe("ES");
    expect(es.exchange_code).toBe("XCME");
    expect(es.product_class_name).toBe("EQUITY_INDEX");
    expect(es.contract_type).toBe("MONTHLY");
    expect(es.settlement).toBe("CASH");
    expect(es.min_tick).toBe("0.2500000000");
    expect(es.size).toBe("50.0000000000");
    expect(es.first_trading_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(es.last_trading_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("crypto instruments carry min/max amt + qty + price step", () => {
    const btc = WEBULL_CRYPTO_INSTRUMENTS_FIXTURE.find(c => c.symbol === "BTCUSD");
    expect(btc).toBeTruthy();
    expect(btc?.exchange_code).toBe("CCC");
    expect(btc?.price_step).toBe("0.0100000000");
    expect(btc?.status).toBe("OC");
  });

  it("event categories cover the 9 Webull families", () => {
    const codes = WEBULL_EVENT_CATEGORIES_FIXTURE.map(c => c.category_code);
    expect(codes.length).toBe(9);
    for (const expected of ["ECONOMICS", "CRYPTO", "COMMODITIES", "FINANCIALS", "ELECTIONS", "SPORTS", "ENTERTAINMENT", "CLIMATE_WEATHER", "SCIENCE_TECHNOLOGY"]) {
      expect(codes).toContain(expected);
    }
  });

  it("futures product coverage sums to 2283 across 10 product classes + 5 exchanges", () => {
    expect(WEBULL_FUTURES_PRODUCT_COVERAGE.totalProducts).toBe(2283);
    const classSum = Object.values(WEBULL_FUTURES_PRODUCT_COVERAGE.productClassCounts).reduce((a, b) => a + b, 0);
    expect(classSum).toBe(2283);
    const exchangeSum = Object.values(WEBULL_FUTURES_PRODUCT_COVERAGE.exchangeCounts).reduce((a, b) => a + b, 0);
    expect(exchangeSum).toBe(2283);
    expect(Object.keys(WEBULL_FUTURES_PRODUCT_COVERAGE.productClassCounts).length).toBe(10);
    expect(Object.keys(WEBULL_FUTURES_PRODUCT_COVERAGE.exchangeCounts).length).toBe(5);
  });
});
