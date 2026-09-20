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
> Demoted 2026-09-20 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`.
<!-- END:ath-historical-lineage -->

# WM PRO — SHIFT RECEIPT — 2026-09-20 — "THE DOOR HAS TWO LOCKS"

**Project:** WM Pro · `wealthymindsets-pro`
**Serving authority:** Cloudflare Workers + OpenNext · `wealthymindsetspro.com`
**Canon:** PASS 8 CONTRACTOR BLUEPRINTS (IFC / Hard Hat) — assembly-order
**item 3 (H-101, GO interlock)** carried to completion, and the first real
finding from **item 4 (E-301, market fidelity)**.

---

## WHAT SHIPPED

| SHA | Atom |
| --- | --- |
| `36aa0987` | Stamp the debt-has-names baton with its historical lineage |
| `9d20ff09` | Make the evidence debt read as the lock, not as a note beside one |
| `28c57cdc` | Close FALSE RIPENESS — a paid ledger is not an executable market |

Pushed to `main`: `120b58f9..28c57cdc`.

---

## THE SHIFT IN ONE PARAGRAPH

H-101's third leg is the GO interlock. `9d20ff09` shipped it: a plaque above
the roster that states, in the canon's own words, that the evidence debt is
what HOLDS the decision shut — because until then the rail drew the verdict
and the `?` chips as two neighbouring facts and left the trader to infer the
causation between them. Then E-301 was read, and it immediately convicted the
selector that had just been committed: GO is drawn there as **two contactors
in series**, and the new plaque was reading only one of them. `28c57cdc` is
that repair.

---

## THE DEFECT THAT WAS FOUND AND FIXED IN THE SAME SHIFT

E-301's hazard annotation, verbatim:

> **FALSE RIPENESS if STALE plus pretty Clarity.**

and its circuits:

```
INTENT CIRCUIT — requires EXECUTABLE AND broker not UNVERIFIED
GO CIRCUIT     — requires intent AND gates not in debt
```

`selectGoInterlock` derived `CLEAR` / **PERMISSION GRANTED** from
`computeRightOfWay === ACTION` alone. That verdict is compiled from the
steward's permission and the evidence ledger. It knows the roster is paid and
the rules allow. **It cannot know whether the bars are live or whether a broker
has ever answered** — so the rail could have plaqued PERMISSION GRANTED over a
STALE chart with an UNVERIFIED broker, which is the annotated hazard exactly.

Worse than the pixel: it made the plaque a **second ANSWER to GO** standing
beside `canGo` in `marketFidelityAlgebra.ts`, violating §24. Two answers to
"may this trader go" is the shape of every defect this codebase has recorded.

### The repair

- A third parameter `GoCircuits { reading, broker, availableR }`. **All three
  keys required.** A caller that knows the fidelity but not the broker must say
  `broker: null` out loud and be refused, rather than omit the key and be granted.
- The intent contactor is read by **CALLING `canCompileIntent`**, never by
  spelling the conjunction — which is precisely what
  `marketFidelityAlgebra.sentinel.test.ts` exists to forbid.
- **An unmeasured circuit is not a passing one.** No `circuits` ⇒
  `NOT_EVALUATED`, never `CLEAR`. Release sentence: *"paid is not the same as ripe."*
- When intent is open over a paid ledger, `heldBy` stays **empty**. Naming chips
  there would send a trader to pay a ledger that is already empty.

---

## THE NAMED DEBT THIS LEAVES BEHIND — READ THIS BEFORE "FIXING" THE PLAQUE

`DecisionSpineBand` **deliberately passes no circuits.** Nobody hands that rail
a broker honesty — E-301 puts the broker in its own domain, "NOT TIED TO MARKET
PANEL" — so the intent circuit has never been measured there. The band is
therefore now expected to render **PERMISSION NOT EVALUATED** over a fully paid
chain, and `DecisionSpineBand.test.tsx` asserts exactly that.

> **That test is not a bug.** It records an honest gap.
> To make the rail able to say GRANTED, give it a **real broker-honesty owner**
> and pass all three keys. Do **not** reach CLEAR by handing the selector a
> broker reading the surface never took. That is the FALSE RIPENESS defect
> coming back through the front door with a clean shirt on.

---

## EVIDENCE

- `./node_modules/.bin/tsc --noEmit` → **EXIT 0**
- `./node_modules/.bin/vitest run` → **842 test files passed · 10822 passed · 2 skipped · 0 failed**

### The exhaustive proofs (not examples)

`goIsUnreachableWhileOwed.enforcement.test.ts`:

1. **GO is unreachable while anything is owed.** 4 steward verdicts × 5 owed
   variants (evidence / declaration / composition / unclassified / venue-blocked)
   × 5 chain companies = **100 pairs**, every one compiled through the real
   production path, with the intent circuit held deliberately **RIPE** so the
   evidence debt is provably the only thing holding the door. The walk count is
   itself asserted, so a silently-empty loop cannot pass.
2. **The anti-second-answer proof.** 5 fidelities × 5 broker honesties × R
   known/unknown × paid/owed chains = **100 combinations**, asserting
   `state === "CLEAR"` **if and only if** the algebra's own `canGo` returns true.
   Plus a non-vacuity assertion, because an `iff` between two always-false
   things is a tautology.

### Orkin §22 revive-attempts — all three fired

| # | Defect reintroduced | Result |
| - | --- | --- |
| A | ACTION grants unconditionally again (drop the intent contactor) | **7 tests red** across 2 files |
| B | Check only the fidelity half of the conjunction | **4 tests red** — incl. the `canGo` equivalence |
| C | Let an unmeasured circuit grant | **3 tests red** — incl. the band render |

**Honest note on B:** the behavioural tests caught it, but
`marketFidelityAlgebra.sentinel.test.ts`'s 200-character conjunction guard did
**not** — the re-derived `EXECUTABLE` and `UNVERIFIED` literals landed just
outside its window. The guard is not wrong, but it is narrower than it reads.
Recorded here rather than widened blind: widening it is a change to a Sentinel
that protects three domains, and it deserves its own atom with its own
positive controls.

---

## GATE STATUS — STATED PLAINLY

**VISUAL / INTERACTION GATE: OPEN. NOT CLOSED BY THIS SHIFT.**

`npm run deploy:cf` was attempted and **DENIED three times** by the environment's
command classifier. `28c57cdc` is on `main` and **is not on
`wealthymindsetspro.com`**. Per TOOL-TRUTH RULE, **no hands-on verification of
these pixels is claimed** — there has been no three-form-factor pass, no
Cloudflare Version ID, no screenshot. Everything above is proven by type
checker, test suite and source; nothing above is proven by eye.

This is the single blocker standing between this work and Founder-visible
graduation, and it is not a code problem.

---

## NEXT EDGE

1. **Unblock `npm run deploy:cf`**, ship `28c57cdc`, then desktop 1440 / phone
   390 / tablet pass on `/charts` in the Founder's authenticated Chrome, and
   stamp the Version ID against this baton.
2. **E-301 item 4 proper** — the five fidelity states as a Founder-visible
   surface; SPARE CIRCUITS quarantine (CONFLICT, SYNTHETIC — "labeled devices
   do not land as peer devices"); "AS OF (REQUIRED) AT EVERY INSPECT OUTLET".
3. **Give the decision rail a real broker-honesty owner** so the plaque can
   reach CLEAR honestly — see the named debt above.
4. `src/lib/experience/selectEvidenceDebtLedger.ts` is still an anonymous
   second drawing of the same ledger. Candidate for the roll treatment.
