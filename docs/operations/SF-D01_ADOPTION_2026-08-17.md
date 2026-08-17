# SF-D01 CODE ADOPTION · 2026-08-17

**Authority:** Continuity Enforcement Addendum §II (`Almost-finished work gets HIGHER priority`) + §XV (`Parallelism with ownership`) + §XXII (`No 'other team' excuse — there is only company work`).

**Original owner:** `spaidsnipes <dhill5711@gmail.com>` on branch `sf-d01-yahoo-quote-observation` (Codex Opus 4.8 co-authored, per commit trailers).

**Adopted by:** Claude Opus 4.7 on this shift.

**Adoption reason:** The two ATOM commits are pure additive code that closes an inherited SF-D01 truth defect (Sunday-futures stale quotes rendering as `LIVE`). They compose cleanly with the current `main` (`77b88c0`) — zero conflicts, zero destructive intent, full test suite raises 556 → 570.

---

## Cherry-pick summary

Two commits were cherry-picked verbatim from `sf-d01-yahoo-quote-observation` onto `main` using `git cherry-pick -x` so the original SHA reference is preserved in the new commit message:

| Original SHA | Adopted SHA | Change |
|---|---|---|
| `6f28ff7` | `1db04e3` | `feat(sf-d01): YahooQuoteObservation RESOLVED\|UNKNOWN truth + wire /api/yahoo quote` — creates `src/lib/marketData/yahooQuoteObservation.ts` (154 lines) + `.test.ts` (127 lines), edits `src/app/api/yahoo/route.ts` to thread the observation. |
| `aafd88c` | `9e4aa7e` | `feat(sf-d01): useWebSocket honors observation.observedAt — no fake-fresh Sunday quotes` — edits `src/hooks/useWebSocket.ts` so tape ticks carry the real `observedAt` when RESOLVED, `null` when UNKNOWN. |

`git cherry-pick -x` preserves original author (`spaidsnipes`) and appends a `(cherry picked from commit <sha>)` back-reference to the commit message so provenance is intact and the SF-D01 branch author receives credit.

---

## Why cherry-pick, not merge / rebase

The SF-D01 branch head (`a474c22`) was cut from `3bd5494` — several commits **before** the 26-commit Nectar shift landed on `main` (Vault flagship, per-symbol store APIs, header pill, coverage receipts, formatter extraction, JSON export). A naive `git merge sf-d01…` or `git rebase main sf-d01…` would present a fictional "you deleted" delta of ~2,780 lines against the Nectar work, because from SF-D01's perspective those additions never existed.

Cherry-picking only the two additive code atoms:

- lands the SF-D01 truth work on `main` immediately (90% closure of the SF-D01 chain per §II),
- preserves every line of Nectar work,
- leaves the SF-D01 branch's authorship record intact — the original commits still exist on the branch,
- reduces the SF-D01 team's remaining work to a small rebase of their ledger commits + responsive tweaks (files that no longer look the same on `main`).

Zero destructive git operations were performed. `git reset`, `git push --force`, `git branch -D`, and `git rebase --onto` were all avoided per continuity addendum §XIII.

---

## SF-D01 branch remaining work (not adopted)

These commits remain on branch `sf-d01-yahoo-quote-observation` and are **not** on `main`:

| SHA | Change | Why not adopted this pass |
|---|---|---|
| `ff6f9a7` | `fix(responsive): fluid HeroTruth typography` | Touches `src/components/command-deck/HeroTruth.tsx`. The Command Deck / HeroTruth is being iterated on by the parallel team (dirty tree includes `DecisionChainPanel`, `selectDecisionChain`); rebasing this now could collide. Best resolved by the Command Deck team once they land their inflight commit. |
| `fac76bf` | `fix(responsive): metric grids wrap across device classes` | Similar — likely touches shared UI where my Nectar `/nectar` and `/nectar/[symbol]` already use `auto-fit minmax(min(100%, 320px), 1fr)` + `clamp()`. Some overlap possible; the SF-D01 team should diff their intent against current `main` and open a bounded PR for whatever remains genuinely additive. |
| `74c95cf` + `a474c22` | Ledger entries (append-only) | Team-internal documentation; the SF-D01 team decides where these belong. |

None of the above are urgent. The two truth-fix atoms — the reason SF-D01 exists — are now shipped.

---

## Verification on current `main`

Post-cherry-pick, on repository HEAD `9e4aa7e`:

- `./node_modules/.bin/tsc --noEmit` → **0 errors**.
- `./node_modules/.bin/vitest run` → **570 passed / 70 test files** (was 556/69; +14 from `yahooQuoteObservation.test.ts` + the +2 useWebSocket integration adjustment). All prior tests still green.
- Repository ahead/behind origin/main: 0/0 after push.

Live-Chrome verification of the useWebSocket behavior change (Sunday-futures + no-trade path) is not exercised inside this shift's session because the current tape shows real-time data. Behavior is covered by the 12 new `yahooQuoteObservation.test.ts` unit tests + a jsdom-level useWebSocket test would require the parallel Command Deck team's `@testing-library/react` addition (deferred).

---

## Next owner / action

- **SF-D01 team (`spaidsnipes`)** — pull `main`, observe that `1db04e3` and `9e4aa7e` are the adopted equivalents of `6f28ff7` and `aafd88c`, decide on disposition of the responsive commits (`ff6f9a7`, `fac76bf`) against current `main`. Optionally open a small PR for whatever remains after diffing.
- **Consumer migration** — `scanner`, `paper`, `TickerTape` were named by SF-D01 ATOM 1 as consumers that still read the RESOLVED shape without honoring UNKNOWN. Following-shift work: audit those three call sites, migrate them to consult `observation.resolution` before rendering "live" language. Not adopted this pass because that touches surfaces (scanner.tsx, paper page) that need targeted live-Chrome acceptance.

Mission status: ACTIVE / CONTINUATION REQUIRED. Two adopted commits close the SF-D01 code lane; consumer migration + responsive polish remain open with a clear next-action list.
