# Ledger — 2026-08-16 PM — SF-D01 YahooQuoteObservation implementation

Status: **IMPLEMENTED on isolated branch, NOT MERGED, NOT DEPLOYED. WM NO-GO held.**

## Date / time
2026-08-16, evening CDT shift.

## Starting SHA
`3bd5494796b26c607b4b757755aa32fa5bac9e58` (frozen HEAD; main working tree carried 6 unrelated dirty files from parallel teams — preserved byte-identical throughout).

## Ending SHA
- main: unchanged `3bd5494…` (not touched).
- new branch `sf-d01-yahoo-quote-observation` @ `6f28ff7949f1d2005e15b75e51617ab8b06fd608` (this work; NOT pushed).

## Commits created
- `6f28ff7` feat(sf-d01): YahooQuoteObservation RESOLVED|UNKNOWN truth + wire /api/yahoo quote.

## Subsystem(s) touched
`src/lib/marketData/yahooQuoteObservation.ts` (new), `…/yahooQuoteObservation.test.ts` (new), `src/app/api/yahoo/route.ts` (quote branch).

## Observed failure (before, confirmed in shipping code @ 3bd5494)
`/api/yahoo?type=quote` (a) discarded the real intraday observation timestamp of the chosen live price; (b) stamped every quote with `ts: Date.now()` (server time as observation chronology); (c) had no UNKNOWN state — on a no-trade Sunday it returned `meta.previousClose` with the same server `ts`, so stale meta masqueraded as a live observation. Consumers reading the raw endpoint: `scanner/page.tsx:236`, `paper/page.tsx:261`, `components/layout/TickerTape.tsx`. (The candles branch already carried real timestamps; the canonical publisher `chartMarketStatePublisher.matchingPriceTick` already guards the WS path — the raw yahoo quote endpoint was the unguarded origin.)

## Root cause
Endpoint had only a RESOLVED shape and no observation-time capture; it could not represent "no live observation" and therefore borrowed a clock.

## Exact change made
New pure module: `YahooQuoteObservation = Resolved | Unknown` discriminated union (MarketStateResolution vocabulary; no PARTIAL/STALE member — an old-but-real observation stays RESOLVED with honest `ageMs`).
- RESOLVED: `price, observedAt (real exchange ms, never server/meta), availableAt = max(observedAt,receivedAt), receivedAt, ageMs = max(0,capturedAt−observedAt), fidelity`.
- UNKNOWN: `reasons (nonempty), receivedAt (nullable, transport only)` — structurally NO event/observation-time/availability/age/fidelity fields.
- `buildYahooQuoteObservation(input)`: pure, `capturedAt` injected (no `Date.now` inside). RESOLVED only with a real price AND a real observation timestamp; else UNKNOWN with a reason. Negative/NaN/missing → UNKNOWN.
Route: capture `liveObservedAt = ir.timestamp[i]*1000` for the chosen live price; return `observation` alongside legacy `price`/`ts` (non-breaking); `ts` documented as transport/response time only.

## Tests / build proof
12 new deterministic tests (`yahooQuoteObservation.test.ts`) — anti-borrow (observedAt ≠ capturedAt/receivedAt), age math + skew clamp, availableAt = max, UNKNOWN on no-price and on missing-timestamp, nonempty reasons, nullable receivedAt, RESOLVED receivedAt→capturedAt fallback while observedAt stays real, purity, negative/NaN → UNKNOWN.
Run in an isolated `git worktree` off `3bd5494` (own tsbuildinfo; main tsbuildinfo untouched): **0 prod tsc errors; full suite 542/542** (was 530; +12).

## Deployment state
NOT pushed. NOT deployed. Branch-only. Vercel prod untouched (still whatever main last deployed). LIVE/READY of this change: **NONE by design (WM NO-GO).**

## Supabase / DB state
N/A — no DB work this shift.

## Founder-visible result
None yet in production — the change is branch-only. When merged + a consumer is migrated, a trader viewing a Sunday/closed symbol will see an honest UNKNOWN instead of a stale prior-session number stamped "now."

## Remaining limitations
- Consumers (`scanner`, `paper`, `TickerTape`) NOT yet migrated to read `observation.resolution` — they still read legacy `price`/`ts`. That is a deliberate separate atom.
- Not reconciled against the Drive V1.0.1 spec TEXT (Drive unreachable this session); implemented faithfully from the SF-D01 correction the Founder pasted in chat + the confirmed code defect. A Drive-authorized Sentinel must confirm field-for-field parity against SHA `85a2d431…`.
- Local runtime / desktop / iPad / iPhone: NOT VERIFIED THIS SESSION — no dev server started; endpoint behavior proven only by unit tests over the pure builder, not an end-to-end HTTP hit.

## Anything now duplicate or unnecessary
Nothing removed. The new module is the canonical home for the quote-observation contract; the existing `chartMarketStatePublisher.matchingPriceTick` RESOLVED guard is the reference it mirrors — future work should converge on these two, not add a third.

## Next real dependency for the following team
1. Drive-authorized Sentinel: reconcile `6f28ff7` field-for-field against V1.0.1 spec SHA `85a2d431…` (SF-D01 only; confirm no other V1.0 requirement regressed).
2. On GO: merge branch, then migrate `scanner`/`paper`/`TickerTape` to honor `observation.resolution` (render UNKNOWN honestly), and run desktop visual acceptance.
