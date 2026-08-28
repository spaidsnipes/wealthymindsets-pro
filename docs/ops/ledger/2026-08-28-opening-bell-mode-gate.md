# Opening Bell gated on ExperienceMode PREP, not phase alone

- **Date/time:** 2026-08-28 (PM shift)
- **Branch:** `shift/deck-emphasis-explain` (pushes to origin same branch)
- **Starting SHA:** a8c7db5 (decisionContextBus snapshot-identity #185 guard test)
- **Ending SHA:** 01a6b47
- **Commit:** 01a6b47 "Gate Opening Bell on ExperienceMode PREP, not phase alone"

## Observed failure

On `/command-deck` the ~690px Opening Bell readiness panel ("Not ready —
Preparation incomplete. Rushing preparation correlates with process failure.")
rendered large at cold mount even when the human's declared job
(ExperienceMode) was **OBSERVE** (watching, no position). It shouted prep
readiness at someone who is only watching — incongruent with the doctrine
"THE SYSTEM REORGANIZES AROUND THE USER'S CURRENT JOB."

## Root cause (workflow-semantics finding)

The deck carries **two independent-by-design workflow axes**, and BOTH default
on their first enum value:

1. **ExperienceMode** (`useDecisionContext` / decisionContextBus) — defaults
   `OBSERVE`. Canonical "current job" driver of shell + deck EMPHASIS.
2. **TradePhase** (`selectDecisionChain`) — defaults `PREPARATION`. Older
   trade-lifecycle analytics axis feeding `selectDecisionChain` and the ATHOS
   moment map.

There is NO mapping helper between them and inventing one would silently
rewrite analytics inputs. The Opening Bell was gated on `phase ===
"PREPARATION"` ALONE, so the phase default by itself made it lead regardless of
the declared job. This is a **presentation/gating reconciliation, not a state
change** — confirmed the axes are independent by design before touching gating.

## Fix

New pure predicate `src/lib/experience/phaseSurfaceGate.ts`:

```ts
shouldLeadOpeningBell(mode, phase) = mode === "PREP" && phase === "PREPARATION"
```

Opening Bell now leads only when BOTH axes agree the job is preparation. No
phase mutation; no fabricated readiness (the panel's own `selectOpeningBell`
inputs are untouched — every checklist item still reports its honest state).

## Other `phase ===` gated panels — audited, deliberately unchanged

Enumerated every `phase ===` gate in `page.tsx`. Only two existed:

- **Opening Bell** — migrated to `shouldLeadOpeningBell` (this atom).
- **Mirror panel** — `phase === "REVIEW" || phase === "POST_EXIT"`. **Left
  phase-driven, deliberately.** It defaults OFF (phase starts PREPARATION), so
  it has NO cold-mount default-on collision — the exact symptom that motivated
  this fix does not apply. It only appears after an explicit user phase
  selection (a deliberate signal, unlike a silent default). Mode-gating it too
  would be scope creep beyond the reported problem; revisit only if a
  cold-mount or congruence complaint actually surfaces for Mirror.

## Proof

- `tsc --noEmit --skipLibCheck` — clean.
- `vitest run` — 175 files / 1490 tests pass (was 174/1478; +1 file, +5 tests
  for `phaseSurfaceGate.test.ts`; the +7 delta over 1478 also includes the
  a8c7db5 snapshot-identity tests from the prior atom).
- **LOCAL Gate-4** (real-prod blocked on Cloudflare Error 1027): preview port
  3020, Founder session.
  - OBSERVE (default, phase=PREPARATION): DOM `openingBellPresent=false`; deck
    leads with Hero Truth + "WATCH THE MARKET WITH NO POSITION". ✅ the fix.
  - PREP (phase=PREPARATION): `openingBellPresent=true`; full readiness
    checklist (Personal / Market Prep / Risk Plan / Playbook / Data Health)
    renders. ✅ preserved when the mode genuinely is PREP.
  - Zero console errors across the OBSERVE→PREP→OBSERVE transition.
  - Before/after screenshots captured in-session.

## Deployment state

Pushed to `origin/shift/deck-emphasis-explain`. Real-prod (Cloudflare Workers)
NOT verified — blocked on Error 1027 plan quota (Founder-only, task #15).

## Remaining / next

- Mirror panel congruence (mode-gate REVIEW/POST_EXIT surfaces) — only if a
  real complaint surfaces; not done now to keep scope surgical.
- Sync this ledger entry to the Drive Living Implementation Ledger (Drive MCP
  requires an interactive authorized session).
