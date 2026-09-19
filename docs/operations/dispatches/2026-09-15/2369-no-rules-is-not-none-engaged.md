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

# 2369 — "No rules configured" is not "no rules engaged"

**Commit:** `748e661` · **Route:** `/command-deck` → Decision WHY / WHY NOT
**Gates:** 602 files / 7027 tests `VITEST_EXIT=0`; `TSC_EXIT=0`
**Class:** H1 shape 1 (fabricated absence) — the **Orkin nest** of dispatch 2368.
**Status:** **LATENT — CLOSED BY CONSTRUCTION, NOT LIVE-OBSERVED.** See the
honest-negative section below. No before/after pixel exists and none is claimed.

---

## How it was found

2368 sealed a law and this defect was found by turning that law on **the same
function**, not on a new screen. A nest is not found by searching harder
elsewhere; it is found by re-reading the code you just fixed with the new law in
hand. Two branches below the clearance cured in 2368:

```ts
  if (engaged.length === 0 && permission) {
    clearances.push("No trader rules engaged.");
  }
```

Same overclaim, different subject, and this time hiding in a **presence check**
rather than a default branch.

---

## Root cause — a VACUOUS CONDITION

`clearances` is documented on `DecisionWhyVM` as
*"What IS satisfied — the affirmative side of the ledger."*

| State | `engaged.length === 0 && permission` | Is it a finding? |
|---|---|---|
| 8 rules configured, none engaged | true | **yes** — WM looked and found nothing |
| **0 rules configured** | **also true** | **no** — nothing could have engaged |

The condition cannot tell those apart, because it never consults the
**denominator**. With zero rules the test is *vacuously* true and the ledger
counts a clearance nobody earned: the absence of a **SUBJECT** reported as the
absence of an **OBJECTION**.

The state is reachable and the engine already knew it. `selectPermission` has an
early return whose own headline is *"No trading rules configured."*:

```ts
  if (input.rules.length === 0) {
    return { …, ruleCount: 0, headline: "No trading rules configured.", … };
  }
```

`ruleCount` was sitting on `PermissionVM` the whole time. Only this consumer was
guessing.

---

## The cure — the denominator law, both halves

| `ruleCount` | engaged | Renders in CLEARED |
|---|---|---|
| `0` | — | **nothing at all** |
| `> 0` | none | `0/8 trader rules engaged.` |
| `> 0` | some | nothing — they become `HARD_RULE` / `SOFT_RULE` **blockers** |

```ts
  if (engaged.length === 0 && permission && permission.ruleCount > 0) {
    clearances.push(`0/${permission.ruleCount} trader rules engaged.`);
  }
```

Note this is **not** the same remedy as 2368. There, silence was the whole cure,
because there was no denominator to state. Here a denominator exists whenever
`ruleCount > 0`, so the honest output is the **count with its denominator** —
the form already used by the Steward panel (`N/M engaged`) and by the
evidence-debt clearance two branches up (`N/M evidence nodes paid.`).

The bare, denominator-less sentence is now **unprintable in every state**.

### The same gate on the INVALIDATOR

An invalidator is documented as an observation that, *if it became true right
now*, would flip the verdict. With no rules configured, no HARD rule can engage
right now — naming one invents a tripwire that does not exist.

```ts
    if (permission && permission.ruleCount > 0 && !hasEngagedHard) {
      invalidators.push("A HARD trader rule engages.");
    }
```

---

## LABEL-NOT-MODEL

No rule evaluation changed. No rule invented. No verdict moved. The only thing
that changed is which sentences WM is entitled to print.

---

## Over-corrections GUARDED, not merely avoided

Five of the eleven Sentinels exist only to stop the cure becoming its own defect:

1. **Engaged rules are STILL blockers even when `ruleCount` is 0.** Finding an
   engaged rule *proves* rules exist; a denominator claim can never suppress an
   observation. Same guard as 2367 and 2368 — three dispatches, one law.
2. **A REAL clean rule set still earns its clearance.** Eight configured, none
   engaged is a genuine finding the trader is entitled to read.
3. **The HARD-rule invalidator survives when rules ARE configured.**
4. **The 2368 thesis clearance is untouched** — the cures must not cannibalise
   each other.
5. **A source-level lock** asserts the `ruleCount > 0` gate exists and that
   `clearances.push("No trader rules engaged…` never returns. Every behavioural
   test would still pass on a configured fixture if a refactor restored the bare
   presence check.

A sixth guard covers the case that was never the defect: **absent** `permission`
already emitted nothing, and still does.

---

## REVIVE §22 (Orkin)

The bare presence check was reinstated **via the Edit tool only**:

| Check | Result |
|---|---|
| `tsc --noEmit` on the REVIVED defect | **`TSC_EXIT=0`** — it compiles clean |
| Sentinel outcome | **`VITEST_EXIT=1`** (5 failed / 22 passed) |
| Failing tests, by name | `× THE DEFECT: with ZERO rules configured, no engagement clearance is printed`<br>`× THE DEFECT: the bare denominator-less sentence is unprintable in EVERY state`<br>`× THE DEFECT: the clearance is not pushed from a bare presence check`<br>`× states the denominator when rules ARE configured and none engaged`<br>`× reports the engagement clearance WITH ITS DENOMINATOR when rules are configured and clean` |
| Restore | byte-identical; full gates re-green at 602/7027 + `TSC_EXIT=0` |

**The revived defect compiled.** A vacuous boolean is perfectly well-typed —
which is why this class, like the overloaded null of 2368, is invisible to a
type system and must be caught in the *domain*.

---

## THE HONEST NEGATIVE — why this one has no pixel

A live read of `/command-deck` in the Founder's own session, taken **before**
the fix was pushed, with all `<details>` forced open:

| Probe | Value |
|---|---|
| occurrences of *"No trader rules engaged."* | **0** |
| engagement chip on the same page | **`2/8 engaged`** |
| occurrences of *"No trading rules configured."* | **0** |
| occurrences of *"A HARD trader rule engages."* | **0** |
| `N/M evidence nodes paid.` | `0/9` ×2 — unchanged by this work |

The Founder has **eight rules configured and two engaged**. `engaged.length` is
therefore `2`, the branch never fired, and the overclaim was never reaching his
screen.

So this dispatch closes a **latent** defect. It is real — the `ruleCount === 0`
state is reachable, has its own early return, and has its own test asserting
`ruleCount` is `0` — but it is not observable on this account, and **no
before/after observation is offered**. The deploy will be confirmed only as a
**no-regression**: the screen must be byte-for-byte the same, because with
`2/8 engaged` neither the old code nor the new code prints anything here.

Filing a latent defect as PROVEN would be the same species of lie the defect
itself was. It is filed as LATENT.

---

## Method lesson sealed

> **A vacuous condition is an overclaim.**
> `if (nothing_engaged)` and `if (nothing_engaged && something_could_have)` are
> different questions, and the first one silently answers the second. A guard
> that omits the denominator is not a smaller guard — it is a *different*,
> false guard that happens to agree with the true one whenever the denominator
> is non-zero. That agreement is what makes it survive review.

Joining 2367 (the count) and 2368 (the sentence), the law is now stated three
ways and is one law:

> **Nothing found is only a finding when something could have been found.**
> A count must state its denominator. A clearance must state its subject. A
> tripwire must exist before you can promise it will trip.
