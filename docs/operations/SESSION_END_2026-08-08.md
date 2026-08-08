# WM Pro one-thread session — 2026-08-08 hand-off

**Founder leaving for work; picking back up tonight.** This is a resume-in-30-seconds hand-off.

## What landed in this session (main branch)

| SHA | Scope |
|---|---|
| `55f1611` | Preserve outgoing multi-thread bus (queue rename + 4 dispatches) before supersede. |
| `2e65ed2` | WM-SEC-P0-01 diagnostic + one-thread supersede notice + queue update. |
| `3f2141b` | Empty commit → forced redeploy after Founder set env vars. |
| `8f76cc1` | WM-SEC-P0-03 ticket filed + delete unused `src/lib/api/finnhub.ts` + Finnhub diagnostic endpoint + reconciliation report. |
| `ae069b8` | WM-SEC-P0-01 fail-fast `src/lib/auth.ts` hardening (JWT_SECRET rotation confirmed via 401). |
| `2ea295c` | WM-SEC-P0-03 all 5 Finnhub consumers migrated to `/api/finnhub` proxy; client bundle key-free. |
| `ed4e73a` | Delete both temporary diagnostic endpoints; JSDoc fix. |
| `177e63a` | WM-ENV-P1-02 strip Alpaca `NEXT_PUBLIC_` fallbacks + README truthfulness pass + file 10-point audit. |
| `<this>` | WM-SEC-P0-05 client-side Polygon key strip + orphan `src/lib/api/coingecko.ts` delete + file 4 new P0 tickets in queue. |

## What Founder needs to do tonight (single Vercel session covers all of these)

**Rotations at provider dashboards (highest urgency, LIVE money risk):**

1. **alpaca.markets → API Keys → Regenerate** (WM-SEC-P0-04). Cleartext `ALPACA_KEY=AK4YOXHUA6K67UNNKCHP3OZSJG` + `ALPACA_SECRET=…` + `ALPACA_LIVE=1` is in **public git history**. Old key still authorises real orders until you rotate. Confirm `ALPACA_LIVE` intent while you're there.
2. **polygon.io → Dashboard → API keys → Regenerate** (WM-SEC-P0-05). Same class as Finnhub — was in the browser bundle AND is in public git history.

**Vercel Env Vars — after each rotation:**

3. Set new `ALPACA_KEY` / `ALPACA_SECRET` as **server-only** (no `NEXT_PUBLIC_` prefix), Sensitive, Production.
4. Set new `POLYGON_KEY` as **server-only**, Sensitive, Production.
5. **Delete** the following stale env vars from Vercel prod (all confirmed no code reads them, safe to remove):
   - `NEXT_PUBLIC_FINNHUB_KEY` (finished migration in 2ea295c; bundle grep verified 0 hits).
   - `NEXT_PUBLIC_ALPACA_KEY`, `NEXT_PUBLIC_ALPACA_SECRET` (finished in 177e63a).
   - `NEXT_PUBLIC_POLYGON_KEY` (finished client-side in `<this commit>`; symbol-search still has transitional fallback until you delete it).
   - Any Firebase-prefixed (×3), `NEWSAPI*`, `ALPHAVANTAGE*`, `ALPHA_VANTAGE*` — grep confirmed zero references in code.
6. **Optional** Vercel: pay any overdue invoices (banner visible on account page).

## What one-thread still owes (autonomous, will do next session)

- **WM-SEC-P0-06** auth guards on 10 unauthenticated privileged endpoints (upload-track, alpaca/trade, livekit + approve, emails/welcome, tradovate, spaidbot, broker/*). Deliberately not pushed today — some are broker-critical, need Founder eyes-on the first test.
- **WM-SEC-P0-07** rate-limit + origin check for `emails/welcome` + `passport/handoff`.
- **WM-CHART-P0-03** fail-closed provider interval maps (server-side FH_RES fix — old Noah ticket, mine now).
- **WM-DATA-P0-02** cross-tab tape dedupe via `navigator.locks`.
- Provider-name badge → move to developer diagnostics only (directive Part XVI).
- Once Founder deletes `NEXT_PUBLIC_POLYGON_KEY`: strip the transitional secondary in `symbol-search/route.ts`.
- `npm audit fix` (8 HIGH advisories on `next`, plus `postcss` / `sharp` / `nanoid`).
- Provider proxy migration for the client-disabled Polygon paths (rebuild via `/api/polygon`).

## What one-thread stopped short of

- **BFG / `git filter-repo` on the leaked keys.** History rewrite is destructive to any downstream clone / worktree; needs your explicit go. Alternative: accept that the leaked values are permanently exposed, ensure they're rotated everywhere they authenticate, and move on.
- **Supabase RLS work (WM-SEC-P0-02)** — shared DB with Dreamboard, still Founder-gated per queue.
- **The 3 Codex worktrees** at `~/Documents/Codex/2026-07-28/senior-software-engineer-for-wealthy-mindsets/work/*` hold `noah/*` branches whose tips I archived as `archive/noah/*` tags pushed to origin. Delete the worktrees whenever you're done with them (`git worktree remove …`).

## Verification current state

- Live JWT_SECRET: rotated, verified via 401 on old cookie (2026-08-08).
- Live FINNHUB_KEY: rotated, verified indirectly by deploy staying READY (fail-fast would have 500'd otherwise).
- Bundle scan across 18 prod client chunks: zero hits on `d8efu9hr`, `finnhub.io`, `NEXT_PUBLIC_FINNHUB`.
- Live Alpaca key: **NOT rotated** — see item 1 above.
- Live Polygon key: **NOT rotated** — see item 2 above.

## First command next session

```
cd ~/wealthymindsets-pro && git pull && \
  cat docs/operations/SESSION_END_2026-08-08.md
```
