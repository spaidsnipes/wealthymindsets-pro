<!-- BEGIN:ath-historical-lineage -->
> # ⛔ HISTORICAL LINEAGE — NOT CURRENT AUTHORITY
>
> **MEMORY MAY TEACH. ONLY CURRENT AUTHORITY MAY COMMAND.**
>
> This is a **shift baton** — a hand-off written at the end of one shift. Its filename names its own day. It was true
> on that day and is preserved as evidence of what was observed and decided
> then. Do not take a current action, diagnosis, release decision or task claim
> from it.
>
> **The current front door is in Drive, not in this repository.** A worker who
> arrived here from a search result or a shared link has not passed through
> `README.md` and has not met its demotion notice — this block is that notice,
> delivered at the door of the document itself.
>
> **Current production is `https://wealthymindsetspro.com`** (Cloudflare Workers /
> OpenNext). Any `*.vercel.app` reference below is a `GHOST_HOST` signal: the
> Vercel host was retired 2026-08-24 and cannot serve this app.
>
> Demoted 2026-09-19 by `src/lib/ops/datedDocsAreDemoted.sentinel.test.ts`, which
> until that day scanned only the top level of `docs/operations` and could not
> see this directory at all. See `docs/operations/CANON-SHIFT-GATE-STATUS.md`.
<!-- END:ath-historical-lineage -->

# WM Pro — Nectar Detail Hydration Performance Checkpoint

Status: LOCAL IMPLEMENTATION + ENGINEERING VERIFIED / AUTHENTICATED EXPERIENCE UNPROVEN

- Base HEAD: `97aaefca501dd471413a3fea8937ebe98b06b823`
- Governed pre-commit diff SHA-256: `1a719b146dc8cc8f865d6f798ac1412a766da65624a8d4b153d4f989003f7524`
- Exact source paths:
  - `src/app/nectar/[symbol]/page.tsx`
  - `src/lib/marketEvidenceRoutesPublicVocabulary.test.ts`
- PR24/25 exact-path overlap: none

## Root cause and correction

The changed `/nectar/[symbol]` route used a mount effect that synchronously called `setMounted(true)`. React's lint contract correctly identified the cascading render pattern. The route still requires a server-empty/client-hydrated gate because its two existing canonical stores hydrate from browser-local state.

The correction replaces effect-owned mount state with `React.useSyncExternalStore` and stable server/client hydration snapshots:

- server snapshot: `false`
- initial hydration snapshot: `false`
- client snapshot after subscription handoff: `true`
- no new store, state owner, resolver, request, persistence layer, or identity
- existing `sessionSymbolStore` and `sessionNectar` subscriptions remain unchanged
- no provider, coverage, trade, Canvas, or retention semantics changed

## Evidence

- Focused regression: 11/11 tests passed across 2 files.
- New source lock requires `React.useSyncExternalStore`, requires the server snapshot, and forbids `setMounted` on the detail route.
- Full regression: 2,443/2,443 tests passed across 251 files.
- TypeScript: pass.
- Scoped ESLint: pass with 0 errors and 0 warnings.
- Current-diff `git diff --check`: pass.
- Next.js 16.3.0 production build: pass; 78 static pages generated.
- Console warning/error read on rebuilt controlled origin: empty.

## Separate device rows

The rebuilt candidate was served only on loopback port 4331. The controlled browser had no authenticated session, so `/nectar/TSLA` failed closed to `/login` on every surface. This proves the same-candidate auth boundary and responsive login shell, not the authenticated Nectar workflow.

| Surface | Route result | Layout result | Authenticated Nectar result |
|---|---|---|---|
| Computer 1280x900 | `/login`, 2 visible inputs | zero horizontal overflow | BLOCKED / UNPROVEN |
| iPad portrait 768x1024 | `/login`, 2 visible inputs | zero horizontal overflow | BLOCKED / UNPROVEN |
| iPad landscape 1024x768 | `/login`, 2 visible inputs | zero horizontal overflow | BLOCKED / UNPROVEN |
| iPhone 390x844 | `/login`, 2 visible inputs | zero horizontal overflow | BLOCKED / UNPROVEN |

## Preservation and rollback

- No push, deploy, Cloudflare, Vercel, Supabase, DB, auth, provider, brokerage, or PR mutation.
- MainChart, `useWebSocket`, PR24, and PR25 paths were untouched.
- Five unrelated untracked operations/handoff records remained preserved.
- Controlled server was stopped and viewport overrides were reset.
- Rollback: revert only the eventual commit containing the two governed source paths and this checkpoint.

NOW: hydration performance correction sealed locally.

NEXT: select one collision-safe truth/experience weakness that does not require authentication to verify, or seal a precise blocker if none exists.

AFTER: authenticated `/nectar/[symbol]` computer/iPad/iPhone verification after a controlled-session handoff; production remains separately gated.

R00 RETURN / WM NO-GO

MISSION STATUS = ACTIVE / CONTINUATION REQUIRED
