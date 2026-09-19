<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# Baton — phone parity on the sanctuary, and a retracted diagnosis

Sealed 2026-09-13T15:20Z. Covers three commits: `0028dbd`, `f92e4b4`, `efa50c6`.
All three are on `origin/main` (0 ahead at seal time).

## The block in one line

The Cloudflare deploy was never failing; the navigation of the new room was
23px tall on a phone; and the harness that caught it was over-reporting one
decoration. All three are now closed, and the last one is proven LIVE.

---

## 1. `0028dbd` — a confident diagnosis that never touched the system

The prior baton (`WM-PRO-2026-09-13-CF-DEPLOY-6-SECRETS.md`, commit `8dcda56`)
claimed six secrets were **declared-but-empty** on the Cloudflare platform, and
prescribed a Founder dashboard action for each.

The dashboard was then actually read. `Workers & Pages -> wealthymindsets-pro ->
Settings -> Variables and Secrets` lists 28 secrets. **None of the six is
present — not empty, ABSENT.** `JWT_SECRET` is present. NAMES ONLY were read;
every value rendered as "Value encrypted" and no value was opened, revealed,
copied, or logged.

The direction of the error was the exact mirror image of the guess: **the repo
declared names the platform does not have.**

    537a803  2026-09-12 04:34  declared NINE required secrets, incl. all six
    65a659b  2026-09-13 07:16  reduced the array to JWT_SECRET only

Failing build `c942757e` was cut from a commit inside that window. Wrangler did
exactly what it was told. `secretsDeferredToReadiness` is precisely the
mechanism `65a659b` introduced to stop declaring them.

**The deploy already succeeded.** Active deployment `399b69f7`, source commit
`8dcda56`, 100% traffic, 0% error rate. No Founder action was ever required.

The wrong text was left unedited under a retraction header rather than deleted,
so the failure mode stays legible. The lesson, recorded there and worth
repeating here:

> A confident diagnosis that never touched the system it is a diagnosis OF is a
> hypothesis wearing a receipt's clothes.

It was internally coherent, cited two "proofs", and named a file and a line
number. Reading the platform took four tool calls and inverted the conclusion.

---

## 2. `f92e4b4` — the sanctuary's navigation was 23px tall on a phone

`scripts/audit-phone-parity.mjs` measured the shell in a real Chrome at 390x844:

    /founder-room-sample.html  offenders=1  evicted-text=0  under-44px-taps=7
        tap 52x23  button "PREP"
        tap 71.2x23  button "OBSERVE"
        ... all seven ...

`ExperienceModeBar.tsx` had carried, since it was written, this comment
**directly above** the offending style:

    // Keep each tap target readable when the bar wraps on mobile;
    // ignored on desktop where flex-grow spreads them across one row.
    minWidth: 52,

The comment asserted a care about touch. The code set a WIDTH and never a
HEIGHT.

### A COMMENT IS NOT A GATE

This is a new named failure class, sibling to REVIVE #9's "a required prop is
not a gate" — where `tsc` was satisfied by the PRESENCE of a `governed` prop
while the panel ignored its value. Here English was satisfied by the presence
of the words "tap target" while the box stayed 23px.

`tsc --noEmit` was EXIT=0 throughout. **A number in a style object is
type-correct at any value, so the type system could never see it.** That is
confirmation #15 of *renames are type-visible; wrong answers are not.*

This bar is not a peripheral control. After the Ticket T parent cut it is THE
navigation of the new room — the first thing a thumb reaches on every one of
the seven Asset-10 routes. The mobile standard is BINDING: phone and iPad are
PRIMARY, not an afterthought.

### The fix and its tripwire

`minHeight: 44` plus `display:inline-flex` / `alignItems:center` /
`justifyContent:center` — height without centring would be a bigger hit area
with the same ugly glyph position.

`ExperienceModeBar.tapTarget.sentinel.test.tsx` (5 tests) asserts on the
emitted inline style. Its docstring **bounds its own authority explicitly**: it
is strictly stronger than a source-scan for the literal `minHeight: 44` and
strictly weaker than a rendered measurement. It cannot witness an ancestor that
compresses the button, a later stylesheet rule, or the painted box on a device.
It is a CI tripwire, not the proof. The authority is the harness.

REVIVE #15 — broken 44 -> 23, failed BY NAME on all seven:

    FAIL ... > gives EVERY mode button a min-height of at least 44px
      PREP: min-height 23px < 44px      ... all seven ...

`tsc --noEmit` stayed EXIT=0 through the break. Restored byte-identical, sha
verified.

---

## 3. `efa50c6` — reclassify a decoration, never suppress it

The harness reported one offender that was not a defect: `div.wm-water-breath`
spilling 2px past the viewport. `.wm-sanctuary` carries `overflow: hidden`, the
layer is `aria-hidden` + `pointer-events: none` + textless, and
`documentElement.scrollWidth` was clean. Nothing is painted off-screen and
nothing can be touched.

Fixing geometry to make a number green would be theater. Suppressing it
silently would be worse — **a silent filter is a hiding place.** So
`isClippedDecoration` forgives it under a deliberately high four-condition bar
(aria-hidden, pointer-events none, no text, and an ancestor that clips AND does
not itself spill), and the reporter **still prints it by name** with the reason:

    clipped-decoration 3px  div.wm-water-breath  (aria-hidden, no text, not tappable, clipped by an ancestor)

The rule was REVIVE'd twice to prove it cannot over-forgive. Honest note on
those two break runs: they were read through `| tail`, so their exit codes were
the pipe's, not the harness's. The `offenders=1` lines are the substantive
evidence. **The final state was measured UNPIPED.**

---

## LIVE PROOF — G9, by observation, on production

Not a build log. Not a test. The real origin, fetched and then measured.

    curl -sL https://wealthymindsetspro.com/founder-room-sample
      HTTP=200  bytes=10914
      min-height:44px  x7
      sha256 8ad78359ded0405049d110ea5cc2c0ecbea344b2c900f2bdfcc5b4e1d3bd804a

That sha is **byte-identical** to `public/founder-room-sample.html` in the tree.
Then, in a real Chrome at 390x844 against the production origin:

    AUDIT_EXIT=0
    /founder-room-sample  offenders=0  evicted-text=0  under-44px-taps=0
        clipped-decoration 3px  div.wm-water-breath

**7 -> 0 under-44px taps, on prod, measured.**

Earlier the same day, `https://wealthymindsetspro.com/command-deck` was observed
in the Founder's authenticated Chrome rendering THE SANCTUARY — seven-mode bar,
job caption, HERO TRUTH, real candles, Market Canvas — with **no** left primary
rail, **no** ticker tape, **no** workspace tabs, **no** `wm-universe` card
dashboard. The July shell is gone from the Founder URL.

---

## Gates at seal

    vitest run        565 files / 6466 tests   EXIT=0
    tsc --noEmit                               EXIT=0
    audit:phone prod  /login, ?mode=signup, /reset-password  all clean
    origin/main       0 ahead

---

## BLOCKED, recorded honestly — not worked around

**Gate 4 responsive proof on AUTHENTICATED routes.** Two channels, both shut:

  · `mcp__Claude_in_Chrome__resize_window` **reports success and does not
    resize.** Returned "Successfully resized ... to 390x844" while
    `window.innerWidth` stayed 1920 and `outerWidth` 1568 — themselves
    incoherent. This is the known Gate 4 blocker, now reproduced WITH a
    measurement rather than merely restated.
  · The Playwright harness holds no session. Every authenticated route
    client-side redirects to `/login`. Its own header already says so.

Only 3 routes are reachable unauthenticated, and all 3 are clean — so the prod
sweep found nothing new and **re-proved that a seeded test account is the real
bottleneck** for mobile proof on the seven Asset-10 routes. That is the single
highest-value unblock available to a human right now.

**`/journal` detail canvas** — 0 journal entries. Nothing to render.

**Parallel worker lane** — `src/app/command-deck/page.tsx`,
`src/app/heatmaps/page.tsx`, `src/lib/routing/founderRoomRoutes.ts` and its
test are all UNSTAGED by another worker. COLLISION LAW: this session stayed off
all four.

## Hazard worth closing

`public/founder-room-sample.html` is a **hand-copied artifact** — generated into
`tmpdir()` by `MainLayout.founderRoute.render.test.tsx:120`, then copied by
hand. It was already stale relative to the code fix during this session, and had
that gone unnoticed the "fix verified" measurement would have measured the OLD
HTML. It should be an npm task, not a habit.

## Still open from the §13 list

Delta Bubbles level ownership · Live VP render geometry proof · Decision Memory
sealing has zero production callers (architectural — surface, do not rush-wire)
· `executionConnectivity` orphaned (not a live defect; `/readiness` discloses
honestly) · paper execution state-machine realism.

NAMES ONLY. NO VALUE WAS READ. THE ROOM IS LIVE, AND ON A PHONE THE THUMB CAN
REACH IT.
