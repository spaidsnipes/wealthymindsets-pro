# Ledger — Job-Mode Inference (2026-08-25)

**Session:** Five-Hour Megazord Finish Shift (continuous execution).
**Canon:** BUILD → TEST → BREAK → VERIFY → COMMIT → CONTINUE. Transformation
thesis: "The interface changes its emphasis around the human's current job."
Human authority: "WM does not gate the action" — the human's manual selection
is always authoritative.

## Starting SHA

`e405f2d` (P8 Receipt + Job-Emphasis ledger).

## Ending SHA

`cbe3090` (job-mode inference).

## Commit created

**`cbe3090` — Job-mode inference.**
- New pure `inferJobMode(signals)` infers the human's most likely current job
  from concrete, defensible decision state, in strict priority:
  1. open position (ENTER_* without outcome) → MANAGE (HIGH)
  2. closed-but-unreviewed decision → REVIEW (HIGH)
  3. right-of-way granted (ACTION) → EXECUTE (MEDIUM)
  4. right-of-way withheld / cautioned (WAIT/CAUTION) → WAIT (MEDIUM)
  5. market state resolving, no verdict → OBSERVE (LOW)
  6. nothing resolved → PREP (LOW, honest default)
  Each result carries a one-line reason and a confidence.
- Wired into `/command-deck` as a read-only suggestion chip that appears ONLY
  when the inferred job differs from the human's current selection. Clicking
  it accepts the suggestion (calls setMode); WM NEVER auto-switches the job.
- Signals derive from records the deck already holds (open ENTER_* without
  outcome; outcome without review) + the compiled right-of-way verdict +
  passport resolved-count. No new truth producer.
- 9 deterministic tests. All pass.

## Subsystems touched

`src/lib/experience/` (inferJobMode + test), `src/app/command-deck/page.tsx`
(import, inference memo, suggestion-chip render, setMode wiring).

## Proof

- `tsc --noEmit --skipLibCheck` — clean.
- `vitest run` — 56/56 green in the experience dir (6 files).
- `next build` — clean.
- Deploy: `npm run deploy:cf` exit 0. Prod `/login` = 200.
- **Production VERIFIED LIVE (desktop) via the Founder's authenticated Chrome**
  (no credentials entered):
  - On the OBSERVE deck (decision verdict = WAIT, no sealed records), the chip
    rendered "SUGGESTED JOB → WAIT · Right-of-way is withheld — hold the thesis
    and wait." — correct, because the inferred job (WAIT) differed from the
    current mode (OBSERVE).
  - Clicked the chip: the mode switched to WAIT (caption "HOLD THE THESIS;
    WAIT FOR PERMISSION.", routed question updated) and the chip VANISHED
    (inferred == current). Proved accept-on-click works and WM only switches
    on explicit human action.
  - Mode restored to OBSERVE after verification.

## DB / Supabase state

No migrations applied. No secrets touched. Pure selector + read-only UI nudge.

## Founder-visible result

The operating system now reads its own decision state to help the human
identify which job they're in — closing the emphasis loop — while never
seizing control of the job selection. Suggest, never gate.

## Remaining limitations

- **Mobile 390px screenshot NOT VERIFIED THIS SESSION** (task #6 still open).
- Inference is intentionally conservative (six concrete branches); it does not
  yet consider self-reported focus/fatigue or session clock. A future atom
  could enrich signals, still suggestion-only.

## Anything now duplicate

Nothing. `inferJobMode` is the only job-inference selector; it composes with
`selectDeckEmphasis` (which consumes the *committed* mode) without overlap.

## Next real dependency

Optional: physically reorder the decision column by `selectDeckEmphasis.lead`
for the sharpest emphasis; or enrich inference signals (session clock,
self-reported state) — always suggestion-only, human override authoritative.
