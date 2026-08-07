# WM-BROKER-QUOTE-P0-01 · Broker-Agnostic Streaming-Quote Pipeline · ARCHITECTURE CONTRACT (Forge)

**From:** Forge (Principal Architect) · **Date:** 2026-08-03 · **Repo HEAD:** `bc1404a`
**Type:** Architecture contract — the *shape* every broker's streaming-quote path must take. Not tastytrade-specific.
**Milestone:** M2 (per "WM Pro — Next 10 Milestones Assembly-Line Plan — 2026-08-03 10:15 CDT", Drive `1FL12CqB8cImTwu7B5mc_xFsxdyoPX0RrzdNOlMonwxo`).
**Doctrine:** ATH Universal Product Doctrine (LOCKED, Drive `1kgOhR4702FT-bb1rc-5Z4rjcn-sDTJZzBV16jHXALZg`) — §7 fields marked ★ throughout.
**Bible anchors:** §32 Broker & Execution Architecture, §33 Futures Architecture.
**Related, not duplicated:**
- `docs/operations/handoffs/forge/2026-08-01-forge-broker-adapter-architecture.md` (`c1b6af6`) — order/account/position seam. Streaming was out of scope there; this contract extends it.
- `docs/operations/handoffs/forge/2026-08-02-forge-wm-data-p0-01-quote-pipeline-audit.md` (`efe4bec`) — the audit that filed this ticket.
- `docs/operations/dispatches/2026-08-02/1745-forge-to-noah-wm-broker-quote-p0-01-tastytrade-dxfeed-contract.md` (`d6f74e1`) — the first *concrete* implementation (tastytrade dxFeed), validates the seam.

**Assembly-line rule preserved:** publishing this contract does not pull a new architecture item — it *is* my Milestone-2 in-flight item. Noah's baton on the tastytrade dispatch stands; this architecture is what future broker paths will implement against.

---

## ★ Core user problem and desired progress

Today every "streaming quote" in WM Pro is bespoke: Alpaca has a Railway proxy, Yahoo is REST-only polled, Finnhub is REST-only polled, tastytrade has dxFeed **capability probed but no consumer**. Each new streaming broker would reinvent authentication, subscription, provenance labeling, reconnection, symbol mapping, and honesty rules — and each would be a fresh place to accidentally claim `realTime: true` without proof.

**Desired progress:** one contract every broker's streaming path implements. Provenance-labeled, staleness-aware, honestly-reconnecting, symbol-mapped per contract, and safe against silent takeover of a working provider. Traders see the same visual treatment on every quote; engineers add a new broker without inventing the pipeline again.

## ★ Truth and evidence labels (the doctrine that guards the seam)

Every streaming quote emitted through this pipeline carries:

- **`source`** — a stable identifier (`"tastytrade-dxfeed"`, `"alpaca-ws"`, `"coinbase-ws"`, …). No aliasing, no "current" — the actual source.
- **`updatedAt`** — epoch ms of the tick the provider stamped, or the client receive-time if the provider omits one; the contract carries which.
- **`stampedByProvider: boolean`** — whether the `updatedAt` came from the provider or from receive-time.
- **`staleness`** — `"live"` (last tick < staleness budget), `"stale-Nms"` (last tick > budget but < connection-cutoff), or `"unavailable"` (connection down or budget exceeded).
- **`realTimeProven: boolean`** — flips from `false` to `true` only after a stamped quote arrives within the proof window. **Never asserted at capability probe.** This preserves the existing tastytrade doctrine at `tastytrade.ts:181`.
- **`assetClass`** — `"equity" | "option" | "future" | "crypto" | "fx"`. Not decorative — Bible §33's contract-specific mapping depends on it.
- **`instrumentKey`** — for futures, the resolved contract (e.g. front-month `/ES` right now maps to a specific expiration + streamer symbol; the pipeline carries which). Never conflate continuous with executable.

**Consequence:** provenance badges (shipped at `a223fc5`, `fd12f1e`) render truthfully because they read these fields directly. Nothing in the pipeline gets to display a source it didn't emit.

---

## ★ The contract — extend `BrokerAdapter` with a streaming-quote surface

**Extends:** `src/lib/brokers/types.ts` (introduced by `c1b6af6`) — additive, does not break existing adapters.

```ts
export type QuoteStaleness =
  | { kind: "live"; ageMs: number }
  | { kind: "stale"; ageMs: number; overBudgetBy: number }
  | { kind: "unavailable"; reason: string };

export interface Quote {
  source: string;                    // stable id, e.g. "tastytrade-dxfeed"
  symbol: string;                    // as requested by the caller (canonical)
  instrumentKey?: string;            // provider-specific (streamer symbol, dxFeed key, etc.)
  assetClass: AssetClass;
  bid?: number;                      // may be absent depending on entitlement
  ask?: number;
  last?: number;
  size?: number;                     // last size in the provider's unit; see canonical-unit note below
  volume?: number;                   // session volume in the provider's unit
  updatedAt: number;                 // epoch ms — provider timestamp if available
  stampedByProvider: boolean;
  staleness: QuoteStaleness;
  realTimeProven: boolean;
}

export interface QuoteSubscription {
  onQuote(cb: (q: Quote) => void): () => void;   // returns unsubscribe
  onStatus(cb: (s: QuoteConnectionStatus) => void): () => void;
  close(): void;
}

export type QuoteConnectionStatus =
  | { kind: "connecting" }
  | { kind: "open"; sessionId: string; since: number }
  | { kind: "reconnecting"; attempt: number; lastError?: string }
  | { kind: "closed"; reason: string; retryable: boolean };

/** Extension. Optional so existing BrokerAdapter impls compile unchanged. */
export interface BrokerAdapter {
  // ...existing fields from c1b6af6...
  getQuoteStream?(opts: {
    symbols: string[];
    assetClass: AssetClass;
    /** Proof window for `realTimeProven` flip, in ms. Default 5000. */
    provenWithinMs?: number;
    /** Staleness budget. Default 3000 for equity/futures, 5000 for crypto. */
    stalenessBudgetMs?: number;
  }): Promise<QuoteSubscription>;

  /** Symbol resolution — Bible §33 contract-specific mapping. */
  resolveInstrumentKey?(canonicalSymbol: string, assetClass: AssetClass): Promise<string | { unavailable: string }>;
}
```

**Rules baked into the seam:**
- `getQuoteStream` is **optional** on `BrokerAdapter` so existing adapters (Alpaca proxy, paper) compile untouched. Only brokers with real streaming implement it.
- `resolveInstrumentKey` is **optional and required-for-futures**. When `assetClass === "future"`, calling `getQuoteStream` without a resolved key must return `unavailable` with a reason — **never fabricate a streamer symbol**. This closes the D-2 defect I documented in `WM-BROKER-P0-01`.
- `realTimeProven` starts `false` and flips only after a stamped quote arrives within `provenWithinMs`. Consumers read `realTimeProven`, not the capability probe, when deciding whether to render "LIVE" badges.
- Multiple adapters may all offer a stream for the same symbol. **The fallback layer decides which one wins per (symbol, assetClass)** — the adapter never assumes it's the primary.
- **No adapter may `close()` another adapter's subscription.** Each adapter owns its own resources.

---

## The fallback layer — where multi-broker coordination lives

**New file (contract only, Noah authors):** `src/lib/quotePipeline.ts`.

Purpose: given a set of `BrokerAdapter`s and a request `{symbols[], assetClass}`, produce a single normalized `Quote` stream per symbol, respecting per-asset-class provider preferences and honest fallback.

```ts
export interface QuotePipeline {
  subscribe(symbol: string, assetClass: AssetClass): {
    onQuote: (cb: (q: Quote) => void) => () => void;
    onStatus: (cb: (s: QuotePipelineStatus) => void) => () => void;
    close: () => void;
  };
}

export type QuotePipelineStatus = {
  primary: string | "none";              // source id of currently-serving adapter
  candidates: Array<{ source: string; status: QuoteConnectionStatus }>;
  reasonNoPrimary?: string;              // when primary === "none"
};
```

**Per-asset-class preference order** (default; Founder-overridable by user config, never silently mutated):

| Asset class | Preferred order (first alive wins) |
|---|---|
| `equity` | tastytrade-dxfeed → alpaca-ws → yahoo-rest → finnhub-rest |
| `option` | tastytrade-dxfeed → (no fallback until an options-quote adapter lands) |
| `future` | tastytrade-dxfeed → (no fallback until a futures adapter lands) |
| `crypto` | coinbase-ws → binance-ws → kraken-ws → alpaca-crypto-ws → yahoo-rest |
| `fx` | (no adapter yet — pipeline returns `unavailable` with reason) |

**Rules the fallback layer enforces:**
- Primary is the first adapter whose stream is `open` AND has emitted at least one quote whose `realTimeProven` is true.
- **No silent takeover** of a working provider: if the primary is producing quotes with `staleness: "live"`, a lower-preference adapter must not preempt it merely because it happens to be up. Preemption only when the current primary drops to `stale` beyond budget or `unavailable`.
- **Cross-provider preemption is a state event** — subscribers get an `onStatus` callback so the UI can flash a provenance change instead of silently swapping data.
- The pipeline never fabricates a fallback: if no adapter is `open` and proven, `Quote` emissions stop and status carries `reasonNoPrimary`.

---

## ★ Resilience and recovery states

The pipeline is the single place these are handled — adapters just report events, the pipeline turns them into user-visible states.

| Event | Pipeline response | User-visible state |
|---|---|---|
| Primary WS drops | flag `reconnecting`, keep last quote with `staleness: "stale-Nms"`; do NOT switch to a lower-preference source until budget exceeded | badge: primary source, "reconnecting" annotation |
| Primary WS drops beyond budget | preempt with next preference; if none proven, `Quote` emissions pause | badge: new primary source OR "unavailable — reason" |
| Streamer token expires (broker-specific) | delegate to the adapter's `reconnect()`; hold last quote as `stale`; do not blank | badge: same source, "reconnecting" annotation |
| Entitlement changes (e.g. futures access revoked mid-session) | capability re-probe on next subscription cycle; if `assetClass` no longer supported, drop that symbol's subscription with `unavailable` + honest reason | badge: "unavailable — account not entitled for futures" |
| Symbol mapping missing (futures instrument probe not run yet) | `Quote` emissions never start; status carries `reasonNoPrimary: "streamer symbol not resolved"` | banner: "instrument mapping required" |
| App tab returns from background | re-issue subscriptions from persisted state; recovery within one proof window | badge: brief "reconnecting" then normal |
| Full connectivity loss | all adapters go `closed`; pipeline pauses; on network return, adapters reconnect via their own logic | banner: "offline — no live quotes" |

**Rollback path:** the pipeline is feature-gated behind `NEXT_PUBLIC_QUOTE_PIPELINE` (default: off during rollout, on after Sentinel APPROVE). Flipping the flag off reverts to the current bespoke behaviour with zero code change. No schema, no persisted state, no user config migration.

---

## ★ Studio pipeline and definition-of-done

Following the Doctrine's Capture → Protect Original → Organize → Diagnose → Working Version → Review → Master → Release → Archive → Reuse Lessons:

1. **Capture:** interface added to `src/lib/brokers/types.ts` as optional; existing adapters continue to type-check.
2. **Protect original:** no changes to `useWebSocket.ts` in this step. Pipeline lives beside it initially, migrations follow ticket-by-ticket.
3. **Organize:** `src/lib/quotePipeline.ts` + `src/lib/brokers/streamingRegistry.ts` (Noah authors). Preference table is a plain module export, not runtime configuration soup.
4. **Diagnose:** each broker's streaming implementation gets a §4 verification spike (see below) *before* it plugs in.
5. **Working version:** tastytrade dxFeed lands first (per my `d6f74e1` dispatch), proves the seam.
6. **Review:** pure-logic tests on the pipeline (preemption timing, honest silence when no primary proven, staleness transitions). No live WS in unit tests — deterministic fixtures only.
7. **Master:** side-by-side check against TradingView on the same symbol; latency + preemption logs recorded.
8. **Release:** feature flag on after Sentinel numeric re-verify.
9. **Archive:** the preference table + measured latencies become the reusable baseline for future broker additions.

**DoD:** interface merged, one concrete adapter (`tastytrade-dxfeed`) implements it, pipeline live-tested on `/ES` with correct provenance badge, TSLA equity path unchanged, feature flag defaults to on only after Sentinel APPROVE.

---

## Per-broker verification spike (before any adapter plugs into the pipeline)

Same discipline as `WM-CHART-P0-01A`. For every candidate broker's streaming path, record measured evidence before implementation:

| Field | tastytrade-dxfeed | alpaca-ws | coinbase-ws | (future broker) |
|---|---|---|---|---|
| Auth model | (probe: token endpoint + TTL) | already known | already known | — |
| Provider timestamp presence | (probe) | (probe) | (probe) | — |
| Symbol-mapping surface (equity/futures/crypto) | (probe: instrument endpoint) | already known | already known | — |
| Observed reconnection behaviour | (probe: kill-and-restore test) | (probe) | (probe) | — |
| Rate/quota | (docs + probe) | already known | already known | — |
| Entitlement tie to account state | (probe: entitled vs non-entitled account) | already known | n/a | — |
| Legal/T&C: 3rd-party app streaming permitted | (verify) | already covered | already covered | — |

Cells reading `already known` cite the source. No cell asserted `supported` without a measurement or a cited source.

---

## ★ KISS primary path and progressive-disclosure map

- **Primary (what the trader sees):** a live-updating quote number with a provenance badge. That's it.
- **Layer 1 (hover badge):** source id + staleness + proof status ("tastytrade-dxfeed · live · 42ms ago"; or "yahoo-rest · delayed 15m").
- **Layer 2 (Connect Broker panel):** streaming-status card per adapter — connecting / open / reconnecting / closed with reason.
- **Layer 3 (advanced settings, if we ever expose):** per-asset-class preference override, staleness budget tuning.
- **Never exposed to the user:** streamer symbol strings, TTL numbers, adapter class names. Engineering artifacts.

---

## ★ Jeet Kune Do source synthesis

**Studied (real brokers with real streaming, docs + observed behaviour):**
- tastytrade (dxFeed session model, streamer symbology, per-account entitlement checks).
- Alpaca (WebSocket auth, aggregate vs trade streams, plan-tier limits).
- Coinbase / Kraken / Binance (crypto exchange WS models — public + user-scoped channels).
- Interactive Brokers (session model + market-data subscription lifecycle — studied, not built).
- Schwab / Tradier (OAuth + streaming — studied, spike-gated).

**Absorbed principles:**
- Explicit proof window before a `realTime: true` claim (tastytrade doctrine).
- Provider-timestamped quotes vs receive-time — carry which (dxFeed, IBKR).
- Streamer-symbol vs canonical symbol separation for futures (dxFeed — Bible §33 alignment).
- Reconnect with exponential backoff + connection-status events (all major brokers converge here).
- Multi-account entitlement re-probe on capability change (Alpaca + tastytrade).

**Rejected:**
- Silently preferring one broker over another mid-session because it's faster (a form of takeover; sacrifices predictability for microseconds).
- Hardcoding `supportedAssetClasses` (the D-1 defect I documented in tastytrade).
- Blending quotes from multiple brokers into a synthetic "consensus" price (a common competitor shortcut; violates truth rule §5 — the user sees a number that no broker actually reported).
- Client-side symbol-mapping tables that duplicate broker-side truth (rots; forces re-releases whenever brokers add contracts).
- Making `getQuoteStream` mandatory on the adapter interface (would break paper + Alpaca proxy adapters, and force fake-streaming stubs — worse than an honest opt-in).

**ATH-added:**
- The single `QuotePipeline` fallback layer with **per-asset-class preference tables** — no other broker platform we studied normalizes fallback this way across equity/futures/crypto in one API.
- **`realTimeProven` as a first-class field on every quote** — not a session-level bit, a per-quote assertion carried into the UI.
- The **no-silent-takeover rule** — cross-provider preemption is a state event with a visible reason, not a silent swap.
- **Feature-flag-first rollout** so the pipeline can be reverted without a code change during any live-market window.

**Legal / IP boundary:**
- No broker's proprietary code, symbology, imagery, terminology, trademarks, or trade dress embedded. The streamer-symbol format we consume is a technical fact of the wire protocol; consuming it to subscribe to a market data stream is not IP.
- Preference-order table is our own product decision, not adopted from any competitor's public UX.

---

## ★ WOW moment

Founder opens `/charts`, types `/ES`, sees a live continuous futures quote update in real-time with a `tastytrade-dxfeed` provenance badge. Behind that single tick sits an interface that made it *additive* to plug tastytrade into a pipeline that will also carry Alpaca / Coinbase / Kraken / any future broker — without re-inventing the pipeline for each. **Doctrine mantra check:** *simple in experience, disciplined in execution, WOW in impact, formless in learning.*

---

## ★ Accessibility, privacy, safety, human agency

- **A11y:** provenance badge carries a text alternative (aria-label with source + staleness); connection-status changes announce to screen readers as polite live-region updates; does not rely on color alone (icon + text).
- **Privacy:** all broker credentials stay server-side per existing pattern (`tastytrade.ts` auth flow); never inlined into client bundles. Per-quote provenance identifies the *source*, not the user account.
- **Safety — hard rule:** **no order placement in this contract.** DEC-005 boundary preserved. `getQuoteStream` is a *read* operation. Any future adapter method that mutates account state must go through paper-first, live-gated (Bible §32) and stay Founder-gated.
- **Agency:** users can override per-asset-class preferences (Layer 3), can disconnect any broker, can toggle the feature flag. Nothing about the pipeline creates lock-in — an adapter can be removed without touching consumer code.

---

## ★ Failure modes / rollback / export / continuity

- **Failure — adapter reports `open` but never emits a proven quote:** pipeline never promotes it to primary (`realTimeProven` never flips). Subscribers stay on lower-preference or `unavailable`.
- **Failure — cross-provider takeover accident:** regression test in `quotePipeline.test.ts` guards this; if it fires, ship blocked.
- **Failure — symbol mapping missing on futures:** subscription silently returns `unavailable` with reason. Never fabricates a streamer symbol.
- **Rollback:** feature flag `NEXT_PUBLIC_QUOTE_PIPELINE=off` → reverts to pre-pipeline behaviour without code change.
- **Export:** N/A — no user-exported state added.
- **Continuity:** existing bespoke providers (Yahoo REST, Finnhub REST, Alpaca proxy) continue to function; pipeline is additive.

---

## ★ Metrics for usefulness, quality, completion, retention, trust, learning

- **Usefulness:** live futures quote latency (source-stamp → render) observed < 2s p95.
- **Quality:** unit tests + Sentinel numeric re-verify pass; TSLA equity regression test on Yahoo path green.
- **Completion:** interface merged; one concrete adapter implements it; provenance badge reads correctly for that adapter's symbols.
- **Retention:** first-time futures user completes symbol lookup → live quote render without app reload.
- **Trust:** `realTimeProven` transitions are visible in the UI; users can hover to see why a badge says what it says.
- **Learning:** per-broker latency + reconnection numbers archived in the ticket record for future broker-adapter comparisons (Studio archive).

---

## Acceptance evidence Sentinel will check

1. `tsc --noEmit` 0 errors; `vitest` green with new pipeline tests; `next build` clean 69/69.
2. `src/lib/brokers/types.ts` extended with `getQuoteStream` + `resolveInstrumentKey` optionals; existing `BrokerAdapter` implementations compile unchanged.
3. `src/lib/quotePipeline.ts` created; pipeline unit tests cover: no-silent-takeover, honest silence when no primary proven, staleness transitions, futures unavailable when instrument mapping missing.
4. Per-asset-class preference table matches the table in this contract.
5. **Live evidence:** `/ES` on `/charts` renders a live quote via `tastytrade-dxfeed`; provenance badge reads correctly; TSLA equity quote still routes through Yahoo (no silent takeover).
6. `realTimeProven` observed transitioning `false → true` within the proof window on a real futures quote; badge updates visibly.
7. Feature flag `NEXT_PUBLIC_QUOTE_PIPELINE=off` reverts to pre-pipeline behaviour with zero code change.

---

## Scope discipline

- **This contract adds no new broker.** Adapter code for IBKR / Schwab / Tradier remains Founder-scope-gated and spike-gated per `c1b6af6` §4.
- **This contract executes no trade.** DEC-005 boundary stays.
- **This contract does not migrate `useWebSocket.ts`.** That's ticket-by-ticket work after the pipeline is proven with tastytrade.
- **Cite this handoff in commits.** Note when a change is contract-level (this doc) vs implementation-level (a broker-specific dispatch).

## Coordination

- **Downstream unblock:** M6 (Noah — WM-BROKER-P0-01-A tastytrade futures wiring). Futures market is open now; this contract is what M6 implements against.
- **Related in-flight:** the tastytrade dispatch at `d6f74e1` remains Noah's baton; this architecture contract is the *shape* he's implementing against.
- **Doctrine addenda** (`e768558`) supplement the tastytrade dispatch; they do not replace this contract.
- **Assembly-line:** contract (this doc) → Noah implements tastytrade adapter to this interface → Sentinel verifies → next broker gets its own spike + dispatch.
- **DEC-011:** no ping to Founder. Escalate through Nehemiah (dep) or Elias (scope) if blocked.
- **DEC-008 / DEC-012:** Forge does not ship this. Interface + tests + first adapter are Noah's.

**BATON → Noah** for M6 tastytrade adapter implementation against this contract. This handoff plus the `d6f74e1` dispatch and the `e768558` Doctrine addendum are together the full spec.
