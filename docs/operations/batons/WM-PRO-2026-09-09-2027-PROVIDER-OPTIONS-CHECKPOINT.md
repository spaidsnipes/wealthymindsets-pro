# WM Pro provider/options checkpoint — 2026-09-09

Append-only evidence receipt. This file does not authorize an order, provider credential change, database/auth mutation, or release-certification claim.

## Window and actual work

- Founder-requested window: 2026-09-09 20:27–23:27 America/Chicago.
- Material work observed in this task: Drive/canon reconciliation, provider canaries, two scoped implementation slices, independent review, full-tree verification, push, Cloudflare build binding, and local/host browser verification.
- The window included tool/session interruptions; elapsed wall time is not represented as three continuous hours of execution.

## Authority delta applied

The 2026-09-09 Drive refresh covered the current WM Company Bible, WM Current Project Brief, WM Build Order, Transformation Visual Contract, ATH Master Bible, AI Team Sync Launch Board, ATH Canon Index, ATHOS manual, Universal Product Doctrine, and Founding Execution Contract. The governing execution order used here was browser-first, SOURCE → SYSTEM → HUMAN, exactly one current slice, fail-closed provider truth, and no fake data. The MTO twelve-gate standard remains open; this receipt closes no release gate by itself.

## Exact source identity

- Branch: `main`
- Candidate HEAD: `6930501163732944940e251deed49953615ec639`
- Cached `origin/main`: `6930501163732944940e251deed49953615ec639`
- Previous slice: `2ae26589b1b258c307960f218c663057e5f1dc1b` (`feat(webull): expose signing canary in broker drawer`)
- Current slice: `6930501163732944940e251deed49953615ec639` (`feat(options): source Alpaca indicative chain`)

Selected current-slice file hashes:

- `src/app/api/market-data/alpaca/options/route.ts`: `16641ec499a7e03184a604651a4a0e4cbb82a72700559de70c2b8cd2981f69ab`
- `src/lib/marketData/alpacaOptionChain.ts`: `3f5ba46c2ab088ea352bb59d48a9e1c49d122a65acfe54489c17cbccaabc472e`
- `src/lib/optionsChainRead.ts`: `4f82269d5bdd6b3af635ada87b4f918f8e971fb1bba0877d27ec1fe7959984f8`
- `src/components/chart/OptionsChain.tsx`: `1bcc6ef7dc3b62393a99462173c2db20341635c802f1b2da4ba416e70f008197`
- `src/components/chart/OptionExpressionIntent.tsx`: `6d758b1ef3b7323a627d9156ceeb5937ec6965e5c91581a289cd6d0e42286733`

## What changed

1. Webull now exposes explicit read-only signing canaries for the legacy SHA-1 and SDK-compatible SHA-256 profiles. There is no automatic fallback or order action, and only sanitized receipts are shown.
2. WM Pro now has an authenticated read-only Alpaca indicative-options route and a strict normalizer for contract identity, quote/trade timestamps, bid/ask sizes, implied volatility, and Greeks.
3. The options scene no longer falls back to FMP. Missing fields remain missing; latest trade size is not mislabeled as volume; open interest and volume remain absent when the source does not provide them.
4. Source, fidelity, and provider timestamp now travel through contract selection into the visible and persisted expression receipt. Unknown/incomplete provenance is rejected.

## Verification actually run

- Focused current-slice tests: 54/54 passed.
- Full repository tests: 483 files / 5,358 tests passed.
- TypeScript: passed.
- Webpack production build: passed; existing Next middleware warning retained.
- Independent Sentinel review: APPROVE after authentication-before-provider-access and end-to-end provenance defects were corrected.
- Cloudflare build: `bf041157-d6cb-4402-afd0-7a0852a15786`, build duration 2m38s, bound in the dashboard to exact commit `6930501163732944940e251deed49953615ec639` and completed through deploy.
- Production browser: `https://wealthymindsetspro.com/charts`, Options selected after a fresh reload. The exact candidate renders `PROVIDER ERROR · The options-data service returned an error. No contracts were accepted.` and `This error does not prove an entitlement restriction.`
- Production console: no WM application errors observed in the checked error/warn set; visible warnings came from a browser extension content script.
- Local browser: the same Options scene rendered `AUTH BLOCKED` and explicitly stated that entitlement was not established.

## Provider truth at checkpoint

- Alpaca indicative chain: code and production route are deployed, but the current hosted provider request returns a provider error. Receiving/connected/live/executable is **not** proven.
- Alpaca local lane: current credentials were rejected with HTTP 401. Connected is **not** proven.
- Webull local lane: both explicit signing profiles returned entitlement-blocked receipts during the local canary. One bounded receipt is not a streaming/live claim.
- Webull hosted lane: both explicit signing profiles returned authentication-blocked receipts. Host and local are not equivalent.
- Webull connector: a prior fresh call returned an internal error; no current live connector claim is made.
- Longbridge connector: bounded TSLA/SPY quote receipts were observed, but WM Pro's Longbridge bridge remains unconfigured.
- Supabase project `zrzaifaxecwgpfrqctkp`: ACTIVE_HEALTHY was observed; no DB/auth mutation was performed.

## Preserved unrelated state

The pre-existing modified/untracked baton, indicator-description, claims-test, scratchpad, and earlier checkpoint paths were not staged, rewritten, cleaned, deleted, or absorbed. Therefore the working tree is intentionally not described as clean.

## Open gates and NEXT

NOW is sealed: exact candidate `6930501` is pushed, independently reviewed, built by Cloudflare, and verified in production with an honest provider-error scene.

NEXT: diagnose the hosted Alpaca provider error without printing or mutating secrets; compare accepted binding names and sanitized upstream status, then obtain an action-time credential decision if a value change is actually required. After a valid source receipt, prove timestamp freshness and chain identity before any `receiving`, `live`, or `connected` claim.

AFTER: certify an executable options source (OPRA or provider-equivalent) separately from Alpaca's indicative reference feed; then bind brokerage support, buying power, order preview, protection, reconciliation, recovery, multi-device parity, and Founder-use proof. No MTO or release closure is claimed.
