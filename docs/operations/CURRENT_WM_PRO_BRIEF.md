# CURRENT WM PRO BRIEF (M21)

**Owner:** one-thread. **Rebuilt:** 2026-08-09. **Repo HEAD:** `d4e175d`.
**Rule:** any conflict between this brief and a scattered Bible/queue reference — this brief wins for OPERATIONAL truth; Bible wins for PRINCIPLE. One Brief.

---

## VISION (Bible §1)

WealthyMindsets Pro is a **Trader Performance Operating System** that helps a human trader train → prepare → warm up → read → decide → execute or stand aside → manage → recover → review → learn → adapt → teach. **Light in the trader's hands, heavy in the engineering underneath.** Optimises for the trader's growth, not for time-on-platform.

## CURRENT OBJECTIVE

Close every P0 defect blocking **Launch Gate 4 (Security)** and **Launch Gate 2 (Chart Stability)** before adding new surface area. WOWZER expansion is paused per directive Part XI.

## CURRENT SCOPE

**In:** JWT/secret hygiene, provider-key exposure remediation, unauthenticated privileged endpoint hardening, chart truthfulness (fail-closed provider maps), Big Trades legibility, mobile touch parity, cross-tab tape dedupe.

**Out:** New WOWZER pages, WM TV / Radio / Lounge feature work, Dreamboard/Passport cross-product work, backtesting UI expansion.

## CURRENT STATE (verified 2026-08-09)

- **Main:** `d4e175d` on GitHub, deployed to Vercel prod at `wealthymindsets-pro.vercel.app`.
- **Auth:** `JWT_SECRET` rotated + fail-fast guard shipped (`ae069b8`). All prior sessions invalidated 2026-08-08 as expected.
- **Provider secrets — done:** Finnhub rotated + all 5 client consumers migrated to `/api/finnhub` proxy (`2ea295c`); client bundle grep across 18 deployed chunks confirms zero hits on the leaked literal.
- **Provider secrets — outstanding:** Alpaca LIVE keys + Polygon keys still in public git history (`.env.local` was committed in `39c8758`, deleted in `3dd6050`); rotation at provider dashboards required (WM-SEC-P0-04 + WM-SEC-P0-05).
- **Client Polygon:** disabled (`d4e175d`) so bundle no longer ships the key; Polygon paths fall through to Yahoo/Alpaca REST.
- **Unauthenticated privileged endpoints:** 10 identified in `AUDIT_2026-08-08_10-POINT.md` §CRITICAL-C, unshipped (WM-SEC-P0-06).
- **RLS:** `lounge_posts / likes / comments / follows` still `USING (true)` per `supabase-schema.sql:63-79`. Founder-gated (shared DB with Dreamboard).
- **Chart truthfulness:** WM-CHART-P0-03 (silent provider substitution on `2m`/`3m`/`10m`/`2h`/`4h`) still shipping; queued next.
- **Mobile touch:** WM-RESP-P0-01 unshipped; 13 mouse handlers, 0 touch handlers in `src/components/chart/*`.

## SOURCE-OF-TRUTH LINKS

- Company Bible: Drive `1Yntm95DYMKnzNZ6AS5HNlMWdw75X15rPhlOOInBdKB0` (v41KB, updated 2026-08-08).
- ATH Master Bible: Drive `1QCKDE-d1fPdYee5vDI1wkpulLQtQFheHz3yMsfdaPTA`.
- 30-Milestone Plan: Drive `1iCWVVXBj0vDYKe8089g-vtmiRRQCP5NOTa9BtI47cCU`.
- Active queue: `docs/operations/ACTIVE_TASK_QUEUE.md`.
- 10-point audit: `docs/operations/AUDIT_2026-08-08_10-POINT.md`.
- Reconciliation: `docs/operations/RECONCILIATION_2026-08-08.md`.
- Session hand-off: `docs/operations/SESSION_END_2026-08-08.md`.
- One-thread supersede notice: `docs/operations/handoffs/2026-08-08-one-thread-supersede.md`.

## LAST STABLE POINT

`d4e175d` — deployed READY on Vercel, verified 2026-08-09 via authenticated `/charts` render (TSLA 329.00, Alpaca LIVE, Yahoo delayed fallback, no fabricated depth). Rollback command if any subsequent commit breaks prod:

```
git checkout d4e175d && git push --force-with-lease origin main
```

(force-with-lease only — never plain `--force`.)

## TOP RISKS

1. **Alpaca LIVE keys still valid on the leaked pair** until Founder rotates. Anyone with GitHub read can place real orders.
2. **Polygon key still valid on the leaked pair** until Founder rotates. Quota theft; not real-money.
3. **10 unauthenticated privileged endpoints** including one that mints LiveKit host tokens and one that executes real Alpaca orders. Not yet gated.
4. **Lounge tables `USING (true)`** — any anon-key holder deletes any user's post.
5. **`next` framework has 8 HIGH advisories** (SSRF, cache confusion, unauth Server-Function disclosure). `npm audit fix` pending.

## OPEN DECISIONS AWAITING FOUNDER

- **DEC-013 (pending):** BFG / `git filter-repo` the leaked secrets out of git history, or accept public exposure and rely on rotation. History rewrite invalidates every downstream clone/worktree.
- **DEC-014 (pending):** ship WM-SEC-P0-06 auth guards in one commit or per-endpoint? Some are broker-critical (alpaca-trading, upload-track) — Founder eyes-on the first live test.
- **DEC-015 (pending):** Supabase RLS apply plan (WM-SEC-P0-02) — shared DB with Dreamboard; needs backup + staged policy test.

## EXACT NEXT TASK

Continue the 30-milestone batch execution. Batch 1 (operational docs) landing in the next commit alongside this brief.

## QUALITY GATES (Bible §46)

Every substantive commit must pass:

- `tsc --noEmit` = 0 errors
- Bundle grep for leaked literals = 0 hits (post-deploy)
- Visual verification at 360 / 390 / 834 / 1280 for any user-facing change
- Handoff Contract template filled if handing to another role or session
