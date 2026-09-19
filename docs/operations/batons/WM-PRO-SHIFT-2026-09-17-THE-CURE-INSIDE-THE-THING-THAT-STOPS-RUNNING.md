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

# WM PRO SHIFT — THE CURE INSIDE THE THING THAT STOPS RUNNING

**Date:** 2026-09-17
**Commits:** `ebf26a2`, `725a571`, `f8c8758`
**Prod at seal time:** `725a571` (built 2026-09-17T05:29:15Z) — `f8c8758` build in progress.

---

## The theme

Three defects, one shape. In every case the fix was already *written*, and every
automated check that asked "is it written?" said YES — while the thing it was
supposed to do did not happen.

- A panel was **rendered** — three collapsed `<details>` deep.
- A hidden-tab notice was **stamped** — from a callback that does not run in a hidden tab.
- A dedupe cache was **bounded** — by throwing away the keys of bubbles still on screen.

Presence is not the same as reach. Each Sentinel below was upgraded from asking
*whether* to asking *where*.

---

## 1 · `ebf26a2` — the document wall is not a drawer

**Defect.** The Market Object Passport and the Decision Receipt were both built,
both wired to real compilers, and both mounted on `/command-deck` — behind the
Workspace toggle, then the evidence drawer, then one of their own. Three drawers.
Present in the DOM, absent from the product. The Founder, looking at the actual
page, saw nothing and said so; every "is it rendered?" probe had answered YES for
months.

`command-deck/page.tsx` had already diagnosed this in prose — `<details> IS NOT A
SURFACE` is a comment in that file predating the fix — and it was never acted on
for these two panels. A comment does not hold a line.

**Fix.** A top-level `data-wm-document-wall` section above the Workspace fold,
both documents always open, side by side above ~640px and stacked below via
`flexWrap` + `flex: 1 1 320px` (CSS, not a JS viewport read — correct on first
paint rather than after a measurement round-trip).

**Sentinel.** `src/lib/design/documentWallIsNotADrawer.enforcement.test.ts`, 5
assertions. The load-bearing one is a real `<details>` *balance count* at the
mount offset, not "is there a `<details>` earlier in the file" — the deck has
many drawers that open and close above the wall, and treating those as enclosing
would fire on a correct layout, which is the fastest way to get a Sentinel
deleted. Also pins exactly-one mount per panel, so a drawer copy cannot be left
behind for the top-level one to be deleted against later.

**Non-vacuity.** Measured against `git show HEAD:…` — PRE-FIX both panels 3
drawers deep, wall absent; FIXED both 0 and above the workspace.

**Live proof.** `https://wealthymindsetspro.com/command-deck` returns
`detailsDepth: 0` for both, wall present, with no drawer opened. Screenshot taken.

**Gate surfaced as a side effect.** With the Receipt on the main surface, the deck
now says out loud: *"Decision sealing is not wired in this build — no decision can
be receipted."* That is the §13 "Decision Memory sealing has zero production
callers" gate, whose instruction was *surface, do not rush-wire*. Satisfied.

---

## 2 · `725a571` — the hidden-tab stamp had no publisher that runs while hidden

**Defect.** `overlayFrameVerdict` computes a HIDDEN verdict and MainChart stamped
`canvas.dataset.vpSuspended = "hidden"` from inside the `requestAnimationFrame`
callback. **rAF does not fire at all in a hidden tab** — measured, not assumed:
0 callbacks in 1.5s backgrounded. The one branch whose entire purpose was to speak
for a hidden tab was only ever reachable from a visible one.

Worse than silence, because the comment beside it claimed it handled exactly the
case it could not reach: *"on a tab that loads hidden the receipt is never written
once."* True — and the cure was placed inside the thing that stops running.

**Fix.** A `visibilitychange` listener publishes it instead, plus a stamp on mount
so a tab that *loads* hidden is covered. It deliberately does **not** clear on the
way back to visible: becoming visible is not a paint, and `draw()` already deletes
the stamp when the receipt is actually written. Clearing on visible would announce
a receipt that has not been written yet — the same overclaim in the other
direction. BAD_CLOCK stays in the loop; a frozen clock is only observable from a
frame.

**Sentinel.** The existing `SENTINEL — a suspended overlay declares itself` passed
throughout, because it only asked whether the branch was written. Three assertions
now ask WHERE: the publisher must sit *outside* the rAF effect (index compared
against `cancelAnimationFrame(rafId)`), must stamp and unsubscribe, and must not
clear on visible.

**One self-correction worth recording.** The first draft windowed the publisher
body as `LISTENER - 900` bytes and swept up the rAF loop's own
`delete ds.vpSuspended` forty lines above — the test failed with `expected 2 to be
1`. Re-anchored to the effect's own first line. A window that measures the
neighbours reports on the neighbours.

**Non-vacuity.** PRE-FIX `visibilitychange` listener index `-1`; FIXED present and
after the loop.

---

## 3 · `f8c8758` — a live bubble could have its dedupe key evicted out from under it

**Defect.** Both bubble paths bounded their spawn-key cache identically:

```js
if (spawnRef.current.size > 400) spawnRef.current = new Set();
```

A full flush. It does keep the set bounded — and it throws away the keys of every
bubble **still on screen**. Those bubbles are only removed from the live array
when they scroll out of view, so on the next frame each visible zone failed its
dedupe check, spawned again, and the chart drew two discs on one price. The pair
bobs together and reads as twice the aggression that is actually there.

A slow fuse: nothing is wrong until the 401st distinct zone of the session. A
chart opened for a minute never reaches it; a chart left open all day drifts into
it with no error. That is why it survived.

**Fix.** `src/lib/bubbleSpawnCache.ts` — `compactSpawnKeys(keys, live)` makes
*liveness* the eviction rule. A key is dropped only when no live bubble holds it;
the live set is the floor, bounded by what fits on a canvas rather than by a
constant. Deliberately **no cap above the live count** — that would reintroduce
the identical defect at a different number. Returns `keys` itself when no
compaction is due, so the assignment is a no-op on almost every frame.

**Sentinel.** 9 owner tests plus `SENTINEL — MainChart evicts by liveness, not by
counter`: pins both adoptions, forbids the size-tripped-flush *shape* anywhere in
MainChart, and checks each call is handed its real live array — because
`compactSpawnKeys(keys, [])` type-checks and behaves exactly like the old flush.

**Non-vacuity.** PRE-FIX adoptions 0, flush shape present; FIXED adoptions 2,
shape gone.

---

## Gate findings (honest, not closed)

**Cloudflare Workers Build for `ebf26a2` FAILED** at 04:11:54Z while the GitHub
`typecheck · sentinels · build` workflow for the same SHA passed at 04:13:53Z.
Prod therefore sat at `2c93191` and looked deploy-blocked. The next push
(`725a571`) built clean at 05:30:03Z and carried `ebf26a2`'s changes with it, so
prod self-healed.

**This is a real gap, not a non-event:** the OpenNext/Workers build has at least
one failure mode our CI does not reproduce. The build log is behind
`dash.cloudflare.com` and local `wrangler` auth is expired
(`Not logged in. Your auth token has expired and could not be refreshed, and the
environment is non-interactive.`). I will not handle `CLOUDFLARE_API_TOKEN`.
**Founder action needed** to read build `651be3e7-0a2e-4f19-b3ea-7aa3b6f0fb36` and
tell us what CI is missing.

**`DecisionWhyPanel` at drawer depth 1 on the deck — investigated and NOT changed.**
The comment at `page.tsx:1591` says it keeps "the concise canonical
DecisionWhyPanel in the room", which reads like the same burial as §1. It is not.
"In the room" means inside `deck-market-scene`, and the collapsed WHY drawer is
*deliberate and test-pinned*: `responsiveShell.test.ts` is literally named
"keeps contextual WHY in the market room and deeper proof collapsed" and asserts
`open={showEvidence || undefined}`. Tearing out a pinned canon on my own authority
is not a bug fix. Recording it as a **product question for the Founder**: the room
shows `RIGHT OF WAY: WAIT` and a blocker *count* without the blockers, while
mockup #8 shows the EVIDENCE DEBT / MISSING list on the canvas. If the mockup wins,
that is a canon change and the pinned tests get re-pinned with it.

**Still open, unchanged:** Live VP render geometry proof; `executionConnectivity`
orphaned (`/readiness` discloses it honestly — not a live defect); paper execution
state machine realism; Gate 4 responsive device proof (BLOCKED — programmatic
window resize does not take effect, `outerWidth` pinned); `/journal` detail canvas
(BLOCKED — 0 journal entries, and I will not write fabricated entries into the
Founder's production localStorage to manufacture a screenshot).

---

## Verification discipline used

- `./node_modules/.bin/tsc --noEmit` and `./node_modules/.bin/vitest run` run
  **unpiped**, `> /tmp/x.txt 2>&1; echo $?` — a pipe masks the exit code.
- Final: `TSC_EXIT=0`, `VITEST_EXIT=0`, **686 files / 8414 tests**
  (from 684 / 8397 at shift start — +2 files, +17 tests).
- Every Sentinel proved non-vacuous against the pre-fix source via
  `git show HEAD:… > /tmp/…` plus a node script applying the same math. The
  destructive `git checkout --` route was denied by the classifier and was **not**
  worked around.
- The `oneRoomHasOneLandmark` enforcement test caught a second `<header>` landmark
  I introduced in §1. Fixed by `<header>` → `<div>` — identical pixels, landmark
  keeps its one owner. The suite caught it, not me; that is the suite working.
