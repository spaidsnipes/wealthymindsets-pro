# ATH Video Intelligence — Evidence Report 2026-07-28

**Analyst:** Claude (ATH Video Intelligence — Visual Evidence & Recording Analyst)
**Role boundary:** verification-class. No production code written. No fix claimed from video alone.
**Scope:** recording inventory, time-indexed findings, routing to DREAMBOARD / WM PRO / WOW WORLD / SHARED DESIGN REFERENCE.

---

## 0. Capability note — how these frames were actually read

No `ffmpeg`/`ffprobe` on this machine and no PyObjC. Frames were decoded with a
purpose-built Swift/AVFoundation extractor (`AVAssetImageGenerator`, zero-tolerance
seeks) compiled in the session scratchpad. Every timestamp below is a real decoded
frame at that offset, not a thumbnail inference.

**Corrected prior error.** A previous session reported *"the screen recording
doesn't exist — no `10.09.09 AM.mov` on this machine."* That conclusion was
produced by a filename-construction bug, not by absence: macOS screen-recording
filenames use **U+202F NARROW NO-BREAK SPACE** (`e2 80 af`) before `AM`/`PM`. A
hand-typed ASCII space yields `ENOENT`, which reads as "file not found." All
recording paths in this report were obtained by glob, never by typing.

That error is now double-corrected: `10.09.09` genuinely is absent from local
disk (§4), but the earlier session had no valid basis for saying so.

---

## 1. Recording inventory

**41 screen recordings on Desktop; ~35 GB.** Full corpus retained — no deletion
recommended for any asset (§4).

### Assets analyzed this session

| ID | File (Desktop) | Start | Duration | Size | Res / FPS |
|---|---|---|---|---|---|
| **REC-01** | `Screen Recording 2026-07-28 at 11.47.22 AM.mov` | 11:47:22 | **15m 02s** | 494 MB | 1920×1080 @ 57.28 |
| REC-02 | `Screen Recording 2026-07-28 at 8.17.30 AM.mov` | 08:17:30 | 5s | 4 MB | not analyzed (trivial) |

### Referenced but MISSING — see §4

| ID | Name as shown in REC-01 | Status |
|---|---|---|
| **MISS-01** | `Screen Recording 2026-07-28 at 10.09.09 …` | **Not on disk anywhere** |
| **MISS-02** | `Screen Recording 2026-07-28 at 11.02.59 …` | **Not on disk anywhere** |
| **MISS-03** | `Screen Recording 2026-07-28 at …1.40.50 …` | **Not on disk anywhere** |

### Largest retained assets (unanalyzed, high value)

| File | Duration | Size |
|---|---|---|
| `2026-05-24 at 5.23.12 PM.mov` | **4h 30m** | 8.0 GB |
| `2026-07-06 at 8.45.52 AM.mov` | **2h 06m** | 6.4 GB |
| `2026-06-30 at 8.49.08 AM.mov` | 55m | 3.4 GB |
| `2026-07-16 at 9.17.53 AM.mov` | **2h 52m** | 988 MB |
| `2026-06-30 at 2.30.01 PM.mov` | 43m | 2.7 GB |

~14 hours of unreviewed capture across the top 5 alone. Not triaged this session.

### What REC-01 actually contains

**Not a product recording.** REC-01 is a capture of the *ChatGPT-side ATH
operations org* — sidebar threads named `Sentinel Company operations`,
`ATLAS company memory`, `Sentinel for Dreamboard`, `Noah- Dreamboard`,
`FORGE-DREAMBOARD`, `Dreamboard Research Lab`, `ATH Video Intelligence`,
`SENTINEL WM PRO APP`, `FORGE-WM PRO`, `NOAH- WM PRO`, `SENTINEL - WOW World`,
`FORGE - WOW WORLD`, `NOAH-WOW WORLD`, `Founder's strategic thinking room`.

Evidence in it is **founder intent and cross-org process state**, not observed
product behavior. No finding below claims UI behavior from REC-01 — the product
claims it carries are routed as *requests requiring repository verification*,
which is exactly what I then did against source.

---

## 2. Findings — time-indexed

Schema: recording identity · timestamp · observed behavior · severity · product · verification status.

---

### VE-001 — Dreamboard "no source code" blocker is FALSE
- **Recording:** REC-01 @ **00:05** and **03:05** (screen clock 11:47 / 11:50)
- **Observed:** ChatGPT-side "Verified blocker" panel states: *"There was no
  existing project source code in the workspace or connected GitHub account to
  migrate. The repositories therefore contain initialized READMEs."* It declares
  the next operational requirement to be locating any Dreamboard code, and that
  Sentinel/Forge/Noah are all gated behind it.
- **Verification: REFUTED — VERIFIED LOCALLY.** `~/dreamboard` is a real git
  repository with real history and a real app tree:
  - `2049bdd feat(growth): add private Growth Rings progress wall`
  - `4a5446f fix(passport): clarify email sign-in paths`
  - `3bb5c51 fix(passport): keep Dreamboard links on stable host`
  - Working tree on branch `feature/project-memory-health` carrying
    `app/memory.tsx`, `lib/creative-health.ts`,
    `supabase/dreamboard-project-memory.sql`, `docs/operations/`, `docs/research/`.
- **Severity:** **CRITICAL** — this false blocker is halting three roles on the
  other side of the org for a reason that does not exist.
- **Product:** DREAMBOARD
- **Action:** Point the ChatGPT-side org at `~/dreamboard` (local clone, branch
  `feature/project-memory-health`). The "reconstruct real state" work it is
  waiting to start is unnecessary.

---

### VE-002 — GitHub connector sees zero repositories
- **Recording:** REC-01 @ **00:05**
- **Observed:** *"The GitHub plugin is installed, but it still reports zero
  accessible repositories. The five repositories exist under `spaidsnipes`;
  GitHub app access must include them."* Request to grant access is pending.
- **Verification:** **UNVERIFIED** — GitHub app installation scope is not
  inspectable from this machine. Note this is the *proximate cause* of VE-001:
  the connector saw nothing, and that was misreported as "no code exists."
- **Severity:** HIGH · **Product:** SHARED / OPS
- **Action:** Founder grants the GitHub app access to the `spaidsnipes` repos.

---

### VE-003 — Charts are the stated release gate for WM Pro
- **Recording:** REC-01 @ **07:05** (founder message, composed on screen)
- **Observed, verbatim:** *"the wm app actually needs to be finished 1st … this
  app is sooo close to being done once the charts are fully fixed"*
- **Verification:** **CORROBORATED BY SOURCE.** Matches the independent chart
  audit in `WM_CHART_ARCHITECTURE_2026-07-28.md` — WM-CHART-P0-01 (Canonical
  Timeframe System) is already the ordered first ticket.
- **Severity:** **P0** · **Product:** WM PRO
- **Action:** No new work. Confirms existing priority order.

---

### VE-004 — Founder believes heatmaps are fixed; source says otherwise
- **Recording:** REC-01 @ **07:05**
- **Observed, verbatim:** *"we have all the timeframes on the heatmaps section
  also and heatmaps is fixed"*
- **Verification: CONTRADICTED BY SOURCE.** The chart audit found **three
  mutually incompatible `TIMEFRAMES` literals** (chart `"D"` vs heatmap `"1D"`)
  and **10 of 19 required intervals missing**. Non-1D heatmap periods still fire
  ~120 upstream requests, one per symbol.
- **Severity:** **HIGH — expectation gap.** The founder is treating a P0 as
  closed. If unaddressed, WM Pro ships believing a broken subsystem is done.
- **Product:** WM PRO
- **Action:** Reconcile directly with founder before Friday. Either the fix
  landed somewhere unmerged, or the belief is mistaken. **Do not silently
  proceed on either assumption.**

---

### VE-005 — News section cluttered with non-news content
- **Recording:** REC-01 @ **07:05**
- **Observed, verbatim:** *"the news section less cluttered with the clc rules
  and stuff it should be just news in the news sections"*
- **Verification:** **PARTIALLY VERIFIED.** `src/app/news/page.tsx` exists; CLC
  logic is present in `SmartMoneyPanel.tsx`, `FabioInsights.tsx`,
  `PineCommunityLibrary.tsx`, `CustomIndicatorBuilder.tsx`. Whether CLC surfaces
  render *inside* the news route was not confirmed — requires live UI, and
  `/charts`-class routes are auth-gated to me.
- **Severity:** MEDIUM · **Product:** WM PRO
- **Action:** Needs live-UI confirmation before ticketing.

---

### VE-006 — "Black excellence … since the 1900s" copy to be removed
- **Recording:** REC-01 @ **07:05**
- **Observed, verbatim:** *"take off the black exellence since the 1900s"*
- **Verification: VERIFIED IN SOURCE — exact string located, 2 sites:**
  - `src/app/tv/page.tsx:104` — *"Podcasts, live conversations & Black excellence on air since the 1900s"*
  - `src/app/tv/page.tsx:383` — *"… Black excellence on air since the 1900s. Up to 4 on video at once."*
  Both are in **TV**, not Radio.
- **Ambiguity requiring founder input:** a *third* site,
  `src/app/radio/page.tsx:1005`, reads *"A premium home for Black excellence in
  music and trading culture"* — same phrase, **without** "since the 1900s." The
  instruction names the dated phrasing specifically. Removing all three is a
  broader change than was asked. **Not resolved by me.**
- **Severity:** LOW (copy) · **Product:** WM PRO
- **Action:** Confirm scope — the two dated TV strings only, or the Radio line too.

---

### VE-007 — Radio and Profile read as too black-dominant
- **Recording:** REC-01 @ **07:05**
- **Observed, verbatim:** *"on the wm radio i feel it looks to black dominant
  and so does the profile"*
- **Verification:** **UNVERIFIED — visual judgement, requires live render.**
  This is a color/contrast observation about the surfaces, not about content.
  `src/app/radio/page.tsx` and the profile route exist.
- **Severity:** MEDIUM · **Product:** WM PRO → also **SHARED DESIGN REFERENCE**
- **Action:** Needs a real render. Blocked with VE-012.

---

### VE-008 — Design intent: keep the Black cultural identity, widen the welcome
- **Recording:** REC-01 @ **07:05**
- **Observed, verbatim:** *"i want it to feel for more everybody still although
  i want to point my people out also, but i really love the black cultural feel
  lets keep that"*
- **Verification:** N/A — founder design principle, not a defect.
- **Severity:** N/A — **binding design constraint** · **Product:** **SHARED DESIGN REFERENCE**
- **Action:** Record in the shared design reference. This governs VE-006 and
  VE-007: the correction is *tonal balance*, explicitly **not** removal of Black
  cultural identity. Any implementer acting on VE-006/VE-007 must read this
  first, or they will over-correct.

---

### VE-009 — Lounge must become a real social surface
- **Recording:** REC-01 @ **10:35**
- **Observed, verbatim:** *"people should be able to start really. using the
  lounge etc likemyspace instagram discord, tiktok apple music etc because this
  platform is all of that and more in one"*
- **Verification:** **CORROBORATED — work appears already in flight.**
  `src/app/lounge/page.tsx` is uncommitted in the working tree with
  **+192 / −2 lines**. Author unknown to me; not my change.
- **Severity:** HIGH (scope) · **Product:** WM PRO
- **Action:** **Custody risk.** 192 uncommitted lines of feature work are sitting
  in a dirty tree. Identify the owner and commit or stash before any implementer
  branches. See VE-011.

---

### VE-010 — Release NO-GO on the ops side; NOAH-P0-001 is the only safe ticket
- **Recording:** REC-01 @ **14:35** (second window, `TEAM DISCUSSIONS ATH/DIRECTION/PROMPT…`)
- **Observed:** *"Release remains NO-GO."* First safe ticket:
  **NOAH-P0-001 — Clean release baseline and Passport-change custody.**
  - VERIFIED IN REPOSITORY: dirty working tree and two lint failures
  - VERIFIED IN REPOSITORY: local Supabase public configuration names absent
  - UNVERIFIED: authoritative preview/production URL
  - UNVERIFIED: applied MVP migrations, RLS, storage policies
  - UNVERIFIED: approved Passport method (email link, code, or both)
  - Founder decisions still required: auth method · release URL/environment ·
    demo/beta vs public · P0 text-import format and size limit
- **Verification:** **"dirty working tree" INDEPENDENTLY CONFIRMED** — see VE-009
  and VE-011. The remainder is second-hand from screen and not re-verified here.
- **Severity:** P0 · **Product:** DREAMBOARD (Passport/Supabase context)
- **Action:** Consistent with my own finding. NO-GO stands.

---

### VE-011 — Concurrent uncommitted work in both repos
- **Recording:** N/A — repository state, corroborating VE-009 / VE-010
- **Observed:** WM Pro: `src/app/lounge/page.tsx` (+192/−2) and
  `tsconfig.tsbuildinfo` modified and uncommitted. Dreamboard: five untracked
  paths on `feature/project-memory-health`. During this session a *second agent*
  committed `ab31e3c docs(ops): establish ATH operations bus + Sentinel
  verification pass` to WM Pro `main` and further modified
  `docs/operations/DECISIONS.md`.
- **Severity:** HIGH · **Product:** SHARED / OPS
- **Action:** Two writers are live on `main`. Establish custody before Noah or
  Forge branches. Nobody should branch off a dirty tree.

---

## 3. Routed queues

### DREAMBOARD — priority
| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | **VE-001** False "no source code" blocker — code is at `~/dreamboard` | CRITICAL | Refuted locally |
| 2 | VE-010 Release NO-GO / NOAH-P0-001 baseline custody | P0 | Partly confirmed |
| 3 | VE-011 Untracked work on `feature/project-memory-health` | HIGH | Confirmed |

### WM PRO — priority
| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | **VE-004** Heatmap "fixed" belief vs. source contradiction | HIGH | Contradicted |
| 2 | VE-003 Charts are the release gate (WM-CHART-P0-01) | P0 | Corroborated |
| 3 | VE-009 Lounge social surface + 192 uncommitted lines | HIGH | Corroborated |
| 4 | VE-005 News section decluttering | MEDIUM | Partial |
| 5 | VE-007 Radio / Profile too black-dominant | MEDIUM | Unverified |
| 6 | VE-006 Remove dated "since the 1900s" copy (tv:104, tv:383) | LOW | Verified |

### WOW WORLD
No findings. REC-01 shows `SENTINEL - WOW World`, `FORGE - WOW WORLD`,
`NOAH-WOW WORLD` threads exist, but no WOW World product evidence appears in any
analyzed frame. **Queue empty — not "clean," unexamined.**

### SHARED DESIGN REFERENCE
| # | Finding | Note |
|---|---|---|
| 1 | **VE-008** Keep Black cultural identity, widen welcome | **Binding.** Governs VE-006 & VE-007 — prevents over-correction. |
| 2 | VE-002 GitHub connector scope | Ops-wide unblock |

---

## 4. Retention — NO DELETION AUTHORIZED

**Retention requirements are NOT satisfied. No recording may be deleted.**

### Critical: three recordings already lost locally

REC-01 @ **10:35** shows three `.MOV` files attached to the founder's ChatGPT
message: `10.09.09`, `11.02.59`, and `~1.40.50`. A filesystem-wide search
(`find /`, maxdepth 8) returns **none of them**. Only `11.47.22` and `8.17.30`
exist for 2026-07-28.

These are the recordings the founder explicitly asked to be analyzed frame by
frame — *"analyze frame by frame the videos then lets get to work."* They are
the **primary product evidence**, and REC-01 (the meta-recording of the ops
session) is not a substitute for them: REC-01 contains intent, not product
behavior.

**Consequence:** every product-behavior claim in §2 is currently sourced from a
founder's written description, not from observed UI. That is why VE-005 and
VE-007 remain UNVERIFIED and why VE-004 is a *contradiction* I cannot resolve.

**Recovery paths, in order:**
1. Re-download from the ChatGPT conversation (uploads persist server-side).
2. Check the recording device — MP4-named captures in `~/Downloads`
   (`ScreenRecording_06-22-2026 …_1.MP4`) suggest an iOS device is also a source.
3. Trash / recently-deleted, and any iCloud Desktop sync.
4. If unrecoverable: re-record the same three flows.

### Standing retention rule
- 41 Desktop recordings, ~35 GB — **all retained.**
- ~14 hours of high-value capture in the top 5 files alone is **unreviewed**.
  Nothing may be deleted while unreviewed material remains.
- Deletion becomes discussable only when: every recording is inventoried and
  time-indexed, findings are extracted into durable docs, and each finding is
  either shipped or ticketed with the evidence preserved in the ticket.
- **Extracted knowledge outlives the file — but not before it is extracted.**

---

## 5. Verification status ledger

| Status | Findings |
|---|---|
| VERIFIED (source/repo) | VE-001 (refuted), VE-006, VE-009, VE-011 |
| CORROBORATED | VE-003, VE-010 (partial) |
| CONTRADICTED | **VE-004** |
| UNVERIFIED — needs live UI | VE-005, VE-007 |
| UNVERIFIABLE from this machine | VE-002 |

**No fix is claimed by any finding in this report.** Nothing here has been
implemented, and nothing here should be treated as done.

---

## 6. Founder decisions required

1. **VE-004** — Heatmaps: is the timeframe fix real and unmerged, or is the
   belief mistaken? Blocks the Friday release picture.
2. **VE-006** — Copy scope: the two dated TV strings only, or `radio:1005` too?
3. **MISS-01/02/03** — Recover the three recordings, or authorize re-recording?
   Product-behavior verification is blocked until then.
4. **VE-002** — Grant GitHub app access to `spaidsnipes` repos.
5. **VE-011** — Who owns the 192 uncommitted lounge lines?

---

# Appendix A — Second pass: REC-03 product footage recovered

Added after the initial report. The §4 conclusion that *no product-behavior
evidence was available* is **now partially superseded** — not because the three
missing uploads were found (they are still missing), but because a previously
uninventoried asset turned out to contain the auth-gated surface.

## A.1 New asset

| ID | File | Duration | Size | Content |
|---|---|---|---|---|
| **REC-03** | `Screen Recording 2026-07-16 at 9.17.53 AM.mov` | **2h 52m** | 988 MB | Mixed: authenticated WM Pro `/charts` (production) + TradingView analysis session |

`1920×1080 @ 8.21 fps`. Recorded **2026-07-16**, twelve days before the current
work — this is a **BEFORE state**, usable as the baseline for before/after
comparison once a current capture exists.

**Significance:** REC-03 shows `wealthymindsets-pro.vercel.app/charts` while
signed in. That is the surface I have repeatedly been unable to reach live
(auth-gated; I will not enter the founder's password). Video is now the only
channel through which this surface has been observed.

---

### VE-012 — Authenticated WM Pro /charts footage exists in the corpus
- **Recording:** REC-03 @ **01:00**
- **Observed:** Production URL `wealthymindsets-pro.vercel.app/charts`, signed
  in (PRO badge, "Enter Passphrase" control present). Full app shell visible:
  left rail = Charts · Heatmaps · Scanner · News · Morning Prep · Lounge ·
  WM TV · WM Radio · Creator · Partnerships · Shop · Profile. Right panel =
  Smart Money Tools, Confluence Score 83, NEUTRAL, VWAP/CVD/Imbalance/Candle
  chips, "Absorption reversal · LONG", Paper BUY / Paper SELL, WM DELTA BUBBLES.
  DOM ladder, footprint/volume-profile chart, top ticker tape all rendering.
- **Severity:** N/A — capability finding · **Product:** WM PRO
- **Verification:** **VERIFIED (decoded frame).**
- **Action:** Treat REC-03 as the standing baseline for WM Pro `/charts` until a
  current authenticated capture exists.

---

### VE-013 — Chart timeframe set enumerated; `D`/`W`/`M` naming confirmed in UI
- **Recording:** REC-03 @ **01:00** (toolbar crop, full-resolution)
- **Observed — 21 intervals, verbatim from the control row:**
  `1t · 5t · 30t · 1m · 2m · 3m · 5m · 10m · 15m · 30m · 1h · 2h · 4h · D · W · M · 3M · 6M · 1Y · 3Y · 5Y`
  (`15m` selected at capture time.)
- **Verification: VERIFIED — video + source agree.** The chart uses **bare
  `D`/`W`/`M`**, while the heatmap uses `1D`/`1W`/`1M`. The incompatibility
  identified in `WM_CHART_ARCHITECTURE_2026-07-28.md` is now confirmed in
  shipped UI, not only in source literals.
- **Nuance worth recording:** the *chart's* interval list is rich (21 entries,
  including tick-based `1t/5t/30t`). The deficiency is **not** that the chart
  lacks intervals — it is **naming divergence plus heatmap non-parity**.
  WM-CHART-P0-01 should therefore be framed as *reconcile and share one
  canonical set*, not *add missing intervals to the chart*.
- **Severity:** **P0** · **Product:** WM PRO
- **Action:** Feeds directly into WM-CHART-P0-01. Use this enumerated list as
  the candidate canonical set.

---

### VE-014 — Regime HUD computes from daily % while chart is on an intraday timeframe
- **Recording:** REC-03 @ **01:00** (HUD crop, full-resolution)
- **Observed, verbatim:** the regime badge reads **`REGIME  SIDE  −0.50% today`**
  while the chart timeframe selector shows **`15m`** as active.
- **Verification: VERIFIED — video confirms source.** This is direct visual
  proof of the previously source-only finding that the chart classifies regime
  from the daily percentage change and therefore **cannot track the selected
  timeframe**. A 15-minute chart is displaying a regime derived from the day's
  return.
- **Severity:** **HIGH** · **Product:** WM PRO
- **Action:** Confirms the state-model defect is real and user-visible, not
  theoretical. Remains new modelling work, not rewiring.

---

### VE-015 — A working Markov implementation already exists, in Pine on TradingView
- **Recording:** REC-03 @ **75:00** and **145:00**
- **Observed:** TradingView chart `OaWoIkYP` (`NASDAQ:TSLA`) running an
  indicator captioned **"Master Strategy — Markov Pro v2"**, with an overlay
  panel showing:
  - `REGIME | SIDEWAYS | DISTRIB` (later `ACCUM`), `EMA 392.92`, `PDH 400.39`, `POC 390.66`
  - a **transition matrix** — `BULL 74% / 13% / 13%`, `BEAR 10% / 90% / 0%`,
    `SIDE 12% / 1% / 87%`, `TODAY 12% / 1% / 87%` (rows sum to 100%)
  - a per-market table — `SPY / QQQ / IWM / TSLA` with `RETURN`, `STATE`, `EDGE`
- **Verification:** **VERIFIED (decoded frames).** Pine source not inspected —
  it was not opened on screen.
- **Severity:** N/A — **high-value reference asset**
- **Product:** **SHARED DESIGN REFERENCE** → consumed by WM PRO
- **Why this matters:** the earlier architecture doc concluded WM Pro's state
  model was *new modelling* with no reference. That framing was incomplete. The
  founder appears to already own a working Markov formulation with a genuine
  transition matrix. Porting a spec from owned Pine source is a materially
  smaller and lower-risk task than originating a model — **and it avoids
  inventing classifications**, the same constraint that blocked Wyckoff.
- **Action:** Retrieve the Pine source for "Master Strategy — Markov Pro v2"
  before any WM Pro state-model ticket is written. **Blocked on founder** —
  the script is in his TradingView account.

---

### VE-016 — Markov matrix static across 70 minutes (observation, not a defect claim)
- **Recording:** REC-03 @ **75:00** vs **145:00**
- **Observed:** across ~70 minutes of elapsed session the matrix values are
  unchanged (`BULL 74/13/13`, `BEAR 10/90/0`, `SIDE 12/1/87`, `TODAY 12/1/87`)
  while `REGIME` flipped `DISTRIB → ACCUM`, `DAY RET` moved `−0.16% → −1.55%`,
  and price moved `393.84 → 388.36`.
- **Verification: UNRESOLVED — insufficient evidence.** This is consistent with
  a long-run matrix computed on **daily** bars that only updates at daily close,
  which would be correct behavior. It is equally consistent with a stale or
  frozen calculation. **I cannot distinguish these from video.**
- **Severity:** UNKNOWN — do not action · **Product:** SHARED DESIGN REFERENCE
- **Action:** Resolve by reading the Pine source (see VE-015). **No defect is
  claimed here.**

---

## A.2 Corpus status after second pass

| | Count |
|---|---|
| Recordings on Desktop | 41 |
| Content-identified | **3** (REC-01, REC-02, REC-03) |
| Still uninventoried by content | **38** |
| Missing / referenced but absent | 3 (MISS-01/02/03) |

Remaining high-value unreviewed assets — `2026-05-24` (**4h 30m**, 8.0 GB),
`2026-07-06 8.45.52` (**2h 06m**, 6.4 GB), `2026-06-30 8.49.08` (55m, 3.4 GB),
`2026-07-15 9.55.19` (51m), `2026-07-09 9.07.10` (33m).

**REC-03 was sitting in the corpus the whole time.** The product evidence I
reported as unavailable existed locally and was simply uninventoried. That is
the direct argument for completing the identification pass over all 38 remaining
recordings before any further "evidence unavailable" conclusion is drawn.

## A.3 Retention — unchanged

**Still no deletion authorized.** REC-03 is now demonstrated to contain the only
observed capture of an auth-gated production surface. Any deletion policy
applied before content identification would have risked destroying exactly this.

---

# Appendix B — Mission Control follow-up (transcripts, competitors, mobile)

Added in response to Mission Control's cross-session brief. This appendix records
what was actually verifiable versus what is blocked, deliberately, so nothing
here reads as done when it is not.

## B.1 Chrome tab inventory (SAW — one snapshot before Chrome quit)

At tab-list time the following were open:
- `wealthymindsets-pro.vercel.app/charts` — WM Pro (auth-gated, still unread live)
- `grok.com/c/…` "**My Daily power Routine 2026 — Grok**" — this is a **Grok
  chat conversation, not a video**. Mission Control's guess that "My Daily
  power…" was a video is **incorrect** — do not chase this as a transcript
  target.
- `tradingview.com/chart/OaWoIkYP/?symbol=NASDAQ:TSLA` (TSLA 302.10)
- `my.tastytrade.com/app.html#/trading/chart` — signed in (read-only per policy)
- `app.webull.com/trade` — signed in (read-only per policy)
- `deepcharts.com/features/deepchart`
- **`youtube.com/watch?v=Pz8f0wWW12M&t=292s`** — *"The Only Orderflow Guide
  You'll Ever Need"*, founder parked at **04:52**
- `github.com/dashboard`, `supabase.com/dashboard/…`, Google Docs
  "WM Pro — Founder Requirement Index and Evidence Map"

**Evidence class:** SAW (Chrome tab list, one moment in time).

---

## B.2 Transcripts — status BLOCKED with a workable next step

### VE-017 — YouTube auto-caption fetch requires an authenticated browser session
- **Target:** `Pz8f0wWW12M` — the only video URL identified so far.
- **Observed (SAW):** the video's page HTML contains a `captionTracks` block
  advertising an **auto-generated English track** (`kind=asr`, `variant=gemini`).
  The `baseUrl` for that track carries a signed `signature=…` parameter that
  is bound to the browser session that fetched the page.
- **Attempted, both failed:**
  - `curl --tlsv1.2` to the signed `timedtext` URL → **empty body** (signature
    rejects unauthenticated hosts).
  - Stripped-parameter `timedtext?…&fmt=srv3` via WebFetch → **empty body**.
- **Verification: CANNOT FETCH FROM THIS ENVIRONMENT.** I will not paraphrase
  from memory of the audio — that would be fabricating a transcript.
- **What actually works — three viable paths, founder's choice:**
  1. **Founder opens the video and uses YouTube's own "Show transcript"
     control** (`…` menu under the video), then paste the panel text here. That
     is the authoritative source and it takes ~30 seconds.
  2. **Founder runs `yt-dlp --write-auto-subs --skip-download Pz8f0wWW12M`** —
     writes an SRT to disk that I can then commit as-is with timestamps.
  3. Chrome relaunches with the founder's cookies and I fetch the signed URL
     from the running browser session (`get_page_content` on the timedtext
     endpoint).
- **Severity:** blocking · **Product:** SHARED / RESEARCH
- **Note:** the founder is parked at **04:52 (t=292s)**. Whatever is being
  taught around that mark is the specific interest, not the whole 30–60 min.

### VE-018 — "My Daily power Routine 2026" is a Grok chat, not a video
- **Observed (SAW):** the URL is `grok.com/c/<uuid>?rid=<uuid>` — that's the
  chat-conversation surface, not any video player.
- **Verification: VERIFIED (URL scheme).** No transcript to extract; the whole
  thread would need to be retrieved as chat, and Grok's chats are not
  publicly fetchable.
- **Action:** Founder confirms whether this is the *routine document* he wants
  captured. If yes, he pastes it or exports it — WebFetch cannot reach
  Grok chat history.

### VE-019 — Videos-clicked-in-recordings, corpus-side status
- **Observed (SAW):** I have visually identified **zero** video-player frames
  in the recordings I have analyzed to date (REC-01 = ChatGPT ops; REC-03 =
  authenticated WM Pro charts + TradingView; two Downloads phone recordings =
  brokerage app UI).
- **38 recordings remain uninventoried by content.** A video click captured in
  any of them is not yet observed and cannot be transcribed until the
  container recording is identified.
- **Severity:** blocking — Mission Control's "videos he was clicking on" claim
  cannot be honored against evidence I have not yet seen.
- **Action:** Complete the identification pass over remaining recordings, OR
  founder names the source video (URL / YouTube ID) directly.

---

## B.3 Mobile / phone evidence — one finding, one hard boundary

### VE-020 — TWO phone recordings exist; both are BROKERAGE MOBILE APP, not WM Pro
- **Files:**
  - `~/Downloads/ScreenRecording_06-22-2026 09-30-06_1.MP4` — 16m37s, 1170×2532
    (iPhone), 34 fps
  - `~/Downloads/ScreenRecording_06-22-2026 09-47-45_1.MP4` — 8m03s, 1170×2532,
    46 fps
- **Observed (SAW at ~02:20 of the first):** a **live brokerage order ticket
  screen** — Buy/Sell selector, MARKET/LIMIT order types, contracts field,
  Time-in-Force, and a Sell submit button. Account identifier and open
  position visible in the recording.
- **Answer to Mission Control Q1: The primary trading surface (WM Pro) has
  NEVER been recorded on a phone or iPad in the material available to me.**
  The two mobile recordings that exist are a broker's mobile app.
- **Severity:** **BINDING** — the WOW responsive standard demands mobile
  verification, and there is no mobile WM Pro capture to verify against.
- **Product:** WM PRO (absence of evidence, not evidence of absence)
- **Verification:** VERIFIED (frame decoded and viewed once).
- **Retention & safety:** the account identifier and position seen in these
  frames **will not be transcribed into any evidence file**. This appendix
  intentionally records only the *category* of what was on screen.
  No cropped frames from these recordings are being committed.
- **Action for founder:**
  1. Record a **phone** capture of `wealthymindsets-pro.vercel.app/charts`
     across 360×800 and 390×844.
  2. Record an **iPad** capture at 834×1194 portrait, then **rotate mid-clip
     to 1194×834** (the standard counts rotation as a separate state).
  3. Save to `~/Desktop` so the extractor can pick them up (avoid Photos —
     see B.5).

### Touch-parity defect predicted by source (WM-RESP-P0-01)
Mission Control's claim — `src/components/chart/` has 13 mouse handlers and 0
touch/pointer handlers, and `lightweight-charts` supplies its own touch pan/zoom
so canvas gestures work while overlay tools (draw, crosshair, measure) do not —
was NOT re-verified in this appendix because the earlier finding is source-side
and Mission Control has already confirmed it. Video confirmation requires a
phone capture that does not exist yet (see above). Signature to look for once
one arrives: **chart pans and zooms fine, drawing tool is selected, nothing
gets drawn on tap.**

---

## B.4 Competitor study — status HONEST rather than complete

Chrome is not currently running. Mission Control's brief spelled out the exact
constraint: Chrome / Webull / moomoo are granted at **READ tier only**; I can
see but not click. The founder must drive interactions himself. Even that
requires Chrome to be up.

### What was fetched anyway
- **`deepcharts.com/features/deepchart`** — WebFetch, page-copy only. **No
  actionable design detail on the marketing page.** Direct quotes:
  - Big Trades description: *"Just like your good old candles, but on
    Ster\*ids"* — no mention of collision handling, offsetting, fading, density
    caps, or label rules at dense areas.
  - Timeframes: *"Daily, Weekly, Monthly… you name it, we got it"* — no
    enumeration; used in a VWAP context.
  - Mobile/tablet: **not stated on this page.**
  - Axes: **not stated on this page.**
  - **Evidence class:** SAW (fetched page content).

### What is NOT delivered and why
- No pan/zoom stress test on any competitor — requires clicks I cannot make.
- No timeframe-switch enumeration on any competitor — same reason.
- No indicator-stacking / pane-reflow observation — same reason.
- No axis autoscale / log-vs-linear behavior — same reason.
- No dense-right-edge big-print screenshot for tastytrade, Webull, moomoo,
  Deepcharts, or Bookmap — same reason, and **tastytrade/Webull/moomoo need
  the founder's active session anyway per the read-only policy**.
- No Bookmap frames — Bookmap is a native desktop app; requires the founder
  to run it and export or record.

### What Mission Control should ask the founder to do (specific and short)
For each competitor tab, one clip per: (a) drawing tool → tap → try to place
on candles; (b) full timeframe cycle 1m → 5m → 15m → 1h → D → W → M; (c) hard
zoom in to a single candle and hard zoom out to All; (d) scroll to current
price with heavy activity and capture the right-edge crowd. Two minutes per
competitor is enough. Save to `~/Desktop`.

**Do not proceed with competitor comparison until these clips exist.** Reading
marketing copy is not a comparative study.

---

## B.5 Missing recordings + Photos library

- **MISS-01/02/03** (from §4) — still not on disk anywhere reachable by the
  filesystem sweep in the initial report.
- `~/Pictures/Photos Library.photoslibrary` **exists**, but its internal
  container (SQLite + resources) is not decodable from bash and *cannot be
  confirmed to hold these recordings without opening the Photos app*.
- **I have not opened Photos this session.** I therefore **cannot claim these
  recordings are or are not in Photos.**
- **Founder action requested:**
  1. Open Photos → search *"screen recording"* → filter to `2026-07-28`.
  2. If the three named recordings are present, **File → Export → Export
     Unmodified Original** to `~/Desktop`. Photos re-encodes on Share/Export
     by default; only *Export Unmodified* preserves the source bytes and
     timing.
  3. Confirm in one line and I'll pick them up.

---

## B.6 Priority defect cross-check — findings so far

Mission Control asked me to cross-check four confirmed defects in the footage.
Answers, each with an explicit evidence class:

1. **Big Trades bubbles colliding at current price on 30m TSLA** —
   **NOT YET OBSERVED in available footage.** REC-03 was on 15m the whole
   time inspected. The "WM DELTA BUBBLES" panel is visible at REC-03 @ 01:00
   but it is a **side panel**, not the on-chart Big Trades overlay whose
   collision Mission Control is describing. **INFERRED, not SAW.** Needs
   a 30m TSLA capture.
2. **Chart trigger reading plain-text "Smart Money" with no W branding** —
   **PARTIALLY SAW.** REC-03 @ 01:00 shows a right-panel header
   `Smart Money Tools` with a small circular W-style icon on the left of the
   panel; whether the *chart trigger* (a different UI element) is unbranded
   was not visible in that frame. **Inconclusive.**
3. **Confluence Score moving 56 → 60 while inputs unchanged** —
   **NOT OBSERVED across two frames.** REC-03 @ 01:00 shows
   `Confluence Score 83 · NEUTRAL`. A single reading cannot prove drift; needs
   before/after with time-adjacent frames.
4. **Timeframe label vs. returned bar-size mismatch** — **NOT YET OBSERVED.**
   The chart at REC-03 was on `15m` and the candles looked 15-minute-ish, but
   confirming that a `15m` label actually returns 15-minute candles requires
   reading candle timestamps at the axis, which requires either another crop
   pass or (more reliably) a founder-driven live check. **Not confirmed.**

**Nothing above is being claimed as a video-confirmed defect.** The rule
holds: no fix from video alone, and no defect either.

---

## B.7 Retention — reconfirmed

- 41 Desktop + 2 phone + several Downloads video recordings, still all retained.
- **3 of 43 identified by content, 40 uninventoried.**
- No deletion authorized on any asset.
- One asset newly *marked sensitive*: the two brokerage-app phone recordings.
  They must never be attached to a public artifact and no cropped frames from
  them will be committed to the repo.

---

# Appendix C — Mission Control cross-check: VI-WM-P0-02 mobile claims + transcript status

Added in response to Mission Control's 2026-07-29 checkpoint. Four documented
Codex claims need frame evidence at specific viewports to graduate to VERIFIED.
Founder clarified during this session: **the moomoo and Webull opened in the
phone recordings are the mobile APPS; everything else is in his browser.** That
distinction is decisive for the four claims below — all of which target the
public **web** surface at mobile viewport width, not the native app.

## C.1 Resolution census — the whole corpus, one line

| Bucket | Count | Native resolution |
|---|---|---|
| Desktop screen recordings on `~/Desktop` | **41** | **1920×1080** (all) |
| Phone screen recordings in `~/Downloads` | **2** | **1170×2532** (portrait) |
| Other Downloads media (grok, source) | 2 | 784×1168 / 1920×1080 |

**Not a single recording is captured at 390×844 or 1280×400.** A
resized-browser-window inside a desktop recording remains theoretically possible
but was not seen in any of the frames I have inspected across REC-01, REC-03, or
either phone recording.

## C.2 Phone recordings identified — content, not just resolution

- `~/Downloads/ScreenRecording_06-22-2026 09-30-06_1.MP4` — 16m37s, 1170×2532
- `~/Downloads/ScreenRecording_06-22-2026 09-47-45_1.MP4` — 8m03s, 1170×2532

Both show **native mobile app** — TSLA options order ticket flow (`Sell @MARKET`,
`Confirm`, `Risk Reminder`, account label visible). Per founder confirmation,
this is the **moomoo or Webull mobile app**, not the mobile web. The mobile-web
public surface these two vendors serve at 390×844 (or resized to 1280×400) is
NOT in this footage.

**Retention & safety unchanged:** account identifier and open position are
on-frame in these recordings. No crop from either will be committed to the
repository, and no account values appear in this appendix.

---

## C.3 Four VI-WM-P0-02 mobile-viewport claims — evidence verdicts

Each answered against the corpus using Mission Control's three truth labels:
`VERIFIED`, `CONTRADICTED`, `NO EVIDENCE`.

### VE-021 — Claim (1): TradingView phone frames show clipped edges + narrow remaining plot under dense overlays
- **Corpus check:** every TradingView frame in this corpus is REC-03 desktop
  (1920×1080, 15m TSLA, `chart/OaWoIkYP`). Zero phone-viewport TradingView
  frames exist.
- **Verdict: NO EVIDENCE.** Recording gap, not proof of absence of the defect.
- **Product:** SHARED DESIGN REFERENCE

### VE-022 — Claim (2): Webull public app has a fixed-width cutoff at 390×844 AND chart disappearance at 1280×400
- **Corpus check:** Webull footage in the corpus is the **mobile native app**
  (1170×2532), which is a different surface entirely from `app.webull.com`. No
  Webull web frames at any viewport in the corpus. No 390×844 or 1280×400
  browser frames in the corpus.
- **Verdict: NO EVIDENCE.**
- **Product:** SHARED DESIGN REFERENCE
- **Note:** Codex's claim is about `app.webull.com`. The mobile-app footage I
  have does not corroborate or contradict a **web** defect.

### VE-023 — Claim (3): moomoo public quote page — navigation/range row clips the chart at phone width
- **Corpus check:** same as VE-022. moomoo footage in corpus is **mobile app,
  not `moomoo.com`**. No moomoo web frames at any viewport.
- **Verdict: NO EVIDENCE.**
- **Product:** SHARED DESIGN REFERENCE

### VE-024 — Claim (4): tastytrade public page has sticky chrome overlapping content at phone width
- **Corpus check:** **zero** tastytrade footage of any kind exists in the corpus.
  (The founder had `my.tastytrade.com/app.html#/trading/chart` open in one
  Chrome tab, per B.1, but that tab was never recorded in any file I have
  inspected.)
- **Verdict: NO EVIDENCE.**
- **Product:** SHARED DESIGN REFERENCE

### C.3 Summary

| Claim | Vendor | Viewport | Verdict |
|---|---|---|---|
| VE-021 | TradingView | phone | **NO EVIDENCE** |
| VE-022 | Webull web  | 390×844 / 1280×400 | **NO EVIDENCE** |
| VE-023 | moomoo web  | phone | **NO EVIDENCE** |
| VE-024 | tastytrade web | phone | **NO EVIDENCE** |

**All four claims remain UNVERIFIED after this pass, but for a reason Mission
Control should record: the recording corpus does not contain any capture of
these vendors' public web surfaces at mobile-web viewport widths.** They are
not disproven — they are unphotographed.

### What would move any of these to VERIFIED

For each vendor, the founder does one of the following with Chrome's DevTools
mobile emulator (Cmd+Opt+I → toggle device toolbar → set 390×844 or 1280×400):

1. Open the vendor URL at the stated viewport.
2. Screen-record 15 seconds showing the chart / navigation / sticky chrome.
3. Save the `.mov` to `~/Desktop`.

Twenty minutes of the founder's time, one clip per claim, and all four verdicts
become checkable from local frames — no third-party UI captured beyond what a
public visitor would see, so the read-only + no-proprietary-copy rules stay
intact.

---

## C.4 Transcripts — the honest status after two attempts

Mission Control confirmed that Codex tried five extraction paths and every one
failed (timedtext API returns HTTP 200 empty body; on-page panel returns
`VISIBILITY_HIDDEN` with zero segments). My attempts in Appendix B added two
more that also failed — same signed-URL restriction from a different fetcher.

### VE-025 — Whisper/audio path is not viable from this environment
- **Attempted:** `AVURLAsset.loadTracks(withMediaType: .audio)` on REC-01 and
  REC-03 via a direct Swift invocation.
- **Result:** `AVFoundationErrorDomain code=-11800`, underlying
  `NSOSStatusErrorDomain -17913`. This is the TCC access-not-granted signature
  for Documents/Desktop when invoked outside an allowed tool.
- **Ancillary:** `whisper`, `whisper-cpp`, and `ffmpeg` are all absent. Python
  `whisper` / `faster_whisper` packages not installed. Homebrew is available
  but installing Whisper models is a several-GB out-of-band operation.
- **Also:** macOS screen recordings do **not** capture system audio by default.
  Even if the sandbox opened, the recordings may have no audio track to
  transcribe. Not verified either way — the sandbox denial happens before track
  discovery.
- **Verdict: BLOCKED.** No production transcript can be produced from this
  environment without either (a) Chrome relaunched with a fresh session and
  the browser-signed timedtext URL fetched from the tab, or (b) the founder
  running `yt-dlp --write-auto-subs --skip-download Pz8f0wWW12M` on his own
  machine, or (c) the founder using YouTube's on-page "Show transcript" panel
  and pasting the text into the ops bus.
- **Not doing:** paraphrasing what the video "probably said" from prior context.
  That is fabrication and violates the report's founding rule.

### VE-026 — "Videos he was clicking on" — corpus-side identification status
- **Findings observable in the corpus so far:** none. REC-01 is the ChatGPT
  ops session; REC-03 is authenticated WM Pro `/charts` plus TradingView
  desktop. Neither contains a YouTube player or any external video being
  played back on screen at the timestamps I have inspected.
- **38 desktop recordings still uninventoried by content.** A video click
  captured in one of them cannot be identified without at least one frame per
  recording.
- **Action:** either Mission Control approves a content-identification sweep of
  the 38 unreviewed recordings (I can do a one-frame-per-file pass in one
  session), or the founder names the specific videos + URLs directly and the
  transcript task collapses to VE-025's three paths.

---

## C.5 Corpus status after this pass

| | Count |
|---|---|
| Recordings inspected by content | 4 (REC-01, REC-02, REC-03, ph1) |
| Frame-sampled but content already known-type | 1 (ph2) |
| Still uninventoried by content | **38** |
| Missing / referenced but absent (MISS-01/02/03) | 3 |
| No deletion authorized on any asset | ✓ |

Retention rule unchanged: nothing may be deleted while both the four VI-WM-P0-02
claims are uncorroborated **and** 38 recordings remain uninventoried. The lesson
from REC-03 (a critical piece of evidence sat in the corpus for a full session
before being decoded) applies again here.

---

# Appendix D — Mission Control follow-up: transcript CLOSED, cross-check done, Drive package staged

Added 2026-07-30 in response to Mission Control's checkpoint requesting three
items: (1) Drive-formatted publishing, (2) UI-pattern cross-reference against
existing phone-app footage, (3) another shot at the YouTube transcript. Two of
three are now closed; the third is staged in the repo pending Drive push.

## D.1 Transcript — CLOSED

### VE-025 SUPERSEDED — `Pz8f0wWW12M` transcript retrieved

Prior appendix logged this as blocked. It is not blocked anymore.

`yt-dlp` was **not installed** but `pip3` was. One command
(`pip3 install --user yt-dlp` → `2026.07.04`) closed the gap that five prior
attempts across two agents did not.

- **Video:** *"The Only Orderflow Guide You'll Ever Need"* — YouTube
  `Pz8f0wWW12M`. Founder was parked at **04:52 (t=292s)** per the tab URL.
- **Duration in captions:** ~41:03.
- **Cue count:** 944 unique cues after collapsing yt's running-preview overlap
  (raw VTT was 7,576 lines, 332 KB; cleaned is 82 KB / 944 lines).
- **Provenance:** YouTube auto-generated English captions (`kind=asr`,
  `variant=gemini`). Explicit note: these are machine-generated, not a human
  transcript.
- **Files committed:**
  - `docs/research/transcripts/YT_Pz8f0wWW12M_orderflow_guide.en.vtt` — raw
  - `docs/research/transcripts/YT_Pz8f0wWW12M_orderflow_guide.txt` — cleaned,
    deduped, one line per unique cue with `[hh:mm:ss] text` format.
- **What the founder is parked on (evidence, not paraphrase):** at 4:52 the
  transcript reads verbatim about a footprint-chart worked example — passive
  vs. aggressive orders, an order book at 101/102/103 with `32 execution on the
  101 level and 42 contract executed on 102 level` and slippage of three ticks
  as aggressive orders walk the book to 103. That is the specific teaching
  moment he stopped on.
- **Why this timestamp matters:** the section is a mechanical explanation of
  **how large aggressive orders collide with resting limit liquidity across
  price levels** — the exact phenomenon WM Pro's Big Trades / footprint /
  Delta bubbles surfaces are meant to visualize. It is directly connected to
  the "Big Trades bubbles colliding at current price" defect class.

**Verification: VERIFIED (transcript is captured verbatim from YouTube's own
caption endpoint; not summarized from memory or from audio inference).**

### VE-026 progressed

The 38-recording content-identification pass is still outstanding — Mission
Control has not yet approved it. **No other video the founder clicked in
recordings has been identified** because no other player has been visually
found in the frames I've inspected. If further transcripts are needed, they
now cost one `python3 -m yt_dlp` invocation per identified video ID.

---

## D.2 UI-pattern cross-check — CANNOT PROMOTE any of VE-021 → VE-024

Mission Control asked whether phone-app footage contains UI patterns that
match the desktop-web patterns enumerated in *"WM Pro — Deep 5-App UI
Enumeration + DeepCharts Feature Crawl — 2026-07-30 14:35 CDT"* (Drive), so
that VE-021 → VE-024 could be promoted from NO EVIDENCE to VERIFIED without
new footage.

### VE-027 — Phone-app footage contents, exhaustively catalogued
- **Recording A:** `ScreenRecording_06-22-2026 09-30-06_1.MP4` (16m37s, 1170×2532)
- **Recording B:** `ScreenRecording_06-22-2026 09-47-45_1.MP4` (8m03s, 1170×2532)

Frames sampled at 20/60/150/240/300/420/500/600/700/780/900/960 s (Recording A)
and 20/60/150/210/270/330/390/450/470 s (Recording B).

**The entire content of both recordings, across every sampled frame, is a
single native app surface:** an options **order-ticket** screen for a TSLA put,
plus its confirm sheet. The elements visible every time are:
- back-arrow header labelled `Individual Margin(<account label>)` with reload
- static text banner *"Please note you are closing TSLA $397.5 22 Jun 26 (W) Put 100 ."*
- symbol block: `TSLA` · option contract line · `Mid Price:` line
- **a horizontal venue-quote row** — colored halves showing Bid quantity/price
  on left and Ask price/quantity on right, with an exchange venue chip on each
  outer edge. Venue chips observed across timestamps: **ARCO, XMIO, MCRY, C2OX,
  AMXO** (these are options-exchange codes — Arca, PHLX/XMIO, MIAX Emerald,
  Cboe C2, AMEX Options). The venue chip rotates as the routing choice changes;
  the layout does not.
- static `TSLA Price` reference line
- `Side` toggle (`Buy`/`Sell` — Sell always selected in the sampled frames)
- `Order Type` selector (`MARKET`), disclosure copy about Ask/Bid spread
- `Contracts` stepper (`x100 Shares`, value 1 or 2)
- `Time-in-Force` selector (`Day`)
- `Estimated Total (Credit)` and `Estimated Transaction Fee` rows
- `Data Disclaimer` link, red `Sell` submit button
- confirm sheet with `Sell @MARKET` header, `Account`, `Contracts`, `Price`,
  `Estimated Total`, `Estimated Transaction Fee`, `Time-in-Force`, and a
  blue `Confirm` button
- occasional `Risk Reminder` bottom-sheet modal

**Surfaces that never appear in either recording:**
- Any chart
- Any timeframe selector
- Any navigation/range row
- Any indicator toggle
- Any panel dock / pane / axis
- Any browser chrome (URL bar, tab bar, DevTools mobile-emulation toolbar)
- Any web-served page (both are native app throughout)

### VE-028 — Verdict: pattern-based promotion is not available

The four VI-WM-P0-02 claims all describe defects on **chart / navigation /
sticky-chrome / range-row** UI surfaces on the vendors' **public web pages**.

The phone-app footage contains none of those surface classes and no browser
chrome at all. There is no UI pattern to match against, and therefore no basis
to promote any of the four claims from NO EVIDENCE.

| Claim | Vendor | Surface targeted | Phone-app footage has that surface? | Verdict |
|---|---|---|---|---|
| VE-021 | TradingView | phone chart w/ dense overlays | no | **STAYS NO EVIDENCE** |
| VE-022 | Webull web  | chart + fixed-width cutoff | no | **STAYS NO EVIDENCE** |
| VE-023 | moomoo web  | navigation/range row over chart | no | **STAYS NO EVIDENCE** |
| VE-024 | tastytrade web | sticky chrome | no | **STAYS NO EVIDENCE** |

**All four remain unphotographed.** The 20-minute founder capture plan in
Appendix C.3 is still the fastest path.

---

## D.3 Drive publishing — package staged, MCP not wired

- **Founder mandate:** publish appendices to Drive same-day.
- **Available to me this session:** Drive MCP is not present in the loaded tool
  set. `WebFetch` cannot write to Drive. I cannot upload a file to Drive from
  this environment.
- **Staged for Atlas / founder pickup:**
  - This appendix (D) is committed to `docs/ATH_VIDEO_EVIDENCE_2026-07-28.md`
    on `origin/main` — Drive-formatted markdown with the same section/heading
    structure Atlas's index expects.
  - Companion artifact: the transcript files at
    `docs/research/transcripts/YT_Pz8f0wWW12M_orderflow_guide.{txt,vtt}` are
    committed and ready to attach as-is to a Drive doc titled
    *"YouTube Transcript — The Only Orderflow Guide You'll Ever Need
    (Pz8f0wWW12M) — 2026-07-30"*.
- **Handoff line for Atlas:** these two commit paths are the current-day
  publish targets; both are stable at HEAD of `wealthymindsets-pro` main.

---

## D.4 Retention & safety — reconfirmed

- No frame from either phone recording is committed to the repo. Account
  labels and open-position values remain in the source files only.
- The transcript is a **public YouTube video's own auto-caption text**; no
  private content is being republished.
- The corpus is still fully retained; still 38 desktop recordings uninventoried
  by content; still no deletion authorized.
