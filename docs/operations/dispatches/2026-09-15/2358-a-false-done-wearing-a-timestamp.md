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

## Live status — PENDING

**No live observation has been made of this change.** The commit is pushed to
`main`; Cloudflare's Git integration deploys on its own schedule and a deploy
identity is not an observation. A poll of production chunks for the literal
`opening-bell-verdict-withheld` is running.

This section will be rewritten **only against a screenshot** of the running
room showing:

- the evidence sentence and the withheld-verdict paragraph present, and
- no row asserting a completion the trader did not perform, and
- no "Preparation incomplete. Rushing preparation correlates with process
  failure." advisory.

Until that screenshot exists, this fix is SHIPPED, not PROVEN.
