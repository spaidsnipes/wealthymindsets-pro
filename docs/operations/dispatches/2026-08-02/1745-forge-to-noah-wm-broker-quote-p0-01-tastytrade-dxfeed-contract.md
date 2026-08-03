# FORGE → NOAH — WM-BROKER-QUOTE-P0-01 (tastytrade dxFeed wiring) implementation contract

**From:** Forge (Principal Architect) · **To:** Noah (Implementation) · **Time:** 2026-08-02 ~17:45 CDT
**Repo HEAD:** `f1ca9cd` · **Time-critical:** futures market OPEN as of Sun 5pm CT. Founder can test `/ES /NQ /GC` live tonight.
**Filed:** Atlas at f1ca9cd 17:25 (two entries — see coordination note §6).
**Forge audit:** `docs/operations/handoffs/forge/2026-08-02-forge-wm-data-p0-01-quote-pipeline-audit.md` (shipped `efe4bec` §5/§7)
**Broker adapter seam:** `docs/operations/handoffs/forge/2026-08-01-forge-broker-adapter-architecture.md` (shipped `c1b6af6`)

---

## The defect (Founder-visible)

`tastytrade.ts:202-206` probes `/api-quote-tokens` and confirms dxFeed quote capability (`quotes: true`) on the connected account. **Zero consumers read it.** `useWebSocket` / tape pipeline have no tastytrade quote wiring. The adapter serves accounts + order lifecycle only.

Consequence: **futures have no WS quote path at all** in production (Yahoo REST only, per the WM-DATA-P0-01 provider matrix). Tastytrade/dxFeed would be the first live futures quote stream available.

Founder just observed "we have tastytrade connected" but no quotes served from it. The gap is real, the fix is bounded.

---

## Which broker gets wired first? Tastytrade. And exactly why now.

Per Bible §32 ("Broker adapter should define: Authentication, Accounts, Balances, Positions, Orders, Streaming updates, Supported instruments") and §33 ("Futures support must include: Root symbols and contracts, Trading hours, Contract-specific symbol mapping"):

- **Tastytrade is the only broker in-tree today with proven `quotes: true` capability** (`tastytrade.ts:181` doctrine). Alpaca is a market-data proxy route, not a quote-streaming broker adapter.
- **Futures market just opened** — Founder is testing tonight. Tastytrade dxFeed is the shortest path to a live futures WS quote on `/charts`.
- The broker adapter seam I designed at `c1b6af6` (`BrokerAdapter` interface in `src/lib/brokers/types.ts`) is the target destination — this wiring becomes the first `getQuoteStream()`-capable implementation and validates the seam against real streaming code.

**Not IBKR, not Schwab, not Tradier tonight.** They each need their own §4 verification spike per the adapter seam handoff, and none of that is on the critical path for "Founder wants to see `/ES` quote update in `/charts` at 5pm Sunday."

---

## Endpoint contract (dxFeed quote path)

**Existing evidence in `tastytrade.ts`:**
- `/customers/me/accounts` — account discovery (already wired)
- `/api-quote-tokens` — returns dxFeed streaming token + endpoint URL (already probed at `:202`, result discarded)
- `getTastytradeCapabilities()` — already reports `quotes: true` when the token endpoint succeeds

**What's missing (Noah's scope):**

1. **`getTastytradeStreamerCredentials()`** — thin wrapper over `/api-quote-tokens` that returns `{token: string, url: string, expiresAt: number}` instead of a bool. Reuse the auth flow already in `authFetch()`. Add token-expiry awareness (per tastytrade docs, dxFeed session tokens have a TTL).
2. **`subscribeTastytradeQuote(streamer, symbols[])`** — opens the dxFeed WS to the returned URL, authenticates with the token, subscribes to quote messages for the requested symbols. Returns a hook-compatible surface: `{onQuote(cb), unsubscribe()}`. Do **not** invent a parallel event bus; feed into the same normalized quote shape `useWebSocket` already consumes.
3. **Symbol-mapping for futures.** Per Bible §33 ("Contract-specific symbol mapping"), tastytrade futures quote as their **streamer symbol** (e.g. `/ESU5:XCME`), not the equity ticker or the root. The mapping table lives in `tastytrade.ts` alongside the instrument fetch. **Contract:** the mapping is derived from the futures-instrument probe I already specified in `WM-BROKER-P0-01-A`, not hardcoded. If the instrument probe hasn't run, futures subscription returns `unavailable` with an honest reason — never fabricates a streamer symbol.
4. **Wire into `useWebSocket` fallback chain.** Order: existing streaming providers first (Coinbase/Kraken/Binance for crypto, Alpaca for equity where wired), tastytrade dxFeed for **futures + supported equity when the account is entitled**. Do not blindly prefer tastytrade over an already-working provider — that's a regression surface.
5. **Provenance badge.** Every quote emitted from the tastytrade path carries `source: "tastytrade-dxfeed"` so the existing provenance badges (shipped at `a223fc5`, backed by `fd12f1e`) render truthfully.

---

## Honesty rules baked in (matching Bible §32 and the seam contract)

- **`realTime: null` until proven.** Do NOT flip `realTime: true` in `getTastytradeCapabilities` on a token fetch alone — flip only after a verified quote **timestamp** arrives within a proof window (existing doctrine at `tastytrade.ts:181` — keep it).
- **`supportedAssetClasses` stays derived** per the adapter seam. `"future"` in the list only if `isFuturesApproved === true` AND the futures instrument probe returns products. This is the exact D-1 defect I documented in `WM-BROKER-P0-01`; wiring dxFeed does NOT re-introduce it.
- **No order-placement code in this ticket.** DEC-005 boundary stays. This is a **read-only quote-stream** wiring only. Any adapter method that mutates account state remains gated and out of scope.
- **Unavailable feed → render unavailable.** Truth rule §5: if dxFeed WS drops, disconnects, or auth fails, the quote surface reports `unavailable` with the reason. Never silently fall back to a delayed source labeled as live.

---

## Files (Noah)

- `src/lib/tastytrade.ts` — add streamer-credentials + quote subscription (do not touch existing account/lifecycle paths; keep the file's own doctrine intact).
- `src/hooks/useWebSocket.ts` — extend the provider fallback chain to include tastytrade dxFeed. Feed into the existing normalized quote shape.
- **Do NOT** create a parallel `src/lib/brokers/tastytrade.ts` implementing `BrokerAdapter` in this ticket. That refactor is a separate line item on the adapter seam roadmap — sequencing it here would triple the diff and pull in the tastytrade-adapter-refactor blocker.
- **Consider** `src/lib/brokers/types.ts` (the interface I specified) already landed as a contract file only; adding the streaming method (`getQuoteStream?`) to the interface is a small additive change that's fine to include *if* the interface hasn't otherwise landed. If the interface exists, add the streaming method here as an optional to keep the seam evolvable. If not, skip.

## Acceptance evidence Sentinel will check

1. `tsc --noEmit` 0 errors, `vitest` green with new tests below, `next build` clean 69/69.
2. **New tests:**
   - `getTastytradeStreamerCredentials()` returns the shape declared and rejects on 4xx.
   - `subscribeTastytradeQuote()` calls the token endpoint, opens WS, and calls the passed `onQuote` when a real dxFeed quote frame arrives (fixture).
   - Futures streamer symbol resolves from the instrument probe result, not a hardcode.
   - `useWebSocket` uses tastytrade for a futures symbol when the account is entitled + probe returned products; falls through when not.
3. **Live check (Founder is on the tab):** on `/charts`, symbol `/ES` (or the current active futures contract), the top price rail and any subscribed price surface receives a live quote from tastytrade dxFeed, provenance badge reads `tastytrade-dxfeed`. Rail is no longer `+0.00%`.
4. **Sentinel numeric re-verify:** confirm at least one live futures quote timestamp within a proof window (~5 s) matches the current live price on TradingView or another authoritative source.
5. **Regression:** equity quotes on a Yahoo-preferred symbol (e.g. TSLA) still route through Yahoo — no silent takeover.

## Scope discipline

- **Read-only quotes only** — no order placement, no futures trade execution, no account state mutation. Live brokerage order actions remain Founder-gated (DEC-005).
- **Tastytrade only tonight.** IBKR/Schwab/Tradier each need their own §4 verification spike from the adapter seam handoff before their adapter code lands.
- **Do not adopt the full adapter seam refactor into this ticket.** Refactor is separate work with its own coordination cost.
- Cite the audit + adapter seam handoffs in commits.

## Coordination — TWO queue entries observed

The queue has **two `WM-BROKER-QUOTE-P0-01` entries** (one P1 filing at 17:25, one P0 escalation filing). Both point at the same defect. This contract satisfies both. **Sentinel:** please reconcile the queue to a single entry when this ships.

- Assembly-line: contract (this doc) → Noah code → Sentinel verify → next.
- DEC-008 / DEC-012: Forge does not ship this.
- DEC-011: no ping to Founder. Escalate through Nehemiah (dep) or Elias (scope) if blocked.
- Bible §32 (Broker & Execution Architecture), §33 (Futures Architecture) — this contract adheres to both.

**BATON → Noah.**
