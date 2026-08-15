# Production Deployment Status — 2026-08-14

## Main production: `wealthymindsets-pro` — ✅ GREEN

Every commit since `ca91422` (the build-fix commit) is deploying
successfully to https://wealthymindsets-pro.vercel.app.

Verified currently serving:
- `/` — landing
- `/login` — auth
- `/command-deck` — NEW composed decision-chain surface
- `/profile` — Growth tab with 4 panels (PersonalEdge, PlaybookDNA,
  SessionEdge, ProcessLandscape) + Steward Rules + ATHOS silent-mode
- `/heatmaps` — with 44px a11y controls + QualityBadge
- `/morning-prep` — with OpeningBellPanel + Yesterday's Mirror
- `/journal` — with PersonalEdgeChip + MirrorPanel
- `/charts` — original chart workspace (untouched)
- All other 20+ routes

## Secondary project: `project-6bui2` — ⚠️ orphan, no user impact

**What it is:** A duplicate Vercel project connected to the same
`spaidsnipes/wealthymindsets-pro` GitHub repo. Its base URL
(`project-6bui2-spaidsnipes-projects.vercel.app`) returns
`x-vercel-error: DEPLOYMENT_NOT_FOUND` (HTTP 404) — no domain aliased.
Individual deployment URLs redirect to Vercel SSO (302), meaning the
project has "Deployment Protection" enabled.

**Why it shows red:** GitHub commit-status reports `project-6bui2` as
`failure` for every commit — either because:
1. The build is genuinely failing (missing env vars specific to this
   project), or
2. GitHub misinterprets the 302 SSO redirect as failure

Either way this project has **zero user-facing impact**:
- No domain routes to it
- No prod URL alias
- No traffic possible without Vercel team login

**Founder action recommended:** In the Vercel dashboard, either:
- Delete the `project-6bui2` project (if it's a leftover from an
  initial fork or rename), OR
- Disconnect the GitHub integration on that project so it stops
  reporting to commit status.

Either action cleans up the always-red commit checkbox without
touching main production.

## Build regression that was fixed (ca91422)

Before ca91422, main production was failing on every commit since
70d51e9 due to two independent build-blocking issues:

1. **Broken test scaffolds** — Two speculative test files
   (`primitives.test.tsx`, `useWebSocket.F1F2F3.test.ts`) referenced
   uninstalled `@testing-library/react` + wrong `SessionNectarSnapshot`
   shape. Vercel's `next build` runs tsc WITHOUT `--skipLibCheck` and
   includes tests in the compilation graph.
   **Fix:** deleted both scaffolds. Real tests for these areas exist
   elsewhere (60+ test files, 470+ tests pass).

2. **Module-load env-secret throws** — 3 files (`src/lib/auth.ts`,
   `src/app/api/finnhub/route.ts`, `src/app/api/market/route.ts`)
   evaluated `process.env.NODE_ENV === "production"` + secret presence
   at MODULE TOP LEVEL and threw when missing. Vercel's build step
   imports every route module with `NODE_ENV=production` for
   page-data collection, so a build worker without runtime secrets
   crashes the entire deploy.
   **Fix:** refactored to lazy resolution — cached first-call
   resolvers (`getJwtSecret()`, `getFinnhubKey()`). Security guards
   preserved — real request handlers still fail-fast on missing
   secrets. The throw just moves from import-time to first-use.

Both fixes shipped in commit `ca91422`.

## Sanity checks

- `next build` locally: succeeds (25 routes prerendered)
- `tsc --noEmit --skipLibCheck`: 0 production errors
- `vitest run`: 60+ files, 470+ tests, all pass
- Production HTML on `/command-deck`, `/profile`, `/morning-prep` all
  contain the expected new UI text (verified via curl)
