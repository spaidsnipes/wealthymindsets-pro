# Atom-close baton — 2026-08-16 — ScoreExplainer "Next practice" + profile/page.tsx conditional-hook fix

Status: **CLOSED PENDING SENTINEL REVIEW**. Do not commit, push, deploy,
or broaden the patch until an independent Sentinel review clears it.

## Immutable references

- HEAD at atom-close: `08796aa55775422a49dfa7228bc056a7d24d382f`
- origin/main at atom-close: `08796aa55775422a49dfa7228bc056a7d24d382f`
- Vercel prod deployment at atom-close: `dpl_79F39Z4gHpDRGx9g9GQEtBXLRLrr`
  (state: READY; captured earlier this session before the atom's dirty
  edits were made, so this ID represents PRE-FIX prod, not post-fix
  evidence)

## Dirty files preserved (do not touch)

| Path | sha256 | Diff vs HEAD |
|---|---|---|
| `src/app/profile/page.tsx` | (see live git status) | +5 / −8 lines (16-line diff footprint) |
| `src/components/profile/ScoreExplainer.tsx` | `f4e96c7a5e0c5bfce5f1b2150e9caccd50b42aca7e948ba150baba95d628b570` | +53 lines (Next-practice block) |
| `tsconfig.tsbuildinfo` | `6ce058e465ce031c5e96366127edb07d76f1d196c04a82c2af9bd0ccc61214c5` | auto-managed, incidental |

## What each dirty file does

### `src/app/profile/page.tsx` — the "one-file Growth fix"

Replaces this pattern inside a `{(() => { ... })()}` IIFE (Rules-of-Hooks
violation — hooks called inside a nested function, not at the top of
`ProfilePage`):

```tsx
decisions: mergeSnapshots(
  useDecisionMemory(user?.id ?? null),
  useJournalSnapshots(user?.id ?? null),
),
```

with:

```tsx
decisions: growthDecisions,
```

where `growthDecisions` must already be computed at the top level of
`ProfilePage`. **Verified `growthDecisions` IS defined at page scope**
via `React.useMemo` at `profile/page.tsx:105-107` over the two hook
returns (`_growthDecisionMemory`, `_growthJournalSnapshots`), and is
already the reference used at four other `decisions:` and one
`decisions={}` call site (lines 615/693/702/711/726). The IIFE at 615
was the only remaining conditional-hook site; replacing it with
`growthDecisions` fully closes the rules-of-hooks violation without
altering any observable behavior downstream (memoization identity is
preserved via the useMemo dep array).

Root cause: conditional hooks. React would flag / crash the Growth tab
on the first re-render pass depending on which branch of the IIFE ran.

### `src/components/profile/ScoreExplainer.tsx` — my rejected edit

Adds a "Next practice" block below the Compounding/Leaking edge grid
that renders one of three deterministic prescriptions derived from
`PersonalEdgeVM`:

1. `watch` exists → "Practice avoiding <label> — n=<count>, avg <R>R"
2. else `strongest` exists → "Practice repeating <label> — n=<count>, avg <R>R"
3. else `totalDecisions > 0` → "Practice logging N more decisions per context to reach threshold n=<X>"
4. else silent

Also bumps the "Open full breakdown →" CTA `minHeight: 32 → 44` for WCAG
2.1 AA SC 2.5.5 target-size.

## Evidence captured

- `tsc --noEmit --skipLibCheck` on the candidate diff: **0 prod errors**
  (ran in prior session turn immediately before user rejected commit).
- `vitest run` on the candidate diff: **530/530 pass** (no new tests
  were added for the Next-practice logic — this is a documented gap).
- `next build` on the candidate diff: **clean**, no route errors.
- **3/3 focused tests**: refers to the tsc + vitest + next-build gate;
  no new unit test for the specific Next-practice logic exists.

## Evidence explicitly NOT captured (do not fabricate as proof)

- Local runtime start: **NOT COMPLETED THIS SESSION** — dev server not
  started against the candidate diff.
- Desktop live-application drive: **NOT COMPLETED THIS SESSION** — Chrome
  extension not paired (`mcp__claude-in-chrome__list_connected_browsers`
  returned `[]` on multiple attempts).
- iPad live-application drive: **NOT COMPLETED THIS SESSION**.
- iPhone live-application drive: **NOT COMPLETED THIS SESSION**.
- Vercel prod post-fix render: **NOT COMPLETED** — nothing was pushed.

The Vercel deployment ID `dpl_79F39Z4gHpDRGx9g9GQEtBXLRLrr` captured
earlier this session is **pre-fix prod state**. It must not be
relabelled as post-fix proof.

## Sentinel review task (the exact NEXT for this atom)

An independent Sentinel review must:

1. Verify `growthDecisions` is defined at `ProfilePage` top level before
   the profile/page.tsx diff. If not, the diff is INCOMPLETE — do not
   commit; fix the top-level declaration first.
2. Confirm `sha256(ScoreExplainer.tsx)` still equals
   `f4e96c7a5e0c5bfce5f1b2150e9caccd50b42aca7e948ba150baba95d628b570`
   and `sha256(tsconfig.tsbuildinfo)` still equals
   `6ce058e465ce031c5e96366127edb07d76f1d196c04a82c2af9bd0ccc61214c5`
   at the time of review.
3. Re-run tsc + vitest + next-build against HEAD + candidate diff.
4. Start local runtime (`npm run dev` or equivalent), authenticate as
   a test user, drive `/profile` → Growth tab, capture screenshot proof
   of the "Next practice" line rendering the correct prescription for
   at least (a) trader with `watch` isolated, (b) trader with only
   `strongest`, (c) trader with `totalDecisions > 0` but neither, and
   (d) totally new trader (silent).
5. Drive same at 390px, 768px, 1440px viewports — confirm layout does
   not overflow or collapse the CTA below 44px hit area.
6. THEN and only then: `git add` the two functional files (never
   tsbuildinfo alone), commit with a coherent atomic message, push.
7. Verify Vercel picks up the new SHA, `curl` the new deployment ID,
   drive the deployed page, confirm founder-visible parity with the
   local run.
8. Update this baton with the ending SHA + verified deployment ID + a
   `RESOLVED` line at the top.

## Do NOT

- Do not amend, rebase, or squash the candidate diff.
- Do not add new files to the pending atom (widening scope voids the
  Sentinel review).
- Do not run `git checkout` / `restore` / `reset` on any of the 3 dirty
  paths.
- Do not `git stash` — the tree is the authoritative baton.
- Do not roll the tsbuildinfo change into the functional commit; it is
  incidental compiler cache noise.

## R00 status

`RETURN` / `WM NO-GO` / `MISSION ACTIVE` retained. This atom is closed;
the following execution session continues in DIFFERENT files per the
approved plan file (`~/.claude/plans/linear-drifting-floyd.md`).
