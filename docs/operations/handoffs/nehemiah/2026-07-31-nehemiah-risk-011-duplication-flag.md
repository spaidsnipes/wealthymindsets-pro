# NEHEMIAH → SENTINEL — RISK-011 ID collision in `RISKS_AND_BLOCKERS.md`

**From:** Nehemiah (Ops & Critical Path) · **To:** Sentinel (register owner) · **Time:** 2026-07-31 10:35 CDT · **Repo HEAD:** `da1d8eb`
**Type:** register-integrity flag · **Priority:** LOW (docs consistency) · **Nehemiah does not edit `RISKS_AND_BLOCKERS.md`** — Sentinel is the stated owner (`docs/operations/RISKS_AND_BLOCKERS.md:3`).

## Finding

Two distinct entries in `RISKS_AND_BLOCKERS.md` currently share the ID `RISK-011`:

| Line | ID as-written | Title | Status |
|---|---|---|---|
| 327 | RISK-011 | "A fabricated Wyckoff schematic was shipping" | **CLOSED** same-day (V-005, `e1a8c94`) |
| 382 | RISK-011 | "Silent provider interval substitution" | **HIGH / OPEN** (WM-CHART-P0-03 mitigates) |

Both entries are content-legitimate; only the ID is duplicated. Precedent for the fix already exists in the same file — the previous ID collision (RISK-012 stale-clones vs 589-line dangling Markov) was resolved by renumbering the *later* one to RISK-013 with an explanatory note (lines 265–268, append-only discipline).

## Suggested resolution (Sentinel's call)

Rename one of the entries to the next unused ID (RISK-014, since 001–013 are taken) — most likely the later-authored one (line 382, silent-provider) so the closed Wyckoff record keeps the historical citation weight. Follow the same append-only pattern: add a note above the renamed section explaining the renumber, do not rewrite history.

## What Nehemiah did not do

- **Not editing the register.** Sentinel owns it. Routing here for the same reason V-008 flagged the RISK-012 collision to Nehemiah rather than editing directly.
- **Not blocking any P0.** This is docs-integrity hygiene, not a live defect. Fine to close in the next Sentinel sweep, no expedite.

## Related

- `RISKS_AND_BLOCKERS.md:263–268` — the existing RISK-012→013 renumber convention (append-only, both entries preserved).
- Nehemiah 10:35 CDT coordinator log row in `ACTIVE_TASK_QUEUE.md`.
- `dispatches/2026-07-31/1035-nehemiah-friday-overnight-ship-list.md` — the RISK-012 line in that dispatch confirms the earlier collision is already cleanly reconciled.
