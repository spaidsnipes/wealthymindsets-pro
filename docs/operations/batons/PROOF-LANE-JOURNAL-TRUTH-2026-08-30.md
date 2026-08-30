# WM Pro Proof Lane Journal Truth Baton — 2026-08-30

## Authority and identity

- Shift atom window: 2026-08-30T07:18:00Z–2026-08-30T07:26:00Z.
- Candidate base/HEAD before this atom: `2838aa46875876c78eb6952d29f7762b5efa0cd8`.
- Cached `origin/main`: `8d7f8be2d615f77f4758c950a2e7aba210cc7d1b`; no fetch or remote-current claim.
- Founding Contract remains R00 RETURN / WM NO-GO. This local atom is not release authorization.
- PR24/25 integration ownership remains unresolved. No MainChart, `useWebSocket`, provider, PR24, or PR25 path was touched.

## Verified substantial delta

1. Proof Lane now reads the canonical Journal storage owner through a read-only adapter that preserves `ABSENT` versus `UNAVAILABLE`. Invalid or blocked storage can no longer be promoted into a fabricated empty measured sample.
2. An unavailable Journal read renders a polite live status: no measured result is shown, and the product explicitly says the Journal was not cleared or replaced.
3. The Challenge journey Plan step no longer links back to the top of the same page. `Set a scenario` targets the canonical Catch-Up Compass at `/proof-lane#compass`.

File SHA-256 identities before commit:

- `src/app/proof-lane/page.tsx` — `9fe5d77f221e7db30d3820011e6fe063505496d578bca267f2b7a742d8ee9bd3`
- `src/lib/proofLane/challengeJourney.ts` — `7c93fef44226ea64f7af8f2187bae19b299daa047188d5a4cb8ee651992c80a4`
- `src/lib/proofLane/challengeJourney.test.ts` — `e0546b454b4a3bc33293fc2de4bd80a669e7d708f249133c20d70dae9b1c4792`
- `src/lib/proofLaneSurfaceTruth.test.ts` — `9f992ed332d163f4e5cf9c2fcb77835c87d29eb760bbbaf3bc790e19531b91a4`
- `src/lib/proofLane/readJournalEdge.ts` — `5da35e19165e56daaccc978b34d209efb059b8d2a9cd05ee30f2b66cea59dd4a`
- `src/lib/proofLane/readJournalEdge.test.ts` — `bec56fe132909c1092e9bb41fa77bc0606110298a06ed5618b695c4873d7103e`

## Evidence actually run

- Focused deterministic tests: 3 files / 14 tests PASS, including canonical, legacy, absent, invalid, and blocked Journal reads plus the non-dead Plan destination.
- Full regression: 251 files / 2,439 tests PASS.
- TypeScript: PASS (`tsc --noEmit`).
- Focused ESLint: 0 errors, 3 pre-existing warnings in `src/app/proof-lane/page.tsx`.
- `git diff --check`: PASS.
- Signed-in local runtime, ordinary navigation only; no storage inspection or mutation:
  - computer 1280×900: no horizontal overflow;
  - iPad portrait 768×1024: no horizontal overflow;
  - iPad landscape 1024×768: no horizontal overflow;
  - iPhone 390×844: no horizontal overflow;
  - computer action proof: `Set a scenario` changed the URL to `/proof-lane#compass` and placed Catch-Up Compass at the visible top of the page.
- Loopback server was stopped after verification; generated `next-env.d.ts` drift was restored.

## Limitations and risk

- The unavailable-storage UI is deterministically covered but was not induced in the Founder's signed-in browser because mutating or inspecting browser storage was outside the preservation boundary.
- Local server logs showed repeated quote polling and BTC/ETH primary-feed 500 responses with fallback traffic. This is evidence only; the held PR25/provider lane was not changed.
- No build, push, deployment, Cloudflare mutation, production proof, brokerage action, provider mutation, DB/auth action, or release-gate closure occurred.
- Enrollment, payment, challenge-account identity, brokerage certification, and live trade execution are not connected by this atom.

## Preservation, rollback, and handoff

- Five unrelated pre-existing untracked baton/dispatch/handoff paths remain byte-preserved and unstaged.
- Rollback scope is the six named source/test files plus this baton only.
- NOW sealed: Proof Lane Journal truth and Plan actionability.
- NEXT: highest-leverage collision-safe Founder-visible workflow truth on the current local candidate, avoiding the held chart/provider surfaces.
- AFTER: separate computer/iPad/iPhone evidence for each affected visible surface, then a hash-bound local baton.
- MISSION STATUS = ACTIVE / CONTINUATION REQUIRED.
