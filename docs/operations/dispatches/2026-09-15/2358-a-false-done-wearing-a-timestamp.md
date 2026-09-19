<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **dispatch** — an instruction issued for one day's work. Its filename names its own day. It was true
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

# A false DONE wearing a timestamp

**Commit:** `b326282` · **Surface:** `/morning-prep` · **Law:** H1 (absence is not zero) · LABEL-NOT-MODEL · single-writer wording

Read this one even if you read the last dispatch. The defect on `/command-deck`
(`ce90890`) had a twin on `/morning-prep`, and the twin was worse.

---

## The defect

`/morning-prep` built its Opening Bell rows from the template like this:

```ts
completed:   t.category === "personal" ? hasTodayEntry : false,
completedAt: t.category === "personal" && hasTodayEntry ? nowMs : undefined,
```

Two fabrications, pointing in opposite directions, on the page that owns the
real data.

**1. Six items hardcoded NOT DONE.** Same accusation the deck was making:
nothing was observed, and the absence of observation was rendered as the
trader having failed to do the thing.

**2. Two items marked DONE — and stamped with a completion TIME.** This is the
half that should bother you. The trigger was:

```ts
const hasTodayEntry = entries.length > 0;
```

`entries.length > 0` is **any entry ever written**, not today's. So a trader who
logged one morning prep in March opened the app in September and was told
"personal reflection — completed at 09:41", by a page that never looked at the
date, about a morning they had not yet had.

A fabricated tick is not the gentler error. A false NOT DONE can be argued
with. A false DONE is a record of something the trader never did, wearing a
timestamp.

---

## Why the cure is a shared component and not a second block of JSX

Because the defect existed **twice**, in two files, and the second copy had
drifted further from the truth than the first. That is the shape of every Orkin
nest we have found: the same overclaim, a different room, slightly mutated.

So the honest rendering now ships as exactly one component:

```
src/components/opening-bell/OpeningBellEvidence.tsx
```

Both rooms compose it. Neither can fork its wording. There is nowhere in it to
put an invented tick — it takes already-compiled evidence and decides nothing.

Both rooms also now read the **same adapter** (`useTodayPrep`) and the **same
pure owner** (`selectPrepEvidence`), so they cannot disagree about the same
morning.

The one axis that IS observed on this page — coverage health, via
`selectChannelCoverageHealth` → `coverageQuality` — survived the refactor
intact and is still passed. Only its call shape moved.

---

## Sentinels (+4)

| Sentinel | What it prevents |
|---|---|
| `THE SECOND SURFACE: /morning-prep fabricates neither a NOT DONE nor a DONE` | bans `completed: false`, `completedAt:`, and `hasTodayEntry` in the page source |
| `ONE VOICE: both rooms read the same adapter` | the two screens drifting apart about the same morning |
| `THE WORDING IS NOT FORKABLE` | a surface inlining `PREP_VERDICT_WITHHELD` again, so the fix can rot on one screen while looking healthy on the other |
| `morningPrepTruth › Opening Bell receives a real dataQuality owner` (amended) | the real coverage-health owner being dropped in the refactor |

---

## The lesson worth carrying: a Sentinel can pin SYNTAX rather than intent

The last Sentinel in that table **failed on this change** — and it should not
have. It asserted:

```ts
expect(page).toContain("dataQuality: coverageQuality");
```

That is the selector-argument form. After the refactor the *same real owner* is
passed to the *same honest consumer*, as a JSX prop:

```tsx
dataQuality={coverageQuality}
```

Nothing about the truth of the wiring changed. The Sentinel was keyed to the
punctuation of the call site, not to the claim being made, so a correct
refactor tripped it. The assertion is updated **and carries a comment saying
why it moved** — because "I updated the failing test" is exactly the sentence a
weakened Sentinel hides behind, and the only defence is writing down the
distinction at the moment you make it.

Related, from the sibling dispatch: a Sentinel that greps free text for a
template id can match a shared English word (`catalysts` inside
`"News / catalysts reviewed"`). Assert ids as **quoted tokens**.

---

## Gates

```
Test Files  592 passed (592)
Tests       6935 passed (6935)
VITEST_EXIT=0
TSC_EXIT=0
```

**REVIVE §22 proven.** The defect was reintroduced via the Edit tool only;
`THE SECOND SURFACE: /morning-prep fabricates neither a NOT DONE nor a DONE`
failed by name:

```
AssertionError: expected '"use client";\n\nimport React, { useS…' not to match /completed:\s*false/
```

then the file was restored byte-identical.

---

## Live status — OBSERVED on production

Observed in the Founder's browser on `https://wealthymindsetspro.com/morning-prep`
after `b326282` reached production. The Opening Bell region rendered:

```
OPENING BELL
No morning prep was logged in WM today.
Market data health right now: STALE.
No readiness verdict is shown. Your prep list lives in Morning Prep and uses
your own wording, so this room can count what you checked but cannot tell
which of the items below you checked — and it will not guess about you.
```

Checked in the same read:

| Check | Result |
|---|---|
| `[data-testid="opening-bell-evidence"]` present | yes |
| any `NOT DONE` row | **none** |
| "Rushing preparation" advisory | **absent** |
| data health line | `STALE` — a real reading, not a default |

The ABSENT case is the one that rendered, and it rendered as the finding it
is: *"No morning prep was logged in WM today."* Not incomplete. Not rushing.
Not a fabricated tick. This fix is **PROVEN**.

---

## What standing in the room found next

Verifying this one exposed a second defect on `/command-deck`, which is fixed
in the follow-up commit. The deck rendered the Opening Bell as:

```tsx
{chainVm && phase === "PREPARATION" && <OpeningBellSlot ... />}
```

`chainVm` is null whenever canonical market state has not resolved. Observed
live: the deck sat in PREPARATION reading **MARKET STATE UNKNOWN**, and the
entire Opening Bell was absent from the DOM. The trader was told nothing about
**their own prep** because the **market** was unreadable.

Those two facts are unrelated — prep evidence comes from the trader's journal
and never consults the tape — and an unresolved market is exactly when
PREPARATION matters most. So the panel disappeared precisely when it was most
useful. H1 in structural form: an unobserved market silencing an observable
fact about the person.

This is the argument for live verification as a step, not a formality. The
unit tests were green, the Sentinels were green, the component was correct,
and the panel still was not on the screen.

### `42b4106` — OBSERVED on production

Read in the Founder's browser on `https://wealthymindsetspro.com/command-deck`,
PREP phase, with the deck simultaneously reading **MARKET STATE UNKNOWN** — the
exact condition that used to erase the panel. The region rendered:

```
OPENING BELL
No morning prep was logged in WM today.
Market data health right now: UNAVAILABLE.
No readiness verdict is shown. Your prep list lives in Morning Prep and uses
your own wording, so this room can count what you checked but cannot tell
which of the items below you checked — and it will not guess about you.
OPEN MORNING PREP →
```

`UNAVAILABLE` is a real reading of a genuinely unresolved market, not a
default — the health line degraded honestly instead of the whole panel
vanishing. This fix is **PROVEN**.

### What the same read found next

The region lives inside `<details class="wm-cd-secondary-workspace">`, which is
**closed by default**. So during PREPARATION — the phase whose entire job is
prep — the trader's prep evidence is one collapsed disclosure away, and
`element.innerText` is the empty string until it is expanded.

This is not a fabrication and not an overclaim; nothing false is on the screen.
It is a *placement* question: the panel that answers "am I prepared" is filed
under secondary while the PREP tab is the one selected. Logged here rather than
fixed in the same breath, because deciding where it belongs is a canon call,
not a bug fix.
