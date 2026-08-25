# Ledger — Job-Suggestion Confidence Scaling (2026-08-25)

**Session:** Five-Hour Megazord Finish Shift (continuous execution).
**Canon:** BUILD → TEST → BREAK → VERIFY → COMMIT → CONTINUE. Doctrine:
"suggest, never gate" / "WM does not gate the action." This atom refines the
suggestion so a weak guess is presented weakly — the OS never nags the human off
the job they chose on a low-confidence hunch.

## Starting SHA

`949b3c8` (layout-rationale-caption ledger).

## Ending SHA

`7ef8925` (job-suggestion confidence scaling).

## Commit created

**`7ef8925` — Scale the job-suggestion chip to inference confidence.**
- The job-mode suggestion chip (`cbe3090`) appeared whenever the inferred job
  differed from the human's selection and nudged EQUALLY HARD regardless of
  confidence — a thin LOW fallback (nothing resolved → PREP) was as insistent as
  a certainty (open position → MANAGE, HIGH). Presenting a weak guess as loudly
  as a certainty is a subtle overclaim.
- New pure `selectJobSuggestion(inference, currentMode)` → `{ strength }`:
  - `NONE` — inferred job already matches the human's — say nothing.
  - `ACTIONABLE` — HIGH/MEDIUM-confidence divergence — full gold accept-chip
    ("Suggested job →", solid border, opacity 1).
  - `HINT` — LOW-confidence divergence — muted, dashed "Possibly →" nudge
    (opacity 0.72).
- Both strengths stay CLICKABLE (human authority preserved); WM still never
  auto-switches. Presentation + suggestion-strength only — no truth change.
- 6 deterministic tests.

## Subsystems touched

`src/lib/experience/selectJobSuggestion.ts` (+ test), `src/app/command-deck/page.tsx`
(import; replace the raw `inferred !== current` check with `selectJobSuggestion`;
render ACTIONABLE vs HINT chip variants).

## Proof

- `tsc --noEmit --skipLibCheck` — clean.
- `vitest run src/lib/experience` — 68/68 green (7 files).
- `next build` — clean; `/command-deck` compiled.
- Deploy: `npm run deploy:cf` exit 0 — Version ID `792ad6ca`. Prod `/login` = 200.
- **Production VERIFIED LIVE (desktop) via the Founder's authenticated Chrome**
  (fresh tab in the same profile — auth cookie persisted; no credentials
  entered):
  - On the OBSERVE deck (live right-of-way verdict = WAIT, a MEDIUM-confidence
    divergence), the chip rendered the **ACTIONABLE** variant: prefix
    "Suggested job →", **solid** gold border `rgba(212,175,55,0.35)`, opacity 1,
    text "WAIT · Right-of-way is withheld — hold the thesis and wait."
  - Confirmed via computed style that MEDIUM confidence produced ACTIONABLE
    (not the dashed/muted HINT) — the strength→style wiring is live and correct.
  - Desktop screenshot captured (mode band, routed question, ACTIONABLE chip,
    context ribbon, hero).

## Remaining limitations

- **The HINT (LOW-confidence) variant was NOT observed firing live** — the live
  market produced a MEDIUM-confidence WAIT read, not a LOW divergence, so the
  dashed "Possibly →" variant had nothing to trigger it. Proven by unit tests
  only. NOT VERIFIED LIVE — no LOW-confidence divergence available in the market.
- **Mobile 390px screenshot STILL NOT VERIFIED (task #6)** — root cause now
  precisely diagnosed: `mcp resize_window` reports success but `window.innerWidth`
  remains 1475 in this display; the browser will not render a sub-640px viewport
  here, so the deck's `max-width:640px` responsive rules never fire. Environmental
  block, not a code gap. Cannot be fabricated.

## DB / Supabase state

No migrations applied. No secrets touched. Pure selector + presentation.

## Founder-visible result

The OS now asserts its job suggestion in proportion to how sure it is — a firm
read gets a gold chip, a weak guess gets a quiet dashed hint — while the human's
manual selection always wins. Honesty in how loudly the OS speaks.

## Anything now duplicate

Nothing. `selectJobSuggestion` composes `inferJobMode`'s output; it is the only
suggestion-strength resolver. The raw `inferred !== current` inline check it
replaced is gone.

## Next real dependency

Optional: when a LOW-confidence divergence occurs live (or a sealed history
exists), verify the HINT variant live; mobile 390px remains blocked on a display
that can render a sub-640px viewport (or DevTools device emulation, which the
extension does not expose). Always suggestion-only, human selection authoritative.
