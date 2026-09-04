# BATON — the fabricator behind the closed door (lane I)

GOVERNING CANON: "WM Pro — Operating System BUILD ORDER — Natural Language —
BINDING — September 3, 2026".

Lane H sealed the §14.6 / §14.7 work and left a Sentinel that reads ONE file.
This lane points that Sentinel at the whole app, and reports what it found on
the first run.

Commits sealed by this baton: `27cfc13`, `98ee582`.

---

## FOUNDER_VISIBLE_DELTA

**The app can no longer manufacture a token deployment record.**

`WMSContext.launchCreatorCoin` took a name and a symbol from a form and wrote
this into your browser's local storage:

```ts
const full: CreatorCoin = {
  ...coin,
  deployedAt: new Date().toISOString(),
  logoColor: LOGO_COLORS[Math.floor(Math.random() * LOGO_COLORS.length)],
};
```

No wallet. No signed transaction. No chain receipt. A `deployedAt` timestamp
produced by `new Date()` at the moment a button was pressed, then rendered back
on /profile as "Launched &lt;date&gt;", followed by a toast reading
`🚀 ${symbol} launched! +500 WM$`.

That toast was wrong twice. Nothing deployed — and `launchCreatorCoin` never
credited any WM$ either; it forwarded the existing balance to `persist`
untouched. A success message for an event that did not happen, quoting a
reward that was not paid.

This is now deleted, not disabled. The reason is recorded in the file: **a
disabled fabricator is one edit away from being a fabricator.** There is no
honest version of this function without a wallet connection and a confirmed
chain receipt, so there was nothing to keep.

---

## The part that should change how we review

**The codebase had already named this defect, and left it running.**

`loadState` in the same file refuses to migrate v1 state with this comment:

```ts
// v1 awarded fabricated token balances and allowed local-only "coin
// launches". Do not migrate those values into the honest local-points model.
```

So a previous pass identified the behaviour as fabrication, cleaned up the
records the function produced, and did not remove the function that produced
them. Naming a defect is not the same as removing it. The gate was pointed at
the output; the source kept running.

**And it was already unreachable.** Its only caller was a form on /profile
mounted behind `showLaunchCoin`, whose opener was removed by `b6c08db`
("Remove synthetic signals and token claims", 2026-07-20). That is the shape
worth learning:

> a fabrication primitive sitting behind a closed door — invisible to review
> because nothing calls it, one `onClick` away from live.

It was not found by reading a diff. It was found by running the orphan
detector across every component instead of one.

---

## The detector now covers the app, not a file

`chartPanelDoorway.test.ts` read `ChartsDashboard.tsx` and nothing else. A
detector aimed at a single file can only confirm the orphan you already knew
about, while reading like coverage.

Pointed at all **132** components it returned **3** orphans:

| file | flag | status |
|---|---|---|
| `src/app/profile/page.tsx` | `showLaunchCoin` | **fixed here** — form + fabricator deleted |
| `src/components/chart/ChartsDashboard.tsx` | `tradeOpen` | held by another thread |
| `src/components/chart/ChartsDashboard.tsx` | `pnlOpen` | held by another thread |

The sweep is now part of the suite (`98ee582`) rather than a script in `/tmp`.
That also makes a claim in `creatorCoinFabricationLock.test.ts` true rather
than aspirational — it says the orphan was "found by the repo-wide orphan scan
added in chartPanelDoorway.test.ts", and until this commit that scan was not
in the repo.

Design notes:

- **No second detector.** The existing functions are reused, so the repo-wide
  sweep cannot drift away from the four synthetic proofs that already guard
  them.
- **The ledger is path-qualified.** Wiring the chart orphans does not silently
  license a new orphan of the same name somewhere else.
- **Vacuity guard on both axes** (>100 files, >40 panel flags). A walk that
  silently matched nothing would report "no orphans" forever, and that reads
  exactly like a clean bill of health.

### A landmine in an existing test, fixed on the way past

`wmsLedgerIntegrity.test.ts` sliced the source on
`indexOf("const launchCreatorCoin")`. Delete that function and `indexOf`
returns `-1`; `slice(start, -1)` then silently widens the body to nearly the
whole file. The assertions keep running, over the wrong text, and pass or fail
for reasons unrelated to the function under test.

`bodyBetween()` now asserts both markers exist before slicing. **A
text-boundary test that survives the disappearance of its own boundary is
reporting on nothing.**

---

## §22 revive-attempts — both Sentinels proven, not assumed

**Fabricator revived** (function re-added to `WMSContext`): 3 of 8 assertions
failed, independently —

1. by name (`launchCreatorCoin`),
2. by mechanism (`deployedAt:\s*new Date\(\)`),
3. structurally — `setCreatorCoin(full) is not a hydration from persisted state`.

A rename alone does not escape it.

**Orphan revived** (`showLaunchCoin` re-added to /profile as a mounted,
unopenable flag): 2 assertions failed, with the exact path-qualified diff

```
+ "src/app/profile/page.tsx: showLaunchCoin",
```

Both reverted; full suite green after each.

---

## PROOF LEVEL — honest, and the honest answer here is unusual

- **implemented**: yes — `27cfc13`, `98ee582`.
- **tested**: yes — 373 files / 3523 tests, `VITEST_EXIT=0`; `tsc --noEmit`
  exit 0. Both unpiped.
- **observed**: **yes, for the part that has a surface — and there is no other
  part.** This change deletes *unreachable* code, so by construction it has no
  post-change pixel to photograph. Claiming a browser check would prove it
  would be theatre. What was actually observable, was observed: on **live
  production, signed in**, `/profile?tab=coins` renders

  > Creator Coin Deployment Not Connected — A real creator coin requires
  > wallet connection, reviewed contracts, signed transactions, and confirmed
  > chain receipts. This app does not deploy one yet.

  with a greyed-out **Deployment unavailable** button, WM$ labelled "Local app
  points · not cryptocurrency", ON-CHAIN "Not connected" — **and no launch form
  anywhere on the tab.** That is the empirical confirmation of the static
  claim: the fabricator really was unreachable in production. The honest
  surface survives the deletion because the deletion never touched it.
- **proven**: **structurally, via the revive-attempts above — not in the
  TEN-STEP sense.** No position, no order, no receipt is involved here.

---

## BLOCKER (new, and it replaces a wrong one I was carrying)

**Deploy is blocked by expired Cloudflare auth, not by the dirty working tree.**

The lane-H baton implied the blocker to shipping was the other thread's
uncommitted files, since `opennextjs-cloudflare build` builds from the working
directory. That is solvable — a clean `git worktree` off `main` sidesteps it
entirely and touches nobody's files. So I tested the real gate first:

```
$ ./node_modules/.bin/wrangler whoami
✘ [ERROR] Not logged in. Your auth token has expired and could not be
  refreshed, and the environment is non-interactive. Run `wrangler login` in an
  interactive terminal or set a CLOUDFLARE_API_TOKEN.
WHOAMI_EXIT=1
```

**Founder action, one command, interactive terminal: `npx wrangler login`.**
The alternative is a `CLOUDFLARE_API_TOKEN` in the environment — which I will
not write, paste, or commit. Until one of those happens, **nothing merged to
`main` can reach production**, by any thread, and every commit in this and the
previous lane stays at "tested" for the prod surface.

Note this is a *different* blocker from the one recorded on 2026-08-22 (Vercel
billing, superseded 2026-08-24 by the move to Cloudflare Workers). It is an
expired credential, not a plan limit.

## Errors made in this lane, recorded

1. **I hit the exact trap the standing order names.** First read of the auth
   state was `wrangler whoami | head -20; echo $?` → printed `WHOAMI_EXIT=0`.
   That was **`head`'s** exit code. I nearly recorded "wrangler exits 0 while
   not logged in" as a finding about wrangler; it was a finding about my own
   command. Re-run unpiped: `WHOAMI_EXIT=1`. *A pipe masks the exit code* is
   not only a rule about `vitest`.
2. **A parallel `Bash` call cancelled its sibling** — `ls .github/workflows &&
   …` exited 1 because the directory does not exist, taking the parallel grep
   with it. Use `;` when the first command is a probe, not a precondition.

## Scope I deliberately did NOT take

- **The legacy deployed-coin card was left alone.** `loadState`'s v2 gate
  already refuses to hydrate v1 records, so no fabricated coin can render.
  There was no legacy display risk to chase, and deleting the card would have
  silently removed real user-visible state for no reason.
- **`isDeployed` stays hard-coded `false`** with its existing comment: a
  configured contract address alone proves nothing about identity, ownership,
  metadata, or wallet integration.
- **The two chart orphans stay unfixed.** `ChartsDashboard.tsx` and
  `ChartToolbar.tsx` are held by another thread — confirmed dirty in the
  working tree at seal time. Reaching into a file another writer holds to add a
  button would be a worse defect than the one being fixed.

## EXACT_NEXT_ATOM (§17)

1. **Founder:** `npx wrangler login`. It is the single gate between every
   commit on `main` and the production surface.
2. **For the thread holding the chart files:** resolve `tradeOpen` and
   `pnlOpen` — one line each, or delete the mounts. Then remove the entries
   from **both** ledgers in `chartPanelDoorway.test.ts` (`KNOWN_ORPHANS` and
   `KNOWN_ORPHANS_REPO_WIDE`). Resolving it correctly still trips the test
   once, on purpose.
3. **This seat:** the remaining unowned §14 invariants. §14.2 and §14.3 are
   still unowned and their canon text is not in the repo — I will not invent
   it; it needs to be read out of the Drive doc.

## BLOCKERS (carried forward, unchanged)

- Every `BrokerAdapter.submitOrder()` returns status `rejected` with
  `brokerOrderId: null`. Steps 5–10 of the TEN-STEP PROOF cannot reach PROVEN
  without a real adapter plus credentials.
- `SESSION HALTED` vocabulary absent; no provider halt signal exists.
- Paper state is localStorage → §12 cross-device same-identity handoff has no
  server store.
- `/api/market-memory/coverage` returns 503 pending `SUPABASE_SERVICE_ROLE_KEY`.

## COLLISION LOCK observed

`src/components/chart/ChartsDashboard.tsx`, `src/components/chart/ChartToolbar.tsx`,
`src/app/globals.css`, `src/app/paper/page.tsx` and
`docs/operations/batons/WM-PRO-EVENING-2026-09-03.md` belong to another thread
and were not touched. Untracked work belonging to that thread (`scratchpad/`,
`chartPhoneControlReachability.test.ts`, `paperOptionCloseReplay.test.ts`) was
left in place. Both commits in this lane named their files explicitly rather
than staging the tree.
