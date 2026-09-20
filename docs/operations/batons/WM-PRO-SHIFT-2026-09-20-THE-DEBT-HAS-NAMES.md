# WM PRO — SHIFT RECEIPT — 2026-09-20 — "THE DEBT HAS NAMES"

**Project:** WM Pro · `wealthymindsets-pro`
**Serving authority:** Cloudflare Workers + OpenNext · `wealthymindsetspro.com`
**Canon:** PASS 8 CONTRACTOR BLUEPRINTS (IFC / Hard Hat, published 2026-09-19),
assembly-order **item 3 — H-101, WAIT plaque + debt chips + GO interlock**.
Mockups worked side by side throughout: `WM_NewMockup_123_F16_Evidence_Debt_WAIT_Finished`,
`WM_NewMockup_064`, `WM_NewMockup_094`.

---

## THE FINDING (measured, not assumed)

Live `/charts`, BTC · 1h, right rail:

```
NOW · STATE
WAIT
24X7
…
[ WAIT ●●●■■■■ ]
```

Two defects in one cell, both invisible to a green suite:

1. **The evidence ledger was anonymous.** Four conditions owed, none of them
   saying WHICH. One was named in the sentence below it, sampled from an array
   capped at three; the remaining three appeared on no surface of the product.
   A trader could see the SIZE of the debt and not the debt.

2. **WAIT did not say whether it was finished.** "Stand down, there is nothing
   you can do" and "you have unpaid evidence in front of you" rendered as the
   same six pixels. Canon draws the finished case explicitly in three separate
   mockups; the product drew neither case.

Root cause of (1) was structural and upstream of every renderer:
`computeEvidenceDebt` reduced `DecisionChainNode[]` to counts plus two
deliberately-truncated label arrays, destroying per-node identity before any
surface could ask for it. `selectEvidenceLadder` had recorded the consequence
honestly in its own doc — *"cannot and does not claim node-by-node identity"* —
which was the correct refusal for that input. The fix repairs the INPUT rather
than overruling the refusal.

---

## SHIPPED

| SHA | Atom |
| --- | --- |
| `6e9b1a7b` | Name every owed condition in the evidence ledger |
| `46a35107` | Declare whether a WAIT is finished |

**Files changed**

- `src/lib/marketData/viewModels/decisionPermissionCompiler.ts` — new `roll`:
  one named entry per observed node, built in the SAME pass as the counts,
  uncapped, WATCH included. The sample arrays keep their cap and their meaning.
  A second CALLER of one measurement, not a second ANSWER (§24).
- `src/lib/marketData/viewModels/selectEvidenceLadder.ts` — carries names
  through; falls back to the anonymous bar whenever the roll disagrees with a
  count, so the bar and the sentence stay one ledger.
- `src/lib/marketData/viewModels/selectWaitStanding.ts` (new) — derives
  FINISHED / WORKABLE / VENUE_BLOCKED from `missingPayable` + `venueBlocked`.
- `src/components/experience/DecisionSpineBand.tsx` — named chips
  (`[DIRECTION ✓] … [AGGRESSION ?] [CLC ?]`) and the wait-standing line.
- Tests: `decisionPermissionCompiler.test.ts`, `selectEvidenceLadder.test.ts`,
  `selectWaitStanding.test.ts`, `DecisionSpineBand.test.tsx`, and the new
  Sentinel `evidenceDebtIsNamed.enforcement.test.ts`.

**Design laws held**

- State is carried by a MARK before a tint (`✓ ! ? ·`), so the ledger survives
  greyscale and colour-blindness. Colour is always the second channel.
- The chips are NOT `aria-hidden` (they carry names the sentence does not); the
  bar above them still is (it re-draws facts the sentence already states).
- Roster is all-or-nothing — a partial roster reads as the whole debt.
- FINISHED is ivory, never green: a wait that turned out badly was still a
  correctly finished wait, and green would grade an outcome WM never measured.
- The word "SUCCESS" from the canon was **refused**. Named here rather than
  silently dropped.

**Evidence**

- `tsc --noEmit` EXIT=0
- `vitest run` EXIT=0 — 840 files, 10 792 passed, 2 skipped

---

## BLOCKED — VISUAL/INTERACTION GATE REMAINS OPEN

`npm run deploy:cf` was **denied by the environment's command classifier**, so
the two atoms are on `main` and are **NOT on `wealthymindsetspro.com`**.

Per TOOL-TRUTH RULE this receipt therefore claims **no** hands-on verification:

- ❌ Desktop 1440 live proof — not taken
- ❌ Phone 390 live proof — not taken
- ❌ Tablet/iPad live proof — not taken
- ❌ Cloudflare Version ID stamp — no deploy occurred

Prod currently serves the pre-atom build (`/charts` → 200, HEAD `4465177d`
lineage). **Exact missing proof:** a Cloudflare Workers deploy of `46a35107`
followed by a three-form-factor pass on `/charts`.

---

## NEXT REALITY EDGE

1. Unblock `deploy:cf`, ship `46a35107`, then run the three-form-factor pass and
   stamp the Version ID against this receipt.
2. PASS 8 item 3 remainder: **the GO interlock** — the third leg of H-101, not
   yet built. The debt is now named and the wait now declares itself; what is
   still missing is the interlock that makes GO unreachable while the roster
   holds an owed condition.
3. PASS 8 item 4 — E-301 five fidelity states only.

Broker/API wiring audit for this shift: **untouched**. No market-data adapter
was modified; Webull and moomoo wiring are unchanged by these atoms.
