# Ledger — Repo-wide Vitest `@/` alias gap fixed; suite 162/162 green (2026-08-26)

**Session:** Five-Hour Megazord Finish Shift — post-deploy hardening while prod is
1027-blocked (no live verification possible). Closes the one red suite that had
been carried as a known-open item across several prior entries.

## Time

`2026-08-26T~07:10Z`.

## Starting SHA

`6d4bf29` (deploy ledger entry). Full suite at this SHA: **161/162 files pass,
1 suite fails to LOAD**, 1337 tests pass.

## Ending SHA

`30c6c18` — `vitest.config.ts` added. Full suite: **162/162 files, 1350/1350
tests green**.

## Commit created

**`30c6c18` — Wire the `@/` → `./src` alias for Vitest.**

## Observed failure (before)

`vitest run` → `FAIL src/lib/learningGenome/useLearningGenomeBundle.test.ts`:
`Error: Cannot find package '@/lib/traderMemory/adapters/journalStorage' imported
from .../useLearningGenome­Bundle.ts:5`. 13 pure-function tests
(`normalizeJournalRecords`, `splitJournalByWeekWindow`) never ran.

## Root cause

`tsconfig.json` maps `@/*` → `./src/*`, which the app and `tsc` honor, but
**Vitest does not read tsconfig `paths`** and the repo had **no vitest/vite
config and no `vite-tsconfig-paths` plugin** to supply the alias. Every `@/`
import that "passed" in tests was therefore either:
- **type-only** (`import type { … } from "@/…"`, erased at runtime), or
- **`vi.mock("@/…", factory)`** — the factory replaces the module so the real
  path is never resolved.

The gap stayed invisible until the fired team's hook test did a **real, unmocked
`@/` VALUE import**, which forced actual resolution → "Cannot find package." Not a
defect in the hook or in `journalStorage.ts` (which is DI-clean: `window` only
touched inside a `typeof window === "undefined"`-guarded body; `readJournalStorage`
takes a storage port as an argument).

## Exact change

Added `vitest.config.ts` with `resolve.alias { "@": fileURLToPath(new
URL("./src", import.meta.url)) }` — the **same** alias the compiler + app already
use (one canonical alias, no parallel copy). Strictly additive: mocked and
type-only `@/` imports are unaffected; only previously-unresolvable unmocked `@/`
value imports now resolve.

## Proof

- Failing suite alone: **13/13 pass** (was: suite unloadable).
- Full suite: **162/162 files, 1350/1350 tests** (was 161/162, 1337 + 1 failed
  suite) — **+13 tests now execute, zero regressions**.
- `tsc --noEmit --skipLibCheck` — clean.
- `next build` unaffected — `vitest.config.ts` is read only by Vitest; the two
  build configs (`next.config.ts`, `open-next.config.ts`) contain zero vitest
  references. No runtime/bundle change.

## Deployment / DB state

Test-infra only — **nothing to deploy**. No migrations, no secrets. Pushed to
`origin/main` (`30c6c18`). Does not affect the 1027 prod outage.

## Founder-visible result

None directly (test infra). Indirect: the team's CI/local `vitest run` is now
fully green, and the entire class of "unmocked `@/` value import in a test" is
now supported instead of silently failing — future tests can import real modules
by alias without a mock.

## Remaining limitations

- Does not touch the Error 1027 prod outage (Founder-only; see
  `2026-08-26-atoms-deploy-1027-block.md`).
- Mobile 390px still environmentally blocked.

## Anything now duplicate

Nothing. The repo had NO vitest config; this is the first, and it reuses the
existing tsconfig alias definition rather than inventing a second source of truth.

## Next real dependency

Founder clears the 1027 outage → Gate-4 live/visual verification of the four
deployed atoms (Worker `1a17536d`) on `/command-deck`.
