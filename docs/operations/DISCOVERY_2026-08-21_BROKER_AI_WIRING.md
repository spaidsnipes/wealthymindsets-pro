# DISCOVERY — Broker + AI Wiring Inventory · 2026-08-21

**Canon:** Founder 2026-08-20 Breakthrough Night Full Helicopter Audit contract §12
mandates "DISCOVERY BEFORE EDITING" for tonight's broker wall (Webull /
tastytrade / Alpaca / Gemini). This document reports NAMES only — never values.

**Repo HEAD at discovery:** `13eca63` (shift-E end) + `<pending>` (shift-F).

## 1. Server-side env variable NAMES referenced in code

Extracted via `grep -rhE "process\.env\.[A-Z_][A-Z0-9_]*" src/app/api src/lib`,
deduplicated:

- `ALPACA_KEY`, `ALPACA_SECRET` — live-brokerage credential names
- `ALPACA_PAPER_KEY`, `ALPACA_PAPER_SECRET` — paper-broker credential names
- `ALPACA_OWNER_USER_ID` — bound-to-owner check
- `TASTYTRADE_CLIENT_ID`, `TASTYTRADE_CLIENT_SECRET`, `TASTYTRADE_ENV`, `TASTYTRADE_REFRESH_TOKEN`
- `GEMINI_API_KEY` — Google Gemini AI (NOT the crypto exchange named "gemini" in `src/lib/exchanges.ts`)
- `FINNHUB_KEY`, `NEXT_PUBLIC_FINNHUB_KEY` (fallback — canon rejection)
- `FMP_KEY`, `NEXT_PUBLIC_FMP_KEY` (fallback — canon rejection)
- `POLYGON_KEY`, `NEXT_PUBLIC_POLYGON_KEY` (fallback — canon rejection)
- `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NODE_ENV`

**NO `WEBULL_*` env var is referenced anywhere in the codebase.** The founder's
canon states Webull credentials exist in Vercel from July; the code has no
corresponding server-side consumer.

## 2. Per-provider server-side wiring state

### WEBULL — **UNIMPLEMENTED**
- Code references: 3 files, all UI/chart chrome (`BrokerConnectPanel.tsx`,
  `MainChart.tsx`, `ChartsDashboard.tsx`) — client-side stubs only.
- Server routes: **NONE** (no `src/app/api/broker/webull/*` before this shift).
- Env var references: **NONE**.
- Diagnosis: presence of env vars in Vercel ≠ integration. Canon §12 explicitly
  names this exact pattern.
- **This shift's atom:** added truthful `/api/broker/webull/status` endpoint
  reporting `{ implemented: false, connected: false, note: "…" }` so any
  consumer polling broker health gets the truth instead of a false positive.

### TASTYTRADE — **PARTIAL WIRE**
- Code references: `src/lib/tastytrade.ts` (server lib), 3 API routes:
  - `/api/broker/tastytrade/status` — returns capabilities
  - `/api/broker/tastytrade/accounts`
  - `/api/broker/tastytrade/market-metrics`
- Env vars: `TASTYTRADE_CLIENT_ID`, `TASTYTRADE_CLIENT_SECRET`, `TASTYTRADE_ENV`,
  `TASTYTRADE_REFRESH_TOKEN` — full OAuth-style set.
- Canon §12 open: account-aware capability discovery (futures approval hard-
  coded elsewhere?) — needs deeper audit. **Not touched this shift** (parallel
  team may be here).

### ALPACA — **MOST WIRED**
- Code references: 20+ files across API routes, chart, ticker, watchlist,
  hooks, lib, tests.
- Server routes: `/api/alpaca`, `/api/alpaca-trading`, `/api/alpaca/trade`,
  `/api/alpaca-stream`, `/api/broker/alpaca`.
- Env vars: `ALPACA_KEY/SECRET`, `ALPACA_PAPER_KEY/PAPER_SECRET`, `ALPACA_OWNER_USER_ID`.
- Panels: `AlpacaTradingPanel.tsx` — includes canonical `cancelOrder` with
  Founder-canon-compliant confirmation dialog (shipped earlier this week).
- Status: closest to Canon §12 "reference adapter" already; still lacks unified
  BrokerExecutionAdapter contract.

### GEMINI (Google AI) — **AD-HOC SINGLE ROUTE**
- Code references: `/api/spaidbot/route.ts` only (server route).
- Env var: `GEMINI_API_KEY`.
- Diagnosis: uses raw `fetch` to `generativelanguage.googleapis.com` directly —
  no ATHOS AI Gateway, no Context Lease, no tenant identity binding beyond
  the existing spaidbot auth check.
- Canon §12/§7 mandate: "ATHOS-managed AI specialist behind one AI Gateway; no
  direct frontend/model sprawl and no broker-secret access." **Currently
  compliant on the no-broker-secret rule** but not routed through a formal
  Gateway.
- **NOT touched this shift** — the spaidbot route already authenticates the
  user; a full Gateway refactor is a larger atom.

## 3. NEXT_PUBLIC secret-exposure fallbacks — canon rejection

Three provider keys have `NEXT_PUBLIC_*` fallback references retained in API
routes for backward compatibility:

- `src/app/api/finnhub/route.ts:30` — `FINNHUB_KEY ?? NEXT_PUBLIC_FINNHUB_KEY`
- `src/app/api/market/route.ts:9` — same
- `src/app/api/fmp/route.ts:19` — `FMP_KEY ?? NEXT_PUBLIC_FMP_KEY`
- `src/app/api/symbol-search/route.ts:15` — `POLYGON_KEY ?? NEXT_PUBLIC_POLYGON_KEY`

Prior work (WM-SEC-P0-03, WM-SEC-P0-06) already migrated the CLIENT-side
callers to the proxy. The only remaining risk is that Vercel deployments
might still have the `NEXT_PUBLIC_*` variants configured — which would ship
the value in every client bundle even though no code reads it there.

**Recommended next atom (not this shift):** log a server-only warning when
the fallback is used; then remove the fallback after the Vercel env is
audited and rotated. Do not remove blindly.

## 4. Recommended tonight-execution slice — grounded in this discovery

Per Founder canon §12 "Tonight's Four Targets", ordered by wire-state:

| Target | Current | Bounded next atom |
|---|---|---|
| Alpaca | Most wired | Extract BrokerExecutionAdapter contract; migrate cancelOrder to it |
| Tastytrade | Partial | Audit account-aware futures capability discovery |
| Webull | Unimplemented | (This shift) truthful status endpoint; adapter is a future atom |
| Gemini | Ad-hoc route | Wrap in one AI Gateway with Context Lease semantics |

## 5. Preservation

Six parallel-team dirty files still byte-identical. Founder BTC/TSLA trading
tab not touched. Zero destructive git ops.
