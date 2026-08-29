# DIRTY FILE PROVENANCE REGISTRY · 2026-08-29

**Authority:** Continuity Enforcement Addendum §VI (`DIRTY-FILE RESOLUTION LAW`) + WM Pro Founding Contract §BINDING FULL-SHIFT DEFINITION (2026-08-28).
**Purpose:** register every uncommitted file at `origin/main = 8b4cc0b` (shift-V close) so no inherited work sits as permanent mystery state.
**Rule this document honors:** *"Preserve first → understand → finish safely."* No file below was mutated to produce this registry.

---

## Governing shift context

`origin/main` at the time of this registry:
```
8b4cc0b docs(baton): SHIFT-V — Phase 2 completion + Phase 3 seed + 3 canon single-writers
```

Active remote-push baton (Founding Contract tail): **WM-ALPACA-CRYPTO-AUTH-P0-20260829** — STATUS: VERIFIED SUBSTANTIAL DELTA; RELEASE NO-GO. Governs `origin/alpaca-crypto-auth-p0-20260829 @ 7cd03a4`. Its four gates (SHA-annotated preview activation, deployed-artifact readback, controlled desktop/iPad/iPhone runtime evidence, PR #25 reconciliation) cannot be closed from this seat — requires Founder's controlled browser. Contract's AFTER clause names the fallback: *"pivot to the collision-safe Pine single-owner truth atom in a clean seat."*

---

## Registry — 6 dirty files at shift open

### 1 · `src/lib/pine/interpreter.test.ts` — **ADOPT (Founder-named atom)**

- **SHA-256 (working tree):** `90dffb2a192807e5e6abd58f270134a28c1f613c9b3e45e6f29dc2a8b6188f56`
- **Shape:** 36 lines, 2 tests.
- **What the change contains:** vitest coverage for `interpretPine` + `request.security` MTF (multi-timeframe) evaluation. First test locks the higher-timeframe close-mapping invariant (`"5"` requested → each source bar sees the enclosing 5-minute close). Second test locks the same-timeframe passthrough (`"1"` requested at 1m data → identity).
- **Provenance:** parallel Pine-interpreter thread — sibling to `src/lib/pine/interpreter.ts` (1132 lines, tracked, committed).
- **Belongs to active bounded task:** yes — the Founder-named Pine single-owner truth atom (Founding Contract tail, WM-ALPACA-CRYPTO-AUTH-P0 baton AFTER clause).
- **Collides with current main:** no — pure additive test file. Runs against the tracked `interpreter.ts` unchanged.
- **Runtime verdict:** ✅ 2/2 PASS against current `src/lib/pine/interpreter.ts` (verified 2026-08-29T14:15Z, `./node_modules/.bin/vitest run src/lib/pine/interpreter.test.ts`).
- **Complete:** yes.
- **Disposition:** **ADOPT NOW.** Founder-named collision-safe atom. Adopting the test as-written locks the current interpreter's MTF behaviour without touching the interpreter source. Reversal cost = one revert commit.

### 2 · `src/lib/learningGenome/learningGenomeScoreScale.ts` + `.test.ts`

- **SHA-256 (source):** `c63b29aeed9529df030ab7898b8203558c13223d2d01dcd051583ad796653830` (22 lines)
- **SHA-256 (test):** `62f5d19de142d1d486cda6715a12634535ddc3f89d3a798339babbffd1789203` (18 lines)
- **What the change contains:** `normalizeLearningDimensionScore(key, rawScore)` — pure scale converter mapping each Learning Genome dimension to a shared 0..1 comparison scale. Documented canonical law: ratio dimensions clamp; TRANSFER maps `0R→0, +2R→1` with floor/cap.
- **Provenance:** parallel Learning Genome thread — sibling to `src/lib/learningGenome/selectLearningGenome.ts` (tracked).
- **Belongs to active bounded task:** UNCLEAR — no consumer yet imports it. Likely a scaffold for the Personal Edge Lab / Genome-composite work.
- **Collides with current main:** no.
- **Runtime verdict:** ✅ tests PASS in isolation.
- **Complete:** the primitive is coherent; the test covers it; but no consumer wires it. Adopting now creates dormant coverage that the Sentinel Legacy Data + Surface Cutover Law prefers to avoid (single-owner rule).
- **Disposition:** **HOLD** pending a Learning Genome consumer that would wire it. Registered here so it isn't mystery WIP.

### 3 · `src/lib/marketData/heroTruthChronology.ts` + `.test.ts`

- **SHA-256 (source):** `1aa11b4598e83ee9c0753eee3e34c01b47606e9ad9adc991dbb54195fa265e34` (60 lines)
- **SHA-256 (test):** `8df755c103191fd416ebef7bdd924cde9dd280f3cfbd73e9e28261f022279cf7` (85 lines)
- **What the change contains:** `heroPriceChronology(state)` — fail-closed presentation adapter for the Command Deck hero. Emits one of three shapes: `OBSERVED_AGE` (LIVE packet with valid observed→available→captured sequence), `UNVERIFIED` (transport age exists but no market-observation proof), `MISSING` (no snapshot). Explicit refusal to lie by treating server receipt time as market observation time.
- **Provenance:** parallel Market Truth / Hero display thread — direct downstream of the Founder canon *"a transport/server receipt timestamp is not proof of market observation time."*
- **Belongs to active bounded task:** UNCLEAR — no HeroTruth consumer imports it yet.
- **Collides with current main:** no.
- **Runtime verdict:** ✅ tests PASS in isolation.
- **Complete:** primitive is coherent; test covers 3 shapes plus the LIVE-only rule. But `src/components/command-deck/HeroTruth.tsx` doesn't import it. Adopting without wiring = dormant.
- **Disposition:** **HOLD** pending HeroTruth wire.

### 4 · `src/lib/traderMemory/adapters/useJournalSnapshots.test.ts`

- **SHA-256:** `b35081427b6e68d70db60a48878bfb198cb21f9aefa8e2c4a10a993b3ed098ce` (75 lines)
- **What the change contains:** vitest coverage for `readJournalSnapshots` — verifies the legacy-key migration path (`LEGACY_JOURNAL_STORAGE_KEY` → `JOURNAL_STORAGE_KEY`).
- **Provenance:** parallel Journal Storage thread — sibling to `src/lib/traderMemory/adapters/useJournalSnapshots.ts` (tracked).
- **Belongs to active bounded task:** UNCLEAR — locks behaviour already in the tracked hook.
- **Collides with current main:** no.
- **Runtime verdict:** to be verified in a Journal-owner shift; passes in isolation on current tree.
- **Complete:** yes as a test file, but the owning shift is not this Pine seat.
- **Disposition:** **HOLD** pending owner assignment.

### 5 · `CLAUDE.md` + `AGENTS.md`

- **What the change contains:** next-generated agent-guide files. Per the block written into `AGENTS.md` by `next dev`: *"This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean."*
- **Provenance:** Next.js 16.3 tooling.
- **Disposition:** **ADOPT NOW.** Committing per Next's explicit instruction stops the perpetual dirty-status noise.

### 6 · `next-env.d.ts` (modified) + `docs/operations/dispatches/…` + `docs/operations/handoffs/micah/…`

- `next-env.d.ts`: Next-generated type declaration. Auto-regenerated on build.
- Two `docs/operations/…` untracked markdown files: Micah handoffs from 2026-08-07. Older than the shift baton; owner is the Micah experience/a11y thread.
- **Disposition:** **HOLD** — belong to prior shifts' owners; not this Pine seat.

---

## Actions taken by this registry

1. **ADOPT `src/lib/pine/interpreter.test.ts`** — Founder-named collision-safe Pine single-owner truth atom. Runtime verdict green against tracked interpreter. Registry above records the exact SHA at adoption.
2. **ADOPT `CLAUDE.md` + `AGENTS.md`** — Next-generated per explicit tooling instruction.
3. **HOLD** items 2, 3, 4, 6 — registered here so no work is mystery, but not adopted in this seat; belongs to the appropriate owning thread's shift.
