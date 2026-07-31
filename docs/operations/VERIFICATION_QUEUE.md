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

### V-008 · `WM-CHART-P0-01B-PREREQ-SCANNER-A11Y-01` (Codex artifact) — **APPROVED**

**Ticket:** `/Users/dspaidnoosleep/Documents/Codex/2026-07-28/product-director-for-wow-world-own/outputs/WM_PR1_SCANNER_ACCESSIBLE_IDENTITY_PREREQUISITE_TICKET_2026-07-29.md`
(documentation-only spec, no implementation yet — this is a **gate-to-implement** ruling,
not a code-verification ruling).

**Note on timing.** This ruling was reached in conversation on 2026-07-30 but not committed
to this bus until now — the exact failure mode DEC-002 exists to prevent. V-007 (2026-07-29)
correctly recorded this ticket as "NOT PROMOTED... no corroboration attempted." This entry
closes that gap with the corroboration actually performed.

| Check | Result |
|---|---|
| Base `c09b174` / parent | **CONFIRMED** — `git log` shows parent `b1603d0` exactly as the ticket states. |
| Quarantine seat `2f03f965` | **CONFIRMED** — real commit, checked out as a real `git worktree` at the exact claimed path, untouched. |
| Proposed branch/worktree `noah/wm-pr1-scanner-a11y-prereq` | **CONFIRMED absent** from both `git branch -a` and `git worktree list` — no collision. |
| Problem statement | **VERIFIED directly in source**, not taken from the ticket. At `c09b174`, `src/app/scanner/page.tsx:440-443` — refresh button is icon-only (`<RefreshCw size={12}/>`), zero `aria-label` anywhere in the file, zero `<select>` elements. Line 166 confirms non-retryable-failure caching by identity. |
| Scope | Narrow 4-file manifest, explicit forbidden-changes list correctly excludes provider/auth/db/Option-A surface, single-commit rollback. |

**Coordination note, not a blocker.** This ticket and WM-CHART-P0-01B's Yahoo-consumer work
both touch `scanner/page.tsx`. Manifest and forbidden-changes list correctly wall off the
RSI-retry layer from the Yahoo-consumer layer, but they should land **serialized, not
parallel** — whichever lands second rebases, does not merge blind.

**What this approves and does not.** Noah may implement against this spec. It does **not**
close the ticket — the resulting commit still needs an independent Sentinel PASS (tests,
build, and the runtime accessibility/request-count evidence the spec itself calls for)
before Option A can rebaseline on top of it.

**Not corroborated, flagged rather than repeated:** the "44% DONE, 27 tracked items" figure
attributed to an Atlas Drive checkpoint. Per RISK-007, a percentage without a stated,
independently-checkable method does not get repeated here as fact.

---

### V-009 · `e0a5ed7` WM-STATE-P0-01 Markov engine — **PARTIALLY VERIFIED · NOT "SHIPPED"** · returned to the queue

**The engine itself is good work.** `src/lib/markov.ts` (297 lines) makes fabrication
structurally unrepresentable rather than merely discouraged: the return type is a
discriminated union whose `insufficient-evidence` branch **carries no probability fields at
all**, so a caller cannot accidentally read a percentage off an unavailable result. Two
independent gates (`MIN_TRANSITIONS_TOTAL`, `MIN_TRANSITIONS_CURRENT`) plus a
design-level gate that abstains when the classification itself is unsound. 292 lines of
tests. This is the right pattern and it should be the house style.

**Automated evidence re-run by Sentinel:** `tsc --noEmit` **0 errors**; `npm test` **85/85
across 6 files** (up from 43). Matches the reported figures.

**But the acceptance criteria are not met, because nothing calls it.**

| WM-STATE-P0-01 acceptance criterion | Verdict |
|---|---|
| Extract `computeMarkovState` out of `heatmaps/page.tsx` | **NOT MET** — it is still defined page-locally at `heatmaps/page.tsx:283` and still invoked at `:340` as `computeMarkovState(ms.sym, pcts[ms.sym] ?? 0)`. The scalar path is still the live one rendering to users. |
| Input changes from a scalar to a candle series + `TFId` | **NOT MET on the live path.** True inside the new module; the rendered surface still passes a single number. |
| Switching 15m→4h **provably changes** the computed inputs | **CANNOT BE TRUE TODAY** — no rendered surface consumes the engine. |
| `calculatedFor` always equals active symbol + timeframe | **N/A** — nothing populates it. |
| Insufficient history renders `unavailable`, never a guess | **MET, trivially** — `chartContext.ts` initialises `markov: unavailableSlot()` and never updates it. |

**Zero importers — established definitively, not inferred:**

```
grep -rE "from ['\"][^'\"]*markov['\"]"  src   →  (no matches outside markov.test.ts)
MarkovState, MARKOV_STATES, MIN_TRANSITIONS_TOTAL,
MIN_TRANSITIONS_CURRENT, markovConfidence, MarkovConfig,
MarkovResultUnavailable   →  0 uses outside markov.*
```

`chartContext.ts` does **not** import the engine. It declares `markov: StateSlot<unknown>`
and hardcodes `unavailableSlot()`; the string "markov" appears there only as a slot name and
a scope comment. `education/page.tsx` matches only a topic string.

**Verdict: PARTIALLY VERIFIED. The engine is built and correct; the ticket is not done.**
"SHIPPED" in `EMPLOYEE_STATUS` overstates it — the honest status is *engine complete,
integration outstanding*. Returned to the queue for the wiring half. **No fabrication risk
in the interim**, because the unwired slot reads `unavailable` rather than guessing — that
is the correct failure mode and it is why this is a returned ticket rather than an incident.

---

### V-008a · RISK-013 closure — **outcome correct, stated reason wrong**

RISK-013 was closed on the basis that *"`a4f8f5d` markov.ts is now reachable via `e0a5ed7`."*

`a4f8f5d` is **still not reachable** — `git merge-base --is-ancestor a4f8f5d origin/main`
returns NO, and no branch contains it. What is actually true is better: the content was
**re-committed intact** as `e0a5ed7`, which *is* on `origin/main`.

I verified the rescue lost nothing, by blob hash rather than line count:

| File | `a4f8f5d` | `e0a5ed7` |
|---|---|---|
| `src/lib/markov.ts` | `66a084bb…` | `66a084bb…` — identical |
| `src/lib/markov.test.ts` | `7c332d35…` | `7c332d35…` — identical |

**Closure stands. The reason is corrected** so that a future reader who tests reachability of
`a4f8f5d` finds it false, and does not either reopen a resolved risk or start distrusting
the register. Correct wording: *content re-committed intact as `e0a5ed7`; the original
dangling object was abandoned, not rescued.*

---

### V-007 · Atlas checkpoint deltas (2026-07-29 15:30 CDT) — audited, **2 contradictions found**

Six deltas were submitted for recording. Sentinel audited each against the repository
before recording anything. Hash existence alone is not corroboration — every hash cited
existed, and two of the claims attached to them were still wrong.

| ID | Claim | Sentinel verdict |
|---|---|---|
| **D1** | WM-RESP-P0-02 CLOSED at `9f2c68d` + `176fe7f` | **CORROBORATED (source-level).** Both commits are ancestors of `HEAD`. `grep` for `maximum-scale` / `user-scalable` across `src/` returns **zero hits** — pinch-zoom is genuinely permitted. The live-audit figures (360×800 / 390×844 / 834×1194, `horizontalOverflow:false`, `smallTargets:[]`) are recorded as the **submitting session's runtime observation**, not re-observed by me. Correctly carries no deployment claim. |
| **D2** | Noah CLAIMED WM-CHART-P0-03 at `44c8d1a`, execution HELD | **CORROBORATED.** `44c8d1a` is `HEAD` and `origin/main`; it is a docs-only claim commit. Recorded as VERIFIED CLAIM, EXECUTION HELD. |
| **D3–D5** | Codex filings (scanner a11y prereq, Option A V5 HELD contract, Video Intelligence appendix) | **NOT PROMOTED.** Recorded as documented claims only, exactly as instructed. No repository or runtime corroboration attempted or implied. |
| **D6** | markov files "untracked in-progress work, preserved, not touched" | **CONTRADICTED — see below.** |
| **INV** | `2f03f965` quarantine seat present as a commit | **VERIFIED INTACT.** Not reachable from `HEAD`, but that is not a defect — it lives on branch `noah/wm-chart-pr1-seat`, which exists both locally and at `origin`. The seat is genuinely preserved. |
| **INV** | Option A hold intact, no hashes issued; no push/deploy/DB/credential/brokerage action; WM Pro NO-GO unchanged | **No contrary evidence found.** I did not perform any such action this turn either. |

#### Contradiction 1 — `a4f8f5d` is a **dangling commit**. The work it contains is not on any branch.

`EMPLOYEE_STATUS.md` records Forge's WM-STATE-P0-01 as *"(`a4f8f5d`, deterministic core) —
engine + tests shipped."* The commit exists and contains real work: `src/lib/markov.ts`
(297 lines), `src/lib/markov.test.ts` (292 lines), and a 253-line architecture document.

**But it is unreachable.** `git merge-base --is-ancestor a4f8f5d HEAD` → **NO**.
`git branch -a --contains a4f8f5d` → **empty**. No branch, local or remote, contains it.
`git log --all -- src/lib/markov.ts` → **empty**.

So "shipped" is not true in any sense that survives a `git gc`. The 589 lines of engine and
test code exist as an orphaned object plus untracked copies in the working tree. **This is
the single most fragile state in the repository right now** — worse than uncommitted work,
because a commit hash in a status table reads as durable and this one is not.

**Not fixed by me.** Rescuing it means creating a ref, which is Forge's call on Forge's
work, and the Option A hold means I issue no hashes. → **RISK-012**, and Forge should
`git branch wm-state-p0-01-rescue a4f8f5d` (or re-commit) at the earliest safe moment.

#### Contradiction 2 — D6 and `EMPLOYEE_STATUS` cannot both be true.

D6 lists `src/lib/markov.ts`, `markov.test.ts` and the architecture doc as **untracked
in-progress work**. `EMPLOYEE_STATUS` says the same files were **shipped** at `a4f8f5d`.
Both records describe the same three files. The working tree confirms them as `??`
untracked.

Both statements are individually defensible and jointly misleading: the files *are*
untracked, and a commit containing them *does* exist — dangling. An employee reading the
status table would believe the Markov engine is on `main`. It is not. **The checkpoint
recorded the preservation instruction correctly and missed that the same files carry a
false completion claim elsewhere in the bus.**

**Nothing was promoted to VERIFIED that was not corroborated, and no delta was dropped.**

---

### V-006 · `d2ea511` WM-CHART-P0-01 Canonical Timeframe System — **PARTIALLY VERIFIED · ACCEPTED and CLOSED**

Verified against the seven acceptance criteria as written in the queue.

| # | Acceptance criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Exactly one `TFId` definition repo-wide | **PASS** | single definition, `src/lib/timeframes.ts:35` |
| 2 | Zero remaining local timeframe literals | **PASS** | the three former literals now derive from `CHART_TF_SHIPPED` / `HEATMAP_TF_ORDER`. `grep TIMEFRAMES` still returns hits, but every one is a *derivation from* the canonical module, not a hardcoded interval array. Criterion met in substance. |
| 3 | `"D"/"W"/"M"` unified with `"1D"/"1W"/"1M"` | **PARTIAL** | canonical vocabulary is unified, but `legacyChartId` + `toChartEmitId()` still emit `"D"/"W"/"M"` to six unmigrated consumers |
| 4 | Every interval labelled from **measured** provider probes | **PASS — and this is the strongest part of the work** | `PROVIDER_EVIDENCE` records provider, probe date, probe symbol, `validIntervals`, `rejectedIntervals` (`3m`,`10m`,`45m`,`2h`), and per-interval OK/ERROR depth boundaries |
| 5 | Aggregation only from an exact integer divisor | **PASS** | enforced at runtime (`aggregateCandles` throws on `1.5` and `0`) and covered by tests |
| 6 | Unsupported intervals render **disabled with an honest reason** | **NOT MET** | the toolbar maps only `CHART_TF_SHIPPED` (9 ids). Unsupported and aggregated intervals are **absent from the UI entirely** — no disabled state, no reason surfaced. `unsupportedReason` exists in the model and is never rendered. |
| 7 | No state-model change, no UI restyle | **PASS** | diff touches only the three call sites plus the new module and its tests |

**Build health at verification time:** `tsc --noEmit` **0 errors**; `npm test` **43/43
passing across 3 files** (up from 12 — `timeframes.test.ts` adds 31).

*Caveat, stated rather than hidden:* the working tree was dirty with Forge's active
WM-CHART-P0-02 edits when these ran, so the result validates `d2ea511` **plus** that WIP,
not `d2ea511` in isolation. I did not stash another employee's uncommitted work to get a
cleaner reading.

**Verdict: PARTIALLY VERIFIED, accepted, closed.** The core objective — one canonical
module that separates candle interval, visible range, provider interval and display label —
is genuinely achieved, with better evidence than the ticket asked for. Holding four
dependent P0s hostage to a toolbar affordance would be poor prioritisation. The two gaps
are carried as their own tickets rather than waved through:

- AC#3 → **WM-CHART-P0-01b** (already raised by Forge, correctly scoped, correctly flagged
  as unverifiable without an authenticated session).
- AC#6 → **WM-CHART-P0-04** (new, P2): surface unsupported intervals as disabled with their
  `unsupportedReason`, or record a decision that hiding them is the intended UX. Hiding is
  not dishonest, but it does leave a user wondering why `4h` does not exist, and the model
  already holds the answer.

**Two findings worth promoting beyond this ticket.**

1. **The silent-downgrade discovery is the most valuable thing in this commit.**
   `range=max` returns `dataGranularity="3mo"` for *every* requested interval — the provider
   answers HTTP 200 with data at the wrong granularity rather than erroring. Rendering that
   as 1m candles would have put fabricated-looking bars on the chart while every test
   passed. `assertGranularity()` makes it unrepresentable. This is the same class of defect
   as the Wyckoff schematic (V-004/V-005) — *plausible-looking output with nothing real
   behind it* — caught before it shipped rather than after. Atlas may index this as a
   **verified fact**.
2. **`MainChart.tsx:219` maps `2h`/`4h` to provider interval `"60"`** — flagged by Forge as
   a possible pre-existing mislabel, **UNVERIFIED**. If real, the chart has been silently
   serving 1-hour candles under a 2h/4h label. That is a truthfulness defect, not a cosmetic
   one. **Sentinel is raising this to its own P1 ticket rather than leaving it as a
   parenthetical in a closed ticket's next-action field**, because that is exactly where
   findings go to die.

---

### V-005 · `e1a8c94` Wyckoff fabrication fix — **VERIFIED · ACCEPTED**

| Acceptance criterion (WM-WYCK-P0-01) | Result |
|---|---|
| Hardcoded schematic no longer renders as live analysis | **PASS** — the literal array is deleted |
| No phase presented as detected | **PASS** — no `CURRENT` badge, no pulse, no completion checkmarks; the block now reads *"Unavailable — phase model not implemented. No phase is inferred for the current symbol."* |
| Regression guarded | **PASS** — `SmartMoneyPanel.truthfulness.test.ts` asserts the honest string is present and that `"Spring / Shakeout"`, `>CURRENT</span>` and `{ phase: "PS"` are absent |
| `tsc --noEmit` | **PASS** — 0 errors |
| `npm test` | **PASS** — 12/12 (was 11/11; the new test is the twelfth) |
| No dead import left behind | **PASS** — `CheckCircle2` is still used at two other call sites |

**Verdict: accepted.** Correct fix, honest replacement copy, guarded against regression.

**Correction to Sentinel's own record.** My V-004 entry cited the file as
`src/components/chart/SmartMoneyPanel.tsx`. **That path does not exist.** The real path is
`src/components/smart-money/SmartMoneyPanel.tsx` — I glob-matched the file and then wrote
down the wrong directory. Corrected here and in the queue and risk register. I would have
returned another employee's work for this, so I am recording it rather than quietly fixing it.

**Additional scan Sentinel ran (new evidence, good news).** I checked whether the same
fabrication pattern appears elsewhere in that panel. It does not. Every other unavailable
metric — Absorption, Volume Tails, PDH/PDL, Spoofing, Stop Run, Trapped Traders, Iceberg,
Dark Pool, Delta Divergence, CVD — already states `"N/A — needs <specific missing data>"`
with an honest reason, and the computed ones (VWAP, CVD, order-flow imbalance) derive from
real tape. **The Wyckoff schematic was the single outlier in an otherwise exemplary panel.**
That materially downgrades the "systemic fabrication" concern to "one missed block."

**Still true, and still the lesson:** the truthfulness pass corrected the honest text in
this same file and missed the block below it, because it was searching for misleading
*wording* and the fabrication was a *data structure*. Future sweeps must grep for hardcoded
arrays feeding analytical UI.

**Outstanding:** Forge's written handoff for this work.

---

### V-004 · `89f963e` Wyckoff fabrication finding — **VERIFIED, CONFIRMED**

Forge's claim was checked directly against `src/components/smart-money/SmartMoneyPanel.tsx`
rather than accepted from the report.

| Forge claim | Sentinel result |
|---|---|
| Schematic renders from a hardcoded array | **CONFIRMED** — a literal array of seven `{phase, label, done}` objects, mapped to JSX |
| Four phases marked complete, Spring/Shakeout marked CURRENT | **CONFIRMED** — PS/SC/AR/ST `done: true`; Spring `done: true, active: true`, rendered with a pulsing `CURRENT` badge; LPS/SOS pending |
| No symbol, price, volume or tape input feeds it | **CONFIRMED** — the block references no props, no state, no market data of any kind |
| Renders identically for every symbol under every condition | **CONFIRMED by construction** — there is no input that could vary it |
| Same component honestly reports the model is not implemented | **CONFIRMED** — the panel admits the absence and draws the output anyway |

**Verdict: confirmed, and escalated to RISK-011 (HIGH).** This is the most severe *currently
shipping* truthfulness defect known to the company — the others on the register are exposures;
this one renders to users on every chart view.

**Sentinel's added finding, not in Forge's report.** The truthfulness pass corrected the
honest message in this same file and missed this block. The generalisable lesson:
**a truthfulness audit that searches for misleading *text* will not catch fabrication
expressed as a *data structure*.** Any future truthfulness sweep must look for hardcoded
arrays and literals feeding analytical UI, not just wording. Atlas may index this as a
*verified fact*; it is not yet a ratified company standard.

**Ticket raised:** WM-WYCK-P0-01 — unblocked, small, independent of every other ticket.

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
