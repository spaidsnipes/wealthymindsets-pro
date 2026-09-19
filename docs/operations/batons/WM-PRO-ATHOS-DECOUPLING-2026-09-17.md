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

# ATHOS DECOUPLING — THE THIRD INSTANCE, AND TWO SENTINELS THAT FOUGHT THE CURE

Date: 2026-09-17
Commit: `f12998a3`
CI: `35208534202` success
Live: https://wealthymindsetspro.com/command-deck

## THE DEFECT

Structural H1, third occurrence: an unobserved MARKET silencing an observable
fact about the PERSON. The Opening Bell (`42b4106`) and the Mirror (`9bc3844`)
were the first two. This one sat at `page.tsx:~2894`:

```tsx
{chainVm && (
  <ATHOSInterventionPanel interventions={athos.interventions} … />
)}
```

ATHOS has SEVEN detectors. Two consume `clc`/`dlar`; five consume only
`sessionDecisions`. So the panel-level gate silenced five statements about the
TRADER in order to guard two statements about the MARKET — and it did not even
guard those, because both market detectors already open with their own
null-check on the same inputs:

| Detector | Reads | Own guard |
|---|---|---|
| `detectPreEntryConfirmation` | clc + dlar | `if (!input.clc \|\| !input.dlar) return null;` |
| `detectPreEntryAbsorption` | dlar | `if (!input.dlar) return null;` |
| `detectPostExitContinuationIntegrity` | sessionDecisions | — |
| `detectPreReentryMissedProfitRevenge` | sessionDecisions | — |
| `detectSuccessTriggeredRuleBending` | sessionDecisions | — |
| `detectPostRuleViolationSeparation` | sessionDecisions | — |
| `detectMaxLossesReached` | sessionDecisions | — |

The consequence in words: WM went quiet about the trader hitting their declared
loss limit on exactly the sessions where the tape could not be read. That is
when the intervention matters most. The cure is one conjunct removed. **The
gate belongs where the claim is, not in front of the panel.**

## THE PART WORTH RECORDING: TWO SENTINELS DEFENDED THE DEFECT

Both `theMirrorIsNotAMarketPanel` and `theStewardIsNotAMarketPanel` pinned this
exact gate as the EXAMPLE of a correct one:

```ts
expect(deck).toMatch(/\{chainVm && \(\s*<ATHOSInterventionPanel/);
```

The GUARDRAIL was right and the EXAMPLE was wrong. Both rules worked by
ENUMERATING members rather than CHECKING the criterion, so neither could notice
that ATHOS had stopped belonging to the set. Worse, the honest fix could not be
made without the suite going red, and the cheapest way to quiet it was to put
the defect back.

**A rule whose cheapest cure is the disease is worse than no rule.** That
sentence was already written in this repo, at
`theMirrorIsNotAMarketPanel.enforcement.test.ts:88`, about a different rule.
It earned its keep here.

Neither sentinel was deleted. Both were re-pinned to the meaning, and both are
strictly stronger than what they replaced:

- **Steward** — `every surviving chainVm gate guards a real dereference`.
  Every `{chainVm && …}` on the page must guard an expression that actually
  consumes `chainVm`. Catches BOTH directions now: stripping a real gate goes
  red, and adding a decorative one in front of a panel that never touches the
  chain goes red too. The old form could only catch the first.
- **Mirror** — `market claims are guarded by their own market input`. Every
  detector that READS `clc`/`dlar` must also CHECK it. Plus the other half:
  the three named behaviour detectors must not read the market at all.

Two implementation notes, both learned by the rule failing first:

1. The criterion is CONSUME, not dereference. `vm={chainVm}` passes the whole
   object and is a genuine dependency; `/chainVm[.?]/` wrongly failed
   `StructureContextNote`.
2. The scan window is cut at the first `}, [` — a memo dependency array is a
   declaration of what a hook READS, and would let an unrelated gate borrow a
   neighbour's honesty and pass.

## ANTI-VACUITY — ALL FOUR PROBED RED

| Mutation | Rule that caught it |
|---|---|
| reinstate `{chainVm &&` on the ATHOS mount | BOTH files, independently — `THE DEFECT: ATHOS is not gated…` and `every surviving chainVm gate guards a real dereference` |
| strip `if (!input.dlar) return null;` from `detectPreEntryAbsorption` | `market claims are guarded by their own market input` |
| give `detectMaxLossesReached` an `input.clc` read | `the trader-memory detectors are not gated on the market at all` (and the market-guard rule, correctly) |
| remove `if (visible.length === 0) return null` | `ATHOS still self-silences when it has nothing to say` |

The first mutation being caught by two files independently is the point: the
re-pin did not move the guarantee from one file to another, it doubled it.

## LIVE OBSERVATION (not inference)

`https://wealthymindsetspro.com/command-deck`, prod, after CI green:
`path=/command-deck`, deck rendered, rail carries 7 tenants, no crash, no
regression from the ungating. 8548 tests pass, `tsc --noEmit` clean.

HONEST LIMIT OF THIS PROOF — stated rather than papered over:
**The behavioural change is NOT eye-observable on the Founder's account.** With
zero session decisions, ATHOS correctly renders nothing (§14 "silence is a
feature") whether or not the gate is present. So the live observation proves
NO REGRESSION; it does not prove the cure. The cure is proved by the four
probes above and by the detector table, not by a screenshot. Recorded as such.

## CARRIED FORWARD

- **Next atom:** enroll ATHOS as the EIGHTH WORKSPACE tenant. It has the same
  double burial tenant 7 had — it still sits inside a `<details>` at
  `page.tsx:~2901` — plus a real `unabridged` cap candidate in its existing
  "show N more consideration(s)" fold, and the same painted-door `return null`.
- Remaining DEBT register after that: `DecisionWhyPanel` (IS the drawer —
  needs a Founder ruling before it can be a tenant of itself), `WhyInspector`
  (target-driven via a `target` prop; may not be standing equipment at all).
- Unchanged blockers: `/journal` detail canvas (0 entries), Gate 4 responsive
  device proof (programmatic resize does not take effect).
- Unchanged open question: ENTER on equipment with nothing deeper is a silent
  no-op. Curing it needs the Room to know the equipment's contents — the second
  semantic brain the grammar bans. Needs a grammar decision, not a patch.
