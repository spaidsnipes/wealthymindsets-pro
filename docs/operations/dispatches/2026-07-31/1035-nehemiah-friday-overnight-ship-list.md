# NEHEMIAH — Friday Overnight Ship List (Founder read-me: one glance)

**From:** Nehemiah (Ops & Critical Path) · **To:** Founder (via Atlas / Mission Control) · **Time:** 2026-07-31 10:35 CDT · **Repo HEAD:** `da1d8eb`
**Charter:** DEC-011 — command-board update after each verified state change.

---

## SHIPPED OVERNIGHT (7 verified landings, all on `main`)

| Commit | Ticket / Scope | Owner | State |
|---|---|---|---|
| **`da1d8eb`** | Micah → Noah dispatch: **water-style markers spec + W-trigger 32px correction** (WM-CHART-P0-05c + WM-BRAND-W-TRIGGER-01 spec) | Micah authored → Noah queued | HANDED OFF |
| **`0270590`** | **WM-UX-P0-01 — Delta bubble-count control moved to Smart Money panel** (Founder's exact ask) | Noah shipped from Micah spec | SHIPPED — Sentinel visual verify pending |
| **`627be87`** | **`revert(tastytrade)` — remove order/cancel surface per DEC-005** (self-policing loop closed) | Noah shipped from Sentinel verdict | SHIPPED — Sentinel re-verify pending |
| **`21ab228`** | WM-UX-P0-01 handoff + Sentinel verify dispatch + status row | Noah / Nehemiah | LANDED |
| **`cf2c703`** | **Forge WM-STATE-P0-02** — Confluence regime badge first-consumer contract (honest `no-threshold-configured` until thresholds blessed) | Forge → Noah | CONTRACT DELIVERED |
| **`866fc4b`** | **V-009 verdict — WM-STATE-P0-01 Markov engine is PARTIALLY VERIFIED, not shipped.** Corrects any earlier "shipped" claim. | Sentinel | RETURN TO QUEUE |
| **`1ddd35c`** | WM-SEC-VIOLATION-01 revert ACK + handoff + status row | Noah / Nehemiah | LANDED |

## DISPUTED CLAIM — Session VP "does not appear anymore"

**Sentinel finding (handoff `sentinel/2026-08-01-sentinel-session-vp-regression-not-reproduced.md`):** Session VP **renders correctly** on authenticated prod `/charts` TSLA 15m — VAH 312.15 · POC 311.05 (12.7k) · VAL 306.25. Screenshotted. Prime-suspect commit `0270590` **exonerated** (touches `FootprintControls.tsx` / `SmartMoneyPanel.tsx` + one-line comment in `MainChart.tsx`; zero references to Session VP anywhere in the diff — the VP toggle does not live in FootprintControls).

**Noah defense (handoff `noah/2026-07-31-noah-wm-ux-p0-01.md`):** independent grep confirms only `SmartMoneyPanel.tsx` writes `wm_delta_levels`; MainChart is read-only. No Session VP code path touched.

**Ruling routed to Founder via Atlas:** do NOT revert `0270590`. Reopen Session VP only with a live-tape-window reproduction: symbol + timeframe + feed state (ALPACA LIVE vs delayed) + whether Fixed VP was also on + blank vs coarse vs absent. Without that, there is no defect to bisect toward.

## BLOCKED — FOUNDER ACTION ONLY (routed by Atlas, per DEC-011)

- **WM-SEC-P0-01** — set `JWT_SECRET` in Vercel prod env (`docs/operations/dispatches/2026-07-31/0955-founder-blocker-wm-sec-p0-01-jwt-secret.md`).
- **WM-SEC-P0-02** — enable Supabase RLS on `wm_*` tables (`docs/operations/dispatches/2026-07-31/0956-founder-blocker-wm-sec-p0-02-supabase-rls.md`).

Both are Go-Live Gate B blockers. No employee can unblock. Atlas surfaces to Founder; Nehemiah does not.

## IN-FLIGHT — who's on what right now (from `EMPLOYEE_STATUS.md` + latest handoffs)

- **Noah** — next: **WM-VP-P0-01** (Session VP recurrence) after Sentinel clears WM-UX-P0-01 + WM-SEC-VIOLATION-01 revert. Queued: WM-OF-P0-05, WM-DRAW-P0-01, WM-CHART-P0-05c (water markers per `da1d8eb`).
- **Forge** — WM-STATE-P0-02 contract delivered (`cf2c703`); PREREQ-1 raised (threshold derivation needs Founder-blessed source). Prior queue: 3 root-cause contracts (VP / OF / BROKER) + broker matrix already in Noah's queue.
- **Sentinel** — verifying WM-UX-P0-01 (`0270590`) live-visual + re-verifying `627be87` revert. V-009 Markov returned. Live-market P0 audit dispatched at `0855`.
- **Micah** — 3 specs delivered (draw / delta migration / DEC-012 backfill) + `da1d8eb` water-marker spec. Idle → next per charter default.
- **Atlas** — morning dispatch waves published; DEC-012 ratified. Owes: re-derive of circulated "company health" figures (**CORRECTION REQUIRED** — see §Housekeeping).
- **Video Intelligence** — DeepCharts gap matrix (`79a9aaf`) published; 8 gap tickets filed for VP Worlds + full order-flow scope.

## HOUSEKEEPING routed this dispatch

- **Retiring 2 dispatches** — moved to `dispatches/2026-07-31/retired/`:
  - `1005-sentinel-to-noah-revert-tastytrade-order-lifecycle.md` — **satisfied by `627be87`** (revert shipped) + Noah handoff `2026-07-31-noah-wm-sec-violation-01-revert.md`. Sentinel re-verify still open, but the *dispatch's ask* is done.
  - `2325-sentinel-dec005-violation-tastytrade-order-lifecycle.md` — **satisfied**: Sentinel ruled + published verdict `handoffs/sentinel/2026-07-31-sentinel-dec005-tastytrade-order-verdict.md`; Noah reverted; Atlas relayed. The escalation loop is closed.
- **RISK-012 → RISK-013 renumber** — Nehemiah opening this in the risk register (see next sweep).
- **"44% DONE / 27 items"** — Sentinel refused to repeat per RISK-007. Nehemiah retiring this figure from any Atlas artifact still carrying it; will not restate unbacked-metric form.

## Critical path (one line, per charter §"one entry")

**WM-CHART-P0-03** (contested-gate execution) → unblocked by Sentinel-approved `47693ad` scanner-a11y prereq. Noah's next chart ticket after WM-VP-P0-01. All other P0 work is either verify-pending (P0-05, P0-01B, UX-P0-01, SEC-VIOLATION-01 revert) or Founder-gated (SEC-P0-01/02).

---
**Nehemiah signs off this sweep. Next sweep in 30 min per charter §Default-when-idle.**
