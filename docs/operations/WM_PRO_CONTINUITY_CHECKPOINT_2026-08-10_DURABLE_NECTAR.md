# WM PRO CONTINUITY CHECKPOINT — DURABLE NECTAR

**Date:** 2026-08-10  
**Code SHA:** `5d8688178434ec8da7c7f7c792d5b0b72f0c78ef`  
**Production deployment:** `dpl_4tmNyzEQ5Y2CVicpys4K2ArTKbHf` (`READY`)  
**Supabase migration:** `20260810180544_wm_market_coverage_checkpoints`

## Verified outcome

WM operational Nectar coverage is now server-durable and authenticated. It no longer depends solely on browser localStorage.

- Before reload: BTC `OBSERVED`, Seen `2,204`.
- After reload: Seen recovered at `2,304`, then advanced to `2,352` and `2,847`.
- Later Supabase receipts advanced from `2,848` to `3,103`.
- UI explicitly reported `server-durable summary` after hydration.
- Accepted equaled received; quarantined and unsupported remained zero.
- Authenticated production GET/POST checkpoint requests returned `200`.
- No `/api/market-memory/coverage` runtime errors occurred in the final 30-minute check.
- Founder chart restored to TSLA; no order/account mutations occurred.

Visual receipt: `outputs/wm-5d86881-durable-memory-proof-2026-08-10/README.md`.

## Security and truth boundary

- The ledger stores operational coverage facts only: instrument/channel identity, earliest/latest observation times, cumulative counts, gaps, fidelity, collection scope and rights-policy identity.
- It does not store price, size, raw payloads, event IDs, orders, positions or account data.
- Anonymous and authenticated Data API roles have no table access. Only the WM server service role has CRUD access after WM session verification.
- Concurrent tabs merge with `least`/`greatest`; a stale tab cannot move durable history backward.
- Raw/derived provider Market Memory remains blocked until provider-specific rights are reviewed and explicitly allowed.

## Proof bundle

- Vitest: 43 files / 292 tests PASS.
- TypeScript: PASS.
- Next webpack production build: 70 routes PASS.
- Supabase atomic write/read/delete smoke test: PASS with no test row retained.
- Supabase security advisor: no new checkpoint-ledger finding.
- Existing unrelated warnings remain: leaked-password protection disabled and Passport handoff RLS-without-policy.
- Existing unrelated runtime defect remains: Resend login-alert sender domain is unverified.

## Next safe build order

1. Provider rights registry v2 with explicit collect/display/raw/derived/redistribute/train decisions.
2. Server-owned collector heartbeat, reconnect and durable gap ledger.
3. Lawful event/aggregate persistence only for explicitly allowed feeds.
4. Canonical Market State consumed by chart, profiles, heat maps, journal and replay.
5. Backup/export/restore drill for the durable ledger.

Do not represent this coverage ledger as historical raw tape or complete Market Memory.
