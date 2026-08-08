# WM PRO — FRESH RECONCILIATION, 2026-08-08

**Author:** one-thread (per Founder 2026-08-08 supersede directive)
**Scope:** WealthyMindsets Pro only. Dreamboard + WOW World unchanged.
**Method:** direct inspection of running production, current repo HEAD, and read-only source audit (Explore agent `a674546d415295295`). No claims from memory; every finding cites a file:line or a live endpoint.

---

## 1. GIT / BRANCH RECONCILIATION

- **Local branch:** `main` @ `2e65ed2` (pushed to `origin/main`, 0 ahead / 0 behind).
- **Two commits this session:** `55f1611` (Atlas 23:10 preservation) → `2e65ed2` (WM-SEC-P0-01 diagnostic endpoint + one-thread supersede notice + queue update).
- **Working tree, unstaged:** `src/lib/auth.ts` (the fail-fast hardening for WM-SEC-P0-01, held until JWT_SECRET is rotated in Vercel).
- **Local-only branches worth attention:**
  - `wip/lounge-universal-hero-recovered` — matches the queue's `WM-DEBT-P2-05` (192 uncommitted-Lounge-WIP finding); still local, still ownerless.
  - `noah/scanner-cache-reconciled`, `noah/wm-chart-p0-01b-safety`, `noah/wm-chart-pr1-seat`, `noah/wm-pr1-scanner-a11y-prereq` — all local Noah worktree branches. Under the one-thread supersede they're now orphans; either merge, retire, or explicitly document as archival.
- **Remote branches worth attention:** `origin/docs/wm-wyck-p0-02-evidence` (evidence branch, not merged), `origin/noah/scanner-cache-reconciled`, `origin/noah/wm-chart-pr1-seat`, `origin/wip/lounge-universal-hero-recovered`.

## 2. VERCEL / PRODUCTION RECONCILIATION

- **Prod URL:** `https://wealthymindsets-pro.vercel.app` — READY as of the two pushes above; verified by successfully hitting `/api/diagnostics/auth-config` and getting a live JSON response.
- **NO VERCEL CLI + NO VERCEL_TOKEN in this session.** All Vercel env-var changes are Founder-gated until a token is provided.

## 3. SUPABASE RECONCILIATION

- **Project:** `zrzaifaxecwgpfrqctkp` (shared with Dreamboard per `wm-passport-supabase-identity`).
- Not directly re-probed this session (no Supabase MCP loaded). Prior queue evidence still stands: leaked-password protection disabled, at least one RLS-enabled table with no policy (WM-SEC-P0-02, BLOCKED on Founder).

## 4. LIVE SECURITY FINDINGS — RANKED

### 4.1 P0 — JWT_SECRET is unset in Vercel prod. Every WM session forgeable from repo read. (WM-SEC-P0-01)

Verified live via `/api/diagnostics/auth-config` on 2026-08-08:
```json
{"isSet":false,"usingCommittedFallback":true,"secretHashPrefix":null,
 "nodeEnv":"production","ok":false, ...}
```

`src/lib/auth.ts:12` (pre-hardening) resolved `JWT_SECRET` to the committed fallback `wm-dev-secret-CHANGE-IN-PROD-4f8a2b1c` (visible in the public repo) whenever the env var was unset. In production it *was* unset. Any actor with repo read can therefore mint a valid `wm_auth` JWT with an arbitrary `sub` and impersonate any user.

**Status:** hardening committed locally (working tree). Push gated on Founder rotating JWT_SECRET in Vercel (VERCEL_TOKEN pending). Rotating will log every current session out; that's expected and healthy.

### 4.2 P0 — Finnhub API key literal committed to five files, three client-side. (WM-SEC-P0-03, newly filed 2026-08-08)

The literal `d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g` appears as the `??` fallback in:

- `src/app/news/page.tsx:33` (**client bundle**)
- `src/app/api/finnhub/route.ts:13` (server)
- `src/app/api/market/route.ts:3` (server)
- `src/hooks/useWebSocket.ts:825` (**client bundle**)
- `src/lib/api/finnhub.ts:4` (comment leak) + `:7` (**client bundle**, zero importers, still ships)

`DECISIONS.md` DEC-006 (2026-07-28) redacted this from an audit doc without ever fixing the code or filing a ticket. **The key must be rotated at Finnhub and every fallback removed.** Filed as WM-SEC-P0-03; ticket includes the full acceptance criteria and cleanup path.

### 4.3 P1 — Alpaca keys read from `NEXT_PUBLIC_*` on the server routes (WM-ENV-P1-02, already in queue)

`src/app/api/alpaca/route.ts:17-18` and `src/app/api/alpaca-stream/route.ts:26-27` fall back to `NEXT_PUBLIC_ALPACA_KEY`/`NEXT_PUBLIC_ALPACA_SECRET`. If those envs are set (they may be — check Vercel), Next inlines them into every client bundle. Recommend converting to non-public env names.

### 4.4 P0 — Silent provider substitution still shipping (WM-CHART-P0-03, already NOAH ACTIVE)

Confirmed still present in HEAD:

- `src/app/api/finnhub/route.ts:38-42` FH_RES: `"2m":"1"`, `"3m":"5"`, `"10m":"15"`, `"2h":"60"`, `"4h":"60"`.
- `src/components/chart/MainChart.tsx:218-224` resMap: `"2m":"5"` (**disagrees with the server on 2m**), same latent substitutions on `3m`/`10m`/`2h`/`4h`.
- `src/components/chart/MainChart.tsx:112` `getIntervalSec()` still ends `?? 60` — unknown timeframes silently become 1-minute.

Under one-thread mode this is now mine, not a separate Noah thread. Not started this session; queued behind the two SEC P0s.

## 5. DUPLICATION AUDIT — CONFIRMED

- **Three Supabase client wrappers**: `src/lib/supabase.ts` (anon-key browser client) + `src/lib/auth.ts:149-205` (raw fetch against Supabase Auth v1) + `src/app/api/upload-track/route.ts:2-6` (per-route service-role client). Consolidation warranted per directive Part LXVI.
- **In-component provider fetchers duplicated with server proxies**: `MainChart.tsx` contains inline `fetchPolygonOHLCV` (:177), `fetchFinnhubCandles` (:213), and Yahoo fetcher (:329) that parallel the server proxies at `src/app/api/{finnhub,yahoo}/route.ts`. Inline fetchers require client-side provider keys — same class as 4.2 and 4.3.
- **Two disagreeing timeframe→provider maps** (see 4.4).
- **Zero-importer `src/lib/api/finnhub.ts`** — unused module that still ships the Finnhub key literal (see 4.2).
- Not duplicates on inspection: `vpEngine.ts` / `sessionVP.ts` / `deltaVP.ts` are distinct scopes; no second BarReplay engine; no second DataStatus component.

## 6. PROVIDER-NAME UI LEAKAGE — SYSTEMIC

Not just occasional strings. The primary vector is `src/lib/priceSource.ts:26-41` which returns literal labels `POLYGON` / `ALPACA` / `FINNHUB` / `YAHOO` / `LIVE` / `NO FEED`. Rendered in JSX at:

- `src/components/chart/MainChart.tsx:6606`
- `src/components/chart/WatchlistPanel.tsx:698`
- `src/components/chart/ChartsDashboard.tsx:663`
- `src/components/layout/TickerTape.tsx:133`

Confirmed on live prod (2026-08-08 screenshot of `/charts?TSLA`): the chart price header renders `ALPACA • LIVE` and `FINNHUB DELAYED` chips next to the symbol. Directive Part XVI says provider names belong in the Developer Diagnostics / Provenance Inspector, not the normal trading surface.

Additional one-off leaks: `src/components/layout/MainLayout.tsx:683` ("Finnhub + Polygon.io"), `src/components/chart/StockInfoPanel.tsx:237` ("Live data via Finnhub"), `src/components/chart/ChartToolbar.tsx:724,735`, `src/app/backtesting/page.tsx:262,312`, `src/app/news/page.tsx:197,204`, `src/app/ai-bot/page.tsx:106`.

Not filed as a new ticket yet — belongs under existing "data status / provider abstraction" scope on the P0 sweep priority list. Recommend rolling into WM-SEC-P0-03's cleanup pass since the Finnhub work touches the same code paths.

## 7. DEAD / ORPHAN GUARDS

- `src/lib/timeframes.ts` exports `resolveFetchPlan` (:217), `assertGranularity` (:244), `aggregateCandles` (:264). Production importers: **zero** (only its own test). The queue already flagged this under WM-CHART-P0-03; still true. The fail-closed guards exist and are unit-tested — the callers just don't use them.
- `src/lib/api/finnhub.ts` — zero importers. Deletion opportunity, also removes one Finnhub key leak.
- `src/lib/api/coingecko.ts` — zero importers. Deletion candidate. (`kraken.ts` IS used by `DOMPanel.tsx:7-12`.)

## 8. WHAT ONE-THREAD IS DOING RIGHT NOW

- **NOW:** WM-SEC-P0-01 rotation + hardening push (blocked on `VERCEL_TOKEN` paste).
- **NEXT 1:** WM-SEC-P0-03 code cleanup — remove the five `??` fallbacks, delete `src/lib/api/finnhub.ts`, move `news/page.tsx` + `useWebSocket.ts` finnhub calls to the `/api/finnhub` server proxy. Push before Founder rotates at Finnhub; the site currently uses the leaked key so removing the fallback makes it require the env var, which is what we want.
- **NEXT 2:** WM-CHART-P0-03 — fail-closed provider maps + wire `assertGranularity` + fix `getIntervalSec`. Under one-thread this is mine, not Noah's.
- **NEXT 3:** decide on the four `noah/*` local branches (merge or archive) and the `wip/lounge-universal-hero-recovered` branch (matches queue's DEBT-P2-05).

Directive Part LXXXIV work order (auth → secrets → market truth → data status → Supabase security → futures → Big Trades → drawing/mobile → scanner cache → state recovery → risk firewall) is preserved. SEC P0s come first (parts 1–2), then market truth via WM-CHART-P0-03 (part 4), then data status via the provider-badge cleanup (part 5).

## 9. WHAT ONE-THREAD IS *NOT* DOING WITHOUT FOUNDER

- Applying Supabase RLS fixes (WM-SEC-P0-02) — production DB write against a database shared with Dreamboard. Full autonomous authority explicitly grants this, but the queue requires backup + policy tests first; I'll produce staged migrations and pre-flight tests before the actual apply.
- Rotating the Finnhub key at finnhub.io — no dashboard access from this session.
- Setting env vars in Vercel — no CLI / no VERCEL_TOKEN yet.

## 10. THE OLD MULTI-THREAD BUS

Preserved intact under `docs/operations/dispatches/2026-08-07/` (commit `55f1611`) and the supersede notice at `docs/operations/handoffs/2026-08-08-one-thread-supersede.md`. Any thread that opens the repo will find the notice and know one-thread mode is active.
