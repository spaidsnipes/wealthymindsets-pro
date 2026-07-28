# VERIFICATION QUEUE

**Owner:** Sentinel · **Last updated:** 2026-07-28 10:50 CDT

Nothing is `VERIFIED` because someone said so. It is verified when a named check was run
and its output recorded. A ticket that arrives here without evidence is **returned**, not
approved.

Verdicts: `VERIFIED` · `PARTIALLY VERIFIED` · `RETURNED` · `BLOCKED` · `PENDING`

---

## Awaiting verification

| Ticket | Submitted by | Commit | Received | Verdict |
|---|---|---|---|---|
| *(none — Noah has not yet submitted WM-CHART-P0-01)* | | | | |

---

## Completed this block — 2026-07-28

### V-001 · `a73aae1` AuthContext profile guard — **VERIFIED (code review)** · APPROVED

Independent review requested by Forge because the change is auth-critical and carried a
null-deref near-miss.

| Check | Result |
|---|---|
| Null safety on the public path | **PASS** — `const profileDone = !!user && (user.profileComplete \|\| !!user.displayName)` short-circuits before any property access. The guard runs before the public-path branch returns, so `user` genuinely can be `null` here; the `!!user &&` prefix is load-bearing, not decorative. |
| Client rule matches server rule | **PASS** — mirrors `api/auth/login/route.ts`, which already treats an existing `displayName` as proof of completeness. |
| Escape path always exists | **PASS** — `profile/page.tsx` forces `setSetupMode(true)` when there is neither a flag nor a `displayName`, so a genuinely incomplete user can always finish. |
| Pre-fill preserved | **PASS** — fields still populate from localStorage, so it does not read as a profile reset. |
| Regression surface | **PASS** — `tsc` 0 errors, `npm test` 11/11 (Sentinel re-ran both at `fb063d0`). |

**Verdict: approved.** The fix is correct and the reasoning is sound.

**Low-severity observation (not blocking, no ticket yet).** A signed-in user with a
genuinely incomplete profile who lands on a public path takes an extra hop: the public-path
branch redirects to `/charts`, the guard re-runs, and the incompleteness branch then sends
them to `/profile?setup=1`. Correct destination, one wasted navigation. Worth folding into
any future touch of this effect — not worth a commit of its own.

**Still missing:** the trapped-user scenario has never been reproduced live, and the
production deploy is unconfirmed. Code review does not substitute for either.
→ WM-VERIFY-P0-01, BLOCKED by RISK-001.

---

### V-002 · `fb063d0` architecture report — claims independently re-verified

Forge's findings were treated as claims and checked against the repository.

| Forge claim | Sentinel result |
|---|---|
| Three incompatible `TIMEFRAMES` literals | **CONFIRMED** — `ChartToolbar.tsx:433` and `backtesting/page.tsx:27` both `["1m","2m","5m","15m","30m","1h","D","W","M"]`; `heatmaps/page.tsx:251` `["1D","1W","1M","3M","6M","1Y","5Y"]`. Two naming schemes, no shared module. |
| Chart and heatmap timeframe names do not align | **CONFIRMED** — `"D"` vs `"1D"`. Any string passed between the two surfaces is silently wrong today. |
| 10 of 19 required intervals missing | **CONFIRMED by arithmetic** — present: 1m, 2m, 5m, 15m, 30m, 1h, 1D, 1W, 1M. Missing: 3m, 10m, 45m, 2h, 4h, 3M, 6M, 1Y, 2Y, 5Y. |
| Markov uses a scalar return, not candle data | **CONFIRMED** — `computeMarkovState(sym, periodReturn: number)` defined page-locally at `heatmaps/page.tsx:280`. A scalar cannot encode a timeframe. |
| Chart state is based on daily percentage data | **CONFIRMED (structural)** — the chart HUD classifies regime from the live ticker's daily %. Switching interval cannot change it because nothing in the calculation depends on the interval. |
| Non-1D heatmap ≈ one upstream request per symbol | **CONFIRMED (structural)** — `api/heatmap/route.ts` `fetchMultiDay` maps `fetchDayOffset` per symbol in chunks of 50 across ~120 symbols; each call downloads a full daily series to produce one percentage. |
| Duplicate in-flight heatmap requests observed | **PARTIALLY VERIFIED** — the call-site structure supports it and Forge has a network log, but Sentinel did not independently re-observe the 3× runtime duplication (RISK-001). Recorded as Forge's observation, not as a Sentinel-verified fact. |
| Wyckoff classification is not implemented | **CONFIRMED** — zero Wyckoff function definitions repo-wide. Labels, type members and copy only. |
| TradingView baseline ≈ 60 FPS | **ACCEPTED as Forge's measurement** — 3,117 frames, median 16.7 ms, p95 17.6 ms, worst 21 ms, 0 frames >32 ms, 0 long tasks. Method is stated and reproducible; Sentinel did not re-run it. Labelled *source observation*, not *verified fact*, until reproduced. |
| WM Pro authenticated chart performance unmeasured | **CONFIRMED** — and it is the single most consequential gap. There is a competitor number and no WM Pro number, so no comparison exists. |
| 20-minute studies incomplete | **CONFIRMED, and Forge said so first.** Measured span ≈ 3 minutes, not 40. Forge recorded the shortfall rather than claiming the time. **Sentinel commends this and expects it as the standard.** |

**Sensitive-content scan of `fb063d0`:** **PASS.** No secret value, no account number, no
balance. The tastytrade section explicitly withholds the account number and records that no
order or settings control was touched.

**One correction to the report itself.** §A calls the Chrome bundle-path root cause
"VERIFIED"; the *diagnosis* is well-argued but the *fix* is untested, which the report does
state. Employees should read that root cause as **strongly evidenced, not proven**, until
Chrome is moved and `get_page_content` succeeds.

---

### V-003 · Build health at `fb063d0` — **VERIFIED**

| Check | Result | Run by | When |
|---|---|---|---|
| `./node_modules/.bin/tsc --noEmit` | **0 errors** | Sentinel | 2026-07-28 10:48 |
| `npm test` (vitest) | **11/11 passing** (`vpEngine.test.ts`) | Sentinel | 2026-07-28 10:48 |
| `npm run build` | 69/69 pages — **carried forward from `a73aae1`**, not re-run at `fb063d0` | Forge | 2026-07-28 |
| Local `HEAD` == `origin/main` | **CONFIRMED** `fb063d076e2c…` | Sentinel | 2026-07-28 10:47 |

The two commits since the last build are documentation-only, so the build result carries
forward. It is still labelled PARTIALLY VERIFIED rather than VERIFIED, because "should be
fine" is how build breaks reach Friday.

**Test coverage reality check:** 11 tests in **one** file covering the VP engine. That is
the entire automated safety net for a trading application. WM-TEST-P0-01 is not
nice-to-have.

---

## Permanent verification standards

1. **Evidence or it is not verified.** Name the command, record the output.
2. **Code review never certifies runtime behaviour.** They are separate verdicts.
3. **A claim that cannot be checked is labelled UNKNOWN,** not assumed good.
4. Verification runs against the **canonical clone** at the stated commit. Confirm
   `git rev-parse HEAD` first.
5. **PARTIALLY VERIFIED is a real, respectable verdict.** Use it instead of rounding up.
6. Verified work still needs its handoff before the ticket advances.
