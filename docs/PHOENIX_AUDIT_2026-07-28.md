# Phoenix / WealthyMindsets Pro — Production Audit

**Date:** 2026-07-28 · **Auditor:** Forge · **Repo state:** `main` @ `938aeef`, 2 files uncommitted (see below) · **Status:** Phase 1 (local) complete. Phase 2 (live authenticated verification) blocked — see Access Blockers.

This audit builds on, not replaces, prior verified work: the 2026-07-19/20 truthfulness pass, the Alpaca REST/WS fix, the tape-hub 429 patch, and the Passport/Supabase identity audit (`docs/PASSPORT_IDENTITY_AUDIT.md`). Nothing below re-litigates those; it starts from them.

---

## Access blockers (needs Dave)

Neither Google Drive nor the Chrome extension is reachable from this session, despite being told Drive was connected. `mcp-registry` shows zero installed connectors; `claude-in-chrome` shows zero connected browsers and found no extension instance to connect to at all. This blocks:
- Reading the ATHOS Master Manual and WM PRO Morning Market Command Center (no prior record of either — not in memory, not in this repo).
- Re-fetching the Above the Hill / WM Pro Bibles fresh (memory has a summary as fallback).
- All live, authenticated-route verification (Phase 2 below) — the entire app is auth-gated locally, so `/charts`, `/scanner`, `/heatmaps`, `/lounge`, etc. cannot be exercised without a session, and local dev can't reach production data anyway.

**Needs Dave to:** get the Chrome extension actually connected (open it, confirm `list_connected_browsers` sees it) and confirm how Drive access reaches this session.

---

## Phase 1 — Production audit (verified locally)

**Repo:** `/Users/dspaidnoosleep/wealthymindsets-pro`, canonical (`origin` = `github.com/spaidsnipes/wealthymindsets-pro`). `~/Desktop/wealthymindsets-pro` and `~/Desktop/wealthymindsets-pro 2` are stale duplicates (15+ commits behind) — not used.

**Uncommitted WIP (preserved, not touched):** `src/app/lounge/page.tsx` has a ~190-line in-progress "Universal Lounge" hero redesign (Discover/Live/Watch/Listen/Rooms modes) — matches the pending cultural-redesign item from the last handoff. It only exists on this machine until committed.

| Check | Result |
|---|---|
| `npm run build` | ✅ Clean. Compiled in 2.5s, all 69 pages generated, 0 errors. `/charts` first-load JS is 330 kB — largest route by far, flag for perf later. |
| `npx tsc --noEmit` (direct binary, `npx` itself is broken on this machine) | ✅ 0 TypeScript errors project-wide. |
| `npm test` (vitest) | ✅ 11/11 passing — `vpEngine.test.ts` fixtures, matches known baseline. |
| `npm run lint` | ❌ **Not actually configured.** No ESLint config file exists anywhere in the repo. `next lint` drops into an interactive "how would you like to configure ESLint?" wizard and can't complete non-interactively — meaning lint has likely never actually run in CI or locally. |
| Env vars | See below. |
| Local route sweep | Every app route (`/charts`, `/scanner`, `/heatmaps`, `/lounge`, etc.) redirects to `/login` without a session — expected, not a bug. Verified `/login` and the Create-Account tab (`/login?mode=signup`) render and switch correctly (confirmed by testing — an initial mis-click made it look broken, retested with a precise element click and the signup form renders fine: email/password/confirm-password/"Join WealthyMindsets"). No console or server errors on any reachable page. |

### Env var audit (`.env.local`, 22 keys defined)

**Defined but never referenced in `src/`** (dead, or wired somewhere I didn't grep):
`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (Firebase entirely unused), `NEXT_PUBLIC_NEWSAPI_KEY`, `NEXT_PUBLIC_ALPHAVANTAGE_KEY`.

**Referenced in code but missing from `.env.local`** (works only if set in Vercel — unverified from here):
`ALPACA_PAPER_KEY`/`ALPACA_PAPER_SECRET` (matches commit `84b7d1e`), `FINNHUB_KEY`, `FMP_KEY`, `GEMINI_API_KEY` (powers `/api/spaidbot` — not previously documented anywhere), `JWT_SECRET` (see security finding below), `NEXT_PUBLIC_ALPACA_KEY`/`NEXT_PUBLIC_ALPACA_SECRET`, `NEXT_PUBLIC_ALPACA_PROXY_URL`, `NEXT_PUBLIC_SITE_URL`, `RESEND_FROM_EMAIL`, `TASTYTRADE_CLIENT_ID`/`TASTYTRADE_CLIENT_SECRET`/`TASTYTRADE_ENV`/`TASTYTRADE_REFRESH_TOKEN`.

**Confirmed inconsistency:** signup flow uses `NEXT_PUBLIC_SITE_URL`, forgot-password uses `NEXT_PUBLIC_APP_URL` — same prior finding from the Passport identity audit, still present.

No `.env.example` exists — a new contributor has zero template for the 22+ keys this app actually needs.

### Security findings

1. **`src/lib/auth.ts:12`** — session JWT signing has a hardcoded fallback secret that's committed in plain text, used only if the `JWT_SECRET` env var isn't set. If it's not actually set in Vercel prod, session integrity relies on a value visible to anyone with repo access instead of a real secret. **Needs Dave to confirm `JWT_SECRET` is set in Vercel prod right now**, then rotate the hardcoded fallback to a non-guessable placeholder (or throw on boot instead of silently falling back) so this can't recur.
2. **`src/app/api/alpaca/route.ts:17-18`** and **`alpaca-stream/route.ts:26-27`** fall back to `NEXT_PUBLIC_ALPACA_KEY`/`NEXT_PUBLIC_ALPACA_SECRET` if the non-public vars aren't set. Currently safe — both usages are server-only route files, nothing client-side imports them — but the `NEXT_PUBLIC_` prefix on a secret is a loaded gun: if this constant (or the env var itself) ever gets referenced from a client component, Next.js inlines the literal value into the browser bundle. Recommend renaming away from `NEXT_PUBLIC_` regardless of current safety.

### Documentation findings

- **README.md is stale and contradicts the truthfulness principle** — it advertises "synthetic engine kicks in automatically" as a fallback when Polygon/Finnhub keys are missing, and only documents Polygon/Finnhub setup. It's silent on Alpaca, the Railway tape proxy, Supabase/Passport, and Tastytrade — all of which are now core to the app. Needs a rewrite.
- Fixed a local tooling gap while running this audit: `~/.claude/launch.json` only had a `dreamboard` dev-server config, so starting a "wealthymindsets-pro" preview silently launched the wrong project. Added a `wealthymindsets-pro` entry pointing at this repo (port 3000) — infra fix, not a product change.

---

## Phase 2 — Trading system verification

**BLOCKED** — needs live Chrome against `wealthymindsets-pro.vercel.app/charts` with Dave's session (local dev can't reach authenticated state or production data; per the standing rule, never enter his password or mint a JWT to fake it). Every item on Dave's checklist (Auth, Session persistence, Dashboard, Charts, Symbol switching, VWAP, Volume Profile, DOM, Order Book, Watchlists, Broker Connection, Paper Trading, Position Management, Orders, Account Data, Alerts, Scanner, Layout Saving, Settings, Error Handling, Loading States, Offline Recovery) is **UNKNOWN** pending this. Known prior state from memory (not re-verified today):
- Tape/order-flow: Railway relay verified end-to-end 2026-07-18/20; cross-tab dedupe (#78) and futures tape (#76, no feed at all) are known-open gaps.
- VP engine v2 (trade-based, 11/11 tests) built but un-wired behind `NEXT_PUBLIC_VP_ENGINE=v2`.
- Broker/paper trading: recent commits suggest active tastytrade + paper-key work — needs live confirmation it holds.
- RLS security debts on `lounge_*`/`radio` tables are staged, not applied.

---

## Priority Matrix

| # | Item | Priority | Impact | Difficulty | Risk | Dependencies |
|---|---|---|---|---|---|---|
| 1 | `JWT_SECRET` hardcoded dev fallback (`src/lib/auth.ts:12`) | **P0** | Account takeover if unset in prod | Trivial to verify, small to fix | High until confirmed | Dave checks Vercel |
| 2 | Cross-tab tape dedupe still open (#78) | **P0** | Core trading feature (tape) can silently die | Medium (navigator.locks/BroadcastChannel) | Medium | None |
| 3 | Staged RLS debts (lounge/radio tables, leaked-password protection off) | **P0** | Critical at public launch | Medium — needs backup + policy tests per Dave's own note | High | Supabase dashboard |
| 4 | Futures tape missing entirely (#76) | P1 | No ES1!/NQ1! data at all | Medium-high | Medium | Paid futures feed decision (founder call) |
| 5 | Env var / Vercel reconciliation (Tastytrade, Gemini, JWT, etc. — unverified if set in prod) | P1 | Silent feature degradation if unset | Low | Medium | Dave's Vercel access |
| 6 | `NEXT_PUBLIC_ALPACA_KEY/SECRET` naming | P1 | Secret-leak risk if ever client-imported | Low | Low (not currently exploited) | None |
| 7 | No ESLint config; lint unrunnable in CI | P2 | Code quality drift goes uncaught | Low | Low | None |
| 8 | README stale/misleading | P2 | Portfolio/onboarding credibility | Low | Low | None |
| 9 | VP v2 un-wired | P2 | Better VP accuracy withheld | Low (flag flip) + verify | Low | None |
| 10 | Dead env vars (Firebase×3, NewsAPI, AlphaVantage) | P2 | Confusion / unused surface | Low | Low | Confirm truly dead |
| 11 | Stale Desktop repo duplicates + zip backup | P3 | Confusion risk only | Trivial | None | Dave's call to delete |
| 12 | Uncommitted "Universal Lounge" WIP | P3 | Single point of failure (one machine) | Low — just commit | Low | Finish or checkpoint |
| 13 | Markov toolbar clipping (narrow viewports) | P3 | Cosmetic | Unconfirmed still open | Low | Live re-verify |
| 14 | Drawing handle rotation bug | P3 | Cosmetic/UX | Unconfirmed still open | Low | Live re-verify |

---

## Milestone Roadmap

**M1 — Security & Trust Hardening (P0s)**
Objectives: confirm/rotate `JWT_SECRET` in prod; ship cross-tab tape dedupe; apply staged RLS fixes with backup + policy tests.
Acceptance: no hardcoded secret reachable in a real deploy; 1 socket per symbol across N tabs; RLS policies deny by default, verified with test users.
Testing: live Chrome multi-tab test for tape; RLS policy unit tests before/after; manual forged-JWT attempt against a throwaway account to confirm the real secret is in force.

**M2 — Trading Core Completion (P1s)**
Objectives: decide + wire futures feed; reconcile every env var against actual Vercel config; rename the `NEXT_PUBLIC_ALPACA_*` fallback vars.
Acceptance: futures show real or honestly-labeled "no feed" state (never fake); every var in `.env.local` has a documented Vercel counterpart or is deleted.
Testing: live futures symbol test; Vercel env diff against code grep.

**M3 — Engineering Hygiene (P2s)**
Objectives: real ESLint flat config; README rewrite (real stack, no synthetic-fallback claim); decide VP v2 rollout; remove dead env vars.
Acceptance: `npm run lint` runs non-interactively and passes/reports; README accurately reflects the live stack.
Testing: `npm run lint` in CI; docs review.

**M4 — Portfolio Polish (P3s)**
Objectives: finish + commit Universal Lounge redesign; clean up stale Desktop duplicates; fix Markov clipping + drawing-handle rotation.
Acceptance: Lounge redesign live and reviewed; only one canonical repo copy on disk; both UI bugs closed.
Testing: live Chrome click-through.

**M5 — Full Live Subsystem Verification (Phase 2, currently blocked)**
Objectives: run Dave's full 21-item trading-system checklist against production with live Chrome.
Acceptance: every item classified VERIFIED WORKING / PARTIALLY WORKING / BROKEN / NOT IMPLEMENTED — no UNKNOWNs left.
Dependencies: Chrome extension actually connected to this session.

**M6 — Beta Release Readiness**
Objectives: reconcile everything above against ATHOS Master Manual, WM Pro Bible, and Command Center once sourced from Drive.
Dependencies: Drive access.

---

## Current Risks

- Drive + Chrome access blockers stall Phase 0 doc sourcing and all of Phase 2 — biggest open unknown right now.
- `JWT_SECRET` exposure is unresolved until Dave confirms Vercel config.
- Uncommitted Lounge WIP lives only on this machine.

## Immediate Next Task

Dave: (1) confirm `JWT_SECRET` is set in Vercel prod (screenshot or paste is enough — do not paste the value itself), (2) get the Chrome extension actually connected to this session so Phase 2 can run, (3) point me at the ATHOS Manual / Command Center docs or confirm Drive access is real from here.

## Exact files expected to change (Phase 5, per milestone above)

`src/lib/auth.ts` (JWT secret handling), `src/app/api/alpaca/route.ts` + `src/app/api/alpaca-stream/route.ts` (secret var renaming), `.env.example` (new), `README.md` (rewrite), `eslint.config.mjs` (new), Supabase RLS policies (dashboard/migration, outside this repo), `src/app/lounge/page.tsx` (finish + commit existing WIP), `src/hooks/useWebSocket.ts` (cross-tab dedupe).

## Recommended reviewer

**Sentinel** — flag for the JWT/RLS/secret-naming changes specifically before merge; those are the security-sensitive ones.

## Estimated completion percentage

**~70–75%** toward portfolio/customer-ready. Build/types/tests are clean, core market data (Alpaca) and broker work (tastytrade) are actively landing, but the three P0 security/reliability items are unresolved and the full live-subsystem verification (Phase 2) hasn't run yet — both are required before this can be called release-ready.
