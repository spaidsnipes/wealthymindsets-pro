# DIRTY FILE PROVENANCE REGISTRY · 2026-08-17

**Authority:** Continuity Enforcement Addendum §VI (`DIRTY-FILE RESOLUTION LAW`).
**Purpose:** establish provenance for every uncommitted file at `origin/main = 77b88c0`, so that inherited work does not sit as permanent mystery state.
**Rule this document honors:** *"Preserve first → understand → finish safely."* No file below was mutated, reset, cleaned, or overwritten to produce this registry — every hash below was measured against the on-disk file at issue time.

---

## Registry

Six files were dirty at shift start. All six form a single coherent work-unit that extends the already-committed `08796aa feat(steward): per-rule breakdown on Command Deck — every state is explainable`. Sentinel's NV-01 V1.0 baton bound their hashes and explicitly excluded them from the four-path Nectar manifest; that binding is honored here.

### 1 · `src/app/profile/page.tsx`

- **SHA-256 (working tree):** `981d293cc9fac5a966045030501a86fba3fb896e97edc7d99ba7ea775b007e96`
- **Diff shape:** +1 / −4 lines.
- **What the change contains:** replaces an inline `mergeSnapshots(useDecisionMemory(...), useJournalSnapshots(...))` invocation inside a JSX render callback with a hoisted `growthDecisions` variable computed higher in the component. Pure hooks-order hygiene follow-through — the exact pattern the parallel team has been fixing under the `React #310 hooks-in-JSX` audit.
- **Owner:** parallel Command Deck / Growth-tab team (same author lineage as `08796aa`).
- **Valid change:** yes — it removes an unstable hook call site that would fire `useSyncExternalStore` inside a JSX branch.
- **Belongs to active bounded task:** yes — the Growth-tab PersonalEdge wiring that also touches ScoreExplainer.tsx below.
- **Collides with current main:** no. My Nectar shift did not touch `src/app/profile`.
- **Complete:** appears functionally complete (the diff is a single, small, mechanically-obvious edit).
- **What is required to finish it:** commit under the owning task's identity + a targeted regression test that renders the Growth-tab card without triggering React #310.
- **Disposition:** **COMPLETE UNDER EXISTING OWNER.**

### 2 · `src/components/chart/DecisionChainPanel.tsx`

- **SHA-256:** `64cb9610be98ad6b857e9a6b5d9088be4927ff0b8f76e702d26c95ce8935c110`
- **Diff shape:** +37 lines.
- **What the change contains:** renders a new *structured-hints strip* under each `DecisionChainNode`'s narrative when the selector supplies `node.hints[]` + `node.hintTones[]`. Tone-colored chips (missing / warn / watch). Silent when hints are unset. Consumes the selector API added in `selectDecisionChain.ts` below.
- **Owner:** same parallel team; direct downstream consumer of the selector change.
- **Valid change:** yes — implements the founder-canon "every state must be explainable" mandate at panel-scope.
- **Belongs to active bounded task:** yes — this is the second half of the *Command Deck DLAR explainability* thread whose first half shipped as `08796aa`.
- **Collides with current main:** no. My Nectar shift never touched `DecisionChainPanel`.
- **Complete:** yes — consumer-side implementation is present and coherent.
- **What is required to finish it:** commit alongside the selector + test as one atomic unit; then live-verify on `/command-deck` at desktop / iPad / phone.
- **Disposition:** **COMPLETE UNDER EXISTING OWNER.**

### 3 · `src/components/profile/ScoreExplainer.tsx`

- **SHA-256:** `f4e96c7a5e0c5bfce5f1b2150e9caccd50b42aca7e948ba150baba95d628b570`
- **Diff shape:** +57 / −2 lines.
- **What the change contains:** adds a "Next practice" prescription section derived purely from `PersonalEdgeVM` (watch / strongest / sample-threshold). Priority is documented in-line as founder canon: (1) isolated losing context → *practice avoiding*; (2) isolated winning context → *practice repeating*; (3) below sample threshold → *reach threshold*. Silent when `resolution=UNKNOWN` AND `totalDecisions=0` — no prescription for a brand-new trader.
- **Owner:** same parallel team; sibling to the profile/page.tsx change (they wire the same VM in the same tab).
- **Valid change:** yes — no fabrication, resolution is honestly `UNKNOWN` when there is no evidence.
- **Belongs to active bounded task:** yes — Growth-tab PersonalEdge closure.
- **Collides with current main:** no.
- **Complete:** yes — component-level implementation is present.
- **What is required to finish it:** commit alongside profile/page.tsx; targeted responsive check that "Next practice" copy does not overflow on 390 phone width.
- **Disposition:** **COMPLETE UNDER EXISTING OWNER.**

### 4 · `src/lib/marketData/viewModels/selectDecisionChain.ts`

- **SHA-256:** `de79209bc78aa21b3d8d054b54f4e148fbb2ba233f435ff33fbd4f81396c6f2c`
- **Diff shape:** +68 / −31 lines.
- **What the change contains:**
  1. Adds `hints?: readonly string[]` and `hintTones?: readonly ("missing"|"warn"|"watch")[]` to the `DecisionChainNode` public shape.
  2. Rewrites the `Available R` node inside `selectDecisionChain` as an IIFE that consumes `availableR.missingInputs[]` and `availableR.warnings[]` and emits paired `hints[]` + `hintTones[]` so DecisionChainPanel can render them.
- **Owner:** same parallel team; upstream source of the panel change (#2 above).
- **Valid change:** yes — the shape is additive and optional. No behavior change for existing consumers.
- **Belongs to active bounded task:** yes — the "every state must be explainable" thread.
- **Collides with current main:** no — my Nectar shift added no consumer of `DecisionChainNode`.
- **Complete:** yes — the IIFE is production-shape and the extra fields are optional.
- **What is required to finish it:** commit alongside the panel + test; verify tsc across every existing DecisionChainNode consumer.
- **Disposition:** **COMPLETE UNDER EXISTING OWNER.**

### 5 · `src/lib/marketData/viewModels/__tests__/selectDecisionChain.test.ts`

- **SHA-256:** `0a4251c77170e4ae8696c975fa2fe2c35375bdefe1fb0295490eb4476aff4a30`
- **Diff shape:** +74 lines.
- **What the change contains:** regression coverage for the new `hints[]` / `hintTones[]` on the `Available R` node. Tests the missing-input → hint mapping, warning → hint mapping, and empty-case silence.
- **Owner:** same parallel team.
- **Valid change:** yes — pure test additions; no existing test is mutated.
- **Belongs to active bounded task:** yes.
- **Collides with current main:** no.
- **Complete:** yes.
- **What is required to finish it:** commit alongside items #2 + #4 in one atomic unit.
- **Disposition:** **COMPLETE UNDER EXISTING OWNER.**

### 6 · `tsconfig.tsbuildinfo`

- **SHA-256:** `9d1fc3066d07814ba962d596f88f3aae468a4c99e95e6de50962e22764fabab4`
- **Diff shape:** binary/JSON build cache; regenerates on every `tsc` invocation.
- **What the change contains:** incremental TypeScript build cache — the artifact TypeScript writes to avoid re-checking untouched files.
- **Owner:** environment / tooling. Not authored.
- **Valid change:** N/A — cache artifact.
- **Belongs to active bounded task:** no — never should be committed. `.gitignore` audit follow-up if it isn't already ignored.
- **Collides with current main:** no.
- **Disposition:** **PRESERVE — EXTERNAL BLOCKER (tooling artifact).** Also flag: if `tsconfig.tsbuildinfo` is NOT currently gitignored, a separate one-line `.gitignore` correction is owed. This registry does not carry out that correction.

---

## Composite disposition

Items 1 through 5 form ONE atomic unit — the "Command Deck DLAR explainability" thread continuing `08796aa`. They should be committed together, under the owning team's authorship, with the following minimum acceptance:

1. `./node_modules/.bin/tsc --noEmit` clean.
2. Full vitest suite passes (currently 556/556 on `origin/main`; the +74 new tests in item 5 are expected to raise this).
3. `/command-deck` renders on desktop / iPad / phone with the hints chips visible under `Available R` when `missingInputs` or `warnings` are present.
4. `/profile` Growth tab renders "Next practice" prescription when `PersonalEdgeVM` supplies watch / strongest, and stays silent when `resolution=UNKNOWN` AND `totalDecisions=0`.

Item 6 stays on disk as a cache artifact and is a `.gitignore` follow-up if not already ignored.

None of the six was committed as part of the 2026-08-16 → 08-17 Nectar shift. All six remain outside the NV-01 four-path manifest per Sentinel's V1.0 binding, and remain outside the NV-01 V1.0.1 delta spec.

---

## What this registry deliberately does NOT do

- Does not commit any of the six files.
- Does not modify any of the six files.
- Does not attempt to reconstruct the parallel team's commit message.
- Does not merge the parallel team's work under this shift's authorship.
- Does not treat items 1–5 as ORPHAN — they have a live owner, an active task, and a clear next action.
- Does not treat items 1–5 as ABANDONED — they are 90-95% complete, which per §II makes them *more* valuable, not less.

The correct next action per §II + §XIV is: the parallel Command Deck team should adopt items 1–5 (already in their tree) and land them as one commit. This registry hands the baton back to them cleanly.
