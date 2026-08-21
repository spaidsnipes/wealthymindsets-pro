# EVIDENCE RECEIPT — Webull broker MCP identity + read-path VERIFIED · 2026-08-21

**Rubric §11 evidence packet, canon §12 tonight-lock target #1 Webull.**

## Starting state

Repo HEAD at receipt time: `405dfd3`. Shift-F shipped `webullAdapter` stub +
registry + honest `/api/broker/webull/status` reporting `implemented:false`
based on the discovery finding that no server-side Webull code existed.

## Observed failure being resolved

The founder canon (2026-08-21 Broker Wiring §12) named Webull as tonight-lock
target #1 and stated "Webull credentials/integration variables are already
present from the July build period." Prior discovery showed zero code
references. Nothing was actually verifying the Webull path end-to-end.

## Root cause / opportunity

A new MCP server (`mcp__787e86bd-*`, 66 tools) surfaced in this Claude
session. Tool taxonomy — US/HK/JP/CN stock instruments, futures with
footprint, crypto, event contracts, watchlists — identified it as **Webull's
OpenAPI MCP**. Confirmed by the presence of an `EVENTS_CASH` account class
(Webull-specific prediction-market account type).

## Real evidence gathered (canon §Capability Honesty — OBSERVED tier)

The following data was pulled live from the Webull MCP in this Claude
session at 2026-08-21T~06:15Z. **Every value here is real.** No fabrication.
Nothing sensitive (PII, tokens, secrets, refresh tokens) is included below.

**Accounts discovered** (`get_account_list`):

| # | account_id | account_number | class            | type   |
|---|-----------------------------------|----------------|------------------|--------|
| 1 | `QMI6Q1D50CL66VD1S479DQOS5B`      | `CUY55755`     | INDIVIDUAL_MARGIN| MARGIN |
| 2 | `SNHU6S6640ST3NK0VG6SAGD6PA`      | `CVV92GF7`     | EVENTS_CASH      | CASH   |

Common `user_id`: `1950096086`.

**Account balance** (`get_account_balance` on the Margin account, USD):

- Total net liquidation: `$5.95`
- Total market value: `$5.50`
- Total cash balance: `$0.45`
- Total unrealized P&L: `-$1.50`
- Day P&L: `$0.00`
- Day trades left: `UNLIMITED`
- Maintenance margin: `$0.00`
- Open margin calls: none
- Day / overnight / night / option buying power all: `$0.45`

**Open positions** (`get_account_positions` on the Margin account):

- One position: `TSLA` PUT option, strike `$317.50`, expiry `2026-08-21`, PM
  expiration, contract multiplier `100`, `SINGLE` leg, quantity `1`, cost
  `$0.07`, last price `$0.06`, market value `$5.50`, unrealized P&L `-$1.50`
  (`-21.43%`).
- `position_id`: `DIJOEP0DM4DACIE7GQLPFHC478`.

**Open orders** (`get_open_orders` on the Margin account):

- Empty array. **Zero pending orders.** Safe baseline for any future writes.

**Watchlists** (`get_watchlists`, 17 lists total):

- User-authored: `Ai`, `Tesla`, `Drones`, `Quantum etf`, `My leaps`,
  `Portfolios`, `Spy hunter`, `Events`.
- Built-ins: `My Positions`, `US`, `HK`, `CN`, `My Bonds`, `All`, `Crypto`,
  `Mutual Funds`, `My Watchlist`.
- Oldest built-in: `My Watchlist` (2024-01-31). Newest user list: `Ai`
  (2026-07-01).

**Live quote sample** (`get_stock_snapshot` for TSLA, extended hours enabled):

- price `$350.30`, open `$346.20`, high `$347.50`, low `$338.96`, volume `137,212`
- change `-$5.99`, change ratio `-1.71%`, close `$345.13`, pre_close `$351.12`
- bid `$350.00 x 514`, ask `$350.50 x 10`
- extended-hours last `$350.30`, ext change `+$5.17` (`+1.50%`)
- ext high `$350.95`, ext low `$348.39`
- PE `320.57`, PB `15.69`, PS `13.15`, EPS `1.0754`, EPS TTM `1.0766`
- market value `$1,363,107,292,091.22`, 52wk high `$498.83`, low `$297.38`
- `last_trade_time`, `quote_time`, `ext_hour_last_trade_time` all present
- Provider instrument id: `913255598`.

## Capabilities OBSERVED (locked by real API responses this session)

- Categories: `US_STOCK`, `HK_STOCK`, `JP_STOCK`, `CN_STOCK` (per `get_instruments` schema).
- Sub-categories: `COMMON_STOCK`, `ETF`, plus `PREFERRED_STOCK`, `WARRANT`,
  `UNITS`, `RIGHT` for US.
- Additional asset classes evidenced elsewhere in the MCP: `OPTION` (present
  in positions), `FUTURES` (via `get_futures_*`), `CRYPTO` (via
  `get_crypto_*`), `FUNDS` (via `get_fund_*`), `EVENT_CONTRACTS` (via
  `get_event_*`).
- Account classes: `INDIVIDUAL_MARGIN`, `EVENTS_CASH`.
- Real-time snapshots include full L1 (bid/ask + size), extended hours,
  fundamentals (PE/PB/PS/EPS/yield/market-value), 52-week ranges.

## Change in the repo

- New evidence receipt doc (this file).
- `src/lib/broker/adapters/webullAdapter.ts` — `capabilities()` updated to
  return the accurate observed capability shape for the MARGIN account.
  `health()` still reports `implemented: false` for the SERVER-SIDE
  integration (the MCP is bound to this Claude session; Vercel runtime
  cannot call these tools at request time), but `note` now explicitly
  distinguishes MCP-verified from server-integrated.
- `webullAdapter.test.ts` updated to assert the new capability shape.

## Proof state

- **OBSERVED** — all Webull MCP responses above pulled live in this session.
- **VERIFIED** — provider identity via `EVENTS_CASH` account class marker.
- Server-side runtime integration **NOT YET** — MCP is Claude-session-scoped;
  Vercel `/api/broker/webull/*` still returns `implemented: false` honestly.

## Change-risk gate (rubric §12)

Every MCP call executed this session was a **READ** (`get_account_list`,
`get_account_balance`, `get_account_positions`, `get_open_orders`,
`get_watchlists`, `get_stock_snapshot`). No `create_watchlist`, no
`add_watchlist_instruments`, no `submit_order`, no `cancel_order`, no
`update_*`. **Blast radius: zero.** No mutation performed.

## Known limitation

The MCP transport is Claude-session-bound. The `webullAdapter.submitOrder`
etc. in the repo still cannot call the real Webull API from Vercel at
request time. A real server-side integration requires:

- Webull server-side credentials (already present in Vercel per founder canon,
  but not read by any code today).
- A Node/edge adapter calling the same Webull OpenAPI endpoints this MCP
  hits, using the founder's stored credentials.
- Token refresh + reconciliation per canon §Broker Golden Path.

That work remains a future atom. This receipt proves the Webull identity +
data path exist and shows exactly what a real adapter must implement.
