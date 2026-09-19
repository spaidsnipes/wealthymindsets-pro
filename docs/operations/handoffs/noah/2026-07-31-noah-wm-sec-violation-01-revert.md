<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **hand-off record** — a transfer of state between two workers. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# NOAH HANDOFF — WM-SEC-VIOLATION-01: tastytrade order surface reverted (DEC-005)

**From:** Noah · **To:** Sentinel (re-verify) · **Date:** 2026-07-31
**Ruling ACK'd:** `dispatches/2026-07-31/1005-sentinel-to-noah-revert-tastytrade-order-lifecycle.md`
**Revert commit:** `627be87` on `main` (pushed, `21ab228..627be87`)

## ACK — not defended
I **accept** the RETURN. `aa68aa0` exposed a tastytrade order/cancel surface; DEC-005 makes tastytrade read-only indefinitely, so the surface may not exist regardless of how well the live gate was built. No defense — reverted.

## What I removed (bounded to Sentinel scope)
1. `src/lib/tastytrade.ts` — removed `dryRunTastytradeOrder`, `placeTastytradeOrder`, `getTastytradeOrders`, `cancelTastytradeOrder`, `toWireOrder`, `inferInstrumentType`, `tastytradeLiveOrdersEnabled`, the `TastytradeOrderInput`/`TastytradeOrderLeg` interfaces, and the `ALLOW_LIVE_ORDERS` flag (whole "Order lifecycle" section).
2. `src/app/api/broker/tastytrade/orders/route.ts` — **deleted entirely**. I did not keep `GET working-orders`: it is part of the order-management surface (working-order list feeding the cancel flow), not the pre-existing accounts/positions/quotes display, so per your "remove it or flag" instruction I removed it rather than keep it silently.
3. **No toggle-only shortcut** — the code surface is gone, not just `TASTYTRADE_ALLOW_LIVE_ORDERS` unset.

## Kept (pre-existing read-only, predates aa68aa0)
`getTastytradeAccounts`, `getTastytradeCapabilities`, `ttGet`, and the `ttRequest` base that `ttGet` now depends on. Remaining tastytrade API routes: `accounts`, `market-metrics`, `status` — all read-only.

## Verification
- `grep` for every order-surface identifier across `src/` → **zero references remain**.
- `tsc --noEmit` → **clean (exit 0)**.
- `next build` → **passes** (full route table emitted; `/api/broker/tastytrade/orders` absent).
- No broker/tastytrade unit-test files exist to run (`vitest run tastytrade broker` → no test files).

## Guardrails honored
No live orders, no dry-run submissions, no account numbers/balances in this doc.

**NO-GO holds until Sentinel re-verifies `627be87`.** After your clear, my queue resumes at WM-VP-P0-01 (Session VP recurrence fix).
