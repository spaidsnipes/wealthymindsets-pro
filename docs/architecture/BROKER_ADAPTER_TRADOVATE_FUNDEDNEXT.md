# Broker Adapter — Tradovate + FundedNext (M16)

**Bible §32 Broker & Execution Architecture.** **Adopted:** 2026-08-09.
**Status:** doc-only architecture; no code shipped by this milestone.
**Anchor:** Founder had Tradovate + FundedNext tabs open 2026-08-04. Both are futures-first.

## Landscape

| Broker | Type | Auth | Data | Execution | Notable |
|---|---|---|---|---|---|
| Alpaca | Retail equities + crypto broker | API key + secret (server-only) | REST + WS (basic); IEX-quality data | Paper + Live; simple REST orders | Already wired (`api/alpaca/*`); ALPACA_LIVE=1 flag exists |
| tastytrade | Retail equities + options + futures | OAuth 2 refresh-token flow (server-only) | REST + WS (dxFeed streamer); options-chain rich | Paper + Live; complex order types | Partially wired (`api/broker/tastytrade`); futures OPEN per WM-BROKER-P0-01-A |
| Tradovate | Futures-first prop + retail | Access token from user/password OR CQG-issued token | REST + WS (Tradovate MD API) | Paper + Live; futures + options-on-futures | Unwired; user tab open 2026-08-04 |
| FundedNext | Prop firm (uses MetaTrader 5 / cTrader / MatchTrader routes) | Per-account credential on their portal | MT5/cTrader broker terminals; no REST for order routing to WM | Prop-eval + funded; hard drawdown rules | **No public API for order routing**; WM integration is analytical-only (mirror positions from statement + rules-engine simulator) |

## WM adapter contract

Every broker adapter implements:

```ts
interface BrokerAdapter {
  id: "alpaca" | "tastytrade" | "tradovate" | "fundednext-mirror";
  capabilities: {
    assetClasses: AssetClass[];      // from NormalizedQuote types
    liveOrders: boolean;
    paperOrders: boolean;
    futures: boolean;
    options: boolean;
    marginRules: "cash" | "reg-t" | "portfolio" | "prop-firm";
  };
  connect():          Promise<ConnectResult>;
  quotes(sym: string): AsyncIterable<NormalizedQuote>;
  accounts():         Promise<Account[]>;
  positions(acc: string): Promise<Position[]>;
  submitOrder(o: OrderTicket): Promise<OrderAck>;   // throws if !capabilities.liveOrders && !ticket.paper
  cancelOrder(id: string):  Promise<void>;
  reconcile():        Promise<Reconciliation>;      // WM's execution firewall calls this on reconnect
}
```

## Instrument identity (Bible §32 continuous vs specific)

- Tradovate exposes both continuous (`NQ1!` → symbol root `NQ`) and specific contracts (`NQZ26`, `NQH27`). Adapter MUST populate `analyticalSymbol` + `executableSymbol` correctly per WM-BROKER-QUOTE-P0-01.
- Rollover events: Tradovate sends notice N days before front-month expiry. Adapter surfaces this to the WM Execution Firewall which refuses to route to an expiring contract inside its final rollover window unless the ticket carries an explicit `rolloverAck: true`.

## FundedNext — mirror-only integration

FundedNext does not publish an order-routing API. WM's integration is **analytical + rules**:

1. **Statement import** — user uploads MT5/cTrader daily statement (CSV or MT5 report). WM parses positions + realised P&L.
2. **Rules simulator** — WM knows the FundedNext program rules (daily drawdown, overall drawdown, max lots, trading days). Given the imported state, WM tells the user which trades stay within limits BEFORE they place them at FundedNext.
3. **No order submission from WM.** Explicit UI state: "WM analyses your FundedNext performance. Orders are placed at FundedNext.com." The mirror adapter's `submitOrder` throws.

Rationale: WM's Execution Firewall (directive Part XXXIII) requires end-to-end audit of every order. A blind write to MT5 without the acknowledged fill lifecycle would violate that. Statement import is honest and doesn't over-promise.

## Deliverables

This ticket lands the contract only. Implementation:

- **T1** (Forge, doc-only): finalise interface signatures, place in `src/lib/broker/adapters/types.ts`. No implementation.
- **T2** (Forge): Tradovate adapter shell — `src/lib/broker/adapters/tradovate.ts`, connect + quotes only, gated behind `WM_BROKER_TRADOVATE=1` feature flag. Paper only. No live orders in first cut.
- **T3** (Forge): FundedNext mirror adapter — `src/lib/broker/adapters/fundednext-mirror.ts`, statement parser + rules simulator. `submitOrder` throws by design.
- **T4** (Sentinel): capability matrix test — every adapter must correctly claim capabilities and refuse operations it doesn't support.

## Doctrine alignment

- **JKD:** absorb the useful pattern from each broker's API; expose one WM face.
- **Safety:** FundedNext mirror-only is the honest integration; no phantom orders to prop-firm platforms whose fill semantics we don't own.
- **Truth:** the capability matrix on each adapter is code, not comment — grep-able, testable.
- **Bible §32:** analytical vs executable split enforced at type-system level.
