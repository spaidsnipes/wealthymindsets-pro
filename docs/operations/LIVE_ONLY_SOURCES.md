# LIVE-ONLY MARKET DATA — Founder order, 2026-10-12

> "remove anything delayed and dead" — Founder, 2026-10-12.

This is a standing rule, not a one-day cleanup. **Do not reintroduce a delayed or dead price source
on any surface.** A symbol no live source serves shows an honest refusal, never a delayed number.

## What prices and bars come from now

| Market | Live source | Notes |
|---|---|---|
| Futures | tastytrade DXLink (contract candles 5s…1M, quotes, signed tape) | front month via the chain |
| US stocks / ETFs | tastytrade DXLink (consolidated, incl. extended hours) | Alpaca IEX polled quote stands in only until the stream speaks (one venue, ACTIVE DEGRADED; refused outside RTH) |
| Cash indices SPX, NDX, VIX, RUT | tastytrade DXLink | proved on serving a951b0b (SPX 1,514 / VIX 2,827 5m candles) |
| Crypto | the venue's own feed (Coinbase etc.) + tastytrade for the coins it lists | stock-info facts are Coinbase's rolling 24h, labelled 24h |
| Options evidence (pressure, walls, gamma) | tastytrade chain + live open interest / Greeks (±4% near-money, ≤160 contracts; flip withheld as a subset) | crypto: Deribit public options |
| Spot FX | **none** | refusal names the way out: chart the CME future (6E1! for EUR/USD) |

## Removed (with their routes / adapters where nothing else used them)

Yahoo quotes and intraday bars on every client surface · Finnhub stock quote and candles · Alpaca REST
bars · Polygon · the Alpaca IEX relay and `/api/alpaca-stream` · the polled moomoo / Longbridge / Webull
tick lane, the moomoo and Longbridge tick routes · Cboe delayed options and `/api/market-data/cboe/options`
· the delayed Yahoo spot quote that could veto live candles · the Yahoo quote round and the scanner's Yahoo
candle consumer.

## Kept on purpose

- Backtest history from Yahoo — completed bars, not a delayed price.
- Finnhub for news, symbol search and the crypto stand-in quote (Binance, current).
- Symbol search's Polygon branch (dormant without a key; search only).

## Shared owners to build on

- `src/lib/marketData/liveCandles.ts` — `fetchLiveCandles` / `liveCandleSourceFor` (venue → tastytrade).
- `src/lib/marketData/adapters/tastytradeCandles.ts` — `tastyServedTimeframe` (3M–5Y are served as monthly; the header says so).
- `src/lib/marketData/viewModels/selectPaperQuoteReadiness.ts` — `selectPaperLiveReadiness` (paper fills only on a ≤15 s live price).
- `src/lib/broker/useTastyFuturesPositioning.ts` — `positioningFromLegs`, `useHeldPositioning`; `useTastyEquityOptionLegs.ts` — `useTastyEquityPositioning`.
- `src/lib/broker/tastyFrontMonth.ts` — `tastyIndexStreamer`.

## Rules learned while landing it

- A tastytrade options receipt carries no `underlyingAsOf` of its own. Any consumer that needs a SAME-TIME
  basis (the NQ/ES → NDX/SPX index mapping) must stamp the live index level and its time onto the receipt —
  never a stale level against a live future (`NO_LIVE_INDEX_LEVEL` after the cash close).
- When a fallback is removed, sweep the idle states too: the CME daily halt, weekends, after-hours stocks,
  crypto. Quiet streams keep their LAST live price with its age (never shown as live).
- A member whose account has no tastytrade connection is told so ("live bars come from a connected tastytrade
  account…"), not "refused, without saying why".
- One time-and-sales read per contract (single-flight + 20 s reuse in `src/lib/broker/tastyHistory.ts`): a cold
  futures chart opens 2 DXLink sockets, not 5–7.
- Paint cost: `canvas.dataset.paintSections` (`src/lib/chart/paintLaps.ts`) names the costliest `draw()`
  sections. Canvas calls are cheap; the cost is JavaScript inside `draw()`.

## Consequences (by design of the order)

- Guests (no tastytrade) have no stock / futures prices.
- Spot FX, unlisted coins and indices outside the table have no live route.
- A quiet stream (CME daily halt, weekends) shows the LAST live price with its age — never as live.

## Open decisions for the Founder

- Widen live options coverage beyond ±4% (restores far-out walls and the gamma flip; costs more option streams on the broker socket)?
- Delete the remaining DARK non-market routes (paper order route, certification, memecoin, polymarket, sentiment, audio, welcome email)?
