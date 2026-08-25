# WM Pro — Living Implementation Ledger (repo-local mirror)

This directory is the append-only mirror of the Founder-canon Living
Implementation Ledger while the Google Drive MCP connector is
unauthorized in the current session.

## Rules

- **Append-only.** Never edit or delete a prior entry. If a prior entry
  is wrong, add a new entry that corrects it and reference the old
  filename in the correction.
- **One markdown file per session or per atom.** Filename format:
  `YYYY-MM-DD-<short-slug>.md`. If two sessions run the same date, add
  a suffix (`-am`, `-pm`, `-b`, etc.).
- **Every entry must contain the founder-canon fields**:
  - Date / time
  - Starting SHA
  - Ending SHA
  - Commits created (SHA + one-line purpose)
  - Subsystem(s) touched
  - Observed failure (before)
  - Root cause
  - Exact change made
  - Tests / build proof
  - Deployment state (LIVE / READY / applied? verified?)
  - Supabase / DB state (authored vs applied vs verified)
  - Founder-visible result
  - Remaining limitations
  - Anything now duplicate or unnecessary
  - Next real dependency for the following team
- **Never fabricate a proof.** If a step could not be run in the session
  (blocked by connector, missing auth, unavailable env), record it as
  `NOT VERIFIED THIS SESSION — <reason>` — never convert an unverified
  step into a claimed one.
- **Distinguish pre-fix and post-fix evidence.** Production evidence
  captured before a fix landed must not be relabelled as proof the fix
  worked.

## Sync-to-Drive workflow (manual)

Until the `google-drive` MCP connector is authorized, ledger entries
here must be periodically synced to the canonical Drive Living
Implementation Ledger. Suggested workflow:

1. In an interactive Claude session with the Drive connector authorized,
   run "sync docs/ops/ledger/*.md into the WM Pro Living Implementation
   Ledger, preserving append-only ordering."
2. Or copy-paste each new entry directly into Drive.

## Files

- `README.md` — this document.
- `2026-08-16-scoreexplainer-nextpractice-atom.md` — atom-close baton for
  the pending ScoreExplainer + profile/page.tsx conditional-hook fix
  awaiting Sentinel review.
- `2026-08-16-pm-execution-session.md` — prior session's ledger entry.
- `2026-08-24-experience-shell-cutover.md` — first WM Experience Shell
  cutover (live seven-mode band on /command-deck) + moomoo/webull env
  drift-lock fix. Records a P0: prod serving Cloudflare Error 1027
  (Workers plan-limit outage) — Founder action required.
- `2026-08-24-question-router-atom.md` — WM Question Router: compiles the
  one dominant question on /command-deck from (job mode) × canonical One
  Story signals. Deployed (Worker `ab64ff85`); visual verification still
  blocked by the same Error 1027 outage.
- `2026-08-25-verification-close.md` — prod recovered at the 00:00 UTC reset
  (login 200); DESKTOP visual gate CLOSED for the mode band + routed question
  (verified in the Founder's Chrome). Mobile 390px screenshot still open.
- `2026-08-25-p6-passport-whynot.md` — P6 Market Object Passport (`7cb9fd9`)
  + WHY / WHY NOT (`58a5cee`). Both pure view models + display panels wired
  into `/command-deck`, tested (61/61 green), deployed, and VERIFIED LIVE on
  desktop via the Founder's authenticated Chrome. Mobile 390px gate still
  open. Evidence-Reversibility Moat made visible.
- `2026-08-25-p8-receipt-job-emphasis.md` — P8 Decision Receipt (`186ca83`)
  + Job-Emphasis (`ccd2e0a`). `selectDecisionReceipt` projects a sealed
  DecisionMemoryRecord into a trader receipt (WAIT/NO_TRADE = complete; no
  fabricated grade); `selectDeckEmphasis` re-emphasises the deck surfaces
  around the human's current job. 209/209 green; deployed; VERIFIED LIVE on
  desktop — proved the OBSERVE→REVIEW switch flips the Passport/Receipt
  drawers. The "app → operating system" thesis made literal.
- `2026-08-25-job-mode-inference.md` — Job-Mode Inference (`cbe3090`). Pure
  `inferJobMode(signals)` reads concrete decision state (open position →
  MANAGE, unreviewed close → REVIEW, right-of-way → EXECUTE/WAIT, resolving
  state → OBSERVE, else PREP) and the deck surfaces it as a read-only
  suggestion chip that appears ONLY when the inferred job differs from the
  human's selection. Clicking accepts (setMode); WM never auto-switches. 9
  deterministic tests; deployed; VERIFIED LIVE on desktop — the chip
  rendered "SUGGESTED JOB → WAIT", accepted on click, then vanished
  (inferred == current). Suggest, never gate. Mobile 390px still open.
