# Doctrine addendum — WM-BROKER-QUOTE-P0-01 tastytrade dxFeed contract

**Extends:** `docs/operations/dispatches/2026-08-02/1745-forge-to-noah-wm-broker-quote-p0-01-tastytrade-dxfeed-contract.md` (in `d6f74e1`, already published — this addendum adds the §7 Doctrine fields; **it does not replace anything**).
**Doctrine reference:** ATH Universal Product Doctrine, §7 Product Architecture Requirements.
**From:** Forge · **Date:** 2026-08-03 · **Repo HEAD:** `7aedde0`
**Time-critical:** futures continuous session live now. Noah's implementation window is tonight.
**Type:** In-flight compliance supplement. No new architecture item pulled.

---

## Core user problem and desired progress
A trader connects tastytrade, sees `quotes: true` in the connection panel, then opens `/ES` on `/charts` and gets… nothing streaming. Just `+0.00%` on the rail. Desired progress: connected tastytrade account produces a live WS quote for `/ES /NQ /GC`, timestamped, provenance-labeled `tastytrade-dxfeed`, rendering on the same chart surface as any other live quote. **This is the difference between "connected" as a label and "connected" as a fact.**

## Resilience and recovery states
- **WS drops mid-session:** provenance badge flips from `tastytrade-dxfeed` to whatever provider takes over (or `unavailable` if none), timestamp of last-known-good is retained. Never a stale price displayed as live.
- **Streamer token expires** (dxFeed session TTL): refresh flow triggers, subscription re-establishes; **the quote pipeline does not go blank during refresh** — hold last-known-good with a "reconnecting" indicator until the new subscription confirms.
- **Account entitlement changes** (user gets or loses futures approval mid-session): capability probe re-runs; if `future` drops off `supportedAssetClasses`, the futures symbols in-view flip to `unavailable` with an honest reason, not to a delayed fallback silently labeled live.
- **Symbol mapping missing** (instrument probe hasn't run or a new contract appears mid-session): subscription request returns `unavailable` with reason `"streamer symbol not yet resolved"`; no fabricated streamer symbol is ever sent.
- **Rollback path:** feature-gate the tastytrade WS path behind a config flag (default OFF). If Sentinel numeric re-verify fails, flip the flag off — no code revert required. Bible §42 environment discipline honored.

## Studio pipeline and definition-of-done
1. **Capture** — dxFeed session credentials from `/api-quote-tokens` (already probed at `tastytrade.ts:202`; result was being discarded — capture it now).
2. **Protect original** — do not modify `getTastytradeCapabilities` doctrine at `:181`; extend, don't rewrite.
3. **Working version** — `getTastytradeStreamerCredentials` + `subscribeTastytradeQuote` + symbol mapping.
4. **Review** — unit tests: creds shape, WS auth handshake, quote frame → normalized shape, symbol resolution derives from probe (never hardcode).
5. **Master** — plug into `useWebSocket` fallback chain; verify provenance badge reads `tastytrade-dxfeed` on futures symbols.
6. **Release** — Sentinel numeric re-verify on `/ES` (or current front-month) against TradingView reference within 5s window.
7. **Archive** — measured latency + observed reconnection behaviour into ticket record for future broker-adapter comparisons.

**DoD:** all 7 complete AND a real futures quote timestamp reaches the chart within a proof window AND equity quotes on Yahoo-preferred symbols still route through Yahoo (no silent takeover).

## KISS primary path and progressive-disclosure map
- **Primary (what the trader sees):** `/ES` renders a live price, ticking, with the same visual treatment as any other live quote. The trader does not need to know dxFeed exists.
- **Progressive disclosure Layer 1:** hovering the provenance badge reveals `tastytrade-dxfeed · live · Xms ago`.
- **Progressive disclosure Layer 2:** the Connect Broker panel shows `Streaming quotes: tastytrade-dxfeed (active)` when the WS is up, `(reconnecting)` during a refresh, `(unavailable — reason)` when down.
- **Explicitly hidden:** dxFeed streamer symbol strings (`/ESU5:XCME`), TTL numbers, subscription counts. Engineering artifacts, not user-facing.

## Jeet Kune Do source synthesis
- **Studied:** tastytrade's own docs on dxFeed streamer symbology and `/api-quote-tokens` semantics.
- **Absorbed:** the streamer-symbol pattern for futures; the probe-then-derive capability discipline already in `tastytrade.ts:181`.
- **Rejected:** hardcoding `"future"` into `supportedAssetClasses` (this is the D-1 defect I documented in `WM-BROKER-P0-01`; do not re-introduce it via the streaming path). Also rejected: preferring tastytrade over already-working providers by default — that's a regression surface, not an upgrade.
- **ATH-added:** the broker-adapter seam (`c1b6af6`) as the eventual destination; the DEC-005 order boundary as an inviolable line even when a streaming API tempts one to "just also submit orders while we're here."
- **Legal/IP boundary:** no tastytrade proprietary code, imagery, terminology, or trademarks embedded. Streamer symbol format is technical fact of the wire protocol; using it to subscribe to a market data stream is not IP.

## WOW moment
Founder opens `/charts`, types `/ES`, sees a live continuous futures quote update in real-time — first time WM Pro has ever shown that on free-tier connectivity. **Doctrine mantra check:** *simple in experience, disciplined in execution, WOW in impact.*

## Truth and evidence labels
- `realTime: null` stays until a verified quote timestamp proves it (tastytrade.ts:181 doctrine).
- Every quote frame carries `source: "tastytrade-dxfeed"` and an `updatedAt` timestamp.
- Provenance badge reflects the actual source of the currently-displayed price. If the WS is down and a delayed source is showing, the badge says so.
- No claim of "streaming" without a live tick within the proof window.

## Accessibility, privacy, safety, human agency
- **A11y:** provenance badge has a text alternative (aria-label with source + staleness); does not rely on color alone.
- **Privacy:** dxFeed credentials stay server-side (existing tastytrade.ts pattern); never inlined into a client bundle.
- **Safety — hard rule:** **no order placement in this ticket.** DEC-005 boundary. Adapter is read-only quote-stream only. If a future ticket adds order-placement, it goes through the paper-first, live-gated pipeline in Bible §32 and requires separate Sentinel + Founder approval.
- **Agency:** the user retains control — they can disconnect tastytrade and the app falls back honestly. No lock-in.

## Failure modes / rollback / export / continuity
- **Failure — WS never authenticates:** capability probe reports `quotes: false` with reason; badge reads `unavailable`; user is told which broker capability is missing.
- **Failure — quote frames arrive but don't normalize:** frames are dropped; `count` counter increments so an ops dashboard sees the drop rate; no partial data reaches the chart.
- **Failure — cross-provider takeover accident** (tastytrade preempts Yahoo on TSLA): regression test in `useWebSocket.test.ts` guards this; if it fires, ship blocked.
- **Rollback:** feature flag flip OFF. No commit revert needed if the flag is respected.
- **Export:** N/A — no user-exported state.
- **Continuity:** existing Alpaca/Yahoo/Finnhub paths untouched; this is additive.

## Metrics for usefulness, quality, completion, retention, trust, learning
- **Usefulness:** live futures quote latency observed <2s from provider timestamp to render.
- **Quality:** unit tests + Sentinel numeric re-verify pass; regression test on TSLA path.
- **Completion:** provenance badge reads `tastytrade-dxfeed` on `/ES` during regular futures hours.
- **Retention:** first-time futures user completes symbol lookup → live quote render without app reload.
- **Trust:** `realTime: null → true` transition is visible and traceable to a real timestamp.
- **Learning:** observed reconnection behaviour + latency measurements become the baseline for future broker-adapter comparisons (Studio archive).

---

## What this addendum does NOT change
- Endpoint contract, symbol-mapping rule, `useWebSocket` wiring, and acceptance criteria from the original contract are authoritative.
- Broker adapter seam (`c1b6af6`) remains the eventual destination; this ticket wires into it but doesn't refactor the full seam.
- DEC-005 order boundary stays.
- Two-entry queue collision on WM-BROKER-QUOTE-P0-01 is Sentinel's to reconcile.

## Coordination
- Cite the original contract AND this addendum in commits.
- DEC-011: no ping to Founder. DEC-008/DEC-012: Forge does not ship.
- Bible §32 (Broker & Execution Architecture) and §33 (Futures Architecture) compliance baked in.
- Assembly-line: awaiting Noah implementation → Sentinel verify → next.
