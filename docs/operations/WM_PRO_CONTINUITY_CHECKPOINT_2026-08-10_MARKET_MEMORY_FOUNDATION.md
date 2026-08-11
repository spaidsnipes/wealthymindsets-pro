# WM PRO CONTINUITY CHECKPOINT — MARKET MEMORY FOUNDATION

**Date:** 2026-08-10 CDT

**Starting local SHA:** `291ef80ad046ea8b17ec56eaddd7ceefd07ea464`

**Fresh GitHub main:** 12 commits ahead at reconciliation; publish must overlay current remote main, never force-push the stale local clone.
**Supabase project:** `zrzaifaxecwgpfrqctkp`

## Completed and verified

- Extended the remote rights-registry v2 with commercial-use and review-receipt metadata.
- Added the sole rights-gated persistence entry point with explicit results: `PERSISTED_RAW`, `PERSISTED_DERIVED`, `RIGHTS_BLOCKED`, `INVALID`, `DUPLICATE`, `WRITE_FAILED`.
- Added authenticated, same-origin, rate-limited `/api/market-memory/observations`.
- Added private `wm_market_memory` schema with source-rights, append-only canonical observations, and non-payload ingestion receipts.
- Added database-side rights veto and JSON allow-list. Caller-supplied rights cannot authorize a write.
- Hardened durable coverage: service role now has SELECT only; direct INSERT/UPDATE/DELETE/TRUNCATE are denied; the monotonic writer is a fixed SECURITY DEFINER RPC unavailable to public/anon/authenticated.
- Added immutable first-seen receipt table and trigger. `first_recorded_at` is database receipt time; `observed_from` remains a client assertion, not verified historical market evidence.

## Database receipts

- Migration `wm_market_memory_rights_and_append_only_store`: applied successfully.
- Migration `wm_market_coverage_first_seen_guard`: applied successfully.
- Rights table exists: VERIFIED.
- Observation table exists: VERIFIED.
- Ingestion-receipt table exists: VERIFIED.
- Explicit provider policies: `0`.
- Retained observations: `0`.
- Unknown-rights verification: receipt produced, observation count remained zero, transaction rolled back.
- Coverage rows missing `first_seen_at`: `0`.
- New Supabase security-advisor findings from this work: none.

## Test receipts

- `vitest run`: 44 files / 303 tests PASS.
- `tsc --noEmit`: PASS.
- `git diff --check`: PASS.
- `next build --webpack` with ephemeral build-only env placeholders: 71 pages PASS, including `/api/market-memory/observations`.
- Default Turbopack build in the sandbox: BLOCKED by OS process/port permission, not a code failure.

## Truth boundary / do not redo

- Do not create another Canonical Market Observation type. `CanonicalMarketEvent` v2 is the owner.
- Do not insert an ALLOWED source-rights row based only on “free API.” Official provider review found no blanket durable commercial multi-user license.
- Do not call the existing browser coverage summary raw Market Memory. It is durable operational metadata only.
- Do not treat browser-submitted events as globally trusted market truth. Current future observation rows are explicitly `BROWSER_OBSERVED` and owner-scoped; a server collector is still required for server-observed trust.
- The exposed Vercel token pasted in chat must be revoked. It was not used, stored, or committed.

## NOW / NEXT

**NOW:** publish the reconciled overlay on current GitHub main, wait for Vercel READY, then verify the new route returns `RIGHTS_BLOCKED` without retaining an observation.

**NEXT 1:** create a provider-specific written-rights policy for exactly one feed/environment; do not approve broad Nectar.

**NEXT 2:** server-owned collector for that approved feed with heartbeat/reconnect/gap ledger and deterministic event IDs.
**NEXT 3:** fix the verified Smart Money panel occlusion of Big Trades and both WM Profile controls.
