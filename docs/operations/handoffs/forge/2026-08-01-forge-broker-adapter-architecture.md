# WM-BROKER-P0-02 — Broker Adapter Architecture (the seam every real broker plugs into)

**From:** Forge (Principal Architect) · **Date:** 2026-08-01 · **Repo HEAD:** `2e7c60d`
**Type:** Architecture contract. Forge does not ship (DEC-008/DEC-012 — Noah implements after Founder scope-approval).
**Depends on:** `2026-07-31-forge-broker-expansion-matrix.md` (candidate list + evidence discipline).
**Founder gate:** No adapter is built until (a) Founder scope-approves the broker AND (b) its verification spike (§4) passes. This contract defines the *shape*, not a commitment to any broker.

---

## 1. Problem this solves

Today every broker is bespoke: paper lives in `src/lib/paperTrade.ts`, tastytrade in `src/lib/tastytrade.ts`, Alpaca is a market-data proxy route. There is **no common seam**, so each new broker (Tradier/IBKR/Schwab) would reinvent capability-reporting, order vocabulary, and entitlement honesty — and each would be a fresh place to accidentally fabricate capability. One interface makes new brokers additive and makes the honesty rules enforced in one place.

## 2. Reuse the vocabulary that already exists — do not invent parallel types

`src/lib/paperTrade.ts` already defines the order domain. Adapters reuse it verbatim:
- `OrderSide = "buy" | "sell"`, `OrderType = "market" | "limit" | "stop" | "stop-limit"`, `OrderStatus`
- `Order`, `Position`, `Trade`, `ChartOrderResult`

`src/lib/tastytrade.ts` already models capability honestly — **this is the template**: `getTastytradeCapabilities()` returns `{configured, connected, quotes, realTime: boolean|null, supportedAssetClasses, note}` and refuses to assert real-time without proof. Every adapter reports capability the same way.

## 3. The contract — `BrokerAdapter`

**New file:** `src/lib/brokers/types.ts` (interface only; Forge specifies, Noah implements per broker under `src/lib/brokers/<name>.ts`).

```ts
export type BrokerId = "alpaca" | "tastytrade" | "tradier" | "ibkr" | "schwab" | "paper";
export type AssetClass = "equity" | "option" | "future" | "crypto" | "fx";
export type ConnectMethod = "oauth2" | "oauth1a" | "api-key" | "session-token";

/** Honest capability — mirrors getTastytradeCapabilities(). Never assert unverified. */
export interface BrokerCapabilities {
  configured: boolean;                 // creds present in server env
  connected: boolean;                  // a real auth+probe round-trip succeeded
  connect: ConnectMethod;
  paper: boolean;                      // sandbox/paper account available
  live: boolean;                       // live trading reachable (may be gated off)
  quotes: boolean;                     // streaming/quote entitlement proven
  realTime: boolean | null;            // null until a verified quote timestamp proves it
  supportedAssetClasses: AssetClass[]; // DERIVED from probes, never hardcoded
  sourceName: string;
  note: string;                        // honest limitation string, human-readable
}

export interface BrokerAdapter {
  readonly id: BrokerId;
  /** Verify real capability with read-only probes. NEVER fabricates. */
  getCapabilities(): Promise<BrokerCapabilities>;
  /** Read-only. */
  getAccounts(): Promise<Array<{ accountNumber: string; nickname?: string; assetClasses: AssetClass[] }>>;
  getPositions(account: string): Promise<Position[]>;
  getOrders(account: string): Promise<Order[]>;
  /** Mutating — behind the live-trading gate; dry-run first (see §5). */
  placeOrder(account: string, order: Omit<Order, "status" | "id">, opts: { dryRun: boolean }): Promise<ChartOrderResult>;
  cancelOrder(account: string, orderId: string): Promise<{ ok: boolean; reason?: string }>;
}
```

Rules baked into the seam:
- **`supportedAssetClasses` is derived, never hardcoded.** (This is exactly the tastytrade D-1 defect — `tastytrade.ts:172` hardcodes `"future"`; the seam forbids it by making capability a probe result.)
- **`realTime` stays `null` until proven.** Copy the tastytrade doctrine.
- **`placeOrder` requires an explicit `dryRun` flag.** Live order execution stays Founder-gated and is never the default.
- **Unsupported capability → honest `note`**, never a silent empty/true.

## 4. Per-broker verification spike (the gate before ANY adapter code)

For each Founder-approved broker, a **read-only** spike records — and attaches here — before implementation:

| Field | Tradier | IBKR | Schwab |
|---|---|---|---|
| Official retail API + docs URL | unknown—not yet measured | unknown—not yet measured | unknown—not yet measured |
| `connect` method | (probe) | (probe) | (probe) |
| Paper/sandbox available | (probe) | (probe) | (probe) |
| Asset classes actually returned | (probe) | (probe) | (probe) |
| Market-data entitlement | (probe) | (probe) | (probe) |
| **T&C permits 3rd-party app connection** | (verify) | (verify) | (verify) |
| Effort estimate | — | — | — |

Same evidence discipline as `WM-CHART-P0-01A`: no cell asserted `supported` without a measurement. **Webull/Robinhood remain rejected** (no official retail API — matrix §Recommendation).

## 5. Implementation order for Noah (after Founder scope-approval, per broker)

1. `src/lib/brokers/types.ts` — land the interface (this contract). No broker logic.
2. **Refactor the two existing brokers onto the seam first** (proves the abstraction against known-good code): wrap `tastytrade.ts` → `TastytradeAdapter implements BrokerAdapter`; wrap paper → `PaperAdapter`. This *also* fixes tastytrade D-1 (derived `supportedAssetClasses`) as a side effect — coordinate with `WM-BROKER-P0-01-A` and the frozen-file note (Sentinel DEC-005 verdict on `aa68aa0` must land first).
3. **Tradier next** (matrix: fastest honest OAuth2 win) — its own ticket, gated on its §4 spike.
4. IBKR, then Schwab — heavier session models, each its own gated ticket.

## 6. Acceptance

- `BrokerAdapter` interface exists; **paper + tastytrade both implement it** with no behavior regression (proves the seam).
- No adapter hardcodes `supportedAssetClasses` or asserts `realTime` without proof.
- `placeOrder` defaults to `dryRun` semantics; live path stays gated.
- Each new broker lands only with a completed §4 spike attached + Founder scope-approval.
- Type-check + tests + 69-page build green. **Sentinel** confirms capability honesty per adapter (entitled vs non-entitled both render truthfully).

## 7. Scope discipline

This contract adds **no** new broker and executes **no** trade. It defines the interface + the evidence gate. Adapter code for Tradier/IBKR/Schwab is Founder-scope-gated and spike-gated. Trade execution stays Founder-gated and dry-run-first.
