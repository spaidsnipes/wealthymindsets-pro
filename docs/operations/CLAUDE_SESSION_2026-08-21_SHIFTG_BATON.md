# CLAUDE SHIFT-G BATON — 2026-08-21 (P0 wiring: ATHOS AI Gateway + EnvRegistry)

**Governing authority:** the 3-hour P0 execution directive (WIRING / TRUTH /
EXECUTION) + Founder broker/AI canon. Branch work, NOT merged to main (main is
the parallel teams' active trunk; merge is the founder's call under NO-GO).

## Handoff header

- **Base SHA:** `991e350` (current origin/main at shift start)
- **Branch:** `shiftg-athos-ai-gateway` @ `14ca981` (pushed to origin)
- **Commits this shift:** 4 code
- **Suite:** 783 (shift-F) → main-baseline → **814 / 108 files** (+39 new tests this shift)
- **tsc --noEmit:** clean throughout
- **Production build:** clean on every commit (worktree, APFS-cloned node_modules + gitignored .env.local copied)
- **Destructive git ops:** zero. Force-push: zero. Secret touched/printed: zero. Broker/Supabase mutation: zero.
- **Preservation:** live team's dirty files (heatmaps/HeroTruth/WhyInspector/heroTruthChronology + __fixtures__) byte-identical — none touched.

## SHIFT HANDOFF / PREVIOUS TEAM RECOVERY (per rule)

**What shift-F completed correctly (KEEP):** canonical `BrokerAdapter` interface,
adapter registry, webull/alpaca/tastytrade health wrappers, `/api/broker/status`
4-provider aggregate, `selectMateriality`. All tested, contract-compliant, no
secret leaks. **DID NOT rebuild any of it.**

**What was left incomplete → CONTINUE (picked up this shift):** shift-F's own
top-3 next targets. #1 (AI gateway) and #3 (env) done this shift; #2 (Alpaca
order lifecycle) deliberately deferred — see blockers.

**Duplicates found:** the `/api/broker/status` gemini tile inlined its own env
check ("ATHOS Gateway wrapper is a future atom") AND four server routes each
inlined the same NEXT_PUBLIC_* provider-key fallback. Both **MERGED** to single
canonical sources this shift.

**Incorrect/unsafe:** none found. No ROLL BACK needed.

## Four breakthroughs

1. `6431d2d` **ATHOS AI Gateway** — canonical `AIAdapter` interface (mirror of
   BrokerAdapter) + `geminiAdapter` #001 with a real non-streaming `complete()`
   (injectable fetch) + registry + `athosGateway` (athosComplete/athosHealth/
   athosConfiguredCount). `/api/broker/status` gemini tile delegates to the
   adapter. 21 tests. Closes P0 "ONE ATHOS AI Gateway."
2. `17c613f` **EnvRegistry** (`src/lib/env/providerKeys.ts`, previously 0 files)
   — pure resolver (prefer server key, transitional public fallback, report
   source) + warn-once runtime (value never printed). 4 server routes
   (finnhub/market/fmp/symbol-search) centralized off inline NEXT_PUBLIC_*
   fallbacks. 8 tests. Behavior-preserving (no prod break before Vercel
   rotation). Closes P0 "Finish EnvRegistry / eliminate mystery env usage."
3. `1306fb2` **status auto-expand** — `/api/broker/status` AI section is now
   `athosHealth().map(...)`; every registered AIAdapter auto-appears. Adding an
   AI provider = one registry line, no aggregate edit (brokers' guarantee
   extended to AI).
4. `14ca981` **openrouterAdapter #002** — completes gateway scope
   (Gemini/OpenRouter). ORGANISM PROOF: one adapter file + one registry line →
   auto-appears in status + routable via athosComplete, ZERO gateway/aggregate
   edits. Activation is one Vercel var (OPENROUTER_API_KEY) away. 10 tests.

## Env survey (P0 "eliminate mystery env")

Beyond the 3 provider keys centralized, the remaining `NEXT_PUBLIC_*` reads in
server routes are Supabase project URL + site/app URLs + LiveKit URL — all
legitimately-public identifiers, NOT secrets. Twelve Data / BigData / Alpha
Vantage: no code references. Env-truth P0 is substantially complete.

## Canonical contract check (P0 "Prove one Canonical Quote/Bar/Trade/Depth")

`CanonicalMarketEvent` (src/lib/marketData/marketEvent.ts) + `MarketEventType`
(TRADE/QUOTE/BAR/DEPTH/...) already exist and are guarded (MarketEventGuard +
quarantine). The canonical ingest contract EXISTS — not duplicated. Downstream
domain shapes (markov Bar, pine OHLCVBar, paperTrade Trade) are separate concerns.

## Blockers (real, external — per directive)

- **Alpaca order lifecycle migration (shift-F target #2): BLOCKED** on (a) an
  ambiguous credential model — `/api/broker/alpaca` takes browser-supplied
  `{key,secret}` while the adapter contract expects env/session auth; resolving
  this is a security-sensitive product decision (does WM store broker secrets
  server-side per user?); and (b) collision risk — the live team is on
  `AlpacaTradingPanel.tsx`, which the shift-F baton explicitly deferred around.
- **Broker live certification (Webull/tastytrade/Alpaca): BLOCKED** on real
  credentials + manual OAuth authorization (external).

## Top 3 next targets

1. **Resolve the broker credential model** (product decision) → then migrate the
   Alpaca account read + order lifecycle behind `alpacaAdapter`.
2. **Prove one Canonical Broker State** — a pure selector composing
   CanonicalAccount + positions + open orders across adapters, with honest
   empty/UNKNOWN until the adapters are wired. Testable without live creds.
3. **anthropic/xai AIAdapters** only if/when those keys get wired (avoid
   speculative stubs — organism already proven with 2 adapters).

**MISSION STATUS = ACTIVE / CONTINUATION REQUIRED.**
