# AI ACTION RECEIPT — TEMPLATE (M24)

**Source:** ATH AI Stewardship & Human Growth Canon v0.1 §13.
**Adopted:** 2026-08-09. **Enforcement:** any commit body missing the receipt (for code-modifying commits) is RETURNed by Sentinel.

Copy the block below into every code-modifying commit message, or into the paired handoff doc for docs-only commits that make behavioural claims.

---

## AI Action Receipt

- **What changed:** one-sentence functional description in the Founder's own framing.
- **Why:** which ticket / defect / gate this closes (cite ID + one-line rationale).
- **Authorised by:** Founder directive citation, standing autonomous scope note, or ticket approval sha.
- **Author agent + model:** e.g. `Claude Opus 4.7` under `one-thread supersede 2026-08-08`.
- **Confidence:** HIGH / MODERATE / LOW / UNKNOWN (see `CONFIDENCE_ENGINE.md`).
- **Evidence used:** SOURCE + RUNTIME + TEST + DERIVED + ASSUMED (list only those actually consulted).
- **Files affected:** unified diffstat or file list.
- **Tests run:** exact commands + results (`tsc --noEmit` count, `vitest` count, `npm run build` count, bundle grep patterns + hit counts, manual viewport list).
- **Unresolved risks:** honest list of what can still break. Empty is a lie — err toward listing.
- **Rollback plan:** exact command to revert (`git checkout <parent-sha> && git push --force-with-lease`).
- **Timestamp:** ISO 8601 in CDT with offset (`2026-08-09T20:15:00-05:00`).

---

## Example (drawn from `ae069b8` — WM-SEC-P0-01 hardening)

- **What changed:** production auth module refuses to load when JWT_SECRET is unset or equals the committed dev fallback.
- **Why:** WM-SEC-P0-01. Previously, prod silently signed sessions with a value visible in the public repo.
- **Authorised by:** Founder directive 2026-08-08 (one-thread supersede + full autonomous auth authority).
- **Author agent + model:** Claude Opus 4.7 under one-thread supersede 2026-08-08.
- **Confidence:** HIGH.
- **Evidence used:** SOURCE (git grep for the literal), RUNTIME (live 401 on old cookie against `/api/diagnostics/auth-config`), TEST (direct import smoke test of the four branches).
- **Files affected:** `src/lib/auth.ts` (+36 / -4).
- **Tests run:** `tsc --noEmit` 0 errors; smoke test all four branches (dev-unset LOAD, prod-unset THROW, prod-fallback-equal THROW, prod-real-secret LOAD); post-deploy live 401 on old cookie confirms rotation.
- **Unresolved risks:** none for this commit; upstream risks are `JWT_SECRET` accidentally unset in Vercel (fail-fast catches, but 500s every route on cold start — that IS the point).
- **Rollback plan:** `git revert ae069b8 && git push origin main` — reverts to the pre-hardening state; site continues to sign with rotated JWT_SECRET but loses the fail-closed guard.
- **Timestamp:** 2026-08-08T02:00:00-05:00.

---

## Purpose

The receipt makes AI-driven change auditable by any human in the future. It converts "an LLM wrote this" into a legible artifact of authority + evidence + rollback. This is how AI-shipped code earns and keeps trust in a repository the Founder personally reads.
