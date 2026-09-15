# 2365 — Two answers to one question, 140 pixels apart

**Commit:** `fa49aee` — *fix(command-deck): the chain and the Steward stop disagreeing about your rules*
**Route:** `/command-deck`
**Found by:** LOOKING. Not grep. It was in the screenshot taken to verify `121b27a`.

---

## The defect, as it appeared

One screen, two rows, ~140px apart:

```
!  PERMISSION      NOT_EVALUATED
   No trader rules configured — Permission not evaluated.
   ...
4  STEWARD · RULES VERDICT
   STEWARD RULES · RESTRICTED
   Your rule says Trustworthy market data required.
   2/8 engaged · phase: preparation
```

Two answers to *"does this trader have rules?"* — **none**, and **eight**.

## Root cause

Two callers, two sources of truth. `/command-deck` called `selectDecisionChain`
without `permissionInputs`, so the chain's permission node stayed `null`;
`composeMarketCanvasVM` independently compiled a real verdict off
`defaultFounderRules()`. **Nothing is wrong in any single file** — which is
exactly why every previous sweep of this page missed it.

Two separate defects were inside that:

**A — a FABRICATED CAUSE.** `permission === null` means exactly one thing: no
inputs were handed to that selector. It is not evidence about whether the trader
configured anything, and the selector cannot know. Every sibling link in the
same chain already narrates its own INPUTS and is true by construction — *"No
proposed setup — Available R not evaluated."*, *"No CLC evaluation available."*,
*"No open position — management not active."* Only permission reached past its
inputs to assert a state of the world it had not observed.

> **The fallback narrates the INPUT, never the world.**

**B — the CONTRADICTION.** The deck *had* the rules; it just wasn't handing them
to the chain. It now passes `permissionInputs` built from the same four values
it gives the compiler.

And to stop that becoming a SECOND rival computation — the precise shape that
caused this — `composeMarketCanvasVM` now READS the chain's permission
(`chain?.permission ?? selectPermission(...)`) instead of deriving its own.
canon §Single-Writer / Many-Readers.

---

## Live status — **PROVEN**

Observed on `https://wealthymindsetspro.com/command-deck` in the Founder's own
signed-in session after the deploy landed (chunkset digest changed
`3a940611…` → `864359fe…`). All `<details>` forced open.

| Check | Observed |
|---|---|
| Fabricated string gone | `"No trader rules configured"` **absent from the page** |
| Chain PERMISSION verdict | `PERMISSION   RESTRICTED` |
| Chain PERMISSION narrative | `Your rule says Trustworthy market data required.` |
| Chain rule chips (new) | `HARD: Trustworthy market data req…`  `SOFT: CLC setup evidence required` |
| Steward verdict | `STEWARD RULES · RESTRICTED` |
| Steward narrative | `Your rule says Trustworthy market data required.` |
| Steward engagement | `2/8 engaged · phase: preparation` |
| Page error | none |

**The two rows now read the same sentence.**

### Why this observation DISCRIMINATES — unlike 2364's

`2364` had to withhold half its claim: the condition its fix keyed on
(`state === null`) was not the condition on screen, so the screen would have
looked identical before and after.

Here the variable under test is **the chain's permission node**, and the
Founder's live session genuinely exhibited the pre-fix value. The *before*
capture — same route, same screen region, same session — reads
`PERMISSION · NOT_EVALUATED / "No trader rules configured — Permission not
evaluated."` The *after* capture reads `PERMISSION · RESTRICTED` with the
Steward's sentence. Same variable, both values, observed.

> **Before calling an observation a proof, name the variable the fix keys on
> and show that variable took the value under test.**

---

## Two existing Sentinels caught this work. Both were right to.

1. **The single-writer breadcrumb** forbids `/command-deck` importing from
   `selectPermission`. Rather than route around it, `defaultFounderRules` is now
   re-exported from the **COMPILER** and the deck imports it from there — which
   is the dependency the Sentinel exists to enforce in the first place.

2. **Sentinel #4 from `121b27a`** (*"the null-chain claim is checked, not
   asserted"*) failed, **exactly as designed**. `2364` had written that if the
   compiler ever changed how permission is compiled, the Steward ungating must
   be RE-ARGUED. It was re-argued — in the test file, not silently relaxed:
   `??` falls through on `null`, so `selectPermission` still runs whenever the
   chain carries no permission; `permission` is still annotated `PermissionVM`,
   not `PermissionVM | null`; `tsc` accepts it; there is no branch where it is
   undefined. The assertion now checks that **INVARIANT** rather than one
   spelling of it.

   > **A Sentinel that fails on correct refactors is a Sentinel that gets deleted.**

---

## Sentinels

`src/lib/design/theChainAndTheStewardAgreeOnRules.enforcement.test.ts` — **+10**

- 2 × **THE DEFECT** (the deck supplies `permissionInputs`; the chain never
  claims the trader has no rules configured)
- 1 the fallback narrates its INPUT, not the world
- 1 both call sites read the same rules source
- 1 the deck's `sessionIdentity` matches the compiler's spelling — **EXTRACTED**
  from the compiler, so it tracks rather than restates
- 1 the compiler defers to a chain-supplied permission
- 3 **OVER-CORRECTION** — the compiler's own `selectPermission` is not deleted;
  `permissionInputs` stays OPTIONAL on the selector; the sibling links keep
  their honest input-narrations
- 1 the `121b27a` Steward ungating stays fixed

## REVIVE §22

Proven **BY NAME**, in compilable form. Both halves reinstated via the Edit
tool; `TSC_EXIT=0` on the revived defect, so nothing but the Sentinels stood
between the codebase and its return. Four failed, two by name:

```
× THE DEFECT: the deck supplies permissionInputs to selectDecisionChain
× THE DEFECT: the chain never claims the trader has no rules configured
```

Then restored byte-identical.

## Gates

`598 files / 6982 tests` · `VITEST_EXIT=0` · `TSC_EXIT=0`

---

## The method note worth keeping

This is defect **#10** of the block and the **first found by looking rather than
by grepping**. It survived every prior sweep because static search cannot see
it: each file is individually correct. The contradiction only exists when two
correct files render into the same viewport.

The Founder's standing instruction — *"be sure to be using the computer tools
for visual verification… after each breakthrough"* — is what produced it. The
screenshot was taken to close one atom and opened another.
