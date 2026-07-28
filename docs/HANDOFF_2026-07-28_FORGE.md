# WM PRO — VERIFIED HANDOFF

**Session date:** 2026-07-28 · **Role:** Forge (Build Continuity Lead) · **Scope:** WM Pro only
**Confidence:** Medium-High on what is marked VERIFIED. Deliberately low on anything requiring an authenticated session or live browser — see §6 and §7.

Evidence labels used throughout: **VERIFIED** / **PARTIALLY VERIFIED** / **NOT VERIFIED** / **UNKNOWN**.

---

## 1. Repository and branch

- **Repo:** `spaidsnipes/wealthymindsets-pro` (canonical local clone: `/Users/dspaidnoosleep/wealthymindsets-pro`)
- **Branch:** `main`
- **Sync state:** in sync with `origin/main` at session close
- **Session start commit:** `938aeef`
- **Session end commit:** `a73aae1`
- **Deployment:** `wealthymindsets-pro.vercel.app` (Vercel auto-deploys `main`) — deploy result NOT VERIFIED this session, see §6

**Stale duplicates — do not use:** `~/Desktop/wealthymindsets-pro` (15+ commits behind, last commit `6afaf82`) and `~/Desktop/wealthymindsets-pro 2`. Only the home-directory clone is canonical.

---

## 2. Commits created this session

| Commit | Time | Description |
|---|---|---|
| `8da59b0` | 06:36 | `docs:` Phase 1 production audit + priority matrix + roadmap |
| `5f5518b` | 08:17 | `chore:` remove dead duplicate `BrokerConnectPanel` component |
| `a73aae1` | 09:26 | `fix(auth):` stop profile guard trapping users on `/profile` after sign-in |

All three pushed to `origin/main`.

---

## 3. Files changed

```
docs/PHOENIX_AUDIT_2026-07-28.md            | 143 ++++++++++   (new)
src/app/profile/page.tsx                    |   6 +
src/components/chart/BrokerConnectPanel.tsx | 389 ----------------  (deleted)
src/contexts/AuthContext.tsx                |   8 +-
4 files changed, 156 insertions(+), 390 deletions(-)
```

**Uncommitted in working tree — NOT mine, left untouched deliberately:**
- `src/app/lounge/page.tsx` — ~190-line in-progress "Universal Lounge" hero redesign (Discover/Live/Watch/Listen/Rooms). Pre-existing WIP from a prior session. **Exists only on this machine.** Whoever owns it should commit or checkpoint it.
- `tsconfig.tsbuildinfo` — build artifact, ignorable.

---

## 4. Bugs fixed

### P0 — Profile guard trapped users on `/profile` after sign-in (`a73aae1`)

**Root cause.** `AuthContext.tsx:127` redirected any user with `profileComplete === false` to `/profile?setup=1` on every navigation. But `profile/page.tsx` only opened the setup form when localStorage had *no* saved profile. A user whose flag was false while localStorage held a profile therefore saw an ordinary profile page — no setup form, no explanation — and every attempt to reach `/charts` silently returned them to `/profile`. The escape (Edit → Save, which sets `profileComplete: true`) existed but was undiscoverable.

**Underlying defect:** client and server disagreed on what "complete" means. `api/auth/login/route.ts:104` already treats an existing `displayName` as proof of completeness; the client guard did not.

**Fix (two surgical changes):**
1. `AuthContext.tsx` — completeness now uses the server's own rule (`profileComplete || !!displayName`). Self-heals sessions whose flag did not survive a stale cookie or a Supabase metadata write that never landed.
2. `profile/page.tsx` — when genuinely incomplete (no flag **and** no `displayName`), force the setup form open so an escape path always exists. Fields stay pre-filled from localStorage, preserving the "don't look like a reset" behaviour the original localStorage check was protecting.

**Near-miss worth recording:** my first edit dereferenced `user.profileComplete` where `user` can be `null` on public paths — that would have crashed `/login` for every logged-out visitor. Caught and fixed before commit, then specifically regression-tested. Root lesson: this guard runs *before* the public-path branch returns, so `user` is not guaranteed non-null there.

### Housekeeping — dead duplicate component (`5f5518b`)

`src/components/chart/BrokerConnectPanel.tsx` had zero live imports. The wired component is `src/components/broker/BrokerConnectPanel.tsx` (used by `MainLayout.tsx` and `ChartsDashboard.tsx`). The dead copy had already caused one accidental edit + revert (`6b092f3` / `3a4c500`). Removal matches Company Bible §28 (remove dead duplicate components; require live-path confirmation before editing similarly named files).

---

## 5. Verification completed — VERIFIED

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`, local binary) | 0 errors |
| Production build (`npm run build`) | Clean, 69/69 pages generated |
| Tests (`npm test`, vitest) | 11/11 passing (`vpEngine.test.ts`) |
| `/login` renders post-change | VERIFIED — screenshot captured, zero console errors, session confirmed `null` (this is the exact null path the near-miss would have crashed) |
| Local route reachability | Every app route redirects to `/login` without a session — expected behaviour, not a defect |
| Build clean after dead-file deletion | VERIFIED (69/69) |

Note: `npx` is broken on this machine (`Cannot find module '../lib/cli.js'`). Use `./node_modules/.bin/tsc` directly.

---

## 6. Verification still missing — NOT VERIFIED / UNKNOWN

- **The trapped-user scenario itself was never reproduced live.** It requires an authenticated session. I do not enter the Founder's password and do not mint or forge a session token. The fix is code-traced and regression-checked, not behaviourally reproduced. **This is the single most important gap in this handoff.**
- **Production deploy of `a73aae1` — UNKNOWN.** Vercel auto-deploys `main`, but I could not open the deployed app to confirm the build shipped or that the guard behaves correctly in production.
- **All 21 items of the trading-system checklist remain UNKNOWN** (Auth, Session persistence, Dashboard, Charts, Symbol switching, VWAP, Volume Profile, DOM, Order Book, Watchlists, Broker Connection, Paper Trading, Positions, Orders, Account Data, Alerts, Scanner, Layout Saving, Settings, Error Handling, Loading States, Offline Recovery). None were exercised live this session.
- **`JWT_SECRET` in Vercel production — UNKNOWN.** See §8, P0-1.
- **Competitor interaction study — NOT STARTED.** Blocked by §7.

---

## 7. Known browser-connector failure (blocker)

Two independent browser paths, both unusable for verification:

- **`Control_Chrome`:** `list_tabs` works and returns live data (TSLA ticked 309.22 → 303.77 between two calls, proving Chrome is genuinely running with the Founder's tabs open — WM Pro `/charts`, TradingView, tastytrade, Dreamboard). But `get_page_content` and `execute_javascript` **both fail on every call** with `Error: Google Chrome is not running.` Reproducible, not transient. The connector can enumerate tabs but cannot read or drive any of them.
- **`claude-in-chrome`:** reports not connected. `list_connected_browsers` returns `[]`; `switch_browser` finds no extension instance.

**Consequence:** no authenticated live verification, and the competitor interaction study (which explicitly requires comparing *interactions*, not screenshots) cannot be performed at all. The local Browser pane works for unauthenticated local routes only — it cannot reach production or an authenticated session.

**Safest fix:** install/sign in to the Claude in Chrome extension (`https://chromewebstore.google.com/detail/fcoeoabgfenejglbffodgkkbkcdhcgfn`) on the same account, or repair the `Control_Chrome` content bridge. Until one works, treat every "live" claim about WM Pro as UNKNOWN.

---

## 8. Remaining P0 and P1 tasks

### P0

| # | Task | Notes |
|---|---|---|
| P0-1 | **Confirm `JWT_SECRET` is set in Vercel production** | `src/lib/auth.ts:12` falls back to a hardcoded committed secret if the env var is unset. If unset in prod, session integrity rests on a value visible to anyone with repo access. Founder action — confirm it is set (do **not** paste the value). Then make the fallback throw on boot in production instead of silently degrading. |
| P0-2 | **Cross-tab tape dedupe** (issue #78) | Per-page hub shipped (`c5fc3a5`) but does not dedupe across tabs; N tabs still open N socket sets. Needs `navigator.locks` / `BroadcastChannel` leader election. Core trading data reliability. |
| P0-3 | **Apply staged Supabase RLS fixes** | Always-true write/delete policies on `lounge_posts/likes/comments/follows` + `radio` inserts; broad public `radio` storage listing; leaked-password protection disabled. Documented in `docs/PASSPORT_IDENTITY_AUDIT.md`. Requires backup + policy tests before applying — do not apply blind. Launch blocker. |
| P0-4 | **Live-verify the `a73aae1` auth fix in production** | Closes the §6 gap. Blocked by §7. |

### P1

| # | Task | Notes |
|---|---|---|
| P1-1 | Futures tape missing entirely (issue #76) | `isFuture` skips both socket branches — ES1!/NQ1! have no tape at all. Needs a paid futures feed (Founder decision, §45 register). Until then must be labelled honestly, never faked. |
| P1-2 | Env var ↔ Vercel reconciliation | 15 vars referenced in code but absent locally (`TASTYTRADE_*`, `GEMINI_API_KEY`, `ALPACA_PAPER_*`, `JWT_SECRET`, `NEXT_PUBLIC_SITE_URL`, `RESEND_FROM_EMAIL`, …). Unverified whether each is set in Vercel; silent feature degradation if not. |
| P1-3 | Rename `NEXT_PUBLIC_ALPACA_KEY/SECRET` fallbacks | `api/alpaca/route.ts:17-18`, `api/alpaca-stream/route.ts:26-27`. Currently server-only so not exploited, but the `NEXT_PUBLIC_` prefix inlines into the browser bundle the moment anything client-side touches it. |
| P1-4 | `NEXT_PUBLIC_SITE_URL` vs `NEXT_PUBLIC_APP_URL` inconsistency | Signup uses one, forgot-password the other; `middleware.ts` canonical-host logic depends on the same pair. A wrong value here redirects every production request. |
| P1-5 | Competitor interaction study | TradingView → tastytrade → WM Pro, same workflow in each, comparing interactions. Blocked by §7. |

**P2/P3** (full detail in `docs/PHOENIX_AUDIT_2026-07-28.md`): no ESLint config at all (`next lint` drops into an interactive wizard — lint has effectively never run), stale/misleading README (still advertises a "synthetic engine" fallback contradicting the truthfulness pass), VP v2 engine built and tested but un-wired behind `NEXT_PUBLIC_VP_ENGINE=v2`, 5 dead env vars (Firebase ×3, NewsAPI, AlphaVantage), uncommitted Lounge WIP, Markov toolbar clipping, drawing-handle rotation.

---

## 9. Recommended next WM Pro task

**P0-1 — confirm `JWT_SECRET` in Vercel production.**

Rationale: it is the only open P0 that is both a genuine account-integrity risk and resolvable in minutes. It needs one Founder action (confirm the var is set) plus one small hardening commit (fail fast in production rather than silently falling back). It is not blocked by the browser connector, unlike P0-4 and P1-5.

**If the Founder is unavailable**, the best unblocked engineering task is **P0-2 (cross-tab tape dedupe)** — self-contained in `src/hooks/useWebSocket.ts`, testable locally, and it protects the core trading data path.

**Do not start** P0-4 or P1-5 until §7 is resolved; they cannot be honestly completed.

---

## 10. Documentation / Atlas updates needed

- **`docs/PHOENIX_AUDIT_2026-07-28.md`** — committed this session. Current source of truth for WM Pro state. Note it was **redacted before push**: the first draft contained the literal hardcoded JWT fallback secret plus a written exploitation path, which would have been a public vulnerability disclosure on a repo intended to be portfolio-facing. Finding retained, secret and how-to removed. **Standing rule for Atlas: audit documents that name a secret must redact the value before any push.**
- **Morning Market Command Center** (Drive, `1asePFRTXedwtSPov-3-abwJWdRGdP-kgbk19iT7tAoc`) — its status fields still read `UNKNOWN — Founder must provide`. Now fillable: Repository = `spaidsnipes/wealthymindsets-pro`; Active branch = `main`; Last stable commit = `a73aae1`; Local build = PASSING (69/69); Automated tests = PASSING (11/11); Current highest blocker = browser-connector failure (§7). I did not edit the Drive doc — read-only access only this session.
- **Atlas / company-health dashboard — correction required.** A circulated "ATH COMPANY HEALTH" snapshot (WM Pro 82%, 18 videos processed, 42 knowledge packages, 2 critical bugs, "Dead Code: 3 files recommended") is **not evidence-backed from this session**. One checkable item was close but imprecise: exactly **one** dead file was confirmed and removed; I did not verify two others exist. Related: an analysis of "both uploaded recordings" circulated into this thread — **no recordings exist in this session and I have viewed no video.** UX-018 is likewise marked "Verified through live interaction," which cannot have been produced under the §7 connector failure. Recommend Atlas re-derive these from evidence or mark them UNVERIFIED before they harden into a false baseline.
- **New Atlas engineering standard proposed** — *"Client and server must share one definition of a gating condition."* The P0 fixed today existed purely because `AuthContext` and `api/auth/login` disagreed on what "profile complete" means. Worth a written standard; the same class of bug is likely elsewhere (broker connection state, session validity).
- **Company Bible §28 reinforced** — the dead-duplicate removal is the second incident involving `BrokerConnectPanel`. The live-path-confirmation rule is earning its place.

---

**Session close.** WM Pro is objectively stronger: one P0 user-blocking bug fixed with build/type/test/regression evidence, one dead file removed, and a verified audit baseline committed where none existed. The largest remaining risk is that live verification of anything is currently impossible (§7), so several subsystems remain honestly UNKNOWN rather than falsely green.

**Recommended reviewer:** Sentinel — specifically the `AuthContext.tsx` guard change (auth-critical, and the null-deref near-miss deserves an independent second look) and the P0-1 `JWT_SECRET` hardening when it lands.
