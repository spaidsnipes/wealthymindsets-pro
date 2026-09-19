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

# WM PRO SHIFT — THE ARIA-LABEL KNEW MORE THAN THE SCREEN

Commits: `31a6a454` (baton for the previous block), `95023ed4` (the atom) — pushed to `main`
Predecessor baton: `…THE-GRAMMAR-HAD-ONE-ROOM-S-GUARDS.md`

---

## 1. The defect, measured on the LIVE production DOM before it was touched

`/command-deck`, the Founder's own Chrome, before the fix:

```
regime      reason: "Neither regime nor volatility dimension has verified
                     evidence at snapshot time."          reasonVisible: false
auction     reason: "Structure, location, regime and profile all unresolved."
                                                          reasonVisible: false
clc         reason: "CONTEXT and LOCATION and CONFIRMATION unresolved —
                     insufficient evidence to judge the setup"
                                                          reasonVisible: false
permission  reason: "Hard rule(s) engaged. You retain override capacity — WM
                     does not gate the action. Consider acknowledging the
                     override intentionally."             reasonVisible: false

[data-decision-chain-reason] elements on page: 0
```

`reason` was read off each node's `aria-label` and compared against that node's
own `innerText`. Four of the nine chain nodes shipped a compiled sentence to
assistive technology and to no pixel.

The Permission one is the sharpest: an instruction about **overriding a hard
rule** — delivered only to screen readers.

## 2. Why it is a defect and not an accessibility win running ahead

An accessible name exists to give NON-text content a text equivalent. The
indicator glyph legitimately lives only in the label: `ind.label` ("watch") is
the alternative for a coloured `◐`, and that asymmetry is correct and stays.

A **view-model field** is not non-text content. When a compiled sentence reaches
assistive technology and never reaches the screen, the accessible name has
stopped being an alternative and become the only copy. That is an inversion,
and the sighted trader is the one who lost the sentence.

It is also a DIFFERENT sentence, not a rewording of the narrative already on
screen. `selectRegime` is the clearest case:

```
narrative: "Regime value has changed across the last 3 snapshots (…)."
reason:    "Regime dimension has flipped recently — treat as transitional,
            not stable."
```

The first says what the regime IS. The second says what to DO about it. Only
the first was painted.

## 3. The atom — `95023ed4`

`node.reason` is now rendered, gold `#c9a55c`, 11px, behind its own hairline
rule, beneath the narrative and above the hint chips.

**Deliberately NOT gated on `showNarratives`.** That flag caps how much of the
chain's DESCRIPTION is shown; a reason is not a description, it is the caveat
attached to a verdict, which is what a terse read most needs. Gating it would
have re-opened the aria-only hole through the other branch — and the test
suite pins both branches.

**The rule was not made to agree with its author.** The obvious "fix" was to
drop `reason` from the `aria-label` so the two sides matched. That would have
resolved the disagreement by throwing away the better sentence. The
disagreement was real evidence that something compiled was going unshown.

## 4. Proven non-vacuous

`src/lib/design/decisionChainReasonIsVisible.test.ts` — 6 tests, rendering the
real panel through `renderToStaticMarkup` and stripping `aria-label` and
`title` out of the markup before asserting, so "visible" means *visible*.

Disabling the new render block:

```
REVIVE_EXIT=1
  × RENDERS node.reason where a sighted trader can read it
  × is not gated on showNarratives — a terse chain needs its caveats MOST
  × paints a reason for EVERY node that can carry one, not just the first
  Tests  3 failed | 3 passed (6)
```

Restored via `cp`; `git diff --stat` empty.

The file also carries the selector half: the render tests would keep passing on
the day `selectDecisionChain` stopped forwarding `reason` at all — the panel
would own a row nothing ever fills, and a chain with no caveats reads exactly
like a chain with nothing to caveat.

## 5. Live verification on the NORMAL prod URL

Same page, after deploy, same probe:

```
reasonDataAttrs: 4
  regime      "Neither regime nor volatility dimension has verified evidence…"
  auction     "Structure, location, regime and profile all unresolved."
  clc         "CONTEXT and LOCATION and CONFIRMATION unresolved — insufficient…"
  permission  "Hard rule(s) engaged. You retain override capacity — WM does not…"
```

Geometry of the Permission sentence, read with `getBoundingClientRect()` rather
than off a downscaled screenshot:

```
rect: 1620 × 16      color: rgb(201, 165, 92)      fontSize: 11px
```

Two ancestor `<details>` were opened to take the measurement and **closed again
in the same call** — the Founder's page was left exactly as found.

`0 → 4` on the live DOM. Gate: `TSC_EXIT=0`, vitest 692 files / **8515** tests
(8509 → 8515). CI `35198310760` success, 4m34s.

## 6. A NEGATIVE result reported as negative

I wrote a repo-wide sweep for the same defect class — any `aria-label` carrying
a view-model field that the component never renders — and it reported zero.

**That number is not trustworthy and is recorded here so nobody re-reads it as
a clean bill of health.** Run against the known defect with the fix removed, the
sweep still returned zero. Two reasons, both found by making it fail:

1. Its "is it rendered?" check matched `${expr}` inside the template literal it
   was scanning, because `${expr}` literally contains `{expr}`. Every field
   looked rendered. Fixed with a lookbehind.
2. Even fixed, it cannot parse NESTED template literals, and
   `DecisionChainPanel`'s label is exactly that
   (`` `…${node.reason ? `. ${node.reason}` : ""}` ``). The one real instance in
   the repo is invisible to it.

So the sweep is **not evidence that the chain was the only case.** A scanner
that cannot find the bug it was written for is the vacuity failure this repo
has already shipped once. It was not committed.

It did flag two `/journal` fields (`weekEdge.totalEntries`,
`weekEdge.rTaggedEntries`, page.tsx:1682). On inspection that string is bound to
**both `title` and `aria-label`**, so it is hover-disclosed, not assistive-only
— a weaker class, and not the same defect. Noted, not acted on.

## 7. §13 re-derived from the code, not from the list — two more entries are stale

- **"Decision Memory sealing has zero production callers"** — the instruction
  was *surface, do not rush-wire*. It is **already surfaced**, thoroughly:
  `src/lib/decisionMemoryReachability.test.ts` pins it as a named blocker and
  states the shape plainly ("in production the store is not probably empty — it
  is PROVABLY empty, for every owner, forever, by construction"), names the
  three readers that degrade honestly, and refuses to invent a caller. Further,
  the dead consequence it recorded — `/command-deck` deriving `hasOpenPosition`
  and `hasUnreviewedClose` from `decisionRecords` alone — **has since been
  repaired**: page.tsx:867 now unions with `unreviewedCloses.hasUnreviewedClose`
  from the Journal. What survives is only the Exit Ramp's "N decision record(s)
  preserved" line (page.tsx:925), which stays silent rather than lying.
- **"paper execution state machine realism"** — beyond the four realism modules
  the previous baton listed, the state machine itself has an owner and a matrix:
  `canCancelOrder` / `isTerminalOrderStatus` / `TERMINAL_ORDER_STATUSES` in
  `paperTrade.ts`, pinned by `paperOrderStateMachine.test.ts`, which also guards
  the HANDLER rather than the button (`canCancelOrder(o.status)`) and pins the
  close-position double-click that could flip a flatten into a short.

## 8. Carried forward

- **NEW, and the same class as §3 of the previous baton:** the Decision Chain
  itself has **no unburied door** on `/command-deck`. Every mount sits two
  `<details>` deep (the Workspace toggle, then "Deep read · story · auction lens
  · decision chain · steward · fidelity"). Measured across both rooms, four
  panels are in that position — `DecisionChainPanel` and `SceneAdmissionPanel`
  at depth 2, `MirrorPanel` and `DecisionWhyPanel` at depth 1. The equipment
  burial rule shipped in `70e462b5` does not reach them because it is stated
  per equipment DESCRIPTOR and none of these are registered equipment.
  Enrolling the chain would discharge the directive's closing clause, but
  `unabridged` needs an honest meaning first and the chain's `SceneAdmits`
  withholding in PREGAME / CLOSED must be carried with it, or the rail would
  offer a door the room has deliberately closed. **Scoped, not started.**
- **BLOCKED (environment):** VP live pixel observation and Gate 4 — the Mac is
  at the lock screen.
- **BLOCKED (data):** `/journal` detail canvas — 0 entries. Fabricating entries
  into the Founder's production localStorage is refused.
- **VERIFIED CLOSED, leave alone:** `executionConnectivity`; Live VP render
  geometry proof; Delta Bubbles level ownership.
- **ESCALATE:** Cloudflare Workers build `651be3e7-0a2e-4f19-b3ea-7aa3b6f0fb36`
  FAILED while GitHub CI passed the same SHA `ebf26a2`.
- **DECISION REQUESTED (carried):** the deck's twice-buried `MarketCanvasPanel`
  at page.tsx:1704.
- **FOUNDER DECISIONS PENDING:** `DecisionWhyPanel` drawer vs mockup #8;
  whether `DecisionReceiptPanel` becomes equipment.
