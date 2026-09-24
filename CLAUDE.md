@AGENTS.md

# HOSTING LAW — READ BEFORE DIAGNOSING ANY DEPLOY

**Production = Cloudflare Workers** (`wrangler.jsonc`, `@opennextjs/cloudflare`), built by
**Cloudflare Workers Builds** on every push to `main`. The gates that count are the
`Workers Builds: wealthymindsets-pro` check run and the GitHub Actions
`typecheck · sentinels · build` job. Reproduce the host's build locally with
`npm run build:cloudflare`.

**Vercel is RETIRED (left 2026-08-24; account cancelled).** Its GitHub App still writes two
commit statuses on every commit — `Vercel – wealthymindsets-pro` and `Vercel – project-6bui2`,
"Account is blocked". They are GHOSTS: never a deploy blocker, never a diagnosis, never a
reason to ask the Founder to unblock, pay for, or reconnect Vercel. GitHub's rolled-up
`status.state` includes them, so read the check runs above, not the rollup.
See `README.md` (hosting section) and `src/lib/ops/ghostHostRetirement.test.ts`.

If the live site looks stale: check the latest `main` Workers Builds result first. A red
Cloudflare build (e.g. a typecheck error on `main`) is the usual cause.

A SHA pushed to both `main` and a feature branch gets TWO Workers Builds runs. The feature-branch
(non-production) run fails in ~2 minutes and is NOT production — use
`/commits/<sha>/check-runs?filter=all` and read the run that built `main`.
