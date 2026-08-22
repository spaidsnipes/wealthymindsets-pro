/**
 * webullResponses — real Webull OpenAPI response shapes captured live
 * from the founder's account via MCP on 2026-08-21.
 *
 * These fixtures let downstream adapter tests run OFFLINE against the
 * exact shape Webull actually returns — no network, no live MCP, no
 * account exposure. Sensitive user-identifying values (user_id,
 * account IDs, position IDs, watchlist IDs) have been redacted with
 * `<REDACTED>` sentinels because these fixtures ship to the public
 * repo. Every OTHER field is verbatim from the live response.
 *
 * The fixtures are `as const` so consumers can `typeof` them for the
 * strictest shape guarantees.
 *
 * Rubric §Capability Honesty — OBSERVED tier: shapes here are
 * VERIFIED live; the values may drift as Webull updates, but the
 * KEYS + TYPES are the contract every adapter version must satisfy.
 *
 * See docs/operations/EVIDENCE_2026-08-21_WEBULL_MCP_VERIFIED.md for
 * the redaction rationale and the exact date/time each shape was
 * observed.
 */

export const WEBULL_ACCOUNT_LIST_FIXTURE = [
  {
    account_id: "<REDACTED_MARGIN_ACCOUNT_ID>",
    account_number: "<REDACTED_MARGIN_ACCOUNT_NUMBER>",
    account_type: "MARGIN",
    account_label: "Individual Margin",
    account_class: "INDIVIDUAL_MARGIN",
    user_id: "<REDACTED_USER_ID>",
  },
  {
    account_id: "<REDACTED_EVENTS_ACCOUNT_ID>",
    account_number: "<REDACTED_EVENTS_ACCOUNT_NUMBER>",
    account_type: "CASH",
    account_label: "Events Cash",
    account_class: "EVENTS_CASH",
    user_id: "<REDACTED_USER_ID>",
  },
] as const;

export const WEBULL_ACCOUNT_BALANCE_FIXTURE = {
  total_asset_currency: "USD",
  total_net_liquidation_value: "5.95",
  total_market_value: "5.50",
  total_cash_balance: "0.45",
  total_unrealized_profit_loss: "-1.50",
  total_day_profit_loss: "0.00",
  day_trades_left: "UNLIMITED",
  maintenance_margin: "0.00",
  open_margin_calls: [],
  account_currency_assets: [
    {
      currency: "USD",
      net_liquidation_value: "5.95",
      market_value: "5.50",
      cash_balance: "0.45",
      option_buying_power: "0.45",
      day_buying_power: "0.45",
      overnight_buying_power: "0.45",
      night_trading_buying_power: "0.45",
      unrealized_profit_loss: "-1.50",
      day_profit_loss: "0.00",
    },
  ],
} as const;

export const WEBULL_OPTION_POSITION_FIXTURE = {
  currency: "USD",
  quantity: "1",
  cost: "7.00",
  proportion: "1.0000",
  legs: [
    {
      symbol: "TSLA",
      cost: "0.07",
      proportion: "1.0000",
      leg_id: "<REDACTED_LEG_ID>",
      instrument_type: "OPTION",
      last_price: "0.055",
      unrealized_profit_loss: "-1.50",
      day_profit_loss: "0.00",
      day_realized_profit_loss: "0.00",
      option_type: "PUT",
      option_expire_date: "2026-08-21",
      option_exercise_price: "317.50",
      option_contract_multiplier: "100",
      option_contract_deliverable: "100",
      expiration_type: "PM",
    },
  ],
  position_id: "<REDACTED_POSITION_ID>",
  symbol: "TSLA",
  option_strategy: "SINGLE",
  instrument_type: "OPTION",
  cost_price: "0.07",
  last_price: "0.06",
  market_value: "5.50",
  unrealized_profit_loss: "-1.50",
  unrealized_profit_loss_rate: "-0.2143",
  day_profit_loss: "0.00",
  day_realized_profit_loss: "0.00",
} as const;

export const WEBULL_STOCK_SNAPSHOT_TSLA_FIXTURE = {
  symbol: "TSLA",
  price: "350.3000",
  open: "346.2000",
  high: "347.5000",
  low: "338.9600",
  volume: "137212",
  change: "-5.990000",
  close: "345.1300",
  instrument_id: "913255598",
  pre_close: "351.12",
  change_ratio: "-0.017060",
  last_trade_time: 1787256000975,
  ask: "350.5000",
  ask_size: "10",
  bid: "350.0000",
  bid_size: "514",
  quote_time: 1787306933827,
  extend_hour_last_price: "350.3000",
  extend_hour_change: "5.170000",
  extend_hour_change_ratio: "0.014980",
  extend_hour_volume: "137212",
  extend_hour_last_trade_time: 1787306935513,
  extend_hour_high: "350.9500",
  extend_hour_low: "348.3920",
  pb_ratio: "15.691365",
  ps_ratio: "13.153171",
  pe_ratio: "320.574029",
  market_value: "1363107292091.2200",
  neg_market_value: "1120161104978.3500",
  yield: "0.000000",
  total_shares: "3949547394",
  out_standing_shares: "3245620795",
  fifty_two_wk_high: "498.830000",
  fifty_two_wk_low: "297.38",
  turnover: "0.007790",
  eps: "1.0754",
  eps_ttm: "1.0766",
  lot_size: "1",
  bps: "21.9949",
  list_status: "LISTED",
} as const;

export const WEBULL_FUTURES_ES_INSTRUMENTS_FIXTURE = [
  {
    symbol: "ESU6",
    code: "ES",
    name: "E-mini S&P 500 SEP 26",
    currency: "USD",
    size: "50.0000000000",
    unit: 1,
    settlement: "CASH",
    status: "OC",
    instrument_id: "470498499",
    exchange_code: "XCME",
    contract_month: "202609",
    settlement_date: "2026-09-18",
    min_tick: "0.2500000000",
    first_trading_date: "2023-08-21",
    last_trading_date: "2026-09-18",
    contract_type: "MONTHLY",
    product_class_id: 2,
    product_class_name: "EQUITY_INDEX",
  },
] as const;

export const WEBULL_CRYPTO_INSTRUMENTS_FIXTURE = [
  {
    name: "BTCUSD",
    category: "US_CRYPTO",
    symbol: "BTCUSD",
    status: "OC",
    currency: "USD",
    instrument_id: "950160802",
    exchange_code: "CCC",
    min_trade_amt: "2.0000000000",
    max_trade_amt: "100000.0000000000",
    min_trade_qty: "0.0000000100",
    max_trade_qty: "10000000000.0000000000",
    price_step: "0.0100000000",
    lot_size: "0.0000000100",
  },
  {
    name: "ETHUSD",
    category: "US_CRYPTO",
    symbol: "ETHUSD",
    status: "OC",
    currency: "USD",
    instrument_id: "950160804",
    exchange_code: "CCC",
    min_trade_amt: "2.0000000000",
    max_trade_amt: "100000.0000000000",
    min_trade_qty: "0.0000000100",
    max_trade_qty: "10000000000.0000000000",
    price_step: "0.0100000000",
    lot_size: "0.0000000100",
  },
] as const;

/** Nine event contract categories Webull exposes. */
export const WEBULL_EVENT_CATEGORIES_FIXTURE = [
  { category_id: 5,  category_code: "SCIENCE_TECHNOLOGY", category_name: "Science and Technology" },
  { category_id: 1,  category_code: "ECONOMICS",          category_name: "Economics" },
  { category_id: 8,  category_code: "CRYPTO",             category_name: "Crypto" },
  { category_id: 11, category_code: "COMMODITIES",        category_name: "Commodities" },
  { category_id: 2,  category_code: "FINANCIALS",         category_name: "Financials" },
  { category_id: 13, category_code: "ELECTIONS",          category_name: "Elections" },
  { category_id: 9,  category_code: "SPORTS",             category_name: "Sports" },
  { category_id: 4,  category_code: "ENTERTAINMENT",      category_name: "Entertainment" },
  { category_id: 6,  category_code: "CLIMATE_WEATHER",    category_name: "Climate and Weather" },
] as const;

/**
 * Aggregate coverage summary — pulled from the full 2283-instrument
 * futures product list; kept as counts so the fixture stays small.
 */
export const WEBULL_FUTURES_PRODUCT_COVERAGE = {
  totalProducts: 2283,
  productClassCounts: {
    Energy:          1041,
    Equities:         298,
    UNKNOWN:          240, // Webull returned these with missing product_class_name
    Weather:          179,
    Cryptocurrencies: 165,
    "Interest Rate":  108,
    Agriculture:      105,
    FX:                69,
    Metals:            67,
    "Real Estate":     11,
  },
  exchangeCounts: {
    XNYM: 1219, // NYMEX
    XCME:  688, // CME
    XCBT:  218, // CBOT
    CDE:    94, // CryptoDataExchange
    XCEC:   64, // COMEX
  },
} as const;
