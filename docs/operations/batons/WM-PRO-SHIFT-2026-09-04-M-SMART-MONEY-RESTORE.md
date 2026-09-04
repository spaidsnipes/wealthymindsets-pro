# WM Pro September 4 M — Smart Money restore + schema-collision break

Start observed 2026-09-04T15:15:33Z (10:15:33 CDT). Elapsed time is NOT
claimed. This baton records only observations that were actually made.

## Founder instruction driving this block

> "the wm pro smartmoney button was taken from the charts and i dont know why
> it should be on the charts section still with the new logo"
> — Founder, 2026-09-04

Authority #1 (Founder current explicit decision). See CANON TENSION below.

## Reconciliation with the other in-flight thread

A parallel thread holds `src/components/chart/ChartsDashboard.tsx`,
`src/components/chart/ChartToolbar.tsx`, and `src/app/globals.css` dirty, plus
untracked `src/lib/chartPhoneControlReachability.test.ts`, `scratchpad/`,
`src/app/api/fmp/route.test.ts`, and modified `src/app/api/fmp/route.ts` and
`docs/operations/batons/WM-PRO-EVENING-2026-09-03.md`.

Their work was NOT reverted, staged, or reformatted. Their eight uncommitted
lines in ChartsDashboard.tsx (`wm-chart-orientation-*`, `wm-chart-why-trigger`,
`wm-chart-passport-trigger`, `wm-chart-command-deck-link`) remain in the
worktree exactly as written.

Technique used to commit only our own hunks in a file another thread holds,
recorded because it is reusable and non-obvious:

    BLOB=$(git hash-object -w /tmp/mine_only_variant.tsx)
    git update-index --cacheinfo 100644,$BLOB,src/components/chart/ChartsDashboard.tsx

This stages an arbitrary blob WITHOUT touching the working tree. The mine-only
variant was independently typechecked (`tsc --noEmit`, exit 0) before staging.
`git apply --cached` was tried first and failed — dropping earlier hunks
desynchronises later hunk offsets.

## Atom 1 — branded Smart Money trigger restored to /charts (33a9dec)

ROOT CAUSE, traced not guessed: `e3ce41f` "refactor(charts): disclose advanced
study controls on demand" moved the ENTIRE second toolbar row behind
`studyToolsOpen`, which defaults to false. The branded trigger lived in that
row. Its only surviving path was ChartToolbar -> Advanced -> "Flow & studies",
a label that never says the words "Smart Money". From the trader's seat this is
indistinguishable from deletion.

Pre-fix production evidence: the live /charts DOM returned zero nodes matching
/smart money/i across 101 buttons.

FIX: the trigger renders in its own always-visible `wm-chart-identity-strip`,
gated ONLY by the chart-surface rule (`activeTab === "Chart" || "Options"`). It
never depends on `studyToolsOpen`. Exactly one trigger exists in the file.

Sentinel: `src/lib/smartMoneyTriggerReachability.test.ts` (6 tests). It brace-
matches both JSX blocks from source and asserts the trigger is inside the
identity strip and NOT inside the study row, that the two blocks are disjoint
siblings, and that the strip's gate expression contains no `*Open` state name.
POSITIVE CONTROL: `<FootprintControls` and `<DrawingToolsPanel` must be found
INSIDE the matched study-row range, so a truncated brace matcher goes red
before the "not buried" assertions can pass vacuously.

## Atom 2 — decision-memory schema-version collision broken (2d6f9af)

Two modules stamped the byte-identical tag `"wm.decision-memory.v1"` onto
COMPLETELY DIFFERENT record shapes:

  - `src/lib/traderMemory/decisionMemory.ts` -> `DecisionMemoryRecord`
  - `src/lib/decisionMemory.ts`              -> `SealedDecisionMemory`

That is a migration gate that cannot gate: no reader can tell the payloads
apart, and a version check waves both through.

FIX: renamed the ORPHAN's tag to `"wm.decision-seal.v1"`. The traderMemory tag
was deliberately NOT moved — three production surfaces (`/command-deck`,
`/profile`, `useMarketCanvasVM`) read it, so it is load-bearing identity. The
orphan has zero production importers, so renaming it is provably zero-risk.

`decisionMemoryReachability.test.ts` converted its BLOCKER assertion to
RESOLVED, pinned by EXACT VALUE on both sides — "they differ" alone is
satisfiable by renaming the live tag, which is the one that must not move.
Two-sided positive control on the extractor: it must read a real version out of
a probe declaration AND return null when there is none, otherwise a regex that
quietly stopped matching would make every assertion compare null to null.

§22 Orkin revive-attempt performed. Reintroducing the collision produced
`AssertionError: expected 'wm.decision-memory.v1' to not deeply equal
'wm.decision-memory.v1'`. The Sentinel bites.

## RETRACTED — "Smart Money panel renders off-screen" was NOT a defect

Recorded deliberately, because this cost real time and the next agent will hit
it. A defect was drafted and then DISPROVEN before any code was changed.

Observation that looked damning: on production the panel measured
`position: fixed`, `x: 1920` on a 1920px viewport, inline
`transform: translateX(100%)`, `panelInViewport: false`, `matchingRules: []`.

Actual cause: the measured tab was `document.visibilityState === "hidden"` —
the Chrome window was occluded. Browsers suspend `requestAnimationFrame` in
hidden tabs. framer-motion's animation loop is rAF-driven, so
`animate={{ x: 0 }}` could never start and the element sat at its `initial`
value forever. A planted rAF probe confirmed it: `fired: 0`.

Proof of no-defect: after bringing the tab to the front, the same element was
caught mid-flight at `translateX(56.8884%)` and came to rest on screen.
`panelInViewport: true`. A screenshot shows the panel rendered with honest
content ("0/5 lenses measured · 0 bullish · 0 bearish · 5 N/A on this feed
(need 3)", "We won't fake a winner").

METHODOLOGY RULE for anyone driving the browser programmatically: before
reporting any geometry, transform, animation, or visibility finding, assert
`document.visibilityState === "visible"`. A hidden tab freezes every rAF-driven
animation mid-`initial` and will manufacture convincing false defects.

Also note this failure mode is unreachable by a human: mounting the panel
requires clicking its trigger, which requires the tab to be visible.

## Gates

Both atoms: `./node_modules/.bin/vitest run` exit 0 and `tsc --noEmit` exit 0,
run UNPIPED (a pipe masks the exit code; a `>` redirect does not).
384 files / 3675 tests, then 3676.

Disclosed honestly at commit time: a full-suite run against the COMMITTED tree
shows one failure in the untracked `src/lib/chartPhoneControlReachability.test.ts`,
which is the other thread's file and asserts against their uncommitted
classnames. `git ls-files --error-unmatch` confirms it is untracked. The pushed
tree passes on all 383 tracked files. The two uncommitted artifacts belong
together and will land together.

## Live verification (production, wealthymindsetspro.com/charts)

Trigger: rect x=326 y=211 w=120 h=32, `triggerInViewport: true`, one node
matching `aria-label="Open Smart Money panel"`, WM logo SVG present. The
`"$ Smart Money"` textContent was investigated and is benign — the character is
an SVG `<text>` node inside the WMLogo brand mark, not a stray label.

Panel after click: opens, `panelInViewport: true`, honest degradation copy.

## CANON TENSION — surfaced, not silently resolved

BUILD ORDER §19 states the WM mark "does not belong as a toolbar tattoo". The
Founder explicitly asked for the branded logo on this button. Authority #1
(Founder current explicit decision) governs and the logo shipped. The conflict
is named here rather than buried so the Founder can rule on it directly.

## NEXT

Unblocked §13 gates, in the order judged highest-value: Delta Bubbles level
ownership; live VP render geometry proof; paper execution state-machine
realism.

Architectural, surface do NOT rush-wire: decision-memory sealing still has zero
production callers. `DecisionMemoryStore.put()` is the store's only ingress and
its only caller is the store's own unit test, so in production the store is
provably empty for every owner. Three surfaces read it and degrade honestly to
journal-only, so this is NOT a screen lie. What IS dead: /command-deck derives
`hasOpenPosition` and `hasUnreviewedClose` from decision records alone with no
journal fallback, so both are pinned false and job-mode can never reach MANAGE
or REVIEW by way of decision state. Inventing a caller to turn the file green
would manufacture exactly the unreachable ceremony it exists to detect.

BLOCKED, recorded honestly, not worked: Gate 4 responsive device proof
(programmatic window resize does not take effect, `outerWidth` pinned);
/journal detail canvas (0 journal entries exist to open).

Founder action, blocks wrangler observability/rollback only:
`./node_modules/.bin/wrangler login` in an interactive terminal.
