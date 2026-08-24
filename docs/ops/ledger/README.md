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
