# WM Market Data Rights Register — 2026-08-10

**Status:** VERIFIED RESEARCH; no durable provider-data permission granted.

This register separates API accessibility from legal permission. A free or public endpoint does not, by itself, authorize durable storage, derived-product retention, redistribution, training, or commercial multi-user use. The executable registry in `src/lib/marketData/capabilityRegistry.ts` therefore defaults each unreviewed action to `UNKNOWN`, which fails closed.

| Provider path | Collect/display | Raw retain | Derived retain | Redistribute/train/commercial | Current executable decision |
|---|---|---|---|---|---|
| Coinbase Exchange WebSocket | Conditional subscriber/entity use | UNKNOWN | UNKNOWN | Redistribution prohibited absent consent; train/commercial UNKNOWN or separately licensed | collect/display only; persistence blocked |
| Binance.US WebSocket | Public-stream access subject to terms | UNKNOWN | UNKNOWN | Commercial feed/streaming prohibited absent written consent | collect/display only; persistence blocked |
| Alpaca/IEX relay | Plan/feed/display-entitlement dependent | UNKNOWN | UNKNOWN | Written approval/agreements required | collect/display only; persistence blocked |
| Yahoo Finance chart endpoint | No official chart-endpoint license verified | UNKNOWN | UNKNOWN | Permission not established | collect/display is current operational inventory; persistence blocked |
| Finnhub | Plan and written-commercial approval dependent | UNKNOWN | UNKNOWN | Permission not established | collect/display only; persistence blocked |
| Kraken | Account, purpose, and jurisdiction dependent | UNKNOWN | UNKNOWN | Permission not established | collect/display only; persistence blocked |
| tastytrade/dxLink | Approved client/watchlist use only; broad collection prohibited | Conditional/UNKNOWN | Conditional/UNKNOWN | Third-party/public use requires agreement | not registered for durable WM persistence |

## Primary evidence

- [Coinbase Market Data Terms](https://www.coinbase.com/legal/market_data) and [WebSocket limits](https://docs.cdp.coinbase.com/exchange/websocket-feed/rate-limits)
- [Binance.US Terms](https://www.binance.us/terms-of-use) and [API documentation](https://docs.binance.us/)
- [Alpaca Market Data API](https://docs.alpaca.markets/us/docs/about-market-data-api) and [pricing](https://alpaca.markets/data)
- [Yahoo Terms](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html) and [API Terms](https://legal.yahoo.com/us/en/yahoo/terms/product-atos/apitnc/index.html)
- [Finnhub market-data pricing](https://finnhub.io/pricing-stock-api-market-data) and [API documentation](https://finnhub.io/docs/api/stock-bidask)
- [Kraken Global Terms](https://www.kraken.com/legal/global-terms) and [API documentation](https://docs.kraken.com/)
- [tastytrade Open API Terms](https://assets.tastyworks.com/production/documents/USA/open_api_terms_and_conditions.pdf) and [market-data specification](https://developer.tastytrade.com/open-api-spec/market-data/)

## Activation receipt required

A feed may move from `UNKNOWN` to `ALLOWED` only when one policy record names the provider path, asset class, event type, environment, agreement/version, evidence URL, reviewer, review timestamp, retention limit, attribution obligation, and each permitted action. Both the TypeScript registry and `wm_market_memory.source_rights` must match the same `rights_policy_id`. Either side can veto; neither side can self-authorize.

The durable store exists now, but contains zero provider authorization rows and zero retained market observations. Operational coverage summaries remain server-durable and contain no price, size, raw event ID, or provider payload.
