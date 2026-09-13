# WM Pro — Ticket T build-path proof, 2026-09-13 09:01Z

Addendum to `WM-PRO-2026-09-13-0858-TICKET-T-PARENT-CUT-SHIFT.md`. Written
because "the code is in the tree" is not the same as "the code will
deploy," and the audit's F8 depends on deploy. Both build paths verified
locally at HEAD (`06dc00d` on `main`).

## next build (standard Next.js path)

  ./node_modules/.bin/next build
  Exit code: 0

  All static routes rendered. `/command-deck` classified as `○ (Static)`
  along with the rest of the shell. No type or module errors introduced
  by the parent-cut import of WMExperienceShell into MainLayout.tsx or by
  the sanctuary `<style>` block.

## opennextjs-cloudflare build (production deploy path)

  ./node_modules/.bin/opennextjs-cloudflare build
  Exit code: 0

  Worker artifact:
    .open-next/worker.js
    sha256 d05223bf4d44c84108a102ab62aa3bc9c5568f0c3ac2064c37be5cc65c64bc45
    2278 bytes (thin loader; the real bundle lives in the sibling chunks)

  One warning survived and belongs to `html2canvas` — a duplicate-case
  clause in vendored ESM. Pre-existing, not caused by this shift, not
  actionable from here.

## wrangler auth check

  ./node_modules/.bin/wrangler whoami
  ERROR: Not logged in. Your auth token has expired and could not be
  refreshed, and the environment is non-interactive.

  `npm run deploy:cf` therefore fails at the deploy step, not at the
  build step. Same block the 08:37Z baton recorded.

## What this proves

  1. The Ticket T parent cut, sanctuary, state-matrix sentinel and
     residency sentinel all compile and bundle end-to-end for both the
     standard Next path and the Cloudflare OpenNext path. The build is
     NOT the reason prod still serves the pre-cut composition.

  2. F8 is one interactive wrangler login away. Not a re-architecture,
     not a debug session. The person who runs `wrangler login` in a
     terminal has the entire cut arrive on wealthymindsetspro.com
     within one deploy cycle.

  3. The audit's language "if the Founder glass still squints into the
     old dashboard, Ticket T is not done" survives this shift as a red
     G9 for now — HUMAN_PROOF_REQUIRED — but the tree is standing
     honestly behind the promise.

## For the person holding the deploy trigger

  export CLOUDFLARE_API_TOKEN=…   # or run `wrangler login` interactively
  npm run deploy:cf
  # Then navigate to https://wealthymindsetspro.com/command-deck at
  # 1440x900 and 390x844, capture both, stand them next to the
  # 08:37Z baton's F0 shot. That is F8.
  # If any of the three sentinels goes red after your merge — parent
  # cut, residency, sanctuary market-keying — a revert has landed.
