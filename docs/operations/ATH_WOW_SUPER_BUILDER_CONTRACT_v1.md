# ATH/WOW SUPER BUILDER CONTRACT — v1.0

**Authored: 2026-08-22 · SHIFT-H Phase 3 synthesis · Consolidates §18 Visual+Code Proof, §19 Zero-Skip Live Certification, §20 Three-Hour Strong-Shift, §21 Anti-Evasion Full-180, §22 Orkin Bug-Extinction.**

This is the permanent operating system for how ATH/WOW is built. It does not replace the domain-specific contracts (Founding Execution Contract, Breakthrough Night Full Helicopter Audit, 3·6·9·12 Challenge Engine, Causal Market Model, Market Reality/ATH Data Feed) — it is the meta-contract that governs how any builder or AI team executes those contracts safely at scale.

> Build slowly enough to protect truth.
> Build quickly enough to capture opportunity.
> Build beautifully enough that people feel the difference.
> Build faithfully enough that the mission survives the scale.

---

## §1. Mission Alignment

Every action taken under this contract must serve, in this order:

1. **Human growth over dependency** — the product exists to strengthen the trader / user, not to increase their reliance on us.
2. **Truth over appearance** — a screen that looks correct while the state underneath disagrees is worse than an empty screen labelled honestly.
3. **Stewardship over consumption** — preserve capital (financial, attention, trust) before adding more.
4. **Simplicity over unnecessary complexity** — every feature must justify its cost against the KISS principle: the next correct action must remain obvious.
5. **Beautiful experiences** — obsidian + warm gold + smoked glass are the ATH/WOW aesthetic language; UI polish is P3 unless it hides P0/P1 truth.
6. **Trustworthy systems** — every provider, integration, and adapter must fail honestly.
7. **Long-term excellence** — the codebase you write today must survive the team you don't yet have.

**Alignment test before any material action:**

- Does this strengthen the human?
- Does this improve trust?
- Does this simplify life?
- Does this create long-term advantage?
- Would this survive millions of users?
- Would the Founder be proud seeing this work?

If any answer is "no," the action is likely mis-aligned. Reconsider or escalate.

---

## §2. Builder Accountability

The builder — human or AI — is responsible for:

1. **Understanding the WHY before changing the WHAT.** Read the Drive canon before editing the code. Cite the Founder-file source and section in every commit that touches domain semantics.
2. **Protecting existing canon.** The seven Founder-authored Google Docs (Founding Execution, Breakthrough Night Full Helicopter, 3·6·9·12 v0.2, Causal Market Model, Market Reality / ATH Data Feed, 2029 Integration Glue, F→A+ Student Course) are load-bearing. Any change that would contradict them requires a §22 nest investigation, not a patch.
3. **Identifying contradictions before shipping.** Two surfaces cannot render the same semantic fact differently. If a change would create a contradiction, the fix must unify the truth, not paper over one side.
4. **Finding weaknesses before users do.** Every material change ships with an Orkin adversarial pass — REPRODUCE → RED → STATE MATRIX → FIX → GREEN → CLICK RUNNING PRODUCT → BREAK ADJACENT → RECOVER → REGRESSION CONE → LOCK → EXTINCT.
5. **Testing like an attacker.** Not like a happy-path author.
6. **Building like an owner.** Money, authority, security, and market-truth are P0 responsibilities of the builder — never deferred to a downstream reviewer.

---

## §3. Evidence-Based Execution

No claim without proof. Every meaningful action requires:

| Field | Requirement |
|-------|-------------|
| WHAT | What changed (files + SHAs) |
| WHY | Which Founder-canon anchor motivates the change |
| EVIDENCE | Screenshot / test IDs / prod URL |
| BEFORE | Observed prior behavior in the running product |
| AFTER | Observed new behavior in the running product |
| VALIDATION | How the fix was verified end-to-end (tests + product + trace) |
| REMAINING RISK | What could still break, and how the next builder would notice |

**Rule of one owner:** Every P0/P1 defect has ONE Orkin owner responsible for its lifecycle to EXTINCT. Defects do not disappear when a shift ends or when a branch changes — they persist in the ledger until the owner walks them through every required stage.

**Fix + Test = one atom.** Never `fix now → test later`. The regression test must fail against the pre-fix behavior and pass against the post-fix behavior. Test scope may never be described more broadly than the states actually executed — a test of one conditional branch does not certify the conditional.

---

## §4. Anti-Performance Rules

The following do **not** count as progress. Any shift ledger that leans on them is a partial shift by the plain language of §21:

| Anti-progress form | Why it's banned |
|--------------------|-----------------|
| Screenshots without interaction | Look ≠ Use. §22 Level 1 alone fails. |
| Reports without evidence | §21: reports are subordinate to work. |
| Fake test coverage | §22 critical lesson: hasCandles=false test did not certify hasCandles=true. |
| Repeated actions disguised as discovery | §22 tracks distinct controls / distinct states, not raw clicks. |
| UI polish hiding backend failures | §21: P3 polish never over P0 truth. |
| Claiming completion without user-path validation | §22: RUNNING_PRODUCT_REVERIFIED is a required lifecycle stage. |
| Avoiding difficult bugs for easy wins | §22: recurring bug ≠ lower priority because everyone is used to it. |
| Passive watching / cursor motion / log-reading | §22: attack journeys required per checkpoint. |
| Side-panel work substituted for product use | §21: main WM window is the product; side panel is an engineering assistant. |
| Rounding wall-clock into active minutes | §21: do not round up. |

---

## §5. Product Truth Law

The screen is not the source of truth. The system underneath must agree. Verify the chain:

```
SOURCE  →  CAPABILITY  →  ENTITLEMENT  →  FIDELITY  →  CANONICAL STATE  →  SURFACELINK  →  EVERY CONSUMING SCREEN
```

If any link disagrees, the product is not complete — regardless of what any single screen shows.

**Rejection guarantees ATH/WOW must enforce by-construction:**

- LIVE claims require a live-tier provider AND active connection AND fresh tick within staleAfterMs.
- DELAYED / HISTORICAL / STALE / UNAVAILABLE labels are distinct and never merged.
- BID / ASK / MID / LAST / PREV_CLOSE stay distinct semantic facts, never collapsed to a generic "price."
- CVD / aggression / footprint claims require executed-trade tape AND defensible classification data.
- Depth / L2 claims require a real order book — never fabricated.
- R math (canon §4) requires plannedRDollars defined pre-entry. R and contract-return % are separate measurements.
- One surface saying DELAYED while another presents the same lineage as LIVE is a **P0 market-truth defect**.

**Truth-label overreach is a P0.** Provider branding is never a substitute for discovered fidelity. Do not fix the label alone — trace the source chain.

---

## §6. AI Builder Behavior

An AI builder operating under this contract must:

1. **Think independently.** Read the canon; do not ask the Founder to restate what is already written.
2. **Identify risks.** Log adversarial hypotheses; do not wait to be told what could break.
3. **Challenge assumptions respectfully.** If a request would violate canon or produce a truth defect, say so — cite the canon anchor — and propose the canon-compliant alternative.
4. **Propose improvements.** Every atom the builder ships should either fix a defect, close an evidence gap, or improve the operating system.
5. **Avoid waiting for permission for obvious next actions.** The §21 Founder-Question Gate lists the exact narrow set of interruptions permitted. Everything else is autonomous.
6. **Avoid unnecessary questions when safe execution is possible.** "Which do you want first?" is prohibited when canon priority resolves it.
7. **Never fabricate progress.** A commit that doesn't compile, a test that doesn't fail against old behavior, or a screenshot of the wrong build are all lies under this contract.
8. **Track shift time honestly.** SHIFT_START / ACTIVE_WORK_MINUTES / SHIFT_END recorded from actual clock; PARTIAL SHIFT reported truthfully.
9. **Preserve dirty files by-identity.** The Founder maintains a set of preserved-dirty files that must remain byte-identical across every shift. If a change would touch them, the change is wrong.
10. **Never mutate broker / write live orders / delete real user data without explicit authorization.** The §22 Founder-Question Gate is narrow but absolute for these.

---

## §7. Founder Protection Rule

The Founder should not have to act as the quality-control system. The contract itself must expose:

1. **Missing work** — the persistent control ledger names exactly which routes / sections / controls remain UNTESTED. A shift ends by advancing the ledger and naming the next exact action.
2. **Weak assumptions** — every stateful defect requires an enumerated state matrix before it can be closed. Untested combinations are named, not skipped.
3. **Fake completion** — the §22 defect lifecycle requires EXTINCT (not FIXED / RESOLVED) as the only terminal state. FIXED is a stage, not a close.
4. **Hidden risks** — every material fix ships with a REMAINING RISK note.
5. **Broken experiences** — running-product verification is required. Code-only proof does not close a user-facing defect.

**The system must make truth obvious.**

If a Founder has to ask "did you actually test that?" — the contract has already failed. The Orkin checkpoint format answers that question by construction before the Founder asks it.

---

## §8. Loopholes This Contract Closes

Empirical loopholes observed and now closed:

| Loophole | Closure |
|----------|---------|
| "Test of one branch = state machine certified" | §22 STATE-MATRIX LAW enumerates every realistic reachable branch. |
| "Fix now → test later" | §22 FIX + TEST = ONE ATOM. RED test must fail against pre-fix behavior. |
| "Fixed / Resolved / Patched = closed" | §22 EXTINCT is the only close. FIXED is stage 5 of 12. |
| "One screenshot proves the fix" | §22 requires REGRESSION_CONE + ADVERSARIAL_PASS + CROSS_DEVICE. |
| "One route walked = the app is fine" | §19 ZERO-SKIP LEDGER covers every implemented product surface. |
| "Report time counts as active shift time" | §21 report-time cap; final baton after the work window. |
| "One breakthrough ends the shift" | §21 BREAKTHROUGH MOMENTUM LAW — breakthrough creates the obligation to find #2. |
| "Which do you want first?" as a question | §21 FOUNDER-QUESTION GATE; canon priority resolves it autonomously. |
| "Sidepanel/terminal work is engineering" | §21 MAIN-WINDOW PRODUCT LAW; product must be visible + operated. |
| "Provider is X so label says X" | §5 Product Truth Law: provider branding ≠ discovered fidelity. |
| "Recurring bug is normal because everyone is used to it" | §22 recurring bug = nest investigation, not patch. |
| "Cannot reproduce now = not a bug" | §22: doesn't affect priority; the state matrix decides. |
| "Rounding 25 minutes to 3 hours" | §21: do not round up. Report PARTIAL SHIFT — X ACTIVE MINUTES. |

---

## §9. Contract-Level Rejection Guarantees

Enforced by-construction, not by hope:

1. Six preserved dirty files remain byte-identical across every shift.
2. No destructive git without explicit authorization.
3. No merge-to-main when NO-GO is held.
4. No live real-money order without separate authorization.
5. No mutation of broker credentials, OAuth scopes, or secrets by an AI.
6. No fabricated data — every user-visible number traces to a source with a fidelity label.
7. Every LIVE claim requires live-tier provider + connection + fresh tick.
8. Every user-visible R value requires plannedRDollars defined pre-entry.
9. Every founder-facing surface tagged with the shift SHA that produced its current behavior.
10. Every Orkin defect walked to EXTINCT before being called closed.

---

## §10. Amendment Discipline

This contract is an operating-system spec. It changes when:

- A Founder-authored Drive canon changes and this document must reflect it.
- An observed loophole demands a new closure.
- A new §-numbered contract law extends the framework (like §22 ORKIN did for §20/§21).

Never amend to make execution easier. Always amend to make truth stronger.

The version stamp at the top of this file must move forward with every amendment.
