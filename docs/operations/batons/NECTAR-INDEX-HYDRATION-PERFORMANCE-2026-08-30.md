# WM Pro — Nectar Index Hydration Performance Checkpoint

Status: LOCAL IMPLEMENTATION + ENGINEERING VERIFIED / AUTHENTICATED EXPERIENCE UNPROVEN

- Base HEAD: `adf3154311562f1324623b0ed3171f934a24c807`
- Governed pre-commit diff SHA-256: `439dcb6ed35e44ee14789ebc6d870a91f0ce91c8e60e68d2d307db90efda3411`
- Exact source paths:
  - `src/app/nectar/page.tsx`
  - `src/lib/marketEvidenceRoutesPublicVocabulary.test.ts`
- PR24/25 exact-path overlap: none

## Root cause and correction

The canonical `/nectar` index used a mount effect that synchronously called `setMounted(true)`, creating the same avoidable hydration render cascade already corrected on `/nectar/[symbol]`. The page still needs a server-empty/client-hydrated boundary because its established canonical session stores hydrate from browser-local state.

The correction replaces effect-owned mount state with `React.useSyncExternalStore` and stable server/client hydration snapshots:

- server snapshot: `false`
- initial hydration snapshot: `false`
- client snapshot after subscription handoff: `true`
- no new store, state owner, resolver, request, cache, persistence layer, or identity
- existing `sessionSymbolStore` and `sessionNectar` ownership remains unchanged
- no provider, coverage, trade, Canvas, retention, or public-vocabulary semantics changed

## Evidence

- Focused regression: 40/40 tests passed across route vocabulary, `sessionSymbolStore`, and `sessionNectar` coverage.
- New source lock requires `React.useSyncExternalStore`, requires the server snapshot, and forbids `setMounted` on the index route.
- Full regression: 2,444/2,444 tests passed across 251 files.
- TypeScript: pass.
- Scoped ESLint: pass with 0 errors and 0 warnings.
- Current-diff `git diff --check`: pass.
- Next.js 16.3.0 production build: pass; 78 static pages generated.
- Controlled runtime start was not authorized by the host approval boundary in this atom; no runtime, console, network, or accessibility claim is inferred from the build.

## Separate device rows

No same-candidate runtime server was started for this atom. The authenticated `/nectar` experience therefore remains independently unproven on every required proof surface.

| Surface | Same-candidate runtime | Authenticated Nectar result |
|---|---|---|
| Computer 1280/1920 | BLOCKED — host approval boundary | UNPROVEN |
| iPad portrait 768x1024 | BLOCKED — host approval boundary | UNPROVEN |
| iPad landscape 1024x768 | BLOCKED — host approval boundary | UNPROVEN |
| iPhone 390x844 | BLOCKED — host approval boundary | UNPROVEN |

## Preservation and rollback

- No push, deploy, Cloudflare, Vercel, Supabase, DB, auth, provider, brokerage, or PR mutation.
- MainChart, `useWebSocket`, PR24, and PR25 paths were untouched.
- Five unrelated untracked operations/handoff records remained preserved.
- No protected Founder browser tab was touched.
- Rollback: revert only the eventual commit containing the two governed source paths and this checkpoint.

NOW: Nectar index hydration performance correction sealed locally.

NEXT: complete the fresh Drive authority readback, then select one collision-safe truth or Founder-visible experience weakness permitted by the current canon.

AFTER: authenticated `/nectar` computer/iPad/iPhone verification after a controlled-session handoff; production remains separately gated.

R00 RETURN / WM NO-GO

MISSION STATUS = ACTIVE / CONTINUATION REQUIRED
