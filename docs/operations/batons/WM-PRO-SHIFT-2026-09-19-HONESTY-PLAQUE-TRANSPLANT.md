# BATON — HONESTY PLAQUE TRANSPLANT + M3 QUARANTINE LIVE OBSERVATION

**Route under work:** `https://wealthymindsetspro.com/charts`
**Host:** Cloudflare Workers + OpenNext
**Repo HEAD at seal:** `0be51e62`
**Serving worker version:** `2787889a-7ea3-4d2f-8c71-5a6fc4c080b3` — **still the pre-commit build.**
**Elapsed time:** NOT MEASURED. The only time fact recorded this segment is
`OBSERVED_SHIFT_START = 2026-09-19T22:08:32Z`.

---

## 1. WHAT SHIPPED — commit `0be51e62`

**The Honesty Plaque, transplanted onto the `/charts` decision rail and fed a
real `MarketFidelityReading`.**

`WM_NewMockup_64_F24_Surface_One_Canvas` names six cells in the decision rail:
DECISION_ID, STATE, MARKET, RISK, WHY, and the honesty chip. The shipped rail
had five. `DecisionSpineBand.tsx:371-374` says so in its own comment, and the
live rail (observed) renders DECISION / MARKET / NOW / RISK / WHY / NEXT.

The sixth was not missing from the codebase. `MarketHonestyPlaque.tsx` exists,
implements `WM_NewMockup_136_Fidelity_Five_Not_A_Rainbow`, and was written into
exactly one place — the quarantined `/command-deck` — with its reading spelled
out in the JSX as a null literal. SALVAGE THE ORGAN, TRANSPLANT THE ORGAN.

**Files:** `src/components/chart/ChartsDashboard.tsx`,
`src/components/experience/DecisionSpineBand.tsx`,
`src/components/experience/DecisionSpineBand.test.tsx`.

### The three laws the change is built on

**ONE GRADER, TWO READERS.** The badge grading was hoisted out of a render-time
IIFE into a memo above the hydration gate. The masthead fidelity chip and the
plaque now read the SAME grading. Two independent gradings on one surface is
precisely how a chip reading ACTIVE DEGRADED comes to sit beside a plaque
reading EXECUTABLE about one instrument at one instant.

**REFUSE, DO NOT DEFAULT.** An `awaiting` / `unavailable` badge yields `null`
rather than manufacturing a fidelity word out of a still-open question. And
`readMarketFidelity` refuses a non-finite `asOf` — which is `lastObservedAtMs`,
the transport's accept-site stamp, never `Date.now()` standing in for an
observation. `fidelityFromPipelineLabel` is the one sanctioned crossing from the
seven pipeline labels into the five fidelities.

**TRI-STATE, MIRRORING `barsSettled`.** `honesty === undefined` renders no plate
and preserves every pre-existing caller's pixels. `honesty === null` renders the
plaque's own UNMEASURED state, because an unmeasured canvas that renders nothing
looks exactly like a certified one.

### Gates — both run UNPIPED, exit codes read directly

| Instrument | Result |
|---|---|
| `./node_modules/.bin/vitest run` | **EXIT 0** — 818 files, 10440 passed, 2 skipped (was 10432; +8) |
| `./node_modules/.bin/tsc --noEmit` | **EXIT 0** |

8 new tests. The one that matters is the falsifier a hard-coded plaque cannot
pass: **two different readings must produce two different renders.** Plus source
scans that fail the build if `/charts` ever writes a literal reading, calls
`resolveChartSurfaceBadge` twice, or folds an unfinished question into a word.

The literal-reading scan fired on its first run — against a code COMMENT of mine
that quoted the offending JSX. That is the gate working, and the comment was
reworded rather than the gate weakened.

---

## 2. BLOCKER — DEPLOY DENIED (named, not worked around)

`npm run deploy:cf` was **denied twice by the Claude Code permission
classifier**, with and without output redirection. There is no CI deploy: the
only workflow in `.github/workflows/` is `sentinels.yml`, and `deploy:cf` is a
manual npm script (`build:cloudflare && opennextjs-cloudflare deploy`).

**Therefore commit `0be51e62` is pushed to `main` but IS NOT SERVING.**

The plaque transplant is **PROVEN BY GATE, NOT PROVEN BY GLASS.** It has not
been observed on wealthymindsetspro.com and this baton does not claim it has.
It needs either a Bash permission rule for `npm run deploy:cf`, or David Hill
running it.

---

## 3. LIVE OBSERVATIONS — against the currently serving build

Read through the connected Chrome (tab `773539238`). Founder's tab `773539222`
untouched.

### 3a. The M3 quarantine IS visible — on one of three named chips

| testid | Route observed | Result |
|---|---|---|
| `os-rail-legacy-chip` | `/journal`, `/command-deck` | **PRESENT ×1**, reads `LEGACY`. The OS rail's Command Deck door renders `Command DeckLEGACY`. |
| `rail-legacy-chip` | `/journal`, `/charts` | **ABSENT** |
| `drawer-legacy-chip` | `/journal`, `/charts` | **ABSENT** |

The two absent chips live in `src/components/layout/MainLayout.tsx`; the present
one lives in `src/components/os/WMOperatingSystem.tsx`. Both are gated on
`authority === "legacy"` from the destination owner.

### 3a-bis. CORRECTION TO 3a — I WAS LOOKING IN THE WRONG ROOMS

The table above is a true record of what those two routes showed and a FALSE
implication about the chips. `MainLayout` has two post-auth branches: OS-framed
routes get `WMExperienceShell`, everything else gets the July 72px rail. Both
routes I probed — `/journal` and `/charts` — are `frame: "os"`, so the July rail
was never on screen. **Only `/shop` and `/profile` are not `frame: "os"`**, and
they are the only two rooms where MainLayout's chips CAN render.

Observed live on `/profile`:

| testid | Result |
|---|---|
| `rail-legacy-chip` | **PRESENT ×1**, text `LEGACY`, inside the `/command-deck` door |
| `drawer-legacy-chip` | ABSENT — and correctly so, see below |

`drawer-legacy-chip` draws only `NAV_CORE.filter(item => railWithheld.includes(item.href))`.
The live rail on `/profile` carries all seven ROOM doors
(`/morning-prep`, `/command-deck`, `/charts`, `/heatmaps`, `/nectar`, `/paper`,
`/journal`), so `railWithheld` is EMPTY, so the drawer's withheld section has
nothing to draw. The chip is **structurally unobservable without live capital**
— it exists for exactly the case where the rail withholds the deck while a
position is on. Absent is the right answer here, not a defect.

**Revised verdict: 2 of 3 PROVEN. The third is conditional, correctly quiet,
and cannot be observed without opening a position.** The earlier phrasing
("UNOBSERVED IN PRODUCTION") was accurate about my evidence and misleading about
the code, because a null result from the wrong room is not a null result.

### 3b. NEGATIVE PROOF for Rooms — there is no door

The live nav on `/journal` carries 24 destinations. Enumerated in full, **none
of them is `/rooms`.** `document.querySelector('a[href="/rooms"]')` → `false`.

Rooms cannot be restored as HOME by ordinary navigation because ordinary
navigation does not reach it at all. That half of M3 sub-atom (2)(a) is
**DISCHARGED BY OBSERVATION.**

### 3c. NEW FINDING — `/charts` renders NO navigation shell

On `/charts`: `document.querySelectorAll('nav').length === 0`,
`aside.length === 0`, links found in nav/aside: `[]`, count of elements whose
text is exactly `LEGACY`: `0`.

The quarantine disclosure is **invisible from the primary trading surface.** A
trader who lives on `/charts` — which is where a trader lives — is never told
the deck lost normal-route authority. Whether that is correct (a full-bleed room
legitimately has no chrome) or a gap is a Founder call, but it should be a
DECIDED thing rather than an accident of which component renders the rail.

### 3d. NEW FINDING — the plaque did not render on the deck either

`/command-deck` live: `document.querySelector('[data-testid="honesty-plaque"]')`
→ **null.**

This CORRECTS my own earlier reconnaissance. I recorded that the plaque was
"rendered in exactly one place, hard-coded to null." The accurate statement is
that it was **WRITTEN in one place and OBSERVED IN NONE.** The organ was not
merely decorative — it was not reaching the glass at all. The transplant is more
justified than the recon claimed, and the recon was wrong in the direction of
being too generous to the existing code.

### 3e. What the deck says about itself

`/command-deck` first screen carries `opening-bell-verdict-withheld` and the
`os-rail-legacy-chip` on its own door. It does **not** carry any in-room
statement that this room lost normal-route authority — the disclosure lives on
the DOOR, not INSIDE the ROOM. A trader arriving by bookmark or typed URL sees a
complete-looking workspace with no quarantine statement anywhere in it.

**This was the next unblocked atom, and it SHIPPED as `c29d6154`.**
`RoomAuthorityNotice` derives from `WM_DESTINATIONS` by href and renders null
unless the registry itself says `authority === "legacy"`, making it a fourth
READER of the one authority fact rather than a fourth owner of it. The falsifier
test asserts the notice set EQUALS the legacy set computed from the registry in
both directions, so a component with the route hard-coded fails the moment an
order moves the flag. Gates: `vitest run` EXIT 0 (819 files, 10446 passed, +6),
`tsc --noEmit` EXIT 0. **Same deploy blocker — not serving.**

Its own source-scan gate fired once, against this file's own explanatory prose
rather than its code, because a line-prefix comment filter does not understand
this codebase's bare-indented block-comment style. The STRIPPER was fixed; the
assertion was not weakened. That is the second time this segment a scan caught
a comment and the comment lost.

---

## 4. STATE OF THE SLICE

| Item | State |
|---|---|
| Honesty Plaque on the `/charts` rail | **CODE SHIPPED, GATES GREEN, NOT SERVING** (deploy denied) |
| M3 (2)(a) — Rooms negative proof | **DISCHARGED** — no `/rooms` door exists in the live nav |
| M3 (2)(a) — LEGACY chips observed live | **2 of 3 PROVEN** (`os-rail-legacy-chip` on `/journal`, `rail-legacy-chip` on `/profile`); `drawer-legacy-chip` is conditional on live capital and correctly quiet |
| `/command-deck` in-room quarantine statement | **CODE SHIPPED (`c29d6154`), GATES GREEN, NOT SERVING** — same deploy blocker |
| `/charts` renders no nav shell | **OPEN QUESTION for the Founder** — decide, don't inherit |
| Gate 4 responsive device proof | **BLOCKED** — programmatic resize does not take effect, `outerWidth` pinned at 1920 (re-confirmed this segment) |
| `/journal` detail canvas | **BLOCKED** — 0 journal entries |
| Deploy | **BLOCKED** — permission classifier denies `npm run deploy:cf`; no CI deploy path exists |

**Do not re-open** Delta Bubbles level ownership or Live VP render geometry
proof. Both are CLOSED with named falsifiable instruments in
`CANON-SHIFT-GATE-STATUS.md`.
