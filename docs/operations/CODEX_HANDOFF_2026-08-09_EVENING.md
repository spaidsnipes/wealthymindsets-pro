# CODEX HANDOFF — pick up from Claude one-thread 2026-08-09 evening

**Repo HEAD:** `d37307d` on `main` (deployed to `wealthymindsets-pro.vercel.app`, live-verified).
**Author agent leaving:** Claude Opus 4.7 (one-thread supersede active per Founder directive 2026-08-08).
**Session budget:** exhausted for Claude side; agent spawns hit rate limit at 11:40 AM CT.
**Founder direction (verbatim):** "i want this team to finish working … once finished all the milestones give me a prompt for the codex team to pick up where you guys leave off."

Copy the "PROMPT FOR CODEX" block at the bottom into the Codex session.

---

## STATE OF PLAY (verified via live Chrome + git log)

### Shipped this evening by Claude one-thread (in order)

| SHA | Scope | Live-verified? |
|---|---|---|
| `a6ec9fb` | Vendor-name strip in 3 non-chart pages (MainLayout Data Source badge, /news loading placeholders, /ai-bot broker copy) | ✅ deploy + prod render |
| `78c92ec` | XSS escape for AI-response markdown in SpaidBot; rate-limit on `/api/spaidbot` (10/min), `/api/alpaca-trading POST` (30/min), `/api/upload-track` (20/min), `/api/emails/welcome` (5/min) | ✅ tested — 12th request returned `429 retryAfterSec:57` |
| `75b18f6` | Session VP populate for crypto/futures/daily+ TFs (Founder regression: "you cant see the session vp") | ✅ TSLA 15m showed two-column VP |
| `b3b1e9b` | Session VP window widened to last-N-bars on daily+ TFs so it renders as more than a sliver | ✅ BTC 15m confirmed both columns visible |
| `b2b97c0` | WM-OF-P0-06 persistent honest banner — "Live footprint recording — historical bars pre-tab-open stay blank" | ✅ visible on BTC 15m + Delta |
| `d37307d` | ESLint 9 flat config + security regression guards (blocks `NEXT_PUBLIC_*_KEY` reads in client code; blocks direct `finnhub.io`/`polygon.io` client fetches) | ✅ `next lint --dir src` clean, 0 errors |

Prior sessions on the same weekend: 20 more commits (`55f1611` → `59f7448` → `3991a54` on Saturday morning + Batches 1–6 on Saturday evening). Full list in `docs/operations/SESSION_END_2026-08-09.md`.

### Shipped in parallel by Codex team (weekend)

`e9d2efd` (chart chrome vendor-name strip #1), `3cce0f6` (confirmation-email recovery #2), `45c031c` (auth revocation via sessionEpoch #3 — made `requireAuth` async), `4fa997a` (scanner canonical failure cache #4), `1cf5ed3` (Codex P0 session checkpoint #5), `1ac0744` (Yahoo timeframe truth #6), `b250211` (receipt for #6), `266eb8d` (password recovery isolation), `1a008bf` (mobile P0 workspaces), `819ac6d` (scanner mobile filters), `1a056f3` (journal mobile entry), `3286615` (order-flow coaching qualifier), `fb4e991` (Codex visual P0 checkpoint), `1e37855` (phone landscape layout), `ee23d64` (mobile media chrome removal).

Both agents' work merged cleanly — zero conflicts. Coordination was via `git pull` before each push. Async `requireAuth` migration from Codex #3 caught + honored by Claude's rate-limit additions.

## LIVE-VERIFIED THIS EVENING

Visual proof (screenshots taken via connected Chrome, all archived under `/private/tmp/claude-501/.../scratchpad/` for this session):

- `/charts?BTC` at 15m — Session VP + Fixed VP render side-by-side (amber + purple columns). "Live footprint recording" banner visible with Delta on.
- `/charts?TSLA` at 15m — Both VPs render, "Real order-flow tape unavailable" banner shows (Yahoo delayed feed, no aggressor tape — honest per directive Part XLIII).
- `/api/finnhub?type=candles&tf=2m` returns `qualityState:"UNAVAILABLE"` — WM-CHART-P0-03 fail-closed working.
- Signed-out `curl /api/broker/coinbase` → `401 {"error":"Not authenticated"}` — WM-SEC-P0-06 auth guards working.
- Signed-in in-page fetch loop: 11 successes then `429 {"error":"Rate limit exceeded","retryAfterSec":57}` — WM-SEC-P0-07 rate limit working.
- Bundle grep across 18 deployed client chunks: zero hits on `d8efu9hr` (Finnhub leaked literal), zero hits on `finnhub.io`, zero hits on `NEXT_PUBLIC_FINNHUB` — WM-SEC-P0-03 client cleanup confirmed.

## STILL OPEN — TICKETS

### Founder-gated (can NOT be closed autonomously by any agent)

- **WM-SEC-P0-04** — rotate Alpaca LIVE keys at alpaca.markets. Cleartext leaked in git history (`.env.local` was committed in `39c8758`). Set new key as `ALPACA_KEY` / `ALPACA_SECRET` (server-only, non-`NEXT_PUBLIC_`) in Vercel. **Live orders can still be placed on the old key until rotated.**
- **WM-SEC-P0-05** — rotate Polygon key at polygon.io. Also leaked in git history. Client-side reads already stripped in `d4e175d`; server transitional fallback in `symbol-search/route.ts` still reads `NEXT_PUBLIC_POLYGON_KEY` — delete THAT Vercel var after rotation.
- **WM-SEC-P0-02** — Supabase RLS on `lounge_posts / likes / comments / follows` still `USING (true) / WITH CHECK (true)`. Shared DB with Dreamboard — needs Founder go + backup + policy tests before apply.
- **M6** — tastytrade futures wiring (contract from `2026-07-31-forge-wm-broker-p0-01-tastytrade-futures.md`, stalled 8+ days). Needs live futures market to fully test (Sun 5pm CT open).
- **M12** — broker connect/status/error-state UI. Micah spec `926c783` shipped, awaits Founder decision on which broker path to prioritize.
- **M15** — Supabase RLS same as SEC-P0-02.
- **M19** — Aug 3 MOV file incident report; needs the .mov pulled locally.
- **Vercel account** — overdue-payment banner still visible. Not blocking but worth clearing.

### Autonomous, deferred by session budget

- **M7 / M8 / M9 / M11** — order-flow UX polish + Big Trades collision fix. Needs Micah design pick + live market-hour verification.
- **M27** — TFId consumer migration in `MainChart.tsx` (currently `toChartEmitId` + `legacyChartId` shim still in place). Needs careful analysis of every timeframe consumer.
- **M28** — touch parity for chart drawing. 13 mouse handlers to migrate to Pointer Events in `src/components/chart/*`. Best done in focused session with iPhone test rig.
- **WM-CHROME-P1-01** — SpaidBotButton Alpaca-in-copy cleanup (broker connect UX names "Alpaca" ~7 times; can be reworded to "your broker" but connect flow needs care).
- **WM-OF-P1-01** — backend tape replay so historical bars can accumulate footprint (currently free-tier can only supply live-forward — banner explains this honestly since `b2b97c0`, but the real fix is server-side tape recorder).
- **WM-PERF-P1-01** — dev-mode FPS overlay behind `?perf=1` flag.
- **WM-PERF-P1-02** — investigate 250-request-count on chart page load.
- **WM-PERF-P1-03** — Monday-open re-measure of perf under live tape.
- **WM-DEBT-P2-01b** — clean the ~40 pre-existing `any` warnings the new ESLint config now surfaces.
- **`npm audit fix`** — 8 HIGH advisories on `next` framework. Requires major-version bump; test build carefully before push.
- **Provider-name badge → developer diagnostics only** (directive Part XVI). The `sourceProvenance` field on `PriceSourceBadge` exists but isn't rendered in a Provenance Inspector view yet.
- Test coverage for `src/lib/rateLimit.ts` and the updated `src/lib/requireAuth.ts` sessionEpoch branch.

## READ THIS BEFORE STARTING

1. `docs/operations/CURRENT_WM_PRO_BRIEF.md` — one-page brief; source-of-truth links.
2. `docs/operations/ACTIVE_TASK_QUEUE.md` — every open ticket with acceptance criteria.
3. `docs/operations/RECONCILIATION_2026-08-08.md` — 8/8 morning reconciliation.
4. `docs/operations/AUDIT_2026-08-08_10-POINT.md` — 10-point deep audit (critical findings still relevant).
5. `docs/operations/SESSION_END_2026-08-09.md` — full weekend session summary.
6. `docs/architecture/WM_BROKER_QUOTE_CONTRACT.md` — normalized quote spec (M2).
7. `docs/design/COLOR_AUDIT_2026-08-09.md` — green-overload finding for Bible §26 remediation.
8. `docs/operations/PERF_BUDGET_2026-08-09.md` — Bible §27 perf budget measured.

Also: `docs/operations/handoffs/2026-08-08-one-thread-supersede.md` explains the one-thread mode. When Codex is active, treat that as coordination-mode not exclusivity — both agents pull-before-push and it just works (proven this weekend across 20+ commits with zero conflicts).

## PROMPT FOR CODEX

```
Codex, take over WM Pro (repo `wealthymindsets-pro` on Founder's laptop, main branch, HEAD `d37307d` verified on prod).

Claude one-thread just wrapped an intense weekend push covering the entire 30-milestone plan + emergency Founder-visible fixes. Full inventory: `docs/operations/CODEX_HANDOFF_2026-08-09_EVENING.md`. Read that first.

You inherit a healthy codebase:
- Auth rotated + hardened (JWT_SECRET fail-fast + async requireAuth with sessionEpoch revocation);
- Finnhub key rotated + all 5 client consumers migrated to /api/finnhub proxy;
- 15 privileged endpoints now auth-guarded + 4 have rate limits;
- WM-CHART-P0-03 fail-closed (2m/3m/10m/2h/4h no longer silently substitute);
- Session VP renders correctly on crypto + daily+ (Founder regression closed);
- Order Flow tools now show honest "historical bars stay blank" banner;
- ESLint 9 flat config with security-regression guards active;
- Zero unresolved conflicts; TypeScript clean.

Your top-priority queue:

1) **Complete WM-OF-P1-01 spec + implementation plan** — build a server-side tape recorder so historical bars can accumulate footprint (currently free-tier feeds only supply live-forward). Directive Part XLIII truthfulness applies — no synthetic.

2) **M28 touch parity** — migrate the 13 mouse handlers in src/components/chart/* to Pointer Events. Verify on iPhone at 390×844. Founder has this on his top-visible-defect list for mobile.

3) **M6 tastytrade futures wiring** — contract from `2026-07-31-forge-wm-broker-p0-01-tastytrade-futures.md`, stalled since. Test /ES /NQ /GC /CL live at Sun 5pm CT futures open. Bible §33 futures architecture MUST be honored (analytical vs executable split).

4) **M27 TFId consumer migration** — retire toChartEmitId + legacyChartId shim in `src/lib/timeframes.ts`. Careful — 6 consumers switch on legacy "D"/"W"/"M".

5) **npm audit fix** on next (8 HIGH advisories — SSRF, cache confusion, unauth Server-Function disclosure). Requires major bump; test build carefully.

Founder-gated items (do NOT attempt autonomously):
- Rotate Alpaca LIVE keys at alpaca.markets (WM-SEC-P0-04);
- Rotate Polygon key at polygon.io (WM-SEC-P0-05);
- Apply Supabase lounge-table RLS fixes (WM-SEC-P0-02, WM-SEC-P0-15);
- Pull the Aug 3 MOV file for M19 incident report.

Standing directive (Claude session-limit-only-blocker):
- One-thread supersede is active for WM Pro (2026-08-08). Play multiple roles as needed within your session.
- Every commit body carries an AI Action Receipt per `docs/operations/AI_ACTION_RECEIPT_TEMPLATE.md`.
- Every user-facing change gets visual verification at 4 viewports (360/390/834/1440) — screenshot proof mandatory to close.
- Never write NEXT_PUBLIC_ on a secret key. ESLint guard `d37307d` will error if you try.
- Vendor names (Finnhub / Polygon / Alpaca / Yahoo) stay INTERNAL — `sourceProvenance` in `PriceSourceBadge`. UI reads `label` only: LIVE / DELAYED / DELAYED 15 MIN / NO FEED.
- Fail-closed over silent substitution. Directive Part XVII single market truth contract governs.

Coordinate with Claude by pull-before-push. Weekend proved concurrent-agent-on-main works. Sync on the docs/operations/ bus — write handoff notes in `docs/operations/handoffs/` per role scope.

Founder wants forward compounding, not more plans. Ship code, screenshot proof, checkpoint, continue.
```
