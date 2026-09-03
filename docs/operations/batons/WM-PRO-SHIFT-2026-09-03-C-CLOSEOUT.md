# WM PRO SHIFT C — CLOSE-OUT (verification-driven)
Date: 2026-09-03
Thread: ATHOS single-thread (Claude Code)
Opened to close the two verification items left open by SHIFT B.

## STATE AT CLOSE
- Suite: **337 files / 3144 tests passing** (unpiped, exit 0)
- TypeScript: clean (exit 0)
- main: green

## HEADLINE
Verifying one fix on prod exposed **four more instances of the same defect**.
The day-change display had been re-implemented independently on five surfaces;
four were wrong. All five now share one guard, proven live.

## THE DEFECT CLASS — FABRICATED DAY-CHANGE
`useWebSocket.flush()` leaves `change` / `changePct` at their initial 0 until
`prevCloseRef` holds a REAL prior close — deliberately, so a seed-derived fake
never reaches the UI. Consumers must therefore distinguish "genuinely flat"
from "no reference close yet". Finiteness and sign cannot: 0 and 0 are finite,
and `>= 0` calls zero "up".

| Surface | Defect | Fixed in |
|---|---|---|
| ChartsDashboard header | required change+pct+**volume** all zero to suppress; volume streams, so it never fired | 00373bd |
| MainChart price row | finiteness-only guard | 89c993b |
| BottomIndexBar | finiteness-only; `change >= 0` painted zero up | cc15a31 |
| SymbolInfoHeader | `changePct?.toFixed(2) ?? "0.00"` **manufactured** a zero | cc15a31 |
| StockInfoPanel | no zero guard at all; `>= 0` drove a green ↑ | cc15a31 |
| /ai-bot | `changePct >= 0` → green for an unreferenced zero | cc15a31 |

Observed on prod before the fixes:
- `BTC 77,556.11 ↑ +0.00 +0.00%` (green, beside LIVE — CERTIFIED QUOTE)
- `381.33 +0.00 (+0.00%)` (green, beside HISTORICAL BARS VERIFIED)
…both while the tape showed a real multi-percent move for the SAME symbol —
fabricated direction plus multi-price disagreement (Weakness #1).

**Fix:** extracted `selectTickerChangeDisplay` — one pure guard returning
`{displayable, change, changePct, direction}` with three-state direction and a
safe withheld result (zero/flat), so a careless caller degrades rather than
fabricates. Every surface renders its own honest fallback.

**Repo-wide Sentinel** (`tickerChangeGuardCoverage.test.ts`) walks `src/` and
fails if any surface reintroduces `ticker.change >= 0` as a direction,
manufactures `?? "0.00"`, or formats a change without either importing the
selector or carrying the explicit zero-pair guard.

**PROVEN ON PROD** after deploy: `/charts` fabricated-`+0.00%` count **1 → 0**,
no arrow-paired-with-zero, and the honest fallback rendering:
`380.97 — (change unavailable)` in muted grey, while the tape correctly showed
TSLA `+24.55 (+6.88%)`.

## OPEN ITEMS FROM SHIFT B — RESOLVED
| Item | Result |
|---|---|
| Chart-header fix live verification | **DONE** — and it uncovered the four siblings above |
| /journal trade-detail canvas | **BLOCKED, not failed** — the journal has 0 entries, so there is nothing to select. Cannot be exercised without journal data. Not a defect; re-check once an entry exists. |

## OTHER FIXES VERIFIED LIVE THIS SHIFT
| Surface | Evidence |
|---|---|
| /charts pill | "8 **unresolved** · 1 blockers · 1 cleared" (was "8 missing") |
| /journal tabs | "Strategy Evidence Coach", "Lyric Templates" — no AI overclaim |
| /journal tags | all 13 render; the 5 formerly-sliced (breakeven, morning session, supply rejection, EOD, momentum) present |
| /morning-prep | "Growth Rings unavailable" — local-record substitution gone |
| /morning-prep | DATA HEALTH now `◐ PARTIAL` and NO LONGER in the outstanding-items list (was permanently `○ NOT DONE`) |
| /morning-prep + /journal | FABIO chip reads "curated notes"; title "WM Playbook" |

## PARALLEL THREAD
Another ATHOS thread shipped 5 commits during SHIFT B close-out (8081d14,
c1c2b92, b3d6176, 55045cc, d4b1576) — provider 403s named as "access unproven",
heatmap snapshot state aligned with receipt truth. It also committed the
heatmap files that had been dirty all session. No collision; my commits and
Sentinels intact, suite green on the merged tree.

## LESSON WORTH KEEPING
The four extra sites were found **only because the first fix was verified on
prod rather than assumed**. A fix that passes tests and looks right in the diff
still tells you nothing about how many other surfaces share its root cause.
When a defect is found in re-implemented logic, grep for every re-implementation
before closing it out.

## CARRIED FORWARD
- /journal trade-detail canvas — verify once the journal has at least one entry.
- `DataHealth` aria-label zero-fills optional counts; aria-only, low impact.
- **Founder unblock:** `/api/market-memory/coverage` returns 503 naming
  `SUPABASE_SERVICE_ROLE_KEY`. Paste it into Cloudflare env vars for durable
  coverage.
- Provider truth unchanged: Webull BLOCKED_AUTH (401), Longbridge NOT
  CONFIGURED, moomoo bridge absent, Tastytrade refresh token absent.
- Drive: ATHOS/ATH role-bible folders remain EMPTY.
- Chrome flagged "GoFullPage — Full Page Screen Capture" as violating Web Store
  policy and recommends removal. Founder's decision; noted, not actioned.

## TIMING TRUTH
No shift duration is claimed. Recorded: 2 implementation commits, 6 surfaces
brought under one guard, 1 defect class eliminated repo-wide, 8 live production
verifications, 0 plan rewrites, 0 Founder questions, 0 self-inflicted regressions.
